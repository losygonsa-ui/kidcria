exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let age, cat;
  try {
    const body = JSON.parse(event.body);
    age = body.age;
    cat = body.cat;
  } catch {
    return { statusCode: 400, body: 'Invalid request body' };
  }

  if (!age || !cat) {
    return { statusCode: 400, body: 'Missing age or category' };
  }

  const prompt = `Você é um especialista em atividades infantis criativas. Crie uma atividade detalhada para crianças.

Parâmetros:
- Faixa etária: ${age} anos
- Categoria: ${cat}
- Idioma: Português brasileiro
${cat === 'Fé Cristã' ? '- Inclua referência bíblica ou valor cristão de forma lúdica e amorosa\n' : ''}
Responda APENAS com JSON válido, sem texto antes ou depois:
{
  "title": "Nome criativo e divertido da atividade",
  "description": "Descrição envolvente em 2-3 frases explicando o que a criança vai fazer e aprender",
  "duration": "Ex: 20-30 min",
  "difficulty": "Fácil ou Médio",
  "materials": ["material 1", "material 2", "material 3", "material 4"],
  "steps": ["Passo 1 bem explicado", "Passo 2 bem explicado", "Passo 3 bem explicado", "Passo 4 bem explicado"],
  "tip": "Dica especial para os pais tornarem a atividade ainda mais especial e afetiva"
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    console.log('Anthropic status:', response.status);
    console.log('Anthropic response:', JSON.stringify(data));

    const text = (data.content || []).map(i => i.text || '').join('');

    let activity;
    try {
      const clean = text.replace(/```json|```/g, '').trim();
      activity = JSON.parse(clean);
    } catch (parseErr) {
      console.log('Parse error:', parseErr.message, 'Text was:', text);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to parse activity' }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activity),
    };
  } catch (error) {
    console.log('Fetch error:', error.message);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
