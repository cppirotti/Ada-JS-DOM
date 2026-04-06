const validar = {
    cliente(dados) {
        if (!dados.nome || !dados.cpf || !dados.email) return "Preencha todos os campos!";
        if (!dados.email.includes('@')) return "Email inválido!";
        
        // validar o CPF
        if (!this.cpfFormatado(dados.cpf)) {
            return "CPF inválido! Use o formato 000.000.000-00";
        }
        
        return null;
    },
    
    // testar o formato do CPF
    cpfFormatado(cpf) {
        // formato: 3 números . 3 números . 3 números - 2 números
        const regexCPF = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
        return regexCPF.test(cpf);
    },

    contaDuplicada(clienteId, tipoSelecionado, listaContas) {
        const jaPossui = listaContas.find(conta => 
            String(conta.clienteId) === String(clienteId) && 
            conta.tipo === tipoSelecionado
        );
        if (jaPossui) return `Este cliente já possui uma conta do tipo ${tipoSelecionado}!`;
        return null;
    },

    transacao(tipo, valor, saldo) {
        if (valor <= 0) return "Valor deve ser positivo!";
        if (tipo === 'Saque' && valor > saldo) return "Saldo insuficiente!";
        return null;
    }
};