// models/Escola.js
const mongoose = require('mongoose');

const escolaSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: [true, 'O nome da escola é obrigatório'],
    unique: true // Impede que a mesma escola seja registada duas vezes
  },
  cidade: {
    type: String,
    required: [true, 'A cidade é obrigatória']
  },
  estado: {
    type: String,
    default: 'PI' // Predefinido para o nosso contexto estadual
  }
}, {
  timestamps: true
});

module.exports = mongoose.models.Escola || mongoose.model('Escola', escolaSchema);