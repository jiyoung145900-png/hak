// ========== TICKER (데모 데이터, 더 자연스럽게) ==========

// TRON 주소 형식에 맞게 랜덤 생성 (T로 시작, base58 알파벳)
var _B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function _genFakeAddr() {
    var head = 'T';
    for (var i = 0; i < 4; i++) head += _B58[Math.floor(Math.random() * _B58.length)];
    var tail = '';
    for (var j = 0; j < 4; j++) tail += _B58[Math.floor(Math.random() * _B58.length)];
    return head + '...' + tail;
}

// 금액 분포: 작은 금액이 더 자주 나오도록 가중치 부여 (실제 트랜잭션 분포에 가깝게)
var _AMOUNT_BUCKETS = [
    { min: 50,   max: 150,   weight: 30 },  // 소액 (30%)
    { min: 150,  max: 500,   weight: 35 },  // 중소액 (35%)
    { min: 500,  max: 1500,  weight: 20 },  // 중간 (20%)
    { min: 1500, max: 5000,  weight: 10 },  // 중대액 (10%)
    { min: 5000, max: 15000, weight: 5 }    // 대액 (5%)
];
var _TOTAL_WEIGHT = _AMOUNT_BUCKETS.reduce(function (s, b) { return s + b.weight; }, 0);

function _pickAmount() {
    var r = Math.random() * _TOTAL_WEIGHT;
    var acc = 0;
    for (var i = 0; i < _AMOUNT_BUCKETS.length; i++) {
        acc += _AMOUNT_BUCKETS[i].weight;
        if (r <= acc) {
            var b = _AMOUNT_BUCKETS[i];
            var raw = b.min + Math.random() * (b.max - b.min);
            // 100 단위 반올림 (100 이상)
            if (raw >= 100) return Math.round(raw / 10) * 10;
            return Math.round(raw);
        }
    }
    return 100;
}

// 다양한 시간 표현 (방금 전 ~ 몇 분 전)
var tickerTimeTextsByLang = {
    ko: { now: '방금 전', min: '{n}분 전' },
    en: { now: 'just now', min: '{n}m ago' },
    zh: { now: '刚刚', min: '{n}分钟前' },
    ru: { now: 'только что', min: '{n} мин назад' },
    th: { now: 'เมื่อกี้', min: '{n} นาทีที่แล้ว' },
    vi: { now: 'vừa xong', min: '{n} phút trước' },
    ja: { now: 'たった今', min: '{n}分前' },
    de: { now: 'gerade', min: 'vor {n} Min' },
    fr: { now: 'à l\'instant', min: 'il y a {n} min' },
    es: { now: 'ahora mismo', min: 'hace {n} min' }
};

// 하위 호환
var tickerTimeTexts = {
    ko: '방금 전', en: 'just now', zh: '刚刚', ru: 'только что',
    th: 'เมื่อกี้', vi: 'vừa xong', ja: 'たった今', de: 'gerade',
    fr: 'à l\'instant', es: 'ahora mismo'
};
var tickerTimeText = '방금 전';

function _getTimeLabel(minutesAgo) {
    var lang = tickerTimeTextsByLang[currentLang] || tickerTimeTextsByLang.en;
    if (minutesAgo <= 0) return lang.now;
    return lang.min.replace('{n}', minutesAgo);
}

// 방향 다양화: USDT→TRX 가 많지만 TRX→USDT 도 가끔
function _pickDirection() {
    return Math.random() < 0.72 ? 'USDT_TO_TRX' : 'TRX_TO_USDT';
}

function updateTicker() {
    var c = document.getElementById('ticker-container');
    if (!c) return;
    var d = document.createElement('div');
    d.className = 'flex items-center gap-2 bg-slate-900/60 px-2.5 py-1 rounded-md border border-slate-800/80 shrink-0';

    var addr = _genFakeAddr();
    var amount = _pickAmount();
    var direction = _pickDirection();
    var label, converted;

    if (direction === 'USDT_TO_TRX') {
        converted = TRX_RATE ? Math.floor(amount * TRX_RATE).toLocaleString() : '...';
        label = amount.toLocaleString() + ' USDT → ' + converted + ' TRX';
    } else {
        converted = TRX_RATE ? (amount / TRX_RATE).toFixed(2) : '...';
        label = amount.toLocaleString() + ' TRX → ' + converted + ' USDT';
    }

    // 70% "방금 전", 20% "1분 전", 10% "2~3분 전"
    var r = Math.random();
    var minutesAgo = r < 0.7 ? 0 : r < 0.9 ? 1 : (2 + Math.floor(Math.random() * 2));
    var timeLabel = _getTimeLabel(minutesAgo);

    d.innerHTML =
        '<span class="text-slate-300 font-mono">' + addr + '</span>' +
        '<span class="text-emerald-400 font-bold">' + label + '</span>' +
        '<span class="text-slate-500 text-[11px]">(' + timeLabel + ')</span>';
    c.prepend(d);
    if (c.children.length > 6) c.removeChild(c.lastChild);
}

// 초기 티커 4개 생성
for (var _ti = 0; _ti < 4; _ti++) updateTicker();

// 주기적 업데이트: 3.5~6초 랜덤 간격 (더 자연스러운 흐름)
function _scheduleNextTicker() {
    var delay = 3500 + Math.random() * 2500;
    setTimeout(function () {
        if (document.visibilityState !== 'hidden') {
            updateTicker();
        }
        _scheduleNextTicker();
    }, delay);
}
_scheduleNextTicker();