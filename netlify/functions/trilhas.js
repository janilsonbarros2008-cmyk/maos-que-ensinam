// netlify/functions/trilhas.js
const { connectToDatabase } = require('../../utils/db');
const Trilha = require('../../models/Trilha');
const jwt = require('jsonwebtoken');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: 'Preflight OK' };

  try {
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Acesso negado.' }) };
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    await connectToDatabase();

    // ==========================================
    // GET: Leitura permitida para todos
    // ==========================================
    if (event.httpMethod === 'GET') {
      let query = {};
      // Se não for Admin (ou seja, se for Monitor, Coordenador, etc), traz apenas os Publicados
      if (decoded.role !== 'ADMIN') {
        query.status = 'PUBLICADO';
      }
      const trilhas = await Trilha.find(query).sort({ ordem: 1, createdAt: -1 });
      return { statusCode: 200, headers, body: JSON.stringify({ trilhas }) };
    }

    // ==========================================
    // TRAVA DE SEGURANÇA: Daqui para baixo, só ADMIN
    // ==========================================
    if (decoded.role !== 'ADMIN') {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Ação restrita a Administradores.' }) };
    }

    if (event.httpMethod === 'POST') {
      const novaTrilha = new Trilha(JSON.parse(event.body));
      await novaTrilha.save();
      return { statusCode: 201, headers, body: JSON.stringify({ message: 'Trilha criada!' }) };
    }

    if (event.httpMethod === 'PUT') {
      const { id, ...camposAtualizados } = JSON.parse(event.body);
      await Trilha.findByIdAndUpdate(id, camposAtualizados, { new: true });
      return { statusCode: 200, headers, body: JSON.stringify({ message: 'Atualizada!' }) };
    }

    if (event.httpMethod === 'DELETE') {
      const { id } = JSON.parse(event.body);
      await Trilha.findByIdAndDelete(id);
      return { statusCode: 200, headers, body: JSON.stringify({ message: 'Removida.' }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido.' }) };

  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro no servidor.' }) };
  }
};