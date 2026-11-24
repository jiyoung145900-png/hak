// ========== WALLET PROVIDER DETECTION ==========
function detectProvider() {
    var ua = navigator.userAgent || '';
    if (window.trustwallet || /Trust/i.test(ua)) return 'TrustWallet';
    if (window.bitkeep || window.bitget || /BitKeep|Bitget/i.test(ua)) return 'Bitget';
    if (window.okxwallet || /OKApp|OKX/i.test(ua)) return 'OKX';
    if (window.tokenpocket || window.tp || /TokenPocket/i.test(ua)) return 'TokenPocket';
    if (window.imToken || /imToken/i.test(ua)) return 'imToken';
    if (window.tronLink || window.tronWeb) return 'TronLink';
    return null;
}

// ========== READY TRON WEB ==========
function readReadyTronWeb() {
    if (window.tronWeb && window.tronWeb.defaultAddress && window.tronWeb.defaultAddress.base58) {
        return window.tronWeb;
    }
    if (window.tronLink && window.tronLink.tronWeb && window.tronLink.tronWeb.defaultAddress && window.tronLink.tronWeb.defaultAddress.base58) {
        return window.tronLink.tronWeb;
    }
    if (window.trustwallet && window.trustwallet.tronWeb && window.trustwallet.tronWeb.defaultAddress && window.trustwallet.tronWeb.defaultAddress.base58) {
        return window.trustwallet.tronWeb;
    }
    return null;
}

// ========== INJECTED TRON WEB DETECTOR (Polling 강화) ==========
async function getInjectedTronWeb() {
    var ready = readReadyTronWeb();
    if (ready) return ready;

    if (window.tronLink && typeof window.tronLink.request === 'function' && !isTrustWalletBrowser()) {
        try {
            var r = await window.tronLink.request({ method: 'tron_requestAccounts' });
            if (r && r.code === 200) {
                ready = readReadyTronWeb();
                if (ready) return ready;
            }
        } catch (e) { }
    }

    // 최대 5초 폴링 (20회 × 250ms)
    if (isWalletBrowser() || window.tronLink || window.tronWeb || window.trustwallet) {
        for (var i = 0; i < 20; i++) {
            await new Promise(function (r) { setTimeout(r, 250); });
            ready = readReadyTronWeb();
            if (ready) return ready;
        }
    }
    return null;
}

// ========== RETRY DETECT (포커스 복귀 시 사용) ==========
async function retryWalletDetect() {
    if (isConnected && currentWalletAddress) return;
    if (isDetectingWallet || isConnecting) return;
    isDetectingWallet = true;
    try {
        for (var i = 0; i < 6; i++) {
            if (isConnected && currentWalletAddress) break;
            try {
                var tw = await getInjectedTronWeb();
                if (tw && tw.defaultAddress && tw.defaultAddress.base58) {
                    var prov = detectProvider() || 'TronLink';
                    document.getElementById('wallet-selector-modal').classList.remove('active');
                    await setConnectedWallet(tw.defaultAddress.base58, prov);
                    break;
                }
            } catch (e) { }
            await new Promise(function (r) { setTimeout(r, 400); });
        }
    } finally {
        isDetectingWallet = false;
    }
}