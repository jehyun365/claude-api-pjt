# CLAUDE-API-PJT

냉장고 속 재료 사진을 찍으면 AI가 재료를 인식하고, 그 재료로 만들 수 있는 레시피를 추천해주는 웹 서비스입니다.

## 주요 기능

- **재료 인식**: 사진을 업로드하면 AI가 이미지 속 식재료를 자동으로 인식합니다.
- **레시피 추천**: 인식된 재료를 바탕으로 만들 수 있는 요리 레시피를 생성합니다.
- **레시피 저장**: 마음에 드는 레시피를 내 프로필에 저장하고 나중에 다시 볼 수 있습니다.
- **이미지 포맷 변환**: jpg, png 외에 heic, avif 이미지도 자동으로 변환하여 처리합니다.

## 기술 스택

- **Backend**: Node.js, Express
- **Database**: Supabase (PostgreSQL)
- **Image Processing**: sharp
- **AI**: OpenRouter API

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example`을 참고하여 `.env` 파일을 만들고 API 키를 입력합니다.

```bash
cp .env.example .env
```

```
OPENROUTER_API_KEY=your_openrouter_api_key_here
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

`SUPABASE_SERVICE_ROLE_KEY`는 Supabase 대시보드 → Project Settings → API → Secret keys에서 확인할 수 있습니다. 서버에서만 사용되며 RLS를 우회하므로 절대 클라이언트에 노출되거나 커밋되면 안 됩니다.

### 3. 서버 실행

```bash
node server.js
```

기본적으로 `http://localhost:3000` 에서 서버가 실행됩니다.

## 프로젝트 구조

```
.
├── server.js              # Express 서버 및 API 라우트
├── config.js              # 환경 변수 설정
├── src/
│   ├── ingredientRecognizer.js  # 이미지 기반 재료 인식
│   ├── recipeGenerator.js       # 레시피 생성
│   └── db.js                    # Supabase 데이터베이스 처리 (fridge_user_tbl, fridge_recipes_tbl)
├── public/
│   ├── index.html
│   └── app.js
└── docs/                  # 기획 문서 (PRD)
```

## API

| Method | Endpoint | 설명 |
| --- | --- | --- |
| POST | `/api/recognize` | 이미지에서 식재료 인식 |
| POST | `/api/recipes` | 재료 목록으로 레시피 생성 |
| POST | `/api/users` | 사용자 프로필 생성 |
| GET | `/api/me` | 내 프로필 조회 |
| POST | `/api/users/:userId/recipes` | 레시피 저장 |
| GET | `/api/users/:userId/recipes` | 저장된 레시피 목록 조회 |
| DELETE | `/api/users/:userId/recipes/:recipeId` | 저장된 레시피 삭제 |
