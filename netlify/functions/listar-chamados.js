// netlify/functions/listar-chamados.js
const { connectToDatabase } = require('../../utils/db');
const Chamado = require('../../models/Chamado');
const User = require('../../models/User'); // Necessário para o populate funcionar
const jwt = require('jsonwebtoken');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: 'Preflight OK' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido' }) };
  }

  try {
    // 1. Validação do Token JWT
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Acesso negado.' }) };
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 2. Trava de Perfil: Apenas equipe de apoio, coordenação e admin podem listar tudo
    const perfisAutorizados = ['MULTIPROFISSIONAL', 'COORDENADOR', 'ADMIN'];
    if (!perfisAutorizados.includes(decoded.role)) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Acesso não autorizado para este perfil.' }) };
    }

    await connectToDatabase();

    // 3. Procura os chamados, cruza os dados com a tabela de Usuários para trazer os dados do monitor
    // e ordena colocando os mais recentes no topo
    const chamados = await Chamado.find()
      .populate('monitorId', 'nome matricula dadosMonitor.turma')
      .sort({ createdAt: -1 });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ chamados })
    };

  } catch (error) {
    console.error("❌ ERRO AO LISTAR CHAMADOS:", error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro ao listar os dados.' }) };
  }
};