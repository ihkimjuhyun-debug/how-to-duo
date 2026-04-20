<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>SEMI-DUOLINGO PRO | DET PREP</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>

  <div id="app">
    <section id="setup-view" class="view">
      <div class="logo-container">
        <h1 class="logo-text">SEMI<span class="highlight">DUO</span></h1>
        <p class="logo-sub">Duolingo English Test Prep</p>
      </div>
      <div class="menu-actions">
        <button id="start-exam-btn" class="primary-btn">새 시험 시작 (사진 묘사)</button>
        <button id="view-history-btn" class="secondary-btn">나의 학습 기록 및 단어장</button>
      </div>
    </section>

    <section id="quiz-view" class="view hidden">
      <header class="quiz-header">
        <div class="progress-container">
          <div class="progress-bar"><div id="progress-filler" style="width: 0%;"></div></div>
        </div>
        <div id="timer" class="timer">00:00</div>
      </header>
      <main class="quiz-main">
        <div class="instruction-card">
          <h2>Write about the photo</h2>
          <p>사진을 보고 영어로 묘사하세요. 최소 2문장 이상 작성해야 고득점이 나옵니다.</p>
        </div>
        <div class="image-wrapper">
          <img id="target-image" src="" alt="Quiz Target">
          <div id="image-loader" class="loader"></div>
        </div>
        <textarea id="user-input" placeholder="이 사진 속 상황은..."></textarea>
      </main>
      <footer>
        <button id="submit-btn" class="submit-btn inactive" disabled>제출하기</button>
      </footer>
    </section>

    <section id="review-view" class="view hidden">
      <header class="review-header">
        <button id="back-to-main-btn" class="back-btn">← 메인으로</button>
        <h1 id="review-title">시험 결과 분석</h1>
        <span id="review-date" class="date-stamp"></span>
      </header>
      <main class="review-main">
        <div class="score-summary-card">
          <div class="score-gauge-container">
            <svg class="score-gauge" viewBox="0 0 36 36">
              <path class="gauge-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
              <path id="gauge-filler" class="gauge-fill" stroke-dasharray="0, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
            </svg>
            <div id="score-text" class="score-text">--</div>
            <div class="score-label">EST. DET SCORE</div>
          </div>
          <p id="general-feedback" class="general-feedback"></p>
        </div>

        <div class="detailed-analysis">
          <div class="analysis-group" data-category="vocabulary">
            <h3>단어 & 표현 <span class="count">0</span></h3>
            <div class="content"></div>
          </div>
          <div class="analysis-group" data-category="grammar_focus">
            <h3>Grammar Focus</h3>
            <div class="content"></div>
          </div>
          <div class="analysis-group" data-category="better_expressions">
            <h3>더 나은 표현 제안</h3>
            <div class="content"></div>
          </div>
          </div>
      </main>
    </section>
  </div>

  <script type="module" src="/main.js"></script>
</body>
</html>
