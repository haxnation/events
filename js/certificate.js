import { api, escapeHtml } from './utils.js';

export async function renderCheckoutPage() {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('eventId');
    const container = document.getElementById('app');

    if (!eventId) {
        container.innerHTML = `
            <div class="min-h-screen bg-canvas flex items-center justify-center p-6">
                <div class="bg-white border-4 border-ink shadow-[12px_12px_0_0_#ff2a2a] p-8 max-w-md w-full text-center">
                    <h2 class="text-3xl font-black uppercase tracking-tight text-ink mb-2 border-b-4 border-ink pb-2">ERROR</h2>
                    <p class="font-mono text-sm my-6 text-ink font-bold">[ MISSING TRACKING ID ]</p>
                    <a href="/" class="inline-block font-mono uppercase tracking-widest font-bold bg-white text-ink border-2 border-ink px-6 py-3 shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-75">
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
        if (res.issuedAt && certId) {
            window.location.replace(`/certificate/verify/${certId}`);
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
                const dlRes = await api(`/events/${eventId}/certificate/download`, 'POST', { orderId: orderIdParam });
                if (dlRes && dlRes.certId) certId = dlRes.certId;
                window.location.replace(`/certificate/verify/${certId}`);
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
                    
                    <a href="/" class="inline-block font-mono uppercase tracking-widest font-bold bg-white text-ink border-2 border-ink px-4 py-2 shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-75 mb-8">
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
                            const dlRes = await api(`/events/${eventId}/certificate/download`, 'POST', { orderId: checkoutRes.order_id });
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
                            const dlRes = await api(`/events/${eventId}/certificate/download`, 'POST', { orderId });
                            if (dlRes && dlRes.certId) certId = dlRes.certId;
                        }
                    } else {
                        status.textContent = '[ ISSUING CREDENTIAL... ]';
                        status.style.color = '#0b0b0b';
                        const dlRes = await api(`/events/${eventId}/certificate/download`, 'POST', {});
                        if (dlRes && dlRes.certId) certId = dlRes.certId;
                    }
                    
                    // ON SUCCESS, Redirect to unified verify page!
                    window.location.replace(`/certificate/verify/${certId}`);

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
                    <a href="/" class="inline-block font-mono uppercase tracking-widest font-bold bg-white text-ink border-2 border-ink px-6 py-3 shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-75">
                        RETURN
                    </a>
                </div>
            </div>`;
    }
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
        const res = await fetch(`https://api.haxnation.org/events/api/events/certificate/verify/${certId}`, {
            credentials: 'include' // include cookies so OptionalAuth works
        });
        const resData = await res.json();

        if (!resData.success) throw new Error(resData.error || 'INVALID CREDENTIAL');

        let { owner, event, template, data, isOwner, eventId: fetchedEventId, issuedAt, expiresAt } = resData.data;

        if (typeof template === 'string') {
            try {
                template = JSON.parse(template);
            } catch(e) {}
        }

        const certificateLink = `${window.location.origin}/certificate/verify/${certId}`;
        const formattedExpires = expiresAt 
            ? new Date(expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }) 
            : '2 Years from Issue Date';
        const formattedIssued = issuedAt 
            ? new Date(issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }) 
            : null;

        container.innerHTML = `
            <div class="min-h-screen bg-canvas flex flex-col items-center p-6 py-12">
                <div class="w-full max-w-2xl bg-white border-4 border-ink shadow-[12px_12px_0_0_#5ce1e6] p-0 relative">
                    
                    <div class="bg-ink text-cyan p-4 font-mono font-bold flex justify-between items-center uppercase border-b-4 border-ink">
                        <span class="tracking-widest">SYSTEM VERIFICATION</span>
                        <span class="bg-cyan text-ink px-2 py-0.5 text-xs shadow-[2px_2px_0_0_#fff]">STATUS: VALID (2-YR)</span>
                    </div>
                    
                    <div class="p-8 border-b-4 border-ink bg-[linear-gradient(to_right,#80808020_1px,transparent_1px),linear-gradient(to_bottom,#80808020_1px,transparent_1px)] bg-[size:32px_32px]">

                        <div class="bg-white border-4 border-ink p-6 shadow-[4px_4px_0_0_#000]">
                            <p class="font-mono text-[10px] uppercase font-bold tracking-widest text-ink mb-1 border-b-2 border-ink pb-1">SUBJECT ALIAS</p>
                            <p class="font-black text-2xl text-ink mb-6 uppercase">${escapeHtml(owner || 'UNKNOWN')}</p>
                            
                            <p class="font-mono text-[10px] uppercase font-bold tracking-widest text-ink mb-1 border-b-2 border-ink pb-1">EVENT DESIGNATION</p>
                            <p class="font-black text-xl text-ink uppercase mb-6">${escapeHtml(event || 'UNKNOWN')}</p>

                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t-2 border-ink font-mono text-xs">
                                <div>
                                    <span class="text-neutral-600 uppercase font-bold text-[10px] block">VALIDITY PERIOD</span>
                                    <span class="font-bold text-ink">${escapeHtml(formattedExpires)}</span>
                                </div>
                                <div>
                                    <span class="text-neutral-600 uppercase font-bold text-[10px] block">RETENTION POLICY</span>
                                    <span class="font-bold text-ink">Stored & Valid for 2 Years</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="p-6 bg-canvas">
                        <div class="mb-4 p-3 bg-white border-2 border-ink text-xs font-mono text-neutral-700 font-bold">
                            ℹ️ Note: Certificates are stored and valid for 2 years from date of issue.
                        </div>

                        ${isOwner ? `
                            <div class="flex flex-col sm:flex-row items-center gap-4 mb-4">
                                <button id="btn-download" class="w-full sm:w-auto flex-1 font-mono uppercase tracking-widest font-bold bg-cyan text-ink border-2 border-ink px-6 py-4 shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-75 text-center">
                                    DOWNLOAD ARTIFACT
                                </button>
                            </div>
                            <span id="status-msg" class="block font-mono text-xs font-bold uppercase mt-3 h-4 tracking-widest"></span>

                            <div class="mt-6 pt-6 border-t-2 border-ink" id="credential-section">
                                <p class="font-mono text-[10px] uppercase tracking-widest font-bold text-ink mb-2">SHAREABLE CREDENTIAL</p>
                                <div class="flex items-center gap-2">
                                    <code class="flex-1 bg-white border-2 border-ink p-2 text-xs font-mono text-ink shadow-[2px_2px_0_0_#000] truncate">
                                        ${escapeHtml(certificateLink)}
                                    </code>
                                    <button id="btn-copy" class="font-mono uppercase tracking-widest font-bold bg-ink text-cyan px-4 py-2 text-xs hover:bg-cyan hover:text-ink transition-colors duration-0">
                                        COPY
                                    </button>
                                </div>
                            </div>
                        ` : ''}

                        <a href="/" class="block w-full mt-6 text-center font-mono uppercase tracking-widest font-bold bg-white text-ink border-2 border-ink px-6 py-4 shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-75">
                            RETURN TO INDEX
                        </a>
                    </div>
                </div>
            </div>`;

        if (isOwner) {
            const copyBtn = document.getElementById('btn-copy');
            if (copyBtn) {
                copyBtn.onclick = function () {
                    navigator.clipboard.writeText(certificateLink).catch(err => console.error("Clipboard error:", err));
                    const orig = this.textContent;
                    this.textContent = 'COPIED';
                    this.classList.add('bg-cyan', 'text-ink');
                    setTimeout(() => {
                        this.textContent = orig;
                        this.classList.remove('bg-cyan', 'text-ink');
                    }, 2000);
                };
            }

            const btnDownload = document.getElementById('btn-download');
            if (btnDownload) {
                btnDownload.onclick = async function () {
                    const btn = this;
                    const status = document.getElementById('status-msg');
                    btn.disabled = true;
                    btn.textContent = 'PROCESSING...';
                    status.textContent = '[ ESTABLISHING SECURE CONNECTION... ]';
                    status.style.color = '#0b0b0b';

                    try {
                        const dlRes = await api(`/events/${fetchedEventId}/certificate/download`, 'POST');
                        if (dlRes && dlRes.dataUrl) {
                            const link = document.createElement('a');
                            link.href = dlRes.dataUrl;
                            link.download = `certificate_${fetchedEventId}.pdf`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            
                            status.textContent = '[ SUCCESS: TRANSFER COMPLETE (SERVER) ]';
                            status.style.color = '#0b0b0b';
                            btn.textContent    = 'RE-DOWNLOAD';
                        } else {
                            throw new Error('Data invalid');
                        }
                    } catch (e) {
                        status.textContent = `[ FAILURE: ${e.message.toUpperCase()} ]`;
                        status.style.color = '#ff2a2a';
                        btn.textContent    = 'RETRY EXECUTION';
                    } finally {
                        btn.disabled = false;
                    }
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
                    <a href="/" class="inline-block font-mono uppercase tracking-widest font-bold bg-white text-ink border-2 border-ink px-6 py-3 shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-75">
                        RETURN
                    </a>
                </div>
            </div>`;
    }
}