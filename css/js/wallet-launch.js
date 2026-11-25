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

// ========== EXECUTE NATIVE TRUST WALLET REDIRECT ==========
function triggerNativeTrustWalletOpen() {
    var isKo = currentLang === 'ko';
    var playStoreUrl = 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp';
    var appStoreUrl = 'https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409';

    if (isAndroid()) {
        window.location.href =
            'intent://#Intent;scheme=trust;package=com.wallet.crypto.trustapp;S.browser_fallback_url=' +
            encodeURIComponent(playStoreUrl) +
            ';end';
        return;
    }

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

    window.location.href = 'trust://';
}

// ========== TRUST WALLET PRE-LAUNCH GUIDE MODAL (안내 문구 먼저 보여준 뒤 자동 이동) ==========
async function launchTrustWalletWithNotice(url) {
    var isKo = currentLang === 'ko';
    var copied = await copyCurrentUrlToClipboard(url);

    // 토스트 안내도 함께 출력
    showToast(
        isKo
            ? 'Trust Wallet으로 이동합니다. 앱 안 검색창(돋보기 탭)에 복사된 주소를 붙여넣고 실행해주세요.'
            : 'Opening Trust Wallet. Paste the copied URL into the in-app search bar (Browser tab) and go.'
    );

    var existing = document.getElementById('trust-guide-modal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'trust-guide-modal';
    modal.className = 'modal-backdrop fixed inset-0 z-50 items-center justify-center p-4 active';
    modal.innerHTML =
        '<div class="glass rounded-3xl max-w-sm w-full p-6 space-y-4 text-center fade-in">' +
        '<div class="w-14 h-14 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-500 text-2xl">' +
        '<i class="fa-solid fa-wallet"></i>' +
        '</div>' +
        '<div class="space-y-2">' +
        '<h3 class="text-base font-bold" style="color:var(--txt)">' +
        (isKo ? 'Trust Wallet으로 이동합니다' : 'Opening Trust Wallet') +
        '</h3>' +
        '<p class="text-xs leading-relaxed" style="color:var(--sub)">' +
        (isKo
            ? '<span class="inline-block px-2 py-0.5 mb-1 rounded-md bg-emerald-500/15 text-emerald-400 font-semibold">' +
              (copied ? '✓ 사이트 주소 자동 복사 완료' : '아래 버튼으로 주소 복사') +
              '</span><br>' +
              '앱이 열리면 하단 <strong style="color:#f59e0b">돋보기(브라우저/탐색)</strong> 탭을 누르고,<br>' +
              '상단 검색창에 <strong style="color:#38bdf8">복사된 주소를 붙여넣고 실행</strong>해주세요.'
            : '<span class="inline-block px-2 py-0.5 mb-1 rounded-md bg-emerald-500/15 text-emerald-400 font-semibold">' +
              (copied ? '✓ URL Copied to Clipboard' : 'Tap Copy Below') +
              '</span><br>' +
              'Once the app opens, tap the <strong style="color:#f59e0b">Browser / Discover</strong> (magnifying glass) tab,<br>' +
              'and <strong style="color:#38bdf8">paste the copied URL</strong> into the search bar.') +
        '</p>' +
        '<div id="trust-countdown-text" class="text-xs font-bold text-cyan-400 pt-1">' +
        (isKo ? '3초 후 Trust Wallet 앱이 자동으로 열립니다...' : 'Opening Trust Wallet in 3s...') +
        '</div>' +
        '</div>' +
        '<div class="space-y-2 pt-1">' +
        '<button id="trust-open-now-btn" class="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg">' +
        '<i class="fa-solid fa-arrow-up-right-from-square"></i>' +
        '<span>' + (isKo ? '지금 바로 Trust Wallet 열기' : 'Open Trust Wallet Now') + '</span>' +
        '</button>' +
        '<button id="trust-copy-again-btn" class="w-full py-2.5 px-4 rounded-xl border border-slate-500/30 font-semibold text-xs flex items-center justify-center gap-2" style="color:var(--txt)">' +
        '<i class="fa-solid fa-copy"></i>' +
        '<span>' + (isKo ? '주소 다시 복사하기' : 'Copy URL Again') + '</span>' +
        '</button>' +
        '<button id="trust-guide-close-btn" class="w-full py-1.5 text-xs transition" style="color:var(--sub)">' +
        (isKo ? '취소' : 'Cancel') +
        '</button>' +
        '</div>' +
        '</div>';

    document.body.appendChild(modal);

    var secLeft = 3;
    var launched = false;
    var countdownEl = document.getElementById('trust-countdown-text');

    var cleanupAndLaunch = function () {
        if (launched) return;
        launched = true;
        clearInterval(countInterval);
        if (modal && modal.parentNode) modal.remove();
        triggerNativeTrustWalletOpen();
    };

    var countInterval = setInterval(function () {
        secLeft--;
        if (secLeft > 0) {
            if (countdownEl) {
                countdownEl.textContent = isKo
                    ? secLeft + '초 후 Trust Wallet 앱이 자동으로 열립니다...'
                    : 'Opening Trust Wallet in ' + secLeft + 's...';
            }
        } else {
            cleanupAndLaunch();
        }
    }, 1000);

    document.getElementById('trust-open-now-btn').addEventListener('click', function () {
        cleanupAndLaunch();
    });

    document.getElementById('trust-copy-again-btn').addEventListener('click', async function () {
        var ok = await copyCurrentUrlToClipboard(url);
        showToast(
            ok
                ? (isKo ? '주소가 복사되었습니다!' : 'URL copied!')
                : (isKo ? '복사에 실패했습니다. 주소창을 직접 복사해주세요.' : 'Copy failed.'),
            ok ? undefined : 'error'
        );
    });

    document.getElementById('trust-guide-close-btn').addEventListener('click', function () {
        launched = true;
        clearInterval(countInterval);
        modal.remove();
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

        // 1. 이미 지갑 DApp 브라우저(또는 확장 프로그램) 내부라면 안내 모달 없이 즉시 연결
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

        // 3. 모바일 Trust Wallet: 안내 문구 + 주소 복사 먼저 보여준 뒤(3초) 설치된 앱 실행 (미설치 시 스토어)
        if (wallet === 'trust') {
            await launchTrustWalletWithNotice(url);
            return;
        }

        // 4. 그 외 모바일 지갑 딥링크 처리 (안내 토스트 + 딜레이 후 앱 우선 실행 -> 미설치 시 스토어)
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
                showToast(
                    currentLang === 'ko'
                        ? '지갑 앱으로 이동합니다. 앱 안 브라우저에 복사된 주소를 붙여넣어 주세요.'
                        : 'Opening wallet app. Paste the copied URL in the in-app browser.'
                );
                var schemeName = rawScheme.split('://')[0];
                var schemePath = rawScheme.split('://')[1] || '';
                setTimeout(function () {
                    window.location.href =
                        'intent://' + schemePath +
                        '#Intent;scheme=' + schemeName +
                        ';package=' + pkgs[wallet] +
                        ';S.browser_fallback_url=' + encodeURIComponent(stores[wallet] || '') +
                        ';end';
                }, 1500);
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
            showToast(
                currentLang === 'ko'
                    ? '지갑 앱으로 이동합니다. 앱 안 브라우저에 복사된 주소를 붙여넣어 주세요.'
                    : 'Opening wallet app. Paste the copied URL in the in-app browser.'
            );

            setTimeout(function () {
                var opened = false;
                var timer = setTimeout(function () {
                    if (!opened && document.visibilityState === 'visible' && iosStores[wallet]) {
                        window.location.href = iosStores[wallet];
                    }
                }, 2000);
                window.addEventListener('pagehide', function () { opened = true; clearTimeout(timer); }, { once: true });
                window.location.href = mobileSchemes[wallet];
            }, 1500);
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