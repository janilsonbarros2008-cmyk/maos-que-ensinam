// public/js/painel-apoio.js

document.addEventListener('DOMContentLoaded', async function() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');

  // 1. Guarda de Rota
  if (!token || !['MULTIPROFISSIONAL', 'COORDENADOR', 'ADMIN'].includes(role)) {
    localStorage.clear();
    window.location.href = 'login.html';
    return;
  }

  // ==========================================
  // NAVEGAÇÃO DE ABAS COM LAZY LOADING
  // ==========================================
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const listaChamados = document.getElementById('listaChamados');
  const listaPendentes = document.getElementById('listaPendentes');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-target');
      document.getElementById(targetId).classList.add('active');

      // Lazy Loading: Só carrega a aba se ela ainda estiver vazia
      if (targetId === 'seccao-validacao' && listaPendentes.children.length <= 1) {
        carregarDiariosPendentes();
      }
    });
  });

  // ==========================================
  // LÓGICA DE CHAMADOS DE SUPORTE
  // ==========================================
  async function carregarChamados() {
    try {
      const response = await fetch('/api/listar-chamados', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (!response.ok) {
        listaChamados.innerHTML = `<div class="card" style="color: var(--error-color)">${data.error || 'Erro ao carregar dados.'}</div>`;
        return;
      }

      if (data.chamados.length === 0) {
        listaChamados.innerHTML = `<div class="card" style="text-align: center; color: var(--text-light)">Nenhum pedido de apoio registado até ao momento.</div>`;
        return;
      }

      listaChamados.innerHTML = '';

      data.chamados.forEach(chamado => {
        const isResolvido = chamado.status === 'RESOLVIDO';
        const card = document.createElement('div');
        card.className = `card chamado-item ${isResolvido ? 'resolvido' : ''}`;

        const nomeMonitor = chamado.monitorId ? chamado.monitorId.nome : 'Monitor Removido';
        const turmaMonitor = chamado.monitorId && chamado.monitorId.dadosMonitor ? chamado.monitorId.dadosMonitor.turma : 'Sem turma';
        const dataCriacao = new Date(chamado.createdAt).toLocaleString('pt-BR');

        let blocoAcao = '';

        if (!isResolvido) {
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

        listaChamados.appendChild(card);
      });

      atividadesFormularios();

    } catch (error) {
      listaChamados.innerHTML = `<div class="card" style="color: var(--error-color)">Erro de ligação com o servidor.</div>`;
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
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ chamadoId, respostaEquipe: textarea.value })
          });

          if (response.ok) {
            carregarChamados();
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

  // ==========================================
  // LÓGICA DE VALIDAÇÃO DE DIÁRIOS (NOVO)
  // ==========================================
  async function carregarDiariosPendentes() {
    try {
      const response = await fetch('/api/validar-diario', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (!response.ok) throw new Error();

      listaPendentes.innerHTML = '';

      if (data.pendentes.length === 0) {
        listaPendentes.innerHTML = `<div class="card" style="text-align: center; color: var(--text-light); padding: 3rem;">Nenhum diário pendente de validação no momento. Tudo em dia!</div>`;
        return;
      }

      data.pendentes.forEach(diario => {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.borderLeft = '4px solid #F39C12'; // Amarelo de alerta

        const nomeMonitor = diario.monitorId ? diario.monitorId.nome : 'Monitor Removido';
        const nomeMentorado = diario.mentoradoId ? diario.mentoradoId.nome : 'Aluno Removido';
        const dataSessao = new Date(diario.dataSessao);
        const dataFormatada = new Date(dataSessao.getTime() + Math.abs(dataSessao.getTimezoneOffset() * 60000)).toLocaleDateString('pt-BR');

        card.innerHTML = `
          <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem;">
            <div>
              <h3 style="margin-bottom: 0.2rem;"><i class="fa-solid fa-user-graduate"></i> Monitor: ${nomeMonitor}</h3>
              <p style="color: var(--text-light); font-size: 0.9rem;"><strong>Estudante Apoiado:</strong> ${nomeMentorado}</p>
              <p style="color: var(--text-light); font-size: 0.9rem;"><i class="fa-regular fa-calendar"></i> ${dataFormatada} &nbsp;|&nbsp; <i class="fa-regular fa-clock"></i> ${diario.tempoSessao} minutos</p>
            </div>
            <div style="background-color: var(--bg-color); padding: 0.5rem 1rem; border-radius: var(--radius); text-align: center; height: fit-content;">
              <span style="display: block; font-size: 0.8rem; color: var(--text-light);">Recompensa</span>
              <strong style="color: var(--accent-color);">+${diario.xpGerado} XP</strong>
            </div>
          </div>
          
          <div style="background-color: #FAFAFA; padding: 1rem; border-radius: var(--radius); margin-bottom: 1.5rem; font-size: 0.95rem; border: 1px solid #EEEEEE;">
            <strong>Resumo da Sessão:</strong><br>
            ${diario.resumoAtividades.replace(/\n/g, '<br>')}
          </div>

          <div style="display: flex; gap: 1rem;">
            <button class="btn btn-primary" onclick="avaliarDiario('${diario._id}', 'APROVAR')" style="width: auto; flex-grow: 1; min-height: 44px; background-color: var(--accent-color);">
              <i class="fa-solid fa-check"></i> Aprovar e Creditar XP
            </button>
            <button class="btn btn-outline" onclick="avaliarDiario('${diario._id}', 'REJEITAR')" style="width: auto; color: var(--error-color); border-color: var(--error-color); min-height: 44px;">
              <i class="fa-solid fa-xmark"></i> Rejeitar
            </button>
          </div>
        `;
        listaPendentes.appendChild(card);
      });
    } catch (error) {
      listaPendentes.innerHTML = `<div class="card" style="color: var(--error-color); text-align: center;">Erro ao carregar dados.</div>`;
    }
  }

  // Função global para processar a aprovação
  window.avaliarDiario = async function(id, acao) {
    const confirmacao = acao === 'APROVAR' 
      ? 'Deseja aprovar este relatório e creditar as horas ao aluno?' 
      : 'Tem a certeza que deseja rejeitar este relatório? O aluno não receberá o XP.';
      
    if (confirm(confirmacao)) {
      try {
        const response = await fetch('/api/validar-diario', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ diarioId: id, acao })
        });

        if (response.ok) {
          carregarDiariosPendentes(); // Atualiza a lista na hora, sumindo com o card aprovado
        } else {
          alert('Erro ao processar a validação.');
        }
      } catch (error) {
        alert('Erro de rede.');
      }
    }
  };

  // Logout
  document.getElementById('btnSairApoio').addEventListener('click', function() {
    localStorage.clear();
    window.location.href = 'login.html';
  });

  // Disparo Inicial: A primeira aba é a dos chamados, logo carregamo-los ao entrar
  carregarChamados();
});