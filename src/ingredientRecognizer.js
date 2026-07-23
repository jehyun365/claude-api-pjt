import { OPENROUTER_API_KEY } from '../config.js';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'nvidia/nemotron-nano-12b-v2-vl:free';

const PROMPT = `You are looking at a photo of the inside of a refrigerator.
List every distinct food ingredient you can visually identify.
Respond with ONLY a JSON array of ingredient names in Korean, nothing else.
Example: ["계란", "우유", "당근", "양파"]
If you cannot identify any ingredients, respond with [].`;

function extractJsonArray(text) {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    if (Array.isArray(parsed)) return parsed.filter((item) => typeof item === 'string');
  } catch {
    return null;
  }
  return null;
}

async function requestOnce(imageDataUri) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: PROMPT },
            { type: 'image_url', image_url: { url: imageDataUri } },
          ],
        },
      ],
    }),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    const status = data.error?.code ?? res.status;
    const err = new Error(data.error?.message ?? `OpenRouter request failed (${res.status})`);
    err.status = status;
    throw err;
  }

  return data.choices?.[0]?.message?.content ?? '';
}

// HTTP 5xx뿐 아니라, 모델이 깨진 JSON을 반환하는 경우(free 모델 특성상 간헐적으로 발생)도
// 네트워크 오류와 동일하게 재시도 대상으로 취급한다.
const MAX_ATTEMPTS = 3;

export async function recognizeIngredients(imageDataUri) {
  let lastError;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const content = await requestOnce(imageDataUri);
      const ingredients = extractJsonArray(content);
      if (ingredients === null) {
        throw new Error('모델 응답을 식재료 목록(JSON)으로 해석할 수 없습니다.');
      }
      return ingredients;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError;
}
