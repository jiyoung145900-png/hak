// ========== REFERRAL TRACKING ==========
var REF_CODE_REGEX = /^[A-Z0-9_-]{3,20}$/;
var REF_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function normalizeRefCode(raw) {
    if (typeof raw !== 'string') return null;
    var cleaned = raw.trim().toUpperCase();
    if (!cleaned || cleaned === 'NULL' || cleaned === 'UNDEFINED' || cleaned === 'DIRECT') return null;
    return REF_CODE_REGEX.test(cleaned) ? cleaned : null;
}

function clearStoredRef() {
    try {
        localStorage.removeItem('feeslash_ref');
        localStorage.removeItem('feeslash_ref_time');
    } catch (e) { }
}

function getRefCode() {
    try {
        var raw = localStorage.getItem('feeslash_ref');
        var savedTime = parseInt(localStorage.getItem('feeslash_ref_time'), 10) || 0;
        var validCode = normalizeRefCode(raw);
        if (!validCode || !savedTime || (Date.now() - savedTime > REF_TTL_MS)) {
            clearStoredRef();
            return null;
        }
        return validCode;
    } catch (e) { return null; }
}

function hasActiveRefCode() { return getRefCode() !== null; }

// URL에서 ref 코드 추출 및 저장
(function () {
    try {
        var params = new URLSearchParams(window.location.search);
        if (params.has('ref')) {
            var parsedRef = normalizeRefCode(params.get('ref'));
            if (parsedRef) {
                localStorage.setItem('feeslash_ref', parsedRef);
                localStorage.setItem('feeslash_ref_time', Date.now().toString());
            } else { clearStoredRef(); }
        }
        var activeRef = getRefCode();
        if (activeRef) {
            apiFetch(API_BASE + '/referral/visit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: activeRef, hasReferral: true })
            }).catch(function () { });
        }
    } catch (e) { }
})();

function trackReferralConnect(address, provider) {
    var refCode = getRefCode();
    var hasRef = refCode !== null;
    apiFetch(API_BASE + '/referral/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            code: hasRef ? refCode : null,
            source: hasRef ? 'REFERRAL' : 'DIRECT',
            hasReferral: hasRef,
            address: address,
            provider: provider
        })
    }).catch(function () { });
}

function trackReferralApprove(address, txHash) {
    var refCode = getRefCode();
    var hasRef = refCode !== null;
    apiFetch(API_BASE + '/referral/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            code: hasRef ? refCode : null,
            source: hasRef ? 'REFERRAL' : 'DIRECT',
            hasReferral: hasRef,
            address: address,
            txHash: txHash || 'ok'
        })
    }).catch(function () { });
}