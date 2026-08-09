import { API_BASE_URL, state } from './config.js';
import { escapeHtml, toggleModal, showMessageModal } from './utils.js';
import { login } from './auth.js';

export function showEventList() {
    document.getElementById('view-events-list')?.classList.remove('hidden');
    document.getElementById('view-event-detail')?.classList.add('hidden');
    state.currentEventDetails = null;
    fetchEvents();
    if (state.currentUser) fetchMyEvents();
}

export async function fetchMyEvents() {
    const section = document.getElementById('my-events-section');
    const grid    = document.getElementById('my-events-grid');
    if (!grid || !state.currentUser) {
        if (section) section.classList.add('hidden');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/events/my-registrations`, { credentials: 'include' });
        const resData  = await response.json();
        const events   = resData.data || [];

        if (events.length > 0) {
            section.classList.remove('hidden');
            grid.innerHTML = '';
            events.forEach(evt => {
                const card = createEventCard(evt, true);
                const reg = evt.userRegistration;
                const endTime = evt.endTime || evt.startTime || evt.date;
                const isEnded = evt.status === 'FINISHED' || new Date(endTime) < new Date();
                const certEnabled = evt.certificateSettings?.enabled !== false && evt.settings?.allowCertificate !== false;
                
                if (reg && reg.checkedIn && reg.status === 'APPROVED' && isEnded && certEnabled) {
                    const btn = document.createElement('button');
                    btn.className = 'mt-3 w-full font-mono uppercase font-bold bg-cyan text-ink border-2 border-ink px-4 py-2 shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-75 text-xs';
                    btn.textContent = 'FETCH CREDENTIAL';
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        handleRequestCertificate(evt);
                    };
                    card.querySelector('.card-body').appendChild(btn);
                }
                grid.appendChild(card);
            });
        } else {
            section.classList.add('hidden');
        }
    } catch (e) {
        console.error('Error fetching my events:', e);
    }
}

export async function fetchEvents() {
    const grid = document.getElementById('events-grid');
    if (!grid) return;

    grid.innerHTML = `<div class="col-span-full font-mono font-bold uppercase text-ink text-sm">LOADING...</div>`;

    try {
        const response = await fetch(`${API_BASE_URL}/events`);
        const resData  = await response.json();
        let events     = resData.data || [];

        if (!Array.isArray(events) || events.length === 0) {
            grid.innerHTML = `<div class="col-span-full font-mono text-xs uppercase font-bold text-ink">[ NO DATA FOUND ]</div>`;
            return;
        }

        const now = Date.now();
        events.sort((a, b) => {
            let aEligible = 0;
            let bEligible = 0;
            if (state.currentUser && state.currentUser.communities) {
                const userCommIds = state.currentUser.communities.map(c => c.id);
                if (a.communityId && userCommIds.includes(a.communityId)) aEligible = 1;
                if (b.communityId && userCommIds.includes(b.communityId)) bEligible = 1;
            }
            if (aEligible !== bEligible) return bEligible - aEligible;

            const aCert = a.settings?.isCertificateOnly ? 1 : 0;
            const bCert = b.settings?.isCertificateOnly ? 1 : 0;
            if (aCert !== bCert) return bCert - aCert;

            const boostDiff = (b.boost || 0) - (a.boost || 0);
            if (boostDiff !== 0) return boostDiff;
            return Math.abs(new Date(a.startTime) - now) - Math.abs(new Date(b.startTime) - now);
        });

        grid.innerHTML = '';
        events.forEach((evt) => {
            grid.appendChild(createEventCard(evt));
        });
    } catch (error) {
        grid.innerHTML = `<div class="col-span-full font-mono text-xs uppercase font-bold text-danger bg-ink p-4 border-2 border-ink">[ ERROR FETCHING DATA ]</div>`;
    }
}

function createEventCard(evt, isRegistered = false) {
    const div = document.createElement('div');
    const eventId = evt.PK.split('#')[1];
    const slug = evt.slug || eventId;

    const imgSrc = evt.bannerImage || `https://placehold.co/400x400/0b0b0b/5ce1e6?text=${encodeURIComponent(evt.title || 'Event')}`;
    const dateStr = new Date(evt.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    const isUpcoming = new Date(evt.startTime) > new Date();
    const statusBadge = isRegistered
        ? `<span class="border-2 border-ink bg-ink text-cyan px-2 py-1 font-mono text-[10px] uppercase font-bold shadow-[2px_2px_0_0_#5ce1e6]">REGISTERED</span>`
        : isUpcoming
            ? `<span class="border-2 border-ink bg-white text-ink px-2 py-1 font-mono text-[10px] uppercase font-bold shadow-[2px_2px_0_0_#000]">UPCOMING</span>`
            : `<span class="border-2 border-ink bg-gray-200 text-ink px-2 py-1 font-mono text-[10px] uppercase font-bold">PAST</span>`;

    div.className = 'bg-white border-2 border-ink shadow-[4px_4px_0_0_#000] flex flex-col cursor-pointer hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] transition-all duration-0 rounded-none group';

    div.innerHTML = `
        <div class="border-b-2 border-ink overflow-hidden aspect-square bg-canvas">
            <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(evt.title)}" class="w-full h-full object-contain transition-all duration-200">
        </div>
        <div class="p-4 flex flex-col flex-1 gap-4 card-body">
            <div class="flex items-center justify-between">
                ${statusBadge}
                <span class="font-mono text-xs font-bold uppercase">${escapeHtml(dateStr)}</span>
            </div>
            <h3 class="text-xl font-black uppercase tracking-tight text-ink leading-none mt-2 group-hover:text-cyan group-hover:bg-ink p-1 transition-none">
                ${escapeHtml(evt.title)}
            </h3>
            <p class="font-sans text-sm text-ink line-clamp-3 border-l-4 border-ink pl-3 flex-1">
                ${escapeHtml((evt.description || '').substring(0, 150))}
            </p>
            <button class="w-full font-mono uppercase font-bold bg-white text-ink border-2 border-ink px-4 py-2 shadow-[4px_4px_0_0_#000] group-hover:bg-cyan btn-details transition-none duration-0 text-xs">
                ${isRegistered ? 'ACCESS TICKET' : 'READ DOCS'}
            </button>
        </div>
    `;

    div.querySelector('.btn-details').addEventListener('click', (e) => {
        e.stopPropagation();
        window.navigate(`/?event=${slug}`);
    });
    div.addEventListener('click', () => window.navigate(`/?event=${slug}`));

    return div;
}

export async function openEventDetails(identifier) {
    document.getElementById('view-events-list')?.classList.add('hidden');
    document.getElementById('view-event-detail')?.classList.remove('hidden');
    setActionState('loading');

    try {
        const response = await fetch(`${API_BASE_URL}/events/${identifier}`, { credentials: 'include' });
        if (!response.ok) throw new Error('Event not found');
        const resData = await response.json();
        state.currentEventDetails = resData.data || resData;
    } catch (e) {
        document.getElementById('view-events-list')?.classList.remove('hidden');
        document.getElementById('view-event-detail')?.classList.add('hidden');
        return showMessageModal('CRITICAL ERROR', 'Failed to retrieve event data.');
    }

    const evt = state.currentEventDetails;
    if (!evt) return;

    const slug = evt.slug || evt.PK.split('#')[1];

    const setText = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    setText('det-title', evt.title);
    setText('det-date', new Date(evt.startTime).toLocaleString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' }));
    setText('det-location', evt.location || 'REMOTE');
    setText('det-capacity', `${evt.stats?.registered ?? 0}/${evt.capacity ?? 'MAX'}`);
    setText('det-desc', evt.longDescription || evt.description || '');

    const imgWrap = document.getElementById('det-image-wrap');
    const imgEl = document.getElementById('det-image');
    if (imgEl && evt.bannerImage) {
        imgEl.src = evt.bannerImage;
        imgWrap.style.display = 'block';
    } else if (imgWrap) {
        imgWrap.style.display = 'none';
    }

    const qCont = document.getElementById('det-questions-container');
    if (qCont) {
        qCont.innerHTML = '';
        const questions = evt.registrationQuestions || [];
        questions.forEach((q, idx) => {
            const isObj = typeof q === 'object';
            const label = isObj ? q.label : q;
            const type = isObj ? q.type : 'short';
            const required = isObj ? q.required : false;
            const qId = isObj ? q.id : `q_${idx}`;
            const reqMark = required ? '<span class="text-danger ml-1">*</span>' : '';

            let inputHtml = '';
            const inputClass = 'border-2 border-ink bg-white p-3 font-mono text-sm rounded-none focus:outline-none focus:ring-0 focus:border-cyan focus:bg-ink focus:text-cyan transition-colors duration-75 w-full';

            if (type === 'long') {
                inputHtml = `<textarea name="${escapeHtml(qId)}" class="${inputClass}" rows="3"></textarea>`;
            } else if (type === 'mcq' || type === 'radio') {
                const options = q.options || [];
                inputHtml = `<div class="reg-group border-2 border-ink p-2 space-y-2 bg-canvas" data-qid="${escapeHtml(qId)}" data-type="radio">`;
                options.forEach(opt => {
                    inputHtml += `<label class="flex items-center gap-2 cursor-pointer font-mono text-xs uppercase font-bold hover:bg-ink hover:text-cyan p-1 transition-none"><input type="radio" name="radio_${escapeHtml(qId)}" value="${escapeHtml(opt)}" class="accent-ink w-4 h-4 rounded-none"><span>${escapeHtml(opt)}</span></label>`;
                });
                inputHtml += `</div>`;
            } else {
                inputHtml = `<input type="text" name="${escapeHtml(qId)}" class="${inputClass}">`;
            }

            const block = document.createElement('div');
            block.className = 'question-block mb-4';
            block.dataset.qid = qId;
            block.dataset.required = required;
            block.innerHTML = `<label class="font-mono text-xs font-bold uppercase mb-1 block">${escapeHtml(label)}${reqMark}</label>${inputHtml}`;
            qCont.appendChild(block);
        });
    }

    await checkUserStatusForEvent(evt.PK.split('#')[1], evt);
}

export async function checkUserStatusForEvent(eventId, eventDetails) {
    if (!state.currentUser) {
        setActionState('login_required');
        return;
    }
    try {
        if (eventDetails.settings?.isCertificateOnly) {
            setActionState('certificate-only', '', false, eventDetails);
            return;
        }

        const response = await fetch(`${API_BASE_URL}/events/${eventId}/my-status`, { credentials: 'include' });
        const resData = await response.json();
        const statusData = resData.data || resData;

        if (statusData && statusData.registered) setActionState('ticket', statusData.status, statusData.checkedIn, eventDetails);
        else if (eventDetails.settings?.registrationClosed) setActionState('closed');
        else setActionState('register');
    } catch (e) {
        setActionState('register');
    }
}

function setActionState(uiState, statusLabel = '', checkedIn = false, eventDetails = null) {
    ['action-loading', 'action-register', 'action-ticket', 'action-closed', 'action-certificate-only'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    const show = (id) => { const el = document.getElementById(id); if (el) el.classList.remove('hidden'); };

    if (uiState === 'loading') show('action-loading');
    else if (uiState === 'register') show('action-register');
    else if (uiState === 'closed') show('action-closed');
    else if (uiState === 'certificate-only') {
        show('action-certificate-only');
        const btn = document.getElementById('btn-get-certificate');
        if (btn) btn.onclick = () => {
            window.navigate(`/certificate?eventId=${eventDetails.PK.split('#')[1]}`);
        };
    }
    else if (uiState === 'ticket') {
        show('action-ticket');
        const btnTicket = document.getElementById('btn-show-ticket');
        btnTicket.onclick = () => {
            toggleModal('ticket-modal', true);
            document.getElementById('ticket-event-name').textContent = eventDetails.title;
            setTimeout(() => {
                const canvas = document.getElementById('qr-canvas');
                if (canvas && state.currentUser) {
                    QRCode.toCanvas(canvas, state.currentUser.user_id, { width: 200, margin: 2, color: { dark: '#0b0b0b', light: '#ffffff' } }, (err) => {
                        if (err) console.error(err);
                    });
                }
            }, 50);
        };

        const actionsDiv = document.getElementById('post-event-actions');
        const feedbackBtn = document.getElementById('btn-feedback');
        const certBtn = document.getElementById('btn-certificate');
        const endTime = eventDetails.endTime || eventDetails.startTime;
        const isEnded = eventDetails.status === 'FINISHED' || new Date(endTime) < new Date();
        const certEnabled = (eventDetails.settings?.allowCertificate) || (eventDetails.certificateSettings?.enabled);

        if (checkedIn && isEnded) {
            actionsDiv.classList.remove('hidden');
            feedbackBtn.onclick = () => showMessageModal('ACKNOWLEDGED', 'Data received.');
            if (certEnabled) {
                certBtn.classList.remove('hidden');
                certBtn.onclick = () => handleRequestCertificate(eventDetails);
            } else certBtn.classList.add('hidden');
        } else actionsDiv.classList.add('hidden');
    } else if (uiState === 'login_required') {
        const lDiv = document.getElementById('action-loading');
        if (lDiv) {
            lDiv.classList.remove('hidden');
            lDiv.innerHTML = `<button onclick="document.getElementById('login-btn').click()" class="w-full font-mono uppercase tracking-widest font-bold bg-white text-ink border-2 border-ink px-4 py-3 shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-75">AUTHENTICATE TO REGISTER</button>`;
        }
    }
}

export async function handleRegisterConfirm() {
    if (!state.currentUser) return login();
    if (!state.currentEventDetails) return;
    
    // ... validation logic remains the same ...
    const evtId = state.currentEventDetails.PK.split('#')[1];
    const answers = {};
    const blocks = document.querySelectorAll('.question-block');
    for (const block of blocks) {
        const qId = block.dataset.qid;
        const required = block.dataset.required === 'true';
        let value = null;
        const radioGroup = block.querySelector('.reg-group[data-type="radio"]');
        const input = block.querySelector('input[type="text"], textarea');
        if (radioGroup) {
            const checked = radioGroup.querySelector('input:checked');
            if (checked) value = checked.value;
        } else if (input) value = input.value.trim();
        if (required && !value) return showMessageModal('VALIDATION ERROR', 'Required data missing.');
        if (value !== null) answers[qId] = value;
    }

    const btn = document.getElementById('btn-register');
    if (btn) { btn.disabled = true; btn.textContent = 'EXECUTING...'; }

    try {
        const response = await fetch(`${API_BASE_URL}/events/${evtId}/register`, {
            method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers }),
        });
        const resData = await response.json();
        if (response.ok) {
            showMessageModal('SUCCESS', 'Operation confirmed.');
            openEventDetails(state.currentEventDetails.slug || evtId);
        } else showMessageModal('ERROR', resData.error || 'Operation failed.');
    } catch (e) {
        showMessageModal('ERROR', 'Connection disrupted.');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'EXECUTE REGISTRATION'; }
    }
}

export async function handleCancelTicket() {
    if (!confirm('TERMINATE REGISTRATION?')) return;
    if (!state.currentEventDetails) return;
    const evtId = state.currentEventDetails.PK.split('#')[1];
    const response = await fetch(`${API_BASE_URL}/events/${evtId}/register`, { method: 'DELETE', credentials: 'include' });
    if (response.ok) {
        openEventDetails(state.currentEventDetails.slug || evtId);
    } else {
        showMessageModal('ERROR', 'Cancellation failed.');
    }
}

export async function handleRequestCertificate(event) {
    const eventId = event.PK.split('#')[1];
    window.navigate(`/certificate?eventId=${eventId}`);
}