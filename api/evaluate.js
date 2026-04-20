// api/evaluate.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // mode: 'photo', 'dictation', 'blank' / targetContext: 정답 또는 사진 정보
  const { mode, text, targetContext } = req.body;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY; 

  if (!OPENAI_API_KEY) return res.status(500).json({ error: 'API Key missing' });

  const systemPrompt = `
    You are an expert Duolingo English Test (DET) evaluator.
    The user is doing a task of type: [${mode}].
    - If mode is 'photo', evaluate their description of a photo.
    - If mode is 'dictation', compare their text to the original audio script: "${targetContext}".
    - If mode is 'blank', check if they filled the blank correctly for: "${targetContext}".

    You MUST respond STRICTLY in JSON format.
    Structure:
    {
      "score": <number between 10-160 in 5-point increments>,
      "feedback": "<A short, encouraging summary in Korean about their performance>",
      "vocabulary": [{"word": "<word>", "meaning": "<Korean meaning>", "example": "<example>"}],
      "grammar_focus": [{"original": "<user error>", "corrected": "<correction>", "reason": "<Korean explanation>"}],
      "better_expressions": [{"original": "<user phrase>", "improved": "<native phrase>"}]
    }
  `;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: "json_object" },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `User Input: "${text}"` }
        ],
        temperature: 0.3
      })
    });

    const data = await response.json();
    res.status(200).json(JSON.parse(data.choices[0].message.content));
  } catch (error) {
    console.error("OpenAI API Error:", error);
    res.status(500).json({ error: '평가 중 서버 오류가 발생했습니다.' });
  }
}
