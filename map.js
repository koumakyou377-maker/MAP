let currentLang = 'ja'; 
const i18n = {
    ja: { placeholder: "作品名・施設名で検索...", searchBtn: "検索", indexTitle: "五十音で探す", resultsTitle: "該当作品", labels: { Shelf: "棚", Register: "レジ", Counter: "カウンター", Fitting: "試", Escalator: "ES" } },
    en: { placeholder: "Search title or facility...", searchBtn: "Search", indexTitle: "Search by Alphabet", resultsTitle: "Results", labels: { Shelf: "Shelf", Register: "Reg", Counter: "Counter", Fitting: "Fit", Escalator: "ES" } }
};

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

function switchLang(lang) {
    currentLang = lang;
    document.getElementById('btn-lang-ja').classList.toggle('active', lang === 'ja');
    document.getElementById('btn-lang-en').classList.toggle('active', lang === 'en');
    document.getElementById('search-input').placeholder = i18n[lang].placeholder;
    document.getElementById('btn-search-el').innerText = i18n[lang].searchBtn;
    document.getElementById('index-title').innerText = i18n[lang].indexTitle;
    document.getElementById('results-title').innerText = i18n[lang].resultsTitle;
    renderIndexButtons(); clearSearch(); renderMap();
}

function renderIndexButtons() {
    const container = document.getElementById('index-buttons');
    container.innerHTML = '';
    if (currentLang === 'ja') {
        ['あ','か','さ','た','な','は','ま','や','ら','わ'].forEach(ch => {
            const btn = document.createElement('button');
            btn.className = 'index-btn'; btn.innerText = ch;
            btn.onclick = (e) => filterByIndex(ch, 'ja', e.target);
            container.appendChild(btn);
        });
    } else {
        for (let i = 65; i <= 90; i++) {
            const ch = String.fromCharCode(i);
            const btn = document.createElement('button');
            btn.className = 'index-btn'; btn.innerText = ch;
            btn.onclick = (e) => filterByIndex(ch, 'en', e.target);
            container.appendChild(btn);
        }
    }
}

function getKanaRowRegex(rowChar) {
    const map = { 'あ': /^[あ-おア-オァ-ォヴ]/, 'か': /^[か-ごカ-ゴヵヶ]/, 'さ': /^[さ-ぞサ-ゾ]/, 'た': /^[た-どタ-ドッ]/, 'な': /^[な-のナ-ノ]/, 'は': /^[は-ぽハ-ポ]/, 'ま': /^[ま-もマ-モ]/, 'や': /^[や-よヤ-ヨャ-ョ]/, 'ら': /^[ら-ろラ-ロ]/, 'わ': /^[わ-んワ-ン]/ };
    return map[rowChar] || /./;
}

function filterByIndex(char, lang, clickedBtn) {
    document.querySelectorAll('.index-btn').forEach(b => b.classList.remove('active'));
    if (clickedBtn) clickedBtn.classList.add('active');
    document.getElementById('search-input').value = '';

    let results = [], targetShelfIds = new Set();
    PRODUCT_DATA.forEach(p => {
        let isMatch = false;
        if (lang === 'ja') {
            isMatch = getKanaRowRegex(char).test(p.kana ? p.kana : p.title);
        } else {
            isMatch = (p.en ? p.en.toUpperCase() : "").startsWith(char);
        }
        if (isMatch) { results.push(p); p.shelves.forEach(id => targetShelfIds.add(id.toString())); }
    });
    highlightShelves(targetShelfIds, ""); 
    renderSearchResults(results);
}

function searchAsset() {
    document.querySelectorAll('.index-btn').forEach(b => b.classList.remove('active'));
    const query = document.getElementById('search-input').value.trim().toLowerCase();
    if (!query) { clearSearch(); return; }
    
    let targetShelfIds = new Set(), results = [];
    PRODUCT_DATA.forEach(p => {
        if ((p.title && p.title.toLowerCase().includes(query)) || (p.abbr && p.abbr.toLowerCase().includes(query)) || (p.en && p.en.toLowerCase().includes(query)) || (p.kana && p.kana.toLowerCase().includes(query))) {
            results.push(p); p.shelves.forEach(id => targetShelfIds.add(id.toString()));
        }
    });
    highlightShelves(targetShelfIds, query);
    renderSearchResults(results);
}

