const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();
console.log('API Key carregada:', process.env.FREEPIK_API_KEY ? 'SIM ✅' : 'NÃO ❌');
console.log('Primeiros caracteres:', process.env.FREEPIK_API_KEY?.substring(0, 10));
console.log('Frontend URL:', process.env.FRONTEND_URL);

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors({
  origin: '*', // Por enquanto permite tudo
  methods: ['POST', 'GET'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'PromptViral API rodando!' });
});

// Gerar prompt
// Gerar prompt
app.post('/api/generate-prompt', async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: 'Imagem não fornecida' });
    }

    const API_KEY = process.env.FREEPIK_API_KEY;
    
    if (!API_KEY || API_KEY === 'YOUR_FREEPIK_API_KEY') {
      return res.status(500).json({ 
        error: 'API key não configurada',
        message: 'Configure FREEPIK_API_KEY no arquivo .env'
      });
    }

    console.log('📤 Enviando imagem para Freepik...');
    
    const response = await fetch('https://api.freepik.com/v1/ai/image-to-prompt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-freepik-api-key': API_KEY
      },
      body: JSON.stringify({ image })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Erro Freepik:', data);
      return res.status(response.status).json({
        error: 'Erro ao processar imagem',
        details: data
      });
    }

    console.log('✅ Task criada:', data.data?.task_id);
    res.json({ 
      success: true, 
      task_id: data.data?.task_id,
      status: data.data?.status 
    });
    
  } catch (error) {
    console.error('❌ Erro no servidor:', error);
    res.status(500).json({
      error: 'Erro no servidor',
      message: error.message
    });
  }
});

// NOVA ROTA: Verificar status da task
app.get('/api/task-status/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const API_KEY = process.env.FREEPIK_API_KEY;
    
    console.log('🔍 Verificando status da task:', taskId);
    
    const response = await fetch(`https://api.freepik.com/v1/ai/image-to-prompt/${taskId}`, {
      method: 'GET',
      headers: {
        'x-freepik-api-key': API_KEY
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Erro ao verificar status:', data);
      return res.status(response.status).json({ error: 'Erro ao verificar status', details: data });
    }

    console.log('📊 Status:', data.data?.status);
    console.log('📝 Resposta completa:', JSON.stringify(data, null, 2)); // DEBUG
    
    res.json(data);
    
  } catch (error) {
    console.error('❌ Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║   🚀 PromptViral API                ║
║   http://localhost:${PORT}          ║
║   Status: ONLINE                    ║
╚══════════════════════════════════════╝
  `);
  
  if (!process.env.FREEPIK_API_KEY || process.env.FREEPIK_API_KEY === 'YOUR_FREEPIK_API_KEY') {
    console.warn('\n⚠️  CONFIGURE A API KEY NO ARQUIVO .env!\n');
  }
});