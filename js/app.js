// state variables
let hymnsData = [];
let selectedHymn = null;
let activeLanguages = ['ko', 'en']; // list of active languages like ['ko', 'en', 'id']
let isKoreanOnlyShortcut = false; // shortcut toggle on toolbar
let currentTheme = 'dark';
let fontSize = 1.25; // in rem
let currentFontFamily = 'serif'; // 'serif', 'sans', 'system'
let wakeLock = null;

// Hymnal state variables
let newHymnsData = [];
let trinityHymnsData = [];
let trinity1990HymnsData = [];
let currentHymnal = 'new'; // 'new', 'trinity', or 'trinity_1990'

// Catechism state variables
let catechismData = [];
let shorterCatechismData = [];
let largerCatechismData = [];
let selectedCatechism = null;
let currentMode = 'hymn'; // 'hymn', 'catechism', or 'liturgy'
let currentCatechismType = 'shorter'; // 'shorter' or 'larger'

// Liturgy state variables
let liturgiesData = [];
let selectedLiturgy = null;

const CATECHISM_SECTIONS = {
    faith: { ko: '하나님에 대한 신앙', en: 'What man is to believe concerning God' },
    duty: { ko: '사람의 의무', en: 'What duty God requires of man' },
    grace: { ko: '은혜의 방편', en: 'The ordinary means of grace' }
};

function syncLanguageCheckboxes() {
    document.querySelectorAll('.lang-checkbox').forEach(cb => {
        cb.checked = activeLanguages.includes(cb.value);
    });
}

// DOM Elements
const sidebar = document.getElementById('sidebar');
const menuOpenBtn = document.getElementById('menu-open-btn');
const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
const searchInput = document.getElementById('search-input');
const hymnList = document.getElementById('hymn-list-items');
const readerContainer = document.getElementById('reader-container');
const emptyState = document.getElementById('empty-state');
const readerContent = document.getElementById('hymn-reader-content');
const catechismReaderContent = document.getElementById('catechism-reader-content');

// View Elements
const viewTitleKo = document.getElementById('view-title-ko');
const viewTitleEn = document.getElementById('view-title-en');
const viewHymnNumber = document.getElementById('view-hymn-number');
const viewLyricsBody = document.getElementById('view-lyrics-body');

// Control Elements
const layoutToggleBtn = document.getElementById('layout-toggle-btn');
const layoutLabel = document.getElementById('layout-label');
const scoreToggleBtn = document.getElementById('score-toggle-btn');
const wakeLockBtn = document.getElementById('wake-lock-btn');
const wakeLockDot = document.getElementById('wake-lock-status-dot');
const settingsToggleBtn = document.getElementById('settings-toggle-btn');

// Score Overlay Elements
const scoreOverlay = document.getElementById('score-overlay');
const scoreTitleLabel = document.getElementById('score-title-label');
const scoreCloseBtn = document.getElementById('score-close-btn');
const scoreImgElement = document.getElementById('score-img-element');

// Settings Drawer Elements
const settingsOverlay = document.getElementById('settings-overlay');
const settingsCloseBtn = document.getElementById('settings-close-btn');
const settingsFontDecBtn = document.getElementById('settings-font-dec-btn');
const settingsFontIncBtn = document.getElementById('settings-font-inc-btn');
const fontSizeDisplayPercent = document.getElementById('font-size-display-percent');

