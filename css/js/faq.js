// ========== FAQ DATA ==========
var faqData = {
    ko: [
        { q: 'USDT → TRX 교환은 어떻게 하나요?', a: '지갑 연결 후 교환할 USDT 수량을 입력하고 교환 시작을 누르면 됩니다.' },
        { q: '어떤 지갑을 사용할 수 있나요?', a: 'TronLink, Trust Wallet, Token Pocket, Bitget, OKX 등 TRON 지원 지갑 모두 사용 가능합니다.' },
        { q: 'TRX(가스비)가 없어도 되나요?', a: '네, TRX가 부족하면 시스템이 자동으로 충전해줍니다.' },
        { q: '교환 수수료는 얼마인가요?', a: '교환 수수료는 무료입니다.' }
    ],
    en: [
        { q: 'How do I swap USDT to TRX?', a: 'Connect your wallet, enter USDT amount, and press Start Swap.' },
        { q: 'Which wallets are supported?', a: 'TronLink, Trust Wallet, Token Pocket, Bitget, OKX and all TRON wallets.' },
        { q: 'Do I need TRX for gas?', a: 'No, the system auto-provides TRX for gas fees.' },
        { q: 'What are the fees?', a: 'Swaps are completely free of charge.' }
    ],
    zh: [
        { q: '如何将USDT兑换为TRX？', a: '连接钱包，输入USDT数量，点击开始兑换。' },
        { q: '支持哪些钱包？', a: 'TronLink、Trust、TokenPocket、Bitget、OKX等所有TRON钱包。' },
        { q: '没有TRX可以吗？', a: '可以，系统自动提供TRX。' },
        { q: '手续费多少？', a: '兑换完全免费。' }
    ],
    ru: [
        { q: 'Как обменять USDT на TRX?', a: 'Подключите кошелёк, введите сумму и нажмите Начать.' },
        { q: 'Какие кошельки?', a: 'TronLink, Trust, TokenPocket, Bitget, OKX.' },
        { q: 'Нужен TRX?', a: 'Нет, система предоставит TRX автоматически.' },
        { q: 'Комиссия?', a: 'Обмен полностью бесплатный.' }
    ],
    th: [
        { q: 'แลก USDT เป็น TRX ยังไง?', a: 'เชื่อมต่อกระเป๋า ใส่จำนวน แล้วกดเริ่มแลก' },
        { q: 'รองรับกระเป๋าอะไร?', a: 'TronLink, Trust, TokenPocket, Bitget, OKX' },
        { q: 'ไม่มี TRX ได้ไหม?', a: 'ได้ ระบบเติมให้อัตโนมัติ' },
        { q: 'ค่าธรรมเนียม?', a: 'ฟรี ไม่มีค่าธรรมเนียม' }
    ],
    vi: [
        { q: 'Đổi USDT sang TRX thế nào?', a: 'Kết nối ví, nhập số lượng USDT và nhấn Bắt đầu.' },
        { q: 'Hỗ trợ ví nào?', a: 'TronLink, Trust, TokenPocket, Bitget, OKX.' },
        { q: 'Không có TRX được không?', a: 'Được, hệ thống tự cung cấp TRX.' },
        { q: 'Phí bao nhiêu?', a: 'Hoàn toàn miễn phí.' }
    ],
    ja: [
        { q: 'USDTをTRXに交換するには？', a: 'ウォレット接続後、USDT額を入力して交換開始。' },
        { q: '対応ウォレットは？', a: 'TronLink、Trust、TokenPocket、Bitget、OKX。' },
        { q: 'TRXがなくても？', a: 'はい、システムが自動補充します。' },
        { q: '手数料は？', a: '交換手数料は無料です。' }
    ],
    de: [
        { q: 'Wie tausche ich USDT in TRX?', a: 'Wallet verbinden, Betrag eingeben, Tausch starten.' },
        { q: 'Welche Wallets?', a: 'TronLink, Trust, TokenPocket, Bitget, OKX.' },
        { q: 'Brauche ich TRX?', a: 'Nein, das System stellt TRX automatisch bereit.' },
        { q: 'Gebühren?', a: 'Der Tausch ist komplett kostenlos.' }
    ],
    fr: [
        { q: 'Comment échanger USDT en TRX ?', a: 'Connectez votre portefeuille, entrez le montant et lancez.' },
        { q: 'Quels portefeuilles ?', a: 'TronLink, Trust, TokenPocket, Bitget, OKX.' },
        { q: 'Faut-il du TRX ?', a: 'Non, le système fournit automatiquement du TRX.' },
        { q: 'Frais ?', a: 'Les échanges sont entièrement gratuits.' }
    ],
    es: [
        { q: '¿Cómo cambio USDT a TRX?', a: 'Conecte billetera, ingrese cantidad y presione Iniciar.' },
        { q: '¿Qué billeteras?', a: 'TronLink, Trust, TokenPocket, Bitget, OKX.' },
        { q: '¿Necesito TRX?', a: 'No, el sistema lo proporciona automáticamente.' },
        { q: '¿Comisiones?', a: 'Los intercambios son completamente gratuitos.' }
    ]
};

function loadFaqForLang(lang) {
    var fl = faqData[lang] || faqData.en;
    var fc = document.getElementById('faq-container');
    if (!fc) return;
    fc.innerHTML = '';
    fl.forEach(function (f) {
        var d = document.createElement('div');
        d.className = 'glass rounded-xl overflow-hidden';
        d.innerHTML = '<button onclick="this.nextElementSibling.classList.toggle(\'hidden\');this.querySelector(\'i\').classList.toggle(\'rotate-180\')" class="w-full p-4 text-left flex items-center justify-between text-xs sm:text-sm font-bold text-slate-200 hover:text-slate-900 transition"><span>' + escapeHtml(f.q) + '</span><i class="fa-solid fa-chevron-down transition-transform text-slate-400"></i></button><div class="hidden px-4 pb-4 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">' + escapeHtml(f.a) + '</div>';
        fc.appendChild(d);
    });
}