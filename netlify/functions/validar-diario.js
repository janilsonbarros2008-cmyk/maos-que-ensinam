// netlify/functions/validar-diario.js
const { connectToDatabase } = require('../../utils/db');
const Diario = require('../../models/Diario');
const User = require('../../models/User');
const jwt = require('jsonwebtoken');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS'
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

    // Trava de segurança: Apenas a equipa de gestão pode validar horas
    const perfisAutorizados = ['MULTIPROFISSIONAL', 'COORDENADOR', 'ADMIN'];
    if (!perfisAutorizados.includes(decoded.role)) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Acesso restrito à gestão.' }) };
    }

    await connectToDatabase();

    // ==========================================
    // GET: Listar todos os diários PENDENTES
    // ==========================================
    if (event.httpMethod === 'GET') {
      const pendentes = await Diario.find({ status: 'PENDENTE' })
        .populate('monitorId', 'nome matricula')
        .populate('mentoradoId', 'nome')
        .sort({ createdAt: 1 }); // Os mais antigos aparecem primeiro
      return { statusCode: 200, headers, body: JSON.stringify({ pendentes }) };
    }

    // ==========================================
    // PUT: Aprovar ou Rejeitar um Diário
    // ==========================================
    if (event.httpMethod === 'PUT') {
      const { diarioId, acao } = JSON.parse(event.body);

      const diario = await Diario.findById(diarioId);
      if (!diario) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Registo não encontrado.' }) };
      if (diario.status !== 'PENDENTE') return { statusCode: 400, headers, body: JSON.stringify({ error: 'Este registo já foi avaliado anteriormente.' }) };

      if (acao === 'REJEITAR') {
        diario.status = 'REJEITADO';
        await diario.save();
        return { statusCode: 200, headers, body: JSON.stringify({ message: 'Registo devolvido/rejeitado.' }) };
      }

      if (acao === 'APROVAR') {
        diario.status = 'VALIDADO';
        await diario.save();

        // Encontra o aluno monitor e injeta os pontos na conta dele
        const monitor = await User.findById(diario.monitorId);
        if (monitor && monitor.dadosMonitor) {
          // 1. Soma o XP
          monitor.dadosMonitor.xp = Number(monitor.dadosMonitor.xp || 0) + Number(diario.xpGerado);
          
          // 2. Converte os minutos da sessão para horas (Ex: 90 min = 1.5 horas)
          const horasAdicionais = Number(diario.tempoSessao) / 60;
          monitor.dadosMonitor.horasValidadas = Number(monitor.dadosMonitor.horasValidadas || 0) + horasAdicionais;
          
          await monitor.save();
        }

        return { statusCode: 200, headers, body: JSON.stringify({ message: 'Horas validadas e XP creditado ao aluno!' }) };
      }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido.' }) };
  } catch (error) {
    console.error("❌ ERRO NA VALIDAÇÃO:", error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro interno no servidor.' }) };
  }
};