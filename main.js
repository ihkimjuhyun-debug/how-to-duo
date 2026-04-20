// main.js

// 1. 학습 데이터 세트 (보편적인 일상/학술/업무 시나리오 기반)
const DATA_POOL = {
  dictation: [
    "The library is located on the north side of the campus.",
    "Many people prefer to read digital books rather than paper ones.",
    "The new restaurant downtown offers a variety of vegetarian dishes.",
    "Regular exercise is essential for maintaining good physical health.",
    "Students are required to submit their assignments by Friday afternoon.",
    "Please make sure to turn off all the lights before leaving the office.",
    "Learning a second language can greatly improve your cognitive skills.",
    "The museum exhibits a wide collection of contemporary art.",
    "Public transportation is a convenient way to commute in the city.",
    "She has been working as a graphic designer for over five years."
  ],
  blank_paragraphs: [
    "The modern workplace has changed significantly over the past decade. Many companies now offer flexible schedules and remote work options. This shift allows employees to better balance their personal and professional lives. However, remote work also presents unique challenges, such as maintaining team communication. To overcome this, managers must utilize digital collaboration tools effectively. Ultimately, a hybrid approach might be the most sustainable solution for the future of business.",
    "Learning a new language can be a challenging but highly rewarding experience. It opens up opportunities to connect with people from completely different cultures. Consistent practice is the most important factor in achieving fluency. Listening to native speakers and watching movies can greatly improve pronunciation. Furthermore, making mistakes is a natural part of the learning process. Students should not feel embarrassed when they mispronounce a new word.",
    "Public parks play a vital role in improving the quality of life in urban areas. They provide residents with a safe space for recreation and relaxation away from the busy streets. Furthermore, green spaces help reduce air pollution and regulate the city temperature. Many communities organize weekly events, such as farmers' markets and outdoor concerts, in these locations. Investing in park maintenance is essential for promoting public health and fostering a strong sense of community."
  ]
};

// 2. 상태 관리
const state = { mode: '', timer: 0, timerId: null, targetContext: '' };
const TIME_LIMITS = { photo: 300, dictation: 60, blank: 180 }; // 빈칸은 3분으로 설정

// 3. DOM 요소 캐싱
const els = {
  views: document.querySelectorAll('.view'),
  instruction: document.getElementById('instruction'),
  targetImg: document.getElementById('target-image'),
  imgLoader: document.getElementById('image-loader'),
  audioBtn: document.getElementById('play-audio-btn'),
  blankDisplay: document.getElementById('blank-text-display'),
  textarea: document.getElementById('user-input'),
  submitBtn: document.getElementById('submit-btn')
};

// 4. C-Test (빈칸 채우기) 알고리즘 구현
function generateCTestText(paragraph) {
  let words = paragraph.split(' ');
  let candidateIndices = [];
  
  // 5글자 이상인 영단어의 인덱스를 수집
  words.forEach((w, i) => {
    let cleanWord = w.replace(/[^a-zA-Z]/g, '');
    if (cleanWord.length >= 5) candidateIndices.push(i);
  });
  
  // 배열을 섞어서 무작위로 12개(10~13개 사이) 선택
  candidateIndices.sort(() => 0.5 - Math.random());
  let selectedIndices = new Set(candidateIndices.slice(0, 12));

  let maskedWords = words.map((w, i) => {
    if (selectedIndices.has(i)) {
      let cleanWord = w.replace(/[^a-zA-Z]/g, ''); // 알파벳만 추출
      // 단어의 절반(올림)은 보여주고, 나머지는 밑줄 처리
      let keepLen = Math.ceil(cleanWord.length / 2);
      let kept = cleanWord.substring(0, keepLen);
      let masked = kept + "___"; // underst___ 형태
      // 기존 특수문자(마침표, 쉼표 등) 복구
      return `<strong style="color:var(--blue);">${w.replace(cleanWord, masked)}</strong>`;
    }
    return w;
  });
  
  return maskedWords.join(' ');
}

// 5. 화면 전환 및 게임 시작 로직
function showView(id) {
  els.views.forEach(v => v.classList.add('hidden'));
  document.getElementById(`${id}-view`).classList.remove('hidden');
}

