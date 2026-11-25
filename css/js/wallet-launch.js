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

// ========== CLIPBOARD HELPER ==========
async function copyCurrentUrlToClipboard(url) {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(url);
            return true;
        }
    } catch (e) { }

    try {
        var tempInput = document.createElement('input');
        tempInput.value = url;
        tempInput.setAttribute('readonly', '');
        tempInput.style.position = 'fixed';
        tempInput.style.opacity = '0';
        document.body.appendChild(tempInput);
        tempInput.select();
        tempInput.setSelectionRange(0, url.length);
        var ok = document.execCommand('copy');
        document.body.removeChild(tempInput);
        return !!ok;
    } catch (e) {
        return false;
    }
}

// ========== 최후의 수단: 수동 붙여넣기 안내 모달 ==========
// 딥링크도 실패하고 WalletConnect도 실패했을 때만 이 모달을 띄웁니다.
function showManualPasteModal(walletLabel, copied) {
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
        (isKo ? (walletLabel || 'Trust Wallet') + ' 앱 브라우저에서 열어주세요' : 'Open in ' + (walletLabel || 'Trust Wallet') + ' Browser') +
        '</h3>' +
        '<p class="text-xs leading-relaxed" style="color:var(--sub)">' +
        (isKo
            ? (copied ? '주소가 클립보드에 자동 복사되었습니다.<br>' : '아래 버튼으로 주소를 복사해 주세요.<br>') +
              '1. <strong>' + (walletLabel || 'Trust Wallet') + ' 앱</strong>을 여세요.<br>' +
              '2. 앱 내 <strong>브라우저(탐색)</strong> 탭을 여세요.<br>' +
              '3. 검색창(주소창)을 길게 눌러 <strong>붙여넣기</strong> 후 이동하세요.'
            : (copied ? 'URL copied to clipboard.<br>' : 'Tap copy below to copy the URL.<br>') +
              '1. Open <strong>' + (walletLabel || 'Trust Wallet') + '</strong>.<br>' +
              '2. Go to the <strong>Browser</strong> tab.<br>' +
              '3. Long-press the address bar, <strong>Paste</strong>, and go.') +
        '</p>' +
        '<div class="p-2.5 rounded-xl text-[11px] break-all select-all" style="background:rgba(148,163,184,0.12);color:var(--txt)">' +
        currentUrl +
        '</div>' +
        '</div>' +
        '<div class="space-y-2.5 pt-2">' +
        '<button id="trust-copy-url-btn" class="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg">' +
        '<i class="fa-solid fa-copy"></i>' +
        '<span>' + (isKo ? '주소 복사하기' : 'Copy URL') + '</span>' +
        '</button>' +
        '<button id="trust-fallback-close-btn" class="w-full py-2 text-xs transition" style="color:var(--sub)">' +
        (isKo ? '닫기' : 'Close') +
        '</button>' +
        '</div>' +
        '</div>';

    document.body.appendChild(modal);

    document.getElementById('trust-copy-url-btn').addEventListener('click', async function () {
        var ok = await copyCurrentUrlToClipboard(currentUrl);
        showToast(
            ok
                ? (isKo ? '주소가 복사되었습니다. 지갑 앱 브라우저 주소창에 붙여넣으세요.' : 'URL copied. Paste it into the wallet app browser.')
                : (isKo ? '주소를 길게 눌러 직접 복사해 주세요.' : 'Long-press the URL to copy manually.'),
            ok ? undefined : 'error'
        );
    });

    document.getElementById('trust-fallback-close-btn').addEventListener('click', function () {
        modal.remove();
    });

    modal.addEventListener('click', function (e) {
        if (e.target === modal) modal.remove();
    });
}

