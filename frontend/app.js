// ===== CONFIGURAÇÕES =====

// Importar configuração
const API_URL = window.API_URL || 'http://localhost:3000';

const CONFIG = {
    FREEPIK_API_KEY: 'FPSX50b746dddd816d1d29ce8c9962bf0927', // SUBSTITUA PELA SUA CHAVE
    FREEPIK_API_URL: 'https://api.freepik.com/v1/ai/image-to-prompt',
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    INITIAL_CREDITS: 5
};

// ===== ESTADO DA APLICAÇÃO =====
const state = {
    currentImage: null,
    credits: CONFIG.INITIAL_CREDITS,
    isLoading: false
};

// ===== ELEMENTOS DO DOM =====
const elements = {
    dropZone: document.getElementById('drop-zone'),
    fileInput: document.getElementById('file-input'),
    uploadPlaceholder: document.getElementById('upload-placeholder'),
    imagePreview: document.getElementById('image-preview'),
    previewImg: document.getElementById('preview-img'),
    changeImageBtn: document.getElementById('change-image-btn'),
    generateBtn: document.getElementById('generate-btn'),
    generateBtnText: document.getElementById('generate-btn-text'),
    errorMessage: document.getElementById('error-message'),
    creditsDisplay: document.getElementById('credits-display'),
    promptPlaceholder: document.getElementById('prompt-placeholder'),
    promptResult: document.getElementById('prompt-result'),
    promptText: document.getElementById('prompt-text'),
    copyBtn: document.getElementById('copy-btn'),
    copyBtnText: document.getElementById('copy-btn-text'),
    freepikBtn: document.getElementById('freepik-btn'),
    buyCreditsBtn: document.getElementById('buy-credits-btn')
};

// ===== FUNÇÕES DE UTILIDADE =====
function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
    setTimeout(() => {
        elements.errorMessage.classList.add('hidden');
    }, 5000);
}

function updateCreditsDisplay() {
    elements.creditsDisplay.textContent = state.credits;
}

function setLoading(isLoading) {
    state.isLoading = isLoading;
    elements.generateBtn.disabled = isLoading || !state.currentImage || state.credits <= 0;
    
    if (isLoading) {
        elements.generateBtnText.innerHTML = `
            <i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i>
            Gerando Prompt...
        `;
    } else {
        elements.generateBtnText.innerHTML = `
            <i data-lucide="wand-2" class="w-5 h-5"></i>
            Gerar Prompt (1 crédito)
        `;
    }
    lucide.createIcons();
}

// ===== PROCESSAMENTO DE IMAGEM =====
function validateImage(file) {
    if (!file.type.startsWith('image/')) {
        showError('Por favor, envie apenas imagens (PNG, JPG, etc.)');
        return false;
    }
    
    if (file.size > CONFIG.MAX_FILE_SIZE) {
        showError('Imagem muito grande. Tamanho máximo: 10MB');
        return false;
    }
    
    return true;
}

function processImage(file) {
    if (!validateImage(file)) return;
    
    state.currentImage = file;
    elements.errorMessage.classList.add('hidden');
    
    // Mostrar preview
    const reader = new FileReader();
    reader.onload = (e) => {
        elements.previewImg.src = e.target.result;
        elements.uploadPlaceholder.classList.add('hidden');
        elements.imagePreview.classList.remove('hidden');
        elements.generateBtn.disabled = false;
        
        // Reset prompt result
        elements.promptPlaceholder.classList.remove('hidden');
        elements.promptResult.classList.add('hidden');
    };
    reader.readAsDataURL(file);
}

// ===== UPLOAD DE IMAGEM =====
elements.dropZone.addEventListener('click', () => {
    elements.fileInput.click();
});

elements.fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) processImage(file);
});

elements.changeImageBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    elements.fileInput.click();
});

// Drag & Drop
elements.dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.dropZone.classList.add('border-purple-400');
});

elements.dropZone.addEventListener('dragleave', () => {
    elements.dropZone.classList.remove('border-purple-400');
});

elements.dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.dropZone.classList.remove('border-purple-400');
    
    const file = e.dataTransfer.files[0];
    if (file) processImage(file);
});


// ===== FUNÇÃO AUXILIAR (ADICIONE ANTES DE generatePrompt) =====
async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}


