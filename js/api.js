const BASE_URL = 'http://localhost:3000';

const api = {
    async request(path, method = 'GET', body = null) {
        const config = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (body) config.body = JSON.stringify(body);

        try {
            const res = await fetch(`${BASE_URL}${path}`, config);
            if (!res.ok) throw new Error('Falha na requisição');
            return await res.json();
        } catch (err) {
            console.error("API Error:", err);
            throw err;
        }
    },
    // atalhos
    get: (p) => api.request(p),
    post: (p, d) => api.request(p, 'POST', d),
    put: (p, d) => api.request(p, 'PUT', d),
    delete: (p) => api.request(p, 'DELETE')
};