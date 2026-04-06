const ui = {
    renderTable(id, data, columns, actions = null) {
        const tbody = document.querySelector(`#${id} tbody`);
        tbody.innerHTML = data.map(item => `
            <tr>
                ${columns.map(col => `<td>${item[col] || col(item)}</td>`).join('')}
                ${actions ? `<td>${actions(item)}</td>` : ''}
            </tr>
        `).join('');
    },

    showToast(msg, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = msg;
        toast.className = `toast ${type}`;
        setTimeout(() => toast.className = 'toast', 3000);
    },

    fillSelect(id, data, textKey, valueKey = 'id') {
        const select = document.getElementById(id);
        const options = data.map(item => `<option value="${item[valueKey]}">${item[textKey]}</option>`);
        select.innerHTML = '<option value="">Selecione...</option>' + options.join('');
    }
};