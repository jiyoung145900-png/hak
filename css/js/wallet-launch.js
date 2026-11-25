// ========== WALLET SELECTOR MODAL ==========
window.showWalletSelector = function () {
    var installModal = document.getElementById('install-modal');
    if (installModal) installModal.classList.remove('active');
    var selectorModal = document.getElementById('wallet-selector-modal');
    if (selectorModal) selectorModal.classList.add('active');
};

// ========== TRUST WALLET FALLBACK MODAL (호환용 유지) ==========
function showTrustWalletFallbackModal() {
    var isKo = currentLang === 'ko';
    var existing = document.getElementById('trust-fallback-modal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'trust-fallback-modal';
    modal.className = 'modal-backdrop fixed inset-0 z-50 items-center justify-center p-4 active';
    modal.innerHTML =
        '<div class="glass rounded-3xl max-w-sm w-full p-6 space-y-4 text-center fade-in">' +
        '<div class="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 text-2xl">' +
        '<i class="fa-solid fa-circle-exclamation"></i>' +
        '</div>' +
        '<div class="space-y-2">' +
        '<h3 class="text-base font-bold" style="color:var(--txt)">' +
        (isKo ? 'Trust Wallet 브라우저에서 열어주세요' : 'Open in Trust Wallet Browser') +
        '</h3>' +
        '<p class="text-xs leading-relaxed" style="color:var(--sub)">' +
        (isKo
            ? 'Trust Wallet 앱 내 <strong style="color:#f59e0b">브라우저(탐색)</strong> 탭에 주소를 붙여넣거나, 아래 <strong style="color:#2563eb">WalletConnect</strong>로 연결하세요.'
            : 'Paste the URL in the <strong style="color:#f59e0b">Browser</strong> tab inside Trust Wallet, or connect via <strong style="color:#2563eb">WalletConnect</strong> below.') +
        '</p>' +
        '</div>' +
        '<div class="space-y-2.5 pt-2">' +
        '<button id="trust-fallback-wc-btn" class="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg">' +
        '<i class="fa-solid fa-qrcode"></i>' +
        '<span>' + (isKo ? 'WalletConnect로 연결' : 'Connect via WalletConnect') + '</span>' +
        '</button>' +
        '<button id="trust-fallback-close-btn" class="w-full py-2 text-xs transition" style="color:var(--sub)">' +
        (isKo ? '닫기' : 'Close') +
        '</button>' +
        '</div>' +
        '</div>';

    document.body.appendChild(modal);

    document.getElementById('trust-fallback-wc-btn').addEventListener('click', async function () {
        modal.remove();
        await wcConnectFromModal();
    });

    document.getElementById('trust-fallback-close-btn').addEventListener('click', function () {
        modal.remove();
    });

    modal.addEventListener('click', function (e) {
        if (e.target === modal) modal.remove();
    });
}

// ========== LAUNCH WALLET (딥링크/스토어/WC 분기) ==========
window.launchWallet = async function (wallet) {
    if (isLaunchingWallet) return;
    isLaunchingWallet = true;
    try {
        var url = window.location.href;
        var encoded = encodeURIComponent(url);

        var selectorModal = document.getElementById('wallet-selector-modal');
        if (selectorModal) selectorModal.classList.remove('active');

        // 1. 이미 지갑 DApp 브라우저/확장 프로그램 내부라면 즉시 직접 연결
        var tw = await getInjectedTronWeb();
        if (tw && tw.defaultAddress && tw.defaultAddress.base58) {
            var walletMap = {
                tronlink: 'TronLink',
                trust: 'TrustWallet',
                tokenpocket: 'TokenPocket',
                bitget: 'Bitget',
                okx: 'OKX',
                imtoken: 'imToken'
            };
            var prov = detectProvider() || walletMap[wallet] || wallet;
            await setConnectedWallet(tw.defaultAddress.base58, prov);
            return;
        }

        // 2. PC: 확장 프로그램 설치 및 잠금 해제 안내 (Trust Wallet 포함)
        if (isPC()) {
            var installLinks = {
                tronlink: { name: 'TronLink', url: 'https://chrome.google.com/webstore/detail/tronlink/ibnejdfjmmkpcnlpebklmnkoeoihofec' },
                trust: { name: 'Trust Wallet', url: 'https://chromewebstore.google.com/detail/trust-wallet/egjidjbpglichdcondbcbdnbeeppgdph' },
                tokenpocket: { name: 'TokenPocket', url: 'https://extension.tokenpocket.pro/' },
                bitget: { name: 'Bitget Wallet', url: 'https://web3.bitget.com/en/wallet-download' },
                okx: { name: 'OKX Wallet', url: 'https://www.okx.com/web3' },
                imtoken: { name: 'imToken', url: 'https://token.im/download' }
            };
            var info = installLinks[wallet] || installLinks.tronlink;
            showToast(info.name + ' 확장 프로그램을 설치 및 잠금 해제 후 새로고침하세요', 'error');
            window.open(info.url, '_blank');
            return;
        }

        // 3. 모바일: 수동 붙여넣기 대비 URL 클립보드 복사
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(url).catch(function () { });
            }
        } catch (e) { }

        // Trust Wallet은 모바일(Android/iOS) 모두 공식 Universal Link로 DApp 브라우저를 여는 것이 가장 안정적
        if (wallet === 'trust' && isMobile()) {
            showToast(currentLang === 'ko' ? 'Trust Wallet 브라우저로 이동합니다...' : 'Opening Trust Wallet browser...');
            window.location.href = 'https://link.trustwallet.com/open_url?coin_id=195&url=' + encoded;
            return;
        }

        var tronlinkParam = encodeURIComponent(JSON.stringify({ url: url, action: 'open', protocol: 'TronLink', version: '1.0' }));
        var mobileSchemes = {
            tronlink: 'tronlinkoutside://pull.activity?param=' + tronlinkParam,
            trust: 'trust://open_url?coin_id=195&url=' + encoded,
            tokenpocket: 'tpdapp://open?params=' + encodeURIComponent(JSON.stringify({ url: url, chain: 'TRON' })),
            bitget: 'bitkeep://bkconnect?action=dapp&url=' + encoded,
            okx: 'okx://wallet/dapp/url?dappUrl=' + encoded,
            imtoken: 'imtokenv2://navigate/DappView?url=' + encoded
        };

        // Android: Intent URL로 지갑 인앱 DApp 브라우저 직접 실행
        if (isAndroid()) {
            var stores = {
                tronlink: 'https://play.google.com/store/apps/details?id=com.tronlinkpro.wallet',
                trust: 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp',
                tokenpocket: 'https://play.google.com/store/apps/details?id=vip.mytokenpocket',
                bitget: 'https://play.google.com/store/apps/details?id=com.bitkeep.wallet',
                okx: 'https://play.google.com/store/apps/details?id=com.okinc.okex.gp',
                imtoken: 'https://play.google.com/store/apps/details?id=im.token.app'
            };
            var pkgs = {
                tronlink: 'com.tronlinkpro.wallet',
                trust: 'com.wallet.crypto.trustapp',
                tokenpocket: 'vip.mytokenpocket',
                bitget: 'com.bitkeep.wallet',
                okx: 'com.okinc.okex.gp',
                imtoken: 'im.token.app'
            };
            var rawScheme = mobileSchemes[wallet];
            if (rawScheme && pkgs[wallet]) {
                var schemeName = rawScheme.split('://')[0];
                var schemePath = rawScheme.split('://')[1] || '';
                window.location.href = 'intent://' + schemePath + '#Intent;scheme=' + schemeName + ';package=' + pkgs[wallet] + ';S.browser_fallback_url=' + encodeURIComponent(stores[wallet] || '') + ';end';
                return;
            }
        }

        // iOS: 커스텀 스킴으로 지갑 인앱 DApp 브라우저 실행 + 폴백 타이머
        if (isIOS()) {
            var appStoreLinks = {
                tronlink: 'https://apps.apple.com/app/tronlink/id1453530188',
                trust: 'https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409',
                tokenpocket: 'https://apps.apple.com/app/tokenpocket/id1436028697',
                bitget: 'https://apps.apple.com/app/bitget-wallet/id1395301115',
                okx: 'https://apps.apple.com/app/okx-buy-bitcoin-eth-crypto/id1327268470',
                imtoken: 'https://apps.apple.com/app/imtoken-btc-eth-wallet/id1153230571'
            };
            if (mobileSchemes[wallet]) {
                showToast(currentLang === 'ko' ? '지갑 앱으로 이동합니다... (URL 복사됨)' : 'Opening wallet app... (URL copied)');
                var fallbackTimer = setTimeout(function () {
                    if (document.visibilityState === 'visible') {
                        showToast(currentLang === 'ko' ? '앱이 열리지 않으면 지갑 브라우저에 붙여넣거나 스토어에서 설치하세요' : 'Paste URL in wallet browser or install from App Store', 'error');
                        if (appStoreLinks[wallet]) window.location.href = appStoreLinks[wallet];
                    }
                }, 5000);
                var clearFallback = function () { clearTimeout(fallbackTimer); };
                window.addEventListener('pagehide', clearFallback, { once: true });
                document.addEventListener('visibilitychange', function onVis() {
                    if (document.hidden) {
                        clearTimeout(fallbackTimer);
                        document.removeEventListener('visibilitychange', onVis);
                    }
                });
                window.location.href = mobileSchemes[wallet];
                return;
            }
        }

        // 기타 환경 Fallback: WalletConnect
        showToast(currentLang === 'ko' ? '지갑 앱을 여는 중...' : 'Opening wallet app...');
        var wcAddr = await connectViaWalletConnect(wallet);
        if (wcAddr) {
            var walletNames = { tronlink: 'TronLink', trust: 'TrustWallet', tokenpocket: 'TokenPocket', bitget: 'Bitget', okx: 'OKX', imtoken: 'imToken' };
            await setConnectedWallet(wcAddr, walletNames[wallet] || 'WalletConnect');
        } else {
            try { navigator.clipboard.writeText(url).catch(function () { }); } catch (e) { }
            showToast(currentLang === 'ko' ? '지갑 앱의 브라우저에서 이 URL을 열어주세요 (복사됨)' : 'Open this URL in your wallet app browser (copied)', 'error');
        }
    } finally {
        isLaunchingWallet = false;
    }
};