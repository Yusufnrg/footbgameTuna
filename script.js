// ===================================================================
// ⚽ Futbol Algoritma Oyunu - Ana Oyun Mantığı
// ===================================================================

(function () {
    'use strict';

    // ───────────────────────────────────────────────
    // 1. SEVİYE VERİLERİ
    // ───────────────────────────────────────────────
    // Her seviye: rows, cols, ballStart [row,col], goal [row,col],
    // defenders [[row,col], ...], optimalMoves (yıldız hesabı)
    // Top yukarıya (row azalan yön) hareket eder.
    // Kale satır 0'da bulunur. ŞUT_ÇEK: top satır 1'de ve kaleyle aynı sütunda olmalı.
    // ÇALIM_AT: sadece 1 kare sağa veya sola gider (ileri gitmez).
    // İLERİ_SÜR(x): x kare yukarı (satır azaltır).

    const LEVELS = [
        {
            // Seviye 1: Düz ileri, engel yok
            // ŞUT_ÇEK from start → ball flies [4,2]→[3,2]→[2,2]→[1,2]→[0,2] GOL → 1 komut
            name: 'Seviye 1 – Isınma',
            description: 'Topu düz ileri götür ve kaleye şut çek! Hiç engel yok, kolay! 😊',
            rows: 6,
            cols: 5,
            ballStart: [5, 2],
            goal: [0, 2],
            defenders: [],
            optimalMoves: 1
        },
        {
            // Seviye 2: Tek engel
            // Ball [6,2] → İLERİ_SÜR(2)→[4,2], ÇALIM_AT(SAĞ)→[4,3],
            // İLERİ_SÜR(3)→[1,3], ÇALIM_AT(SOL)→[1,2], ŞUT_ÇEK → 5 komut
            name: 'Seviye 2 – İlk Engel',
            description: 'Önünde bir savunmacı var! Yana kaç, etrafından dolan ve şut çek! 🏃',
            rows: 7,
            cols: 5,
            ballStart: [6, 2],
            goal: [0, 2],
            defenders: [[3, 2]],
            optimalMoves: 5
        },
        {
            // Seviye 3: İki engel
            // Ball [7,3] → İLERİ_SÜR(2)→[5,3], ÇALIM_AT(SAĞ)→[5,4],
            // İLERİ_SÜR(2)→[3,4], ÇALIM_AT(SOL)→[3,3],
            // ŞUT_ÇEK → top [2,3]→[1,3]→[0,3] GOL! → 5 komut
            name: 'Seviye 3 – Çift Engel',
            description: 'Bu sefer iki savunmacı var! İkisini de geçebilir misin? 💪',
            rows: 8,
            cols: 7,
            ballStart: [7, 3],
            goal: [0, 3],
            defenders: [[4, 3], [2, 4]],
            optimalMoves: 5
        },
        {
            // Seviye 4: Üç engel, koridor
            // Ball [7,3] → İLERİ_SÜR(1)→[6,3], ÇALIM_AT(SAĞ)→[6,4],
            // İLERİ_SÜR(3)→[3,4], ÇALIM_AT(SOL)→[3,3],
            // ŞUT_ÇEK → top [2,3]→[1,3]→[0,3] GOL! → 5 komut
            name: 'Seviye 4 – Dar Koridor',
            description: 'Savunmacılar arasında dar bir yol var. Dikkatli ilerle! 🤔',
            rows: 8,
            cols: 7,
            ballStart: [7, 3],
            goal: [0, 3],
            defenders: [[5, 3], [3, 2], [2, 4]],
            optimalMoves: 5
        },
        {
            // Seviye 5: Zikzak — 3 engel
            // Ball [8,3] → İLERİ_SÜR(1)→[7,3], ÇALIM_AT(SAĞ)→[7,4],
            // İLERİ_SÜR(2)→[5,4], ÇALIM_AT(SOL)→[5,3],
            // İLERİ_SÜR(2)→[3,3], ÇALIM_AT(SAĞ)→[3,4],
            // İLERİ_SÜR(2)→[1,4], ÇALIM_AT(SOL)→[1,3],
            // ŞUT_ÇEK → 9 komut
            name: 'Seviye 5 – Zikzak',
            description: 'Sağa sola zikzak yaparak savunmacıları geç! Gerçek bir dribling! ⚡',
            rows: 9,
            cols: 7,
            ballStart: [8, 3],
            goal: [0, 3],
            defenders: [[6, 3], [4, 4], [2, 3]],
            optimalMoves: 9
        },
        {
            // Seviye 6: Duvar geçişi — 3'lü defans duvarı
            // Ball [8,3] → İLERİ_SÜR(3)→[5,3], ÇALIM_AT(SAĞ)→[5,4],
            // ÇALIM_AT(SAĞ)→[5,5], İLERİ_SÜR(2)→[3,5],
            // ÇALIM_AT(SOL)→[3,4], ÇALIM_AT(SOL)→[3,3],
            // ŞUT_ÇEK → top [2,3]→[1,3]→[0,3] GOL! → 7 komut
            name: 'Seviye 6 – Duvar Geçişi',
            description: 'Savunmacılar duvar gibi dizilmiş! Etrafından dolanabilir misin? 🧱',
            rows: 9,
            cols: 7,
            ballStart: [8, 3],
            goal: [0, 3],
            defenders: [[4, 2], [4, 3], [4, 4], [2, 2], [2, 5]],
            optimalMoves: 7
        },
        {
            // Seviye 7: Uzman — çok engel
            // Defenders: [6,3], [6,2], [4,4], [3,3], [2,4]
            // Ball [9,3] → İLERİ_SÜR(2)→[7,3], ÇALIM_AT(SAĞ)→[7,4],
            // İLERİ_SÜR(2)→[5,4], ÇALIM_AT(SOL)→[5,3],
            // İLERİ_SÜR(1)→[4,3], ÇALIM_AT(SOL)→[4,2],
            // İLERİ_SÜR(2)→[2,2], ÇALIM_AT(SAĞ)→[2,3],
            // ŞUT_ÇEK → top [1,3]→[0,3] GOL! → 9 komut
            name: 'Seviye 7 – Uzman',
            description: 'En zor seviye! En kısa yolu bulabilir misin? Sen bir şampiyonsun! 🏆',
            rows: 10,
            cols: 7,
            ballStart: [9, 3],
            goal: [0, 3],
            defenders: [[6, 3], [6, 2], [4, 4], [3, 3], [2, 4]],
            optimalMoves: 9
        }
    ];

    // ───────────────────────────────────────────────
    // 2. OYUN DURUMU
    // ───────────────────────────────────────────────

    const state = {
        currentLevel: 0,
        ballPos: [0, 0],       // mevcut top [row, col]
        commands: [],           // [ { type, param } ]
        isRunning: false,
        moveCount: 0,
        starsEarned: [0, 0, 0, 0, 0, 0, 0]  // her seviyenin en iyi yıldızı
    };

    // ───────────────────────────────────────────────
    // 3. DOM REFERANSLARİ
    // ───────────────────────────────────────────────

    const dom = {
        levelSelect: document.getElementById('level-select'),
        starDisplay: document.getElementById('star-display'),
        moveCount: document.getElementById('move-count'),
        gameGrid: document.getElementById('game-grid'),
        messageIcon: document.getElementById('message-icon'),
        messageText: document.getElementById('message-text'),
        messageBox: document.getElementById('message-box'),
        btnIleri: document.getElementById('btn-ileri'),
        btnCalim: document.getElementById('btn-calim'),
        btnSut: document.getElementById('btn-sut'),
        ileriInput: document.getElementById('ileri-input'),
        calimSelect: document.getElementById('calim-select'),
        commandList: document.getElementById('command-list'),
        btnRun: document.getElementById('btn-run'),
        btnReset: document.getElementById('btn-reset'),
        btnClear: document.getElementById('btn-clear'),
        resultBox: document.getElementById('result-box'),
        resultContent: document.getElementById('result-content'),
        goalOverlay: document.getElementById('goal-overlay'),
        goalStars: document.getElementById('goal-stars'),
        goalMessage: document.getElementById('goal-message'),
        goalNext: document.getElementById('goal-next'),
        goalClose: document.getElementById('goal-close'),
        errorOverlay: document.getElementById('error-overlay'),
        errorMessage: document.getElementById('error-message'),
        errorClose: document.getElementById('error-close')
    };

    // ───────────────────────────────────────────────
    // 4. SEVİYE YÜKLEME & GRİD OLUŞTURMA
    // ───────────────────────────────────────────────

    function initLevelSelect() {
        dom.levelSelect.innerHTML = '';
        LEVELS.forEach((lvl, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = lvl.name;
            dom.levelSelect.appendChild(opt);
        });
        dom.levelSelect.value = state.currentLevel;
    }

    function loadLevel(index) {
        state.currentLevel = index;
        const lvl = LEVELS[index];
        state.ballPos = [...lvl.ballStart];
        state.commands = [];
        state.isRunning = false;
        state.moveCount = 0;

        dom.levelSelect.value = index;
        renderGrid();
        renderCommandList();
        updateMoveCount();
        updateStarDisplay();
        setMessage('💡', lvl.description, '');
        dom.resultBox.classList.add('hidden');
        enableControls(true);
    }

    function renderGrid() {
        const lvl = LEVELS[state.currentLevel];
        const { rows, cols, goal, defenders } = lvl;
        const [ballR, ballC] = state.ballPos;

        dom.gameGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        dom.gameGrid.innerHTML = '';

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.row = r;
                cell.dataset.col = c;

                const isBall = r === ballR && c === ballC;
                const isGoal = r === goal[0] && c === goal[1];
                const isDefender = defenders.some(d => d[0] === r && d[1] === c);

                const content = document.createElement('span');
                content.className = 'cell-content';

                if (isBall && isGoal) {
                    cell.classList.add('cell-ball-goal');
                    content.textContent = '⚽';
                } else if (isBall) {
                    cell.classList.add('cell-ball');
                    content.textContent = '⚽';
                } else if (isGoal) {
                    cell.classList.add('cell-goal');
                    content.textContent = '🥅';
                } else if (isDefender) {
                    cell.classList.add('cell-defender');
                    content.textContent = '🛡️';
                } else {
                    cell.classList.add('cell-grass');
                }

                cell.appendChild(content);
                dom.gameGrid.appendChild(cell);
            }
        }
    }

    function getCell(row, col) {
        return dom.gameGrid.querySelector(
            `.grid-cell[data-row="${row}"][data-col="${col}"]`
        );
    }

    // ───────────────────────────────────────────────
    // 5. KOMUT SİSTEMİ
    // ───────────────────────────────────────────────

    function addCommand(type, param) {
        if (state.isRunning) return;
        state.commands.push({ type, param });
        renderCommandList();
        updateMoveCount();
    }

    function removeCommand(index) {
        if (state.isRunning) return;
        state.commands.splice(index, 1);
        renderCommandList();
        updateMoveCount();
    }

    function moveCommand(index, direction) {
        if (state.isRunning) return;
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= state.commands.length) return;
        const temp = state.commands[index];
        state.commands[index] = state.commands[newIndex];
        state.commands[newIndex] = temp;
        renderCommandList();
    }

    function clearCommands() {
        if (state.isRunning) return;
        state.commands = [];
        renderCommandList();
        updateMoveCount();
    }

    function renderCommandList() {
        dom.commandList.innerHTML = '';
        if (state.commands.length === 0) {
            dom.commandList.innerHTML = '<p class="empty-msg">Komut eklemek için yukarıdaki butonlara tıkla! 👆</p>';
            return;
        }

        state.commands.forEach((cmd, i) => {
            const item = document.createElement('div');
            item.className = 'command-item';
            item.dataset.index = i;

            // Number
            const num = document.createElement('span');
            num.className = 'cmd-number';
            num.textContent = i + 1;

            // Text
            const text = document.createElement('span');
            text.className = 'cmd-text';

            if (cmd.type === 'İLERİ_SÜR') {
                text.textContent = `İLERİ_SÜR(${cmd.param})`;
                text.classList.add('type-ileri');
            } else if (cmd.type === 'ÇALIM_AT') {
                text.textContent = `ÇALIM_AT(${cmd.param})`;
                text.classList.add('type-calim');
            } else {
                text.textContent = 'ŞUT_ÇEK';
                text.classList.add('type-sut');
            }

            // Move buttons
            const moveBtns = document.createElement('div');
            moveBtns.className = 'cmd-move-btns';
            const upBtn = document.createElement('button');
            upBtn.className = 'cmd-move-btn';
            upBtn.textContent = '▲';
            upBtn.title = 'Yukarı taşı';
            upBtn.addEventListener('click', () => moveCommand(i, -1));
            const downBtn = document.createElement('button');
            downBtn.className = 'cmd-move-btn';
            downBtn.textContent = '▼';
            downBtn.title = 'Aşağı taşı';
            downBtn.addEventListener('click', () => moveCommand(i, 1));
            moveBtns.appendChild(upBtn);
            moveBtns.appendChild(downBtn);

            // Delete
            const del = document.createElement('button');
            del.className = 'cmd-delete';
            del.textContent = '✕';
            del.title = 'Komutu sil';
            del.addEventListener('click', () => removeCommand(i));

            item.appendChild(num);
            item.appendChild(text);
            item.appendChild(moveBtns);
            item.appendChild(del);
            dom.commandList.appendChild(item);
        });
    }

    function updateMoveCount() {
        state.moveCount = state.commands.length;
        dom.moveCount.textContent = `Komut: ${state.moveCount}`;
    }

    function updateStarDisplay() {
        const best = state.starsEarned[state.currentLevel] || 0;
        let stars = '';
        for (let i = 0; i < 3; i++) {
            stars += i < best ? '⭐' : '☆';
        }
        dom.starDisplay.textContent = stars;
    }

    // ───────────────────────────────────────────────
    // 6. MESAJ SİSTEMİ
    // ───────────────────────────────────────────────

    function setMessage(icon, text, type) {
        dom.messageIcon.textContent = icon;
        dom.messageText.textContent = text;
        dom.messageBox.className = '';
        if (type) dom.messageBox.classList.add(`msg-${type}`);
    }

    // ───────────────────────────────────────────────
    // 7. KOMUT ÇALIŞTIRMA MOTORU
    // ───────────────────────────────────────────────

    function enableControls(enabled) {
        dom.btnIleri.disabled = !enabled;
        dom.btnCalim.disabled = !enabled;
        dom.btnSut.disabled = !enabled;
        dom.btnRun.disabled = !enabled;
        dom.btnReset.disabled = !enabled;
        dom.btnClear.disabled = !enabled;
    }

    async function runCommands() {
        if (state.isRunning || state.commands.length === 0) return;

        state.isRunning = true;
        enableControls(false);

        const lvl = LEVELS[state.currentLevel];
        state.ballPos = [...lvl.ballStart];
        renderGrid();
        setMessage('▶️', 'Haydi bakalım! Komutlar çalışıyor... 👀', 'info');

        // Clear previous result highlights
        document.querySelectorAll('.command-item').forEach(el => {
            el.classList.remove('running', 'success', 'error');
        });

        let error = null;

        for (let i = 0; i < state.commands.length; i++) {
            const cmd = state.commands[i];
            const itemEl = dom.commandList.children[i];

            // Highlight current command
            if (itemEl) itemEl.classList.add('running');

            await sleep(400);

            if (cmd.type === 'İLERİ_SÜR') {
                error = await executeIleriSur(cmd.param, i);
            } else if (cmd.type === 'ÇALIM_AT') {
                error = await executeCalimAt(cmd.param, i);
            } else if (cmd.type === 'ŞUT_ÇEK') {
                error = await executeSutCek(i);
            }

            if (itemEl) itemEl.classList.remove('running');

            if (error) {
                if (itemEl) itemEl.classList.add('error');
                showError(error, i);
                state.isRunning = false;
                enableControls(true);
                return;
            }

            if (itemEl) itemEl.classList.add('success');
        }

        // All commands executed but didn't shoot or didn't reach goal
        const [br, bc] = state.ballPos;
        const [gr, gc] = lvl.goal;
        if (br !== gr || bc !== gc) {
            setMessage('🤔', 'Komutların bitti ama gol olmadı! Sona ŞUT_ÇEK eklemeyi unuttun mu?', 'error');
        } else {
            setMessage('🤔', 'Kaleye çok yakınsın! Sona bir ŞUT_ÇEK ekle ve golü at!', 'error');
        }

        state.isRunning = false;
        enableControls(true);
    }

    async function executeIleriSur(steps, cmdIndex) {
        const lvl = LEVELS[state.currentLevel];
        for (let s = 0; s < steps; s++) {
            const [r, c] = state.ballPos;
            const newR = r - 1;

            // Cannot enter the goal row by walking — must use ŞUT_ÇEK
            if (newR < 0) {
                return `Oops! 😅 Top sahadan dışarı çıktı! ${steps} kare çok fazlaymış. Daha az adım dene!`;
            }

            if (newR === lvl.goal[0] && c === lvl.goal[1]) {
                return `Dur bir dakika! 🤚 Kaleye yürüyerek giremezsin! Önce kalenin tam önüne gel, sonra ŞUT_ÇEK kullan. Bir adım daha az git!`;
            }

            // Defender collision
            if (lvl.defenders.some(d => d[0] === newR && d[1] === c)) {
                return `Çarpışma! 💥 Önünde bir savunmacı var! Düz gidemezsin. ÇALIM_AT ile yana kaçarak onu geçmelisin!`;
            }

            state.ballPos = [newR, c];
            renderGrid();
            markTrail(r, c);
            animateBall(newR, c);
            await sleep(300);
        }
        return null;
    }

    async function executeCalimAt(direction, cmdIndex) {
        const lvl = LEVELS[state.currentLevel];
        const [r, c] = state.ballPos;
        const colDelta = direction === 'SAĞ' ? 1 : -1;
        const newC = c + colDelta;

        // Out of bounds sideways
        if (newC < 0 || newC >= lvl.cols) {
            return `Oops! 😅 Sahanın kenarına geldin, daha fazla yana gidemezsin! Diğer tarafa çalım atmayı dene.`;
        }

        // Check target cell for defender
        if (lvl.defenders.some(d => d[0] === r && d[1] === newC)) {
            return `Çarpışma! 💥 O tarafta da savunmacı var! Diğer yöne çalım atmayı dene.`;
        }

        // Move sideways only (1 kare sağa veya sola)
        state.ballPos = [r, newC];
        renderGrid();
        markTrail(r, c);
        animateBall(r, newC);
        await sleep(300);

        return null;
    }

    async function executeSutCek(cmdIndex) {
        const lvl = LEVELS[state.currentLevel];
        const [br, bc] = state.ballPos;
        const [gr, gc] = lvl.goal;

        // Şut her zaman ileri (yukarı) gider — topu animasyonla uçuralım
        // Top aynı sütunda kalır, engele veya saha dışına kadar gider
        let shotR = br;
        let blocksFlown = 0;
        let hitDefender = false;
        let hitWall = false;
        let scoredGoal = false;

        // Topu adım adım ileri uçur
        for (let r = br - 1; r >= 0; r--) {
            // Kaleye ulaştı mı?
            if (r === gr && bc === gc) {
                // Animate to goal
                state.ballPos = [r, bc];
                renderGrid();
                markTrail(r + 1, bc);
                animateBall(r, bc);
                blocksFlown++;
                await sleep(150);
                scoredGoal = true;
                break;
            }

            // Defansa çarptı mı?
            if (lvl.defenders.some(d => d[0] === r && d[1] === bc)) {
                hitDefender = true;
                shotR = r;
                break;
            }

            // Kale satırı ama kale sütunu değil — saha dışı
            if (r === 0) {
                state.ballPos = [r, bc];
                renderGrid();
                markTrail(r + 1, bc);
                animateBall(r, bc);
                blocksFlown++;
                await sleep(150);
                hitWall = true;
                shotR = r;
                break;
            }

            // Boş hücre — top uçmaya devam ediyor
            state.ballPos = [r, bc];
            renderGrid();
            markTrail(r + 1, bc);
            animateBall(r, bc);
            blocksFlown++;
            await sleep(150);
            shotR = r;
        }

        if (scoredGoal) {
            triggerGoal();
            return null;
        }

        // Top gitti ama gol olmadı — nereye gittiğini göster
        if (hitDefender) {
            return `Şüüüt! 💨 Top ${blocksFlown} kare uçtu ama rakip oyuncuya çarptı! 🛡️ Önce savunmacıyı geçmen lazım.`;
        }

        if (hitWall) {
            if (bc !== gc) {
                return `Şüüüt! 💨 Top ${blocksFlown} kare uçtu ama kale yanda kaldı! 🥅 Top kaleyle aynı sütunda olmalı. Çalım atarak hizalanmayı dene!`;
            }
            return `Şüüüt! 💨 Top uçtu ama kaleyi bulamadı! Sahanın dışına çıktı.`;
        }

        // Hiç uçamadı (ball at row 0 already?)
        if (blocksFlown === 0) {
            return `Top zaten sahanın en üstünde! Şut çekecek yer kalmadı.`;
        }

        return `Şüüüt! 💨 Top ${blocksFlown} kare uçtu ama gol olmadı!`;
    }

    function markTrail(row, col) {
        const cell = getCell(row, col);
        if (cell && !cell.classList.contains('cell-goal') && !cell.classList.contains('cell-defender')) {
            cell.classList.add('cell-trail');
        }
    }

    function animateBall(row, col) {
        const cell = getCell(row, col);
        if (cell) {
            cell.classList.add('cell-ball-moving');
            setTimeout(() => cell.classList.remove('cell-ball-moving'), 300);
        }
    }

    // ───────────────────────────────────────────────
    // 8. GOL & HATA SİSTEMİ
    // ───────────────────────────────────────────────

    function triggerGoal() {
        const lvl = LEVELS[state.currentLevel];
        const totalCommands = state.commands.length;
        const optimal = lvl.optimalMoves;

        let stars = 1;
        if (totalCommands <= optimal) stars = 3;
        else if (totalCommands <= optimal + 1) stars = 2;

        // Update best
        if (stars > (state.starsEarned[state.currentLevel] || 0)) {
            state.starsEarned[state.currentLevel] = stars;
        }

        // Show stars
        let starStr = '';
        for (let i = 0; i < 3; i++) starStr += i < stars ? '⭐' : '☆';
        dom.goalStars.textContent = starStr;

        // Message
        let msg = '';
        if (stars === 3) msg = `Harikasın! 🌟 En az komutla golü attın (${optimal} komut)! Gerçek bir kodlama ustasısın!`;
        else if (stars === 2) msg = `Süper gol! ⚡ ${totalCommands} komut kullandın. En az ${optimal} komutla yapılabilir. Bir daha deneyip 3 yıldız alabilir misin?`;
        else msg = `Gooool! ⚽ Ama ${totalCommands} komut kullandın. En az ${optimal} komutla yapılabilir. Daha kısa bir yol bulabilir misin?`;

        dom.goalMessage.textContent = msg;

        // Show result box
        showResult(stars, totalCommands, optimal);

        // Show overlay
        dom.goalOverlay.classList.remove('hidden');
        setMessage('⚽', 'GOOOL! Harika bir gol attın! 🎉', 'success');
        updateStarDisplay();

        // Confetti!
        spawnConfetti();

        state.isRunning = false;
        enableControls(true);
    }

    function showError(msg, cmdIndex) {
        dom.errorMessage.textContent = msg;
        dom.errorOverlay.classList.remove('hidden');
        setMessage('😮', `${cmdIndex + 1}. komutta bir sorun oldu!`, 'error');
    }

    function showResult(stars, total, optimal) {
        let starStr = '';
        for (let i = 0; i < 3; i++) starStr += i < stars ? '⭐' : '☆';

        dom.resultContent.innerHTML = `
            <div class="result-stars">${starStr}</div>
            <div class="result-line">
                <span class="result-label">Senin komutların:</span>
                <span class="result-value">${total} tane</span>
            </div>
            <div class="result-line">
                <span class="result-label">En az kaçla olur:</span>
                <span class="result-value">${optimal} tane</span>
            </div>
            <div class="result-line">
                <span class="result-label">Değerlendirme:</span>
                <span class="result-value">${stars === 3 ? 'Mükemmel! 🌟' : stars === 2 ? 'Çok iyi! ⚡' : 'İyi, ama daha kısa yol var! 🤔'}</span>
            </div>
        `;
        dom.resultBox.classList.remove('hidden');
    }

    // ───────────────────────────────────────────────
    // 9. KONFETTİ EFEKTİ
    // ───────────────────────────────────────────────

    function spawnConfetti() {
        const colors = ['#ffd600', '#66bb6a', '#42a5f5', '#ef5350', '#ab47bc', '#ff7043'];
        for (let i = 0; i < 40; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            piece.style.left = Math.random() * 100 + 'vw';
            piece.style.top = '-10px';
            piece.style.background = colors[Math.floor(Math.random() * colors.length)];
            piece.style.width = (Math.random() * 8 + 5) + 'px';
            piece.style.height = (Math.random() * 8 + 5) + 'px';
            piece.style.animationDuration = (Math.random() * 2 + 1.5) + 's';
            piece.style.animationDelay = (Math.random() * 0.5) + 's';
            document.body.appendChild(piece);
            setTimeout(() => piece.remove(), 4000);
        }
    }

    // ───────────────────────────────────────────────
    // 10. RESET & SIFIRLAMA
    // ───────────────────────────────────────────────

    function resetLevel() {
        if (state.isRunning) return;
        const lvl = LEVELS[state.currentLevel];
        state.ballPos = [...lvl.ballStart];
        renderGrid();
        setMessage('🔄', 'Top başa döndü! Komutların yerinde duruyor, tekrar dene! 💪', '');
        dom.resultBox.classList.add('hidden');

        // Remove command highlights
        document.querySelectorAll('.command-item').forEach(el => {
            el.classList.remove('running', 'success', 'error');
        });
    }

    function nextLevel() {
        const next = state.currentLevel + 1;
        if (next < LEVELS.length) {
            loadLevel(next);
        } else {
            setMessage('🏆', 'Tüm seviyeleri bitirdin! Sen gerçek bir kodlama şampiyonusun! 🎉🎉', 'success');
            dom.goalOverlay.classList.add('hidden');
        }
    }

    // ───────────────────────────────────────────────
    // 11. YARDIMCI FONKSİYONLAR
    // ───────────────────────────────────────────────

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ───────────────────────────────────────────────
    // 12. EVENT LİSTENER'LAR
    // ───────────────────────────────────────────────

    // Komut ekleme butonları
    dom.btnIleri.addEventListener('click', () => {
        const val = parseInt(dom.ileriInput.value, 10);
        if (val >= 1 && val <= 9) {
            addCommand('İLERİ_SÜR', val);
        }
    });

    dom.btnCalim.addEventListener('click', () => {
        const dir = dom.calimSelect.value;
        addCommand('ÇALIM_AT', dir);
    });

    dom.btnSut.addEventListener('click', () => {
        addCommand('ŞUT_ÇEK', null);
    });

    // Kontrol butonları
    dom.btnRun.addEventListener('click', () => runCommands());
    dom.btnReset.addEventListener('click', () => resetLevel());
    dom.btnClear.addEventListener('click', () => clearCommands());

    // Seviye değiştirme
    dom.levelSelect.addEventListener('change', (e) => {
        loadLevel(parseInt(e.target.value, 10));
    });

    // Gol overlay
    dom.goalNext.addEventListener('click', () => {
        dom.goalOverlay.classList.add('hidden');
        nextLevel();
    });
    dom.goalClose.addEventListener('click', () => {
        dom.goalOverlay.classList.add('hidden');
    });

    // Hata overlay
    dom.errorClose.addEventListener('click', () => {
        dom.errorOverlay.classList.add('hidden');
        resetLevel();
    });

    // Klavye kısayolları
    document.addEventListener('keydown', (e) => {
        if (state.isRunning) return;

        if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
            // Focus yoksa çalıştır
            const active = document.activeElement;
            if (active.tagName !== 'INPUT' && active.tagName !== 'SELECT') {
                e.preventDefault();
                runCommands();
            }
        }

        if (e.key === 'Escape') {
            dom.goalOverlay.classList.add('hidden');
            dom.errorOverlay.classList.add('hidden');
        }
    });

    // ───────────────────────────────────────────────
    // 13. BAŞLANGIÇ
    // ───────────────────────────────────────────────

    function init() {
        initLevelSelect();
        loadLevel(0);
    }

    init();

})();