// Initialize the Application
async function init() {
    // Load state from localStorage
    try {
        const savedLangs = localStorage.getItem('hymn-active-languages');
        if (savedLangs) {
            activeLanguages = JSON.parse(savedLangs);
        } else {
            activeLanguages = ['ko', 'en'];
        }
    } catch (e) {
        activeLanguages = ['ko', 'en'];
    }
    
    isKoreanOnlyShortcut = localStorage.getItem('hymn-korean-shortcut') === 'true';
    
    // Sync checkbox inputs in settings
    syncLanguageCheckboxes();

    setupEventListeners();
    applyTheme(localStorage.getItem('hymn-theme') || 'dark');
    fontSize = parseFloat(localStorage.getItem('hymn-font-size')) || 1.25;
    applyFontSize();
    
    currentFontFamily = localStorage.getItem('hymn-font-family') || 'serif';
    applyFontFamily();
    
    updateLayoutUI();

    try {
        console.log("Loading databases...");
        const [hymnResponse, catechismResponse, largerCatechismResponse, liturgiesResponse] = await Promise.all([
            fetch('data/hymns.json'),
            fetch('data/catechism.json'),
            fetch('data/larger_catechism.json'),
            fetch('data/liturgies.json')
        ]);
        
        if (!hymnResponse.ok) {
            throw new Error(`HTTP error loading hymns! status: ${hymnResponse.status}`);
        }
        hymnsData = await hymnResponse.json();
        hymnsData.sort((a, b) => a.number - b.number);
        newHymnsData = hymnsData; // Cache New Hymnal data
        
        if (catechismResponse.ok) {
            shorterCatechismData = await catechismResponse.json();
            shorterCatechismData.sort((a, b) => a.number - b.number);
            console.log(`Loaded ${shorterCatechismData.length} shorter catechism questions.`);
        }
        
        if (largerCatechismResponse.ok) {
            largerCatechismData = await largerCatechismResponse.json();
            largerCatechismData.sort((a, b) => a.number - b.number);
            console.log(`Loaded ${largerCatechismData.length} larger catechism questions.`);
        }

        if (liturgiesResponse.ok) {
            liturgiesData = await liturgiesResponse.json();
            liturgiesData.sort((a, b) => a.number - b.number);
            console.log(`Loaded ${liturgiesData.length} liturgies.`);
        }
        
        currentCatechismType = localStorage.getItem('hymn-current-catechism-type') || 'shorter';
        catechismData = currentCatechismType === 'larger' ? largerCatechismData : shorterCatechismData;
        
        // Update active tab style for catechism
        document.querySelectorAll('[data-catechism-type]').forEach(tab => {
            if (tab.getAttribute('data-catechism-type') === currentCatechismType) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        // Determine initial hymnal type (prioritize deep link hash)
        const initHash = window.location.hash.substring(1);
        if (initHash.startsWith('tr90-')) {
            currentHymnal = 'trinity_1990';
        } else if (initHash.startsWith('tr-') || initHash.startsWith('tr61-')) {
            currentHymnal = 'trinity';
        } else {
            try {
                const savedHymnal = localStorage.getItem('hymn-current-hymnal');
                if (savedHymnal === 'trinity_1990') {
                    currentHymnal = 'trinity_1990';
                } else if (savedHymnal === 'trinity') {
                    currentHymnal = 'trinity';
                } else {
                    currentHymnal = 'new';
                }
            } catch (e) {
                currentHymnal = 'new';
            }
        }
        
        // Deactivate all first
        document.getElementById('hymnal-tab-new').classList.remove('active');
        document.getElementById('hymnal-tab-trinity').classList.remove('active');
        document.getElementById('hymnal-tab-trinity_1990').classList.remove('active');
        
        if (currentHymnal === 'trinity_1990') {
            document.getElementById('hymnal-tab-trinity_1990').classList.add('active');
            document.getElementById('sidebar-brand-title').textContent = '트리니티 (1990) (742)';
            await loadTrinity1990Data();
            hymnsData = trinity1990HymnsData;
        } else if (currentHymnal === 'trinity') {
            document.getElementById('hymnal-tab-trinity').classList.add('active');
            document.getElementById('sidebar-brand-title').textContent = '트리니티 (1961) (730)';
            await loadTrinityData();
            hymnsData = trinityHymnsData;
        } else {
            document.getElementById('hymnal-tab-new').classList.add('active');
            document.getElementById('sidebar-brand-title').textContent = '새찬송가 (645)';
            hymnsData = newHymnsData;
        }
        
        // Check hash to determine initial mode
        const hash = window.location.hash.substring(1);
        if (hash.startsWith('wsc-')) {
            currentCatechismType = 'shorter';
            catechismData = shorterCatechismData;
            switchMode('catechism', false);
        } else if (hash.startsWith('wlc-')) {
            currentCatechismType = 'larger';
            catechismData = largerCatechismData;
            switchMode('catechism', false);
        } else if (hash.startsWith('liturgy-')) {
            switchMode('liturgy', false);
        } else {
            renderHymnList(hymnsData);
        }
        
        handleRouting();
        window.addEventListener('hashchange', handleRouting);
        
    } catch (e) {
        console.error("Failed to load data:", e);
        hymnList.innerHTML = `<div class="empty-state">데이터 로딩 실패: ${e.message}</div>`;
    }

    // Register Service Worker
    registerServiceWorker();
}

// Set up Event Handlers
function setupEventListeners() {
    // Responsive Menu Handlers
    menuOpenBtn.addEventListener('click', () => sidebar.classList.add('open'));
    sidebarCloseBtn.addEventListener('click', () => sidebar.classList.remove('open'));
    
    // Search Listener
    searchInput.addEventListener('input', handleSearch);

    // Mode Tab Listeners
    document.querySelectorAll('.mode-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const mode = tab.getAttribute('data-mode');
            switchMode(mode);
        });
    });

    // Hymnal Tab Listeners
    document.querySelectorAll('.hymnal-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const hymnal = tab.getAttribute('data-hymnal');
            switchHymnal(hymnal);
        });
    });

    // Catechism Tab Listeners
    document.querySelectorAll('[data-catechism-type]').forEach(tab => {
        tab.addEventListener('click', () => {
            const type = tab.getAttribute('data-catechism-type');
            switchCatechismType(type);
        });
    });

    // Layout Toggle (Shortcut for "한글만" vs "다국어 대조")
    layoutToggleBtn.addEventListener('click', () => {
        isKoreanOnlyShortcut = !isKoreanOnlyShortcut;
        localStorage.setItem('hymn-korean-shortcut', isKoreanOnlyShortcut);
        updateLayoutUI();
        
        // Re-render list to reflect dynamic subtitles in list if layouts change
        if (currentMode === 'catechism') {
            renderCatechismList(catechismData);
            if (selectedCatechism) renderCatechismDetail(selectedCatechism);
        } else if (currentMode === 'liturgy') {
            renderLiturgyList(liturgiesData);
            if (selectedLiturgy) renderLiturgyDetail(selectedLiturgy);
        } else {
            renderHymnList(hymnsData);
            if (selectedHymn) renderHymnDetail(selectedHymn);
        }
    });

    // Language Checkbox Listeners
    document.querySelectorAll('.lang-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const checkedBoxes = Array.from(document.querySelectorAll('.lang-checkbox:checked'));
            
            if (checkedBoxes.length === 0) {
                // Prevent unchecking all languages
                e.target.checked = true;
                alert("최소 한 개의 언어는 선택해야 합니다.");
                return;
            }
            
            // Map checked values to activeLanguages
            activeLanguages = checkedBoxes.map(el => el.value);
            localStorage.setItem('hymn-active-languages', JSON.stringify(activeLanguages));
            
            // Re-render list to update subtitles
            if (currentMode === 'catechism') {
                renderCatechismList(catechismData);
                if (selectedCatechism) renderCatechismDetail(selectedCatechism);
            } else if (currentMode === 'liturgy') {
                renderLiturgyList(liturgiesData);
                if (selectedLiturgy) renderLiturgyDetail(selectedLiturgy);
            } else {
                renderHymnList(hymnsData);
                if (selectedHymn) renderHymnDetail(selectedHymn);
            }
        });
    });

    // Score Overlay Toggles
    scoreToggleBtn.addEventListener('click', openScore);
    scoreCloseBtn.addEventListener('click', closeScore);
    
    // Close overlay if clicking background
    scoreOverlay.addEventListener('click', (e) => {
        if (e.target === scoreOverlay) closeScore();
    });

    // Settings Overlay Toggles
    settingsToggleBtn.addEventListener('click', openSettings);
    settingsCloseBtn.addEventListener('click', closeSettings);
    
    // Close settings overlay if clicking background
    settingsOverlay.addEventListener('click', (e) => {
        if (e.target === settingsOverlay) closeSettings();
    });

    // Wake Lock Handler
    wakeLockBtn.addEventListener('click', toggleWakeLock);

    // Font Sizing inside Settings Drawer
    settingsFontIncBtn.addEventListener('click', () => {
        if (fontSize < 2.0) {
            fontSize = parseFloat((fontSize + 0.1).toFixed(2));
            localStorage.setItem('hymn-font-size', fontSize);
            applyFontSize();
        }
    });
    settingsFontDecBtn.addEventListener('click', () => {
        if (fontSize > 0.9) {
            fontSize = parseFloat((fontSize - 0.1).toFixed(2));
            localStorage.setItem('hymn-font-size', fontSize);
            applyFontSize();
        }
    });

    // Theme Selector inside Settings Drawer
    document.querySelectorAll('.theme-select-card').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const theme = e.currentTarget.getAttribute('data-theme-val');
            applyTheme(theme);
        });
    });

    // Font Family Selector inside Settings Drawer
    document.querySelectorAll('.font-family-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const fontFamily = e.currentTarget.getAttribute('data-font-val');
            applyFontFamily(fontFamily);
        });
    });

    // Handle visibility change (re-request wake lock if tab becomes active)
    document.addEventListener('visibilitychange', async () => {
        if (wakeLock !== null && document.visibilityState === 'visible') {
            await requestWakeLock(true); // silent re-request
        }
    });
}

