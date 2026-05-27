// netlify/functions/login.js
const { connectToDatabase } = require('../../utils/db');
const User = require('../../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Cabeçalhos de CORS (Essencial para o navegador permitir a comunicação)
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async (event) => {
  // 1. Liberação do Preflight (Navegador)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: 'Preflight call successful' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido' }) };
  }

  try {
    await connectToDatabase();
    const { email, senha } = JSON.parse(event.body);

    // 2. Busca o usuário
    const usuario = await User.findOne({ email });
    if (!usuario) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'E-mail ou senha incorretos.' }) };
    }

    // 3. Compara a senha digitada com o Hash do banco
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
    if (!senhaCorreta) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'E-mail ou senha incorretos.' }) };
    }

    // 4. Verificação Crítica: Garante que o JWT_SECRET existe
    if (!process.env.JWT_SECRET) {
      throw new Error("A variável JWT_SECRET não está definida no arquivo .env");
    }

    // 5. Gera o Token de Autenticação
    const token = jwt.sign(
      { userId: usuario._id, role: usuario.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'Login bem-sucedido', 
        token, 
        usuario: { nome: usuario.nome, role: usuario.role } 
      }),
    };

  } catch (error) {
    // RASTREIO DE ERRO: Imprime o erro real no terminal do VS Code para investigarmos
    console.error("❌ ERRO CRÍTICO NO LOGIN:", error);
    
    return { 
      statusCode: 500, 
      headers, 
      body: JSON.stringify({ error: 'Erro interno no servidor. Verifique o terminal do VS Code.' }) 
    };
  }
};