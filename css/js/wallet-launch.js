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
                    T('trust_not_installed_toast', 'Trust Wallet이 설치되어 있지 않아 설치 페이지로 이동합니다.'),
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

// ========== TRUST WALLET PRE-LAUNCH GUIDE MODAL ==========
async function launchTrustWalletWithNotice(url) {
    var copied = await copyCurrentUrlToClipboard(url);

    showToast(
        T(
            'trust_toast_notice',
            '10초 뒤 Trust Wallet으로 자동 입장됩니다. 앱 안 검색창(돋보기 탭)에 복사된 주소를 붙여넣고 실행해주세요.'
        )
    );

    var existing = document.getElementById('trust-guide-modal');
    if (existing) existing.remove();

    var formatCountdown = function (sec) {
        return T('trust_countdown_msg', '{sec}초 뒤 Trust Wallet으로 자동 입장됩니다...').replace('{sec}', String(sec));
    };

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
        T('trust_guide_title', '10초 뒤 Trust Wallet으로 자동 입장됩니다') +
        '</h3>' +
        '<p class="text-xs leading-relaxed" style="color:var(--sub)">' +
        '<span class="inline-block px-2 py-0.5 mb-1.5 rounded-md bg-emerald-500/15 text-emerald-400 font-semibold">' +
        (copied
            ? T('trust_url_copied_badge', '✓ 사이트 주소 자동 복사 완료')
            : T('trust_url_copy_hint', '아래 버튼으로 주소 복사')) +
        '</span><br>' +
        T(
            'trust_guide_desc',
            '자동 입장 후 하단 <strong style="color:#f59e0b">돋보기(브라우저/탐색)</strong> 탭을 누르고,<br>상단 검색창에 <strong style="color:#38bdf8">복사된 주소를 붙여넣고 실행</strong>해주세요.'
        ) +
        '</p>' +
        '<div id="trust-countdown-text" class="text-xs font-bold text-cyan-400 pt-1">' +
        formatCountdown(10) +
        '</div>' +
        '</div>' +
        '<div class="space-y-2 pt-1">' +
        '<button id="trust-open-now-btn" class="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg">' +
        '<i class="fa-solid fa-arrow-up-right-from-square"></i>' +
        '<span>' + T('trust_open_now_btn', '지금 바로 Trust Wallet 입장하기') + '</span>' +
        '</button>' +
        '<button id="trust-copy-again-btn" class="w-full py-2.5 px-4 rounded-xl border border-slate-500/30 font-semibold text-xs flex items-center justify-center gap-2" style="color:var(--txt)">' +
        '<i class="fa-solid fa-copy"></i>' +
        '<span>' + T('trust_copy_again_btn', '주소 다시 복사하기') + '</span>' +
        '</button>' +
        '<button id="trust-guide-close-btn" class="w-full py-1.5 text-xs transition" style="color:var(--sub)">' +
        T('trust_cancel_btn', '취소') +
        '</button>' +
        '</div>' +
        '</div>';

    document.body.appendChild(modal);

    var secLeft = 10;
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
            if (countdownEl) countdownEl.textContent = formatCountdown(secLeft);
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
                ? T('trust_copied_toast', '주소가 복사되었습니다!')
                : T('trust_copy_fail_toast', '복사에 실패했습니다. 주소창을 직접 복사해주세요.'),
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
// 수정: 하드코딩된 한국어/영어 메시지를 i18n(T)으로 교체 → 10개 언어 모두 지원
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

        // 1. 이미 지갑 DApp 브라우저 내부라면 안내 모달 없이 즉시 연결
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
            // i18n: {name} 치환 지원
            var pcMsg = T('ext_install_unlock_msg', '{name} 확장 프로그램을 설치 및 잠금 해제 후 새로고침해 다시 시도해주세요.')
                .replace('{name}', info.name);
            showToast(pcMsg, 'error');
            window.open(info.url, '_blank');
            return;
        }

        // 3. 모바일 Trust Wallet: 안내 문구 + 10초 뒤 자동 입장
        if (wallet === 'trust') {
            await launchTrustWalletWithNotice(url);
            return;
        }

        // 4. 그 외 모바일 지갑 딥링크 처리
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
                showToast(T('open_wallet_paste_url_msg', '지갑 앱으로 이동합니다. 앱 안 브라우저에 복사된 주소를 붙여넣어 주세요.'));
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
            showToast(T('open_wallet_paste_url_msg', '지갑 앱으로 이동합니다. 앱 안 브라우저에 복사된 주소를 붙여넣어 주세요.'));

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
        showToast(T('open_url_in_wallet_browser_msg', '지갑 앱의 브라우저에서 이 URL을 열어주세요 (복사됨)'), 'error');
    } finally {
        isLaunchingWallet = false;
    }
};