function clearSearch() {
    document.querySelectorAll('.index-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('search-input').value = '';
    highlightShelves(new Set(), "");
    document.getElementById('search-results').innerHTML = '<li style="padding: 10px; color: #7f8c8d; font-size: 12px;">ボタンを押すか検索してください</li>';
    document.getElementById('results-count').innerText = "";
}

function renderSearchResults(results) {
    const list = document.getElementById('search-results');
    const count = document.getElementById('results-count');
    list.innerHTML = '';
    if (results.length === 0) {
        count.innerText = "(0件)";
        list.innerHTML = '<li style="padding: 10px; color: #7f8c8d; font-size: 13px;">見つかりませんでした</li>';
        return;
    }
    count.innerText = `(${results.length}件)`;
    results.forEach(p => {
        const li = document.createElement('li'); li.className = 'result-item';
        const titleDiv = document.createElement('div'); titleDiv.className = 'result-title'; titleDiv.innerText = p.title;
        li.appendChild(titleDiv);
        if(currentLang === 'en' && p.en) {
            const enDiv = document.createElement('div'); enDiv.className = 'result-en'; enDiv.innerText = p.en; li.appendChild(enDiv);
        }
        list.appendChild(li);
    });
}

function highlightShelves(shelfIds, textQuery) {
    document.querySelectorAll('.cell').forEach(c => c.classList.remove('highlight'));
    document.querySelectorAll('.minimap-asset').forEach(a => a.classList.remove('minimap-highlight'));
    
    document.querySelectorAll('.cell').forEach(cell => {
        const assetId = cell.dataset.assetId, assetType = cell.dataset.assetType;
        if (!assetId || !assetType) return; 

        let isMatch = (assetType === 'Shelf' && shelfIds.has(assetId));
        if (textQuery) {
            isMatch = isMatch || (assetId.toLowerCase() === textQuery) || (assetType.toLowerCase().includes(textQuery)) || ((i18n[currentLang].labels[assetType] || "").includes(textQuery));
        }
        if (isMatch) {
            cell.classList.add('highlight'); 
            const mmAsset = document.getElementById('mm-' + assetId);
            if(mmAsset) mmAsset.classList.add('minimap-highlight');
        }
    });
}

// ======= マップ制御・描画 =======
const COLS = 60, ROWS = 82, CELL_SIZE = 60, BASE_SCALE = 0.2;
let cellsArray = [], scale = 1, translateX = 0, translateY = 0, isDragging = false, startX, startY;

function renderMap() {
    const grid = document.getElementById('grid');
    const minimapContent = document.getElementById('minimap-content');
    grid.innerHTML = ''; minimapContent.innerHTML = ''; cellsArray = [];
    
    for (let r = 1; r <= ROWS; r++) {
        cellsArray[r] = [];
        for (let c = 1; c <= COLS; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell'; cell.dataset.x = c; cell.dataset.y = r;
            grid.appendChild(cell); cellsArray[r][c] = cell; 
        }
    }

    const assetDefs = [
        { type: 'Shelf', className: 'asset-shelf', label: '棚' },
        { type: 'Register', className: 'asset-register', label: 'レジ' },
        { type: 'Counter', className: 'asset-counter', label: 'カウンター' },
        { type: 'Fitting', className: 'asset-fitting', label: '試' },
        { type: 'Escalator', className: 'asset-escalator', label: 'ES' }
    ];

    assetDefs.forEach(asset => {
        const regex = new RegExp(`${asset.type}\\s*\\{([^}]+)\\}`, 'gi');
        let blockMatch;
        while ((blockMatch = regex.exec(MAP_DATA)) !== null) {
            blockMatch[1].split('\n').forEach(line => {
                const match = /^\((\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*([^)]+)\)$/.exec(line.trim());
                if (match) applyToGrid(Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4]), match[5].trim(), asset, minimapContent);
            });
        }
    });
}

