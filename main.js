// main.js

// 1. 학습 데이터 세트
const DATA_POOL = {
  dictation: [
    "The library is located on the north side of the campus.",
    "Many people prefer to read digital books rather than paper ones.",
    "The new restaurant downtown offers a variety of vegetarian dishes."
  ],
  blank_paragraphs: [
    "The modern workplace has changed significantly over the past decade. Many companies now offer flexible schedules and remote work options. This shift allows employees to better balance their personal and professional lives. However, remote work also presents unique challenges, such as maintaining team communication. To overcome this, managers must utilize digital collaboration tools effectively.",
    "Learning a new language can be a challenging but highly rewarding experience. It opens up opportunities to connect with people from completely different cultures. Consistent practice is the most important factor in achieving fluency. Listening to native speakers and watching movies can greatly improve pronunciation."
  ]
};

// 2. 상태 관리
const state = { 
  mode: '', timer: 0, timerId: null, targetContext: '', 
  cTestWords: [], cTestIndices: [], previousView: 'setup' 
};
const TIME_LIMITS = { photo: 300, dictation: 60, blank: 180 };

// 3. DOM 요소 캐싱
const els = {
  views: document.querySelectorAll('.view'),
  instruction: document.getElementById('instruction'),
  targetImg: document.getElementById('target-image'),
  imgLoader: document.getElementById('image-loader'),
  audioBtn: document.getElementById('play-audio-btn'),
  blankDisplay: document.getElementById('blank-text-display'),
  textarea: document.getElementById('user-input'),
  submitBtn: document.getElementById('submit-btn'),
  historyList: document.getElementById('history-list-container')
};

// 화면 전환 함수
function showView(id) {
  els.views.forEach(v => v.classList.add('hidden'));
  document.getElementById(`${id}-view`).classList.remove('hidden');
}

// ==========================================
// 🚀 핵심 1: 인터랙티브 C-Test 생성 알고리즘
// ==========================================
function generateInteractiveCTest(paragraph) {
  state.cTestWords = paragraph.split(' ');
  let candidateIndices = [];
  
  state.cTestWords.forEach((w, i) => {
    if (w.replace(/[^a-zA-Z]/g, '').length >= 5) candidateIndices.push(i);
  });
  
  candidateIndices.sort(() => 0.5 - Math.random());
  state.cTestIndices = candidateIndices.slice(0, 12); // 최대 12개 빈칸
  const selectedSet = new Set(state.cTestIndices);

  let htmlArray = state.cTestWords.map((w, i) => {
    if (selectedSet.has(i)) {
      let cleanWord = w.replace(/[^a-zA-Z]/g, '');
      let keepLen = Math.ceil(cleanWord.length / 2);
      let kept = cleanWord.substring(0, keepLen);
      let missingLen = cleanWord.length - keepLen;
      
      let punctStart = w.substring(0, w.indexOf(cleanWord));
      let punctEnd = w.substring(w.indexOf(cleanWord) + cleanWord.length);

      // input 태그를 텍스트 중간에 삽입
      return `${punctStart}<span class="c-test-kept">${kept}</span><input type="text" class="c-test-input" id="blank-input-${i}" maxlength="${missingLen + 1}" style="width: ${missingLen * 1.2}em;" autocomplete="off">${punctEnd}`;
    }
    return w;
  });
  
  return htmlArray.join(' ');
}

// ==========================================
// 🚀 핵심 2: 유저가 입력한 빈칸 텍스트 재조립
// ==========================================
function getReconstructedCTestText() {
  let userWords = [...state.cTestWords];
  
  state.cTestIndices.forEach((index) => {
    let inputEl = document.getElementById(`blank-input-${index}`);
    if(inputEl) {
      let originalWord = state.cTestWords[index];
      let cleanOriginal = originalWord.replace(/[^a-zA-Z]/g, '');
      let keepLen = Math.ceil(cleanOriginal.length / 2);
      let kept = cleanOriginal.substring(0, keepLen);
      
      let userTyped = inputEl.value.trim();
      let reconstructedWord = kept + userTyped;
      
      userWords[index] = originalWord.replace(cleanOriginal, reconstructedWord);
    }
  });
  return userWords.join(' ');
}

