import { supabase } from './supabase.js';

// ─── env ─────────────────────────────────────────────────────────────────────
const ONESIGNAL_APP_ID       = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;
const SOBRE_APP_URL          = process.env.SOBRE_APP_URL;
const INTERNAL_API_SECRET    = process.env.INTERNAL_API_SECRET;
const N8N_ALERT_WEBHOOK_URL  = process.env.N8N_ALERT_WEBHOOK_URL; // optional

const SLOTS = ['morning', 'evening'];

// ─── i18n ────────────────────────────────────────────────────────────────────
const NOTIF_TITLES = {
  morning: { it: 'Il tuo pensiero del mattino', fr: 'Ta pensée du matin', en: 'Your morning thought' },
  evening: { it: 'La tua serata',               fr: 'Ta soirée du soir',  en: 'Your evening reflection' },
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Returns { date: 'YYYY-MM-DD', hour: HH, minute: MM, dow: 0-6 } in the given IANA timezone. */
function localDateParts(tz) {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
    weekday: 'short',
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  return {
    date:   `${parts.year}-${parts.month}-${parts.day}`,
    hour:   parseInt(parts.hour,   10),
    minute: parseInt(parts.minute, 10),
    dow:    ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(parts.weekday),
  };
}

/** True if HH:MM string <= local {hour, minute}. */
function timeReached(notifTime, { hour, minute }) {
  const [h, m] = notifTime.split(':').map(Number);
  return h < hour || (h === hour && m <= minute);
}

/** Truncate text to maxLen, appending '…' if needed. */
function trunc(text, maxLen) {
  if (!text) return '';
  return text.length <= maxLen ? text : text.slice(0, maxLen - 1) + '…';
}

/** Build OneSignal notification body for a content row. */
function buildNotifPayload(playerId, content, slot, lang) {
  const title = NOTIF_TITLES[slot]?.[lang] ?? NOTIF_TITLES[slot].en;
  let body;
  if (content.type === 'story') {
    body = content.title ? trunc(content.title, 100) : trunc(content.body, 100);
  } else {
    body = trunc(content.body, 150);
  }
  return {
    app_id:            ONESIGNAL_APP_ID,
    include_player_ids: [playerId],
    headings:          { en: title, it: title, fr: title },
    contents:          { en: body,  it: body,  fr: body  },
  };
}

// ─── data fetching ────────────────────────────────────────────────────────────

async function getUsersForSlot(slot) {
  const { data, error } = await supabase
    .from('profiles')
    .select(`id, lang, timezone, subscription_status, onesignal_player_id, notif_${slot}_time`)
    .not('onesignal_player_id', 'is', null)
    .eq(`notif_${slot}_enabled`, true);

  if (error) throw new Error(`Failed to fetch profiles for slot ${slot}: ${error.message}`);
  return data ?? [];
}

async function alreadySentToday(userId, slot, localDate) {
  const { data } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('slot', slot)
    .eq('sent_date', localDate)
    .limit(1)
    .maybeSingle();
  return !!data;
}

async function getProContent(userId, slot, localDate) {
  const start = `${localDate}T00:00:00`;
  const end   = `${localDate}T23:59:59`;
  const { data } = await supabase
    .from('contents')
    .select('id, type, title, body')
    .eq('generated_for_user', userId)
    .eq('slot', slot)
    .gte('generated_at', start)
    .lte('generated_at', end)
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

async function getFreeContent(userId, slot) {
  const url = `${SOBRE_APP_URL}/api/internal/content-for-user?user_id=${userId}&slot=${slot}`;
  try {
    const res = await fetch(url, {
      headers: { 'x-internal-secret': INTERNAL_API_SECRET },
    });
    if (!res.ok) {
      console.log(`[warn] free content API ${res.status} for user ${userId} slot ${slot}`);
      return null;
    }
    const json = await res.json();
    return json.content ?? null;
  } catch (err) {
    console.log(`[warn] free content fetch failed for user ${userId}: ${err.message}`);
    return null;
  }
}

// ─── OneSignal + notifications table ─────────────────────────────────────────

async function sendOneSignal(payload) {
  const res = await fetch('https://onesignal.com/api/v1/notifications', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok || json.errors) {
    throw new Error(JSON.stringify(json.errors ?? json));
  }
  return json.id; // onesignal_notification_id
}

async function recordSent(userId, contentId, slot, localDate, onesignalId) {
  const { error } = await supabase.from('notifications').insert({
    user_id:                   userId,
    content_id:                contentId,
    slot,
    sent_date:                 localDate,
    onesignal_notification_id: onesignalId,
  });
  if (error) {
    // unique constraint violation = duplicate send in a race — not critical
    console.log(`[warn] notifications insert for user ${userId} slot ${slot}: ${error.message}`);
  }
}

async function alertWebhook(err, userId, slot) {
  if (!N8N_ALERT_WEBHOOK_URL) return;
  try {
    await fetch(N8N_ALERT_WEBHOOK_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ error: err.message, user_id: userId, slot, timestamp: new Date().toISOString() }),
    });
  } catch {
    // webhook itself failed — swallow silently
  }
}

// ─── per-slot loop ────────────────────────────────────────────────────────────

async function processSlot(slot, summary) {
  const users = await getUsersForSlot(slot);
  console.log(`[sobre-notify] slot=${slot} — ${users.length} candidate(s)`);

  for (const user of users) {
    const tz    = user.timezone ?? 'UTC';
    const local = localDateParts(tz);

    // Sunday evening: skip silently (same rule as generate.js)
    if (slot === 'evening' && local.dow === 0) continue;

    const notifTime = user[`notif_${slot}_time`];
    if (!notifTime || !timeReached(notifTime, local)) continue;

    const alreadySent = await alreadySentToday(user.id, slot, local.date);
    if (alreadySent) continue;

    // content resolution
    let content = null;
    if (user.subscription_status === 'pro') {
      content = await getProContent(user.id, slot, local.date);
      if (!content) {
        console.log(`[fallback] user ${user.id} pro but no content today — trying free endpoint`);
        content = await getFreeContent(user.id, slot);
      }
    } else {
      content = await getFreeContent(user.id, slot);
    }

    if (!content) {
      console.log(`[skip] user ${user.id} slot=${slot} — no content available`);
      summary.skipped++;
      continue;
    }

    // send
    const payload = buildNotifPayload(user.onesignal_player_id, content, slot, user.lang ?? 'en');
    try {
      const onesignalId = await sendOneSignal(payload);
      await recordSent(user.id, content.id, slot, local.date, onesignalId);
      console.log(`[ok] user ${user.id} slot=${slot} notif sent (${onesignalId})`);
      summary.sent++;
    } catch (err) {
      console.error(`[error] user ${user.id} slot=${slot} OneSignal failed: ${err.message}`);
      summary.errors++;
      await alertWebhook(err, user.id, slot);
    }

    await sleep(100);
  }
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    console.error('[sobre-notify] Missing ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY — aborting.');
    process.exit(1);
  }

  console.log(`[sobre-notify] Starting — ${new Date().toISOString()}`);

  const summary = { sent: 0, skipped: 0, errors: 0 };

  for (const slot of SLOTS) {
    try {
      await processSlot(slot, summary);
    } catch (err) {
      console.error(`[sobre-notify] Fatal error in slot=${slot}: ${err.message}`);
      summary.errors++;
    }
  }

  console.log(`[sobre-notify] Done — sent: ${summary.sent}, skipped: ${summary.skipped}, errors: ${summary.errors}`);
  process.exit(0);
}

main();
