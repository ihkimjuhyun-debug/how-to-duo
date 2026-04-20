// main.js

// 1. 학습 데이터 세트 (요구사항 반영)
const GAME_DATA = {
  dictation: [
    "There is a French version as well as an Italian version of this opera.",
    "The salmonella bacteria are directly associated with turtles.",
    "Neighboring African countries have become involved."
  ],
  blank: [
    { text: "Predestination is often considered a form of [ ______ ] determinism.", answer: "hard", original: "Predestination is often considered a form of hard determinism." },
    { text: "If the cladding of the fiber is [ ______ ], it may break.", answer: "scratched", original: "If the cladding of the fiber is scratched, it may break." },
    { text: "It is clearly shown in the picture that an iron bridge is [ ______ ] proudly.", answer: "standing", original: "It is clearly shown in the picture that an iron bridge is standing proudly." }
  ]
};

// 2. 상태 관리
const state = { mode: '', timer: 0, timerId: null, targetContext: '' };
const TIME_LIMITS = { photo: 300, dictation: 60, blank: 60 }; // 모드별 시간

// DOM 캐싱
const els = {
  views: document.querySelectorAll('.view'),
  instruction: document.getElementById('instruction'),
  targetImg: document.getElementById('target-image'),
  imgLoader: document.getElementById('image-loader'),
  audioBtn: document.getElementById('play-audio-btn'),
  blankDisplay: document.getElementById('blank-text-display'),
  textarea: document.getElementById('user-input'),
  submitBtn: document.getElementById('submit-btn'),
  timer: document.getElementById('timer'),
  progress: document.getElementById('progress-filler'),
  reviewContent: document.getElementById('review-content')
};

// 화면 전환
window.showView = (id) => {
  els.views.forEach(v => v.classList.add('hidden'));
  document.getElementById(`${id}-view`).classList.remove('hidden');
};

// 게임 시작 로직 (모드별 분기)
window.startMode = (mode) => {
  state.mode = mode;
  state.timer = TIME_LIMITS[mode];
  els.textarea.value = '';
  els.submitBtn.disabled = true; els.submitBtn.classList.add('inactive'); els.submitBtn.innerText = "제출하기";
  els.progress.style.width = '0%';
  
  // UI 초기화
  els.targetImg.classList.add('hidden');
  els.imgLoader.classList.add('hidden');
  els.audioBtn.classList.add('hidden');
  els.blankDisplay.classList.add('hidden');

  if (mode === 'photo') {
    els.instruction.innerText = "📸 Write about the photo (최소 2줄)";
    els.targetImg.classList.remove('hidden');
    els.imgLoader.classList.remove('hidden');
    // 🛡️ 버그 수정: 가장 안정적인 Picsum 사용
    els.targetImg.src = `https://picsum.photos/800/600?random=${Math.random()}`;
    els.targetImg.onload = () => els.imgLoader.classList.add('hidden');
    state.targetContext = "Random Image";
  } 
  else if (mode === 'dictation') {
    els.instruction.innerText = "🎧 음성을 듣고 정확히 받아 적으세요.";
    els.audioBtn.classList.remove('hidden');
    const randomSentence = GAME_DATA.dictation[Math.floor(Math.random() * GAME_DATA.dictation.length)];
    state.targetContext = randomSentence;
    
    // 오디오 재생 이벤트 바인딩
    els.audioBtn.onclick = () => {
      const utterance = new SpeechSynthesisUtterance(state.targetContext);
      utterance.lang = 'en-US';
      utterance.rate = 0.9; // 약간 천천히 명확하게
      window.speechSynthesis.speak(utterance);
    };
  } 
  else if (mode === 'blank') {
    els.instruction.innerText = "🧩 빈칸에 들어갈 알맞은 단어를 포함해 '전체 문장'을 적으세요.";
    els.blankDisplay.classList.remove('hidden');
    const randomItem = GAME_DATA.blank[Math.floor(Math.random() * GAME_DATA.blank.length)];
    state.targetContext = randomItem.original;
    els.blankDisplay.innerHTML = randomItem.text.replace('[ ______ ]', '<span class="blank-box"></span>');
  }

  showView('quiz');
  startTimer();
};

function startTimer() {
  const maxTime = TIME_LIMITS[state.mode];
  state.timerId = setInterval(() => {
    state.timer--;
    const m = String(Math.floor(state.timer / 60)).padStart(2, '0');
    const s = String(state.timer % 60).padStart(2, '0');
    els.timer.innerText = `${m}:${s}`;
    els.progress.style.width = `${((maxTime - state.timer) / maxTime) * 100}%`;

    if (state.timer <= 0) submitExam();
  }, 1000);
}

