// netlify/functions/abrir-chamado.js
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
    return { statusCode: 200, headers, body: 'Preflight call successful' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido' }) };
  }

  try {
    // 1. Extração e Validação do Token (A porta de segurança)
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Acesso negado. Token não fornecido.' }) };
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Sessão expirada ou token inválido. Faça login novamente.' }) };
    }

    // 2. Conexão com o Banco de Dados
    await connectToDatabase();
    
    const { assunto, mensagem, nivelUrgencia } = JSON.parse(event.body);

    // 3. Criação do Chamado vinculando ao ID seguro extraído do Token
    const novoChamado = new Chamado({
      monitorId: decoded.userId, // O ID vem da assinatura digital, é à prova de fraudes
      assunto,
      mensagem,
      nivelUrgencia: nivelUrgencia || 'MÉDIO'
    });

    const resultado = await novoChamado.save();

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ 
        message: 'Chamado enviado com sucesso para a equipe multiprofissional.', 
        ticketId: resultado._id 
      }),
    };

  } catch (error) {
    console.error("❌ ERRO AO ABRIR CHAMADO:", error);
    return { 
      statusCode: 400, 
      headers,
      body: JSON.stringify({ error: error.message || 'Erro ao registrar o chamado.' }) 
    };
  }
};