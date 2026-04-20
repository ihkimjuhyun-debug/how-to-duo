// 1. 상태 및 상수
const TIME_LIMIT = 300; // 5분
const state = { view: 'setup', timer: TIME_LIMIT, timerId: null };

// 2. DOM 캐싱
const els = {
  views: document.querySelectorAll('.view'),
  image: document.getElementById('target-image'),
  loader: document.getElementById('image-loader'),
  textarea: document.getElementById('user-input'),
  submitBtn: document.getElementById('submit-btn'),
  timer: document.getElementById('timer'),
  progress: document.getElementById('progress-filler'),
  reviewContent: document.getElementById('review-content')
};

// 3. 화면 전환 함수
function showView(id) {
  els.views.forEach(v => v.classList.add('hidden'));
  document.getElementById(`${id}-view`).classList.remove('hidden');
}

// 4. 게임 로직
function loadRandomImage() {
  els.loader.style.display = 'block';
  els.image.style.display = 'none';
  els.image.src = `https://source.unsplash.com/random/800x600/?scenery,activity,object&sig=${Math.random()}`;
  els.image.onload = () => {
    els.loader.style.display = 'none';
    els.image.style.display = 'block';
  };
}

function startTimer() {
  state.timer = TIME_LIMIT;
  state.timerId = setInterval(() => {
    state.timer--;
    const m = String(Math.floor(state.timer / 60)).padStart(2, '0');
    const s = String(state.timer % 60).padStart(2, '0');
    els.timer.innerText = `${m}:${s}`;
    els.progress.style.width = `${((TIME_LIMIT - state.timer) / TIME_LIMIT) * 100}%`;

    if (state.timer <= 0) submitExam();
  }, 1000);
}

// 5. 서버 통신 및 저장 (OpenAI API 호출)
async function submitExam() {
  clearInterval(state.timerId);
  els.submitBtn.disabled = true;
  els.submitBtn.innerText = "분석 중...";

  try {
    const res = await fetch('/api/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: els.textarea.value })
    });
    
    if (!res.ok) throw new Error('서버 에러 발생');
    const result = await res.json();
    
    saveToStorage(result);
    renderReview(result);
  } catch (err) {
    alert(err.message);
    els.submitBtn.disabled = false;
    els.submitBtn.innerText = "제출하기";
  }
}

function saveToStorage(result) {
  // 전체 기록 저장
  const history = JSON.parse(localStorage.getItem('det_history') || '[]');
  history.push({ date: new Date().toLocaleString(), ...result });
  localStorage.setItem('det_history', JSON.stringify(history));

  // 단어장 누적 저장
  if(result.vocabulary) {
    const vocab = JSON.parse(localStorage.getItem('det_vocab') || '[]');
    localStorage.setItem('det_vocab', JSON.stringify([...vocab, ...result.vocabulary]));
  }
}

// 6. 렌더링 로직 (결과 화면 그려주기)
function renderReview(data) {
  els.reviewContent.innerHTML = `
    <div class="score-card">
      <p>EST. DET SCORE</p>
      <h1>${data.score}</h1>
      <p>${data.feedback}</p>
    </div>
    
    ${data.vocabulary ? `
    <div class="analysis-box">
      <h3>📖 Vocabulary</h3>
      <ul>${data.vocabulary.map(v => `<li><strong>${v.word}</strong>: ${v.meaning} <br><small>${v.example}</small></li>`).join('')}</ul>
    </div>` : ''}

    ${data.grammar_focus ? `
    <div class="analysis-box">
      <h3>🛠 Grammar Focus</h3>
      <ul>${data.grammar_focus.map(g => `<li><del>${g.original}</del> -> <strong>${g.corrected}</strong><br><small>${g.reason}</small></li>`).join('')}</ul>
    </div>` : ''}

    ${data.better_expressions ? `
    <div class="analysis-box">
      <h3>✨ Better Expressions</h3>
      <ul>${data.better_expressions.map(b => `<li>❌ ${b.original}<br>✅ <strong>${b.improved}</strong></li>`).join('')}</ul>
    </div>` : ''}
  `;
  showView('review');
}

// 과거 기록 보기 렌더링
function renderHistory() {
  const history = JSON.parse(localStorage.getItem('det_history') || '[]');
  if(history.length === 0) {
    els.reviewContent.innerHTML = '<p style="text-align:center;">저장된 기록이 없습니다.</p>';
  } else {
    els.reviewContent.innerHTML = history.reverse().map(h => `
      <div class="analysis-box">
        <h3>${h.date} - ${h.score}점</h3>
        <p>${h.feedback}</p>
      </div>
    `).join('');
  }
  document.getElementById('review-title').innerText = "나의 학습 기록";
  showView('review');
}

// 7. 이벤트 리스너 바인딩
document.getElementById('start-btn').onclick = () => {
  els.textarea.value = '';
  els.submitBtn.disabled = true; els.submitBtn.classList.add('inactive'); els.submitBtn.innerText = "제출하기";
  els.progress.style.width = '0%';
  showView('quiz');
  loadRandomImage();
  startTimer();
};

document.getElementById('history-btn').onclick = renderHistory;

document.getElementById('home-btn').onclick = () => {
  clearInterval(state.timerId);
  showView('setup');
};

els.textarea.oninput = (e) => {
  const isValid = e.target.value.trim().length > 20; // 20자 이상 입력 시 활성화
  els.submitBtn.disabled = !isValid;
  if(isValid) els.submitBtn.classList.remove('inactive');
  else els.submitBtn.classList.add('inactive');
};
