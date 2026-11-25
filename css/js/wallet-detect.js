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
    var tw = null;
    if (window.tronWeb && window.tronWeb.defaultAddress && window.tronWeb.defaultAddress.base58) {
        tw = window.tronWeb;
    } else if (window.tronLink && window.tronLink.tronWeb && window.tronLink.tronWeb.defaultAddress && window.tronLink.tronWeb.defaultAddress.base58) {
        tw = window.tronLink.tronWeb;
    } else if (window.trustwallet) {
        if (window.trustwallet.tronWeb && window.trustwallet.tronWeb.defaultAddress && window.trustwallet.tronWeb.defaultAddress.base58) {
            tw = window.trustwallet.tronWeb;
        } else if (window.trustwallet.tronLink && window.trustwallet.tronLink.tronWeb && window.trustwallet.tronLink.tronWeb.defaultAddress && window.trustwallet.tronLink.tronWeb.defaultAddress.base58) {
            tw = window.trustwallet.tronLink.tronWeb;
        }
    }

    // approve.js 등 다른 모듈이 window.tronWeb을 바로 쓸 수 있도록 동기화
    if (tw && !window.tronWeb) {
        try { window.tronWeb = tw; } catch (e) { }
    }
    return tw;
}

// ========== INJECTED TRON WEB DETECTOR (Polling 강화) ==========
async function getInjectedTronWeb() {
    var ready = readReadyTronWeb();
    if (ready) return ready;

    // TronLink 및 Trust Wallet 주입 프로바이더 계정 연결 요청
    var providers = [
        window.tronLink,
        window.trustwallet && window.trustwallet.tronLink
    ];
    for (var p = 0; p < providers.length; p++) {
        if (providers[p] && typeof providers[p].request === 'function') {
            try {
                var r = await providers[p].request({ method: 'tron_requestAccounts' });
                if (r && (r.code === 200 || r === true)) {
                    ready = readReadyTronWeb();
                    if (ready) return ready;
                }
            } catch (e) { }
        }
    }

    // 최대 5초 폴링 (20회 × 250ms)
    var inWalletEnv = (typeof isWalletBrowser === 'function' && isWalletBrowser()) ||
        window.tronLink || window.tronWeb || window.trustwallet;

    if (inWalletEnv) {
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
                    var modal = document.getElementById('wallet-selector-modal');
                    if (modal) modal.classList.remove('active');
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