// Handle Direct Routing (#num, #wsc-num, or #wlc-num)
function handleRouting() {
    const hash = window.location.hash.substring(1);
    
    // Check for Liturgy hash (liturgy-1 to liturgy-4)
    if (hash.startsWith('liturgy-')) {
        const num = parseInt(hash.substring(8));
        if (num > 0 && num <= 4) {
            if (currentMode !== 'liturgy') {
                switchMode('liturgy', false);
            }
            const item = liturgiesData.find(l => l.number === num);
            if (item) {
                selectLiturgy(item, false);
                return;
            }
        }
    }
    
    // Check for Shorter Catechism hash (wsc-1 to wsc-107)
    if (hash.startsWith('wsc-')) {
        const num = parseInt(hash.substring(4));
        if (num > 0 && num <= 107) {
            if (currentMode !== 'catechism') {
                switchMode('catechism', false);
            }
            if (currentCatechismType !== 'shorter') {
                switchCatechismType('shorter', false);
            }
            const item = catechismData.find(c => c.number === num);
            if (item) {
                selectCatechism(item, false);
                return;
            }
        }
    }
    
    // Check for Larger Catechism hash (wlc-1 to wlc-196)
    if (hash.startsWith('wlc-')) {
        const num = parseInt(hash.substring(4));
        if (num > 0 && num <= 196) {
            if (currentMode !== 'catechism') {
                switchMode('catechism', false);
            }
            if (currentCatechismType !== 'larger') {
                switchCatechismType('larger', false);
            }
            const item = catechismData.find(c => c.number === num);
            if (item) {
                selectCatechism(item, false);
                return;
            }
        }
    }
    
    // Check for Trinity 1990 hymn hash (tr90-num)
    if (hash.startsWith('tr90-')) {
        const num = parseInt(hash.substring(5));
        if (num > 0 && num <= 742) {
            if (currentMode !== 'hymn') {
                switchMode('hymn', false);
            }
            if (currentHymnal !== 'trinity_1990') {
                switchHymnal('trinity_1990', false).then(() => {
                    const hymn = hymnsData.find(h => h.number === num);
                    if (hymn) {
                        selectHymn(hymn, false);
                    }
                });
                return;
            } else {
                const hymn = hymnsData.find(h => h.number === num);
                if (hymn) {
                    selectHymn(hymn, false);
                    return;
                }
            }
        }
    }

    // Check for Trinity 1961 hymn hash (tr-num or tr61-num)
    if (hash.startsWith('tr-') || hash.startsWith('tr61-')) {
        const isTr61 = hash.startsWith('tr61-');
        const num = parseInt(hash.substring(isTr61 ? 5 : 3));
        if (num > 0 && num <= 730) {
            if (currentMode !== 'hymn') {
                switchMode('hymn', false);
            }
            if (currentHymnal !== 'trinity') {
                switchHymnal('trinity', false).then(() => {
                    const hymn = hymnsData.find(h => h.number === num);
                    if (hymn) {
                        selectHymn(hymn, false);
                    }
                });
                return;
            } else {
                const hymn = hymnsData.find(h => h.number === num);
                if (hymn) {
                    selectHymn(hymn, false);
                    return;
                }
            }
        }
    }
    
    // Check for hymn hash (new hymnal)
    const num = parseInt(hash);
    if (num > 0 && num <= 645) {
        if (currentMode !== 'hymn') {
            switchMode('hymn', false);
        }
        if (currentHymnal !== 'new') {
            switchHymnal('new', false);
        }
        const hymn = hymnsData.find(h => h.number === num);
        if (hymn) {
            selectHymn(hymn, false);
            return;
        }
    }
    
    // Clear display if no valid hash
    if (currentMode === 'hymn') {
        selectedHymn = null;
    } else if (currentMode === 'catechism') {
        selectedCatechism = null;
    } else {
        selectedLiturgy = null;
    }
    const catechismReaderContent = document.getElementById('catechism-reader-content');
    emptyState.style.display = 'flex';
    readerContent.style.display = 'none';
    catechismReaderContent.style.display = 'none';
    scoreToggleBtn.style.display = 'none';
}

// Search Logic
function handleSearch(e) {
    const query = e.target.value.trim().toLowerCase();
    
    if (currentMode === 'catechism') {
        handleCatechismSearch(query);
        return;
    }
    
    if (currentMode === 'liturgy') {
        handleLiturgySearch(query);
        return;
    }
    
    if (!query) {
        renderHymnList(hymnsData);
        return;
    }
    
    const isNum = !isNaN(query) && query !== '';
    const filtered = hymnsData.filter(h => {
        if (isNum) {
            return h.number.toString() === query || h.number.toString().includes(query);
        }
        
        // Search Titles
        if (h.title_ko.toLowerCase().includes(query) || 
            h.title_en.toLowerCase().includes(query) ||
            (h.title_id && h.title_id.toLowerCase().includes(query)) ||
            (h.alt_titles && h.alt_titles.some(alt => alt.toLowerCase().includes(query)))) {
            return true;
        }
        
        // Search inside lyrics
        return h.lyrics.some(v => 
            v.lines.some(l => 
                l.ko.toLowerCase().includes(query) || 
                l.en.toLowerCase().includes(query) ||
                (l.id && l.id.toLowerCase().includes(query))
            )
        );
    });
    
    renderHymnList(filtered);
}

// Catechism Search Logic
function handleCatechismSearch(query) {
    if (!query) {
        renderCatechismList(catechismData);
        return;
    }
    
    const isNum = !isNaN(query) && query !== '';
    const filtered = catechismData.filter(c => {
        if (isNum) {
            return c.number.toString() === query || c.number.toString().includes(query);
        }
        return c.question_ko.toLowerCase().includes(query) ||
               c.answer_ko.toLowerCase().includes(query) ||
               c.question_en.toLowerCase().includes(query) ||
               c.answer_en.toLowerCase().includes(query);
    });
    
    renderCatechismList(filtered);
}

// Liturgy Search Logic
function handleLiturgySearch(query) {
    if (!query) {
        renderLiturgyList(liturgiesData);
        return;
    }
    
    const isNum = !isNaN(query) && query !== '';
    const filtered = liturgiesData.filter(item => {
        if (isNum) {
            return item.number.toString() === query || item.number.toString().includes(query);
        }
        return item.title_ko.toLowerCase().includes(query) ||
               item.title_en.toLowerCase().includes(query) ||
               item.lyrics.some(v => 
                   v.lines.some(l => 
                       l.ko.toLowerCase().includes(query) || 
                       l.en.toLowerCase().includes(query)
                   )
               );
    });
    
    renderLiturgyList(filtered);
}