// ========== LAUNCH WALLET ==========
// 3단계 폴백 구조:
//   1단계) 딥링크 자동 시도 -> 지갑 앱이 열리면서 인앱 브라우저가 자동으로 사이트를 띄움 (완전 자동)
//   2단계) 일정 시간 내 화면이 그대로면(= 딥링크 실패) -> WalletConnect 자동 연결 시도
//   3단계) WalletConnect도 실패하면 -> 수동 복사/붙여넣기 안내 모달 (최후의 수단)
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
        var walletLabels = {
            tronlink: 'TronLink',
            trust: 'Trust Wallet',
            tokenpocket: 'TokenPocket',
            bitget: 'Bitget Wallet',
            okx: 'OKX Wallet',
            imtoken: 'imToken'
        };

        // 0. 이미 지갑 DApp 브라우저/확장 프로그램 내부라면 즉시 직접 연결 (딥링크 자체가 불필요한 경우)
        var tw = getTargetTronWeb(wallet);
        if (!tw && wallet !== 'trust' && typeof getInjectedTronWeb === 'function') {
            tw = await getInjectedTronWeb();
        }
        if (tw && tw.defaultAddress && tw.defaultAddress.base58) {
            var prov = (typeof detectProvider === 'function' && detectProvider()) || walletMap[wallet] || wallet;
            await setConnectedWallet(tw.defaultAddress.base58, prov);
            return;
        }

        // PC: 확장 프로그램 잠금 해제 안내 (딥링크/WC 폴백 대상 아님)
        if (isPC()) {
            var wName = walletLabels[wallet] || wallet;
            showToast(
                currentLang === 'ko'
                    ? wName + ' 확장 프로그램이 잠겨 있거나 설치되어 있지 않습니다. 지갑 잠금 해제 후 새로고침해 다시 시도해주세요.'
                    : wName + ' extension is locked or not installed. Unlock it and refresh to try again.',
                'error'
            );
            return;
        }

        // 모바일: 수동 붙여넣기 대비 URL 클립보드 미리 복사 (딥링크/WC 둘 다 실패해도 대비됨)
        var preCopied = await copyCurrentUrlToClipboard(url);

        var tronlinkParam = encodeURIComponent(JSON.stringify({ url: url, action: 'open', protocol: 'TronLink', version: '1.0' }));
        var mobileSchemes = {
            tronlink: 'tronlinkoutside://pull.activity?param=' + tronlinkParam,
            trust: 'https://link.trustwallet.com/open_url?coin_id=195&url=' + encoded, // 유니버설 링크 - 최신 iOS/Android에서 커스텀 스킴보다 안정적
            tokenpocket: 'tpdapp://open?params=' + encodeURIComponent(JSON.stringify({ url: url, chain: 'TRON' })),
            bitget: 'bitkeep://bkconnect?action=dapp&url=' + encoded,
            okx: 'okx://wallet/dapp/url?dappUrl=' + encoded,
            imtoken: 'imtokenv2://navigate/DappView?url=' + encoded
        };

        // ===== 1단계: 딥링크 자동 시도 =====
        var deepLinkAttempted = false;

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
            if (wallet === 'trust') {
                // Trust는 Android에서도 Intent로 커스텀 스킴(open_url) 사용 - 패키지명으로 명시 지정
                window.location.href =
                    'intent://open_url?coin_id=195&url=' + encoded +
                    '#Intent;scheme=trust;package=com.wallet.crypto.trustapp;end';
                deepLinkAttempted = true;
            } else {
                var rawScheme = mobileSchemes[wallet];
                if (rawScheme && pkgs[wallet]) {
                    var schemeName = rawScheme.split('://')[0];
                    var schemePath = rawScheme.split('://')[1] || '';
                    window.location.href = 'intent://' + schemePath + '#Intent;scheme=' + schemeName + ';package=' + pkgs[wallet] + ';S.browser_fallback_url=' + encodeURIComponent(stores[wallet] || '') + ';end';
                    deepLinkAttempted = true;
                }
            }
        } else if (isIOS() && mobileSchemes[wallet]) {
            window.location.href = mobileSchemes[wallet];
            deepLinkAttempted = true;
        }

        if (deepLinkAttempted) {
            showToast(currentLang === 'ko' ? '지갑 앱으로 이동합니다...' : 'Opening wallet app...');

            // ===== 2단계: 일정 시간 내 화면이 그대로면(= 딥링크 실패) WalletConnect 자동 폴백 =====
            var fallbackTimer = setTimeout(function () {
                if (document.visibilityState === 'visible') {
                    fallbackToWalletConnect(wallet, walletLabels[wallet] || wallet, preCopied);
                }
            }, 2800);

            var clearFallback = function () {
                clearTimeout(fallbackTimer);
                document.removeEventListener('visibilitychange', onVis);
            };
            var onVis = function () {
                // 앱 전환이 감지되면(= 딥링크 성공으로 추정) 폴백 취소
                if (document.hidden) clearFallback();
            };
            window.addEventListener('pagehide', clearFallback, { once: true });
            document.addEventListener('visibilitychange', onVis);
            return;
        }

        // 딥링크 스킴 자체가 없는 지갑/환경 -> 바로 WalletConnect 시도
        await fallbackToWalletConnect(wallet, walletLabels[wallet] || wallet, preCopied);
    } finally {
        isLaunchingWallet = false;
    }
};

// ========== WALLETCONNECT 자동 폴백 헬퍼 (2단계 -> 3단계) ==========
async function fallbackToWalletConnect(wallet, walletLabel, alreadyCopied) {
    showToast(currentLang === 'ko' ? 'WalletConnect로 연결을 시도합니다...' : 'Trying to connect via WalletConnect...');
    var wcAddr = await connectViaWalletConnect();
    if (wcAddr) {
        await setConnectedWallet(wcAddr, 'WalletConnect');
        return;
    }

    // ===== 3단계: WalletConnect도 실패 -> 수동 안내 모달 (최후의 수단) =====
    var copied = alreadyCopied || (await copyCurrentUrlToClipboard(window.location.href));
    showManualPasteModal(walletLabel, copied);
}