// 텍스트 입력 검증
els.textarea.oninput = (e) => {
  // 사진 묘사는 20자 이상, 나머지는 짧아도 허용
  const isValid = state.mode === 'photo' ? e.target.value.trim().length > 20 : e.target.value.trim().length > 2; 
  els.submitBtn.disabled = !isValid;
  if(isValid) els.submitBtn.classList.remove('inactive');
  else els.submitBtn.classList.add('inactive');
};

// 제출 및 API 통신
els.submitBtn.onclick = submitExam;
async function submitExam() {
  clearInterval(state.timerId);
  els.submitBtn.disabled = true;
  els.submitBtn.innerText = "AI 분석 중... 🏃‍♂️";

  try {
    const res = await fetch('/api/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        mode: state.mode, 
        text: els.textarea.value,
        targetContext: state.targetContext
      })
    });
    
    if (!res.ok) throw new Error('서버 에러 발생');
    const result = await res.json();
    
    saveToStorage(result);
    renderReview(result);
  } catch (err) {
    alert(err.message);
    els.submitBtn.disabled = false;
    els.submitBtn.innerText = "제출하기";
    startTimer();
  }
}

// 로컬스토리지 저장
function saveToStorage(result) {
  const history = JSON.parse(localStorage.getItem('det_history') || '[]');
  history.push({ date: new Date().toLocaleString(), mode: state.mode, ...result });
  localStorage.setItem('det_history', JSON.stringify(history));

  if(result.vocabulary) {
    const vocab = JSON.parse(localStorage.getItem('det_vocab') || '[]');
    localStorage.setItem('det_vocab', JSON.stringify([...vocab, ...result.vocabulary]));
  }
}

// 리뷰 렌더링 (보여주신 사진 UI 완벽 구현)
window.renderReview = (data) => {
  els.reviewContent.innerHTML = `
    <div class="score-card">
      <p>EST. DET SCORE</p>
      <h1>${data.score || '--'}</h1>
      <p style="color:#666; font-weight:700;">${data.feedback}</p>
    </div>
    
    ${data.vocabulary && data.vocabulary.length > 0 ? `
    <div class="analysis-box">
      <h3>단어 & 표현</h3>
      <ul>${data.vocabulary.map(v => `<li><strong>${v.word}</strong> - ${v.meaning} <br><span style="color:#888;">예문: "${v.example}"</span></li>`).join('')}</ul>
    </div>` : ''}

    ${data.grammar_focus && data.grammar_focus.length > 0 ? `
    <div class="analysis-box">
      <h3>Grammar Focus</h3>
      <ul>${data.grammar_focus.map(g => `<li><span class="error">${g.original}</span> → <span class="correct">${g.corrected}</span><br><span style="font-size:14px; color:#666;">💡 ${g.reason}</span></li>`).join('')}</ul>
    </div>` : ''}

    ${data.better_expressions && data.better_expressions.length > 0 ? `
    <div class="analysis-box">
      <h3>더 나은 표현 제안</h3>
      <ul>${data.better_expressions.map(b => `<li>❌ "${b.original}"<br>✅ <strong style="color:var(--blue);">"${b.improved}"</strong></li>`).join('')}</ul>
    </div>` : ''}
  `;
  document.getElementById('review-title').innerText = "분석 결과";
  showView('review');
};

// 과거 기록 보기
window.renderHistory = () => {
  const history = JSON.parse(localStorage.getItem('det_history') || '[]');
  if(history.length === 0) {
    els.reviewContent.innerHTML = '<div class="analysis-box" style="text-align:center;">저장된 기록이 없습니다.</div>';
  } else {
    els.reviewContent.innerHTML = history.reverse().map(h => `
      <div class="analysis-box">
        <h3 style="display:flex; justify-content:space-between;">
          <span>${h.date}</span>
          <span style="color:var(--green);">${h.score}점</span>
        </h3>
        <p><strong>[${h.mode.toUpperCase()}]</strong> ${h.feedback}</p>
      </div>
    `).join('');
  }
  document.getElementById('review-title').innerText = "나의 학습 기록";
  showView('review');
};

window.goHome = () => {
  if(state.timerId) clearInterval(state.timerId);
  window.speechSynthesis.cancel(); // TTS 재생 중지
  showView('setup');
};
