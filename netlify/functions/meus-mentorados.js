// netlify/functions/meus-mentorados.js
const { connectToDatabase } = require('../../utils/db');
const User = require('../../models/User');
const jwt = require('jsonwebtoken');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: 'Preflight OK' };

  try {
    const token = event.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'MONITOR') {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Acesso restrito a Monitores.' }) };
    }

    await connectToDatabase();

    // Procura todos os MENTORADOS cujo "monitorVinculado" seja o ID do monitor que está a fazer o pedido
    const mentorados = await User.find({
      role: 'MENTORADO',
      'dadosMentorado.monitorVinculado': decoded.userId
    }).select('nome matricula dadosMentorado');

    return { statusCode: 200, headers, body: JSON.stringify({ mentorados }) };

  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro ao carregar mentorados.' }) };
  }
};