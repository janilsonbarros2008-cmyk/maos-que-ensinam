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

  // ==========================================
  // LÓGICA DE TRILHAS DE CAPACITAÇÃO (LEITURA)
  // ==========================================
  const gridTrilhas = document.getElementById('gridTrilhas');
  const modalLeitura = document.getElementById('modalLeitura');
  const btnFecharLeitura = document.getElementById('btnFecharLeitura');
  const btnConcluirLeitura = document.getElementById('btnConcluirLeitura');
  let modulosDisponiveis = [];

async function carregarTrilhasMonitor() {
    // Paleta de 16 cores sensoriais (tons pastéis claros)
    const paletaCores = [
      '#a3c6ff', // 1. Azul pastel
      '#9ae3c7', // 2. Verde menta pastel
      '#f2b6b6', // 3. Rosa pastel
      '#f9e79f', // 4. Amarelo pastel
      '#d2b4de', // 5. Roxo pastel
      '#a9dfbf', // 6. Verde folha pastel
      '#f5cba7', // 7. Pêssego
      '#aed6f1', // 8. Azul céu claro
      '#f5b7b1', // 9. Salmão claro
      '#abebc6', // 10. Verde claro
      '#d7bde2', // 11. Lilás
      '#fcf3cf', // 12. Amarelo manteiga
      '#a2d9ce', // 13. Turquesa pastel
      '#f5c6cb', // 14. Rosa claro
      '#d6eaf8', // 15. Azul gelo
      '#e8daef'  // 16. Violeta clarinho
    ];

    try {
      const response = await fetch('/api/trilhas', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();

      if (!response.ok) throw new Error();

      modulosDisponiveis = data.trilhas;
      gridTrilhas.innerHTML = '';

      if (modulosDisponiveis.length === 0) {
        gridTrilhas.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-light); padding: 3rem;">Nenhum módulo de capacitação publicado de momento.</div>`;
        return;
      }

      // Adicionamos o parâmetro 'index' para saber a posição do cartão
      modulosDisponiveis.forEach((trilha, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        
        // Seleciona a cor. Se passar de 16, volta para a cor 0 automaticamente
        const corFundo = paletaCores[index % paletaCores.length];

        // Estilização interativa do cartão
        card.style.cursor = 'pointer';
        card.style.transition = 'transform 0.2s, box-shadow 0.2s';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.height = '100%';
        card.style.backgroundColor = corFundo; // Aplica a cor de fundo pastel
        
        card.onmouseover = () => { card.style.transform = 'translateY(-5px)'; card.style.boxShadow = '0 8px 15px rgba(0,0,0,0.1)'; };
        card.onmouseout = () => { card.style.transform = 'translateY(0)'; card.style.boxShadow = 'var(--shadow)'; };

        card.innerHTML = `
          <div style="background-color: rgba(255, 255, 255, 0.6); color: var(--text-main); display: inline-block; padding: 0.3rem 0.8rem; border-radius: 12px; font-size: 0.8rem; font-weight: 700; margin-bottom: 1rem; align-self: flex-start;">
            Módulo ${trilha.ordem}
          </div>
          <h3 style="margin-bottom: 0.5rem; color: var(--text-main);">${trilha.titulo}</h3>
          <p style="color: var(--text-main); font-size: 0.95rem; line-height: 1.5; flex-grow: 1; opacity: 0.85;">${trilha.descricao}</p>
          <div style="margin-top: 1.5rem; color: var(--text-main); font-weight: 700; font-size: 0.9rem; display: flex; align-items: center; gap: 0.5rem;">
            Ler material <i class="fa-solid fa-arrow-right"></i>
          </div>
        `;

        card.addEventListener('click', () => abrirLeitura(trilha._id));
        gridTrilhas.appendChild(card);
      });

    } catch (error) {
      gridTrilhas.innerHTML = `<div style="grid-column: 1/-1; color: var(--error-color); text-align: center;">Erro ao carregar os módulos.</div>`;
    }
  }
  function abrirLeitura(id) {
    const trilha = modulosDisponiveis.find(t => t._id === id);
    if (!trilha) return;

    document.getElementById('leituraOrdem').innerText = `Módulo ${trilha.ordem}`;
    document.getElementById('leituraTitulo').innerText = trilha.titulo;
    document.getElementById('leituraDescricao').innerText = trilha.descricao;
    
    // Substitui as quebras de linha normais (\n) por <br> para exibir os parágrafos corretos
    const textoFormatado = trilha.conteudo.replace(/\n/g, '<br><br>');
    document.getElementById('leituraConteudo').innerHTML = textoFormatado;

    modalLeitura.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Impede o scroll na página de fundo
  }

  function fecharLeitura() {
    modalLeitura.style.display = 'none';
    document.body.style.overflow = 'auto'; // Devolve o scroll à página
  }

  btnFecharLeitura.addEventListener('click', fecharLeitura);
  
  // Opcional: Fechar ao clicar fora da modal (na área escura)
  modalLeitura.addEventListener('click', function(e) {
    if (e.target === modalLeitura) fecharLeitura();
  });

  // Lógica de Ganho de XP ao Concluir Leitura
  btnConcluirLeitura.addEventListener('click', async () => {
    // Feedback visual imediato para evitar cliques duplos
    btnConcluirLeitura.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processando...';
    btnConcluirLeitura.disabled = true;

    try {
      // Valor fixo de 50 XP por leitura de módulo (pode ser dinâmico no futuro)
      const xpRecompensa = 50; 

      const response = await fetch('/api/atualizar-xp', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ xpGanhos: xpRecompensa })
      });

      const data = await response.json();

      if (response.ok) {
        // Atualiza a interface visualmente (Aba Visão Geral)
        const txtProgresso = document.getElementById('txtProgresso');
        if (txtProgresso) {
          txtProgresso.innerText = `${data.novoTotalXp} XP Acumulados!`;
          txtProgresso.style.color = 'var(--accent-color)';
        }

        alert(`🎉 Parabéns! Você concluiu a leitura e ganhou ${xpRecompensa} XP!\n\nSeu novo total é: ${data.novoTotalXp} XP.`);
        fecharLeitura();
      } else {
        alert(`Aviso: ${data.error || 'Não foi possível registrar o XP no momento.'}`);
      }

    } catch (error) {
      alert('Erro de rede. Verifique sua conexão.');
    } finally {
      // Restaura o botão para a próxima leitura
      btnConcluirLeitura.innerHTML = '<i class="fa-solid fa-check"></i> Marcar como Lido';
      btnConcluirLeitura.disabled = false;
    }
  });

  // Gatilho: Quando clicar na aba "Trilhas de Capacitação", carrega os dados caso ainda não tenham sido carregados.
  document.querySelector('.menu-item[data-tab="trilhas"]').addEventListener('click', () => {
    if (gridTrilhas.children.length <= 1) {
      carregarTrilhasMonitor();
    }
  });
});