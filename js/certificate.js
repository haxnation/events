import { api, escapeHtml } from './utils.js';
import { API_BASE_URL } from './config.js';

export async function renderCheckoutPage() {
    const rawParams = window.location.search ? window.location.search.slice(1) : (window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '');
    const params = new URLSearchParams(rawParams);
    const eventId = params.get('eventId');
    const container = document.getElementById('app');

    if (!eventId) {
        container.innerHTML = `
            <div class="min-h-screen bg-canvas flex items-center justify-center p-6">
                <div class="bg-white border-4 border-ink shadow-[12px_12px_0_0_#ff2a2a] p-8 max-w-md w-full text-center">
                    <h2 class="text-3xl font-black uppercase tracking-tight text-ink mb-2 border-b-4 border-ink pb-2">ERROR</h2>
                    <p class="font-mono text-sm my-6 text-ink font-bold">[ MISSING TRACKING ID ]</p>
                    <a href="/#/" class="inline-block font-mono uppercase tracking-widest font-bold bg-white text-ink border-2 border-ink px-6 py-3 shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-75">
                        RETURN
                    </a>
                </div>
            </div>`;
        return;
    }

    container.innerHTML = `
        <div class="min-h-screen bg-canvas flex items-center justify-center">
            <span class="font-mono text-xl uppercase tracking-widest font-bold text-ink bg-cyan px-2 py-1 border-2 border-ink animate-pulse shadow-[4px_4px_0_0_#000]">
                FETCHING DATA...
            </span>
        </div>`;

    try {
        const res = await api(`/events/${eventId}/certificate-metadata`);
        if (!res) throw new Error('Data null');

        let { eventName, userName, date, certId, requiresPayment, cost, gateways } = res;
        gateways = gateways || { cashfree: true, phonepe: true };

        // If certificate is already issued, redirect to unified page!
        // Use hash route — pretty paths 404 on static hosting (GitHub Pages).
        if (res.issuedAt && certId) {
            window.location.replace(`/#/certificate/verify/${certId}`);
            return;
        }

        const formattedDate = new Date(date).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: '2-digit',
        });

        const orderIdParam = params.get('order_id');
        if (orderIdParam) {
            container.innerHTML = `
            <div class="min-h-screen bg-canvas flex items-center justify-center">
                <span class="font-mono text-xl uppercase tracking-widest font-bold text-ink bg-cyan px-2 py-1 border-2 border-ink animate-pulse shadow-[4px_4px_0_0_#000]">
                    VERIFYING PAYMENT...
                </span>
            </div>`;
            try {
                const dlRes = await api(`/events/${eventId}/certificate/download?orderId=${encodeURIComponent(orderIdParam)}`);
                if (dlRes && dlRes.certId) certId = dlRes.certId;
                window.location.replace(`/#/certificate/verify/${certId}`);
                return;
            } catch (e) {
                console.error("Payment verification failed", e);
                const currentHash = window.location.hash;
                const newHash = currentHash.includes('?') ? currentHash + '&eventId=' + eventId : currentHash + '?eventId=' + eventId;
                window.location.hash = newHash;
                // allow it to fall through and render the page normally
            }
        }

        container.innerHTML = `
            <div class="min-h-screen bg-canvas p-6 flex flex-col items-center">
                <div class="w-full max-w-2xl mt-10">
                    
                    <a href="/#/" class="inline-block font-mono uppercase tracking-widest font-bold bg-white text-ink border-2 border-ink px-4 py-2 shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-75 mb-8">
                        [ ← RETURN ]
                    </a>

                    <div class="bg-white border-4 border-ink shadow-[12px_12px_0_0_#5ce1e6] p-0">
                        <div class="bg-ink text-cyan p-4 font-mono font-bold flex justify-between items-center uppercase border-b-4 border-ink">
                            <span class="tracking-widest">CERTIFICATE RECORD</span>
                            <span class="bg-cyan text-ink px-2 py-0.5 text-xs shadow-[2px_2px_0_0_#fff]">ID: ${escapeHtml(eventId.substring(0,6))}</span>
                        </div>

                        <div class="p-8 text-center border-b-4 border-ink bg-[linear-gradient(to_right,#80808020_1px,transparent_1px),linear-gradient(to_bottom,#80808020_1px,transparent_1px)] bg-[size:32px_32px]">
                            <div class="inline-flex items-center gap-3 bg-ink text-cyan px-4 py-3 border-2 border-cyan shadow-[4px_4px_0_0_#5ce1e6] mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                <span class="font-mono font-bold uppercase tracking-widest text-sm">${cost > 0 ? 'PAYMENT REQUIRED' : 'ACTION REQUIRED'}</span>
                            </div>
                            <p class="font-mono text-xs text-ink font-bold uppercase tracking-widest mb-4">${cost > 0 ? 'Complete payment to unlock your credential.' : 'Claim your free credential below.'}</p>
                        </div>

                        <div class="p-6 bg-canvas">
                            <div class="mb-6 bg-white border-2 border-ink p-3 shadow-[2px_2px_0_0_#000] flex items-center gap-2">
                                <span class="font-mono text-xs text-ink font-bold uppercase">⏳ RETENTION:</span>
                                <span class="font-mono text-xs text-neutral-700 font-bold">Certificates are valid and stored for 2 years from date of issue.</span>
                            </div>

                            <div class="mb-6 bg-white border-4 border-ink p-4 shadow-[4px_4px_0_0_#000]">
                                <p class="font-mono text-[10px] uppercase tracking-widest font-bold text-ink mb-2">ISSUANCE TARGET</p>
                                <p class="font-black text-xl text-ink uppercase mb-2">${escapeHtml(userName || 'UNKNOWN')}</p>
                                <p class="font-mono text-xs text-red-600 font-bold uppercase tracking-widest mb-4">WARNING: This name is permanently locked once the credential is generated.</p>
                                <a href="https://auth.haxnation.org" target="_blank" class="inline-block font-mono text-[10px] uppercase tracking-widest font-bold bg-ink text-white px-3 py-2 hover:bg-cyan hover:text-ink transition-colors shadow-[2px_2px_0_0_#ff2a2a]">
                                    UPDATE PROFILE NAME
                                </a>
                            </div>

                            <div class="mb-6 ${cost > 0 ? '' : 'hidden'}" id="payment-section">
                                <p class="font-mono text-[10px] uppercase tracking-widest font-bold text-ink mb-2">SECURE PAYMENT GATEWAY</p>
                                <div class="space-y-3">
                                    ${gateways.phonepe ? `
                                    <label class="flex items-center gap-3 border-2 border-ink bg-white p-3 shadow-[2px_2px_0_0_#000] cursor-pointer hover:bg-gray-50 transition-colors">
                                        <input type="radio" name="gateway" value="phonepe" class="w-4 h-4 text-cyan focus:ring-cyan border-ink">
                                        <div class="flex-1">
                                            <span class="font-mono font-bold uppercase text-sm block">PhonePe</span>
                                            <span class="font-sans text-xs text-gray-500">UPI, Cards, NetBanking</span>
                                        </div>
                                        <span class="font-mono font-bold uppercase text-sm bg-cyan text-ink px-2 py-1 border-2 border-ink">₹${cost}</span>
                                    </label>` : ''}
                                    ${gateways.cashfree ? `
                                    <label class="flex items-center gap-3 border-2 border-ink bg-white p-3 shadow-[2px_2px_0_0_#000] cursor-pointer hover:bg-gray-50 transition-colors">
                                        <input type="radio" name="gateway" value="cashfree" class="w-4 h-4 text-cyan focus:ring-cyan border-ink">
                                        <div class="flex-1">
                                            <span class="font-mono font-bold uppercase text-sm block">Cashfree Payments</span>
                                            <span class="font-sans text-xs text-gray-500">Credit Card, UPI, NetBanking</span>
                                        </div>
                                        <span class="font-mono font-bold uppercase text-sm bg-cyan text-ink px-2 py-1 border-2 border-ink">₹${cost}</span>
                                    </label>` : ''}
                                </div>
                            </div>
                            
                            <div class="flex flex-col sm:flex-row items-center gap-4">
                                <button id="btn-generate" class="w-full sm:w-auto flex-1 font-mono uppercase tracking-widest font-bold bg-cyan text-ink border-2 border-ink px-6 py-4 shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-75 text-center">
                                    ${cost > 0 ? `AUTHORIZE ₹${cost}` : 'CLAIM FREE CREDENTIAL'}
                                </button>
                            </div>
                            <span id="status-msg" class="block font-mono text-xs font-bold uppercase mt-3 h-4 tracking-widest"></span>
                        </div>
                    </div>
                </div>
            </div>`;

        const firstRadio = document.querySelector('input[name="gateway"]');
        if (firstRadio) firstRadio.checked = true;

        const btnGenerate = document.getElementById('btn-generate');
        if (btnGenerate) {
            btnGenerate.onclick = async function () {
                const btn = this;
                const status = document.getElementById('status-msg');
                btn.disabled = true;
                btn.textContent = 'PROCESSING...';
                status.textContent = '';
                status.style.color = '';

                try {
                    if (cost > 0) {
                        status.textContent = '[ INITIATING SECURE CHECKOUT... ]';
                        status.style.color = '#0b0b0b';

                        let selectedGateway = 'CASHFREE';
                        const gatewayRadio = document.querySelector('input[name="gateway"]:checked');
                        if (gatewayRadio) selectedGateway = gatewayRadio.value;

                        const checkoutRes = await api(`/events/${eventId}/certificate/checkout`, 'POST', { gateway: selectedGateway });
                        if (!checkoutRes) {
                            throw new Error("Could not initialize payment gateway");
                        }

                        if (checkoutRes.already_paid) {
                            status.textContent = '[ PREVIOUS PAYMENT FOUND. RECOVERING... ]';
                            status.style.color = '#0b0b0b';
                            const dlRes = await api(`/events/${eventId}/certificate/download?orderId=${encodeURIComponent(checkoutRes.order_id)}`);
                            if (dlRes && dlRes.certId) certId = dlRes.certId;
                        } else if (checkoutRes.gateway === 'PHONEPE') {
                            status.textContent = '[ REDIRECTING TO SECURE PAYMENT... ]';
                            window.location.href = checkoutRes.redirect_url;
                            return; // Wait for redirect
                        } else {
                            if (!checkoutRes.payment_session_id) {
                                throw new Error("Could not initialize Cashfree gateway");
                            }
                            status.textContent = '[ WAITING FOR PAYMENT COMPLETION... ]';
                            
                            const cashfree = Cashfree({
                                mode: window.CASHFREE_MODE || "sandbox"
                            });

                            const result = await cashfree.checkout({
                                paymentSessionId: checkoutRes.payment_session_id,
                                redirectTarget: "_modal"
                            });

                            if (result.error) {
                                throw new Error(result.error.message || "Payment was cancelled or failed");
                            }
                            
                            status.textContent = '[ ESTABLISHING SECURE CONNECTION... ]';
                            status.style.color = '#0b0b0b';

                            // Trigger the backend to verify orderId and issue the cert
                            const orderId = checkoutRes.order_id;
                            const dlRes = await api(`/events/${eventId}/certificate/download?orderId=${encodeURIComponent(orderId)}`);
                            if (dlRes && dlRes.certId) certId = dlRes.certId;
                        }
                    } else {
                        status.textContent = '[ ISSUING CREDENTIAL... ]';
                        status.style.color = '#0b0b0b';
                        const dlRes = await api(`/events/${eventId}/certificate/download`);
                        if (dlRes && dlRes.certId) certId = dlRes.certId;
                    }
                    
                    // ON SUCCESS, Redirect to unified verify page (hash route)!
                    window.location.replace(`/#/certificate/verify/${certId}`);

                } catch (e) {
                    status.textContent = `[ FAILURE: ${e.message.toUpperCase()} ]`;
                    status.style.color = '#ff2a2a';
                    btn.textContent    = 'RETRY EXECUTION';
                } finally {
                    btn.disabled = false;
                }
            };
        }

    } catch (e) {
        console.error(e);
        container.innerHTML = `
            <div class="min-h-screen bg-canvas flex items-center justify-center p-6">
                <div class="bg-white border-4 border-ink shadow-[12px_12px_0_0_#ff2a2a] p-8 max-w-md w-full text-center">
                    <h2 class="text-3xl font-black uppercase tracking-tight text-ink mb-2 border-b-4 border-ink pb-2">DENIED</h2>
                    <p class="font-mono text-sm my-6 text-ink font-bold">[ ${escapeHtml(e.message || 'CLEARANCE NOT MET').toUpperCase()} ]</p>
                    <a href="/#/" class="inline-block font-mono uppercase tracking-widest font-bold bg-white text-ink border-2 border-ink px-6 py-3 shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-75">
                        RETURN
                    </a>
                </div>
            </div>`;
    }
}