function renderHymnList(list) {
    hymnList.innerHTML = '';
    
    if (list.length === 0) {
        hymnList.innerHTML = '<div class="empty-state">검색 결과가 없습니다.</div>';
        return;
    }
    
    const fragment = document.createDocumentFragment();
    list.forEach(h => {
        const li = document.createElement('li');
        li.className = 'hymn-item';
        if (selectedHymn && selectedHymn.number === h.number) {
            li.classList.add('active');
        }
        
        let displayTitle = '';
        let listSubtitle = '';
        
        if (currentHymnal === 'trinity' || currentHymnal === 'trinity_1990') {
            displayTitle = h.title_en;
            if (!isKoreanOnlyShortcut && h.title_ko) {
                listSubtitle = h.title_ko;
            }
        } else {
            displayTitle = h.title_ko;
            if (!isKoreanOnlyShortcut) {
                const subtitles = [];
                if (activeLanguages.includes('en') && h.title_en) subtitles.push(h.title_en);
                if (activeLanguages.includes('id') && h.title_id) subtitles.push(h.title_id);
                listSubtitle = subtitles.join(' / ') || h.title_en;
            }
        }
        
        li.innerHTML = `
            <div class="hymn-item-number">${h.number}</div>
            <div class="hymn-item-content">
                <div class="hymn-item-title-ko">${displayTitle}</div>
                <div class="hymn-item-title-en">${listSubtitle}</div>
            </div>
        `;
        
        li.addEventListener('click', () => {
            selectHymn(h, true);
            sidebar.classList.remove('open'); // Close responsive drawer on selection
        });
        fragment.appendChild(li);
    });
    
    hymnList.appendChild(fragment);
}
 
