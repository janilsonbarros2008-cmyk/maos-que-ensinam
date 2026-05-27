// public/js/dashboard.js

document.addEventListener('DOMContentLoaded', function() {
  // 1. GUARDA DE ROTA: Verifica se o utilizador está autenticado
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');
  const name = localStorage.getItem('userName');

  if (!token || !role || !name) {
    // Se faltar algum dado de login, limpa resíduos e expulsa o utilizador
    localStorage.clear();
    window.location.href = 'login.html';
    return;
  }

  // Segurança extra: Garante que apenas MONITORES acessem esta visão específica do MVP
  if (role !== 'MONITOR') {
    alert('Acesso restrito à visão de Alunos Monitores.');
    window.location.href = 'login.html';
    return;
  }

  // 2. INJEÇÃO DE DADOS: Atualiza a saudação com o nome real vindo do Atlas
  document.getElementById('monitorNome').innerText = name;

  // 3. ALTERNÂNCIA DE ABAS (TABS LOGIC)
  const menuItems = document.querySelectorAll('.menu-item');
  const tabContents = document.querySelectorAll('.tab-content');

  menuItems.forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();

      // Remove a classe ativa de todos os botões do menu
      menuItems.forEach(i => i.classList.remove('active'));
      // Adiciona a classe ativa no botão que foi clicado
      this.classList.add('active');

      // Pega o identificador da aba (data-tab="...")
      const targetTab = this.getAttribute('data-tab');

      // Esconde todas as seções de conteúdo do painel
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Exibe apenas a seção correspondente ao botão clicado
      const activeSection = document.getElementById(targetTab);
      if (activeSection) {
        activeSection.classList.add('active');
      }
    });
  });

  // 4. LÓGICA DO BOTÃO DE SAIR (LOGOUT)
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', function() {
      if (confirm('Deseja realmente sair do sistema?')) {
        localStorage.clear(); // Apaga o Token JWT do navegador
        window.location.href = 'login.html';
      }
    });
  }

  // ==========================================
  // LOGICA DO CHAT ASSISTENTE DE IA
  // ==========================================
  const formChat = document.getElementById('formChat');
  const chatInput = document.getElementById('chatInput');
  const chatMessages = document.getElementById('chatMessages');
  const btnSendChat = document.getElementById('btnSendChat');

  if (formChat) {
    formChat.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const promptTexto = chatInput.value.trim();
      if (!promptTexto) return;

      // Desabilita as entradas para evitar envios duplos enquanto espera a IA pensar
      chatInput.value = '';
      chatInput.disabled = true;
      btnSendChat.disabled = true;

      // Injeta a dúvida do monitor na tela
      adicionarMensagemNaTela('user', promptTexto);

      // Exibe balão de carregamento animado (Pensando...)
      const idIndicador = exibirIndicadorCarregamento();

      try {
        const response = await fetch('/api/chat-ia', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ prompt: promptTexto })
        });

        const data = await response.json();
        
        // Remove a animação de carregamento
        removerIndicadorCarregamento(idIndicador);

        if (response.ok) {
          adicionarMensagemNaTela('ai', data.response);
        } else {
          adicionarMensagemNaTela('ai', `Aviso: ${data.error || 'Não consegui processar sua dúvida agora.'}`);
        }

      } catch (error) {
        removerIndicadorCarregamento(idIndicador);
        adicionarMensagemNaTela('ai', 'Erro de comunicação com o servidor de IA. Verifique sua conexão.');
      } finally {
        // Devolve o controle da tela para o monitor
        chatInput.disabled = false;
        btnSendChat.disabled = false;
        chatInput.focus();
      }
    });
  }

  function adicionarMensagemNaTela(remetente, texto) {
    const boxMensagem = document.createElement('div');
    boxMensagem.className = `message ${remetente}-message`;
    const icone = remetente === 'user' ? 'fa-user' : 'fa-robot';

    // Formata quebras de linha básicas para exibição visual limpa no HTML
    const textoFormatado = texto.replace(/\n/g, '<br>');

    boxMensagem.innerHTML = `
      <div class="message-avatar"><i class="fa-solid ${icone}"></i></div>
      <div class="message-text">${textoFormatado}</div>
    `;

    chatMessages.appendChild(boxMensagem);
    chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll automático para a última linha
  }

  function exibirIndicadorCarregamento() {
    const idUnico = 'pensando_' + Date.now();
    const boxCarregando = document.createElement('div');
    boxCarregando.className = 'message ai-message';
    boxCarregando.id = idUnico;
    boxCarregando.innerHTML = `
      <div class="message-avatar"><i class="fa-solid fa-robot"></i></div>
      <div class="message-text">
        <div class="typing-indicator"><span></span><span></span><span></span></div>
      </div>
    `;
    chatMessages.appendChild(boxCarregando);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return idUnico;
  }

  function removerIndicadorCarregamento(id) {
    const elemento = document.getElementById(id);
    if (elemento) elemento.remove();
  }

  // ==========================================
  // LÓGICA DE ENVIO DO SISTEMA DE CHAMADOS
  // ==========================================
  const formChamado = document.getElementById('formChamado');
  const alertSuporte = document.getElementById('alertSuporte');
  const btnEnviarChamado = document.getElementById('btnEnviarChamado');

  if (formChamado) {
    formChamado.addEventListener('submit', async function(e) {
      e.preventDefault(); // Impede o recarregamento da tela

      // Configura o estado visual de carregamento
      btnEnviarChamado.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando chamado...';
      btnEnviarChamado.disabled = true;
      alertSuporte.style.display = 'none';

      // Captura as informações digitadas pelo Monitor
      const payload = {
        assunto: document.getElementById('chamadoAssunto').value,
        nivelUrgencia: document.getElementById('chamadoUrgencia').value,
        mensagem: document.getElementById('chamadoMensagem').value
      };

      try {
        // Dispara o POST enviando o token JWT no cabeçalho (Authorization)
        const response = await fetch('/api/abrir-chamado', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
          // Exibe feedback verde de sucesso
          alertSuporte.innerText = data.message || 'Chamado registrado com sucesso!';
          alertSuporte.className = 'alert alert-success';
          alertSuporte.style.display = 'block';
          
          formChamado.reset(); // Limpa os campos para o próximo uso
        } else {
          // Trata erros informados pelo back-end (Ex: token expirado)
          alertSuporte.innerText = data.error || 'Erro ao processar o chamado.';
          alertSuporte.className = 'alert alert-error';
          alertSuporte.style.display = 'block';
        }

      } catch (error) {
        alertSuporte.innerText = 'Erro de rede. Verifique se o servidor local está ativo.';
        alertSuporte.className = 'alert alert-error';
        alertSuporte.style.display = 'block';
      } finally {
        // Restaura o botão ao estado original
        btnEnviarChamado.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Enviar Pedido de Apoio';
        btnEnviarChamado.disabled = false;
      }
    });
  }
});