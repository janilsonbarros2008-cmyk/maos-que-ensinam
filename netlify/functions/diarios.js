// netlify/functions/diarios.js
const { connectToDatabase } = require('../../utils/db');
const Diario = require('../../models/Diario');
const User = require('../../models/User');
const jwt = require('jsonwebtoken');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: 'Preflight OK' };

  try {
    // 1. Extração e validação do Token
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Acesso negado.' }) };
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    await connectToDatabase();

    // ==========================================
    // GET: Listar o histórico do Monitor logado
    // ==========================================
    if (event.httpMethod === 'GET') {
      // Procura apenas os diários que pertencem a este monitor e cruza os dados para trazer o nome do mentorado
      const historico = await Diario.find({ monitorId: decoded.userId })
        .populate('mentoradoId', 'nome matricula')
        .sort({ dataSessao: -1 }); // Ordena do mais recente para o mais antigo
        
      return { statusCode: 200, headers, body: JSON.stringify({ diarios: historico }) };
    }

    // ==========================================
    // POST: Criar um novo registo de sessão
    // ==========================================
    if (event.httpMethod === 'POST') {
      if (decoded.role !== 'MONITOR') {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Apenas monitores podem preencher o diário.' }) };
      }

      const { mentoradoId, dataSessao, tempoSessao, resumoAtividades } = JSON.parse(event.body);

      // Validação extra de segurança: O mentorado enviado realmente pertence a este monitor?
      const mentoradoValido = await User.findOne({ 
        _id: mentoradoId, 
        role: 'MENTORADO', 
        'dadosMentorado.monitorVinculado': decoded.userId 
      });

      if (!mentoradoValido) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Estudante não encontrado ou não vinculado à sua tutoria.' }) };
      }

      // Regra de negócio simples para XP futuro: 1 XP por cada minuto de sessão
      const xpCalculado = parseInt(tempoSessao); 

      const novoDiario = new Diario({
        monitorId: decoded.userId,
        mentoradoId,
        dataSessao,
        tempoSessao,
        resumoAtividades,
        status: 'PENDENTE', // Prepara o terreno para a coordenação validar
        xpGerado: xpCalculado
      });

      await novoDiario.save();

      return { 
        statusCode: 201, 
        headers, 
        body: JSON.stringify({ message: 'Registo guardado com sucesso! A aguardar validação da coordenação.' }) 
      };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido.' }) };

  } catch (error) {
    console.error("❌ ERRO NO DIÁRIO:", error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro interno do servidor.' }) };
  }
};