// api/evaluate.js
module.exports = async function handler(req, res) {
  // 1. 완벽한 CORS 처리 (어떤 브라우저 환경에서도 에러 없이 통신)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { mode, text, targetContext } = req.body;
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: '환경변수에 OPENAI_API_KEY가 없습니다. Vercel 대시보드를 확인하세요.' });
    }

    // 2. 베테랑의 다중 모드 & 디테일 JSON 프롬프트 (보편적 일상 예문 적용)
    const systemPrompt = `
      You are an expert Duolingo English Test (DET) evaluator.
      Task mode: [${mode}].
      - If 'photo', evaluate the user's description of a photo.
      - If 'dictation', compare user text to the audio script: "${targetContext}".
      - If 'blank', check if they filled the blank correctly for: "${targetContext}".

      Use universal, daily-life contexts for examples. 
      You MUST respond STRICTLY in JSON format without markdown code blocks.
      Structure:
      {
        "score": <number 10-160, 5-point increments>,
        "feedback": "<A short, encouraging summary in Korean>",
        "vocabulary": [{"word": "<word>", "meaning": "<Korean meaning>", "example": "<universal daily-life example>"}],
        "grammar_focus": [{"original": "<user error>", "corrected": "<correction>", "reason": "<Korean explanation>"}],
        "better_expressions": [{"original": "<user phrase>", "improved": "<native phrase>"}]
      }
    `;

    // 3. OpenAI API 안전 호출
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: "json_object" }, // 무조건 JSON만 뱉게 강제
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `User Input: "${text}"` }
        ],
        temperature: 0.3
      })
    });

    const data = await response.json();
    
    // 4. OpenAI 자체 에러 핸들링
    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    // 5. 결과 반환
    const resultText = data.choices[0].message.content;
    res.status(200).json(JSON.parse(resultText));

  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: '서버 평가 중 오류가 발생했습니다: ' + error.message });
  }
};
