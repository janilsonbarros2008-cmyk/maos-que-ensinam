// public/js/painel-admin.js

document.addEventListener('DOMContentLoaded', async function() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');

  // Trava de segurança
  if (!token || role !== 'ADMIN') {
    alert('Acesso negado. Faça login com uma conta de administrador.');
    window.location.href = 'login.html';
    return;
  }

  // ==========================================
  // VARIÁVEIS GLOBAIS DA INTERFACE (Declaradas apenas UMA VEZ)
  // ==========================================
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const tabelaUsuarios = document.getElementById('tabelaUsuarios');
  const tabelaTrilhas = document.getElementById('tabelaTrilhas'); 

  let usuariosEmMemoria = [];
  let trilhasEmMemoria = [];

  // ==========================================
  // NAVEGAÇÃO DE ABAS COM LAZY LOADING
  // ==========================================
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Limpa todas as abas
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      // Ativa a aba clicada
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-target');
      document.getElementById(targetId).classList.add('active');

      // Lazy Loading: Só busca as trilhas se a tabela estiver vazia (apenas com o aviso de carregando)
      if (targetId === 'aba-trilhas' && tabelaTrilhas.children.length <= 1) {
        carregarTrilhas();
      }
    });
  });

  // ==========================================
  // LÓGICA DE USUÁRIOS
  // ==========================================
  async function carregarUsuarios() {
    try {
      const response = await fetch('/api/gerenciar-usuarios', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      usuariosEmMemoria = data.usuarios;
      tabelaUsuarios.innerHTML = '';

      data.usuarios.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="font-weight: 600; color: var(--text-main);">${user.nome}</td>
          <td>${user.email}</td>
          <td>${user.matricula}</td>
          <td><span class="role-badge role-${user.role}">${user.role}</span></td>
          <td style="text-align: right;">
            <button class="action-btn edit-btn" onclick="abrirModalEdicao('${user._id}')" title="Editar Usuário">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="action-btn delete-btn" onclick="excluirUsuario('${user._id}', '${user.nome}')" title="Excluir Usuário">
              <i class="fa-solid fa-trash"></i>
            </button>
          </td>
        `;
        tabelaUsuarios.appendChild(tr);
      });
    } catch (error) {
      tabelaUsuarios.innerHTML = `<tr><td colspan="5" style="color: var(--error-color); text-align: center;">Erro: ${error.message}</td></tr>`;
    }
  }

  // Função Global de Exclusão de Usuários
  window.excluirUsuario = async function(id, nome) {
    if (confirm(`⚠️ Tem certeza que deseja excluir "${nome}" permanentemente?`)) {
      try {
        const response = await fetch('/api/gerenciar-usuarios', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ id })
        });
        if (response.ok) carregarUsuarios();
        else alert((await response.json()).error);
      } catch (error) {
        alert('Erro de conexão ao tentar excluir.');
      }
    }
  };

  // Modal de Edição de Usuários
  const modalEdicao = document.getElementById('modalEdicao');
  const btnFecharModal = document.getElementById('btnFecharModal');
  const formEdicao = document.getElementById('formEdicao');
  const alertaEdicao = document.getElementById('alertaEdicao');

  window.abrirModalEdicao = function(id) {
    const user = usuariosEmMemoria.find(u => u._id === id);
    if (!user) return;
    
    document.getElementById('editId').value = user._id;
    document.getElementById('editNome').value = user.nome;
    document.getElementById('editEmail').value = user.email;
    document.getElementById('editMatricula').value = user.matricula;
    document.getElementById('editRole').value = user.role;
    
    // NOVO: Lógica de Vinculação de Mentorados
    const blocoVinculo = document.getElementById('blocoVinculoMonitor');
    const selectMonitor = document.getElementById('editMonitorVinculado');
    
    if (user.role === 'MENTORADO') {
      blocoVinculo.style.display = 'block';
      
      // Filtra apenas os monitores e preenche o dropdown
      const monitores = usuariosEmMemoria.filter(u => u.role === 'MONITOR');
      selectMonitor.innerHTML = '<option value="">Nenhum / Remover vínculo</option>';
      monitores.forEach(m => {
        const option = document.createElement('option');
        option.value = m._id;
        option.textContent = `${m.nome} (${m.matricula})`;
        selectMonitor.appendChild(option);
      });
      
      // Se ele já tiver um monitor, seleciona-o na lista
      if (user.dadosMentorado && user.dadosMentorado.monitorVinculado) {
        selectMonitor.value = user.dadosMentorado.monitorVinculado;
      }
    } else {
      blocoVinculo.style.display = 'none';
    }

    alertaEdicao.style.display = 'none';
    modalEdicao.classList.add('active');
  };

  btnFecharModal.addEventListener('click', () => modalEdicao.classList.remove('active'));

  formEdicao.addEventListener('submit', async function(e) {
    e.preventDefault();
    const btnSalvar = document.getElementById('btnSalvarEdicao');
    btnSalvar.innerText = 'A guardar...';
    btnSalvar.disabled = true;

    const payload = {
      id: document.getElementById('editId').value,
      nome: document.getElementById('editNome').value,
      email: document.getElementById('editEmail').value,
      matricula: document.getElementById('editMatricula').value,
      role: document.getElementById('editRole').value
    };

    if (payload.role === 'MENTORADO') {
      payload.dadosMentorado = {
        monitorVinculado: document.getElementById('editMonitorVinculado').value || null
      };
    }

    try {
      const response = await fetch('/api/gerenciar-usuarios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        modalEdicao.classList.remove('active');
        carregarUsuarios(); // Atualiza a tabela na hora
      } else {
        alertaEdicao.innerText = data.error || 'Erro ao atualizar dados.';
        alertaEdicao.className = 'alert alert-error';
        alertaEdicao.style.display = 'block';
      }
    } catch (error) {
      alertaEdicao.innerText = 'Erro de comunicação com o servidor.';
      alertaEdicao.className = 'alert alert-error';
      alertaEdicao.style.display = 'block';
    } finally {
      btnSalvar.innerText = 'Guardar Alterações';
      btnSalvar.disabled = false;
    }
  });

  // ==========================================
  // LÓGICA DO CRUD DE TRILHAS
  // ==========================================
  const modalTrilha = document.getElementById('modalTrilha');
  const formTrilha = document.getElementById('formTrilha');
  const alertaTrilha = document.getElementById('alertaTrilha');

  async function carregarTrilhas() {
    try {
      const response = await fetch('/api/trilhas', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      trilhasEmMemoria = data.trilhas;
      tabelaTrilhas.innerHTML = '';

      if (trilhasEmMemoria.length === 0) {
        tabelaTrilhas.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-light);">Nenhum módulo cadastrado.</td></tr>`;
        return;
      }

      trilhasEmMemoria.forEach(trilha => {
        const badgeColor = trilha.status === 'PUBLICADO' ? 'var(--accent-color)' : '#95A5A6';
        const dataFormatada = new Date(trilha.updatedAt).toLocaleDateString('pt-BR');
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="font-weight: 700; text-align: center;">${trilha.ordem}</td>
          <td>
            <div style="font-weight: 600; color: var(--text-main);">${trilha.titulo}</div>
            <div style="font-size: 0.8rem; color: var(--text-light);">${trilha.descricao}</div>
          </td>
          <td><span style="background-color: ${badgeColor}; color: white; padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.8rem; font-weight: bold;">${trilha.status}</span></td>
          <td style="font-size: 0.9rem;">${dataFormatada}</td>
          <td style="text-align: right;">
            <button class="action-btn edit-btn" onclick="abrirModalTrilha('${trilha._id}')"><i class="fa-solid fa-pen"></i></button>
            <button class="action-btn delete-btn" onclick="excluirTrilha('${trilha._id}', '${trilha.titulo}')"><i class="fa-solid fa-trash"></i></button>
          </td>
        `;
        tabelaTrilhas.appendChild(tr);
      });
    } catch (error) {
      tabelaTrilhas.innerHTML = `<tr><td colspan="5" style="color: var(--error-color); text-align: center;">Erro ao carregar trilhas.</td></tr>`;
    }
  }

  window.abrirModalTrilha = function(id = null) {
    alertaTrilha.style.display = 'none';
    formTrilha.reset();

    if (id) {
      document.getElementById('tituloModalTrilha').innerText = 'Editar Módulo';
      const trilha = trilhasEmMemoria.find(t => t._id === id);
      if (trilha) {
        document.getElementById('trilhaId').value = trilha._id;
        document.getElementById('trilhaTitulo').value = trilha.titulo;
        document.getElementById('trilhaDescricao').value = trilha.descricao;
        document.getElementById('trilhaConteudo').value = trilha.conteudo;
        document.getElementById('trilhaOrdem').value = trilha.ordem;
        document.getElementById('trilhaStatus').value = trilha.status;
      }
    } else {
      document.getElementById('tituloModalTrilha').innerText = 'Novo Módulo de Capacitação';
      document.getElementById('trilhaId').value = '';
      document.getElementById('trilhaOrdem').value = trilhasEmMemoria.length + 1;
    }
    
    modalTrilha.classList.add('active');
  };

  document.getElementById('btnFecharModalTrilha').addEventListener('click', () => {
    modalTrilha.classList.remove('active');
  });

  formTrilha.addEventListener('submit', async function(e) {
    e.preventDefault();
    const btnSalvar = document.getElementById('btnSalvarTrilha');
    btnSalvar.innerText = 'A guardar...';
    btnSalvar.disabled = true;

    const id = document.getElementById('trilhaId').value;
    const metodo = id ? 'PUT' : 'POST';

    const payload = {
      titulo: document.getElementById('trilhaTitulo').value,
      descricao: document.getElementById('trilhaDescricao').value,
      conteudo: document.getElementById('trilhaConteudo').value,
      ordem: document.getElementById('trilhaOrdem').value,
      status: document.getElementById('trilhaStatus').value
    };

    if (id) payload.id = id;

    try {
      const response = await fetch('/api/trilhas', {
        method: metodo,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        modalTrilha.classList.remove('active');
        carregarTrilhas(); // Atualiza a tabela na hora
      } else {
        const data = await response.json();
        alertaTrilha.innerText = data.error || 'Erro ao guardar a trilha.';
        alertaTrilha.className = 'alert alert-error';
        alertaTrilha.style.display = 'block';
      }
    } catch (error) {
      alertaTrilha.innerText = 'Erro de comunicação com o servidor.';
      alertaTrilha.className = 'alert alert-error';
      alertaTrilha.style.display = 'block';
    } finally {
      btnSalvar.innerText = 'Guardar Módulo';
      btnSalvar.disabled = false;
    }
  });

  window.excluirTrilha = async function(id, titulo) {
    if (confirm(`Tem a certeza que deseja excluir o módulo "${titulo}"?`)) {
      try {
        await fetch('/api/trilhas', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ id })
        });
        carregarTrilhas();
      } catch (error) {
        alert('Erro ao excluir a trilha.');
      }
    }
  };

  // Logout
  document.getElementById('btnSairAdmin').addEventListener('click', function() {
    localStorage.clear();
    window.location.href = 'login.html';
  });

  // DISPARO INICIAL (Ao abrir o painel, a aba Usuários é a primeira, então já puxamos eles)
  carregarUsuarios();
});