function startMode(mode) {
  state.mode = mode;
  state.timer = TIME_LIMITS[mode];
  els.textarea.value = '';
  els.submitBtn.disabled = true; els.submitBtn.classList.add('inactive'); els.submitBtn.innerText = "제출하기";
  document.getElementById('progress-filler').style.width = '0%';
  
  // UI 요소 모두 숨기기
  els.targetImg.classList.add('hidden');
  els.imgLoader.classList.add('hidden');
  els.audioBtn.classList.add('hidden');
  els.blankDisplay.classList.add('hidden');

  if (mode === 'photo') {
    els.instruction.innerText = "📸 사진을 보고 영어로 묘사하세요 (최소 2문장 이상)";
    els.targetImg.classList.remove('hidden');
    els.imgLoader.classList.remove('hidden');
    els.targetImg.src = `https://picsum.photos/800/600?random=${Math.random()}`;
    els.targetImg.onload = () => els.imgLoader.classList.add('hidden');
    state.targetContext = "Random Image";
  } 
  else if (mode === 'dictation') {
    els.instruction.innerText = "🎧 음성을 듣고 정확히 받아 적으세요.";
    els.audioBtn.classList.remove('hidden');
    
    // 매번 다른 문장 랜덤 선택
    const randomSentence = DATA_POOL.dictation[Math.floor(Math.random() * DATA_POOL.dictation.length)];
    state.targetContext = randomSentence;
    
    // 시작과 동시에 한 번 읽어줌
    playAudio(state.targetContext);
  } 
  else if (mode === 'blank') {
    els.instruction.innerText = "🧩 빈칸(밑줄)에 들어갈 알맞은 단어를 유추하여 전체 문단을 완성하세요.";
    els.blankDisplay.classList.remove('hidden');
    
    // 매번 다른 문단 랜덤 선택
    const randomParagraph = DATA_POOL.blank_paragraphs[Math.floor(Math.random() * DATA_POOL.blank_paragraphs.length)];
    state.targetContext = randomParagraph;
    
    // 알고리즘을 통해 12개 빈칸 뚫기
    els.blankDisplay.innerHTML = generateCTestText(randomParagraph);
  }

  showView('quiz');
  startTimer();
}

// 오디오 재생 함수
function playAudio(text) {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}

// 타이머
function startTimer() {
  const maxTime = TIME_LIMITS[state.mode];
  state.timerId = setInterval(() => {
    state.timer--;
    const m = String(Math.floor(state.timer / 60)).padStart(2, '0');
    const s = String(state.timer % 60).padStart(2, '0');
    document.getElementById('timer').innerText = `${m}:${s}`;
    document.getElementById('progress-filler').style.width = `${((maxTime - state.timer) / maxTime) * 100}%`;

    if (state.timer <= 0) submitExam();
  }, 1000);
}

// 텍스트 입력 검증
els.textarea.addEventListener('input', (e) => {
  const isValid = state.mode === 'photo' ? e.target.value.trim().length > 20 : e.target.value.trim().length > 5; 
  els.submitBtn.disabled = !isValid;
  if(isValid) els.submitBtn.classList.remove('inactive');
  else els.submitBtn.classList.add('inactive');
});

// 6. 서버 제출 및 기록 저장
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

function saveToStorage(result) {
  const history = JSON.parse(localStorage.getItem('det_history') || '[]');
  history.push({ date: new Date().toLocaleString(), mode: state.mode, ...result });
  localStorage.setItem('det_history', JSON.stringify(history));

  if(result.vocabulary) {
    const vocab = JSON.parse(localStorage.getItem('det_vocab') || '[]');
    localStorage.setItem('det_vocab', JSON.stringify([...vocab, ...result.vocabulary]));
  }
}

// 7. 화면 렌더링 (리뷰 및 히스토리)
function renderReview(data) {
  const content = document.getElementById('review-content');
  content.innerHTML = `
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
}

function renderHistory() {
  const history = JSON.parse(localStorage.getItem('det_history') || '[]');
  const content = document.getElementById('review-content');
  if(history.length === 0) {
    content.innerHTML = '<div class="analysis-box" style="text-align:center;">저장된 기록이 없습니다. 시험을 먼저 진행해주세요!</div>';
  } else {
    content.innerHTML = history.reverse().map(h => `
      <div class="analysis-box">
        <h3 style="display:flex; justify-content:space-between; margin-bottom: 5px;">
          <span style="font-size:14px; color:#888;">${h.date}</span>
          <span style="color:var(--green);">${h.score}점</span>
        </h3>
        <p style="margin-top:0;"><strong>[${h.mode.toUpperCase()}]</strong> ${h.feedback}</p>
      </div>
    `).join('');
  }
  document.getElementById('review-title').innerText = "나의 학습 기록";
  showView('review');
}

// 8. 이벤트 리스너 바인딩 (버그 없는 완벽한 연결)
document.getElementById('btn-mode-photo').addEventListener('click', () => startMode('photo'));
document.getElementById('btn-mode-dictation').addEventListener('click', () => startMode('dictation'));
document.getElementById('btn-mode-blank').addEventListener('click', () => startMode('blank'));
document.getElementById('btn-history').addEventListener('click', renderHistory);
document.getElementById('submit-btn').addEventListener('click', submitExam);
els.audioBtn.addEventListener('click', () => playAudio(state.targetContext));

document.getElementById('btn-home').addEventListener('click', () => {
  if(state.timerId) clearInterval(state.timerId);
  window.speechSynthesis.cancel();
  showView('setup');
});
