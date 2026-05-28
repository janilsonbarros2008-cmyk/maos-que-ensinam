// models/Trilha.js
const mongoose = require('mongoose');

const trilhaSchema = new mongoose.Schema({
  titulo: { 
    type: String, 
    required: [true, 'O título da trilha é obrigatório'] 
  },
  descricao: { 
    type: String, 
    required: [true, 'Uma breve descrição é necessária'] 
  },
  conteudo: { 
    type: String, 
    required: [true, 'O conteúdo do módulo não pode estar vazio'] 
  },
  ordem: { 
    type: Number, 
    default: 1 
  },
  status: { 
    type: String, 
    enum: ['RASCUNHO', 'PUBLICADO'], 
    default: 'RASCUNHO' 
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.models.Trilha || mongoose.model('Trilha', trilhaSchema);