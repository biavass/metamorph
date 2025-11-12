// Detecta se está em produção ou local
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000'
  : 'https://metamorph-backend-8b6q.onrender.com'; // Você vai mudar isso depois

window.API_URL = API_URL;