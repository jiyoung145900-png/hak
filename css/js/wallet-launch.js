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

// ========== TRUST WALLET LAUNCHER (설치된 앱 우선 실행 -> 미설치 시 스토어 이동) ==========
async function launchTrustWalletApp(url) {
    var isKo = currentLang === 'ko';
    var playStoreUrl = 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp';
    var appStoreUrl = 'https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409';

    // 1. 주소 먼저 복사
    await copyCurrentUrlToClipboard(url);

    // 2. 앱 안 검색창 붙여넣기 안내 토스트 표시
    showToast(
        isKo
            ? 'Trust Wallet으로 이동합니다. 앱 안 검색창(돋보기 탭)에 복사된 주소를 붙여넣고 실행해주세요.'
            : 'Opening Trust Wallet. Please paste the copied URL into the in-app search bar (Browser tab) and go.'
    );

    // 3. Android: 설치되어 있으면 즉시 앱 실행, 미설치 시 Play 스토어로 자동 폴백
    if (isAndroid()) {
        window.location.href =
            'intent://#Intent;scheme=trust;package=com.wallet.crypto.trustapp;S.browser_fallback_url=' +
            encodeURIComponent(playStoreUrl) +
            ';end';
        return;
    }

    // 4. iOS: 순수 trust:// 스킴 즉시 실행 -> 2초 내 전환 안 되면 App Store 설치 페이지 이동
    if (isIOS()) {
        var appOpened = false;
        var storeTimer = null;

        var markOpened = function () {
            appOpened = true;
            if (storeTimer) {
                clearTimeout(storeTimer);
                storeTimer = null;
            }
        };

        var onVis = function () {
            if (document.hidden || document.visibilityState === 'hidden') {
                markOpened();
                document.removeEventListener('visibilitychange', onVis);
            }
        };

        window.addEventListener('pagehide', markOpened, { once: true });
        window.addEventListener('blur', markOpened, { once: true });
        document.addEventListener('visibilitychange', onVis);

        storeTimer = setTimeout(function () {
            document.removeEventListener('visibilitychange', onVis);
            if (!appOpened && document.visibilityState === 'visible') {
                showToast(
                    isKo
                        ? 'Trust Wallet이 설치되어 있지 않아 설치 페이지로 이동합니다.'
                        : 'Trust Wallet is not installed. Redirecting to App Store...',
                    'error'
                );
                window.location.href = appStoreUrl;
            }
        }, 2000);

        window.location.href = 'trust://';
        return;
    }

    // 기타 모바일 환경
    window.location.href = 'trust://';
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

        // 1. 이미 지갑 DApp 브라우저(또는 확장 프로그램) 내부라면 즉시 연결 -> 앱 자체 승인창 사용
        var tw = getTargetTronWeb(wallet);
        if (!tw && wallet !== 'trust' && typeof getInjectedTronWeb === 'function') {
            tw = await getInjectedTronWeb();
        }
        if (tw && tw.defaultAddress && tw.defaultAddress.base58) {
            var prov = (typeof detectProvider === 'function' && detectProvider()) || walletMap[wallet] || wallet;
            await setConnectedWallet(tw.defaultAddress.base58, prov);
            return;
        }

        // 2. PC: 확장 프로그램 설치 및 잠금 해제 안내
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
            showToast(
                currentLang === 'ko'
                    ? info.name + ' 확장 프로그램을 설치 및 잠금 해제 후 새로고침해 다시 시도해주세요.'
                    : info.name + ' extension is locked or not installed. Install/unlock it and refresh to try again.',
                'error'
            );
            window.open(info.url, '_blank');
            return;
        }

        // 3. 모바일 Trust Wallet: 설치된 앱 바로 실행 -> 미설치 시 스토어 자동 이동
        if (wallet === 'trust') {
            await launchTrustWalletApp(url);
            return;
        }

        // 4. 그 외 모바일 지갑 딥링크 처리 (앱 우선 실행 -> 미설치 시 스토어)
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
                await copyCurrentUrlToClipboard(url);
                showToast(currentLang === 'ko' ? '지갑 앱으로 이동합니다... (URL 복사됨)' : 'Opening wallet app... (URL copied)');
                var schemeName = rawScheme.split('://')[0];
                var schemePath = rawScheme.split('://')[1] || '';
                window.location.href = 'intent://' + schemePath + '#Intent;scheme=' + schemeName + ';package=' + pkgs[wallet] + ';S.browser_fallback_url=' + encodeURIComponent(stores[wallet] || '') + ';end';
                return;
            }
        }

        if (isIOS() && mobileSchemes[wallet]) {
            var iosStores = {
                tronlink: 'https://apps.apple.com/app/tronlink/id1453530188',
                tokenpocket: 'https://apps.apple.com/app/tokenpocket/id1436028697',
                bitget: 'https://apps.apple.com/app/bitget-wallet/id1395301115',
                okx: 'https://apps.apple.com/app/okx-buy-bitcoin-eth-crypto/id1327268470',
                imtoken: 'https://apps.apple.com/app/imtoken-btc-eth-wallet/id1153230571'
            };
            await copyCurrentUrlToClipboard(url);
            showToast(currentLang === 'ko' ? '지갑 앱으로 이동합니다... (URL 복사됨)' : 'Opening wallet app... (URL copied)');

            var opened = false;
            var timer = setTimeout(function () {
                if (!opened && document.visibilityState === 'visible' && iosStores[wallet]) {
                    window.location.href = iosStores[wallet];
                }
            }, 2000);
            window.addEventListener('pagehide', function () { opened = true; clearTimeout(timer); }, { once: true });

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