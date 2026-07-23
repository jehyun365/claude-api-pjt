import { OPENROUTER_API_KEY } from './config.js';

const MODEL = 'nvidia/nemotron-nano-12b-v2-vl:free';
const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

async function callOpenRouter(messages, label) {
  const start = Date.now();
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: MODEL, messages }),
    });
    const elapsed = Date.now() - start;
    const data = await res.json();

    if (!res.ok) {
      console.log(`[${label}] FAILED (${res.status}, ${elapsed}ms)`);
      console.log(JSON.stringify(data, null, 2));
      return false;
    }

    const content = data.choices?.[0]?.message?.content ?? '(empty)';
    console.log(`[${label}] OK (${elapsed}ms)`);
    console.log('Response:', content);
    console.log('Usage:', JSON.stringify(data.usage));
    return true;
  } catch (e) {
    console.log(`[${label}] ERROR:`, e.message);
    return false;
  }
}

const textOk = await callOpenRouter(
  [{ role: 'user', content: 'Say "connection ok" and nothing else.' }],
  'TEXT TEST'
);

console.log('---');

const imageOk = await callOpenRouter(
  [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'What is in this image? Answer in one short sentence.' },
        {
          type: 'image_url',
          image_url: {
            url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg',
          },
        },
      ],
    },
  ],
  'IMAGE TEST'
);

console.log('---');
console.log(`Summary: text=${textOk ? 'PASS' : 'FAIL'}, image=${imageOk ? 'PASS' : 'FAIL'}`);
