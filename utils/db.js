// utils/db.js
const mongoose = require('mongoose');
let isConnected = false; 
const { setServers } = require("node:dns/promises");
setServers(["1.1.1.1", "8.8.8.8"]);

async function connectToDatabase() {
  if (isConnected) {
    return;
  }

  const uri = process.env.MONGODB_URI
  
  try {
    const db = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      family: 4 // O TRUQUE DE MESTRE: Força o Node a usar IPv4 para resolver o DNS SRV
    });
    
    isConnected = db.connections[0].readyState === 1;
    console.log("✅ CONECTADO COM SUCESSO AO ATLAS!");
  } catch (error) {
    console.error('❌ Erro crítico de conexão:', error);
    throw error;
  }
}

module.exports = { connectToDatabase };