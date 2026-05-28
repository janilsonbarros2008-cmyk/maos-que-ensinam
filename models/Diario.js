// models/Diario.js
const mongoose = require('mongoose');

const diarioSchema = new mongoose.Schema({
  monitorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  mentoradoId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, 'É necessário identificar o estudante acompanhado.'] 
  },
  dataSessao: { 
    type: Date, 
    required: [true, 'A data da sessão é obrigatória.'] 
  },
  tempoSessao: { 
    type: Number, // Guardamos em minutos para evitar bugs de soma (ex: 90 = 1h30)
    required: [true, 'O tempo de duração é obrigatório.'] 
  },
  resumoAtividades: { 
    type: String, 
    required: [true, 'Descreva brevemente as atividades realizadas.'] 
  },
  status: { 
    type: String, 
    enum: ['PENDENTE', 'VALIDADO', 'REJEITADO'], 
    default: 'PENDENTE' 
  },
  xpGerado: {
    type: Number,
    default: 0
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.models.Diario || mongoose.model('Diario', diarioSchema);