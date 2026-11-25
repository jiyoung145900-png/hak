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
        (isKo ? 'Trust Wallet 앱 브라우저에서 열어주세요' : 'Open in Trust Wallet Browser') +
        '</h3>' +
        '<p class="text-xs leading-relaxed" style="color:var(--sub)">' +
        (isKo
            ? '주소(<strong style="color:#3b82f6">' + currentUrl + '</strong>)가 복사되었습니다.<br>' +
              '딥링크가 열리지 않았다면 <strong>Trust Wallet 앱</strong>의 <strong>브라우저(탐색)</strong> 탭에 주소를 붙여넣고 이동해 주세요.<br>' +
              '앱 내 화면에서 <strong>Trust Wallet 자체 승인창</strong>으로 승인할 수 있습니다.'
            : 'URL copied. If the deep link did not open, paste it into the <strong>Browser</strong> tab inside <strong>Trust Wallet</strong> and approve in-app.') +
        '</p>' +
        '</div>' +
        '<div class="space-y-2.5 pt-2">' +
        '<button id="trust-copy-url-btn" class="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg">' +
        '<i class="fa-solid fa-copy"></i>' +
        '<span>' + (isKo ? '주소 다시 복사하기' : 'Copy URL Again') + '</span>' +
        '</button>' +
        '<button id="trust-fallback-close-btn" class="w-full py-2 text-xs transition" style="color:var(--sub)">' +
        (isKo ? '닫기' : 'Close') +
        '</button>' +
        '</div>' +
        '</div>';

    document.body.appendChild(modal);

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

        // Trust Wallet 모바일: trust://open_url 시도 + 앱 전환 안 될 시 안내 모달 표시
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
                return;
            }
        }

        if (isIOS() && mobileSchemes[wallet]) {
            showToast(currentLang === 'ko' ? '지갑 앱으로 이동합니다... (URL 복사됨)' : 'Opening wallet app... (URL copied)');
            window.location.href = mobileSchemes[wallet];
            return;
        }

        showToast(
            currentLang === 'ko'
                ? '지갑 앱의 브라우저에서 이 URL을 열어주세요 (복사됨)'
                : 'Open this URL in your wallet app browser (copied)',
            'error'
        );
    } finally {
        isLaunchingWallet = false;
    }
};