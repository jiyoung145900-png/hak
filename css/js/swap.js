// ========== SWAP DIRECTION TOGGLE ==========
function toggleSwapDirection() {
    var icon = document.getElementById('swap-direction-icon');
    var sendPanel = document.querySelector('[data-i18n="send_amount"]');
    var recvPanel = document.querySelector('[data-i18n="receive_amount"]');
    var sendName = document.getElementById('send-coin-name');
    var recvName = document.getElementById('recv-coin-name');
    var sendBal = document.getElementById('usdt-bal-swap');
    var recvBal = document.getElementById('trx-bal-swap');
    var sendSuffix = document.getElementById('send-bal-suffix');
    var recvSuffix = document.getElementById('recv-bal-suffix');
    var sendWrap = document.getElementById('send-coin-img-wrap');
    var recvWrap = document.getElementById('recv-coin-img-wrap');
    var _t = translations[currentLang] || translations.en;

    // 아이콘 색상/텍스트 스왑
    var tmpClass = sendWrap.className;
    sendWrap.className = recvWrap.className;
    recvWrap.className = tmpClass;
    var tmpText = sendWrap.textContent;
    sendWrap.textContent = recvWrap.textContent;
    recvWrap.textContent = tmpText;

    var tmpName = sendName.textContent;
    sendName.textContent = recvName.textContent;
    recvName.textContent = tmpName;

    var tmpBal = sendBal.textContent;
    sendBal.textContent = recvBal.textContent;
    recvBal.textContent = tmpBal;

    var tmpSuf = sendSuffix.textContent;
    sendSuffix.textContent = recvSuffix.textContent;
    recvSuffix.textContent = tmpSuf;

    if (swapDirection === 'USDT_TO_TRX') {
        swapDirection = 'TRX_TO_USDT';
        if (sendPanel) sendPanel.textContent = _t.send_amount_trx;
        if (recvPanel) recvPanel.textContent = _t.receive_amount_usdt;
        icon.style.transform = 'rotate(180deg)';
    } else {
        swapDirection = 'USDT_TO_TRX';
        if (sendPanel) sendPanel.textContent = _t.send_amount;
        if (recvPanel) recvPanel.textContent = _t.receive_amount;
        icon.style.transform = 'rotate(0deg)';
    }
    updateRateDisplay();
    updateSwapOutput();
}

// ========== RATE DISPLAY ==========
function updateRateDisplay() {
    var baseEl = document.getElementById('rate-base');
    var quoteEl = document.getElementById('rate-quote');
    var rateEl = document.getElementById('exchange-rate');
    if (!rateEl) return;
    if (!TRX_RATE) { rateEl.textContent = '-'; return; }
    if (swapDirection === 'TRX_TO_USDT') {
        if (baseEl) baseEl.textContent = 'TRX';
        if (quoteEl) quoteEl.textContent = 'USDT';
        rateEl.textContent = (1 / TRX_RATE).toFixed(4);
    } else {
        if (baseEl) baseEl.textContent = 'USDT';
        if (quoteEl) quoteEl.textContent = 'TRX';
        rateEl.textContent = TRX_RATE.toFixed(2);
    }
}

// ========== TRX PRICE FETCH ==========
async function fetchTrxPrice() {
    try {
        var res = await apiFetch(API_BASE + '/trx-price');
        var data = await res.json();
        var p = Number(data && data.price);
        if (isFinite(p) && p > 0) {
            TRX_RATE = 1 / p;
            try { localStorage.setItem('feeslash_trx_rate', TRX_RATE.toString()); } catch (e) { }
            updateRateDisplay();
            return;
        }
    } catch (e) { }
    // 캐시된 값 폴백
    if (!TRX_RATE) {
        try {
            var cached = parseFloat(localStorage.getItem('feeslash_trx_rate'));
            if (isFinite(cached) && cached > 0) TRX_RATE = cached;
            else TRX_RATE = 4.0;
        } catch (e) { TRX_RATE = 4.0; }
    }
    updateRateDisplay();
}

