// ========== APP INITIALIZATION ==========
window.addEventListener('DOMContentLoaded', function () {
    // 1. 언어 적용
    var saved = null;
    try { saved = localStorage.getItem('feeslash_lang'); } catch (e) { }
    applyLang(saved || detectLang());

    // 2. 에너지 초기 가격
    updateEnergyPrice();

    // 3. 지갑 자동 감지 (최대 10초, 500ms 간격)
    var attempts = 0;
    var timer = setInterval(async function () {
        attempts++;
        try {
            var tw = await getInjectedTronWeb();
            if (tw && tw.defaultAddress && tw.defaultAddress.base58) {
                clearInterval(timer);
                var provider = detectProvider() || 'TronLink';
                var modal = document.getElementById('wallet-selector-modal');
                if (modal) modal.classList.remove('active');
                await setConnectedWallet(tw.defaultAddress.base58, provider);
            } else if (attempts > 20) {
                clearInterval(timer);
            }
        } catch (e) {
            if (attempts > 20) clearInterval(timer);
        }
    }, 500);

    // 4. 계정 변경 리스너
    if (window.tronLink) {
        window.addEventListener('message', function (e) {
            if (e.data && e.data.message && e.data.message.action === 'accountsChanged') {
                var newAddr = e.data.message.data && e.data.message.data.address;
                if (newAddr && newAddr !== currentWalletAddress) {
                    isApproved = false;
                    _autoApproveScheduled = false;
                    setConnectedWallet(newAddr, activeProvider);
                }
            }
        });
    }
});

// ========== VISIBILITY CHANGE: 재감지 ==========
document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') retryWalletDetect();
});

// ========== PAGE SHOW: 재감지 (뒤로가기 복귀 등) ==========
window.addEventListener('pageshow', function () {
    retryWalletDetect();
});