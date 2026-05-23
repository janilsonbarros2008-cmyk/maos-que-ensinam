// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  nome: { 
    type: String, 
    required: [true, 'O nome é obrigatório'] 
  },
  email: { 
    type: String, 
    required: [true, 'O e-mail é obrigatório'], 
    unique: true // Impede dois cadastros com o mesmo e-mail
  },
  senha: { 
    type: String, 
    required: true 
  },
  matricula: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    enum: ['MONITOR', 'TUTORADO', 'COORDENADOR'], // Trava as opções possíveis
    required: true 
  },
  xp: { 
    type: Number, 
    default: 0 
  },
  horasValidadas: { 
    type: Number, 
    default: 0 
  }
}, { 
  timestamps: true // Cria automaticamente os campos createdAt e updatedAt
});

// Impede re-declaração do modelo caso o arquivo seja chamado múltiplas vezes pela lambda
module.exports = mongoose.models.User || mongoose.model('User', userSchema);