// ===== GERAÇÃO DE PROMPT COM POLLING =====
// ===== GERAÇÃO DE PROMPT COM POLLING =====
async function generatePrompt() {
    if (!state.currentImage) {
        showError('Por favor, envie uma imagem primeiro');
        return;
    }
    
    if (state.credits <= 0) {
        showError('Você não tem créditos suficientes. Adquira mais créditos!');
        return;
    }
    
    setLoading(true);
    
    try {
        // 1. Converter imagem para base64
        const base64Image = await fileToBase64(state.currentImage);
        
        // 2. Enviar para backend
        console.log('📤 Enviando imagem para análise...');
        
        const response = await fetch(`${API_URL}/api/generate-prompt`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image: base64Image
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao gerar prompt');
        }
        
        const data = await response.json();
        const taskId = data.task_id;
        
        if (!taskId) {
            throw new Error('Task ID não recebido');
        }
        
        console.log('✅ Task criada:', taskId);
        console.log('⏳ Aguardando processamento...');
        
        // 3. Fazer polling até o prompt ficar pronto
        const result = await pollTaskStatus(taskId);
        
        console.log('🎁 Resultado final:', result);
        
        // 4. Extrair e exibir o prompt
        let promptText = result.prompt;
        
        // Se não encontrou no formato esperado, tentar outros caminhos
        if (!promptText && result.fullData) {
            // Tenta pegar qualquer campo que pareça ser o prompt
            const data = result.fullData;
            promptText = data.generated?.[0] || data.result || data.prompt || data.output || data.text;
            
            // Se ainda não encontrou, pega o primeiro valor string que encontrar
            if (!promptText) {
                for (const [key, value] of Object.entries(data)) {
                    if (typeof value === 'string' && value.length > 50) {
                        console.log(`🔍 Prompt encontrado em: ${key}`);
                        promptText = value;
                        break;
                    }
                }
            }
        }
        
        if (promptText && promptText.length > 10) {
            console.log('🎉 Prompt final:', promptText);
            
            displayPrompt(promptText);
            state.credits--;
            updateCreditsDisplay();
        } else {
            console.error('❌ Estrutura completa:', result);
            throw new Error('Nenhum prompt foi gerado ou formato de resposta desconhecido');
        }
        
        setLoading(false);
        
    } catch (error) {
        console.error('❌ Erro completo:', error);
        showError(error.message || 'Erro ao processar imagem.');
        setLoading(false);
    }
}

// Função de polling para verificar status da task
async function pollTaskStatus(taskId, maxAttempts = 30) {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        try {
            console.log(`🔄 Tentativa ${attempts + 1}/${maxAttempts}...`);
            
            const response = await fetch(`${API_URL}/api/task-status/${taskId}`);
            
            if (!response.ok) {
                throw new Error('Erro ao verificar status');
            }
            
            const result = await response.json();
            const status = result.data?.status;
            
            console.log('📊 Status:', status);
            console.log('📦 Dados recebidos:', result); // DEBUG
            
            // Verificar diferentes formatos de status
            if (status === 'success' || status === 'completed' || status === 'COMPLETED') {
                console.log('✅ Processamento concluído!');
                console.log('📝 Estrutura completa:', JSON.stringify(result, null, 2));
                
                // Tentar extrair o prompt de diferentes locais possíveis
                let promptText = null;
                
                // Formato 1: result.data.generated
                if (result.data?.generated && Array.isArray(result.data.generated)) {
                    promptText = result.data.generated[0];
                }
                
                // Formato 2: result.data.result
                if (!promptText && result.data?.result) {
                    promptText = result.data.result;
                }
                
                // Formato 3: result.data.prompt
                if (!promptText && result.data?.prompt) {
                    promptText = result.data.prompt;
                }
                
                // Formato 4: result.data.output
                if (!promptText && result.data?.output) {
                    promptText = result.data.output;
                }
                
                console.log('💬 Prompt extraído:', promptText);
                
                return { 
                    prompt: promptText,
                    fullData: result.data 
                };
            }
            
            if (status === 'error' || status === 'failed' || status === 'ERROR') {
                throw new Error('Erro ao processar imagem no Freepik');
            }
            
            // Aguardar 2 segundos antes da próxima tentativa
            await new Promise(resolve => setTimeout(resolve, 2000));
            attempts++;
            
        } catch (error) {
            console.error('❌ Erro no polling:', error);
            throw error;
        }
    }
    
    throw new Error('Timeout: processamento demorou muito');
}

function displayPrompt(prompt) {
    elements.promptText.textContent = prompt;
    elements.promptPlaceholder.classList.add('hidden');
    elements.promptResult.classList.remove('hidden');
}

elements.generateBtn.addEventListener('click', generatePrompt);

// ===== COPIAR PROMPT =====
elements.copyBtn.addEventListener('click', async () => {
    const prompt = elements.promptText.textContent;
    
    try {
        await navigator.clipboard.writeText(prompt);
        
        // Feedback visual
        elements.copyBtnText.innerHTML = `
            <i data-lucide="check-circle-2" class="w-4 h-4"></i>
            Copiado!
        `;
        lucide.createIcons();
        
        setTimeout(() => {
            elements.copyBtnText.innerHTML = `
                <i data-lucide="copy" class="w-4 h-4"></i>
                Copiar Prompt
            `;
            lucide.createIcons();
        }, 2000);
        
    } catch (error) {
        showError('Erro ao copiar. Tente novamente.');
    }
});

// ===== ABRIR NO FREEPIK =====
elements.freepikBtn.addEventListener('click', () => {
    window.open('https://www.freepik.com/ai/image-generator', '_blank');
});

// ===== COMPRAR CRÉDITOS =====
elements.buyCreditsBtn.addEventListener('click', () => {
    // TODO: Implementar integração com gateway de pagamento
    alert('Sistema de pagamento em desenvolvimento!\n\nEm breve você poderá comprar créditos via:\n- PIX\n- Cartão de Crédito\n- Mercado Pago');
});

// ===== INICIALIZAÇÃO =====
function init() {
    updateCreditsDisplay();
    console.log('PromptViral inicializado!');
    
    // Verificar se a API key foi configurada
    if (CONFIG.FREEPIK_API_KEY === 'YOUR_FREEPIK_API_KEY') {
        console.warn('⚠️ ATENÇÃO: Configure sua API key do Freepik no arquivo app.js');
    }
}

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}