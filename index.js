import { supabase } from './supabase.js';
import { generateContent } from './generate.js';

const BATCH_SLOT = process.env.BATCH_SLOT ?? 'evening';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function getEveningMood(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from('moods')
    .select('value')
    .eq('user_id', userId)
    .eq('slot', 'evening')
    .eq('recorded_date', today)
    .maybeSingle();
  return data?.value ?? 'neutral';
}

async function alreadyGeneratedToday(userId) {
  const { data } = await supabase
    .from('contents')
    .select('id')
    .eq('generated_for_user', userId)
    .gte('generated_at', todayStart())
    .limit(1)
    .maybeSingle();
  return !!data;
}

async function insertContent(content, user) {
  const row = {
    type: content.type,
    lang: user.lang,
    body: content.body,
    source: 'claude-haiku',
    mood_target: content.mood_target ?? null,
    slot: content.slot,
    tags: content.tags ?? [],
    is_active: true,
    generated_for_user: user.id,
    generated_at: new Date().toISOString(),
  };
  if (content.title) row.title = content.title;

  const { error } = await supabase.from('contents').insert(row);
  if (error) throw new Error(`Insert failed: ${error.message}`);
}

async function main() {
  const day = new Date().getDay();

  if (BATCH_SLOT === 'evening' && day === 0) {
    console.log('Sunday evening — skipping generation.');
    process.exit(0);
  }

  console.log(`[sobre-batch] Starting — slot: ${BATCH_SLOT}, ${new Date().toISOString()}`);

  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('id, name, lang, email')
    .eq('subscription_status', 'pro');

  if (usersError) {
    console.error('Failed to fetch pro users:', usersError.message);
    process.exit(1);
  }

  console.log(`[sobre-batch] ${users.length} pro user(s) found.`);

  const summary = { processed: 0, skipped: 0, errors: 0 };

  for (let i = 0; i < users.length; i++) {
    const user = users[i];

    try {
      const skip = await alreadyGeneratedToday(user.id);
      if (skip) {
        console.log(`[skip] ${user.email} — already generated today`);
        summary.skipped++;
        continue;
      }

      const mood = await getEveningMood(user.id);
      const userCtx = { ...user, mood, index: i };

      const morning = await generateContent(userCtx, 'morning');
      await insertContent(morning, user);

      const evening = await generateContent(userCtx, 'evening');
      await insertContent(evening, user);

      console.log(`[ok] ${user.email} — thought + ${evening.type} generated (mood: ${mood})`);
      summary.processed++;
    } catch (err) {
      console.error(`[error] ${user.email} — ${err.message}`);
      summary.errors++;
    }

    if (i < users.length - 1) await sleep(500);
  }

  console.log(`[sobre-batch] Done — processed: ${summary.processed}, skipped: ${summary.skipped}, errors: ${summary.errors}`);
  process.exit(0);
}

main();
