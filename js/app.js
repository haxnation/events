import { state } from './config.js';
import { checkAuth, login, logout, updateAuthUI } from './auth.js';
import { fetchEvents, fetchMyEvents, handleRegisterConfirm, handleCancelTicket, showEventList, openEventDetails } from './events.js';
import { toggleModal } from './utils.js';
import { renderCheckoutPage, renderUnifiedPage } from './certificate.js';

function getRoute() {
    // Prefer hash route (SPA canonical: #/certificate/verify/:id).
    // Fall back to pretty pathname for old share links / direct loads.
    const hash = window.location.hash || '';
    const hashPath = hash.startsWith('#') ? hash.slice(1) : '';
    const pathFromHash = hashPath.split('?')[0];
    const queryFromHash = hashPath.includes('?') ? hashPath.split('?').slice(1).join('?') : '';

    let pathname;
    let rawQuery;
    if (pathFromHash && pathFromHash !== '/') {
        pathname = pathFromHash || '/';
        rawQuery = queryFromHash || window.location.search.slice(1);
    } else {
        pathname = (window.location.pathname || '/').split('?')[0];
        rawQuery = window.location.search.slice(1) || queryFromHash;
    }
    if (!pathname || pathname === '') pathname = '/';
    return { pathname, rawQuery };
}

export async function router() {
    const { pathname, rawQuery } = getRoute();
    const searchParams = new URLSearchParams(rawQuery);
    const eventSlug = searchParams.get('event');

    if (pathname === '/certificate' || pathname.endsWith('/certificate')) {
        if (!document.getElementById('app')) document.body.innerHTML = '<div id="app"></div>';
        await renderCheckoutPage();
    } else if (pathname.includes('/certificate/verify/') || (pathname.includes('/certificate/') && !pathname.endsWith('/certificate'))) {
        let certId = pathname.split('/').filter(Boolean).pop();
        // strip any trailing query fragments that slipped in
        certId = (certId || '').split('?')[0].split('#')[0];
        if (!document.getElementById('app')) document.body.innerHTML = '<div id="app"></div>';
        await renderUnifiedPage(certId);
    } else if (eventSlug) {
        // If we previously replaced <body> with #app (cert pages), a
        // hash-nav back to event list needs a full reload to restore DOM.
        if (!document.getElementById('view-events-list')) {
            window.location.href = '/#/?event=' + encodeURIComponent(eventSlug);
            window.location.reload();
            return;
        }
        await openEventDetails(eventSlug);
    } else {
        if (!document.getElementById('view-events-list')) {
            window.location.href = '/#/';
            window.location.reload();
            return;
        }
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