let appData = { 
    clientes: [], 
    contas: [], 
    transacoes: [], 
    page: 1,
    filtroContaId: "" // Nova variável para o filtro
};

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

// FORMATO MOEDA EM REAIS BRL
const formatarMoedaParaTabela = (valor) => {
    // Formata o número "1.234,56"
    const partes = new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(valor || 0).split(',');

    const inteiro = partes[0];
    const decimal = partes[1];

    // Retorna o HTML estrutura
    return `
        <div class="valor-celula">
            <span class="valor-inteiro">R$ ${inteiro}</span>
            <span class="valor-decimal">,${decimal}</span>
        </div>
    `;
};

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
    (c) => formatarMoedaParaTabela(c.saldo), 
    'status'
], (item) => `
    <button class="btn-blue" onclick="toggleStatus('${item.id}')">${item.status === 'Ativa' ? 'Inativar' : 'Ativar'}</button>
    <button style="background:#dc3545" onclick="handleDelConta('${item.id}')">Excluir</button>
`);
                  
    // Renderiza a Tabela de Transações
    // Filtragem de Transações
    let transacoesFiltradas = [...appData.transacoes];
    if (appData.filtroContaId) {
        transacoesFiltradas = transacoesFiltradas.filter(t => 
            String(t.contaId) === String(appData.filtroContaId)
        );
    }

    // Paginação baseada nos dados filtrados
    const start = (appData.page - 1) * 5;
    const paginated = transacoesFiltradas.reverse().slice(start, start + 5);
    
    // Renderiza Tabela de Histórico de Transações
    ui.renderTable('tabela-transacoes', paginated, [
        'data', 
        (t) => {
            const c = appData.contas.find(conta => String(conta.id) === String(t.contaId));
            return c ? `Conta ${c.numero}` : 'N/A';
        }, 
        'tipo', 
        (t) => formatarMoedaParaTabela(t.valor),
        (t) => formatarMoedaParaTabela(t.novoSaldo),
    ]);

    // Select de Filtro Nova Transação (apenas contas Ativas)
    const contasAtivas = appData.contas.filter(c => c.status === 'Ativa');
    ui.fillSelect('transacao-conta', contasAtivas, 'numero', 'id', 'Selecione a Conta...');
    
    // Select de Filtro de Conta na Tabela de Transações
    ui.fillSelect('filtro-transacao-conta', appData.contas, 'numero', 'id', 'Todas as Contas');
    
    // Manter o valor selecionado após o refresh
    document.getElementById('filtro-transacao-conta').value = appData.filtroContaId;

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
    
    const btnConfirmar = e.target.querySelector('button[type="submit"]');
    const contaId = document.getElementById('transacao-conta').value;
    const valor = parseFloat(document.getElementById('transacao-valor').value);
    const tipo = document.getElementById('transacao-tipo').value;
    
    if (!contaId) return ui.showToast("Selecione uma conta.", "error");
    if (isNaN(valor) || valor <= 0) return ui.showToast("Digite um valor válido.", "error");

    const conta = appData.contas.find(c => String(c.id) === String(contaId));
    const erro = validar.transacao(tipo, valor, conta.saldo);
    if(erro) return ui.showToast(erro, 'error');

    // Desabilita o botão temporariamente para evitar cliques duplos
    btnConfirmar.disabled = true;
    btnConfirmar.innerText = "Processando...";

    const novoSaldo = tipo === 'Depósito' ? conta.saldo + valor : conta.saldo - valor;
    
    try {
        // Passo 1: Atualizar o saldo da conta
        await api.put(`/contas/${conta.id}`, { ...conta, saldo: novoSaldo });
        
        // Passo 2: Registrar o histórico
        await api.post('/transacoes', { 
            contaId: isNaN(contaId) ? contaId : Number(contaId), 
            tipo, 
            valor, 
            novoSaldo, 
            data: new Date().toISOString().split('T')[0]
        });

        ui.showToast("Transação realizada com sucesso!");
        
        // Limpa o formulário
        e.target.reset();

        // Atualiza os dados (isso vai rodar o refreshUI internamente)
        await loadAll(); 

        // GARANTIA: Força a aba de transações a continuar ativa (caso o refreshUI resete algo)
        // Não usamos o .click() aqui para não gerar loop, apenas garantimos a classe.
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('aba-transacoes').classList.add('active');
        document.querySelector('[onclick*="aba-transacoes"]').classList.add('active');

    } catch (err) {
        ui.showToast("Erro ao realizar a transação.", "error");
    } finally {
        btnConfirmar.disabled = false;
        btnConfirmar.innerText = "Confirmar";
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
        // Rolar a página para cima suavemente
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

// PAGINAÇÃO
document.getElementById('btn-prev').onclick = () => {
    if(appData.page > 1) { appData.page--; refreshUI(); }
};

document.getElementById('btn-next').onclick = () => {
    const totalPages = Math.ceil(appData.transacoes.length / 5);
    if(appData.page < totalPages) { appData.page++; refreshUI(); }
};

// NAVEGAÇÃO ENTRE ABAS
window.openTab = function(event, tabId) {
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => content.classList.remove('active'));

    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    
    if (event) {
        event.currentTarget.classList.add('active');
    } else {
        document.querySelector(`[onclick*="${tabId}"]`).classList.add('active');
    }

    localStorage.setItem('activeTab', tabId);
    refreshUI();
};

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    loadAll();
    
    // Recuperar a última aba aberta
    const lastTab = localStorage.getItem('activeTab') || 'aba-clientes';
    openTab(null, lastTab);
    
    // Configuração do Tema Dark/Light
    if(localStorage.getItem('theme') === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
    }
    
    document.getElementById('theme-toggle').onclick = () => {
        const isDark = document.body.hasAttribute('data-theme');
        
        if (isDark) {
            document.body.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
        } else {
            // Volta a usar o setAttribute para garantir que o valor "dark" seja escrito
            document.body.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        }
    };
});

// FILTROS (Clientes e Transações)
document.getElementById('filtro-cliente').addEventListener('input', (e) => {
    const termoDigitado = e.target.value.toLowerCase();
    const clientesFiltrados = appData.clientes.filter(cliente => 
        cliente.nome.toLowerCase().includes(termoDigitado)
    );
    ui.renderTable('tabela-clientes', clientesFiltrados, ['nome', 'cpf', 'email'], 
        (item) => `<button class="btn-blue" onclick="handleEditCliente('${item.id}')">Editar</button> 
                   <button style="background:#dc3545" onclick="handleDelCliente('${item.id}')">Excluir</button>`);
});

// Máscara de CPF
document.getElementById('cliente-cpf').addEventListener('input', (e) => {
    let v = e.target.value.replace(/\D/g, ""); 
    if (v.length > 11) v = v.slice(0, 11);
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    e.target.value = v; 
});

// Filtros da Tabela de Transações
document.getElementById('filtro-transacao-conta').addEventListener('change', (e) => {
    appData.filtroContaId = e.target.value;
    appData.page = 1; 
    refreshUI();
});

document.getElementById('btn-limpar-filtro').addEventListener('click', () => {
    appData.filtroContaId = "";
    document.getElementById('filtro-transacao-conta').value = "";
    appData.page = 1;
    refreshUI();
});