function applyToGrid(x1, y1, x2, y2, id, asset, minimapContent) {
    const startX = Math.min(x1, x2), endX = Math.max(x1, x2);
    const startY = Math.min(y1, y2), endY = Math.max(y1, y2);
    const mainCell = cellsArray[startY] ? cellsArray[startY][startX] : null;
    if (!mainCell || mainCell.style.display === 'none') return; 

    mainCell.style.gridColumn = `span ${endX - startX + 1}`;
    mainCell.style.gridRow = `span ${endY - startY + 1}`;
    mainCell.className = `cell ${asset.className}`;
    mainCell.dataset.assetId = id; mainCell.dataset.assetType = asset.type;

    if (asset.type === 'Escalator') mainCell.innerText = id;
    else if (asset.type === 'Shelf') mainCell.innerText = id.replace(/^[a-zA-Z]+/, ''); 
    else mainCell.innerText = i18n[currentLang].labels[asset.type] || asset.label;

    for (let r = startY; r <= endY; r++) {
        for (let c = startX; c <= endX; c++) {
            if (c === startX && r === startY) continue; 
            if (cellsArray[r] && cellsArray[r][c]) {
                cellsArray[r][c].style.display = 'none';
                cellsArray[r][c].dataset.hiddenAssetId = id; // ナビ用の不可視情報
            }
        }
    }

    const mmAsset = document.createElement('div');
    mmAsset.className = 'minimap-asset';
    mmAsset.id = 'mm-' + id;
    mmAsset.style.left = ((startX - 1) / COLS * 100) + '%';
    mmAsset.style.top = ((startY - 1) / ROWS * 100) + '%';
    mmAsset.style.width = ((endX - startX + 1) / COLS * 100) + '%';
    mmAsset.style.height = ((endY - startY + 1) / ROWS * 100) + '%';
    minimapContent.appendChild(mmAsset);
}

// ======= ルートナビゲーション機能 =======
let currentPin = null; // {r, c}
let goalAssetId = null;

function clearRoute() {
    currentPin = null;
    goalAssetId = null;
    document.querySelectorAll('.route-path').forEach(el => el.classList.remove('route-path'));
    document.querySelectorAll('.pin-start').forEach(el => el.classList.remove('pin-start'));
    document.querySelectorAll('.pin-goal').forEach(el => el.classList.remove('pin-goal'));
    document.getElementById('route-panel').classList.remove('active');
    updateRouteText();
}

function updateRouteText() {
    const textEl = document.getElementById('route-text');
    const startStr = currentPin ? `<span style="color:#e74c3c">📍現在地: 設定済</span>` : `<span style="color:#e74c3c">📍現在地: 未設定</span>`;
    const goalStr = goalAssetId ? `<span style="color:#2c3e50">🏁目的地: ${goalAssetId}</span>` : `<span style="color:#2c3e50">🏁目的地: 未設定</span>`;
    textEl.innerHTML = `${startStr} <span style="color:#ccc; margin:0 5px;">|</span> ${goalStr}<br><small style="font-weight:normal; color:#7f8c8d;">マップの空きマスと棚をタップしてください</small>`;
    
    if(currentPin || goalAssetId) document.getElementById('route-panel').classList.add('active');
}

function getWalkableNeighbors(r, c) {
    const neighbors = [];
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (let [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 1 && nr <= ROWS && nc >= 1 && nc <= COLS) {
            const neighborCell = cellsArray[nr][nc];
            // 障害物（配置物）でないマスなら通れる
            if (neighborCell.style.display !== 'none' && !neighborCell.dataset.assetId) {
                neighbors.push({ r: nr, c: nc });
            }
        }
    }
    return neighbors;
}

function isAdjacentToGoal(r, c, targetId) {
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (let [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 1 && nr <= ROWS && nc >= 1 && nc <= COLS) {
            const nCell = cellsArray[nr][nc];
            if (nCell.dataset.assetId === targetId || nCell.dataset.hiddenAssetId === targetId) return true;
        }
    }
    return false;
}

