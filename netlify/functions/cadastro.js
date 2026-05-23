// netlify/functions/cadastro.js
const { connectToDatabase } = require('../../utils/db');
const User = require('../../models/User'); // Importamos o modelo
const bcrypt = require('bcryptjs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Método não permitido' };

  try {
    await connectToDatabase();
    const dados = JSON.parse(event.body);

    // Verifica se o usuário já existe usando o Mongoose
    const usuarioExistente = await User.findOne({ email: dados.email });
    if (usuarioExistente) {
      return { statusCode: 409, body: JSON.stringify({ error: 'E-mail já cadastrado.' }) };
    }

    // Criptografa a senha
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(dados.senha, salt);

    // Cria e salva o usuário usando o modelo
    const novoUsuario = new User({
      ...dados,
      senha: senhaHash
    });

    const resultado = await novoUsuario.save();

    return {
      statusCode: 201,
      body: JSON.stringify({ message: 'Usuário criado com sucesso', id: resultado._id }),
    };

  } catch (error) {
    // O Mongoose lança erros específicos se faltar algum dado obrigatório (ValidationError)
    return { 
      statusCode: 400, 
      body: JSON.stringify({ error: error.message || 'Erro ao criar usuário' }) 
    };
  }
};