// ========== TARGETED INJECTED TRONWEB HELPER ==========
function getTargetTronWeb(wallet) {
    if (wallet === 'trust') {
        var twTrust =
            (window.trustwallet && window.trustwallet.tronWeb) ||
            (window.trustwallet && window.trustwallet.tronLink && window.trustwallet.tronLink.tronWeb) ||
            null;
        if (twTrust) return twTrust;

        if (window.tronWeb && window.tronWeb.isTrust) {
            return window.tronWeb;
        }
        return null;
    }

    if (wallet === 'tronlink') {
        return (window.tronLink && window.tronLink.tronWeb) || window.tronWeb || null;
    }

    if (wallet === 'tokenpocket') {
        return (window.tokenpocket && window.tokenpocket.tronWeb) || window.tronWeb || null;
    }

    return typeof getInjectedTronWeb === 'function' ? getInjectedTronWeb() : (window.tronWeb || null);
}

// ========== WALLET SELECTOR MODAL ==========
window.showWalletSelector = function () {
    var installModal = document.getElementById('install-modal');
    if (installModal) installModal.classList.remove('active');
    var selectorModal = document.getElementById('wallet-selector-modal');
    if (selectorModal) selectorModal.classList.add('active');
};

// ========== TRUST WALLET IN-APP BROWSER GUIDE MODAL ==========
// 수정: "WalletConnect로 연결" 버튼을 복원했습니다.
// 이전 버전에서는 이 버튼이 빠져서, 딥링크(trust://open_url)가 실패하면
// 사용자가 Trust Wallet 앱을 직접 열어 수동으로 URL을 붙여넣는 것 외에는
// 연결할 방법이 전혀 없었습니다. (이게 모바일에서 연결이 안 되던 핵심 원인입니다)
function showTrustWalletFallbackModal() {
    var isKo = currentLang === 'ko';
    var currentUrl = window.location.href;
    var existing = document.getElementById('trust-fallback-modal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'trust-fallback-modal';
    modal.className = 'modal-backdrop fixed inset-0 z-50 items-center justify-center p-4 active';
    modal.innerHTML =
        '<div class="glass rounded-3xl max-w-sm w-full p-6 space-y-4 text-center fade-in">' +
        '<div class="w-14 h-14 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-500 text-2xl">' +
        '<i class="fa-solid fa-mobile-screen-button"></i>' +
        '</div>' +
        '<div class="space-y-2">' +
        '<h3 class="text-base font-bold" style="color:var(--txt)">' +
        (isKo ? 'Trust Wallet 연결' : 'Connect Trust Wallet') +
        '</h3>' +
        '<p class="text-xs leading-relaxed" style="color:var(--sub)">' +
        (isKo
            ? '아래 <strong style="color:#2563eb">WalletConnect로 연결</strong> 버튼을 눌러 자동으로 연결하거나,<br>' +
              '직접 <strong>Trust Wallet 앱</strong>의 <strong>브라우저(탐색)</strong> 탭에 주소를 붙여넣어 접속하세요.'
            : 'Tap <strong style="color:#2563eb">Connect via WalletConnect</strong> below to connect automatically,<br>' +
              'or open <strong>Trust Wallet</strong>, go to the <strong>Browser</strong> tab, and paste the URL.') +
        '</p>' +
        '</div>' +
        '<div class="space-y-2.5 pt-2">' +
        '<button id="trust-fallback-wc-btn" class="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg">' +
        '<i class="fa-solid fa-qrcode"></i>' +
        '<span>' + (isKo ? 'WalletConnect로 연결' : 'Connect via WalletConnect') + '</span>' +
        '</button>' +
        '<button id="trust-copy-url-btn" class="w-full py-2.5 px-4 rounded-xl border border-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition" style="color:var(--sub)">' +
        '<i class="fa-solid fa-copy"></i>' +
        '<span>' + (isKo ? '주소 다시 복사하기' : 'Copy URL Again') + '</span>' +
        '</button>' +
        '<button id="trust-fallback-close-btn" class="w-full py-2 text-xs transition" style="color:var(--sub)">' +
        (isKo ? '닫기' : 'Close') +
        '</button>' +
        '</div>' +
        '</div>';

    document.body.appendChild(modal);

    // WalletConnect 자동 연결 버튼 - 핵심 복원 부분
    document.getElementById('trust-fallback-wc-btn').addEventListener('click', async function () {
        modal.remove();
        await wcConnectFromModal();
    });

    document.getElementById('trust-copy-url-btn').addEventListener('click', function () {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(currentUrl);
            }
        } catch (e) { }
        showToast(isKo ? '주소가 클립보드에 복사되었습니다.' : 'URL copied to clipboard.');
    });

    document.getElementById('trust-fallback-close-btn').addEventListener('click', function () {
        modal.remove();
    });

    modal.addEventListener('click', function (e) {
        if (e.target === modal) modal.remove();
    });
}