// 4. 모드 시작 로직
function startMode(mode) {
  state.mode = mode;
  state.timer = TIME_LIMITS[mode];
  els.textarea.value = '';
  els.submitBtn.disabled = true; els.submitBtn.classList.add('inactive'); els.submitBtn.innerText = "제출하기";
  
  els.targetImg.classList.add('hidden'); els.imgLoader.classList.add('hidden');
  els.audioBtn.classList.add('hidden'); els.blankDisplay.classList.add('hidden');
  els.textarea.classList.remove('hidden'); // 기본은 textarea 보이기

  if (mode === 'photo') {
    els.instruction.innerText = "📸 사진을 보고 영어로 묘사하세요 (최소 2문장)";
    els.targetImg.classList.remove('hidden'); els.imgLoader.classList.remove('hidden');
    els.targetImg.src = `https://picsum.photos/800/600?random=${Math.random()}`;
    els.targetImg.onload = () => els.imgLoader.classList.add('hidden');
    state.targetContext = "Random Image";
  } 
  else if (mode === 'dictation') {
    els.instruction.innerText = "🎧 음성을 듣고 정확히 받아 적으세요.";
    els.audioBtn.classList.remove('hidden');
    state.targetContext = DATA_POOL.dictation[Math.floor(Math.random() * DATA_POOL.dictation.length)];
    playAudio(state.targetContext);
  } 
  else if (mode === 'blank') {
    els.instruction.innerText = "🧩 빈칸을 클릭하여 생략된 스펠링을 채워 넣으세요.";
    els.textarea.classList.add('hidden'); // textarea 숨김!
    els.blankDisplay.classList.remove('hidden'); // 빈칸 UI 표시
    
    state.targetContext = DATA_POOL.blank_paragraphs[Math.floor(Math.random() * DATA_POOL.blank_paragraphs.length)];
    els.blankDisplay.innerHTML = generateInteractiveCTest(state.targetContext);

    // 모든 input에 이벤트 리스너 달아서 제출 버튼 활성화 체크
    document.querySelectorAll('.c-test-input').forEach(input => {
      input.addEventListener('input', checkBlankInputs);
    });
  }

  showView('quiz');
  startTimer();
}

// 빈칸 입력 검사 (하나라도 적으면 활성화)
function checkBlankInputs() {
  let hasInput = Array.from(document.querySelectorAll('.c-test-input')).some(inp => inp.value.trim().length > 0);
  els.submitBtn.disabled = !hasInput;
  if(hasInput) els.submitBtn.classList.remove('inactive');
  else els.submitBtn.classList.add('inactive');
}

// Textarea 입력 검사
els.textarea.addEventListener('input', (e) => {
  const isValid = state.mode === 'photo' ? e.target.value.trim().length > 20 : e.target.value.trim().length > 5; 
  els.submitBtn.disabled = !isValid;
  if(isValid) els.submitBtn.classList.remove('inactive');
  else els.submitBtn.classList.add('inactive');
});

// 5. 오디오 / 타이머
function playAudio(text) {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US'; utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}

function startTimer() {
  const maxTime = TIME_LIMITS[state.mode];
  state.timerId = setInterval(() => {
    state.timer--;
    document.getElementById('timer').innerText = `${String(Math.floor(state.timer / 60)).padStart(2, '0')}:${String(state.timer % 60).padStart(2, '0')}`;
    document.getElementById('progress-filler').style.width = `${((maxTime - state.timer) / maxTime) * 100}%`;
    if (state.timer <= 0) submitExam();
  }, 1000);
}

// 6. 서버 제출 및 기록 저장
async function submitExam() {
  clearInterval(state.timerId);
  els.submitBtn.disabled = true; els.submitBtn.innerText = "AI 분석 중... 🏃‍♂️";

  // 모드에 따라 전송할 텍스트 결정
  const finalUserText = state.mode === 'blank' ? getReconstructedCTestText() : els.textarea.value;

  try {
    const res = await fetch('/api/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: state.mode, text: finalUserText, targetContext: state.targetContext })
    });
    
    if (!res.ok) throw new Error('서버 에러 발생');
    const result = await res.json();
    
    // 타임스탬프 추가해서 저장
    const finalResult = { id: Date.now(), date: new Date().toLocaleString(), mode: state.mode, ...result };
    saveToStorage(finalResult);
    
    state.previousView = 'setup'; // 시험 직후엔 메인으로 돌아가도록 세팅
    renderReview(finalResult);
  } catch (err) {
    alert(err.message);
    els.submitBtn.disabled = false; els.submitBtn.innerText = "제출하기";
    startTimer();
  }
}

