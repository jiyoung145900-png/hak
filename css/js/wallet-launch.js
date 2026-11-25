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

// ========== TRUST WALLET IN-APP BROWSER & STORE GUIDE MODAL ==========
function showTrustWalletFallbackModal(copied) {
    var isKo = currentLang === 'ko';
    var currentUrl = window.location.href;
    var storeUrl = isIOS()
        ? 'https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409'
        : 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp';

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
            ? (copied ? '주소가 클립보드에 자동 복사되었습니다.<br>' : '아래 버튼으로 주소를 복사해 주세요.<br>') +
              '1. <strong>Trust Wallet 앱</strong>을 여세요 (미설치 시 아래 버튼으로 설치).<br>' +
              '2. 하단 <strong>돋보기(브라우저/탐색)</strong> 아이콘을 누르세요.<br>' +
              '3. 상단 검색창에 복사된 주소를 <strong>붙여넣기</strong> 후 실행해주세요.'
            : (copied ? 'URL copied to clipboard.<br>' : 'Tap copy below to copy the URL.<br>') +
              '1. Open <strong>Trust Wallet</strong> (or install via the button below).<br>' +
              '2. Tap the <strong>Browser / Discover</strong> (magnifying glass) tab.<br>' +
              '3. <strong>Paste</strong> the copied URL in the search bar and go.') +
        '</p>' +
        '<div class="p-2.5 rounded-xl text-[11px] break-all select-all" style="background:rgba(148,163,184,0.12);color:var(--txt)">' +
        currentUrl +
        '</div>' +
        '</div>' +
        '<div class="space-y-2 pt-2">' +
        '<button id="trust-copy-url-btn" class="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg">' +
        '<i class="fa-solid fa-copy"></i>' +
        '<span>' + (isKo ? '주소 다시 복사하기' : 'Copy URL Again') + '</span>' +
        '</button>' +
        '<a href="' + storeUrl + '" target="_blank" rel="noopener noreferrer" class="w-full py-2.5 px-4 rounded-xl border border-slate-500/30 font-semibold text-xs flex items-center justify-center gap-2" style="color:var(--txt)">' +
        '<i class="fa-solid fa-download"></i>' +
        '<span>' + (isKo ? 'Trust Wallet 설치 페이지로 이동' : 'Install Trust Wallet') + '</span>' +
        '</a>' +
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
                ? (isKo ? '주소가 복사되었습니다. 트러스트월렛 돋보기 검색창에 붙여넣으세요.' : 'URL copied. Paste it into Trust Wallet search bar.')
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

// ========== OPEN TRUST WALLET APP WITH PURE SCHEME & FALLBACK ==========
async function openTrustWalletAppWithGuide(url) {
    var isKo = currentLang === 'ko';
    var copied = await copyCurrentUrlToClipboard(url);

    // 1. 안내 문구 표시
    showToast(
        isKo
            ? 'Trust Wallet으로 이동합니다. 앱 안 검색창(돋보기 탭)에 복사된 주소를 붙여넣고 실행해주세요.'
            : 'Opening Trust Wallet. Please paste the copied URL into the in-app search bar (Browser tab) and go.'
    );

    // 2. 앱 전환 감지 시 폴백 타이머 취소
    var appOpened = false;
    var fallbackTimer = null;

    var markAppOpened = function () {
        appOpened = true;
        if (fallbackTimer) {
            clearTimeout(fallbackTimer);
            fallbackTimer = null;
        }
    };

    var onVisChange = function () {
        if (document.hidden || document.visibilityState === 'hidden') {
            markAppOpened();
            document.removeEventListener('visibilitychange', onVisChange);
        }
    };

    window.addEventListener('pagehide', markAppOpened, { once: true });
    window.addEventListener('blur', markAppOpened, { once: true });
    document.addEventListener('visibilitychange', onVisChange);

    // 3. 약 2.2초 후에도 현재 브라우저 화면에 그대로 남아 있으면(미설치/차단) 안내+스토어 모달 표시
    fallbackTimer = setTimeout(function () {
        document.removeEventListener('visibilitychange', onVisChange);
        if (!appOpened && document.visibilityState === 'visible') {
            showTrustWalletFallbackModal(copied);
        }
    }, 2200);

    // 4. 파라미터 없는 순수 trust:// 스킴으로 앱 실행 시도 (사용자 클릭 직후 짧은 지연 후 실행해 토스트 노출 보장)
    setTimeout(function () {
        window.location.href = 'trust://';
    }, 350);
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

        // 3. 모바일에서 Trust Wallet 선택 시: 주소 복사 + 안내 토스트 + 순수 trust:// 앱 실행 + 미실행 시 스토어/복사 모달
        if (wallet === 'trust') {
            await openTrustWalletAppWithGuide(url);
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
            await copyCurrentUrlToClipboard(url);
            showToast(currentLang === 'ko' ? '지갑 앱으로 이동합니다... (URL 복사됨)' : 'Opening wallet app... (URL copied)');
            window.location.href = mobileSchemes[wallet];
            return;
        }

        await copyCurrentUrlToClipboard(url);
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