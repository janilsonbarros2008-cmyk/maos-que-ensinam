// netlify/functions/gerenciar-usuarios.js
const { connectToDatabase } = require('../../utils/db');
const User = require('../../models/User');
const jwt = require('jsonwebtoken');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS' // PUT adicionado aqui
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: 'Preflight OK' };
  }

  try {
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Acesso negado.' }) };
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'ADMIN') {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Acesso restrito a Administradores.' }) };
    }

    await connectToDatabase();

    // ==========================================
    // MÉTODO GET: Listar Usuários
    // ==========================================
    if (event.httpMethod === 'GET') {
      const usuarios = await User.find().select('-senha').sort({ role: 1, nome: 1 });
      return { statusCode: 200, headers, body: JSON.stringify({ usuarios }) };
    }

    // ==========================================
    // MÉTODO PUT: Editar Usuário
    // ==========================================
    if (event.httpMethod === 'PUT') {
      const dadosAtualizados = JSON.parse(event.body);
      const { id } = dadosAtualizados;

      if (!id) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID do usuário não fornecido.' }) };
      }

      // Procura o utilizador no banco
      const usuario = await User.findById(id);
      if (!usuario) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Usuário não encontrado.' }) };
      }

      // Impede que um Admin remova o seu próprio acesso inadvertidamente
      if (id === decoded.userId && dadosAtualizados.role && dadosAtualizados.role !== 'ADMIN') {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Você não pode retirar os seus próprios privilégios de Admin.' }) };
      }

      // Atualiza os campos básicos
      if (dadosAtualizados.nome) usuario.nome = dadosAtualizados.nome;
      if (dadosAtualizados.email) usuario.email = dadosAtualizados.email;
      if (dadosAtualizados.matricula) usuario.matricula = dadosAtualizados.matricula;
      if (dadosAtualizados.role) usuario.role = dadosAtualizados.role;

      // Atualiza os campos específicos
      if (dadosAtualizados.dadosMonitor) {
        usuario.dadosMonitor = { ...usuario.dadosMonitor, ...dadosAtualizados.dadosMonitor };
      }
      if (dadosAtualizados.dadosProfissional) {
        usuario.dadosProfissional = { ...usuario.dadosProfissional, ...dadosAtualizados.dadosProfissional };
      }
      if (dadosAtualizados.dadosMentorado) {
        usuario.dadosMentorado = { ...usuario.dadosMentorado, ...dadosAtualizados.dadosMentorado };
      }

      // O comando save() vai acionar o nosso middleware pre('validate') automaticamente!
      await usuario.save();

      return { statusCode: 200, headers, body: JSON.stringify({ message: 'Dados atualizados com sucesso!' }) };
    }

    // ==========================================
    // MÉTODO DELETE: Excluir Usuário
    // ==========================================
    if (event.httpMethod === 'DELETE') {
      const { id } = JSON.parse(event.body);

      if (id === decoded.userId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Ação bloqueada: Você não pode excluir a sua própria conta.' }) };
      }

      await User.findByIdAndDelete(id);
      return { statusCode: 200, headers, body: JSON.stringify({ message: 'Usuário removido com sucesso.' }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido.' }) };

  } catch (error) {
    console.error("❌ ERRO NO ADMIN:", error);
    // Erro comum: e-mail já existe
    if (error.code === 11000) {
      return { statusCode: 409, headers, body: JSON.stringify({ error: 'Este e-mail já está a ser utilizado por outro utilizador.' }) };
    }
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro interno no servidor.' }) };
  }
};