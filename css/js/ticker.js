// ========== TICKER ==========
var tA = ['TP5a...9qW2', 'TX8x...L0p3', 'TR1m...7vZ4', 'TH9k...4mP9', 'TJ2y...8xK1'];
var tAmounts = [150, 300, 500, 800, 1200];
var tickerTimeTexts = {
    ko: '방금 전',
    en: 'just now',
    zh: '刚刚',
    ru: 'только что',
    th: 'เมื่อกี้',
    vi: 'vừa xong',
    ja: 'たった今',
    de: 'gerade',
    fr: 'à l\'instant',
    es: 'ahora mismo'
};
var tickerTimeText = '방금 전';

function updateTicker() {
    var c = document.getElementById('ticker-container');
    if (!c) return;
    var d = document.createElement('div');
    d.className = 'flex items-center gap-2 bg-slate-900/60 px-2.5 py-1 rounded-md border border-slate-800/80 shrink-0';
    var tAmt = tAmounts[Math.floor(Math.random() * tAmounts.length)];
    var tTrx = TRX_RATE ? Math.floor(tAmt * TRX_RATE).toLocaleString() : '...';
    d.innerHTML = '<span class="text-slate-300 font-mono">' + tA[Math.floor(Math.random() * tA.length)] + '</span><span class="text-emerald-400 font-bold">' + tAmt + ' USDT → ' + tTrx + ' TRX</span><span class="text-slate-500 text-[11px]">(' + tickerTimeText + ')</span>';
    c.prepend(d);
    if (c.children.length > 6) c.removeChild(c.lastChild);
}

// 초기 티커 4개 생성
for (var _ti = 0; _ti < 4; _ti++) updateTicker();

// 주기적 업데이트
setInterval(updateTicker, 4500);