function calculateAndDrawRoute() {
    document.querySelectorAll('.route-path').forEach(el => el.classList.remove('route-path'));
    document.querySelectorAll('.pin-start').forEach(el => el.classList.remove('pin-start'));
    document.querySelectorAll('.pin-goal').forEach(el => el.classList.remove('pin-goal'));

    if (currentPin) cellsArray[currentPin.r][currentPin.c].classList.add('pin-start');
    if (goalAssetId) {
        const goalCell = document.querySelector(`.cell[data-asset-id="${goalAssetId}"]`);
        if (goalCell) goalCell.classList.add('pin-goal');
    }

    if (!currentPin || !goalAssetId) return;

    // 幅優先探索(BFS)で最短ルートを検索
    const queue = [{ r: currentPin.r, c: currentPin.c, path: [] }];
    const visited = new Set();
    visited.add(`${currentPin.r},${currentPin.c}`);
    let foundPath = null;

    while (queue.length > 0) {
        const curr = queue.shift();
        
        // 目的地に隣接したらゴール
        if (isAdjacentToGoal(curr.r, curr.c, goalAssetId)) {
            foundPath = curr.path;
            break;
        }

        const neighbors = getWalkableNeighbors(curr.r, curr.c);
        for (let n of neighbors) {
            const key = `${n.r},${n.c}`;
            if (!visited.has(key)) {
                visited.add(key);
                queue.push({ r: n.r, c: n.c, path: [...curr.path, {r: n.r, c: n.c}] });
            }
        }
    }

    if (foundPath) {
        foundPath.forEach(p => { cellsArray[p.r][p.c].classList.add('route-path'); });
    } else {
        alert("目的地へのルートが見つかりません。");
    }
}


