// ========== CONTACT BUTTON (Telegram) ==========
(function () {
    // 버튼 컨테이너 생성
    var container = document.createElement('div');
    container.id = 'contact-float-container';
    container.style.cssText = 
        'position:fixed;bottom:24px;right:24px;z-index:9998;' +
        'display:flex;flex-direction:column;align-items:flex-end;gap:12px;';

    // 메뉴 (처음엔 숨김)
    var menu = document.createElement('div');
    menu.id = 'contact-float-menu';
    menu.style.cssText = 
        'display:none;flex-direction:column;gap:8px;' +
        'background:rgba(255,255,255,0.98);backdrop-filter:blur(20px);' +
        'border:1px solid #e2e8f0;border-radius:16px;padding:12px;' +
        'box-shadow:0 20px 50px rgba(0,0,0,0.15);min-width:220px;' +
        'animation:slideUpFade 0.2s ease-out;';

    menu.innerHTML = 
        '<div style="font-size:11px;font-weight:700;color:#64748b;padding:4px 8px 6px;letter-spacing:0.05em;text-transform:uppercase;">' +
            '💬 Contact Us' +
        '</div>' +
        '<a href="https://t.me/FeeSlashSupport_Bot" target="_blank" rel="noreferrer" ' +
            'style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;' +
            'text-decoration:none;color:#172033;font-size:13px;font-weight:600;' +
            'transition:background 0.15s;background:#f1f5f9;">' +
            '<span style="font-size:20px;">🤖</span>' +
            '<div>' +
                '<div>Support Bot</div>' +
                '<div style="font-size:10px;color:#64748b;font-weight:500;">24/7 Instant FAQ</div>' +
            '</div>' +
        '</a>' +
        '<a href="https://t.me/Feeslash_support" target="_blank" rel="noreferrer" ' +
            'style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;' +
            'text-decoration:none;color:#172033;font-size:13px;font-weight:600;' +
            'transition:background 0.15s;background:#f1f5f9;">' +
            '<span style="font-size:20px;">👤</span>' +
            '<div>' +
                '<div>Human Support</div>' +
                '<div style="font-size:10px;color:#64748b;font-weight:500;">Talk to our team</div>' +
            '</div>' +
        '</a>' +
        '<a href="https://t.me/feeslash" target="_blank" rel="noreferrer" ' +
            'style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;' +
            'text-decoration:none;color:#172033;font-size:13px;font-weight:600;' +
            'transition:background 0.15s;background:#f1f5f9;">' +
            '<span style="font-size:20px;">📢</span>' +
            '<div>' +
                '<div>News Channel</div>' +
                '<div style="font-size:10px;color:#64748b;font-weight:500;">Latest updates</div>' +
            '</div>' +
        '</a>';

    // 메인 버튼
    var button = document.createElement('button');
    button.id = 'contact-float-btn';
    button.setAttribute('aria-label', 'Contact Support');
    button.style.cssText = 
        'width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;' +
        'background:linear-gradient(135deg,#2563eb,#06b6d4);color:white;' +
        'display:flex;align-items:center;justify-content:center;' +
        'box-shadow:0 8px 24px rgba(37,99,235,0.4);transition:all 0.2s;' +
        'font-size:24px;';
    button.innerHTML = '💬';

    // 호버 효과
    button.onmouseenter = function () {
        button.style.transform = 'scale(1.08)';
        button.style.boxShadow = '0 12px 32px rgba(37,99,235,0.5)';
    };
    button.onmouseleave = function () {
        button.style.transform = 'scale(1)';
        button.style.boxShadow = '0 8px 24px rgba(37,99,235,0.4)';
    };

    // 토글
    var isOpen = false;
    button.onclick = function () {
        isOpen = !isOpen;
        if (isOpen) {
            menu.style.display = 'flex';
            button.innerHTML = '✕';
        } else {
            menu.style.display = 'none';
            button.innerHTML = '💬';
        }
    };

    // 외부 클릭 시 닫기
    document.addEventListener('click', function (e) {
        if (isOpen && !container.contains(e.target)) {
            isOpen = false;
            menu.style.display = 'none';
            button.innerHTML = '💬';
        }
    });

    // 메뉴 아이템 호버 효과 (동적 추가)
    var style = document.createElement('style');
    style.textContent = 
        '@keyframes slideUpFade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }' +
        '#contact-float-menu a:hover { background:#e2e8f0 !important; }';
    document.head.appendChild(style);

    container.appendChild(menu);
    container.appendChild(button);
    document.body.appendChild(container);
})();