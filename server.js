import express from 'express';
import sharp from 'sharp';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { recognizeIngredients } from './src/ingredientRecognizer.js';
import { generateRecipes } from './src/recipeGenerator.js';
import * as db from './src/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const DIRECT_MIME = new Set(['image/jpeg', 'image/png']);
const CONVERTIBLE_MIME = new Set(['image/heic', 'image/heif', 'image/avif']);
const ALLOWED_MIME = new Set([...DIRECT_MIME, ...CONVERTIBLE_MIME]);
const COOKIE_NAME = 'uid';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    cookies[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
  });
  return cookies;
}

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
  req.cookies = parseCookies(req.headers.cookie);
  next();
});

app.post('/api/recognize', async (req, res) => {
  const { image } = req.body ?? {};

  if (typeof image !== 'string' || !image.startsWith('data:')) {
    return res.status(400).json({ error: '유효한 이미지 데이터가 아닙니다.' });
  }

  const match = image.match(/^data:([^;]+);base64,(.+)$/);
  if (!match || !ALLOWED_MIME.has(match[1])) {
    return res.status(400).json({ error: 'jpg, png, heic, avif 이미지만 지원합니다.' });
  }

  const mime = match[1];
  const approxBytes = (match[2].length * 3) / 4;
  if (approxBytes > MAX_IMAGE_BYTES) {
    return res.status(400).json({ error: '이미지 용량은 5MB 이하만 지원합니다.' });
  }

  let imageForModel = image;

  if (CONVERTIBLE_MIME.has(mime)) {
    try {
      const inputBuffer = Buffer.from(match[2], 'base64');
      const jpegBuffer = await sharp(inputBuffer).jpeg({ quality: 85 }).toBuffer();
      imageForModel = `data:image/jpeg;base64,${jpegBuffer.toString('base64')}`;
    } catch (err) {
      console.error('image conversion error:', err.message);
      return res.status(400).json({ error: '이미지를 처리할 수 없습니다. 다른 사진으로 시도해주세요.' });
    }
  }

  try {
    const ingredients = await recognizeIngredients(imageForModel);
    res.json({ ingredients });
  } catch (err) {
    console.error('recognize error:', err.message);
    res.status(502).json({ error: '이미지 인식에 실패했습니다. 잠시 후 다시 시도해주세요.' });
  }
});

app.post('/api/recipes', async (req, res) => {
  const { ingredients } = req.body ?? {};

  if (!Array.isArray(ingredients) || ingredients.length === 0 || !ingredients.every((i) => typeof i === 'string')) {
    return res.status(400).json({ error: '식재료 목록이 비어있거나 형식이 올바르지 않습니다.' });
  }

  try {
    const recipes = await generateRecipes(ingredients);
    res.json({ recipes });
  } catch (err) {
    console.error('recipe generation error:', err.message);
    res.status(502).json({ error: '레시피 생성에 실패했습니다. 잠시 후 다시 시도해주세요.' });
  }
});

app.get('/api/me', async (req, res) => {
  const userId = req.cookies[COOKIE_NAME];

  try {
    const user = userId ? await db.getUser(userId) : null;
    if (!user) {
      return res.status(404).json({ error: '프로필이 없습니다.' });
    }
    res.json({ userId: user.id, nickname: user.nickname });
  } catch (err) {
    console.error('get user error:', err.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
  }
});

app.post('/api/users', async (req, res) => {
  const nickname = typeof req.body?.nickname === 'string' ? req.body.nickname.trim() : '';

  if (!nickname || nickname.length > 30) {
    return res.status(400).json({ error: '닉네임은 1~30자로 입력해주세요.' });
  }

  try {
    const userId = crypto.randomUUID();
    const user = await db.createUser(userId, nickname);

    res.setHeader(
      'Set-Cookie',
      `${COOKIE_NAME}=${encodeURIComponent(userId)}; HttpOnly; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`
    );
    res.json({ userId: user.id, nickname: user.nickname });
  } catch (err) {
    console.error('create user error:', err.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
  }
});

async function requireOwner(req, res) {
  const sessionUserId = req.cookies[COOKIE_NAME];
  if (!sessionUserId || sessionUserId !== req.params.userId) {
    res.status(403).json({ error: '접근 권한이 없습니다.' });
    return null;
  }
  const user = await db.getUser(sessionUserId);
  if (!user) {
    res.status(404).json({ error: '프로필을 찾을 수 없습니다.' });
    return null;
  }
  return user;
}

app.post('/api/users/:userId/recipes', async (req, res) => {
  try {
    const user = await requireOwner(req, res);
    if (!user) return;

    const { name, usedIngredients, missingIngredients, steps, estimatedTimeMinutes } = req.body ?? {};
    if (typeof name !== 'string' || !name.trim() || !Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({ error: '레시피 데이터가 올바르지 않습니다.' });
    }

    const id = crypto.randomUUID();
    const saved = await db.saveRecipe(id, user.id, {
      name,
      usedIngredients: Array.isArray(usedIngredients) ? usedIngredients : [],
      missingIngredients: Array.isArray(missingIngredients) ? missingIngredients : [],
      steps,
      estimatedTimeMinutes: typeof estimatedTimeMinutes === 'number' ? estimatedTimeMinutes : null,
    });

    res.json(saved);
  } catch (err) {
    console.error('save recipe error:', err.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
  }
});

app.get('/api/users/:userId/recipes', async (req, res) => {
  try {
    const user = await requireOwner(req, res);
    if (!user) return;

    res.json({ recipes: await db.listRecipes(user.id) });
  } catch (err) {
    console.error('list recipes error:', err.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
  }
});

app.delete('/api/users/:userId/recipes/:recipeId', async (req, res) => {
  try {
    const user = await requireOwner(req, res);
    if (!user) return;

    const owner = await db.getRecipeOwner(req.params.recipeId);
    if (!owner || owner !== user.id) {
      return res.status(404).json({ error: '레시피를 찾을 수 없습니다.' });
    }

    await db.deleteRecipe(req.params.recipeId);
    res.json({ success: true });
  } catch (err) {
    console.error('delete recipe error:', err.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
  }
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

export default app;
