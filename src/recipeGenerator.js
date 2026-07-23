import { OPENROUTER_API_KEY } from '../config.js';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
// nemotron-nano-12b-v2-vl:free (동일 모델, 이미지 인식용)은 한국어 장문 생성 시
// 문장에 무관한 문자(한자/아랍어 등)가 섞이는 품질 문제가 확인되어 텍스트 전용 모델로 교체함.
const MODEL = 'openai/gpt-oss-20b:free';

function buildPrompt(ingredients) {
  return `다음은 냉장고에 있는 식재료 목록입니다: ${ingredients.join(', ')}

이 재료들을 최대한 활용해서 만들 수 있는 요리 레시피를 정확히 1개만 추천해주세요.
반드시 아래 JSON 형식으로만 응답하고, 다른 설명은 추가하지 마세요.

{
  "recipes": [
    {
      "name": "요리명",
      "usedIngredients": ["냉장고에 있는 재료 중 실제로 사용하는 것들"],
      "missingIngredients": ["냉장고에 없지만 추가로 필요한 재료"],
      "steps": ["조리 순서를 단계별 문장으로"],
      "estimatedTimeMinutes": 15
    }
  ]
}

냉장고에 있는 재료가 부족해서 요리를 만들기 어렵다면 missingIngredients에 필요한 재료를 명시하세요.`;
}

function extractJsonObject(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    if (Array.isArray(parsed.recipes)) return parsed.recipes;
  } catch {
    return null;
  }
  return null;
}

async function requestOnce(ingredients) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: buildPrompt(ingredients) }],
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

export async function generateRecipes(ingredients) {
  let lastError;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const content = await requestOnce(ingredients);
      const recipes = extractJsonObject(content);
      if (recipes === null) {
        throw new Error('모델 응답을 레시피(JSON)로 해석할 수 없습니다.');
      }
      return recipes;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError;
}
