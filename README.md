# 🦉 English Study Hub

Duolingo 학습 내용을 GPT-4o로 자동 정리해주는 영어 학습 앱.

## 기능
- 📋 **오늘 정리** — 구글독스 내용 붙여넣기 → 단어/구동사/라이팅 자동 분석
- ✍️ **문장 평가** — 내가 만든 문장 10점 채점 + 수정안 + 고급 표현 제안
- 📖 **단어장** — 자동완성 단어 저장, AI 학습 팁
- 🔁 **복습** — 날짜별 학습 기록 + 퀴즈

---

## 🚀 배포 방법 (GitHub + Vercel)

### 1단계 — 로컬 준비

```bash
# 저장소 클론 또는 파일 복사 후
npm install

# 환경변수 파일 만들기
cp .env.local.example .env.local
# .env.local 파일을 열어서 OPENAI_API_KEY= 뒤에 본인 키 입력
```

로컬 실행 테스트:
```bash
npm run dev
# http://localhost:3000 에서 확인
```

### 2단계 — GitHub에 올리기

```bash
git init
git add .
git commit -m "first commit"

# GitHub에서 새 저장소 생성 후:
git remote add origin https://github.com/본인아이디/english-study-hub.git
git push -u origin main
```

> ⚠️ `.env.local` 은 `.gitignore`에 포함되어 있어 **자동으로 GitHub 업로드에서 제외**됩니다.
> API 키가 절대 공개 저장소에 노출되지 않습니다.

### 3단계 — Vercel 배포

1. [vercel.com](https://vercel.com) 접속 → GitHub 계정으로 로그인
2. **"Add New Project"** → GitHub 저장소 선택
3. **"Environment Variables"** 섹션에서:
   - Key: `OPENAI_API_KEY`
   - Value: `sk-본인키입력`
4. **"Deploy"** 클릭

> ✅ Vercel 환경변수는 서버에서만 사용되며 브라우저에 절대 노출되지 않습니다.

---

## 🔐 보안 구조

```
브라우저 → /api/chat (Vercel 서버) → OpenAI API
                 ↑
         API 키는 여기서만 사용
         클라이언트(브라우저)에는 절대 전달 안 됨
```

- API 키는 `process.env.OPENAI_API_KEY` (서버 환경변수)에서만 읽음
- `.env.local`은 `.gitignore`로 GitHub 업로드 차단
- Vercel 환경변수는 암호화 저장
- 요청 크기 제한 (8000자)으로 토큰 낭비 방지

---

## 로컬 환경변수 설정

`.env.local` 파일:
```
OPENAI_API_KEY=sk-여기에키입력
```
