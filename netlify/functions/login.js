// netlify/functions/login.js
const { connectToDatabase } = require('../../utils/db');
const User = require('../../models/User'); // Importamos o modelo
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Método não permitido' };

  try {
    await connectToDatabase();
    const { email, senha } = JSON.parse(event.body);

    // Busca o usuário usando o Mongoose
    const usuario = await User.findOne({ email });
    if (!usuario) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Credenciais inválidas.' }) };
    }

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
    if (!senhaCorreta) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Credenciais inválidas.' }) };
    }

    const token = jwt.sign(
      { userId: usuario._id, role: usuario.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Login bem-sucedido', 
        token, 
        usuario: { nome: usuario.nome, role: usuario.role } 
      }),
    };

  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Erro interno no servidor' }) };
  }
};