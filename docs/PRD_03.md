# PRD_03: 사용자 프로필 및 레시피 저장

## 개요
사용자 프로필을 생성하고, PRD_02에서 생성된 레시피를 해당 프로필에 저장/조회할 수 있도록 하는 기능.
전체 파이프라인의 3단계로, 이 단계부터 인증/데이터 영속성이 필요해진다.

## 목표
- 사용자가 별도 프로필을 생성하고 로그인/식별할 수 있다.
- 생성된 레시피를 프로필에 저장하고, 이후 다시 조회할 수 있다.

## 범위
### 포함
- 최소 사용자 프로필 생성 (이름/닉네임 + 식별자, 초기 버전은 간단한 이메일 또는 로컬 식별자 기반)
- 레시피 저장 기능 (PRD_02 결과를 "저장하기" 버튼으로 보관)
- 저장된 레시피 목록 조회 (프로필별)
- 저장된 레시피 삭제

### 제외 (이후 확장 대상)
- 소셜 로그인(OAuth) 연동
- 프로필 공유/팔로우 등 소셜 기능
- 레시피 평점/리뷰
- 알레르기·식단 선호 기반 개인화 추천 (프로필 스키마에 필드는 열어두되 이번 단계 로직에는 미포함)

## 사용자 흐름
1. 사용자가 최초 접속 시 프로필을 생성한다 (닉네임 입력 등 최소 정보).
2. PRD_01 → PRD_02를 거쳐 레시피가 생성되면 "내 레시피에 저장" 버튼이 노출된다.
3. 저장 클릭 시 현재 프로필에 레시피가 연결되어 저장된다.
4. 사용자는 "내 레시피 목록" 화면에서 과거에 저장한 레시피를 다시 확인할 수 있다.
5. 필요 시 저장된 레시피를 삭제할 수 있다.

## 기술 요구사항
- **데이터 저장소**: 최초 버전은 단일 파일 기반 DB(SQLite) 또는 간단한 JSON 파일 저장소로 시작 가능 (별도 인프라 없이 로컬 실행 가능해야 함)
- **인증 방식**: 최초 버전은 정식 로그인 대신 브라우저 세션/로컬 식별자(예: 쿠키 기반 익명 프로필 ID)로 시작하고, 이후 실제 계정 시스템으로 확장 가능한 구조로 설계
- **데이터 모델(초안)**:
  ```
  User {
    id: string
    nickname: string
    createdAt: string
  }

  SavedRecipe {
    id: string
    userId: string
    name: string
    usedIngredients: string[]
    missingIngredients: string[]
    steps: string[]
    estimatedTimeMinutes: number
    savedAt: string
  }
  ```
- **보안**: 사용자 식별자와 저장 데이터는 타 사용자가 접근할 수 없도록 서버에서 소유권 검증 필요

## API 인터페이스 (초안)
```
POST /api/users
Body: { "nickname": "string" }
Response 200: { "userId": "string", "nickname": "string" }

POST /api/users/:userId/recipes
Body: { "name": "...", "usedIngredients": [...], "missingIngredients": [...], "steps": [...], "estimatedTimeMinutes": 0 }
Response 200: { "id": "string", "savedAt": "..." }

GET /api/users/:userId/recipes
Response 200: { "recipes": [ SavedRecipe, ... ] }

DELETE /api/users/:userId/recipes/:recipeId
Response 200: { "success": true }
```

## 성공 기준
- 프로필 생성 후 새로고침해도 동일 사용자로 인식됨 (세션 유지)
- 저장한 레시피가 목록에서 누락 없이 조회됨
- 다른 프로필의 레시피에 접근/삭제가 불가능함 (소유권 검증)

## 미결 사항
- 초기 버전에서 실제 로그인(이메일/비밀번호 등) 도입 시점
- 저장소를 SQLite로 시작할지, 별도 백엔드 DB(Postgres 등)로 처음부터 갈지 - 트래픽 규모가 정해지지 않아 추후 결정
