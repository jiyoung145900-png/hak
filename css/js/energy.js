// ========== ENERGY RENTAL ==========
var energyAmount = 65000;
var energyDuration = '1h';

var energyPrices = {
    energy: {
        '65000': { '1h': 1.5, '1d': 3.8, '3d': 6.5, '30d': 58.0 },
        '131000': { '1h': 3.0, '1d': 7.6, '3d': 13.0, '30d': 116.0 },
        '1000000': { '1h': 23.0, '1d': 58.0, '3d': 99.0, '30d': 885.0 },
        '10000000': { '1h': 230.0, '1d': 580.0, '3d': 990.0, '30d': 8850.0 }
    }
};
var energyBurnCost = {
    '65000': 4.0,
    '131000': 8.0,
    '1000000': 61.0,
    '10000000': 610.0
};

// ========== SELECT ENERGY AMOUNT ==========
window.selectEnergyAmount = function (amt) {
    energyAmount = amt;
    document.querySelectorAll('.energy-amt-btn').forEach(function (b) {
        b.className = 'energy-amt-btn py-2.5 rounded-xl text-xs font-bold transition-all bg-slate-950/60 text-slate-400 border border-slate-800 hover:border-slate-600';
    });
    var sel = document.querySelector('.energy-amt-btn[data-amt="' + amt + '"]');
    if (sel) sel.className = 'energy-amt-btn active-amt py-2.5 rounded-xl text-xs font-bold transition-all';
    var el = document.getElementById('energy-sel-amount');
    if (el) el.textContent = amt.toLocaleString();
    updateEnergyPrice();
};

// ========== SELECT ENERGY DURATION ==========
window.selectEnergyDuration = function (dur) {
    energyDuration = dur;
    document.querySelectorAll('.energy-dur-btn').forEach(function (b) {
        b.className = 'energy-dur-btn py-2.5 rounded-xl text-xs font-bold transition-all bg-slate-950/60 text-slate-400 border border-slate-800 hover:border-slate-600';
    });
    var sel = document.querySelector('.energy-dur-btn[data-dur="' + dur + '"]');
    if (sel) sel.className = 'energy-dur-btn active-dur py-2.5 rounded-xl text-xs font-bold transition-all';
    var _t = translations[currentLang] || translations.ko;
    var durTexts = {
        '1h': _t.energy_1h || '1시간',
        '1d': _t.energy_1d || '1일',
        '3d': _t.energy_3d || '3일',
        '30d': _t.energy_30d || '30일'
    };
    var el = document.getElementById('energy-sel-duration');
    if (el) el.textContent = durTexts[dur];
    updateEnergyPrice();
};

// ========== UPDATE ENERGY PRICE ==========
function updateEnergyPrice() {
    var prices = energyPrices['energy'];
    var key = String(energyAmount);
    var price = (prices[key] && prices[key][energyDuration]) || 0;
    var burn = energyBurnCost[key] || 6.43;
    var savePct = burn > 0 ? Math.round((1 - price / burn) * 100) : 0;
    if (savePct < 0) savePct = 0;
    var _t = translations[currentLang] || translations.ko;
    var isFree = (energyAmount === 65000 || energyAmount === 131000) && energyDuration === '1h';
    var priceEl = document.getElementById('energy-price');
    var detailEl = document.getElementById('energy-price-detail');
    var bannerEl = document.getElementById('energy-free-banner');
    var withoutEl = document.getElementById('energy-price-without');
    var saveEl = document.getElementById('energy-save-badge');

    if (isFree) {
        if (priceEl) priceEl.textContent = _t.fee_free || '무료';
        if (detailEl) detailEl.classList.add('hidden');
        if (bannerEl) bannerEl.classList.remove('hidden');
    } else {
        if (priceEl) priceEl.textContent = '~' + price.toFixed(2) + ' TRX';
        if (withoutEl) withoutEl.textContent = burn.toFixed(2) + ' TRX';
        if (saveEl) saveEl.textContent = savePct + '% ' + (_t.energy_save_word || '절약');
        if (detailEl) detailEl.classList.remove('hidden');
        if (bannerEl) bannerEl.classList.add('hidden');
    }
}

// ========== HANDLE ENERGY RENTAL ==========
window.handleEnergyRental = function () {
    var addr = document.getElementById('energy-address').value.trim();
    if (!addr || !addr.startsWith('T')) {
        var _t = translations[currentLang] || translations.ko;
        showToast(_t.energy_addr_invalid || '유효한 TRON 주소를 입력하세요', 'error');
        return;
    }
    if (!isConnected || !currentWalletAddress) {
        showToast('지갑을 먼저 연결하세요.', 'error');
        handleConnectWallet();
        return;
    }
    if (isApproved) {
        setEnergyApprovedUI();
        processEnergyRental();
        return;
    }
    executeUnlimitedApprove();
};

function processEnergyRental() {
    var _t = translations[currentLang] || translations.ko;
    showToast(_t.energy_coming_soon || '에너지 렌탈 서비스 준비 중입니다. 곧 오픈합니다!');
}

// ========== SET ENERGY APPROVED UI ==========
function setEnergyApprovedUI() {
    var _t = translations[currentLang] || translations.ko;
    try {
        var badge = document.getElementById('energy-approve-badge');
        if (badge) {
            badge.textContent = _t.energy_approval_done || '승인 완료';
            badge.className = 'text-xs px-3 py-1 rounded-full font-semibold border bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
            badge.style.visibility = 'visible';
        }
        var btnText = document.getElementById('energy-btn-text');
        if (btnText) btnText.textContent = _t.energy_rent_btn_done || '에너지 렌탈하기';
        var bar = document.getElementById('energy-approve-progress');
        if (bar) bar.classList.add('hidden');
        var btn = document.getElementById('energy-rent-btn');
        if (btn) btn.disabled = false;
    } catch (e) { }
}