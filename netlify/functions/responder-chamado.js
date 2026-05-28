// netlify/functions/responder-chamado.js
const { connectToDatabase } = require('../../utils/db');
const Chamado = require('../../models/Chamado');
const jwt = require('jsonwebtoken');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: 'Preflight OK' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido' }) };
  }

  try {
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Acesso negado.' }) };
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const perfisAutorizados = ['MULTIPROFISSIONAL', 'COORDENADOR', 'ADMIN'];
    if (!perfisAutorizados.includes(decoded.role)) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Acesso negado.' }) };
    }

    await connectToDatabase();
    const { chamadoId, respostaEquipe } = JSON.parse(event.body);

    if (!chamadoId || !respostaEquipe) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Dados insuficientes para responder.' }) };
    }

    // Procura o chamado e atualiza com a orientação psicopedagógica
    const chamadoAtualizado = await Chamado.findByIdAndUpdate(
      chamadoId,
      {
        respostaEquipe,
        status: 'RESOLVIDO',
        respondidoPor: decoded.userId,
        dataResposta: new Date()
      },
      { new: true }
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Orientação enviada e chamado finalizado com sucesso.', chamado: chamadoAtualizado })
    };

  } catch (error) {
    console.error("❌ ERRO AO RESPONDER CHAMADO:", error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro ao processar resposta.' }) };
  }
};