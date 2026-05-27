// netlify/functions/cadastro.js
const { connectToDatabase } = require('../../utils/db');
const User = require('../../models/User');
const bcrypt = require('bcryptjs');

// Cabeçalhos de segurança padrão para permitir a comunicação entre Front e Back
const headers = {
  'Access-Control-Allow-Origin': '*', // Em produção, trocaremos pelo domínio do app
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async (event) => {
  // 1. O Tratamento do Preflight (Responde ao 'OPTIONS' do navegador com sucesso)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: 'Preflight call successful' };
  }

  // 2. Trava de Método
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido' }) };
  }

  try {
    await connectToDatabase();
    const dados = JSON.parse(event.body);

    const usuarioExistente = await User.findOne({ email: dados.email });
    if (usuarioExistente) {
      return { statusCode: 409, headers, body: JSON.stringify({ error: 'E-mail já cadastrado.' }) };
    }

    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(dados.senha, salt);

    const novoUsuario = new User({
      ...dados,
      senha: senhaHash
    });

    const resultado = await novoUsuario.save();

    // Importante: Sempre retornar os headers nas respostas de sucesso
    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ 
        message: 'Usuário criado com sucesso', 
        id: resultado._id,
        role: resultado.role 
      }),
    };

  } catch (error) {
    return { 
      statusCode: 400, 
      headers,
      body: JSON.stringify({ error: error.message || 'Erro ao criar usuário' }) 
    };
  }
};