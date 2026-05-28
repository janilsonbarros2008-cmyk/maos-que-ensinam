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

    // Limpa a chave de possíveis aspas duplas/simples ou espaços extras invisíveis
    const apiKey = process.env.DEEPSEEK_API_KEY.replace(/['"]+/g, '').trim();

    // Rota /v1/ completa para garantir o padrão OpenAI exigido pelo endpoint REST nativo
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-v4-pro",
        messages: [
          { 
            role: "system", 
            content: "Você é um psicopedagogo supervisor e assistente especializado em inclusão escolar para o projeto Mãos que Ensinam. Seu objetivo é guiar alunos monitores do ensino médio de forma acolhedora, empática e muito prática. Ajude-os com estratégias de mediação para estudantes com TDAH, TEA (Autismo), dislexia, comprometimento cognitivo ou quaisquer outras neurodivergências. Dê respostas estruturadas, curtas, focadas em ações práticas do dia a dia da escola, evitando jargões acadêmicos pesados. Sem esquecer que você tem limitações e não realiza diagnósticos clínicos." 
          },
          { role: "user", content: prompt }
        ],
        stream: false
        // Os parâmetros 'thinking' explícitos foram removidos do body raiz
        // para evitar erro 400. A V4 Pro já opera neste formato ativamente.
      })
    });

    if (!response.ok) {
      // Captura o erro CRU e REAL da DeepSeek e joga na tela em vez de um aviso genérico!
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.error?.message || response.statusText;
      console.error("❌ Detalhes da recusa da API DeepSeek:", errorData || errorMessage);
      throw new Error(`DeepSeek respondeu (${response.status}): ${errorMessage}`);
    }

    const data = await response.json();
    
    // A V4 Pro separa a reposta entre "raciocínio" e "resposta oficial"
    const respostaFinal = data.choices[0].message.content;
    const raciocinio = data.choices[0].message.reasoning_content;

    // Se a IA gerou fluxo de raciocínio, vamos exibi-lo formatado
    let textoResposta = respostaFinal;
    if (raciocinio && raciocinio.trim() !== '') {
      textoResposta = `*Processo de Triagem da IA:*\n_${raciocinio}_\n\n---\n\n*Orientação Pedagógica:*\n${respostaFinal}`;
    }

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