import { API_BASE_URL, state } from './config.js';

export async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, { credentials: 'include' });
        if (response.ok) {
            const resData = await response.json();
            const data    = resData.data || resData;
            if (data.authenticated) {
                state.currentUser = data;
                return true;
            }
        }
    } catch (error) {
        console.log('Not logged in');
    }
    state.currentUser = null;
    return false;
}

export function updateAuthUI() {
    const loginBtn     = document.getElementById('login-btn');
    const userInfo     = document.getElementById('user-info');
    const userName     = document.getElementById('user-name');
    const userInitials = document.getElementById('user-avatar-initials');

    const show = (el) => el && el.classList.remove('hidden');
    const hide = (el) => el && el.classList.add('hidden');

    if (state.currentUser) {
        hide(loginBtn);
        show(userInfo);

        if (userName)     userName.textContent = state.currentUser.name;

        if (userInitials && state.currentUser.name) {
            const parts    = state.currentUser.name.trim().split(' ');
            const initials = parts.length >= 2
                ? parts[0][0] + parts[parts.length - 1][0]
                : parts[0].substring(0, 2);
            userInitials.textContent = initials.toUpperCase();
        }
    } else {
        show(loginBtn);
        hide(userInfo);
    }
}

export async function login() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, { credentials: 'include' });
        const resData  = await response.json();
        const data     = resData.data || resData;
        if (data.authorizationUrl) window.location.href = data.authorizationUrl;
    } catch (error) {
        alert('Login failed. Please try again.');
    }
}

export async function logout() {
    await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
    window.location.reload();
}