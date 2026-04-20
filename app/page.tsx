'use client';

import { useState, useEffect } from 'react';

// ✅ 빌드 에러(Build Failed)를 막기 위한 TypeScript 타입 정의
interface Vocabulary { word: string; meaning: string; usage: string; }
interface Idiom { phrase: string; meaning: string; usage: string; }
interface Writing { original: string; corrected: string; score: number; feedback: string; }
interface Spoken { expression: string; situation: string; }

interface StorageData {
  vocabulary: Vocabulary[];
  idioms: Idiom[];
  writing: Writing[];
  spoken: Spoken[];
}

export default function EnglishStudyApp() {
  const [inputText, setInputText] = useState('');
  const [activeTab, setActiveTab] = useState('input');
  const [loading, setLoading] = useState(false);
  
  // ✅ 초기 상태에도 엄격하게 타입을 부여합니다.
  const [storage, setStorage] = useState<StorageData>({
    vocabulary: [], idioms: [], writing: [], spoken: []
  });

  useEffect(() => {
    const savedData = localStorage.getItem('my_english_vault_v2');
    if (savedData) {
      setStorage(JSON.parse(savedData));
    }
  }, []);

  const handleProcessData = async () => {
    if (!inputText.trim()) return;
    setLoading(true);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      // ✅ 데이터를 안전하게 병합
      const updatedStorage: StorageData = {
        vocabulary: [...(result.vocabulary || []), ...storage.vocabulary],
        idioms: [...(result.idioms || []), ...storage.idioms],
        writing: [...(result.writing || []), ...storage.writing],
        spoken: [...(result.spoken || []), ...storage.spoken],
      };

      setStorage(updatedStorage);
      localStorage.setItem('my_english_vault_v2', JSON.stringify(updatedStorage));
      setInputText('');
      setActiveTab('writing');
    } catch (err) {
      console.error(err);
      alert("분석에 실패했습니다. 관리자 도구를 확인해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans">
      <div className="max-w-4xl mx-auto">
        
        <header className="py-10 text-center">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">STUDY HUB <span className="text-blue-600">PRO</span></h1>
          <p className="text-slate-500 mt-2">빌드 에러 없는 완벽한 자동 분류 시스템</p>
        </header>

        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 mb-8">
          {[
            { id: 'input', label: '텍스트 입력' },
            { id: 'voca', label: '단어/숙어장' },
            { id: 'writing', label: '문장 교정' },
            { id: 'spoken', label: '구어 표현' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 min-h-[450px]">
          {activeTab === 'input' && (
            <div className="space-y-4">
              <textarea
                className="w-full h-72 p-6 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 text-lg outline-none"
                placeholder="학습한 내용을 여기에 자유롭게 붙여넣으세요..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
              <button
                onClick={handleProcessData}
                disabled={loading}
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold text-xl hover:bg-blue-700 transition-all disabled:bg-slate-300"
              >
                {loading ? "AI 분석 및 분류 중..." : "종합 분석 시작"}
              </button>
            </div>
          )}

          {activeTab === 'voca' && (
            <div className="grid md:grid-cols-2 gap-8">
              <section>
                <h3 className="text-lg font-bold text-blue-600 mb-4">📝 단어장</h3>
                {storage.vocabulary.map((v, i) => (
                  <div key={i} className="mb-4 p-4 bg-blue-50 rounded-xl">
                    <p className="font-bold text-blue-900">{v.word} <span className="text-sm font-normal text-blue-400">| {v.meaning}</span></p>
                    <p className="text-xs text-blue-600 mt-2 italic">{v.usage}</p>
                  </div>
                ))}
              </section>
              <section>
                <h3 className="text-lg font-bold text-indigo-600 mb-4">🔗 숙어 & Chunks</h3>
                {storage.idioms.map((id, i) => (
                  <div key={i} className="mb-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                    <p className="font-bold text-indigo-900">{id.phrase}</p>
                    <p className="text-sm text-indigo-700">{id.meaning}</p>
                    <p className="text-xs text-indigo-500 mt-2 italic">{id.usage}</p>
                  </div>
                ))}
              </section>
            </div>
          )}

          {activeTab === 'writing' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-emerald-600 mb-2">✍️ 라이팅 교정 및 평가</h3>
              {storage.writing.map((w, i) => (
                <div key={i} className="p-6 rounded-2xl border-2 border-slate-50 bg-slate-50">
                  <div className="flex justify-between items-center mb-4">
                    <span className="bg-white px-4 py-1.5 rounded-full text-xs font-black text-emerald-600 shadow-sm border border-emerald-100">AI SCORE: {w.score}/10</span>
                  </div>
                  <p className="text-rose-400 line-through text-sm mb-2">{w.original}</p>
                  <p className="text-slate-900 font-bold text-lg mb-3">→ {w.corrected}</p>
                  <div className="bg-white p-4 rounded-xl text-xs text-slate-500 leading-relaxed shadow-inner">
                    <strong>Feedback:</strong> {w.feedback}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'spoken' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-orange-600 mb-2">🗣️ 실전 구어체 표현</h3>
              {storage.spoken.map((s, i) => (
                <div key={i} className="p-5 bg-orange-50 rounded-2xl border border-orange-100">
                  <p className="text-orange-900 font-bold text-lg">"{s.expression}"</p>
                  <p className="text-sm text-orange-700 mt-1">상황: {s.situation}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
