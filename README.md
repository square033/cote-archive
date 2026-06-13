# 🗂️ 코테 아카이브

유형별 코딩테스트 문제 + 풀이 보관함.
AI(Google Gemini)가 문제 유형을 자동 분류하고, 코드 리뷰를 표·수식으로 정리해 줘요.

## 🛠️ 폴더 구조

```
cota-archive/
├── api/
│   └── ai.js              ← Vercel 서버리스 함수 (Gemini API 프록시)
├── src/
│   ├── App.jsx            ← 메인 앱
│   ├── AuthScreen.jsx     ← 로그인/회원가입 화면
│   ├── supabase.js        ← Supabase 클라이언트
│   ├── main.jsx
│   └── index.css
├── supabase-setup.sql     ← Supabase SQL Editor에 붙여넣을 설정
├── .env.example           ← 환경변수 예시 (복사해서 .env로)
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

---

## 🚀 배포하기 (Vercel — 무료)

### 0. 준비물

- **Node.js 18+** 설치 → https://nodejs.org
- **GitHub 계정** → https://github.com
- **Vercel 계정** (GitHub로 로그인 가능) → https://vercel.com
- **Gemini API 키** → https://aistudio.google.com/apikey 에서 **"Create API key"** 클릭
  - 신용카드 등록 필요 없음 ✨
  - 무료 티어: Gemini 2.5 Flash 기준 분당 10회, 하루 250회
  - 더 여유 있게 쓰고 싶으면 `api/ai.js` 안에서 모델을 `gemini-2.5-flash-lite` 로 바꾸면 분당 15회 / 하루 1,000회

### 1. 로컬에서 일단 돌려보기

```bash
cd cota-archive
npm install
npm run dev
```

→ `http://localhost:5173` 에서 화면이 열려요.
이 상태에선 UI/저장 기능만 동작하고, AI 기능은 안 떠 있어요 (서버리스 함수가 같이 안 켜져서).

> AI 기능까지 로컬에서 테스트하고 싶으면:
> ```bash
> npm install -g vercel
> vercel dev
> ```
> 묻는 질문은 다 엔터로 넘기고,
> 환경변수에 `GEMINI_API_KEY` 추가하면 돼요.

### 2. GitHub에 올리기

```bash
git init
git add .
git commit -m "first commit"
```

GitHub에서 새 저장소 만들고 (이름은 `cota-archive` 같은 거),
거기 표시되는 명령을 복붙:

```bash
git remote add origin https://github.com/내아이디/cota-archive.git
git branch -M main
git push -u origin main
```

### 3. Vercel에 연결

1. https://vercel.com 로그인
2. **Add New → Project** 클릭
3. 방금 만든 GitHub 저장소 **Import**
4. **Environment Variables** 칸에서:
   - Name: `GEMINI_API_KEY`
   - Value: AI Studio에서 발급받은 키
5. **Deploy** 클릭 🚀

1~2분 기다리면 `https://cota-archive-xxxx.vercel.app` 같은 주소 발급. 끝!

> 코드 수정하고 `git push` 하면 Vercel이 알아서 다시 배포해 줘요.

---

## 🔧 모델 바꾸기

`api/ai.js` 안의 이 줄에서 모델 이름만 바꾸면 돼요:

```js
const { prompt, model = 'gemini-2.5-flash', max_tokens = 1500 } = req.body || {};
```

| 모델 | 분당 | 하루 | 특징 |
|---|---|---|---|
| `gemini-2.5-flash` | 10회 | 250회 | 기본값. 품질·속도 균형 좋음 |
| `gemini-2.5-flash-lite` | 15회 | 1,000회 | 빠르고 한도 큼. 분류 작업에 충분 |
| `gemini-2.5-pro` | 5회 | 100회 | 가장 똑똑하지만 한도 작음 |

개인용으로 매일 많이 등록하지 않으면 `flash`로 충분해요.

---

## 🌐 도메인 연결

Vercel 프로젝트 → **Settings → Domains** → 도메인 추가.
가비아·Namecheap 등에서 도메인 사고 Vercel이 알려주는 DNS 값 넣으면 돼요.

---

## 💾 데이터 저장 — Supabase (무료 DB + 로그인)

