import Anthropic from '@anthropic-ai/sdk';
import { buildMorningPrompt, buildEveningPrompt } from './prompt.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function generateContent(user, type) {
  const prompt = type === 'morning'
    ? buildMorningPrompt(user)
    : buildEveningPrompt(user);

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = message.content[0]?.text ?? '';

  let parsed;
  try {
    const cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`JSON parse failed for user ${user.id}. Raw response: ${raw}`);
  }

  return parsed;
}