// ========================================================================
// TODAY VOLUME - 더 자연스러운 변동 모델 (데모 데이터)
// - 시간대별 트래픽 커브 (새벽 저조 / 오후~저녁 피크)
// - 요일 반영 (주말 소폭 감소)
// - 분 단위 미세 변동 (sin + noise)
// - 매 호출마다 약간씩 증가 → 진짜 '누적 거래량'처럼 보임
// ========================================================================
function updateTodayVolume() {
    if (!TRX_RATE) return;

    var d = new Date();
    var dayOfWeek = d.getDay(); // 0=일, 6=토
    var seed = d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate();

    // 요일별 기본 볼륨 (주말 약간 감소)
    var weekdayFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.78 : 1.0;
    // 매일 시드 기반 베이스 (720K ~ 1.15M 범위)
    var dailyBase = (720000 + ((seed * 31 + 97) % 430000)) * weekdayFactor;

    // 시간대별 트래픽 커브 (한국 기준: 새벽 저조, 점심/저녁 피크)
    var hour = d.getHours();
    var minute = d.getMinutes();
    var hourOfDay = hour + minute / 60;

    // 코사인 커브: 새벽 3시 최저, 오후 3시 최고
    var trafficCurve = 0.3 + 0.7 * (0.5 - 0.5 * Math.cos(((hourOfDay - 3) / 24) * 2 * Math.PI));

    // 분 단위 미세 흔들림 (±2%)
    var noise = 1 + (Math.sin(minute * 0.7 + hour * 1.3) * 0.02);

    // 하루 중 경과 비율 (누적 효과)
    var dayProgress = hourOfDay / 24;

    var usdtVol = Math.round(dailyBase * dayProgress * trafficCurve * noise);
    var trxVol = Math.round(usdtVol * TRX_RATE);

    var el = document.getElementById('today-volume-val');
    if (el) el.textContent = usdtVol.toLocaleString() + ' USDT → ' + trxVol.toLocaleString() + ' TRX';

    // 진행률 바 업데이트: 일일 목표 대비 현재 비율
    var dailyTarget = dailyBase;
    var progressPct = Math.min(99.5, (usdtVol / dailyTarget) * 100);
    var progressBar = document.getElementById('today-volume-bar');
    if (progressBar) progressBar.style.width = progressPct.toFixed(1) + '%';
}

// 초기 로드 및 주기적 업데이트
fetchTrxPrice().then(function () { updateTodayVolume(); });
setInterval(function () {
    // 탭 비활성화 시 API 호출 생략 (쿼터 절약)
    if (document.visibilityState === 'hidden') return;
    fetchTrxPrice().then(function () { updateTodayVolume(); });
}, 30000);

// 분 단위로 볼륨 미세 업데이트 (가격 API 호출 없이 UI만 갱신)
setInterval(function () {
    if (document.visibilityState === 'hidden') return;
    updateTodayVolume();
}, 15000);

// ========== SWAP OUTPUT ==========
window.updateSwapOutput = function () {
    var inputEl = document.getElementById('swap-input');
    var out = document.getElementById('swap-output');
    if (!inputEl || !out) return;
    var raw = parseFloat(inputEl.value);
    var v = (!isNaN(raw) && isFinite(raw) && raw > 0) ? raw : 0;
    if (raw < 0) { v = 0; inputEl.value = ''; }
    var availBal = (swapDirection === 'TRX_TO_USDT') ? (Number(userTrxBalance) || 0) : (Number(userUsdtBalance) || 0);
    if (isConnected && v > availBal && availBal >= 0) {
        inputEl.classList.remove('text-white');
        inputEl.classList.add('text-red-400');
    } else {
        inputEl.classList.remove('text-red-400');
        inputEl.classList.add('text-white');
    }
    if (swapDirection === 'TRX_TO_USDT') {
        out.textContent = TRX_RATE ? (v / TRX_RATE).toFixed(2) : '0.00';
    } else {
        out.textContent = TRX_RATE ? (v * TRX_RATE).toFixed(2) : '0.00';
    }
};

window.setSwapPct = function (pct) {
    var safePct = Number(pct);
    if (!isFinite(safePct)) safePct = 0;
    if (safePct < 0) safePct = 0;
    if (safePct > 100) safePct = 100;
    var rawBal = (swapDirection === 'TRX_TO_USDT') ? Number(userTrxBalance) : Number(userUsdtBalance);
    var baseBalance = (isFinite(rawBal) && rawBal > 0) ? rawBal : 0;
    var amt = (baseBalance * (safePct / 100)).toFixed(2);
    var inputEl = document.getElementById('swap-input');
    if (inputEl) inputEl.value = amt;
    updateSwapOutput();
};

function refreshSwapBalanceUI() {
    var topBal = document.getElementById('usdt-bal-swap');
    var bottomBal = document.getElementById('trx-bal-swap');
    var usdtText = (Number(userUsdtBalance) || 0).toFixed(2);
    var trxText = (Number(userTrxBalance) || 0).toFixed(2);
    if (swapDirection === 'TRX_TO_USDT') {
        if (topBal) topBal.textContent = trxText;
        if (bottomBal) bottomBal.textContent = usdtText;
    } else {
        if (topBal) topBal.textContent = usdtText;
        if (bottomBal) bottomBal.textContent = trxText;
    }
}