function saveToStorage(result) {
  const history = JSON.parse(localStorage.getItem('det_history') || '[]');
  history.push(result);
  localStorage.setItem('det_history', JSON.stringify(history));
}

// ==========================================
// 🚀 핵심 3: 고장 난 히스토리 완벽 복원 (Deep Dive)
// ==========================================
function renderHistoryList() {
  const history = JSON.parse(localStorage.getItem('det_history') || '[]');
  if(history.length === 0) {
    els.historyList.innerHTML = '<div class="analysis-box" style="text-align:center;">저장된 기록이 없습니다.</div>';
  } else {
    // 클릭 시 상세 분석 화면(renderReview)으로 넘어가는 리스트 생성
    els.historyList.innerHTML = history.reverse().map(h => `
      <div class="analysis-box clickable" onclick="openHistoryDetail(${h.id})">
        <h3 style="display:flex; justify-content:space-between; margin-bottom: 5px;">
          <span style="font-size:14px; color:#888;">${h.date}</span>
          <span style="color:var(--green);">${h.score}점</span>
        </h3>
        <p style="margin-top:0; font-size: 14px;"><strong>[${h.mode.toUpperCase()}]</strong> ${h.feedback.substring(0, 30)}...</p>
        <div style="text-align:right; font-size:12px; color:var(--blue);">상세 보기 ➔</div>
      </div>
    `).join('');
  }
  showView('history');
}

// 전역 함수로 등록하여 HTML onclick에서 접근 가능하게 함
window.openHistoryDetail = (id) => {
  const history = JSON.parse(localStorage.getItem('det_history') || '[]');
  const data = history.find(h => h.id === id);
  if(data) {
    state.previousView = 'history'; // 뒤로 가기 눌렀을 때 히스토리 목록으로 가도록 세팅
    renderReview(data);
  }
};

function renderReview(data) {
  const content = document.getElementById('review-content');
  
  // 뒤로가기 버튼 로직 (어디서 왔느냐에 따라 다름)
  const backBtn = document.getElementById('btn-back-from-review');
  if(state.previousView === 'history') {
    backBtn.innerText = "← 목록으로";
    backBtn.onclick = renderHistoryList;
  } else {
    backBtn.innerText = "← 메인으로";
    backBtn.onclick = () => showView('setup');
  }

  content.innerHTML = `
    <div class="score-card">
      <p>EST. DET SCORE</p>
      <h1>${data.score || '--'}</h1>
      <p style="color:#666; font-weight:700;">${data.feedback}</p>
    </div>
    
    ${data.vocabulary && data.vocabulary.length > 0 ? `
    <div class="analysis-box">
      <h3>📖 단어 & 표현 복기</h3>
      <ul>${data.vocabulary.map(v => `<li><strong>${v.word}</strong> - ${v.meaning} <br><span style="color:#888;">예문: "${v.example}"</span></li>`).join('')}</ul>
    </div>` : ''}

    ${data.grammar_focus && data.grammar_focus.length > 0 ? `
    <div class="analysis-box">
      <h3>🛠 Grammar Focus</h3>
      <ul>${data.grammar_focus.map(g => `<li><span class="error">${g.original}</span> → <span class="correct">${g.corrected}</span><br><span style="font-size:14px; color:#666;">💡 ${g.reason}</span></li>`).join('')}</ul>
    </div>` : ''}
  `;
  showView('review');
}

// 7. 메인 이벤트 바인딩
document.getElementById('btn-mode-photo').addEventListener('click', () => startMode('photo'));
document.getElementById('btn-mode-dictation').addEventListener('click', () => startMode('dictation'));
document.getElementById('btn-mode-blank').addEventListener('click', () => startMode('blank'));

// 기록 보기 버튼들
document.getElementById('btn-history').addEventListener('click', renderHistoryList);
document.getElementById('btn-home-from-history').addEventListener('click', () => showView('setup'));

document.getElementById('submit-btn').addEventListener('click', submitExam);
els.audioBtn.addEventListener('click', () => playAudio(state.targetContext));
