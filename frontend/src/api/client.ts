const API_BASE = import.meta.env.VITE_API_URL || '';

async function request(path: string, options: RequestInit = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (res.status === 204) return null;
    return res.json();
}

export function getItems() {
    return request('/items');
}

export function addItem(name: string) {
    return request('/items', {
        method: 'POST',
        body: JSON.stringify({ name }),
    });
}

export function updateItem(id: string, data: { name?: string; completed?: boolean }) {
    return request(`/items/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export function deleteItem(id: string) {
    return request(`/items/${id}`, { method: 'DELETE' });
}