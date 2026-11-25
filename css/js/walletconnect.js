// ========== WALLETCONNECT INIT ==========
async function initWalletConnect() {
    if (wcConnector) return wcConnector;
    if (typeof TronWalletConnect === 'undefined') {
        showToast('WalletConnect 로드 실패', 'error');
        return null;
    }
    try {
        wcConnector = new TronWalletConnect('5fafa9c15e52f88b097bc063166d3f3a', {
            name: 'FeeSlash',
            description: 'USDT to TRX Instant Exchange',
            url: window.location.origin,
            icons: [window.location.origin + '/favicon.png']
        });
        await wcConnector.init();

        // 세션 복구
        try {
            var savedTopic = localStorage.getItem('feeslash_wc_topic');
            if (savedTopic && wcConnector.client && wcConnector.client.session) {
                var sessions = wcConnector.client.session.getAll ? wcConnector.client.session.getAll() : [];
                for (var i = 0; i < sessions.length; i++) {
                    if (sessions[i].topic === savedTopic) {
                        wcConnector.session = sessions[i];
                        var accounts = (sessions[i].namespaces.tron && sessions[i].namespaces.tron.accounts) || [];
                        if (accounts.length > 0) {
                            var parts = accounts[0].split(':');
                            if (parts.length >= 3) {
                                wcAddress = parts[2];
                                wcConnector.address = parts[2];
                                if (typeof setConnectedWallet === 'function') {
                                    await setConnectedWallet(wcAddress, 'WalletConnect');
                                }
                            }
                        }
                        break;
                    }
                }
            }
        } catch (e) { }

        wcConnector.onDisconnect = function () {
            wcAddress = null;
            if (wcConnector) wcConnector.session = null;
            try { localStorage.removeItem('feeslash_wc_topic'); } catch (e) { }
        };

        if (wcConnector.client && typeof wcConnector.client.on === 'function') {
            try {
                wcConnector.client.on('display_uri', function (uri) {
                    if (uri) openWcUriModal(uri);
                });
            } catch (e) { }
        }
        return wcConnector;
    } catch (e) {
        showToast('WalletConnect 초기화 실패', 'error');
        return null;
    }
}

// ========== URI MODAL HELPERS ==========
function openWcUriModal(uri) {
    var modal = document.getElementById('wc-uri-modal');
    var input = document.getElementById('wc-uri-input');
    if (input) input.value = uri || '연결 코드 생성 중...';
    if (modal) modal.classList.add('active');
}

function closeWcUriModal() {
    var modal = document.getElementById('wc-uri-modal');
    if (modal) modal.classList.remove('active');
}

window.copyWcUri = function () {
    var input = document.getElementById('wc-uri-input');
    var val = input ? input.value : '';
    if (!val || val.indexOf('wc:') !== 0) {
        showToast('복사할 연결 코드가 아직 없습니다.', 'error');
        return;
    }
    copyText(val, 'WalletConnect 연결 코드');
};

// ========== CONNECT VIA WALLETCONNECT ==========
async function connectViaWalletConnect() {
    var wc = await initWalletConnect();
    if (!wc) return null;
    try {
        showToast(currentLang === 'ko' ? '지갑 앱에서 연결을 승인하세요' : 'Approve connection in your wallet app');

        var addr = await Promise.race([
            wc.connect(),
            new Promise(function (_, reject) { setTimeout(function () { reject(new Error('timeout')); }, 60000); })
        ]);
        closeWcUriModal();
        if (addr) {
            wcAddress = addr;
            if (wc.session) {
                try { localStorage.setItem('feeslash_wc_topic', wc.session.topic); } catch (e) { }
            }
            return addr;
        }
        return null;
    } catch (e) {
        closeWcUriModal();
        var em = e && e.message ? e.message.toLowerCase() : '';
        var code = e && e.code ? String(e.code) : '';
        if (em.indexOf('timeout') >= 0) {
            showToast(T('timeout_msg', '연결 시간 초과. 다시 시도해주세요.'), 'error');
        } else if (em.indexOf('reject') >= 0 || em.indexOf('cancel') >= 0 || code === '4001') {
            showToast(T('rejected_msg', '연결 거부됨'), 'error');
        } else {
            showToast(T('wc_fail_msg', 'WalletConnect 연결 실패'), 'error');
            console.error('[WC]', e);
        }
        return null;
    }
}

// ========== CONNECT FROM MODAL ==========
window.wcConnectFromModal = async function () {
    var selectorModal = document.getElementById('wallet-selector-modal');
    if (selectorModal) selectorModal.classList.remove('active');
    var wcAddr = await connectViaWalletConnect();
    if (wcAddr) {
        await setConnectedWallet(wcAddr, 'WalletConnect');
    } else {
        showToast(T('wc_fail_msg', 'WalletConnect 연결 실패'), 'error');
    }
};