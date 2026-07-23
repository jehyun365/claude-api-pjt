const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const preview = document.getElementById('preview');
const previewFallback = document.getElementById('previewFallback');
const recognizeBtn = document.getElementById('recognizeBtn');
const statusEl = document.getElementById('status');

const ingredientSection = document.getElementById('ingredientSection');
const chipsEl = document.getElementById('chips');
const addIngredientInput = document.getElementById('addIngredientInput');
const addIngredientBtn = document.getElementById('addIngredientBtn');
const recipeBtn = document.getElementById('recipeBtn');
const recipeStatusEl = document.getElementById('recipeStatus');
const recipeResultEl = document.getElementById('recipeResult');

const profileBar = document.getElementById('profileBar');
const profileForm = document.getElementById('profileForm');
const profileGreeting = document.getElementById('profileGreeting');
const nicknameInput = document.getElementById('nicknameInput');
const createProfileBtn = document.getElementById('createProfileBtn');
const profileStatusEl = document.getElementById('profileStatus');
const myRecipesBtn = document.getElementById('myRecipesBtn');
const myRecipesSection = document.getElementById('myRecipesSection');
const myRecipesList = document.getElementById('myRecipesList');

let currentDataUri = null;
let ingredients = [];
let currentUser = null;

async function checkProfile() {
  try {
    const res = await fetch('/api/me');
    if (res.ok) {
      currentUser = await res.json();
      showProfile();
    }
  } catch {
    // 프로필 확인 실패 시 로그인 폼을 그대로 둔다.
  }
}

function showProfile() {
  profileForm.style.display = 'none';
  profileBar.style.display = 'flex';
  profileGreeting.textContent = `안녕하세요, ${currentUser.nickname}님`;
}

createProfileBtn.addEventListener('click', async () => {
  const nickname = nicknameInput.value.trim();
  profileStatusEl.textContent = '';

  if (!nickname) {
    profileStatusEl.textContent = '닉네임을 입력해주세요.';
    return;
  }

  createProfileBtn.disabled = true;
  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '프로필 생성에 실패했습니다.');

    currentUser = data;
    showProfile();
  } catch (err) {
    profileStatusEl.textContent = err.message;
  } finally {
    createProfileBtn.disabled = false;
  }
});

myRecipesBtn.addEventListener('click', async () => {
  const isHidden = myRecipesSection.style.display === 'none' || !myRecipesSection.style.display;
  if (!isHidden) {
    myRecipesSection.style.display = 'none';
    return;
  }

  myRecipesSection.style.display = 'block';
  myRecipesList.innerHTML = '불러오는 중...';

  try {
    const res = await fetch(`/api/users/${currentUser.userId}/recipes`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '목록을 불러오지 못했습니다.');
    renderMyRecipes(data.recipes);
  } catch (err) {
    myRecipesList.innerHTML = `<p class="error">${err.message}</p>`;
  }
});

