import { state } from './config.js';
import { checkAuth, login, logout, updateAuthUI } from './auth.js';
import { fetchEvents, fetchMyEvents, handleRegisterConfirm, handleCancelTicket, showEventList, openEventDetails } from './events.js';
import { toggleModal } from './utils.js';
import { renderCheckoutPage, renderUnifiedPage } from './certificate.js';

export async function router() {
    const rawPath = window.location.hash ? window.location.hash.slice(1) : window.location.pathname;
    let pathname = (rawPath || '/').split('?')[0];
    if (!pathname || pathname === '') pathname = '/';

    const rawQuery = window.location.search ? window.location.search.slice(1) : (window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '');
    const searchParams = new URLSearchParams(rawQuery);
    const eventSlug = searchParams.get('event');

    if (pathname === '/certificate' || pathname.endsWith('/certificate')) {
        document.body.innerHTML = '<div id="app"></div>';
        await renderCheckoutPage();
    } else if (pathname.includes('/certificate/verify/') || (pathname.includes('/certificate/') && !pathname.endsWith('/certificate'))) {
        let certId = pathname.split('/').filter(Boolean).pop();
        document.body.innerHTML = '<div id="app"></div>';
        await renderUnifiedPage(certId);
    } else if (eventSlug) {
        await openEventDetails(eventSlug);
    } else {
        showEventList();
    }
}

export function navigate(url) {
    window.location.hash = url.startsWith('#') ? url : '#' + url;
}
window.navigate = navigate;

window.addEventListener('hashchange', router);
window.addEventListener('popstate', router);

document.addEventListener('click', e => {
    const link = e.target.closest('a');
    if (link && link.matches('a.nav-link')) {
        e.preventDefault();
        navigate(link.getAttribute('href'));
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    window.showEventList = showEventList;
    window.toggleModal   = toggleModal;

    setupListeners();
    await checkAuth();
    updateAuthUI();

    await router();
});

function setupListeners() {
    document.getElementById('login-btn')?.addEventListener('click', login);
    document.getElementById('logout-btn')?.addEventListener('click', logout);
    document.getElementById('btn-register')?.addEventListener('click', handleRegisterConfirm);
    document.getElementById('btn-cancel')?.addEventListener('click', handleCancelTicket);
}