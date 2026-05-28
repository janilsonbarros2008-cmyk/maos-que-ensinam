// netlify/functions/atualizar-xp.js
const { connectToDatabase } = require('../../utils/db');
const User = require('../../models/User');
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

    // Apenas monitores ganham XP
    if (decoded.role !== 'MONITOR') {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Apenas Alunos Monitores podem acumular XP.' }) };
    }

    await connectToDatabase();
    
    // Recebe os pontos que devem ser adicionados
    const { xpGanhos } = JSON.parse(event.body);

    if (!xpGanhos || isNaN(xpGanhos)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Quantidade de XP inválida.' }) };
    }

    // Busca o usuário atual
    const usuario = await User.findById(decoded.userId);
    
    if (!usuario) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Usuário não encontrado.' }) };
    }

    // Garante que a estrutura de dados existe antes de somar
    if (!usuario.dadosMonitor) {
      usuario.dadosMonitor = { xp: 0, horasValidadas: 0, turma: 'Não definida' };
    }

    // Soma o XP atual com o novo XP (forçando conversão para número para evitar bugs)
    usuario.dadosMonitor.xp = Number(usuario.dadosMonitor.xp || 0) + Number(xpGanhos);

    await usuario.save();

    return { 
      statusCode: 200, 
      headers, 
      body: JSON.stringify({ 
        message: 'XP adicionado com sucesso!', 
        novoTotalXp: usuario.dadosMonitor.xp 
      }) 
    };

  } catch (error) {
    console.error("❌ ERRO AO ATUALIZAR XP:", error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro interno ao processar pontuação.' }) };
  }
};