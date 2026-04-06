let appData = { clientes: [], contas: [], transacoes: [], page: 1 };

// CARREGAR E RENDERIZAR
async function loadAll() {
    try {
        appData.clientes = await api.get('/clientes');
        appData.contas = await api.get('/contas');
        appData.transacoes = await api.get('/transacoes');
        refreshUI();
    } catch (error) {
        ui.showToast("Erro ao conectar com o servidor. O json-server está rodando?", "error");
        console.error(error);
    }
}

function refreshUI() {
    // Renderiza a Tabela de Clientes
    ui.renderTable('tabela-clientes', appData.clientes, ['nome', 'cpf', 'email'], 
        (item) => `<button class="btn-blue" onclick="handleEditCliente('${item.id}')">Editar</button> 
                   <button style="background:#dc3545" onclick="handleDelCliente('${item.id}')">Excluir</button>`);
    
    // Renderiza a Tabela de Contas (Procura o nome do cliente usando o ID)
    ui.renderTable('tabela-contas', appData.contas, [
    'numero',
    (conta) => {
        const cli = appData.clientes.find(c => String(c.id) === String(conta.clienteId));
        return cli ? cli.nome : 'Cliente não encontrado';
    },
    (conta) => {
        const cli = appData.clientes.find(c => String(c.id) === String(conta.clienteId));
        return cli ? cli.cpf : 'N/A';
    },
    'tipo', 
    (c) => `R$ ${parseFloat(c.saldo).toFixed(2)}`, 
    'status'
], (item) => `
    <button class="btn-blue" onclick="toggleStatus('${item.id}')">${item.status === 'Ativa' ? 'Inativar' : 'Ativar'}</button>
    <button style="background:#dc3545" onclick="handleDelConta('${item.id}')">Excluir</button>
`);
                  
    // Renderiza a Tabela de Transações (Com paginação de 5 em 5)
    const start = (appData.page - 1) * 5;
    const paginated = [...appData.transacoes].reverse().slice(start, start + 5);
    
    ui.renderTable('tabela-transacoes', paginated, [
        'data', 
        (t) => {
            const c = appData.contas.find(conta => String(conta.id) === String(t.contaId));
            return c ? c.numero : t.contaId;
        }, 
        'tipo', 
        (t) => `R$ ${parseFloat(t.valor).toFixed(2)}`, 
        (t) => `R$ ${parseFloat(t.novoSaldo).toFixed(2)}`
    ]);
    
    // atualiza os selects para que os novos clientes/contas apareçam na hora
    ui.fillSelect('conta-clienteId', appData.clientes, 'nome');
    ui.fillSelect('transacao-conta', appData.contas.filter(c => c.status === 'Ativa'), 'numero');
    
    document.getElementById('page-info').textContent = `Página ${appData.page}`;
}

// SALVAR CLIENTE
document.getElementById('form-cliente').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        nome: document.getElementById('cliente-nome').value,
        cpf: document.getElementById('cliente-cpf').value,
        email: document.getElementById('cliente-email').value
    };
    
    const erro = validar.cliente(payload);
    if(erro) return ui.showToast(erro, 'error');

    const id = document.getElementById('cliente-id').value;
    
    try {
        if (id) {
            await api.put(`/clientes/${id}`, payload);
            ui.showToast("Cliente atualizado com sucesso!");
        } else {
            await api.post('/clientes', payload);
            ui.showToast("Cliente salvo com sucesso!");
        }
        e.target.reset();
        document.getElementById('cliente-id').value = '';
        await loadAll(); // Vai no servidor, busca a lista nova e atualiza a tela
    } catch (err) {
        ui.showToast("Erro ao salvar o cliente.", "error");
    }
});


// CRIAR CONTA
document.getElementById('form-conta').addEventListener('submit', async (e) => {
    e.preventDefault();
    const clienteId = document.getElementById('conta-clienteId').value;
    const tipo = document.getElementById('conta-tipo').value;
    
    if (!clienteId) return ui.showToast("Por favor, selecione um cliente.", "error");

    const erroDuplicidade = validar.contaDuplicada(clienteId, tipo, appData.contas);
    if (erroDuplicidade) {
        return ui.showToast(erroDuplicidade, "error");
    }

    const payload = {
        numero: Math.floor(1000 + Math.random() * 9000),
        clienteId: isNaN(clienteId) ? clienteId : Number(clienteId), 
        tipo: tipo,
        saldo: 0,
        status: "Ativa"
    };

    try {
        await api.post('/contas', payload);
        ui.showToast("Conta criada com sucesso!");
        e.target.reset();
        await loadAll(); 
    } catch (err) {
        ui.showToast("Erro ao criar a conta.", "error");
    }
});