function resolveCertImage(payload, template, data) {
    // The issued certificate is a rendered IMAGE (not a PDF, not an HTML
    // component). Backend hands the frontend loadable URLs only — the
    // frontend never touches S3. Just collect candidate URL fields.
    const candidates = [];
    const push = (v) => {
        if (typeof v === 'string' && v.trim()) candidates.push(v.trim());
    };
    if (payload) {
        push(payload.backgroundImage); push(payload.backgroundImageUrl);
        push(payload.imageUrl); push(payload.certificateUrl); push(payload.certificateImageUrl);
        push(payload.previewUrl); push(payload.dataUrl); push(payload.image);
        push(payload.url);
    }
    if (data && typeof data === 'object') {
        push(data.imageUrl); push(data.certificateUrl); push(data.certificateImageUrl);
        push(data.previewUrl); push(data.dataUrl); push(data.image); push(data.url);
    }
    if (template && typeof template === 'object') {
        push(template.backgroundImage); push(template.background); push(template.backgroundUrl);
        push(template.image); push(template.imageUrl); push(template.url); push(template.src);
        push(template.previewUrl); push(template.preview);
    }
    if (typeof template === 'string' && /^https?:\/\/|^\//.test(template.trim())) push(template);
    if (typeof data === 'string' && (/^https?:\/\//.test(data.trim()) || data.trim().startsWith('data:image/'))) push(data);
    // Prefer images (incl. data:image/...) for <img>; PDFs are legacy only.
    const isPdf = (u) => /\.pdf(\?|$)/i.test(u) || u.startsWith('data:application/pdf');
    const isImg = (u) => u.startsWith('data:image/') || /\.(png|jpe?g|webp|gif|avif|svg)(\?|$)/i.test(u);
    const img = candidates.find(u => !isPdf(u) && (isImg(u) || !/\.pdf/i.test(u)));
    // `img` above is effectively "first non-PDF candidate" — the backend now
    // only ever sends images, so this is the rendered certificate.
    if (img) return { kind: 'image', url: img };
    const pdf = candidates.find(isPdf);
    if (pdf) return { kind: 'pdf', url: pdf };
    return null;
}

function extraDataRows(data, seen) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return '';
    const skip = new Set(['imageUrl', 'certificateUrl', 'certificateImageUrl', 'previewUrl', 'dataUrl', 'image', 'url', 'pdfPreviewUrl', 'pdfUrl', ...(seen || [])]);
    return Object.entries(data)
        .filter(([k, v]) => !skip.has(k) && v !== null && v !== undefined && v !== '' && typeof v !== 'object')
        .map(([k, v]) => {
            const label = k.replace(/([A-Z])/g, ' $1').replace(/[_-]+/g, ' ').trim().toUpperCase() || k.toUpperCase();
            return `<tr class="border-b-2 border-ink last:border-b-0">
                <td class="font-mono text-[11px] font-bold uppercase text-neutral-600 px-4 py-2.5 bg-canvas w-32 sm:w-36 align-top break-words" style="overflow-wrap:anywhere">${escapeHtml(label)}</td>
                <td class="font-mono text-xs font-bold text-ink px-4 py-2.5 break-words" style="overflow-wrap:anywhere">${escapeHtml(String(v))}</td>
            </tr>`;
        }).join('');
}

function missingArtworkHTML(certIdResolved) {
    return `
        <div class="border-2 border-ink bg-white shadow-[4px_4px_0_0_#000] overflow-hidden">
            <div class="p-8 sm:p-10 text-center">
                <p class="font-mono text-xs font-bold uppercase tracking-widest text-ink mb-2">[ Certificate image unavailable ]</p>
                <p class="font-mono text-[11px] uppercase text-neutral-600 font-bold leading-relaxed">The rendered certificate image could not be loaded.<br/>Credential <span class="break-all">${escapeHtml(String(certIdResolved))}</span> is still valid — details on this page are the source of truth.</p>
            </div>
        </div>`;
}

function ensureCertPrintStyles() {
    if (document.getElementById('cert-print-styles')) return;
    const st = document.createElement('style');
    st.id = 'cert-print-styles';
    st.textContent = `
        @media print {
            body.print-cert-only #app > *:not(#cert-print-root),
            body.print-cert-only nav { display: none !important; }
            body.print-cert-only { background: #fff !important; }
            body.print-cert-only #cert-print-root { display: block !important; }
            body.print-cert-only #cert-screen-view { display: none !important; }
            body.print-cert-only #cert-print-area { display: block !important; }
            #cert-print-area { display: none; }
        }
        #cert-print-area { display: none; }
        @page { size: landscape; margin: 10mm; }
    `;
    document.head.appendChild(st);
}

function printCertImage(url, holderName) {
    // Print ONLY the rendered certificate image — not the verification UI.
    if (!url) { window.print(); return; }
    const safeName = (holderName || 'certificate').replace(/[<>&"]/g, '');
    const w = window.open('', '_blank', 'width=1000,height=700');
    if (!w) {
        // Popup blocked → fall back to CSS-isolated print of #cert-print-area.
        document.body.classList.add('print-cert-only');
        const cleanup = () => document.body.classList.remove('print-cert-only');
        window.addEventListener('afterprint', cleanup, { once: true });
        setTimeout(cleanup, 2000);
        window.print();
        return;
    }
    w.document.write(`<!DOCTYPE html><html><head><title>${safeName} — Certificate</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { width: 100%; background: #fff; }
            body { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 8mm; }
            img { max-width: 100%; max-height: 92vh; width: auto; height: auto; object-fit: contain; display: block; }
            @page { size: landscape; margin: 10mm; }
            @media print { body { padding: 0; min-height: auto; display: block; } img { max-height: 95vh; width: 100%; } }
        </style></head><body>
        <img src="${url.replace(/"/g, '&quot;')}" alt="Certificate" onload="setTimeout(function(){window.focus();window.print();},150)" />
        </body></html>`);
    w.document.close();
}

function downloadUrlFilename(url, fallbackBase) {
    let ext = 'png';
    if (typeof url === 'string') {
        const m = url.match(/^data:(image\/[a-zA-Z0-9+.-]+|application\/pdf)/i);
        if (m) ext = m[1].toLowerCase().includes('pdf') ? 'pdf' : (m[1].split('/')[1].split(/[+;]/)[0] || 'png');
        else {
            const clean = url.split('?')[0].split('#')[0];
            const em = clean.match(/\.([a-z0-9]{2,5})$/i);
            if (em) ext = em[1].toLowerCase() === 'pdf' ? 'pdf' : em[1].toLowerCase();
        }
    }
    if (!/^[a-z0-9]{2,5}$/.test(ext)) ext = 'png';
    return `${fallbackBase}.${ext}`;
}

function resolveDownloadUrl(dlRes, fallbackVisualUrl) {
    if (!dlRes || typeof dlRes !== 'object') {
        return typeof dlRes === 'string' ? dlRes : (fallbackVisualUrl || null);
    }
    return dlRes.dataUrl || dlRes.imageUrl || dlRes.certificateUrl || dlRes.certificateImageUrl
        || dlRes.previewUrl || dlRes.url || dlRes.image || fallbackVisualUrl || null;
}

export async function renderUnifiedPage(certId) {
    const container = document.getElementById('app');

    if (!certId) return;

    container.innerHTML = `
        <div class="min-h-screen bg-canvas flex items-center justify-center">
            <span class="font-mono text-xl uppercase tracking-widest font-bold text-ink bg-cyan px-2 py-1 border-2 border-ink animate-pulse shadow-[4px_4px_0_0_#000]">
                VERIFYING CREDENTIAL...
            </span>
        </div>`;

    try {
        const res = await fetch(`${API_BASE_URL}/events/certificate/verify/${encodeURIComponent(certId)}`, {
            credentials: 'include' // include cookies so OptionalAuth works
        });
        const resData = await res.json().catch(() => ({}));

        if (!res.ok || !resData.success) throw new Error((resData && (resData.error || resData.message)) || `HTTP ${res.status} — INVALID CREDENTIAL`);

        const payload = resData.data || {};
        let { owner, event, template, data, isOwner, eventId: fetchedEventId, issuedAt, expiresAt } = payload;
        const certIdResolved = payload.certId || payload.certificateId || payload.id || certId;

        if (typeof template === 'string') {
            try {
                template = JSON.parse(template);
            } catch(e) { /* keep as raw string (may be image URL or HTML) */ }
        }
        if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch(e) { /* keep raw */ }
        }

        // Canonical share link uses hash route (works on static hosting).
        const certificateLink = `${window.location.origin}/#/certificate/verify/${certIdResolved}`;
        const fmtOpts = { year: 'numeric', month: 'short', day: '2-digit' };
        const formattedExpires = expiresAt ? new Date(expiresAt).toLocaleDateString('en-US', fmtOpts) : '2 years from issue';
        const formattedIssuedTime = issuedAt ? new Date(issuedAt).toLocaleString('en-US', { ...fmtOpts, hour: '2-digit', minute: '2-digit' }) : '—';

        const visual = resolveCertImage(payload, template, data);
        const holderName = (data && typeof data === 'object' && (data.holderName || data.name)) || owner || 'UNKNOWN';
        const eventName = (data && typeof data === 'object' && (data.eventName || data.event)) || event || 'UNKNOWN';

        // The displayed cert is the ACTUAL issued file — the exact `dataUrl`
        // the original working Download button used:
        //   GET /events/<eventId>/certificate/download → dlRes.dataUrl
        // Verify-payload artwork (template.backgroundImage etc.) is only the
        // blank TEMPLATE, so it is NEVER preferred for the owner view.
        const isPdfUrl = (u) => typeof u === 'string' &&
            (/\.pdf(\?|$)/i.test(u) || u.startsWith('data:application/pdf'));
        let certFileUrl = null;
        if (isOwner && fetchedEventId) {
            try {
                const dlRes = await api(`/events/${fetchedEventId}/certificate/download`);
                certFileUrl = resolveDownloadUrl(dlRes, null);
            } catch (e) {
                console.warn('Certificate file fetch failed:', e);
            }
        }
        if (!certFileUrl && visual) certFileUrl = visual.url; // public view fallback
        const certIsPdf = isPdfUrl(certFileUrl);
        let certVisualHtml;
        if (certFileUrl && !certIsPdf) {
            certVisualHtml = `
                <div class="border-2 border-ink bg-white shadow-[4px_4px_0_0_#000] overflow-hidden max-w-full" data-cert-visual>
                    <img id="cert-visual-img" src="${escapeHtml(certFileUrl)}" alt="Issued certificate for ${escapeHtml(holderName)}"
                         class="w-full max-w-full h-auto object-contain block" loading="eager" referrerpolicy="no-referrer" />
                </div>
                <div id="cert-visual-missing" class="hidden">${missingArtworkHTML(certIdResolved)}</div>`;
        } else if (certFileUrl && certIsPdf) {
            // Issued file is a PDF (what the old Download PDF button saved):
            // embed the SAME dataUrl so the preview is the real cert.
            certVisualHtml = `
                <div class="border-2 border-ink bg-white shadow-[4px_4px_0_0_#000] overflow-hidden max-w-full" data-cert-visual>
                    <iframe id="cert-visual-pdf" src="${escapeHtml(certFileUrl)}" title="Issued certificate for ${escapeHtml(holderName)}"
                            class="w-full block bg-white" style="height: 600px; border: 0;"></iframe>
                </div>
                <div id="cert-visual-missing" class="hidden">${missingArtworkHTML(certIdResolved)}</div>`;
        } else {
            certVisualHtml = missingArtworkHTML(certIdResolved);
        }
        const downloadLabel = certIsPdf ? 'Download PDF' : 'Download Image';

        const extraRows = extraDataRows(data, ['holderName', 'name', 'eventName', 'event']);
        const templateName = template && typeof template === 'object' && (template.name || template.title)
            ? String(template.name || template.title) : null;

        container.innerHTML = `
            <div id="cert-print-root" class="min-h-screen bg-canvas p-4 sm:p-6 flex flex-col items-center overflow-x-clip">
                <div class="w-full max-w-5xl min-w-0 mt-4 sm:mt-8">
                    <a href="/#/" class="inline-block font-mono uppercase tracking-widest font-bold bg-white text-ink border-2 border-ink px-4 py-2 shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-75 mb-6 text-xs">
                        [ ← RETURN ]
                    </a>

                    <div id="cert-screen-view" class="bg-white border-4 border-ink shadow-[12px_12px_0_0_#5ce1e6] max-w-full overflow-hidden">
                        <div class="bg-ink text-cyan p-4 font-mono font-bold flex flex-wrap gap-2 justify-between items-center uppercase border-b-4 border-ink">
                            <span class="tracking-widest text-sm">⛨ Certificate Verification</span>
                            <span class="bg-green-400 text-ink px-2 py-0.5 text-xs border-2 border-green-400 shadow-[2px_2px_0_0_#fff]">● VALID · 2-YR</span>
                        </div>

                        <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)] gap-0">
                            <!-- Rendered certificate image -->
                            <div class="p-4 sm:p-6 min-w-0 max-w-full overflow-hidden border-b-4 lg:border-b-0 lg:border-r-4 border-ink bg-[linear-gradient(to_right,#80808020_1px,transparent_1px),linear-gradient(to_bottom,#80808020_1px,transparent_1px)] bg-[size:32px_32px]">
                                <p class="font-mono text-[10px] uppercase tracking-widest font-bold text-ink mb-3">Rendered certificate</p>
                                ${certVisualHtml}
                                <div class="mt-4 flex flex-wrap items-stretch gap-3">
                                    ${isOwner ? `
                                    <button id="btn-download" class="flex-1 min-w-[200px] font-mono uppercase tracking-widest font-bold bg-cyan text-ink border-2 border-ink px-6 py-3 shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-75 text-center text-sm">
                                        ${downloadLabel}
                                    </button>` : ''}
                                    <button id="btn-print" class="font-mono uppercase tracking-widest font-bold bg-white text-ink border-2 border-ink px-6 py-3 shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-75 text-sm">
                                        Print
                                    </button>
                                </div>
                                <span id="status-msg" class="block font-mono text-xs font-bold uppercase mt-3 min-h-[1rem] tracking-widest break-words"></span>
                            </div>

                            <!-- Details table -->
                            <div class="p-4 sm:p-6 bg-white min-w-0 max-w-full overflow-hidden">
                                <p class="font-mono text-[10px] uppercase tracking-widest font-bold text-ink mb-3">Credential details</p>
                                <div class="border-2 border-ink shadow-[4px_4px_0_0_#000] max-w-full overflow-x-auto">
                                    <table class="w-full border-collapse table-fixed">
                                        <tbody>
                                            <tr class="border-b-2 border-ink">
                                                <td class="font-mono text-[11px] font-bold uppercase text-neutral-600 px-4 py-2.5 bg-canvas w-32 sm:w-36 align-top">Status</td>
                                                <td class="font-mono text-xs font-bold px-4 py-2.5 break-words" style="overflow-wrap:anywhere"><span class="inline-block bg-green-400 text-ink px-2 py-0.5 border-2 border-ink text-[11px]">VALID</span></td>
                                            </tr>
                                            <tr class="border-b-2 border-ink">
                                                <td class="font-mono text-[11px] font-bold uppercase text-neutral-600 px-4 py-2.5 bg-canvas w-32 sm:w-36 align-top">Holder</td>
                                                <td class="font-black text-sm uppercase text-ink px-4 py-2.5 break-words" style="overflow-wrap:anywhere">${escapeHtml(holderName)}</td>
                                            </tr>
                                            <tr class="border-b-2 border-ink">
                                                <td class="font-mono text-[11px] font-bold uppercase text-neutral-600 px-4 py-2.5 bg-canvas w-32 sm:w-36 align-top">Event</td>
                                                <td class="font-bold text-sm uppercase text-ink px-4 py-2.5 break-words" style="overflow-wrap:anywhere">${escapeHtml(eventName)}</td>
                                            </tr>
                                            <tr class="border-b-2 border-ink">
                                                <td class="font-mono text-[11px] font-bold uppercase text-neutral-600 px-4 py-2.5 bg-canvas w-32 sm:w-36 align-top">Certificate ID</td>
                                                <td class="font-mono text-xs text-ink px-4 py-2.5 break-all" style="overflow-wrap:anywhere">${escapeHtml(String(certIdResolved))}</td>
                                            </tr>
                                            <tr class="border-b-2 border-ink">
                                                <td class="font-mono text-[11px] font-bold uppercase text-neutral-600 px-4 py-2.5 bg-canvas w-32 sm:w-36 align-top">Issued on</td>
                                                <td class="font-mono text-xs font-bold text-ink px-4 py-2.5 break-words" style="overflow-wrap:anywhere">${escapeHtml(formattedIssuedTime)}</td>
                                            </tr>
                                            <tr class="border-b-2 border-ink">
                                                <td class="font-mono text-[11px] font-bold uppercase text-neutral-600 px-4 py-2.5 bg-canvas w-32 sm:w-36 align-top">Valid until</td>
                                                <td class="font-mono text-xs font-bold text-ink px-4 py-2.5 break-words" style="overflow-wrap:anywhere">${escapeHtml(formattedExpires)}</td>
                                            </tr>
                                            ${fetchedEventId ? `
                                            <tr class="border-b-2 border-ink">
                                                <td class="font-mono text-[11px] font-bold uppercase text-neutral-600 px-4 py-2.5 bg-canvas w-32 sm:w-36 align-top">Event ID</td>
                                                <td class="font-mono text-xs text-ink px-4 py-2.5 break-all" style="overflow-wrap:anywhere">${escapeHtml(String(fetchedEventId))}</td>
                                            </tr>` : ''}
                                            ${templateName ? `
                                            <tr class="border-b-2 border-ink">
                                                <td class="font-mono text-[11px] font-bold uppercase text-neutral-600 px-4 py-2.5 bg-canvas w-32 sm:w-36 align-top">Template</td>
                                                <td class="font-mono text-xs text-ink px-4 py-2.5 break-words" style="overflow-wrap:anywhere">${escapeHtml(templateName)}</td>
                                            </tr>` : ''}
                                            ${extraRows}
                                            <tr>
                                                <td class="font-mono text-[11px] font-bold uppercase text-neutral-600 px-4 py-2.5 bg-canvas w-32 sm:w-36 align-top">Retention</td>
                                                <td class="font-mono text-[11px] text-neutral-700 px-4 py-2.5 break-words" style="overflow-wrap:anywhere">Stored & valid for 2 years from issue</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div class="mt-4 flex items-center gap-3 min-w-0">
                                    <div class="border-2 border-ink p-1.5 bg-white shadow-[2px_2px_0_0_#000] shrink-0">
                                        <canvas id="verify-qr" width="84" height="84" class="block"></canvas>
                                    </div>
                                    <p class="font-mono text-[10px] uppercase leading-relaxed text-neutral-600 font-bold min-w-0 break-words">Scan to re-verify.<br/>This page is the source of truth for this credential.</p>
                                </div>

                                <div class="mt-6 pt-4 border-t-2 border-ink min-w-0" id="credential-section">
                                    <p class="font-mono text-[10px] uppercase tracking-widest font-bold text-ink mb-2">Shareable verification link</p>
                                    <div class="flex flex-col sm:flex-row sm:items-stretch gap-2 min-w-0">
                                        <code class="flex-1 min-w-0 max-w-full bg-white border-2 border-ink p-2 text-[11px] font-mono text-ink shadow-[2px_2px_0_0_#000] break-all" style="overflow-wrap:anywhere">
                                            ${escapeHtml(certificateLink)}
                                        </code>
                                        <button id="btn-copy" class="shrink-0 font-mono uppercase tracking-widest font-bold bg-ink text-cyan px-4 py-2 text-xs hover:bg-cyan hover:text-ink transition-colors">
                                            COPY
                                        </button>
                                    </div>
                                    ${isOwner ? '' : `<p class="font-mono text-[10px] uppercase text-neutral-500 font-bold mt-2">Public view — sign in as the holder to download.</p>`}
                                </div>
                            </div>
                        </div>
                    </div>
                    <p class="font-mono text-[10px] uppercase tracking-widest text-neutral-500 font-bold mt-4 text-center break-words">events.haxnation.org · api.haxnation.org/events</p>
                </div>
            </div>
            <div id="cert-print-area">
                ${certFileUrl && !certIsPdf ? `<img src="${escapeHtml(certFileUrl)}" alt="Certificate" style="width:100%;height:auto;" />` : ``}
            </div>`;

        const copyBtn = document.getElementById('btn-copy');
        if (copyBtn) {
            copyBtn.onclick = function () {
                const done = () => {
                    const orig = this.textContent;
                    this.textContent = 'COPIED';
                    setTimeout(() => { this.textContent = orig; }, 2000);
                };
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(certificateLink).then(done).catch(() => {
                        const ta = document.createElement('textarea');
                        ta.value = certificateLink;
                        document.body.appendChild(ta);
                        ta.select();
                        try { document.execCommand('copy'); } catch(e) {}
                        document.body.removeChild(ta);
                        done();
                    });
                } else done();
            };
        }

        // If the rendered image fails to load, show the neutral missing state
        // (never a fake placeholder certificate).
        const certImg = document.getElementById('cert-visual-img');
        if (certImg) {
            certImg.onerror = () => {
                document.querySelector('[data-cert-visual]')?.classList.add('hidden');
                document.getElementById('cert-visual-missing')?.classList.remove('hidden');
            };
        }

        ensureCertPrintStyles();

        const printBtn = document.getElementById('btn-print');
        if (printBtn) printBtn.onclick = () => printCertImage(certFileUrl, holderName);

        try {
            const qrCanvas = document.getElementById('verify-qr');
            if (qrCanvas && window.QRCode && window.QRCode.toCanvas) {
                window.QRCode.toCanvas(qrCanvas, certificateLink, { width: 84, margin: 1 }, (err) => { if (err) qrCanvas.style.display = 'none'; });
            } else if (qrCanvas) qrCanvas.style.display = 'none';
        } catch(e) { const q = document.getElementById('verify-qr'); if (q) q.style.display = 'none'; }

        const btnDownload = document.getElementById('btn-download');
        if (btnDownload) {
            if (!isOwner) btnDownload.style.display = 'none';
            else {
                // No re-request: download the SAME cached dataUrl rendered above
                // (exactly what the original working button saved).
                btnDownload.onclick = function () {
                    const status = document.getElementById('status-msg');
                    if (!certFileUrl) {
                        if (status) { status.textContent = '[ FAILURE: FILE NOT LOADED ]'; status.style.color = '#ff2a2a'; }
                        return;
                    }
                    const link = document.createElement('a');
                    link.href = certFileUrl;
                    link.download = downloadUrlFilename(certFileUrl, `certificate_${String(certIdResolved).slice(0, 12)}`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    if (status) { status.textContent = '[ SUCCESS: TRANSFER COMPLETE ]'; status.style.color = '#0b0b0b'; }
                    this.textContent = 'RE-DOWNLOAD';
                };
            }
        }

    } catch (e) {
        console.error(e);
        container.innerHTML = `
            <div class="min-h-screen bg-canvas flex items-center justify-center p-6">
                <div class="bg-white border-4 border-ink shadow-[12px_12px_0_0_#ff2a2a] p-8 max-w-md w-full text-center">
                    <h2 class="text-3xl font-black uppercase tracking-tight text-ink mb-2 border-b-4 border-ink pb-2">VERIFICATION FAILED</h2>
                    <p class="font-mono text-sm my-6 text-ink font-bold">[ ${escapeHtml(e.message).toUpperCase()} ]</p>
                    <p class="font-mono text-xs text-neutral-600 font-bold mb-6">Note: Certificates are valid and stored for 2 years from the date of issue.</p>
                    <a href="/#/" class="inline-block font-mono uppercase tracking-widest font-bold bg-white text-ink border-2 border-ink px-6 py-3 shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-75">
                        RETURN
                    </a>
                </div>
            </div>`;
    }
}