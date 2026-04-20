// pages/index.js
import { useState, useEffect } from "react";

// ── API 호출 (서버 프록시 경유 - API 키 클라이언트 노출 없음) ───────────────
const callAI = async (system, message) => {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, message }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "서버 오류");
  return data.result || "";
};

// ── 로컬스토리지 헬퍼 (Vercel 배포 환경) ────────────────────────────────────
const lsGet = (key) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; }
  catch { return null; }
};
const lsSet = (key, val) => {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
};

const TABS = ["📋 오늘 정리", "✍️ 문장 평가", "📖 단어장", "🔁 복습"];

// ── 마크다운 렌더러 ──────────────────────────────────────────────────────────
function RichText({ text }) {
  if (!text) return null;
  return (
    <div style={{ lineHeight: 1.8 }}>
      {text.split("\n").map((line, i) => {
        const t = line.trim();
        if (!t) return <br key={i} />;
        if (t.startsWith("## ")) return <p key={i} style={{ margin: "14px 0 4px", fontWeight: 700, fontSize: 15, color: "#5c3d11", fontFamily: "Georgia,serif" }}>{inline(t.slice(3))}</p>;
        if (t.startsWith("# ")) return <p key={i} style={{ margin: "18px 0 6px", fontWeight: 700, fontSize: 17, color: "#3b2509", fontFamily: "Georgia,serif" }}>{inline(t.slice(2))}</p>;
        if (t.startsWith("- ") || t.startsWith("• ")) return <div key={i} style={{ display:"flex", gap:8, margin:"3px 0" }}><span style={{color:"#c4820a",minWidth:12}}>•</span><span>{inline(t.slice(2))}</span></div>;
        const nm = t.match(/^(\d+)\.\s/);
        if (nm) return <div key={i} style={{ display:"flex", gap:8, margin:"3px 0" }}><span style={{color:"#c4820a",minWidth:18,fontWeight:600}}>{nm[1]}.</span><span>{inline(t.slice(nm[0].length))}</span></div>;
        return <p key={i} style={{ margin:"4px 0" }}>{inline(t)}</p>;
      })}
    </div>
  );
}
function inline(text) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i} style={{color:"#7c3d08"}}>{p.slice(2,-2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*")) return <em key={i} style={{color:"#9c5c1a"}}>{p.slice(1,-1)}</em>;
    if (p.startsWith("`") && p.endsWith("`")) return <code key={i} style={{background:"#fde8c2",padding:"1px 5px",borderRadius:4,fontFamily:"monospace",fontSize:13}}>{p.slice(1,-1)}</code>;
    return p;
  });
}

// ── 공통 UI ──────────────────────────────────────────────────────────────────
const Spinner = () => (
  <div style={{display:"flex",alignItems:"center",gap:10,color:"#b06b0a",padding:"16px 0"}}>
    <div style={{width:18,height:18,border:"2.5px solid #f5d9a8",borderTop:"2.5px solid #c4820a",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
    <span style={{fontSize:14,fontStyle:"italic"}}>GPT-4o가 분석 중이에요...</span>
  </div>
);

const Card = ({ children, style }) => (
  <div style={{background:"#fffbf4",border:"1px solid #f0d9a8",borderRadius:14,padding:20,marginBottom:16,boxShadow:"0 2px 12px rgba(180,120,30,0.07)",...style}}>
    {children}
  </div>
);

const Btn = ({ children, onClick, variant="primary", disabled, style }) => {
  const v = {
    primary:{background:"linear-gradient(135deg,#e8a020,#c47010)",color:"#fff",boxShadow:"0 3px 10px rgba(196,112,16,0.3)",border:"none"},
    secondary:{background:"#fff7ec",color:"#8c5210",border:"1.5px solid #e8c070"},
    danger:{background:"#fff0f0",color:"#c44040",border:"1.5px solid #f0b0b0"},
    success:{background:"#f0fff4",color:"#2e7d4a",border:"1.5px solid #90daa8"},
  };
  return <button style={{borderRadius:10,padding:"10px 20px",fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:14,cursor:disabled?"not-allowed":"pointer",transition:"all 0.18s",opacity:disabled?0.55:1,...v[variant],...style}} onClick={onClick} disabled={disabled}>{children}</button>;
};

const Textarea = ({ value, onChange, placeholder, rows=5 }) => (
  <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows}
    style={{width:"100%",boxSizing:"border-box",border:"1.5px solid #e8d0a0",borderRadius:10,padding:"12px 14px",fontFamily:"'Nunito',sans-serif",fontSize:14,lineHeight:1.6,background:"#fffdf8",color:"#3b2509",resize:"vertical",outline:"none"}}
    onFocus={e=>e.target.style.borderColor="#c4820a"} onBlur={e=>e.target.style.borderColor="#e8d0a0"}
  />
);

const Input = ({ value, onChange, placeholder, type="text" }) => (
  <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} type={type}
    style={{width:"100%",boxSizing:"border-box",border:"1.5px solid #e8d0a0",borderRadius:10,padding:"10px 14px",fontFamily:"'Nunito',sans-serif",fontSize:14,background:"#fffdf8",color:"#3b2509",outline:"none"}}
    onFocus={e=>e.target.style.borderColor="#c4820a"} onBlur={e=>e.target.style.borderColor="#e8d0a0"}
  />
);

