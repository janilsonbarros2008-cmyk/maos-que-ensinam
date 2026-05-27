// netlify/functions/chat-ia.js

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: 'Preflight call successful' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido' }) };
  }

  try {
    const { prompt } = JSON.parse(event.body);

    if (!prompt) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'A pergunta não pode estar vazia.' }) };
    }

    if (!process.env.DEEPSEEK_API_KEY) {
      throw new Error("A credencial DEEPSEEK_API_KEY não foi configurada no arquivo .env");
    }

    // Chamada nativa seguindo o padrão REST/OpenAI fornecido por você
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-v4-pro",
        messages: [
          { 
            role: "system", 
            content: "Você é um psicopedagogo supervisor e assistente especializado em inclusão escolar para o projeto Mãos que Ensinam. Seu objetivo é guiar alunos monitores do ensino médio de forma acolhedora, empática e muito prática. Ajude-os com estratégias de mediação para estudantes com TDAH, TEA (Autismo), dislexia, comprometimento cognitivo ou quaisquer outras neurodivergências. Dê respostas estruturadas, curtas, focadas em ações práticas do dia a dia da escola, evitando jargões acadêmicos pesados. Sem esquecer que você têm limitações e não" 
          },
          { role: "user", content: prompt }
        ],
        thinking: { "type": "enabled" },
        reasoning_effort: "high",
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro na API DeepSeek:", errorText);
      throw new Error("O servidor de IA encontrou dificuldades. Tente novamente.");
    }

    const data = await response.json();
    const textoResposta = data.choices[0].message.content;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ response: textoResposta })
    };

  } catch (error) {
    console.error("❌ ERRO NO ASSISTENTE DE IA:", error);
    return { 
      statusCode: 500, 
      headers, 
      body: JSON.stringify({ error: error.message || 'Erro interno ao processar a requisição.' }) 
    };
  }
};