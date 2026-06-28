/* ===========================
   OMMI · main.js
   =========================== */

// ── 图标 & 背景 配置 ────────────────────────────────────────
var FAVICON_PROVIDER = 'duckduckgo';
var PROXY = '';

function withProxy(originUrl) {
    if (!PROXY) return originUrl;
    return PROXY + '/' + originUrl.replace(/^https?:\/\//, '');
}

function buildFaviconUrl(domain) {
    if (!domain) return DEFAULT_ICON;
    if (FAVICON_PROVIDER === 'google')
        return withProxy('https://www.google.com/s2/favicons?sz=64&domain=' + domain);
    if (FAVICON_PROVIDER === 'duckduckgo')
        return withProxy('https://icons.duckduckgo.com/ip3/' + domain + '.ico');
    return DEFAULT_ICON;
}

// ── 内外网切换 ────────────────────────────────────────────────
var isIntranet = localStorage.getItem('netMode') === 'intranet';
var _linksData = null;

function getCardUrl(item) {
    return (isIntranet && item.intranet) ? item.intranet : item.url;
}

function toggleNetMode() {
    isIntranet = !isIntranet;
    localStorage.setItem('netMode', isIntranet ? 'intranet' : 'internet');
    updateNetToggleBtn();
    document.querySelectorAll('.card[data-url][data-intranet]').forEach(function(a) {
        var url = isIntranet ? a.dataset.intranet : a.dataset.url;
        a.href = url;
        var popup = a.querySelector('.info-popup');
        if (popup) popup.textContent = getDomain(url) || url;
        var badge = a.querySelector('.net-badge');
        if (badge) badge.textContent = isIntranet ? '内' : '外';
    });
}
window.toggleNetMode = toggleNetMode;

function updateNetToggleBtn() {
    var btn = document.getElementById('netToggleBtn');
    if (!btn) return;
    btn.textContent = isIntranet ? '🏠 内网' : '🌐 外网';
    btn.classList.toggle('intranet-active', isIntranet);
}

function injectNetToggleBtn() {
    if (document.getElementById('netToggleBtn')) return;
    var btn = document.createElement('button');
    btn.id = 'netToggleBtn';
    btn.className = 'net-toggle-btn';
    btn.addEventListener('click', function() {
        toggleNetMode();
    });
    document.body.appendChild(btn);
}

// ────────────────────────────────────────────────────────────
var isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
var BG_API = isMobile
    ? 'https://imgapi.cn/api.php?zd=mobile&fl=fengjing&gs=images&t='
    : 'https://imgapi.cn/api.php?fl=dongman&gs=images&t=';
var LINKS_FILE = 'links.json';
var DEFAULT_ICON = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiPjwvY2lyY2xlPjxwYXRoIGQ9Ik0yIDEyaDIwIj48L3BhdGg+PHBhdGggZD0iTTEyIDJhMTUuMyAxNS4zIDAgMCAxIDQgMTAgMTUuMyAxNS4zIDAgMCAxLTQgMTAgMTUuMyAxNS4zIDAgMCAxLTQtMTAgMTUuMyAxNS4zIDAgMCAxIDQtMTB6Ij48L3BhdGg+PC9zdmc+';

/* ── 搜索分类数据 ── */
var SEARCH_CATEGORIES = [
    {
        id: 'engine',
        label: '引擎',
        icon: '🔍',
        engines: [
            { name: '百度', icon: '🔵', url: 'https://www.baidu.com/s?wd=', domain: 'baidu.com' },
            { name: 'Google', icon: '🌐', url: 'https://www.google.com/search?q=', domain: 'google.com' },
            { name: 'DuckDuckGo', icon: '🦆', url: 'https://duckduckgo.com/?q=', domain: 'duckduckgo.com' },
        ]
    },
    {
        id: 'video',
        label: '视频',
        icon: '🎬',
        engines: [
            { name: 'B站', icon: '📺', url: 'https://search.bilibili.com/all?keyword=', domain: 'bilibili.com' },
        ]
    },
    {
        id: 'life',
        label: '生活',
        icon: '🛒',
        engines: [
            { name: '淘宝', icon: '🟠', url: 'https://s.taobao.com/search?q=', domain: 'taobao.com' },
            { name: '京东', icon: '🔴', url: 'https://search.jd.com/Search?keyword=', domain: 'jd.com' },
            { name: '拼多多', icon: '🟣', url: 'https://mobile.yangkeduo.com/search_result.html?search_key=', domain: 'pinduoduo.com' },
            { name: '做菜', icon: '🍳', url: 'https://www.xiachufang.com/search/?keyword=', domain: 'xiachufang.com' },
            { name: '翻译', icon: '🌐', url: 'https://fanyi.baidu.com/#zh/en/', domain: 'fanyi.baidu.com' },
        ]
    },
];

var currentCategoryId = 'engine';
var currentEngine = SEARCH_CATEGORIES[0].engines[0];
var enginePanelOpen = false;

/* ── 工具 ── */
function getDomain(url) {
    try {
        return new URL(url).hostname;
    } catch (e) {
        return null;
    }
}
function faviconSrc(url) {
    return buildFaviconUrl(getDomain(url));
}
function engineFavicon(engine) {
    return buildFaviconUrl(engine.domain);
}

/* ── 渲染分类 Tab ── */
function renderSearchTabs() {
    var tabsEl = document.getElementById('searchTabs');
    tabsEl.innerHTML = '';
    SEARCH_CATEGORIES.forEach(function(cat) {
        var btn = document.createElement('button');
        btn.className = 'search-tab' + (cat.id === currentCategoryId ? ' active' : '');
        btn.innerHTML = '<span class="tab-icon">' + cat.icon + '</span><span class="tab-label">' + cat.label + '</span>';
        btn.onclick = function() {
            selectCategory(cat.id);
            if (enginePanelOpen) renderEnginePanel();
        };
        tabsEl.appendChild(btn);
    });
}

/* ── 更新搜索框显示的引擎 ── */
function updateSearchBoxEngine() {
    var icon = document.getElementById('search-engine-icon');
    var nameEl = document.getElementById('engineName');
    icon.src = engineFavicon(currentEngine);
    icon.onerror = function() {
        icon.src = DEFAULT_ICON;
        icon.onerror = null;
    };
    nameEl.textContent = currentEngine.name;
}

/* ── 切换分类 ── */
function selectCategory(catId) {
    currentCategoryId = catId;
    var cat = SEARCH_CATEGORIES.find(function(c) {
        return c.id === catId;
    });
    currentEngine = cat.engines[0];
    renderSearchTabs();
    updateSearchBoxEngine();
}

/* ── 切换引擎 ── */
function selectEngine(engine) {
    currentEngine = engine;
    updateSearchBoxEngine();
    renderEnginePanel();
    document.getElementById('searchInput').focus();
}

/* ── 渲染内联引擎面板 ── */
function renderEnginePanel() {
    var panel = document.getElementById('enginePanel');
    panel.innerHTML = '';
    var cat = SEARCH_CATEGORIES.find(function(c) {
        return c.id === currentCategoryId;
    });
    if (!cat) return;

    cat.engines.forEach(function(engine) {
        var btn = document.createElement('button');
        btn.className = 'engine-btn' + (engine === currentEngine ? ' active' : '');

        var img = document.createElement('img');
        img.src = engineFavicon(engine);
        img.alt = engine.name;
        img.onerror = function() {
            var d = engine.domain;
            if (d && !this.dataset.fallbackTried) {
                this.dataset.fallbackTried = '1';
                this.src = 'https://' + d + '/favicon.ico';
            } else {
                this.src = DEFAULT_ICON;
                this.onerror = null;
            }
        };

        var label = document.createElement('span');
        label.textContent = engine.name;

        btn.appendChild(img);
        btn.appendChild(label);
        btn.onclick = function() {
            selectEngine(engine);
        };
        panel.appendChild(btn);
    });
}

/* ── 开关内联面板 ── */
function toggleEnginePanel() {
    enginePanelOpen ? closeEnginePanel() : openEnginePanel();
}

function openEnginePanel() {
    enginePanelOpen = true;
    renderEnginePanel();
    var panel = document.getElementById('enginePanel');
    panel.style.display = 'flex';
    document.getElementById('engineArrow').style.transform = 'rotate(180deg)';
}

function closeEnginePanel() {
    enginePanelOpen = false;
    document.getElementById('enginePanel').style.display = 'none';
    document.getElementById('engineArrow').style.transform = '';
}

/* ── 清空搜索框 ── */
function clearSearch() {
    var input = document.getElementById('searchInput');
    var clearBtn = document.getElementById('clearBtn');
    input.value = '';
    clearBtn.style.display = 'none';
    input.focus();
    filterLinks();
}
window.clearSearch = clearSearch;

/* ── 同步清空按钮显隐 ── */
function syncClearBtn() {
    var input = document.getElementById('searchInput');
    var clearBtn = document.getElementById('clearBtn');
    clearBtn.style.display = input.value.length > 0 ? 'flex' : 'none';
}

/* ── 执行搜索 ── */
function doSearch() {
    var kw = document.getElementById('searchInput').value.trim();
    if (kw) window.open(currentEngine.url + encodeURIComponent(kw), '_blank');
}
window.doSearch = doSearch;

/* ── 站内筛选 ── */
function filterLinks() {
    syncClearBtn();
    var query = document.getElementById('searchInput').value.toLowerCase().trim();

    document.querySelectorAll('.card').forEach(function(card) {
        if (!query) {
            card.classList.remove('hidden');
        } else {
            var title = (card.querySelector('.title') ? card.querySelector('.title').innerText : '').toLowerCase();
            var datadesc = (card.dataset.desc || '').toLowerCase();
            card.classList.toggle('hidden', title.indexOf(query) === -1 && datadesc.indexOf(query) === -1);
        }
    });

    document.querySelectorAll('.section').forEach(function(section) {
        if (!query) {
            section.classList.remove('section-hidden');
        } else {
            var visible = section.querySelectorAll('.card:not(.hidden)');
            section.classList.toggle('section-hidden', visible.length === 0);
        }
    });
}
window.filterLinks = filterLinks;

/* ── 动态渲染卡片 ── */
function renderCards(sections) {
    var main = document.getElementById('main-content');
    main.innerHTML = '';

    sections.forEach(function(group) {
        var sec = document.createElement('div');
        sec.className = 'section';

        var h2 = document.createElement('h2');
        h2.className = 'section-title';
        h2.textContent = group.section;
        sec.appendChild(h2);

        var grid = document.createElement('div');
        grid.className = 'link-container';

        group.items.forEach(function(item) {
            var a = document.createElement('a');
            a.href = getCardUrl(item);
            a.target = '_blank';
            a.className = 'card';
            a.dataset.desc = item['data-desc'] || item.desc || '';
            a.rel = 'noopener noreferrer';
            if (item.intranet) {
                a.dataset.url = item.url;
                a.dataset.intranet = item.intranet;
            }

            var img = document.createElement('img');
            img.className = 'favicon';
            img.loading = 'lazy';
            img.src = faviconSrc(item.url);
            img.onerror = function() {
                var domain = getDomain(item.url);
                if (domain && !this.dataset.fallbackTried) {
                    this.dataset.fallbackTried = '1';
                    this.src = 'https://' + domain + '/favicon.ico';
                } else {
                    this.src = DEFAULT_ICON;
                    this.onerror = null;
                }
            };

            var top = document.createElement('div');
            top.className = 'card-top';
            var titleEl = document.createElement('span');
            titleEl.className = 'title';
            titleEl.textContent = item.title;
            top.appendChild(img);
            top.appendChild(titleEl);

            var desc = document.createElement('div');
            desc.className = 'desc';
            desc.textContent = item.desc || '';

            var popup = document.createElement('div');
            popup.className = 'info-popup';
            popup.textContent = getDomain(getCardUrl(item)) || getCardUrl(item);

            a.appendChild(top);
            a.appendChild(desc);
            a.appendChild(popup);
            grid.appendChild(a);
        });

        sec.appendChild(grid);
        main.appendChild(sec);
    });

    bindTouchTooltip();
}

/* ── 移动端长按 Tooltip ── */
function bindTouchTooltip() {
    if (window.matchMedia('(hover: none)').matches) {
        var timer = null;
        var activeCard = null;

        function clearActive() {
            if (activeCard) {
                activeCard.classList.remove('touch-active');
                activeCard = null;
            }
            clearTimeout(timer);
            timer = null;
        }

        document.querySelectorAll('.card').forEach(function(card) {
            card.addEventListener('touchstart', function() {
                clearActive();
                timer = setTimeout(function() {
                    card.classList.add('touch-active');
                    activeCard = card;
                    setTimeout(clearActive, 2000);
                }, 500);
            }, { passive: true });

            card.addEventListener('touchend', function() {
                if (timer) clearTimeout(timer);
            });
            card.addEventListener('touchmove', function() {
                clearTimeout(timer);
                timer = null;
            }, { passive: true });
        });

        document.addEventListener('touchstart', function(e) {
            if (activeCard && !activeCard.contains(e.target)) clearActive();
        }, { passive: true });
    }
}

/* ── 随机背景 ── */
function changeBackground() {
    var url = BG_API + Date.now();
    document.getElementById('bgLayer').style.backgroundImage = 'url(\'' + url + '\')';
}

/* ── 入口 ── */
document.addEventListener('DOMContentLoaded', function() {
    changeBackground();

    renderSearchTabs();
    updateSearchBoxEngine();

    injectNetToggleBtn();
    updateNetToggleBtn();

    document.getElementById('engineTrigger').addEventListener('click', function() {
        toggleEnginePanel();
    });

    document.getElementById('searchInput').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') doSearch();
        if (e.key === 'Escape') closeEnginePanel();
    });

    fetch(LINKS_FILE)
        .then(function(res) { return res.json(); })
        .then(function(data) {
            _linksData = data;
            renderCards(data);
        })
        .catch(function(err) {
            console.error('加载 links.json 失败：', err);
            document.getElementById('main-content').innerHTML =
                '<p style="color:rgba(255,255,255,0.5);text-align:center;padding:2rem;">链接数据加载失败，请检查 links.json 文件。</p>';
        });
});