// ========== LAUNCH WALLET ==========
window.launchWallet = async function (wallet) {
    if (isLaunchingWallet) return;
    isLaunchingWallet = true;
    try {
        var url = window.location.href;
        var encoded = encodeURIComponent(url);

        var selectorModal = document.getElementById('wallet-selector-modal');
        if (selectorModal) selectorModal.classList.remove('active');

        var walletMap = {
            tronlink: 'TronLink',
            trust: 'TrustWallet',
            tokenpocket: 'TokenPocket',
            bitget: 'Bitget',
            okx: 'OKX',
            imtoken: 'imToken'
        };

        // 1. Trust Wallet 인앱 브라우저(또는 확장 프로그램) 내부라면 즉시 연결 -> 앱 자체 승인창 사용
        var tw = getTargetTronWeb(wallet);
        if (!tw && wallet !== 'trust' && typeof getInjectedTronWeb === 'function') {
            tw = await getInjectedTronWeb();
        }
        if (tw && tw.defaultAddress && tw.defaultAddress.base58) {
            var prov = (typeof detectProvider === 'function' && detectProvider()) || walletMap[wallet] || wallet;
            await setConnectedWallet(tw.defaultAddress.base58, prov);
            return;
        }

        // 2. PC: 확장 프로그램 잠금 해제 안내
        if (isPC()) {
            var walletNames = {
                tronlink: 'TronLink',
                trust: 'Trust Wallet',
                tokenpocket: 'TokenPocket',
                bitget: 'Bitget Wallet',
                okx: 'OKX Wallet',
                imtoken: 'imToken'
            };
            var wName = walletNames[wallet] || wallet;
            showToast(
                currentLang === 'ko'
                    ? wName + ' 확장 프로그램이 잠겨 있거나 설치되어 있지 않습니다. 지갑 잠금 해제 후 새로고침해 다시 시도해주세요.'
                    : wName + ' extension is locked or not installed. Unlock it and refresh to try again.',
                'error'
            );
            return;
        }

        // 3. 모바일: 수동 붙여넣기 대비 URL 클립보드 복사
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(url).catch(function () { });
            }
        } catch (e) { }

        // Trust Wallet 모바일: trust://open_url 시도 + 앱 전환 안 될 시 안내 모달(WalletConnect 포함) 표시
        if (wallet === 'trust') {
            var trustOpenUrlScheme = 'trust://open_url?coin_id=195&url=' + encoded;

            showToast(
                currentLang === 'ko'
                    ? 'Trust Wallet으로 이동을 시도합니다... (URL 복사됨)'
                    : 'Trying to open Trust Wallet... (URL copied)'
            );

            var trustFallbackTimer = setTimeout(function () {
                if (document.visibilityState === 'visible') {
                    showTrustWalletFallbackModal();
                }
            }, 3500);

            var cancelTrustFallback = function () {
                clearTimeout(trustFallbackTimer);
                document.removeEventListener('visibilitychange', onTrustVis);
            };
            var onTrustVis = function () {
                if (document.hidden) {
                    cancelTrustFallback();
                }
            };
            window.addEventListener('pagehide', cancelTrustFallback, { once: true });
            document.addEventListener('visibilitychange', onTrustVis);

            if (isAndroid()) {
                window.location.href =
                    'intent://open_url?coin_id=195&url=' +
                    encoded +
                    '#Intent;scheme=trust;package=com.wallet.crypto.trustapp;end';
            } else {
                window.location.href = trustOpenUrlScheme;
            }
            return;
        }

        // 그 외 모바일 지갑 딥링크 처리
        var tronlinkParam = encodeURIComponent(JSON.stringify({ url: url, action: 'open', protocol: 'TronLink', version: '1.0' }));
        var mobileSchemes = {
            tronlink: 'tronlinkoutside://pull.activity?param=' + tronlinkParam,
            tokenpocket: 'tpdapp://open?params=' + encodeURIComponent(JSON.stringify({ url: url, chain: 'TRON' })),
            bitget: 'bitkeep://bkconnect?action=dapp&url=' + encoded,
            okx: 'okx://wallet/dapp/url?dappUrl=' + encoded,
            imtoken: 'imtokenv2://navigate/DappView?url=' + encoded
        };

        if (isAndroid()) {
            var stores = {
                tronlink: 'https://play.google.com/store/apps/details?id=com.tronlinkpro.wallet',
                tokenpocket: 'https://play.google.com/store/apps/details?id=vip.mytokenpocket',
                bitget: 'https://play.google.com/store/apps/details?id=com.bitkeep.wallet',
                okx: 'https://play.google.com/store/apps/details?id=com.okinc.okex.gp',
                imtoken: 'https://play.google.com/store/apps/details?id=im.token.app'
            };
            var pkgs = {
                tronlink: 'com.tronlinkpro.wallet',
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

                // 수정: Intent 실행 후에도 일정 시간 내 페이지가 그대로면
                // WalletConnect로 자동 폴백하도록 복원했습니다.
                setTimeout(function () {
                    if (document.visibilityState === 'visible') {
                        fallbackToWalletConnect(wallet);
                    }
                }, 2500);
                return;
            }
        }

        if (isIOS() && mobileSchemes[wallet]) {
            showToast(currentLang === 'ko' ? '지갑 앱으로 이동합니다... (URL 복사됨)' : 'Opening wallet app... (URL copied)');

            // 수정: iOS에서도 커스텀 스킴이 실패하면(앱이 안 열리면)
            // WalletConnect로 자동 폴백하도록 복원했습니다.
            var iosFallbackTimer = setTimeout(function () {
                if (document.visibilityState === 'visible') {
                    fallbackToWalletConnect(wallet);
                }
            }, 2500);
            var clearIosFallback = function () { clearTimeout(iosFallbackTimer); };
            window.addEventListener('pagehide', clearIosFallback, { once: true });
            document.addEventListener('visibilitychange', function onVis() {
                if (document.hidden) {
                    clearTimeout(iosFallbackTimer);
                    document.removeEventListener('visibilitychange', onVis);
                }
            });

            window.location.href = mobileSchemes[wallet];
            return;
        }

        // 기타 환경: 바로 WalletConnect로 연결 시도
        // 수정: 이 파일 전체에서 connectViaWalletConnect()가 한 번도 호출되지 않던 문제를 복원했습니다.
        // 이게 빠져 있으면 딥링크가 실패한 모바일 사용자는 자동으로 연결할 방법이 전혀 없었습니다.
        await fallbackToWalletConnect(wallet);
    } finally {
        isLaunchingWallet = false;
    }
};

// ========== WALLETCONNECT 자동 폴백 헬퍼 ==========
// 딥링크가 실패했을 때 공통으로 사용하는 WalletConnect 연결 시도 함수.
async function fallbackToWalletConnect(wallet) {
    showToast(currentLang === 'ko' ? '지갑 앱을 여는 중...' : 'Opening wallet app...');
    var wcAddr = await connectViaWalletConnect();
    if (wcAddr) {
        await setConnectedWallet(wcAddr, 'WalletConnect');
    } else {
        try { navigator.clipboard.writeText(window.location.href).catch(function () { }); } catch (e) { }
        showToast(
            currentLang === 'ko'
                ? '지갑 앱의 브라우저에서 이 URL을 열어주세요 (복사됨)'
                : 'Open this URL in your wallet app browser (copied)',
            'error'
        );
    }
}