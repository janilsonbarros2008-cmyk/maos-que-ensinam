// models/Chamado.js
const mongoose = require('mongoose');

const chamadoSchema = new mongoose.Schema({
  monitorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', // Cria a relação com o aluno que abriu o chamado
    required: true 
  },
  assunto: { 
    type: String, 
    required: [true, 'O assunto do chamado é obrigatório'] 
  },
  mensagem: { 
    type: String, 
    required: [true, 'Descreva a situação para a equipe multiprofissional'] 
  },
  nivelUrgencia: { 
    type: String, 
    enum: ['BAIXO', 'MÉDIO', 'ALTO', 'EMERGÊNCIA'], 
    default: 'MÉDIO' 
  },
  status: { 
    type: String, 
    enum: ['ABERTO', 'EM_ANALISE', 'RESOLVIDO'], 
    default: 'ABERTO' 
  },
  // Estes campos abaixo serão preenchidos depois, quando a coordenação responder
  respostaEquipe: { 
    type: String 
  },
  respondidoPor: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  dataResposta: { 
    type: Date 
  }
}, { 
  timestamps: true // Salva a data e hora exata da abertura do chamado
});

module.exports = mongoose.models.Chamado || mongoose.model('Chamado', chamadoSchema);