// ======= ズーム・ドラッグ・イベントリスナー =======
function updateTransform() {
    document.getElementById('map-wrapper').style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale * BASE_SCALE})`;
    updateMinimapViewport();
}

function updateMinimapViewport() {
    const container = document.getElementById('map-container');
    const mmContainer = document.getElementById('minimap-container');
    const viewport = document.getElementById('minimap-viewport');
    
    const actualMapW = COLS * CELL_SIZE * scale * BASE_SCALE;
    const actualMapH = ROWS * CELL_SIZE * scale * BASE_SCALE;
    const ratioW = container.clientWidth / actualMapW;
    const ratioH = container.clientHeight / actualMapH;
    const offsetX = -translateX / actualMapW;
    const offsetY = -translateY / actualMapH;

    const mmRect = mmContainer.getBoundingClientRect();
    let vw = mmRect.width * ratioW, vh = mmRect.height * ratioH;
    let vx = mmRect.width * offsetX, vy = mmRect.height * offsetY;

    viewport.style.width = Math.min(vw, mmRect.width) + 'px';
    viewport.style.height = Math.min(vh, mmRect.height) + 'px';
    viewport.style.left = Math.max(0, Math.min(vx, mmRect.width - vw)) + 'px';
    viewport.style.top = Math.max(0, Math.min(vy, mmRect.height - vh)) + 'px';
}

function fitToScreen() {
    const container = document.getElementById('map-container');
    const logicalW = COLS * CELL_SIZE, logicalH = ROWS * CELL_SIZE;
    scale = Math.min(container.clientWidth / (logicalW * BASE_SCALE), container.clientHeight / (logicalH * BASE_SCALE)) * 0.95;
    translateX = (container.clientWidth - logicalW * scale * BASE_SCALE) / 2;
    translateY = (container.clientHeight - logicalH * scale * BASE_SCALE) / 2;
    updateTransform();
}

function zoom(factor) {
    const container = document.getElementById('map-container');
    const centerX = container.clientWidth / 2, centerY = container.clientHeight / 2;
    const newScale = Math.max(0.1, Math.min(scale * factor, 10));
    const actualFactor = newScale / scale;
    translateX = centerX - (centerX - translateX) * actualFactor;
    translateY = centerY - (centerY - translateY) * actualFactor;
    scale = newScale; updateTransform();
}
function zoomIn() { zoom(1.3); } function zoomOut() { zoom(0.7); }

function setupEventListeners() {
    const container = document.getElementById('map-container');
    const gridEl = document.getElementById('grid');
    let isMapMoved = false;

    document.getElementById('search-input').addEventListener('keypress', (e) => { if (e.key === 'Enter') searchAsset(); });

    container.addEventListener('mousedown', (e) => { 
        if(e.target.closest('#minimap-container') || e.target.closest('.controls') || e.target.closest('.route-panel')) return; 
        isDragging = true; isMapMoved = false;
        startX = e.clientX - translateX; startY = e.clientY - translateY; container.style.cursor = 'grabbing'; 
    });
    window.addEventListener('mousemove', (e) => { 
        if (!isDragging) return; 
        isMapMoved = true;
        translateX = e.clientX - startX; translateY = e.clientY - startY; updateTransform(); 
    });
    window.addEventListener('mouseup', () => { 
        isDragging = false; container.style.cursor = 'default'; 
    });

    // ★ マップタップによるピンの設定 ★
    gridEl.addEventListener('click', (e) => {
        if (isMapMoved) return; // ドラッグ後の離上は無視
        const cell = e.target.closest('.cell');
        if (!cell) return;

        if (cell.dataset.assetId) {
            // 施設をタップ -> 目的地
            goalAssetId = cell.dataset.assetId;
        } else {
            // 何もない通路をタップ -> 現在地
            currentPin = { r: parseInt(cell.dataset.y), c: parseInt(cell.dataset.x) };
        }
        updateRouteText();
        calculateAndDrawRoute();
    });

    container.addEventListener('wheel', (e) => {
        if(e.target.closest('#minimap-container') || e.target.closest('.route-panel')) return;
        e.preventDefault();
        const newScale = Math.max(0.1, Math.min(scale * Math.exp((e.deltaY < 0 ? 1 : -1) * 0.1), 10));
        const rect = container.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        translateX = mx - (mx - translateX) * (newScale / scale);
        translateY = my - (my - translateY) * (newScale / scale);
        scale = newScale; updateTransform();
    }, { passive: false });

    // ミニマップ操作
    const minimap = document.getElementById('minimap-container');
    let isMinimapDragging = false;
    function moveMapViaMinimap(e) {
        const rect = minimap.getBoundingClientRect();
        const xRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const yRatio = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
        const actualMapW = COLS * CELL_SIZE * scale * BASE_SCALE;
        const actualMapH = ROWS * CELL_SIZE * scale * BASE_SCALE;
        translateX = container.clientWidth / 2 - actualMapW * xRatio;
        translateY = container.clientHeight / 2 - actualMapH * yRatio;
        updateTransform();
    }
    minimap.addEventListener('mousedown', (e) => { isMinimapDragging = true; moveMapViaMinimap(e); });
    window.addEventListener('mousemove', (e) => { if(isMinimapDragging) moveMapViaMinimap(e); });
    window.addEventListener('mouseup', () => { isMinimapDragging = false; });

    // タッチ操作（省略せずに維持）
    let initialDist = 0, initScale = 1, isPinching = false, lastX = 0, lastY = 0;
    container.addEventListener('touchstart', (e) => {
        if(e.target.closest('#minimap-container') || e.target.closest('.controls') || e.target.closest('.route-panel')) return;
        if (e.touches.length === 1) { isDragging = true; isMapMoved = false; lastX = e.touches[0].clientX; lastY = e.touches[0].clientY; }
        else if (e.touches.length === 2) { isPinching = true; isDragging = false; initialDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); initScale = scale; }
    }, { passive: false });
    container.addEventListener('touchmove', (e) => {
        if(e.target.closest('#minimap-container') || e.target.closest('.controls') || e.target.closest('.route-panel')) return;
        e.preventDefault(); 
        if (isPinching && e.touches.length === 2) {
            const currDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            const rect = container.getBoundingClientRect();
            const touchX = ((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left;
            const touchY = ((e.touches[0].clientY + e.touches[1].clientY) / 2) - rect.top;
            const newScale = Math.max(0.1, Math.min(initScale * (currDist / initialDist), 10)); 
            translateX = touchX - (touchX - translateX) * (newScale / scale); translateY = touchY - (touchY - translateY) * (newScale / scale);
            scale = newScale; initScale = scale; initialDist = currDist; updateTransform();
        } else if (isDragging && e.touches.length === 1) {
            isMapMoved = true;
            translateX += e.touches[0].clientX - lastX; translateY += e.touches[0].clientY - lastY;
            lastX = e.touches[0].clientX; lastY = e.touches[0].clientY; updateTransform();
        }
    }, { passive: false });
    container.addEventListener('touchend', (e) => {
        if (e.touches.length < 2) isPinching = false;
        if (e.touches.length === 0) { isDragging = false; }
        else if (e.touches.length === 1) { lastX = e.touches[0].clientX; lastY = e.touches[0].clientY; isDragging = true; }
    });
}

window.addEventListener('DOMContentLoaded', () => {
    switchLang('ja'); 
    setupEventListeners();
    renderMap();
    fitToScreen();
    window.addEventListener('resize', () => updateMinimapViewport());
});