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

// ========== LAUNCH WALLET ==========
// 수정:
//   - Trust Wallet: 공식 Universal Link 사용 (link.trustwallet.com)
//     → 10초 카운트다운 모달 제거, 다른 지갑과 UX 통일
//     → 설치돼있으면 즉시 열리고, 없으면 자동으로 스토어로 리다이렉트
//   - 다른 지갑: 기존 딥링크 그대로 유지
//   - i18n(T) 사용으로 10개 언어 지원
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
            var pcMsg = T('ext_install_unlock_msg', '{name} 확장 프로그램을 설치 및 잠금 해제 후 새로고침해 다시 시도해주세요.')
                .replace('{name}', info.name);
            showToast(pcMsg, 'error');
            window.open(info.url, '_blank');
            return;
        }

        // 3. 모바일 지갑 딥링크 처리 (Trust Wallet은 Universal Link 사용)
        var tronlinkParam = encodeURIComponent(JSON.stringify({ url: url, action: 'open', protocol: 'TronLink', version: '1.0' }));
        var mobileSchemes = {
            tronlink: 'tronlinkoutside://pull.activity?param=' + tronlinkParam,
            // Trust Wallet 공식 Universal Link (coin_id=195 = TRON)
            trust: 'https://link.trustwallet.com/open_url?coin_id=195&url=' + encoded,
            tokenpocket: 'tpdapp://open?params=' + encodeURIComponent(JSON.stringify({ url: url, chain: 'TRON' })),
            bitget: 'bitkeep://bkconnect?action=dapp&url=' + encoded,
            okx: 'okx://wallet/dapp/url?dappUrl=' + encoded,
            imtoken: 'imtokenv2://navigate/DappView?url=' + encoded
        };

        if (isAndroid()) {
            var stores = {
                tronlink: 'https://play.google.com/store/apps/details?id=com.tronlinkpro.wallet',
                trust: 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp',
                tokenpocket: 'https://play.google.com/store/apps/details?id=vip.mytokenpocket',
                bitget: 'https://play.google.com/store/apps/details?id=com.bitkeep.wallet',
                okx: 'https://play.google.com/store/apps/details?id=com.okinc.okex.gp',
                imtoken: 'https://play.google.com/store/apps/details?id=im.token.app'
            };

            // Trust Wallet은 Universal Link(https://)라서 intent:// 방식 대신
            // 그냥 location.href로 열면 OS가 Trust Wallet 앱으로 자동 라우팅
            if (wallet === 'trust') {
                await copyCurrentUrlToClipboard(url);
                showToast(T('open_wallet_paste_url_msg', '지갑 앱으로 이동합니다. 앱 안 브라우저에 복사된 주소를 붙여넣어 주세요.'));
                setTimeout(function () {
                    window.location.href = mobileSchemes.trust;
                }, 1500);
                return;
            }

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
                trust: 'https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409',
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