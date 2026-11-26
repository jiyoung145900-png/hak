// ========== WALLET PROVIDER DETECTION ==========
// 수정: TronLink 확장이 설치된 환경에서도 실제 injected tronWeb을
//       제공하는 지갑을 올바르게 식별하도록 우선순위 정비.
//       - 각 지갑 UA + global object 둘 다 확인
//       - tronLink/tronWeb 폴백은 맨 뒤
function detectProvider() {
    var ua = navigator.userAgent || '';

    // 1. 지갑 앱의 in-app 브라우저 UA 가 가장 강한 신호 (우선 확인)
    if (/Trust/i.test(ua) && window.trustwallet) return 'TrustWallet';
    if (/TokenPocket/i.test(ua) && (window.tokenpocket || window.tp)) return 'TokenPocket';
    if (/BitKeep|Bitget/i.test(ua) && (window.bitkeep || window.bitget)) return 'Bitget';
    if (/OKApp|OKX/i.test(ua) && window.okxwallet) return 'OKX';
    if (/imToken/i.test(ua) && window.imToken) return 'imToken';

    // 2. UA 는 없지만 특정 지갑 전용 전역 객체가 있는 경우
    if (window.trustwallet) return 'TrustWallet';
    if (window.tokenpocket || window.tp) return 'TokenPocket';
    if (window.bitkeep || window.bitget) return 'Bitget';
    if (window.okxwallet) return 'OKX';
    if (window.imToken) return 'imToken';

    // 3. 최종 폴백: TronLink 확장/주입
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