// ── 에러 배너 ─────────────────────────────────────────────────────────────────
const ErrorBanner = ({ msg, onClose }) => (
  <div style={{background:"#fff0f0",border:"1.5px solid #f0b0b0",borderRadius:10,padding:"12px 16px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center",color:"#c44040",fontSize:14}}>
    <span>⚠️ {msg}</span>
    <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"#c44040",fontSize:18,lineHeight:1}}>×</button>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// TAB 1 – 오늘의 구글독스 정리
// ═══════════════════════════════════════════════════════════════════════════
function TabOrganize({ addToHistory }) {
  const [raw, setRaw] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const analyze = async () => {
    if (!raw.trim()) return;
    setLoading(true); setResult(null); setSaved(false); setError("");
    try {
      const sys = `당신은 영어 학습 코치입니다. 사용자가 구글독스에 받아적은 영어 학습 메모를 분석하여 한국어로 상세하게 정리합니다.

반드시 아래 구조로 마크다운으로 응답하세요:

# 📚 오늘의 학습 정리

## 단어 & 표현
(발견된 단어/숙어/표현들: **단어** - 뜻, 품사, 사용 상황, 예문)

## 구동사 & 연어
(phrasal verbs, collocations 정리)

## 라이팅 분석
(문법/표현 분석. 형용사·부사 사용법 포인트 포함)

## 리스닝 포인트
(리스닝 관련 내용이 있다면)

## 💡 오늘의 핵심 표현 TOP 3

## 더 나은 표현 제안
(사용된 표현보다 더 자연스러운 영어 대안)`;
      const res = await callAI(sys, `오늘 구글독스에 받아적은 내용:\n\n${raw}`);
      setResult(res);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const saveEntry = () => {
    const date = new Date().toLocaleDateString("ko-KR");
    const entry = { date, raw, result, id: Date.now() };
    const hist = lsGet("study_history") || [];
    hist.unshift(entry);
    lsSet("study_history", hist.slice(0, 30));
    addToHistory(entry);
    setSaved(true);
  };

  return (
    <div>
      <Card>
        <h3 style={{margin:"0 0 6px",color:"#5c3d11",fontSize:16}}>📋 오늘의 구글독스 내용 붙여넣기</h3>
        <p style={{margin:"0 0 12px",fontSize:13,color:"#8c6030"}}>구글독스에서 오늘 공부한 내용을 그대로 복붙하세요. 단어, 문장, 받아쓰기 뭐든 OK!</p>
        <Textarea value={raw} onChange={setRaw} placeholder={"예시:\nbelieve in - 믿다\nI believe in what they study...\nListening: The company has been around for 20 years\nPhrasal: give up, put off..."} rows={8}/>
        <div style={{marginTop:12,display:"flex",gap:10,flexWrap:"wrap"}}>
          <Btn onClick={analyze} disabled={loading||!raw.trim()}>🔍 AI로 정리하기</Btn>
          {result && !saved && <Btn variant="success" onClick={saveEntry}>💾 복습 저장</Btn>}
          {saved && <span style={{color:"#2e7d4a",fontSize:13,alignSelf:"center"}}>✅ 저장됨!</span>}
          {raw && <Btn variant="secondary" onClick={()=>{setRaw("");setResult(null);setSaved(false);}}>🗑 초기화</Btn>}
        </div>
      </Card>
      {error && <ErrorBanner msg={error} onClose={()=>setError("")}/>}
      {loading && <Spinner/>}
      {result && <Card style={{background:"#fffdf6"}}><RichText text={result}/></Card>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 2 – 문장 평가
// ═══════════════════════════════════════════════════════════════════════════
function TabEvaluate() {
  const [mode, setMode] = useState("sentence");
  const [keyword, setKeyword] = useState("");
  const [sentence, setSentence] = useState("");
  const [context, setContext] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => { setResult(null); setSentence(""); setKeyword(""); setContext(""); setError(""); };

  const evaluate = async () => {
    if (!sentence.trim()) return;
    setLoading(true); setResult(null); setError("");
    try {
      const sys = `당신은 친절하고 꼼꼼한 영어 교사입니다. 학생이 만든 영어 문장을 분석합니다.

## ⭐ 점수: X / 10

## ✅ 잘한 점

## 🔧 개선할 점
(구체적으로 어느 부분이 어색하고 왜 그런지)

## 💫 수정된 문장
**원문:** (원래 문장)
**수정:** (자연스러운 버전)
**이유:** (왜 이렇게 바꿨는지)

## 🚀 더 세련된 표현
(같은 의미의 고급 표현 2~3가지)

## 📖 핵심 문법/어휘 포인트`;
      const msg = `${keyword?`키워드: "${keyword}"\n`:""}${context?`상황: ${context}\n`:""}내가 만든 문장: ${sentence}`;
      setResult(await callAI(sys, msg));
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  const lookup = async () => {
    if (!keyword.trim()) return;
    setLoading(true); setResult(null); setError("");
    try {
      const sys = `당신은 영어 어휘 전문가입니다. 영어 단어나 표현을 한국인 학습자에게 깊게 설명합니다.

# 📖 ${keyword}

## 기본 의미
## 사용 상황
## 예문 (5가지, 한국어 번역 포함)
## 구동사 & 파생어
## 헷갈리기 쉬운 비슷한 단어
## 🎯 외우는 팁`;
      setResult(await callAI(sys, `"${keyword}" 상세 설명`));
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        <Btn variant={mode==="sentence"?"primary":"secondary"} onClick={()=>{setMode("sentence");reset();}}>✍️ 문장 평가</Btn>
        <Btn variant={mode==="vocab"?"primary":"secondary"} onClick={()=>{setMode("vocab");reset();}}>🔍 단어 상세검색</Btn>
      </div>

      {mode==="sentence" && (
        <Card>
          <h3 style={{margin:"0 0 10px",color:"#5c3d11",fontSize:16}}>✍️ 내가 만든 문장 평가받기</h3>
          <div style={{marginBottom:10}}>
            <label style={{fontSize:13,color:"#8c6030",fontWeight:600,display:"block",marginBottom:5}}>키워드 (선택) — 예: believe in, give up</label>
            <Input value={keyword} onChange={setKeyword} placeholder="사용하려는 단어/표현"/>
          </div>
          <div style={{marginBottom:10}}>
            <label style={{fontSize:13,color:"#8c6030",fontWeight:600,display:"block",marginBottom:5}}>상황/주제 (선택)</label>
            <Input value={context} onChange={setContext} placeholder="예: 자기소개, 일상대화, 비즈니스..."/>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:13,color:"#8c6030",fontWeight:600,display:"block",marginBottom:5}}>내가 만든 문장 *</label>
            <Textarea value={sentence} onChange={setSentence} placeholder="예: I believe in what they study will lead a large amount of benefit" rows={3}/>
          </div>
          <Btn onClick={evaluate} disabled={loading||!sentence.trim()}>🎯 평가하기</Btn>
        </Card>
      )}

      {mode==="vocab" && (
        <Card>
          <h3 style={{margin:"0 0 10px",color:"#5c3d11",fontSize:16}}>🔍 단어 / 표현 깊게 파보기</h3>
          <div style={{marginBottom:12}}>
            <Input value={keyword} onChange={setKeyword} placeholder="예: give up, perseverance, look forward to..."/>
          </div>
          <Btn onClick={lookup} disabled={loading||!keyword.trim()}>🔎 상세 검색</Btn>
        </Card>
      )}

      {error && <ErrorBanner msg={error} onClose={()=>setError("")}/>}
      {loading && <Spinner/>}
      {result && (
        <Card style={{background:"#fffdf6"}}>
          <RichText text={result}/>
          <div style={{marginTop:14}}><Btn variant="secondary" onClick={reset}>🔄 새로 입력</Btn></div>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 3 – 단어장
// ═══════════════════════════════════════════════════════════════════════════
function TabVocabBook() {
  const [words, setWords] = useState([]);
  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [example, setExample] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiTips, setAiTips] = useState({});
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [tipsLoading, setTipsLoading] = useState(null);
  const [error, setError] = useState("");

  useEffect(()=>{ const d=lsGet("vocab_book"); if(d) setWords(d); },[]);
  const persist = (list) => { setWords(list); lsSet("vocab_book",list); };

  const add = async () => {
    if (!word.trim()) return;
    const entry = { id: editId||Date.now(), word:word.trim(), meaning:meaning.trim(), example:example.trim(), added:new Date().toLocaleDateString("ko-KR") };
    const updated = editId ? words.map(w=>w.id===editId?entry:w) : [entry,...words];
    persist(updated);
    setWord(""); setMeaning(""); setExample(""); setEditId(null);
  };

  const autoFill = async () => {
    if (!word.trim()) return;
    setLoading(true); setError("");
    try {
      const sys = `영어 단어/표현의 뜻(한국어)과 예문을 JSON으로만 반환. 다른 텍스트 없이 JSON만.
형식: {"meaning":"한국어 뜻 (품사)","example":"English example sentence"}`;
      const res = await callAI(sys, word.trim());
      const j = JSON.parse(res.replace(/```json|```/g,"").trim());
      setMeaning(j.meaning||""); setExample(j.example||"");
    } catch(e) { setError("자동입력 실패: " + e.message); }
    setLoading(false);
  };

  const getTip = async (w) => {
    setTipsLoading(w.id); setError("");
    try {
      const sys = `단어에 대한 짧고 임팩트 있는 학습 팁을 한국어로 2~3문장. 마크다운 없이 평문으로.`;
      const tip = await callAI(sys, `단어: ${w.word}\n뜻: ${w.meaning}`);
      setAiTips(p=>({...p,[w.id]:tip}));
    } catch(e) { setError(e.message); }
    setTipsLoading(null);
  };

  const filtered = words.filter(w=>w.word.toLowerCase().includes(search.toLowerCase())||w.meaning.includes(search));

  return (
    <div>
      <Card>
        <h3 style={{margin:"0 0 12px",color:"#5c3d11",fontSize:16}}>{editId?"✏️ 단어 수정":"➕ 단어 추가"}</h3>
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          <div style={{flex:1}}><Input value={word} onChange={setWord} placeholder="단어 또는 표현 (예: give up)"/></div>
          <Btn variant="secondary" onClick={autoFill} disabled={loading||!word.trim()}>{loading?"...":"✨ 자동입력"}</Btn>
        </div>
        <div style={{marginBottom:8}}><Input value={meaning} onChange={setMeaning} placeholder="뜻 (한국어)"/></div>
        <div style={{marginBottom:12}}><Input value={example} onChange={setExample} placeholder="예문"/></div>
        <div style={{display:"flex",gap:8}}>
          <Btn onClick={add} disabled={!word.trim()}>{editId?"💾 저장":"➕ 추가"}</Btn>
          {editId && <Btn variant="secondary" onClick={()=>{setWord("");setMeaning("");setExample("");setEditId(null);}}>취소</Btn>}
        </div>
      </Card>
      {error && <ErrorBanner msg={error} onClose={()=>setError("")}/>}
      {words.length>0 && <div style={{marginBottom:12}}><Input value={search} onChange={setSearch} placeholder="🔍 단어 검색..."/></div>}
      <div style={{fontSize:13,color:"#8c6030",marginBottom:10}}>총 {words.length}개{search&&` (검색: ${filtered.length}개)`}</div>
      {filtered.map(w=>(
        <Card key={w.id} style={{padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                <span style={{fontFamily:"Georgia,serif",fontSize:18,fontWeight:700,color:"#7c3d08"}}>{w.word}</span>
                <span style={{fontSize:11,color:"#b09070",background:"#fdf0d8",padding:"2px 8px",borderRadius:20}}>{w.added}</span>
              </div>
              {w.meaning && <div style={{fontSize:14,color:"#5c3d11",marginBottom:4}}>📌 {w.meaning}</div>}
              {w.example && <div style={{fontSize:13,color:"#8c6030",fontStyle:"italic"}}>💬 {w.example}</div>}
              {aiTips[w.id] && <div style={{marginTop:8,padding:"8px 12px",background:"#fff8e8",borderRadius:8,fontSize:13,color:"#6c4020",borderLeft:"3px solid #e8a020"}}>💡 {aiTips[w.id]}</div>}
              {tipsLoading===w.id && <div style={{fontSize:12,color:"#b06b0a",marginTop:6}}>분석 중...</div>}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              <Btn variant="secondary" style={{padding:"5px 10px",fontSize:12}} onClick={()=>{setWord(w.word);setMeaning(w.meaning);setExample(w.example);setEditId(w.id);}}>✏️</Btn>
              <Btn variant="secondary" style={{padding:"5px 10px",fontSize:12}} onClick={()=>getTip(w)} disabled={tipsLoading===w.id}>💡</Btn>
              <Btn variant="danger" style={{padding:"5px 10px",fontSize:12}} onClick={()=>persist(words.filter(x=>x.id!==w.id))}>🗑</Btn>
            </div>
          </div>
        </Card>
      ))}
      {words.length===0 && <div style={{textAlign:"center",padding:"40px 20px",color:"#b09070"}}><div style={{fontSize:36,marginBottom:10}}>📚</div>단어장이 비어있어요!</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 4 – 복습
// ═══════════════════════════════════════════════════════════════════════════
function TabReview() {
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [quizMode, setQuizMode] = useState(false);
  const [quizQ, setQuizQ] = useState("");
  const [quizA, setQuizA] = useState("");
  const [quizResult, setQuizResult] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(()=>{ const d=lsGet("study_history"); if(d) setHistory(d); },[]);

  const remove = (id) => {
    const updated = history.filter(h=>h.id!==id);
    setHistory(updated); lsSet("study_history",updated);
    if(selected?.id===id) setSelected(null);
  };

  const startQuiz = async (entry) => {
    setQuizMode(true); setQuizQ(""); setQuizA(""); setQuizResult(null); setError("");
    setQuizLoading(true);
    try {
      const sys = `아래 학습 내용을 바탕으로 퀴즈 문제 하나를 만들어주세요. 질문만 한국어로 작성. 다른 텍스트 없이 질문만.`;
      setQuizQ(await callAI(sys, entry.result));
    } catch(e) { setError(e.message); }
    setQuizLoading(false);
  };

  const checkQuiz = async () => {
    if (!quizA.trim()||!selected) return;
    setQuizLoading(true); setError("");
    try {
      const sys = `퀴즈 답변을 평가하세요. 짧고 친절하게 한국어로. 마크다운 없이 평문으로.`;
      setQuizResult(await callAI(sys, `문제: ${quizQ}\n학습자 답: ${quizA}\n원본 학습내용:\n${selected.result}`));
    } catch(e) { setError(e.message); }
    setQuizLoading(false);
  };

  return (
    <div>
      <h3 style={{margin:"0 0 16px",color:"#5c3d11",fontSize:16}}>🔁 저장된 학습 기록</h3>
      {history.length===0 && (
        <div style={{textAlign:"center",padding:"40px 20px",color:"#b09070"}}><div style={{fontSize:36,marginBottom:10}}>📂</div>'오늘 정리' 탭에서 저장하면 여기서 복습할 수 있어요!</div>
      )}
      {history.map(h=>(
        <Card key={h.id} style={{padding:14,cursor:"pointer",border:selected?.id===h.id?"2px solid #c4820a":"1px solid #f0d9a8"}} onClick={()=>{setSelected(h);setQuizMode(false);setQuizQ("");setQuizA("");setQuizResult(null);}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontWeight:700,color:"#5c3d11",fontSize:15}}>📅 {h.date}</div>
              <div style={{fontSize:12,color:"#9c7040",marginTop:3}}>{h.raw.slice(0,60)}...</div>
            </div>
            <Btn variant="danger" style={{padding:"5px 10px",fontSize:12}} onClick={e=>{e.stopPropagation();remove(h.id);}}>🗑</Btn>
          </div>
        </Card>
      ))}
      {error && <ErrorBanner msg={error} onClose={()=>setError("")}/>}
      {selected && (
        <Card style={{background:"#fffdf6",marginTop:8}}>
          <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
            <Btn variant="secondary" onClick={()=>startQuiz(selected)} disabled={quizLoading}>🎓 퀴즈 만들기</Btn>
            <Btn variant="secondary" onClick={()=>setQuizMode(false)}>📖 내용 보기</Btn>
          </div>
          {!quizMode && <RichText text={selected.result}/>}
          {quizMode && (
            <div>
              {quizLoading&&!quizQ && <Spinner/>}
              {quizQ && (
                <div>
                  <div style={{background:"#fff8e8",border:"1.5px solid #e8c060",borderRadius:10,padding:14,marginBottom:12}}>
                    <div style={{fontWeight:700,color:"#8c5010",marginBottom:6}}>❓ 퀴즈</div>
                    <div style={{color:"#3b2509"}}>{quizQ}</div>
                  </div>
                  <Textarea value={quizA} onChange={setQuizA} placeholder="답을 입력해보세요..." rows={3}/>
                  <div style={{marginTop:8}}><Btn onClick={checkQuiz} disabled={quizLoading||!quizA.trim()}>✅ 정답 확인</Btn></div>
                  {quizLoading&&quizA && <Spinner/>}
                  {quizResult && <div style={{marginTop:12,padding:14,background:"#f0fff4",border:"1.5px solid #90daa8",borderRadius:10,color:"#2e5d3a"}}>{quizResult}</div>}
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════
export default function App() {
  const [tab, setTab] = useState(0);

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#fdf6e3 0%,#fdeec8 50%,#fdf6e3 100%)",fontFamily:"'Nunito','Segoe UI',sans-serif",color:"#3b2509"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Nunito:wght@400;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing:border-box; }
        textarea, input { font-family:'Nunito',sans-serif !important; }
        body { margin: 0; }
      `}</style>

      <div style={{background:"linear-gradient(135deg,#7c3d08,#b06010)",padding:"18px 20px",boxShadow:"0 4px 20px rgba(100,50,0,0.25)"}}>
        <div style={{maxWidth:640,margin:"0 auto",display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:26}}>🦉</span>
          <div>
            <h1 style={{margin:0,fontFamily:"'DM Serif Display',Georgia,serif",fontSize:20,color:"#fff"}}>English Study Hub</h1>
            <p style={{margin:0,fontSize:11,color:"#f5d9a8"}}>Duolingo 학습 정리 & GPT-4o 분석</p>
          </div>
        </div>
      </div>

      <div style={{background:"#8c4810",padding:"0 20px",display:"flex",gap:2,maxWidth:640,margin:"0 auto",overflowX:"auto"}}>
        {TABS.map((t,i)=>(
          <button key={i} onClick={()=>setTab(i)} style={{background:tab===i?"#fffbf4":"transparent",color:tab===i?"#7c3d08":"#f5d9a8",border:"none",padding:"11px 14px",fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer",whiteSpace:"nowrap",borderRadius:"8px 8px 0 0",transition:"all 0.18s"}}>{t}</button>
        ))}
      </div>

      <div style={{maxWidth:640,margin:"0 auto",padding:"20px 16px 40px"}}>
        <div style={{animation:"fadeIn 0.3s ease"}}>
          {tab===0 && <TabOrganize addToHistory={()=>{}}/>}
          {tab===1 && <TabEvaluate/>}
          {tab===2 && <TabVocabBook/>}
          {tab===3 && <TabReview/>}
        </div>
      </div>
    </div>
  );
}
