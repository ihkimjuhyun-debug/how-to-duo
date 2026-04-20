// api/evaluate.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text } = req.body;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // Vercel에 등록할 키

  if (!OPENAI_API_KEY) return res.status(500).json({ error: 'API Key missing' });

  // 20년 차 시니어의 프롬프트 엔지니어링 (JSON 강제 출력)
  const systemPrompt = `
    You are an expert Duolingo English Test (DET) evaluator.
    Evaluate the user's image description.
    You MUST respond STRICTLY in JSON format. Do not include markdown code blocks.
    Structure:
    {
      "score": <number between 10-160 in 5-point increments>,
      "feedback": "<A short, encouraging summary in Korean>",
      "vocabulary": [{"word": "<word>", "meaning": "<Korean meaning>", "example": "<example sentence>"}],
      "grammar_focus": [{"original": "<error>", "corrected": "<correction>", "reason": "<Korean explanation>"}],
      "better_expressions": [{"original": "<user phrase>", "improved": "<native phrase>"}]
    }
  `;

  try {
    const response = await fetch('[https://api.openai.com/v1/chat/completions](https://api.openai.com/v1/chat/completions)', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // 속도와 가성비가 가장 좋은 최신 모델
        response_format: { type: "json_object" }, // OpenAI 특화: 무조건 JSON으로만 응답하게 강제함
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `User Input: "${text}"` }
        ],
        temperature: 0.3
      })
    });

    const data = await response.json();
    const resultJson = JSON.parse(data.choices[0].message.content);
    
    res.status(200).json(resultJson);

  } catch (error) {
    console.error("OpenAI API Error:", error);
    res.status(500).json({ error: '평가 중 오류가 발생했습니다.' });
  }
}