function renderMyRecipes(recipes) {
  myRecipesList.innerHTML = '';
  if (recipes.length === 0) {
    myRecipesList.innerHTML = '<p>저장된 레시피가 없습니다.</p>';
    return;
  }
  recipes.forEach((recipe) => {
    const card = buildRecipeCard(recipe);
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '삭제';
    deleteBtn.className = 'btn-danger';
    deleteBtn.addEventListener('click', async () => {
      deleteBtn.disabled = true;
      try {
        const res = await fetch(`/api/users/${currentUser.userId}/recipes/${recipe.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error((await res.json()).error || '삭제에 실패했습니다.');
        card.remove();
        if (!myRecipesList.querySelector('.recipe-card')) {
          myRecipesList.innerHTML = '<p>저장된 레시피가 없습니다.</p>';
        }
      } catch (err) {
        deleteBtn.disabled = false;
        alert(err.message);
      }
    });
    const actions = document.createElement('div');
    actions.className = 'card-actions';
    actions.appendChild(deleteBtn);
    card.appendChild(actions);
    myRecipesList.appendChild(card);
  });
}

checkProfile();

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/avif'];
const EXT_TO_MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', heic: 'image/heic', heif: 'image/heif', avif: 'image/avif' };

function resolveMime(file) {
  if (file.type && ALLOWED_MIME.includes(file.type)) return file.type;
  const ext = file.name.split('.').pop().toLowerCase();
  return EXT_TO_MIME[ext] || '';
}

dropzone.addEventListener('click', () => fileInput.click());

dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) loadFile(file);
});

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (file) loadFile(file);
});

function loadFile(file) {
  statusEl.textContent = '';
  previewFallback.style.display = 'none';
  preview.style.display = 'none';
  ingredientSection.style.display = 'none';
  recipeResultEl.innerHTML = '';
  recipeStatusEl.textContent = '';

  const mime = resolveMime(file);
  if (!mime) {
    statusEl.innerHTML = '<span class="error">jpg, png, heic, avif 이미지만 지원합니다.</span>';
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    statusEl.innerHTML = '<span class="error">이미지 용량은 5MB 이하만 지원합니다.</span>';
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const base64 = reader.result.split(',')[1];
    currentDataUri = `data:${mime};base64,${base64}`;
    recognizeBtn.disabled = false;

    preview.onerror = () => {
      preview.style.display = 'none';
      previewFallback.textContent = `미리보기를 지원하지 않는 형식이에요 (${file.name}). 인식은 정상적으로 진행할 수 있어요.`;
      previewFallback.style.display = 'block';
    };
    preview.onload = () => {
      preview.style.display = 'block';
      previewFallback.style.display = 'none';
    };
    preview.src = currentDataUri;
  };
  reader.readAsDataURL(file);
}

recognizeBtn.addEventListener('click', async () => {
  if (!currentDataUri) return;

  recognizeBtn.disabled = true;
  statusEl.textContent = '인식 중... (몇 초 정도 걸릴 수 있어요)';
  ingredientSection.style.display = 'none';
  recipeResultEl.innerHTML = '';
  recipeStatusEl.textContent = '';

  try {
    const res = await fetch('/api/recognize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: currentDataUri }),
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || '알 수 없는 오류가 발생했습니다.');
    }

    statusEl.textContent = '';
    ingredients = data.ingredients;
    renderChips();
    ingredientSection.style.display = 'block';
    if (ingredients.length === 0) {
      statusEl.textContent = '식재료를 인식하지 못했습니다. 직접 추가해서 레시피를 추천받을 수 있어요.';
    }
  } catch (err) {
    statusEl.innerHTML = `<span class="error">${err.message}</span> <button id="retryBtn">다시 시도</button>`;
    document.getElementById('retryBtn').addEventListener('click', () => recognizeBtn.click());
  } finally {
    recognizeBtn.disabled = false;
  }
});

function renderChips() {
  chipsEl.innerHTML = '';
  ingredients.forEach((name, idx) => {
    const chip = document.createElement('div');
    chip.className = 'chip';

    const label = document.createElement('span');
    label.textContent = name;

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '×';
    removeBtn.title = '삭제';
    removeBtn.addEventListener('click', () => {
      ingredients.splice(idx, 1);
      renderChips();
    });

    chip.appendChild(label);
    chip.appendChild(removeBtn);
    chipsEl.appendChild(chip);
  });
}

function addIngredient() {
  const value = addIngredientInput.value.trim();
  if (!value) return;
  ingredients.push(value);
  addIngredientInput.value = '';
  renderChips();
}

addIngredientBtn.addEventListener('click', addIngredient);
addIngredientInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addIngredient();
  }
});

recipeBtn.addEventListener('click', async () => {
  if (ingredients.length === 0) {
    recipeStatusEl.innerHTML = '<span class="error">재료를 1개 이상 입력해주세요.</span>';
    return;
  }

  recipeBtn.disabled = true;
  recipeStatusEl.textContent = '레시피 생성 중... (몇 초 정도 걸릴 수 있어요)';
  recipeResultEl.innerHTML = '';

  try {
    const res = await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredients }),
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || '알 수 없는 오류가 발생했습니다.');
    }

    recipeStatusEl.textContent = '';
    renderRecipes(data.recipes);
  } catch (err) {
    recipeStatusEl.innerHTML = `<span class="error">${err.message}</span> <button id="recipeRetryBtn">다시 시도</button>`;
    document.getElementById('recipeRetryBtn').addEventListener('click', () => recipeBtn.click());
  } finally {
    recipeBtn.disabled = false;
  }
});

function buildRecipeCard(recipe) {
  const card = document.createElement('div');
  card.className = 'recipe-card';

  const title = document.createElement('h3');
  title.textContent = recipe.name || '이름 없는 레시피';
  card.appendChild(title);

  const meta = document.createElement('div');
  meta.className = 'recipe-meta';
  meta.textContent = recipe.estimatedTimeMinutes ? `⏱ 약 ${recipe.estimatedTimeMinutes}분` : '';
  card.appendChild(meta);

  if (recipe.usedIngredients?.length) {
    const used = document.createElement('p');
    const strong = document.createElement('strong');
    strong.textContent = '사용 재료: ';
    used.appendChild(strong);
    used.appendChild(document.createTextNode(recipe.usedIngredients.join(', ')));
    card.appendChild(used);
  }

  if (recipe.missingIngredients?.length) {
    const missing = document.createElement('p');
    missing.className = 'tag-missing';
    const strong = document.createElement('strong');
    strong.textContent = '추가로 필요: ';
    missing.appendChild(strong);
    missing.appendChild(document.createTextNode(recipe.missingIngredients.join(', ')));
    card.appendChild(missing);
  }

  if (recipe.steps?.length) {
    const stepsTitle = document.createElement('strong');
    stepsTitle.textContent = '조리 순서';
    card.appendChild(stepsTitle);

    const ol = document.createElement('ol');
    recipe.steps.forEach((step) => {
      const li = document.createElement('li');
      li.textContent = step;
      ol.appendChild(li);
    });
    card.appendChild(ol);
  }

  return card;
}

function renderRecipes(recipes) {
  recipeResultEl.innerHTML = '';

  if (!recipes || recipes.length === 0) {
    recipeResultEl.innerHTML = '<p>레시피를 생성하지 못했습니다. 다시 시도해주세요.</p>';
    return;
  }

  recipes.forEach((recipe) => {
    const card = buildRecipeCard(recipe);

    const actions = document.createElement('div');
    actions.className = 'card-actions';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn-secondary';
    saveBtn.textContent = '저장하기';
    saveBtn.addEventListener('click', () => saveRecipe(recipe, saveBtn));
    actions.appendChild(saveBtn);

    card.appendChild(actions);
    recipeResultEl.appendChild(card);
  });
}

async function saveRecipe(recipe, btn) {
  if (!currentUser) {
    alert('레시피를 저장하려면 먼저 상단에서 닉네임을 입력해 프로필을 만들어주세요.');
    nicknameInput.focus();
    return;
  }

  btn.disabled = true;
  try {
    const res = await fetch(`/api/users/${currentUser.userId}/recipes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recipe),
    });
    if (!res.ok) throw new Error((await res.json()).error || '저장에 실패했습니다.');
    btn.textContent = '저장됨 ✓';
  } catch (err) {
    btn.disabled = false;
    alert(err.message);
  }
}