// REALIZAR TRANSAÇÃO
document.getElementById('form-transacao').addEventListener('submit', async (e) => {
    e.preventDefault();
    const contaId = document.getElementById('transacao-conta').value;
    const valor = parseFloat(document.getElementById('transacao-valor').value);
    const tipo = document.getElementById('transacao-tipo').value;
    
    if (!contaId) return ui.showToast("Selecione uma conta.", "error");
    if (isNaN(valor)) return ui.showToast("Digite um valor numérico válido.", "error");

    // Localiza a conta completa pelo ID para pegar o saldo atual
    const conta = appData.contas.find(c => String(c.id) === String(contaId));
    
    const erro = validar.transacao(tipo, valor, conta.saldo);
    if(erro) return ui.showToast(erro, 'error');

    // Regra: Somar se for depósito, subtrair se for saque
    const novoSaldo = tipo === 'Depósito' ? conta.saldo + valor : conta.saldo - valor;
    
    try {
        // Passo 1: Atualizar o saldo da conta no db.json
        await api.put(`/contas/${conta.id}`, { ...conta, saldo: novoSaldo });
        
        // Passo 2: Registrar o histórico na tabela transações no db.json
        await api.post('/transacoes', { 
            contaId: isNaN(contaId) ? contaId : Number(contaId), 
            tipo, 
            valor, 
            novoSaldo, 
            data: new Date().toISOString().split('T')[0] // Formata a data para YYYY-MM-DD
        });

        ui.showToast("Transação realizada com sucesso!");
        e.target.reset();
        await loadAll(); // Atualiza os saldos nas tabelas e no histórico
    } catch (err) {
        ui.showToast("Erro ao realizar a transação.", "error");
    }
});

// FUNÇÕES EXTRAS

window.handleEditCliente = (id) => {
    const cliente = appData.clientes.find(c => String(c.id) === String(id));
    if(cliente) {
        document.getElementById('cliente-id').value = cliente.id;
        document.getElementById('cliente-nome').value = cliente.nome;
        document.getElementById('cliente-cpf').value = cliente.cpf;
        document.getElementById('cliente-email').value = cliente.email;
        // Rola a página para cima suavemente
        //window.scrollTo({ top: 0, behavior: 'smooth' }); 
        
        //opção para forçar a abertura da aba clientes depois que mudei a navegação de rolagem para navegação em abas
        document.querySelector('[onclick*="aba-clientes"]').click();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

window.handleDelCliente = async (id) => {
    if(confirm("Deseja realmente excluir este cliente?")) {
        try {
            await api.delete(`/clientes/${id}`);
            ui.showToast("Cliente deletado!", "success");
            await loadAll();
        } catch(err) {
            ui.showToast("Erro ao excluir o cliente.", "error");
        }
    }
};

window.toggleStatus = async (id) => {
    const conta = appData.contas.find(c => String(c.id) === String(id));
    try {
        await api.put(`/contas/${id}`, { ...conta, status: conta.status === 'Ativa' ? 'Inativa' : 'Ativa' });
        ui.showToast("Status da conta atualizado!");
        await loadAll();
    } catch(err) {
        ui.showToast("Erro ao atualizar status.", "error");
    }
};

window.handleDelConta = async (id) => {
    if(confirm("Deseja realmente excluir esta conta?")) {
        try {
            await api.delete(`/contas/${id}`);
            ui.showToast("Conta excluída!", "success");
            await loadAll();
        } catch(err) {
            ui.showToast("Erro ao excluir a conta.", "error");
        }
    }
};

// PAGINAÇÃO E INICIALIZAÇÃO
document.getElementById('btn-prev').onclick = () => {
    if(appData.page > 1) { appData.page--; refreshUI(); }
};

document.getElementById('btn-next').onclick = () => {
    const totalPages = Math.ceil(appData.transacoes.length / 5);
    if(appData.page < totalPages) { appData.page++; refreshUI(); }
};

document.addEventListener('DOMContentLoaded', () => {
    loadAll();
    
    // Configuração do Tema Dark/Light
    if(localStorage.getItem('theme') === 'dark') document.body.setAttribute('data-theme', 'dark');
    document.getElementById('theme-toggle').onclick = () => {
        const isDark = document.body.hasAttribute('data-theme');
        if (isDark) {
            document.body.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
        } else {
            document.body.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        }
    };
});

// FILTRO DE CLIENTES EM TEMPO REAL
document.getElementById('filtro-cliente').addEventListener('input', (e) => {
    
    // transforma em minúsculo
    const termoDigitado = e.target.value.toLowerCase();
    
    // filtra a lista original de clientes
    const clientesFiltrados = appData.clientes.filter(cliente => 
        cliente.nome.toLowerCase().includes(termoDigitado)
    );
    
    // pede para a UI redesenhar APENAS a tabela de clientes com a nova lista filtrada
    ui.renderTable('tabela-clientes', clientesFiltrados, ['nome', 'cpf', 'email'], 
        (item) => `<button class="btn-blue" onclick="handleEditCliente('${item.id}')">Editar</button> 
                   <button style="background:#dc3545" onclick="handleDelCliente('${item.id}')">Excluir</button>`);
});

// MÁSCARA DE CPF AUTOMÁTICA 
document.getElementById('cliente-cpf').addEventListener('input', (e) => {
    // Remove tudo que não é número
    let v = e.target.value.replace(/\D/g, ""); 
    
    // Corta qualquer coisa que passe de 11 dígitos 
    if (v.length > 11) v = v.slice(0, 11);
    
    // Aplica a formatação apenas se houver números
    v = v.replace(/(\d{3})(\d)/, "$1.$2");       // Primeiro ponto
    v = v.replace(/(\d{3})(\d)/, "$1.$2");       // Segundo ponto
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2"); // Hífen
    
    e.target.value = v; 
});

// FUNÇÃO PARA NAVEGAÇÃO ENTRE ABAS
window.openTab = function(event, tabId) {
    // Esconder todos os conteúdos das abas
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => content.classList.remove('active'));

    // Desativa os botões
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));

    // Ativa aba e botão atual
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');

    // Garantir que os dados estão atualizados quando trocar de aba
    refreshUI();
};