이제 데이터가 **클라우드 DB에 저장**돼서 어떤 기기에서든 로그인만 하면 보여요! 🎉
이메일+비밀번호 로그인이 있어서 다른 사람이 내 문제를 볼 수 없어요.

### Supabase 설정 (5분 컷)

**1. 프로젝트 만들기**
1. https://supabase.com 접속 → GitHub로 로그인
2. **New project** 클릭
3. 이름 아무거나 (예: `cote-archive`), DB 비밀번호 설정 (아무거나, 기억 안 해도 됨), Region은 **Northeast Asia (Seoul)** 선택
4. 1~2분 기다리면 프로젝트 생성 완료

**2. 테이블 만들기**
1. 왼쪽 메뉴 → **SQL Editor** 클릭
2. 프로젝트에 들어 있는 `supabase-setup.sql` 파일 내용을 통째로 복사해서 붙여넣기
3. **Run** 클릭 → "Success" 뜨면 완료

**3. 이메일 인증 끄기 (선택, 추천)**
기본 설정은 가입할 때 메일 인증을 요구해요. 개인 프로젝트면 꺼두는 게 편해요:
1. 왼쪽 메뉴 → **Authentication** → **Sign In / Up** (또는 Providers)
2. **Email** 항목에서 **Confirm email** 토글 OFF

**4. API 키 확인**
1. 왼쪽 메뉴 → **Settings** (톱니바퀴) → **API**
2. 두 가지 복사해 두기:
   - **Project URL** (https://xxxx.supabase.co)
   - **anon public** 키 (eyJ로 시작하는 긴 문자열)

> anon 키는 공개돼도 괜찮은 키예요. RLS 정책(아까 SQL로 설정한 것)이 데이터를 보호해요.

**5. 환경변수 등록**

로컬 개발용: `.env.example`을 복사해 `.env` 파일 만들고 값 채우기

```
VITE_SUPABASE_URL=복사한 Project URL
VITE_SUPABASE_ANON_KEY=복사한 anon 키
```

Vercel 배포용: Vercel 프로젝트 → **Settings → Environment Variables** 에 같은 두 개 추가
(기존 `GEMINI_API_KEY` 포함해서 총 3개가 돼요)

| Name | Value |
|---|---|
| `GEMINI_API_KEY` | Gemini 키 |
| `VITE_SUPABASE_URL` | Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon 키 |

환경변수 추가한 뒤엔 **Deployments 탭 → 최신 배포 → ⋯ 메뉴 → Redeploy** 해야 적용돼요!

### 무료 한도

Supabase 무료 플랜: DB 500MB, 월 활성 사용자 5만 명.
개인 코테 노트면 평생 써도 한도 근처에도 못 가요. 단, **일주일간 접속이 없으면 프로젝트가 일시정지**되는데, 대시보드에서 버튼 한 번 누르면 다시 살아나요.

---

## ⚠️ Gemini 무료 티어 주의사항

- 무료 티어로 보낸 데이터는 구글이 모델 학습에 사용할 수 있어요. 코딩테스트 문제·풀이 정도면 보통은 괜찮지만, 회사 코드나 개인정보는 절대 넣지 마세요.
- EU·UK·스위스 지역은 상업적 사용에 제한이 있을 수 있어요.
- 한도(분당/일별)를 초과하면 잠시 후 다시 시도하라는 429 에러가 떠요.

---

## 🐞 문제가 생기면

- **로그인 화면에서 무한 로딩 / 콘솔에 환경변수 에러** → `.env`(로컬) 또는 Vercel 환경변수에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 확인. Vercel은 추가 후 **Redeploy** 필수!
- **가입했는데 로그인이 안 됨** → Supabase에서 Confirm email이 켜져 있으면 메일 인증부터 해야 해요. 끄는 법은 위 "이메일 인증 끄기" 참고
- **저장이 안 되고 콘솔에 RLS 에러** → `supabase-setup.sql`을 실행 안 했거나 일부만 실행된 거예요. SQL Editor에서 전체 다시 실행
- **AI 호출이 500 에러** → Vercel 환경변수에 `GEMINI_API_KEY`가 들어있는지 확인
- **429 에러** → 무료 한도 초과. 잠깐 기다리거나 `flash-lite` 모델로 변경
- **분류가 이상한 카테고리로 됨** → 문제 본문을 좀 더 충분히 붙여넣어 보세요
