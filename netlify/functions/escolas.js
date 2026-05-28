// netlify/functions/escolas.js
const { connectToDatabase } = require('../../utils/db');
const Escola = require('../../models/Escola');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: 'Preflight OK' };
  }

  try {
    await connectToDatabase();

    // 1. Método GET: Devolve todas as escolas registadas por ordem alfabética
    if (event.httpMethod === 'GET') {
      const escolas = await Escola.find().sort({ nome: 1 });
      return { statusCode: 200, headers, body: JSON.stringify({ escolas }) };
    }

    // 2. Método POST: Regista uma nova escola
    if (event.httpMethod === 'POST') {
      const { nome, cidade, estado } = JSON.parse(event.body);

      if (!nome || !cidade) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Nome e cidade são obrigatórios.' }) };
      }

      const novaEscola = new Escola({ nome, cidade, estado: estado || 'PI' });
      const resultado = await novaEscola.save();

      return { 
        statusCode: 201, 
        headers, 
        body: JSON.stringify({ message: 'Escola registada!', escola: resultado }) 
      };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido' }) };

  } catch (error) {
    if (error.code === 11000) {
      return { statusCode: 409, headers, body: JSON.stringify({ error: 'Esta escola já está registada no sistema.' }) };
    }
    console.error("❌ ERRO API ESCOLAS:", error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro interno no servidor.' }) };
  }
};