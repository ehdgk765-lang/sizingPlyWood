(function () {
    'use strict';

    // === 상태 ===
    var parts = [];
    var partIdCounter = 0;

    var COLORS = [
        '#e94560', '#4fc3f7', '#66bb6a', '#ffa726', '#ab47bc',
        '#ef5350', '#26c6da', '#9ccc65', '#ffca28', '#7e57c2',
        '#ff7043', '#26a69a', '#d4e157', '#ffee58', '#5c6bc0',
        '#ec407a', '#42a5f5', '#8d6e63', '#78909c', '#c0ca33'
    ];

    // === DOM 헬퍼 ===
    var $ = function (id) { return document.getElementById(id); };

    // === 테마 관리 ===
    function initTheme() {
        var saved = localStorage.getItem('plywood-theme');
        if (saved === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    }

    function toggleTheme() {
        var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('plywood-theme', 'light');
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('plywood-theme', 'dark');
        }
    }

    function isDarkTheme() {
        return document.documentElement.getAttribute('data-theme') === 'dark';
    }

    // 페이지 로드 전 테마 적용 (깜빡임 방지)
    initTheme();

    // === 보안코드 ===
    var CODE_HASH = 'b62764dc19af7e6a2fd312662a2fe207d273a883e64bf87bd0ec755007649e6c';

    function sha256(str) {
        var encoder = new TextEncoder();
        var data = encoder.encode(str);
        return crypto.subtle.digest('SHA-256', data).then(function (buf) {
            var arr = new Uint8Array(buf);
            var hex = '';
            for (var i = 0; i < arr.length; i++) {
                hex += ('0' + arr[i].toString(16)).slice(-2);
            }
            return hex;
        });
    }

    function checkLock() {
        if (sessionStorage.getItem('plywood-unlocked') === 'true') {
            $('lockScreen').classList.add('hidden');
            return;
        }
        $('lockCode').focus();
    }

    function attemptUnlock() {
        var code = $('lockCode').value;
        if (code.length !== 4) {
            showLockError('4자리 숫자를 입력해주세요');
            return;
        }
        sha256(code).then(function (hash) {
            if (hash === CODE_HASH) {
                sessionStorage.setItem('plywood-unlocked', 'true');
                $('lockScreen').classList.add('hidden');
            } else {
                showLockError('보안코드가 일치하지 않습니다');
                $('lockCode').value = '';
                $('lockCode').classList.add('shake');
                setTimeout(function () {
                    $('lockCode').classList.remove('shake');
                }, 500);
            }
        });
    }

    function showLockError(msg) {
        $('lockError').textContent = msg;
    }

    // === 초기화 ===
    document.addEventListener('DOMContentLoaded', function () {
        // 잠금 화면
        checkLock();
        $('lockSubmit').addEventListener('click', attemptUnlock);
        $('lockCode').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') attemptUnlock();
        });

        $('btnAdd').addEventListener('click', addPart);
        $('btnCalc').addEventListener('click', calculate);
        $('btnClear').addEventListener('click', clearAll);
        $('themeToggle').addEventListener('click', toggleTheme);

        // Enter 키로 부재 추가
        ['partName', 'partWidth', 'partHeight', 'partQty'].forEach(function (id) {
            $(id).addEventListener('keydown', function (e) {
                if (e.key === 'Enter') addPart();
            });
        });
    });

    // === 부재 추가 ===
    function addPart() {
        var name = $('partName').value.trim() || ('부재 ' + (parts.length + 1));
        var w = parseInt($('partWidth').value);
        var h = parseInt($('partHeight').value);
        var qty = parseInt($('partQty').value) || 1;

        if (!w || !h || w <= 0 || h <= 0) {
            alert('가로, 세로 값을 올바르게 입력해주세요.');
            return;
        }

        var sheetW = parseInt($('sheetWidth').value);
        var sheetH = parseInt($('sheetHeight').value);
        if (w > sheetW && w > sheetH) {
            alert('부재의 가로가 합판보다 큽니다.');
            return;
        }
        if (h > sheetW && h > sheetH) {
            alert('부재의 세로가 합판보다 큽니다.');
            return;
        }

        parts.push({
            id: partIdCounter++,
            name: name,
            width: w,
            height: h,
            qty: qty,
            color: COLORS[parts.length % COLORS.length]
        });

        renderPartsTable();

        $('partName').value = '';
        $('partWidth').value = '';
        $('partHeight').value = '';
        $('partQty').value = '1';
        $('partWidth').focus();
    }

    // === 부재 목록 렌더링 ===
    function renderPartsTable() {
        if (parts.length === 0) {
            $('emptyState').style.display = '';
            $('partsTable').style.display = 'none';
            return;
        }
        $('emptyState').style.display = 'none';
        $('partsTable').style.display = '';

        var tbody = $('partsBody');
        tbody.innerHTML = '';

        parts.forEach(function (p, idx) {
            var tr = document.createElement('tr');
            tr.innerHTML =
                '<td><span class="color-dot" style="background:' + p.color + '"></span></td>' +
                '<td>' + escapeHtml(p.name) + '</td>' +
                '<td>' + p.width + '</td>' +
                '<td>' + p.height + '</td>' +
                '<td>' +
                '  <div class="qty-controls">' +
                '    <button class="qty-btn" data-action="dec" data-idx="' + idx + '">-</button>' +
                '    <span class="qty-value">' + p.qty + '</span>' +
                '    <button class="qty-btn" data-action="inc" data-idx="' + idx + '">+</button>' +
                '  </div>' +
                '</td>' +
                '<td><button class="btn-delete" data-idx="' + idx + '">&times;</button></td>';
            tbody.appendChild(tr);
        });

        // 수량 버튼 이벤트
        tbody.querySelectorAll('.qty-btn').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                var idx = parseInt(e.target.dataset.idx);
                var action = e.target.dataset.action;
                if (action === 'inc') parts[idx].qty++;
                if (action === 'dec' && parts[idx].qty > 1) parts[idx].qty--;
                renderPartsTable();
            });
        });

        // 삭제 버튼 이벤트
        tbody.querySelectorAll('.btn-delete').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                var idx = parseInt(e.target.dataset.idx);
                parts.splice(idx, 1);
                renderPartsTable();
            });
        });
    }

    // === 전체 초기화 ===
    function clearAll() {
        parts = [];
        partIdCounter = 0;
        renderPartsTable();
        $('resultSection').style.display = 'none';
    }

    // === 계산 ===
    function calculate() {
        if (parts.length === 0) {
            alert('부재를 추가해주세요.');
            return;
        }

        var sheetW = parseInt($('sheetWidth').value);
        var sheetH = parseInt($('sheetHeight').value);
        var kerf = parseInt($('sawKerf').value) || 0;
        var allowRotation = $('allowRotation').checked;

        // 부재 목록 펼치기 (수량 반영)
        var expandedParts = [];
        parts.forEach(function (p) {
            for (var i = 0; i < p.qty; i++) {
                expandedParts.push({
                    width: p.width,
                    height: p.height,
                    name: p.name,
                    color: p.color,
                    origIndex: p.id
                });
            }
        });

        // 큰 면적 순으로 정렬 (Decreasing Area First Fit)
        expandedParts.sort(function (a, b) {
            var areaA = a.width * a.height;
            var areaB = b.width * b.height;
            if (areaB !== areaA) return areaB - areaA;
            return Math.max(b.width, b.height) - Math.max(a.width, a.height);
        });

        // Guillotine Bin Packing
        var sheets = [];

        function createSheet() {
            return {
                width: sheetW,
                height: sheetH,
                freeRects: [{ x: 0, y: 0, w: sheetW, h: sheetH }],
                placements: []
            };
        }

        function tryPlace(sheet, pw, ph) {
            var bestIdx = -1;
            var bestShortSide = Infinity;
            var bestLongSide = Infinity;

            for (var i = 0; i < sheet.freeRects.length; i++) {
                var r = sheet.freeRects[i];
                if (pw <= r.w && ph <= r.h) {
                    var shortSide = Math.min(r.w - pw, r.h - ph);
                    var longSide = Math.max(r.w - pw, r.h - ph);
                    if (shortSide < bestShortSide ||
                        (shortSide === bestShortSide && longSide < bestLongSide)) {
                        bestIdx = i;
                        bestShortSide = shortSide;
                        bestLongSide = longSide;
                    }
                }
            }

            if (bestIdx === -1) return null;

            var r = sheet.freeRects[bestIdx];
            var placement = { x: r.x, y: r.y, w: pw, h: ph };

            // Guillotine split
            sheet.freeRects.splice(bestIdx, 1);

            var rightW = r.w - pw - kerf;
            var bottomH = r.h - ph - kerf;

            if (rightW * r.h > r.w * bottomH) {
                if (rightW > 0) {
                    sheet.freeRects.push({
                        x: r.x + pw + kerf, y: r.y,
                        w: rightW, h: r.h
                    });
                }
                if (bottomH > 0) {
                    sheet.freeRects.push({
                        x: r.x, y: r.y + ph + kerf,
                        w: pw, h: bottomH
                    });
                }
            } else {
                if (bottomH > 0) {
                    sheet.freeRects.push({
                        x: r.x, y: r.y + ph + kerf,
                        w: r.w, h: bottomH
                    });
                }
                if (rightW > 0) {
                    sheet.freeRects.push({
                        x: r.x + pw + kerf, y: r.y,
                        w: rightW, h: ph
                    });
                }
            }

            return placement;
        }

        expandedParts.forEach(function (part) {
            var placed = false;

            for (var s = 0; s < sheets.length; s++) {
                var result = tryPlace(sheets[s], part.width, part.height);
                if (result) {
                    sheets[s].placements.push(assign({}, result, part, { rotated: false }));
                    placed = true;
                    break;
                }

                if (allowRotation && part.width !== part.height) {
                    result = tryPlace(sheets[s], part.height, part.width);
                    if (result) {
                        sheets[s].placements.push(assign({}, result, part, {
                            w: part.height, h: part.width, rotated: true
                        }));
                        placed = true;
                        break;
                    }
                }
            }

            if (!placed) {
                var newSheet = createSheet();
                var result = tryPlace(newSheet, part.width, part.height);
                if (!result && allowRotation && part.width !== part.height) {
                    result = tryPlace(newSheet, part.height, part.width);
                    if (result) {
                        newSheet.placements.push(assign({}, result, part, {
                            w: part.height, h: part.width, rotated: true
                        }));
                    }
                } else if (result) {
                    newSheet.placements.push(assign({}, result, part, { rotated: false }));
                }
                sheets.push(newSheet);
            }
        });

        // 통계 계산
        var totalSheetArea = sheets.length * sheetW * sheetH;
        var usedArea = expandedParts.reduce(function (s, p) { return s + p.width * p.height; }, 0);
        var wasteArea = totalSheetArea - usedArea;
        var efficiencyPct = ((usedArea / totalSheetArea) * 100).toFixed(1);

        // 결과 표시
        $('resultSection').style.display = '';
        $('totalSheets').textContent = sheets.length;
        $('totalParts').textContent = expandedParts.length;
        $('efficiency').textContent = efficiencyPct + '%';
        $('wasteArea').textContent = (wasteArea / 1000000).toFixed(2);

        // 시각화
        renderSheets(sheets, sheetW, sheetH);

        // 결과 영역으로 스크롤
        $('resultSection').scrollIntoView({ behavior: 'smooth' });
    }

    // === 시각화 ===
    var lastSheets = null;
    var lastSheetW = 0;
    var lastSheetH = 0;

    function renderSheets(sheets, sheetW, sheetH) {
        lastSheets = sheets;
        lastSheetW = sheetW;
        lastSheetH = sheetH;

        var container = $('sheetsVisualization');
        container.innerHTML = '';

        var grid = document.createElement('div');
        grid.className = 'sheets-grid';
        container.appendChild(grid);

        // 썸네일용 고정 해상도 (작게)
        var thumbW = 300;
        var thumbScale = thumbW / sheetW;
        var thumbH = Math.floor(sheetH * thumbScale);

        sheets.forEach(function (sheet, idx) {
            var div = document.createElement('div');
            div.className = 'sheet-visual';
            div.setAttribute('data-idx', idx);

            var usedArea = sheet.placements.reduce(function (s, p) { return s + p.w * p.h; }, 0);
            var eff = ((usedArea / (sheetW * sheetH)) * 100).toFixed(1);

            div.innerHTML =
                '<h3>#' + (idx + 1) + ' (부재 ' + sheet.placements.length + '개, ' + eff + '%)</h3>' +
                '<div class="sheet-canvas-wrapper">' +
                '  <canvas width="' + thumbW + '" height="' + thumbH + '"></canvas>' +
                '</div>';
            grid.appendChild(div);

            var canvas = div.querySelector('canvas');
            drawSheet(canvas, sheet, sheetW, sheetH, thumbScale);

            // 클릭 시 모달 확대
            div.addEventListener('click', function () {
                openModal(idx);
            });
        });

        // 모달 이벤트 등록
        $('modalClose').onclick = closeModal;
        $('sheetModal').onclick = function (e) {
            if (e.target === $('sheetModal')) closeModal();
        };
    }

    function drawSheet(canvas, sheet, sheetW, sheetH, scale) {
        var ctx = canvas.getContext('2d');
        var cw = canvas.width;
        var ch = canvas.height;

        var dark = isDarkTheme();
        var canvasBg = dark ? '#2a2a4a' : '#dde3ea';
        var canvasStroke = dark ? '#4fc3f7' : '#0f3460';
        var canvasLabel = dark ? '#888' : '#666';

        // 배경
        ctx.fillStyle = canvasBg;
        ctx.fillRect(0, 0, cw, ch);

        // 테두리
        ctx.strokeStyle = canvasStroke;
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, cw - 2, ch - 2);

        // 부재 배치
        sheet.placements.forEach(function (p) {
            var x = p.x * scale;
            var y = p.y * scale;
            var w = p.w * scale;
            var h = p.h * scale;

            ctx.fillStyle = p.color + 'CC';
            ctx.fillRect(x + 1, y + 1, w - 2, h - 2);

            ctx.strokeStyle = p.color;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

            var fontSize = Math.max(8, Math.min(14, Math.min(w, h) * 0.25));
            ctx.fillStyle = '#fff';
            ctx.font = 'bold ' + fontSize + 'px "Pretendard Variable", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            var displayW = p.rotated ? p.height : p.width;
            var displayH = p.rotated ? p.width : p.height;
            var text = p.name;
            var sizeText = displayW + '\u00D7' + displayH;

            if (h > fontSize * 3 && w > 40) {
                ctx.fillText(text, x + w / 2, y + h / 2 - fontSize * 0.6, w - 4);
                ctx.font = (fontSize * 0.8) + 'px "Pretendard Variable", sans-serif';
                ctx.fillStyle = '#eee';
                ctx.fillText(sizeText, x + w / 2, y + h / 2 + fontSize * 0.6, w - 4);
            } else if (w > 30) {
                ctx.fillText(text, x + w / 2, y + h / 2, w - 4);
            }

            if (p.rotated) {
                ctx.font = Math.max(8, fontSize * 0.7) + 'px "Pretendard Variable", sans-serif';
                ctx.fillStyle = '#ffca28';
                ctx.textAlign = 'right';
                ctx.fillText('R', x + w - 3, y + 10);
            }
        });

        // 사이즈 라벨
        ctx.fillStyle = canvasLabel;
        ctx.font = '10px "Pretendard Variable", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(sheetW + ' mm', cw / 2, ch - 3);
        ctx.save();
        ctx.translate(10, ch / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(sheetH + ' mm', 0, 0);
        ctx.restore();
    }

    // === 모달 ===
    function openModal(idx) {
        var sheet = lastSheets[idx];
        var sheetW = lastSheetW;
        var sheetH = lastSheetH;

        var usedArea = sheet.placements.reduce(function (s, p) { return s + p.w * p.h; }, 0);
        var eff = ((usedArea / (sheetW * sheetH)) * 100).toFixed(1);

        $('modalTitle').textContent = '#' + (idx + 1) + ' 합판 (부재 ' + sheet.placements.length + '개, 효율 ' + eff + '%)';

        // 모달용 큰 캔버스
        var maxW = Math.min(window.innerWidth - 80, 700);
        var bigScale = maxW / sheetW;
        var bigW = Math.floor(sheetW * bigScale);
        var bigH = Math.floor(sheetH * bigScale);

        var canvas = $('modalCanvas');
        canvas.width = bigW;
        canvas.height = bigH;
        drawSheet(canvas, sheet, sheetW, sheetH, bigScale);

        $('sheetModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        $('sheetModal').classList.remove('active');
        document.body.style.overflow = '';
    }

    // ESC로 모달 닫기
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeModal();
    });

    // === 유틸리티 ===
    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function assign(target) {
        for (var i = 1; i < arguments.length; i++) {
            var source = arguments[i];
            if (source) {
                for (var key in source) {
                    if (source.hasOwnProperty(key)) {
                        target[key] = source[key];
                    }
                }
            }
        }
        return target;
    }
})();
