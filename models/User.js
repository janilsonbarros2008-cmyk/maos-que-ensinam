// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // ==========================================
  // CAMPOS UNIVERSAIS (Comuns a todos)
  // ==========================================
  nome: { 
    type: String, 
    required: [true, 'O nome é obrigatório'] 
  },
  email: { 
    type: String, 
    required: [true, 'O e-mail é obrigatório'], 
    unique: true 
  },
  senha: { 
    type: String, 
    required: true 
  },
  matricula: { 
    // Para alunos: Matrícula da SEDUC. Para servidores: Matrícula SIAPE/Estado.
    type: String, 
    required: true 
  },
  role: {
    type: String,
    enum: ['MONITOR', 'MULTIPROFISSIONAL', 'COORDENADOR', 'ADMIN', 'MENTORADO'],
    required: [true, 'O nível de acesso é obrigatório']
  },

  // ==========================================
  // ATRIBUTOS ESPECÍFICOS: ALUNO MONITOR
  // ==========================================
  dadosMonitor: {
    turma: { type: String }, // ex: "2º Ano A"
    turno: { type: String, enum: ['MANHÃ', 'TARDE', 'INTEGRAL'] },
    xp: { type: Number, default: 0 },
    horasValidadas: { type: Number, default: 0 }
  },

  // ==========================================
  // ATRIBUTOS ESPECÍFICOS: EQUIPE ESCOLAR
  // (Coordenador e Multiprofissional)
  // ==========================================
  dadosProfissional: {
    especialidade: { type: String }, // ex: "Psicopedagogo", "Fonoaudiólogo", "Coordenador de Área"
    registroConselho: { type: String }, // ex: "CRP 12345" (opcional, útil para área da saúde)
    escolaVinculada: { type: String } // Prepara o app para atuar em múltiplas escolas da GRE
  },
  dadosMentorado: {
    turma: String,
    necessidadeEducacional: String,
    // NOVO: Guarda o ID do aluno monitor responsável por ele
    monitorVinculado: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } 
  }
}, { 
  timestamps: true 
});

// ==========================================
// MIDDLEWARE DE VALIDAÇÃO CONDICIONAL
// ==========================================
// Esta função roda automaticamente antes de salvar no banco e garante a integridade dos dados.
userSchema.pre('validate', function(next) {
  // Se for um Monitor, ele obrigatoriamente precisa ter os dados de turma e turno preenchidos
  if (this.role === 'MONITOR') {
    if (!this.dadosMonitor || !this.dadosMonitor.turma || !this.dadosMonitor.turno) {
      this.invalidate('dadosMonitor', 'Para alunos monitores, é obrigatório informar a turma e o turno.');
    }
    // Garante que a equipe escolar não tenha dados de monitor
    this.dadosProfissional = undefined; 
  }

  // Se for Multiprofissional, seria interessante exigir a especialidade
  if (this.role === 'MULTIPROFISSIONAL') {
    if (!this.dadosProfissional || !this.dadosProfissional.especialidade) {
      this.invalidate('dadosProfissional.especialidade', 'Informe a especialidade do profissional (Ex: Psicólogo, Psicopedagogo).');
    }
    this.dadosMonitor = undefined;
  }

  // Se for Coordenador, limpamos os dados de monitor para não sujar o banco
  if (this.role === 'COORDENADOR') {
    this.dadosMonitor = undefined;
  }

  next();
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);