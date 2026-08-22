import { API_BASE_URL } from './config.js';

export function toggleModal(id, show) {
    const el = document.getElementById(id);
    if (!el) return;
    if (show) el.classList.remove('hidden');
    else      el.classList.add('hidden');
}

export function showMessageModal(title, message) {
    const titleEl = document.getElementById('msg-title');
    const bodyEl  = document.getElementById('msg-body');
    if (titleEl) titleEl.textContent = title;
    if (bodyEl)  bodyEl.textContent  = message;
    toggleModal('msg-modal', true);
}

export function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g,  '&amp;')
        .replace(/</g,  '&lt;')
        .replace(/>/g,  '&gt;')
        .replace(/"/g,  '&quot;')
        .replace(/'/g,  '&#39;');
}

// Generic authenticated API helper (used across views)
export async function api(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        credentials: 'include',
        headers: {},
    };
    if (body) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
    }
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || err.message || `HTTP ${response.status}`);
    }
    return response.json().then(d => d.data || d);
}