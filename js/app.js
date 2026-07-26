import { state } from './config.js';
import { checkAuth, login, logout, updateAuthUI } from './auth.js';
import { fetchEvents, fetchMyEvents, handleRegisterConfirm, handleCancelTicket, showEventList, openEventDetails } from './events.js';
import { toggleModal } from './utils.js';
import { renderCheckoutPage, renderUnifiedPage } from './certificate.js';

document.addEventListener('DOMContentLoaded', async () => {
    window.showEventList = showEventList;
    window.toggleModal   = toggleModal;

    setupListeners();
    await checkAuth();
    updateAuthUI();

    const searchParams = new URLSearchParams(window.location.search);
    const eventSlug    = searchParams.get('event');
    const pathname     = window.location.pathname;

    if (pathname === '/certificate' || pathname.endsWith('/certificate')) {
        document.body.innerHTML = '<div id="app"></div>';
        await renderCheckoutPage();
    } else if (pathname.includes('/certificate/verify/') || (pathname.includes('/certificate/') && !pathname.endsWith('/certificate'))) {
        let certId = pathname.split('/').pop();
        if (!certId && pathname.endsWith('/')) {
            // handle trailing slash
            const parts = pathname.split('/');
            certId = parts[parts.length - 2];
        }
        document.body.innerHTML = '<div id="app"></div>';
        await renderUnifiedPage(certId);
    } else if (eventSlug) {
        await openEventDetails(eventSlug);
    } else {
        fetchEvents();
        if (state.currentUser) fetchMyEvents();
    }
});

function setupListeners() {
    document.getElementById('login-btn')?.addEventListener('click', login);
    document.getElementById('logout-btn')?.addEventListener('click', logout);
    document.getElementById('btn-register')?.addEventListener('click', handleRegisterConfirm);
    document.getElementById('btn-cancel')?.addEventListener('click', handleCancelTicket);
}