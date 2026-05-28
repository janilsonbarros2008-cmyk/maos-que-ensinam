// public/js/painel-apoio.js

document.addEventListener('DOMContentLoaded', async function() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');

  // 1. Guarda de Rota: Só permite a entrada de perfis de gestão/apoio
  if (!token || !['MULTIPROFISSIONAL', 'COORDENADOR', 'ADMIN'].includes(role)) {
    localStorage.clear();
    window.location.href = 'login.html';
    return;
  }

  const listaContainer = document.getElementById('listaChamados');

  // 2. Função para carregar os dados do Back-end
  async function carregarChamados() {
    try {
      const response = await fetch('/api/listar-chamados', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (!response.ok) {
        listaContainer.innerHTML = `<div class="card" style="color: var(--error-color)">${data.error || 'Erro ao carregar dados.'}</div>`;
        return;
      }

      if (data.chamados.length === 0) {
        listaContainer.innerHTML = `<div class="card" style="text-align: center; color: var(--text-light)">Nenhum pedido de apoio registado até ao momento.</div>`;
        return;
      }

      listaContainer.innerHTML = ''; // Limpa o carregando

      // 3. Renderização Dinâmica
      data.chamados.forEach(chamado => {
        const isResolvido = chamado.status === 'RESOLVIDO';
        const card = document.createElement('div');
        card.className = `card chamado-item ${isResolvido ? 'resolvido' : ''}`;

        // Extrai dados do monitor com segurança caso o populate falhe
        const nomeMonitor = chamado.monitorId ? chamado.monitorId.nome : 'Monitor Removido';
        const turmaMonitor = chamado.monitorId && chamado.monitorId.dadosMonitor ? chamado.monitorId.dadosMonitor.turma : 'Sem turma';
        const dataCriacao = new Date(chamado.createdAt).toLocaleString('pt-BR');

        let blocoAcao = '';

        if (!isResolvido) {
          // Se estiver aberto, renderiza o campo de texto para o profissional responder
          blocoAcao = `
            <form class="form-resposta" style="margin-top: 1.5rem;" data-id="${chamado._id}">
              <div class="form-group">
                <label style="font-size: 0.95rem;">Escrever Orientação Pedagógica / Resposta</label>
                <textarea rows="3" placeholder="Insira as diretrizes práticas para apoiar o monitor nesta situação..." required></textarea>
              </div>
              <button type="submit" class="btn btn-primary" style="min-height: 44px; padding: 0.5rem 1rem; width: auto;">
                Enviar Resposta Técnica
              </button>
            </form>
          `;
        } else {
          // Se já foi resolvido, exibe a resposta gravada no banco
          blocoAcao = `
            <div class="resposta-box">
              <strong><i class="fa-solid fa-graduation-cap"></i> Orientação Enviada:</strong>
              <p style="margin-top: 0.5rem; font-size: 0.95rem;">${chamado.respostaEquipe}</p>
            </div>
          `;
        }

        card.innerHTML = `
          <span class="urgencia-badge badge-${chamado.nivelUrgencia}">${chamado.nivelUrgencia}</span>
          <h2 style="font-size: 1.3rem; margin-bottom: 0.5rem;">${chamado.assunto}</h2>
          
          <div class="meta-info">
            <span><i class="fa-solid fa-user"></i> <b>Monitor:</b> ${nomeMonitor} (${turmaMonitor})</span>
            <span><i class="fa-solid fa-clock"></i> <b>Aberto em:</b> ${dataCriacao}</span>
            <span><i class="fa-solid fa-circle-info"></i> <b>Status:</b> ${chamado.status}</span>
          </div>

          <p style="background-color: var(--bg-color); padding: 1rem; border-radius: var(--radius); font-size: 0.95rem;">
            ${chamado.mensagem.replace(/\n/g, '<br>')}
          </p>

          ${blocoAcao}
        `;

        listaContainer.appendChild(card);
      });

      // 4. Ativa os ouvintes (listeners) nos formulários de resposta recém-criados
      atividadesFormularios();

    } catch (error) {
      listaContainer.innerHTML = `<div class="card" style="color: var(--error-color)">Erro de ligação com o servidor.</div>`;
    }
  }

  function atividadesFormularios() {
    const formularios = document.querySelectorAll('.form-resposta');
    formularios.forEach(form => {
      form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const chamadoId = this.getAttribute('data-id');
        const textarea = this.querySelector('textarea');
        const btn = this.querySelector('button');

        btn.innerText = 'A guardar...';
        btn.disabled = true;

        try {
          const response = await fetch('/api/responder-chamado', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ chamadoId, respostaEquipe: textarea.value })
          });

          if (response.ok) {
            carregarChamados(); // Recarrega o painel inteiro para atualizar o estado visual
          } else {
            alert('Erro ao enviar resposta.');
            btn.innerText = 'Enviar Resposta Técnica';
            btn.disabled = false;
          }
        } catch (err) {
          alert('Erro na rede.');
          btn.disabled = false;
        }
      });
    });
  }

  // Lógica do botão Sair
  document.getElementById('btnSairApoio').addEventListener('click', function() {
    localStorage.clear();
    window.location.href = 'login.html';
  });

  // Execução inicial
  carregarChamados();
});