// Handle Hymn Selection
function selectHymn(hymn, updateHash = true) {
    selectedHymn = hymn;
    
    // Highlight list item
    document.querySelectorAll('.hymn-item').forEach(el => {
        const numEl = el.querySelector('.hymn-item-number');
        if (numEl && parseInt(numEl.textContent) === hymn.number) {
            el.classList.add('active');
            el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else {
            el.classList.remove('active');
        }
    });
    
    renderHymnDetail(hymn);
    closeScore(); // Close score overlay when switching songs
    
    if (updateHash) {
        if (currentHymnal === 'trinity_1990') {
            window.location.hash = `#tr90-${hymn.number}`;
        } else if (currentHymnal === 'trinity') {
            window.location.hash = `#tr-${hymn.number}`;
        } else {
            window.location.hash = `#${hymn.number}`;
        }
    }
}
 
// Render the Main Hymn Text View
function renderHymnDetail(hymn) {
    emptyState.style.display = 'none';
    readerContent.style.display = 'block';
    
    const activeLangs = isKoreanOnlyShortcut ? ['ko'] : activeLanguages;
    
    // Dynamically build titles
    let mainTitle = '';
    let subTitles = [];
    
    if (currentHymnal === 'trinity' || currentHymnal === 'trinity_1990') {
        mainTitle = hymn.title_en;
        if (!isKoreanOnlyShortcut && hymn.title_ko) {
            subTitles.push(hymn.title_ko);
        }
    } else {
        if (activeLangs.includes('ko')) {
            mainTitle = hymn.title_ko;
            if (activeLangs.includes('en') && hymn.title_en) subTitles.push(hymn.title_en);
            if (activeLangs.includes('id') && hymn.title_id) subTitles.push(hymn.title_id);
        } else if (activeLangs.includes('en')) {
            mainTitle = hymn.title_en || hymn.title_ko;
            if (activeLangs.includes('id') && hymn.title_id) subTitles.push(hymn.title_id);
        } else if (activeLangs.includes('id')) {
            mainTitle = hymn.title_id || hymn.title_ko;
        } else {
            mainTitle = hymn.title_ko;
        }
    }
    
    // Populate header
    viewTitleKo.textContent = mainTitle;
    viewTitleEn.textContent = subTitles.join(' / ');
    viewTitleEn.style.display = subTitles.length > 0 ? 'block' : 'none';
    
    const isTrinity = (currentHymnal === 'trinity' || currentHymnal === 'trinity_1990');
    if (currentHymnal === 'trinity_1990') {
        viewHymnNumber.textContent = `Trinity (1990) No. ${hymn.number}`;
        if (hymn.matched_ko_number) {
            viewHymnNumber.textContent += ` (새찬송가 ${hymn.matched_ko_number}장)`;
        }
    } else if (currentHymnal === 'trinity') {
        viewHymnNumber.textContent = `Trinity (1961) No. ${hymn.number}`;
        if (hymn.matched_ko_number) {
            viewHymnNumber.textContent += ` (새찬송가 ${hymn.matched_ko_number}장)`;
        }
    } else {
        viewHymnNumber.textContent = `제 ${hymn.number} 장`;
    }
    
    // Generate Lyrics Body
    viewLyricsBody.setAttribute('data-layout', (isTrinity && isKoreanOnlyShortcut) ? 'tr-ko-only' : (isKoreanOnlyShortcut ? 'ko-only' : 'multilingual'));
    viewLyricsBody.innerHTML = '';
    
    const fragment = document.createDocumentFragment();
    
    hymn.lyrics.forEach(verse => {
        const verseDiv = document.createElement('div');
        verseDiv.className = 'verse-block';
        
        const verseNumSpan = document.createElement('span');
        verseNumSpan.className = 'verse-number';
        verseNumSpan.textContent = verse.verse;
        verseDiv.appendChild(verseNumSpan);
        
        verse.lines.forEach(line => {
            const pairDiv = document.createElement('div');
            pairDiv.className = 'lyric-line-pair';
            
            let hasContent = false;
            const langsToRender = (isTrinity && isKoreanOnlyShortcut) ? ['ko', 'en'] : activeLangs;
            
            langsToRender.forEach(lang => {
                // In Trinity mode, if isKoreanOnlyShortcut is true, fallback to en if ko is empty.
                if (isTrinity && isKoreanOnlyShortcut && lang === 'en') {
                    if (line['ko'] && line['ko'].trim() !== '') {
                        return; // already rendered ko, skip fallback en
                    }
                }
                
                if (line[lang] && line[lang].trim() !== '') {
                    const lineDiv = document.createElement('div');
                    lineDiv.className = `line-${lang}`;
                    lineDiv.textContent = line[lang];
                    pairDiv.appendChild(lineDiv);
                    hasContent = true;
                }
            });
            
            if (hasContent) {
                verseDiv.appendChild(pairDiv);
            }
        });
        
        fragment.appendChild(verseDiv);
    });
    
    viewLyricsBody.appendChild(fragment);
    
    // Show/hide sheet music toggle button
    if (hymn.score_path) {
        scoreToggleBtn.style.display = 'flex';
        scoreImgElement.src = hymn.score_path;
        if (currentHymnal === 'trinity') {
            scoreTitleLabel.textContent = `악보 보기 - Trinity No. ${hymn.number} (${hymn.title_en})`;
        } else {
            scoreTitleLabel.textContent = `악보 보기 - 제 ${hymn.number} 장 (${hymn.title_ko})`;
        }
    } else {
        scoreToggleBtn.style.display = 'none';
    }
}

// ============================================
// Mode Switching (Hymn ↔ Catechism)
// ============================================
function switchMode(mode, clearHash = true) {
    if (currentMode === mode) return;
    currentMode = mode;
    
    const sidebarBrandTitle = document.getElementById('sidebar-brand-title');
    const emptyStateTitle = document.getElementById('empty-state-title');
    const emptyStateDesc = document.getElementById('empty-state-desc');
    const catechismReaderContent = document.getElementById('catechism-reader-content');
    
    // Update tab active states
    document.querySelectorAll('.mode-tab').forEach(tab => {
        if (tab.getAttribute('data-mode') === mode) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Clear search
    searchInput.value = '';
    
    if (mode === 'liturgy') {
        // Switch to liturgy mode
        sidebarBrandTitle.textContent = '예배/기도';
        searchInput.placeholder = '제목 또는 내용 검색...';
        emptyStateTitle.textContent = '예배/기도 항목을 선택해 주세요';
        emptyStateDesc.textContent = '왼쪽 목록에서 선택하거나 검색창에서 바로 찾을 수 있습니다.';
        
        // Hide both selectors
        document.getElementById('hymnal-selector').style.display = 'none';
        document.getElementById('catechism-selector').style.display = 'none';
        
        // Render liturgy list
        renderLiturgyList(liturgiesData);
        
        // Hide readers, show empty state
        readerContent.style.display = 'none';
        catechismReaderContent.style.display = 'none';
        emptyState.style.display = 'flex';
        scoreToggleBtn.style.display = 'none';
        
        selectedLiturgy = null;
        if (clearHash) window.location.hash = '';
    } else if (mode === 'catechism') {
        // Switch to catechism mode
        if (currentCatechismType === 'larger') {
            sidebarBrandTitle.textContent = '대요리문답 (196)';
        } else {
            sidebarBrandTitle.textContent = '소요리문답 (107)';
        }
        searchInput.placeholder = '번호 또는 문답 검색...';
        emptyStateTitle.textContent = '문답을 선택해 주세요';
        emptyStateDesc.textContent = '왼쪽 목록에서 문답을 선택하거나 검색창에서 바로 찾을 수 있습니다.';
        
        // Hide hymnal selector, show catechism selector
        document.getElementById('hymnal-selector').style.display = 'none';
        document.getElementById('catechism-selector').style.display = 'flex';
        
        // Render catechism list
        renderCatechismList(catechismData);
        
        // Hide hymn reader, show empty state
        readerContent.style.display = 'none';
        catechismReaderContent.style.display = 'none';
        emptyState.style.display = 'flex';
        scoreToggleBtn.style.display = 'none';
        
        selectedCatechism = null;
        if (clearHash) window.location.hash = '';
    } else {
        // Switch to hymn mode
        // Show hymnal selector, hide catechism selector
        document.getElementById('hymnal-selector').style.display = 'flex';
        document.getElementById('catechism-selector').style.display = 'none';
        
        if (currentHymnal === 'trinity_1990') {
            sidebarBrandTitle.textContent = '트리니티 (1990) (742)';
        } else if (currentHymnal === 'trinity') {
            sidebarBrandTitle.textContent = '트리니티 (1961) (730)';
        } else {
            sidebarBrandTitle.textContent = '새찬송가 (645)';
        }
        searchInput.placeholder = '번호 또는 가사 검색...';
        emptyStateTitle.textContent = '찬송가를 선택해 주세요';
        emptyStateDesc.textContent = '왼쪽 목록에서 곡을 선택하거나 검색창에서 바로 찾을 수 있습니다.';
        
        // Render hymn list
        renderHymnList(hymnsData);
        
        // Hide catechism reader, show empty state
        readerContent.style.display = 'none';
        catechismReaderContent.style.display = 'none';
        emptyState.style.display = 'flex';
        scoreToggleBtn.style.display = 'none';
        
        selectedHymn = null;
        if (clearHash) window.location.hash = '';
    }
}

// ============================================
// Hymnal Switching (New Hymnal ↔ Trinity)
// ============================================
async function loadTrinityData() {
    if (trinityHymnsData.length > 0) return;
    
    // Show spinner in list while loading
    const loadingLi = document.createElement('div');
    loadingLi.className = 'empty-state';
    loadingLi.innerHTML = `
        <svg class="spinner" width="24" height="24" viewBox="0 0 50 50" style="animation: rotate 2s linear infinite; margin-bottom: 12px;">
            <circle class="path" cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" style="animation: dash 1.5s ease-in-out infinite; stroke: var(--accent);"></circle>
        </svg>
        <span>트리니티 (1961) 로딩 중...</span>
    `;
    hymnList.innerHTML = '';
    hymnList.appendChild(loadingLi);
    
    try {
        console.log("Loading Trinity Hymns database...");
        const response = await fetch('data/trinity_hymns.json');
        if (!response.ok) {
            throw new Error(`HTTP error loading Trinity hymns! status: ${response.status}`);
        }
        trinityHymnsData = await response.json();
        trinityHymnsData.sort((a, b) => a.number - b.number);
    } catch (e) {
        console.error("Failed to load Trinity Hymns:", e);
        alert("트리니티 찬송가 데이터를 불러오지 못했습니다: " + e.message);
        throw e;
    }
}

async function loadTrinity1990Data() {
    if (trinity1990HymnsData.length > 0) return;
    
    // Show spinner in list while loading
    const loadingLi = document.createElement('div');
    loadingLi.className = 'empty-state';
    loadingLi.innerHTML = `
        <svg class="spinner" width="24" height="24" viewBox="0 0 50 50" style="animation: rotate 2s linear infinite; margin-bottom: 12px;">
            <circle class="path" cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" style="animation: dash 1.5s ease-in-out infinite; stroke: var(--accent);"></circle>
        </svg>
        <span>트리니티 (1990) 로딩 중...</span>
    `;
    hymnList.innerHTML = '';
    hymnList.appendChild(loadingLi);
    
    try {
        console.log("Loading Trinity 1990 Hymns database...");
        const response = await fetch('data/trinity_hymns_1990.json');
        if (!response.ok) {
            throw new Error(`HTTP error loading Trinity 1990 hymns! status: ${response.status}`);
        }
        trinity1990HymnsData = await response.json();
        trinity1990HymnsData.sort((a, b) => a.number - b.number);
    } catch (e) {
        console.error("Failed to load Trinity 1990 Hymns:", e);
        alert("트리니티 (1990) 데이터를 불러오지 못했습니다: " + e.message);
        throw e;
    }
}

async function switchHymnal(hymnal, clearHash = true) {
    if (currentHymnal === hymnal && hymnsData.length > 0) return;
    
    const prevHymnal = currentHymnal;
    currentHymnal = hymnal;
    localStorage.setItem('hymn-current-hymnal', hymnal);
    
    // Update active tab styles
    document.querySelectorAll('.hymnal-tab').forEach(tab => {
        if (tab.getAttribute('data-hymnal') === hymnal) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    const sidebarBrandTitle = document.getElementById('sidebar-brand-title');
    
    if (hymnal === 'trinity_1990') {
        sidebarBrandTitle.textContent = '트리니티 (1990) (742)';
        try {
            await loadTrinity1990Data();
            hymnsData = trinity1990HymnsData;
        } catch (e) {
            // Revert active tab styles on failure
            currentHymnal = prevHymnal;
            localStorage.setItem('hymn-current-hymnal', prevHymnal);
            document.querySelectorAll('.hymnal-tab').forEach(tab => {
                if (tab.getAttribute('data-hymnal') === prevHymnal) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });
            sidebarBrandTitle.textContent = prevHymnal === 'trinity' ? '트리니티 (1961) (730)' : (prevHymnal === 'trinity_1990' ? '트리니티 (1990) (742)' : '새찬송가 (645)');
            return;
        }
    } else if (hymnal === 'trinity') {
        sidebarBrandTitle.textContent = '트리니티 (1961) (730)';
        try {
            await loadTrinityData();
            hymnsData = trinityHymnsData;
        } catch (e) {
            // Revert active tab styles on failure
            currentHymnal = prevHymnal;
            localStorage.setItem('hymn-current-hymnal', prevHymnal);
            document.querySelectorAll('.hymnal-tab').forEach(tab => {
                if (tab.getAttribute('data-hymnal') === prevHymnal) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });
            sidebarBrandTitle.textContent = prevHymnal === 'trinity' ? '트리니티 (1961) (730)' : (prevHymnal === 'trinity_1990' ? '트리니티 (1990) (742)' : '새찬송가 (645)');
            return;
        }
    } else {
        sidebarBrandTitle.textContent = '새찬송가 (645)';
        hymnsData = newHymnsData;
    }
    
    // Clear search
    searchInput.value = '';
    
    // Render the new hymn list
    renderHymnList(hymnsData);
    
    // Reset reading view
    selectedHymn = null;
    emptyState.style.display = 'flex';
    readerContent.style.display = 'none';
    scoreToggleBtn.style.display = 'none';
    
    if (clearHash) {
        window.location.hash = '';
    }
}

// Render the sidebar list of catechism questions
function renderCatechismList(list) {
    hymnList.innerHTML = '';
    
    if (list.length === 0) {
        hymnList.innerHTML = '<div class="empty-state">검색 결과가 없습니다.</div>';
        return;
    }
    
    const activeLangs = isKoreanOnlyShortcut ? ['ko'] : activeLanguages;
    const fragment = document.createDocumentFragment();
    
    list.forEach(c => {
        const li = document.createElement('li');
        li.className = 'hymn-item';
        if (selectedCatechism && selectedCatechism.number === c.number) {
            li.classList.add('active');
        }
        
        // Build question preview
        let questionPreview = c.question_ko;
        if (!isKoreanOnlyShortcut && activeLangs.includes('en')) {
            questionPreview = c.question_ko;
        } else if (!activeLangs.includes('ko') && activeLangs.includes('en')) {
            questionPreview = c.question_en;
        }
        
        let subtitle = '';
        if (!isKoreanOnlyShortcut && activeLangs.includes('en') && activeLangs.includes('ko')) {
            subtitle = c.question_en;
        }
        
        li.innerHTML = `
            <div class="hymn-item-number">${c.number}</div>
            <div class="hymn-item-content">
                <div class="hymn-item-title-ko">${questionPreview}</div>
                <div class="hymn-item-title-en">${subtitle}</div>
            </div>
        `;
        
        li.addEventListener('click', () => {
            selectCatechism(c, true);
            sidebar.classList.remove('open');
        });
        fragment.appendChild(li);
    });
    
    hymnList.appendChild(fragment);
}

// Handle Catechism Selection
function selectCatechism(item, updateHash = true) {
    selectedCatechism = item;
    
    // Highlight list item
    document.querySelectorAll('.hymn-item').forEach(el => {
        const numEl = el.querySelector('.hymn-item-number');
        if (numEl && parseInt(numEl.textContent) === item.number) {
            el.classList.add('active');
            el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else {
            el.classList.remove('active');
        }
    });
    
    renderCatechismDetail(item);
    closeScore();
    
    if (updateHash) {
        if (currentCatechismType === 'larger') {
            window.location.hash = `#wlc-${item.number}`;
        } else {
            window.location.hash = `#wsc-${item.number}`;
        }
    }
}

// Render Liturgy List inside Sidebar
function renderLiturgyList(list) {
    hymnList.innerHTML = '';
    
    if (list.length === 0) {
        hymnList.innerHTML = '<div class="empty-state">검색 결과가 없습니다.</div>';
        return;
    }
    
    const activeLangs = isKoreanOnlyShortcut ? ['ko'] : activeLanguages;
    const fragment = document.createDocumentFragment();
    
    list.forEach(item => {
        const li = document.createElement('li');
        li.className = 'hymn-item';
        if (selectedLiturgy && selectedLiturgy.number === item.number) {
            li.classList.add('active');
        }
        
        let titlePreview = item.title_ko;
        if (!isKoreanOnlyShortcut && activeLangs.includes('en')) {
            titlePreview = item.title_ko;
        } else if (!activeLangs.includes('ko') && activeLangs.includes('en')) {
            titlePreview = item.title_en;
        }
        
        let subtitle = '';
        if (!isKoreanOnlyShortcut && activeLangs.includes('en') && activeLangs.includes('ko')) {
            subtitle = item.title_en;
        }
        
        li.innerHTML = `
            <div class="hymn-item-number">${item.number}</div>
            <div class="hymn-item-content">
                <div class="hymn-item-title-ko">${titlePreview}</div>
                <div class="hymn-item-title-en">${subtitle}</div>
            </div>
        `;
        
        li.addEventListener('click', () => {
            selectLiturgy(item, true);
            sidebar.classList.remove('open');
        });
        fragment.appendChild(li);
    });
    
    hymnList.appendChild(fragment);
}

// Handle Liturgy Selection
function selectLiturgy(item, updateHash = true) {
    selectedLiturgy = item;
    
    // Highlight list item
    document.querySelectorAll('.hymn-item').forEach(el => {
        const numEl = el.querySelector('.hymn-item-number');
        if (numEl && parseInt(numEl.textContent) === item.number) {
            el.classList.add('active');
            el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else {
            el.classList.remove('active');
        }
    });
    
    renderLiturgyDetail(item);
    closeScore();
    
    if (updateHash) {
        window.location.hash = `#liturgy-${item.number}`;
    }
}

// Render Liturgy Detail View
function renderLiturgyDetail(item) {
    emptyState.style.display = 'none';
    catechismReaderContent.style.display = 'none';
    readerContent.style.display = 'block';
    scoreToggleBtn.style.display = 'none';
    
    const activeLangs = isKoreanOnlyShortcut ? ['ko'] : activeLanguages;
    
    // Titles
    let mainTitle = '';
    let subTitle = '';
    
    if (activeLangs.includes('ko')) {
        mainTitle = item.title_ko;
        if (activeLangs.includes('en')) subTitle = item.title_en;
    } else {
        mainTitle = item.title_en;
    }
    
    viewTitleKo.textContent = mainTitle;
    viewTitleEn.textContent = subTitle;
    viewTitleEn.style.display = subTitle ? 'block' : 'none';
    
    viewHymnNumber.textContent = activeLangs.includes('ko') ? '예배와 기도' : 'Liturgy and Prayer';
    
    viewLyricsBody.setAttribute('data-layout', isKoreanOnlyShortcut ? 'ko-only' : 'multilingual');
    viewLyricsBody.innerHTML = '';
    
    // Apply font classes
    viewLyricsBody.classList.remove('font-serif', 'font-sans', 'font-system');
    viewLyricsBody.classList.add(`font-${currentFontFamily}`);
    viewLyricsBody.style.fontSize = `${fontSize}rem`;
    
    const fragment = document.createDocumentFragment();
    
    item.lyrics.forEach(verse => {
        const verseDiv = document.createElement('div');
        verseDiv.className = 'verse-block';
        verseDiv.style.paddingLeft = '0'; // Liturgy paragraphs don't need verse numbers indent
        
        verse.lines.forEach(line => {
            const pairDiv = document.createElement('div');
            pairDiv.className = 'lyric-line-pair';
            
            let hasContent = false;
            activeLangs.forEach(lang => {
                if (line[lang] && line[lang].trim() !== '') {
                    const lineDiv = document.createElement('div');
                    lineDiv.className = `line-${lang}`;
                    lineDiv.innerHTML = line[lang]; // Use innerHTML to support HTML formatting tags
                    pairDiv.appendChild(lineDiv);
                    hasContent = true;
                }
            });
            
            if (hasContent) {
                verseDiv.appendChild(pairDiv);
            }
        });
        
        fragment.appendChild(verseDiv);
    });
    
    viewLyricsBody.appendChild(fragment);
    
    // Add simple navigation buttons at the bottom of viewLyricsBody
    const nav = document.createElement('div');
    nav.className = 'catechism-nav';
    nav.style.marginTop = '40px';
    
    const prevBtn = document.createElement('button');
    prevBtn.className = 'catechism-nav-btn';
    prevBtn.innerHTML = '← 이전';
    prevBtn.disabled = item.number <= 1;
    prevBtn.addEventListener('click', () => {
        const prev = liturgiesData.find(l => l.number === item.number - 1);
        if (prev) selectLiturgy(prev, true);
    });
    
    const currentLabel = document.createElement('span');
    currentLabel.className = 'catechism-nav-current';
    currentLabel.textContent = `${item.number} / ${liturgiesData.length}`;
    
    const nextBtn = document.createElement('button');
    nextBtn.className = 'catechism-nav-btn';
    nextBtn.innerHTML = '다음 →';
    nextBtn.disabled = item.number >= liturgiesData.length;
    nextBtn.addEventListener('click', () => {
        const next = liturgiesData.find(l => l.number === item.number + 1);
        if (next) selectLiturgy(next, true);
    });
    
    nav.appendChild(prevBtn);
    nav.appendChild(currentLabel);
    nav.appendChild(nextBtn);
    viewLyricsBody.appendChild(nav);
}

// Render Catechism Q&A Detail View
function renderCatechismDetail(item) {
    const catechismReaderContent = document.getElementById('catechism-reader-content');
    const catechismBody = document.getElementById('catechism-body');
    const catechismSectionBadge = document.getElementById('catechism-section-badge');
    const catechismTitleNumber = document.getElementById('catechism-title-number');
    
    emptyState.style.display = 'none';
    readerContent.style.display = 'none';
    catechismReaderContent.style.display = 'block';
    scoreToggleBtn.style.display = 'none';
    
    const activeLangs = isKoreanOnlyShortcut ? ['ko'] : activeLanguages;
    
    // Section badge
    const section = CATECHISM_SECTIONS[item.section];
    if (section) {
        const badgeText = activeLangs.includes('ko') ? section.ko : section.en;
        catechismSectionBadge.textContent = badgeText;
        catechismSectionBadge.style.display = 'inline-block';
    } else {
        catechismSectionBadge.style.display = 'none';
    }
    
    // Title
    catechismTitleNumber.textContent = `제 ${item.number} 문`;
    
    // Build Q&A body
    catechismBody.innerHTML = '';
    
    // Apply font classes
    catechismBody.classList.remove('font-serif', 'font-sans', 'font-system');
    catechismBody.classList.add(`font-${currentFontFamily}`);
    catechismBody.style.fontSize = `${fontSize}rem`;
    
    const qaBlock = document.createElement('div');
    qaBlock.className = 'catechism-qa-block';
    
    // Question Section
    const qSection = document.createElement('div');
    qSection.className = 'catechism-question-section';
    
    const qLabel = document.createElement('div');
    qLabel.className = 'catechism-label catechism-label-q';
    qLabel.textContent = 'QUESTION 질문';
    qSection.appendChild(qLabel);
    
    if (activeLangs.includes('ko')) {
        const qKo = document.createElement('div');
        qKo.className = 'catechism-text-ko';
        qKo.textContent = item.question_ko;
        qSection.appendChild(qKo);
    }
    if (activeLangs.includes('en')) {
        const qEn = document.createElement('div');
        qEn.className = 'catechism-text-en';
        qEn.textContent = item.question_en;
        qSection.appendChild(qEn);
    }
    
    qaBlock.appendChild(qSection);
    
    // Answer Section
    const aSection = document.createElement('div');
    aSection.className = 'catechism-answer-section';
    
    const aLabel = document.createElement('div');
    aLabel.className = 'catechism-label catechism-label-a';
    aLabel.textContent = 'ANSWER 답';
    aSection.appendChild(aLabel);
    
    if (activeLangs.includes('ko')) {
        const aKo = document.createElement('div');
        aKo.className = 'catechism-text-ko';
        aKo.textContent = item.answer_ko;
        aSection.appendChild(aKo);
    }
    if (activeLangs.includes('en')) {
        const aEn = document.createElement('div');
        aEn.className = 'catechism-text-en';
        aEn.textContent = item.answer_en;
        aSection.appendChild(aEn);
    }
    
    qaBlock.appendChild(aSection);
    catechismBody.appendChild(qaBlock);
    
    // Navigation buttons
    const nav = document.createElement('div');
    nav.className = 'catechism-nav';
    
    const prevBtn = document.createElement('button');
    prevBtn.className = 'catechism-nav-btn';
    prevBtn.innerHTML = '← 이전';
    prevBtn.disabled = item.number <= 1;
    prevBtn.addEventListener('click', () => {
        const prev = catechismData.find(c => c.number === item.number - 1);
        if (prev) selectCatechism(prev, true);
    });
    
    const currentLabel = document.createElement('span');
    currentLabel.className = 'catechism-nav-current';
    currentLabel.textContent = `${item.number} / ${catechismData.length}`;
    
    const nextBtn = document.createElement('button');
    nextBtn.className = 'catechism-nav-btn';
    nextBtn.innerHTML = '다음 →';
    nextBtn.disabled = item.number >= catechismData.length;
    nextBtn.addEventListener('click', () => {
        const next = catechismData.find(c => c.number === item.number + 1);
        if (next) selectCatechism(next, true);
    });
    
    nav.appendChild(prevBtn);
    nav.appendChild(currentLabel);
    nav.appendChild(nextBtn);
    catechismBody.appendChild(nav);
}

// Switch between Shorter and Larger catechisms
function switchCatechismType(type, clearHash = true) {
    if (currentCatechismType === type) return;
    currentCatechismType = type;
    localStorage.setItem('hymn-current-catechism-type', type);
    
    // Update active tab styles
    document.querySelectorAll('[data-catechism-type]').forEach(tab => {
        if (tab.getAttribute('data-catechism-type') === type) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    const sidebarBrandTitle = document.getElementById('sidebar-brand-title');
    
    if (type === 'larger') {
        sidebarBrandTitle.textContent = '대요리문답 (196)';
        catechismData = largerCatechismData;
    } else {
        sidebarBrandTitle.textContent = '소요리문답 (107)';
        catechismData = shorterCatechismData;
    }
    
    // Clear search
    searchInput.value = '';
    
    // Render the list
    renderCatechismList(catechismData);
    
    // Reset reading view
    selectedCatechism = null;
    emptyState.style.display = 'flex';
    readerContent.style.display = 'none';
    document.getElementById('catechism-reader-content').style.display = 'none';
    
    if (clearHash) {
        window.location.hash = '';
    }
}

// Layout Switcher Label update
function updateLayoutUI() {
    document.querySelectorAll('#layout-toggle-btn svg').forEach(el => el.remove());
    
    let btnText = "다국어 대조";
    let svgIcon = '';
    
    if (isKoreanOnlyShortcut) {
        btnText = "한글만";
        svgIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`;
        layoutToggleBtn.classList.remove('active');
    } else {
        btnText = "다국어 대조";
        svgIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="3" x2="12" y2="21"></line></svg>`;
        layoutToggleBtn.classList.add('active');
    }
    
    layoutLabel.textContent = btnText;
    layoutToggleBtn.insertAdjacentHTML('afterbegin', svgIcon);
}

// Score Modal Toggles
function openScore() {
    if (selectedHymn && selectedHymn.score_path) {
        scoreOverlay.classList.add('open');
        closeSettings(); // Close settings drawer if score is opened
    }
}

function closeScore() {
    scoreOverlay.classList.remove('open');
}

// Settings Modal Toggles
function openSettings() {
    settingsOverlay.classList.add('open');
    closeScore(); // Close score if settings is opened
}

function closeSettings() {
    settingsOverlay.classList.remove('open');
}

// Theme Application
function applyTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('hymn-theme', theme);
    
    // Update theme-color meta tag for PWA standalone browser header color matching
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
        if (theme === 'dark') themeColorMeta.setAttribute('content', '#0a0b0d');
        else if (theme === 'sepia') themeColorMeta.setAttribute('content', '#f4ecd8');
        else themeColorMeta.setAttribute('content', '#f8f9fa');
    }
    
    // Set active button state
    document.querySelectorAll('.theme-select-card').forEach(btn => {
        if (btn.getAttribute('data-theme-val') === theme) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Apply Font Sizes
function applyFontSize() {
    viewLyricsBody.style.fontSize = `${fontSize}rem`;
    const catechismBody = document.getElementById('catechism-body');
    if (catechismBody) catechismBody.style.fontSize = `${fontSize}rem`;
    if (fontSizeDisplayPercent) {
        // Calculate percentage based on 1.25rem = 100%
        const pct = Math.round((fontSize / 1.25) * 100);
        fontSizeDisplayPercent.textContent = `${pct}%`;
    }
}

// Apply Font Families
function applyFontFamily(fontFamily) {
    if (fontFamily) {
        currentFontFamily = fontFamily;
        localStorage.setItem('hymn-font-family', fontFamily);
    }
    
    // Update classes on viewLyricsBody
    viewLyricsBody.classList.remove('font-serif', 'font-sans', 'font-system');
    viewLyricsBody.classList.add(`font-${currentFontFamily}`);
    
    // Update classes on catechismBody
    const catechismBody = document.getElementById('catechism-body');
    if (catechismBody) {
        catechismBody.classList.remove('font-serif', 'font-sans', 'font-system');
        catechismBody.classList.add(`font-${currentFontFamily}`);
    }
    
    // Update active state in Settings select buttons
    document.querySelectorAll('.font-family-btn').forEach(btn => {
        if (btn.getAttribute('data-font-val') === currentFontFamily) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Screen Wake Lock API Control
async function toggleWakeLock() {
    if ('wakeLock' in navigator) {
        if (wakeLock === null) {
            await requestWakeLock();
        } else {
            await releaseWakeLock();
        }
    } else {
        alert("이 브라우저 혹은 기기는 화면 꺼짐 방지(Wake Lock) 기능을 지원하지 않습니다.");
    }
}

async function requestWakeLock(isSilent = false) {
    try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLockDot.classList.add('active');
        wakeLockBtn.querySelector('span:last-child').textContent = "화면 고정";
        wakeLockBtn.classList.add('active');
        
        wakeLock.addEventListener('release', () => {
            if (wakeLock !== null) {
                // If it released automatically due to context change or lock
                resetWakeLockState();
            }
        });
        
        if (!isSilent) console.log("Wake Lock acquired successfully.");
    } catch (err) {
        console.error(`Failed to acquire Wake Lock: ${err.name}, ${err.message}`);
        resetWakeLockState();
    }
}

async function releaseWakeLock() {
    if (wakeLock !== null) {
        try {
            await wakeLock.release();
        } catch (e) {
            console.error("Error releasing wake lock:", e);
        }
        resetWakeLockState();
        console.log("Wake Lock released manually.");
    }
}

function resetWakeLockState() {
    wakeLock = null;
    wakeLockDot.classList.remove('active');
    wakeLockBtn.querySelector('span:last-child').textContent = "화면 켬";
    wakeLockBtn.classList.remove('active');
}

// Service Worker Registration for Offline Cache support
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then(reg => {
                    console.log('ServiceWorker registered with scope: ', reg.scope);
                })
                .catch(err => {
                    console.error('ServiceWorker registration failed: ', err);
                });
        });

        // Auto-refresh when new service worker takes over control
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
                refreshing = true;
                window.location.reload();
            }
        });
    }
}

// Start app
window.addEventListener('DOMContentLoaded', init);
