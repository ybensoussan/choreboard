// ============================================
// ChoreBoard - Frontend Application
// ============================================

function handleAuthError() {
    state.auth = { authenticated: false, username: '', role: '' };
    updateAuthUI();
    showLoginModal();
}

const API = {
    async get(url) {
        const res = await fetch(url);
        if (res.status === 401) { handleAuthError(); return { error: 'Authentication required' }; }
        return res.json();
    },
    async post(url, data) {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (res.status === 401) { handleAuthError(); return { error: 'Authentication required' }; }
        return res.json();
    },
    async put(url, data) {
        const res = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (res.status === 401) { handleAuthError(); return { error: 'Authentication required' }; }
        return res.json();
    },
    async del(url) {
        const res = await fetch(url, { method: 'DELETE' });
        if (res.status === 401) { handleAuthError(); return { error: 'Authentication required' }; }
        return res.json();
    },
};

// ============================================
// Emoji → Twemoji SVG URL
// ============================================

function emojiToImgUrl(emoji) {
    const codePoints = [...emoji]
        .map(c => c.codePointAt(0).toString(16).toLowerCase())
        .filter(cp => cp !== 'fe0f');
    return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codePoints.join('-')}.svg`;
}

function emojiImg(emoji, cls) {
    const src = emojiToImgUrl(emoji);
    return `<img class="${cls}" src="${src}" alt="${emoji}" onerror="this.outerHTML='<span style=\\'font-size:4rem;line-height:1\\'>${emoji}</span>'">`;
}

// ============================================
// Emoji Sets — large varied collections
// ============================================

const CHORE_EMOJIS = [
    // Cleaning & tidying
    '🛏️','🧹','🧽','🧼','🫧','🪣','🧴','🚿','🛁','🪠',
    // Laundry & clothes
    '🧺','👕','👖','🧦','👗','👟','🧤','🧣','👒',
    // Kitchen & food
    '🍽️','🍳','🥗','🥕','🫑','🍎','🥛','🧁','🥪','🫙',
    // Hygiene
    '🪥','😁','🧻','💇','🪮',
    // Pets & garden
    '🐕','🐈','🐠','🐦','🐹','🐰','🌱','🪴','🌻','🌿','🥕',
    // School & learning
    '📚','📖','✏️','📝','🎒','📐','🔬','🧮','🖍️',
    // Outdoors & sports
    '🏃','⚽','🚴','🛴','🧘','💪','🤸','🏊','🎾',
    // Home
    '🗑️','♻️','📦','🔑','💡','🪜','🔧','🧲','🛒',
    // General
    '⭐','✅','🎯','🕐','💫','🌟','👍','🏆',
];

const REWARD_EMOJIS = [
    // Treats & food
    '🍦','🍕','🍩','🎂','🍫','🍿','🥤','🧃','🍪','🧇','🍰','🥞',
    // Entertainment
    '🎮','🎬','📺','🎧','📱','🖥️','🎵','🎤','📸',
    // Toys & play
    '🧸','🎁','🎈','🎠','🎢','🎪','🎲','🃏','🧩','🪁','🤖','🪀',
    // Outdoors
    '🏞️','🏊','🚲','🛹','🏄','⛺','🏕️','🦁','🐒','🎣',
    // Creative
    '🎨','🖍️','🎹','🎸','🎭','📚','📖','✂️',
    // Special
    '🌙','👑','💎','🦄','🌈','🚀','🏰','💃','🎉',
    // Family
    '🎲','🧁','🛁','🌸','💫','⭐','🌟',
];

const CHILD_EMOJIS = [
    // Stars & nature
    '🌟','⭐','💫','☀️','🌙','🌈','🌸','🌺','🌻','🍀','🌊','🔥','⚡','❄️','🦋',
    // Animals
    '🦁','🐻','🦊','🐰','🐼','🐨','🦄','🐸','🐙','🦋','🐝','🐢','🦜','🐬','🦩',
    // People & fantasy
    '👸','🤴','🧑‍🚀','🧑‍🎨','🧑‍🔬','🦸','🧚','🧜','🧝','🤠','🥷',
    // Faces
    '😊','😎','🤩','😇','🥳','😺','🤓',
    // Objects
    '🚀','🎸','⚽','🎯','💎','👑','🏆','🎪',
];

// ============================================
// Date helper (must be before state init)
// ============================================

function ds(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ============================================
// SVG icon helpers
// ============================================

const SVG_EDIT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg>`;

// ============================================
// State
// ============================================

const state = {
    children: [],
    chores: [],
    rewards: [],
    currentChildId: null,
    currentTab: 'chores',
    points: 0,
    calendarDate: new Date(),
    selectedDate: null,
    activeDate: ds(new Date()),
    auth: { authenticated: false, username: '', role: '' },
    childChores: {},   // childId -> [choreId, ...]
    childRewards: {},  // childId -> [rewardId, ...]
};

// Editing state for settings
let editingChildId = null;
let editingChoreId = null;
let editingRewardId = null;
let assigningChildId = null;
let settingsContentTab = 'chores';

// ============================================
// Toast Notifications
// ============================================

function showToast(message, type = 'error', duration = 3500) {
    const container = document.getElementById('toast-container');
    const emojis = { error: '😕', success: '🎉', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="toast-emoji">${emojis[type] || emojis.info}</span>
        <span class="toast-msg">${message}</span>
        <button class="toast-close">&times;</button>
    `;
    container.appendChild(toast);

    const dismiss = () => {
        toast.classList.add('toast-exit');
        toast.addEventListener('animationend', () => toast.remove());
    };

    toast.querySelector('.toast-close').addEventListener('click', dismiss);
    setTimeout(dismiss, duration);
}

// ============================================
// Init
// ============================================

async function init() {
    await checkAuth();
    await loadChildren();
    await loadChores();
    await loadRewards();

    if (state.children.length > 0) {
        state.currentChildId = state.children[0].id;
        await loadPoints();
        await loadChildAssignments(state.currentChildId);
    }

    renderChildSelector();
    renderTab();
    setupNavigation();
    setupEmojiPicker();
    setupAuth();
    updateAuthUI();
}

// ============================================
// Data Loading
// ============================================

async function loadChildren() {
    state.children = await API.get('/api/children');
}

async function loadChores() {
    state.chores = await API.get('/api/chores');
}

async function loadRewards() {
    state.rewards = await API.get('/api/rewards');
}

async function loadPoints() {
    if (!state.currentChildId) return;
    const data = await API.get(`/api/children/${state.currentChildId}/points`);
    state.points = Math.max(0, data.balance);
    document.getElementById('points-count').textContent = state.points;
}

async function loadChildAssignments(childId) {
    if (!childId) return;
    const [chores, rewards] = await Promise.all([
        API.get(`/api/children/${childId}/chores`),
        API.get(`/api/children/${childId}/rewards`),
    ]);
    state.childChores[childId] = chores.error ? [] : chores;
    state.childRewards[childId] = rewards.error ? [] : rewards;
}

function getChoresForChild(childId) {
    const assigned = state.childChores[childId];
    if (!assigned || assigned.length === 0) return state.chores;
    return state.chores.filter(c => assigned.includes(c.id));
}

function getRewardsForChild(childId) {
    const assigned = state.childRewards[childId];
    if (!assigned || assigned.length === 0) return state.rewards;
    return state.rewards.filter(r => assigned.includes(r.id));
}

// ============================================
// Navigation
// ============================================

function setupNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            if ((tab === 'settings' || tab === 'print') && !state.auth.authenticated) {
                showLoginModal();
                return;
            }
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.currentTab = tab;
            renderTab();
        });
    });
}

function renderTab() {
    const main = document.getElementById('main-content');
    switch (state.currentTab) {
        case 'chores': renderChores(main); break;
        case 'calendar': renderCalendar(main); break;
        case 'rewards': renderRewardsTab(main); break;
        case 'print': renderPrintTab(main); break;
        case 'settings': renderSettings(main); break;
    }
}

// ============================================
// Auth
// ============================================

async function checkAuth() {
    try {
        const data = await fetch('/api/me').then(r => r.json());
        state.auth = {
            authenticated: !!data.authenticated,
            username: data.username || '',
            role: data.role || '',
        };
    } catch {
        state.auth = { authenticated: false, username: '', role: '' };
    }
}

function setupAuth() {
    document.getElementById('profile-btn').addEventListener('click', () => {
        if (state.auth.authenticated) {
            showProfileModal();
        } else {
            showLoginModal();
        }
    });

    document.getElementById('login-close').addEventListener('click', closeLoginModal);
    document.getElementById('login-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'login-overlay') closeLoginModal();
    });

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await doLogin();
    });
}

function showLoginModal() {
    const overlay = document.getElementById('login-overlay');
    document.getElementById('login-modal-title').textContent = 'Login';
    document.getElementById('login-modal-body').innerHTML = `
        <form class="login-form" id="login-form">
            <input type="text" id="login-username" placeholder="Username" autocomplete="username" required>
            <input type="password" id="login-password" placeholder="Password" autocomplete="current-password" required>
            <div id="login-error" class="login-error"></div>
            <button type="submit" class="login-submit-btn">Login</button>
        </form>`;
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await doLogin();
    });
    overlay.classList.remove('hidden');
    setTimeout(() => document.getElementById('login-username').focus(), 100);
}

function showProfileModal() {
    const overlay = document.getElementById('login-overlay');
    document.getElementById('login-modal-title').textContent = 'Profile';
    document.getElementById('login-modal-body').innerHTML = `
        <div class="logged-in-info">
            <div class="logged-in-user">${state.auth.username}</div>
            <div class="logged-in-role">${state.auth.role}</div>
            <button class="logout-btn" id="do-logout">Logout</button>
        </div>`;
    document.getElementById('do-logout').addEventListener('click', async () => {
        await doLogout();
        closeLoginModal();
    });
    overlay.classList.remove('hidden');
}

function closeLoginModal() {
    document.getElementById('login-overlay').classList.add('hidden');
}

async function doLogin() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');

    if (!username || !password) {
        errorEl.textContent = 'Please enter username and password';
        return;
    }

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (res.ok) {
            state.auth = { authenticated: true, username: data.username, role: data.role };
            updateAuthUI();
            closeLoginModal();
        } else {
            errorEl.textContent = data.error || 'Login failed';
        }
    } catch {
        errorEl.textContent = 'Connection error';
    }
}

async function doLogout() {
    await fetch('/api/logout', { method: 'POST' });
    state.auth = { authenticated: false, username: '', role: '' };
    updateAuthUI();
    if (state.currentTab === 'settings' || state.currentTab === 'print') {
        state.currentTab = 'chores';
        document.querySelectorAll('.nav-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.tab === 'chores');
        });
        renderTab();
    }
}

function updateAuthUI() {
    const profileBtn = document.getElementById('profile-btn');
    profileBtn.classList.toggle('logged-in', state.auth.authenticated);
    profileBtn.title = state.auth.authenticated ? state.auth.username : 'Login';

    document.querySelectorAll('.nav-btn[data-tab="print"], .nav-btn[data-tab="settings"]').forEach(btn => {
        btn.classList.toggle('auth-hidden', !state.auth.authenticated);
    });
}

// ============================================
// Custom Confirm Dialog
// ============================================

function showConfirm({ icon, title, message, okLabel = 'Remove' }) {
    return new Promise(resolve => {
        document.getElementById('confirm-icon').innerHTML = emojiImg(icon, 'assign-emoji-img');
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-msg').textContent = message;
        document.getElementById('confirm-ok').textContent = okLabel;
        const overlay = document.getElementById('confirm-overlay');
        overlay.classList.remove('hidden');

        const ok = document.getElementById('confirm-ok');
        const cancel = document.getElementById('confirm-cancel');

        function cleanup(result) {
            overlay.classList.add('hidden');
            ok.replaceWith(ok.cloneNode(true));
            cancel.replaceWith(cancel.cloneNode(true));
            resolve(result);
        }

        document.getElementById('confirm-ok').addEventListener('click', () => cleanup(true), { once: true });
        document.getElementById('confirm-cancel').addEventListener('click', () => cleanup(false), { once: true });
        overlay.addEventListener('click', e => { if (e.target === overlay) cleanup(false); }, { once: true });
    });
}

// ============================================
// Emoji Picker
// ============================================

let emojiPickerCallback = null;

function setupEmojiPicker() {
    const overlay = document.getElementById('emoji-picker-overlay');
    overlay.querySelector('.picker-close').addEventListener('click', closeEmojiPicker);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeEmojiPicker();
    });
}

function openEmojiPicker(emojis, callback) {
    emojiPickerCallback = callback;
    const grid = document.getElementById('emoji-picker-grid');
    grid.innerHTML = emojis.map(e => `<button class="emoji-pick-item" data-emoji="${e}">${emojiImg(e, 'picker-emoji-img')}</button>`).join('');
    grid.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            callback(btn.dataset.emoji);
            closeEmojiPicker();
        });
    });

    // Setup custom emoji input
    let customRow = document.querySelector('.picker-custom');
    if (!customRow) {
        customRow = document.createElement('div');
        customRow.className = 'picker-custom';
        customRow.innerHTML = '<input type="text" placeholder="Paste or type custom emoji..." maxlength="10"><button>Use</button>';
        document.querySelector('.picker-modal').insertBefore(customRow, grid);
    }
    const customInput = customRow.querySelector('input');
    const customBtn = customRow.querySelector('button');
    customInput.value = '';
    // Clone to remove old listeners
    const newBtn = customBtn.cloneNode(true);
    customBtn.replaceWith(newBtn);
    const newInput = customInput.cloneNode(true);
    customInput.replaceWith(newInput);
    newBtn.addEventListener('click', () => {
        const val = newInput.value.trim();
        if (val) {
            callback(val);
            closeEmojiPicker();
        }
    });
    newInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const val = newInput.value.trim();
            if (val) {
                callback(val);
                closeEmojiPicker();
            }
        }
    });

    document.getElementById('emoji-picker-overlay').classList.remove('hidden');
}

function closeEmojiPicker() {
    document.getElementById('emoji-picker-overlay').classList.add('hidden');
    emojiPickerCallback = null;
}

// ============================================
// Child Selector
// ============================================

function renderChildSelector() {
    const container = document.getElementById('child-selector');
    container.innerHTML = state.children.map(child => `
        <button class="child-tab ${child.id === state.currentChildId ? 'active' : ''}"
                data-id="${child.id}" style="border-color: ${child.id === state.currentChildId ? child.color : 'transparent'}">
            ${emojiImg(child.emoji, 'assign-emoji-img')} ${child.name}
        </button>
    `).join('');

    container.querySelectorAll('.child-tab').forEach(tab => {
        tab.addEventListener('click', async () => {
            state.currentChildId = parseInt(tab.dataset.id);
            await loadPoints();
            await loadChildAssignments(state.currentChildId);
            renderChildSelector();
            renderTab();
        });
    });
}

// ============================================
// Chores Tab — with optimistic card update
// ============================================

let choreFirstRender = true;

async function renderChores(main) {
    if (!state.currentChildId) {
        main.innerHTML = `<div class="empty-state"><div class="emoji">👶</div><p>Add a child in Settings to get started!</p></div>`;
        return;
    }

    const activeDate = state.activeDate;
    const todayStr = ds(new Date());
    const isToday = activeDate === todayStr;
    const displayDate = formatDate(activeDate);

    const completions = await API.get(`/api/completions?child_id=${state.currentChildId}&from=${activeDate}&to=${activeDate}`);
    // Build a Map of chore_id -> completion count
    const completionCounts = new Map();
    completions.forEach(c => {
        completionCounts.set(c.chore_id, (completionCounts.get(c.chore_id) || 0) + 1);
    });

    const animate = choreFirstRender;
    choreFirstRender = false;

    const childChores = getChoresForChild(state.currentChildId);

    if (childChores.length === 0) {
        main.innerHTML = `<div class="empty-state"><div class="emoji">${emojiImg('📝', 'item-emoji-img')}</div><p>No chores yet! Add some in Settings.</p></div>`;
        return;
    }


    let cards = childChores.map((chore, i) => {
        const count = completionCounts.get(chore.id) || 0;
        const done = count > 0;

        if (chore.recurring) {
            return `
            <div class="chore-card ${animate ? 'slide-up' : ''} ${done ? 'recurring-done' : ''}"
                 ${animate ? `style="animation-delay: ${i * 0.04}s"` : ''}
                 data-chore-id="${chore.id}">
                <div class="chore-img-banner">${emojiImg(chore.emoji, 'chore-img')}</div>
                <div class="chore-card-content">
                    <div class="chore-body">
                        <div class="chore-name">${chore.name} <img class="recurring-badge-img" src="${emojiToImgUrl('🔁')}" alt="🔁"></div>
                        <div class="chore-meta">
                            <span class="chore-points">${emojiImg('⭐', 'recurring-badge-img')} ${chore.points}</span>
                            <span class="chore-freq">${chore.frequency}</span>
                        </div>
                    </div>
                    <div class="chore-footer">
                        ${count > 0 ? `<span class="completion-count">x${count}</span>` : '<span></span>'}
                        <button class="chore-done-btn" data-chore-id="${chore.id}">Done!</button>
                    </div>
                </div>
            </div>`;
        }

        return `
        <div class="chore-card ${animate ? 'slide-up' : ''} ${done ? 'completed' : ''}"
             ${animate ? `style="animation-delay: ${i * 0.04}s"` : ''}
             data-chore-id="${chore.id}">
            <div class="chore-img-banner">${emojiImg(chore.emoji, 'chore-img')}</div>
            <div class="chore-card-content">
                <div class="chore-body">
                    <div class="chore-name">${chore.name}</div>
                    <div class="chore-meta">
                        <span class="chore-points">⭐ ${chore.points}</span>
                        <span class="chore-freq">${chore.frequency}</span>
                    </div>
                </div>
                <div class="chore-footer">
                    <span></span>
                    ${done
                        ? `<span class="chore-check">${emojiImg('✅', 'assign-emoji-img')}</span>`
                        : `<button class="chore-done-btn" data-chore-id="${chore.id}">Done!</button>`
                    }
                </div>
            </div>
        </div>`;
    }).join('');

    const dateNav = `
        <div class="chores-date-nav">
            <button class="date-nav-btn" id="chores-prev-day">◀</button>
            <span class="chores-date-label">${isToday ? 'Today' : displayDate}</span>
            <button class="date-nav-btn" id="chores-next-day">▶</button>
            ${!isToday ? '<button class="date-today-btn" id="chores-go-today">Today</button>' : ''}
        </div>`;

    const missionTitle = `
        <div class="section-title-row">
            <h3>Daily Missions</h3>
            <div class="title-line"></div>
        </div>`;

    main.innerHTML = `${dateNav}${missionTitle}<div class="chores-grid">${cards}</div>`;

    // Date navigation
    document.getElementById('chores-prev-day').addEventListener('click', () => {
        const d = new Date(state.activeDate + 'T12:00:00');
        d.setDate(d.getDate() - 1);
        state.activeDate = ds(d);
        state.selectedDate = state.activeDate;
        renderChores(main);
    });
    document.getElementById('chores-next-day').addEventListener('click', () => {
        const d = new Date(state.activeDate + 'T12:00:00');
        d.setDate(d.getDate() + 1);
        state.activeDate = ds(d);
        state.selectedDate = state.activeDate;
        renderChores(main);
    });
    const todayBtn = document.getElementById('chores-go-today');
    if (todayBtn) {
        todayBtn.addEventListener('click', () => {
            state.activeDate = ds(new Date());
            state.selectedDate = state.activeDate;
            renderChores(main);
        });
    }

    main.querySelectorAll('.chore-done-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            btn.disabled = true;
            const choreId = parseInt(btn.dataset.choreId);
            const card = btn.closest('.chore-card');
            const chore = state.chores.find(c => c.id === choreId);

            card.classList.add('glow');

            if (chore && chore.recurring) {
                // Recurring: update the count badge, keep the button
                await API.post('/api/completions', {
                    child_id: state.currentChildId,
                    chore_id: choreId,
                    date: state.activeDate,
                });
                await loadPoints();
                launchConfetti();

                setTimeout(() => {
                    card.classList.remove('glow');
                    renderChores(main);
                }, 600);
            } else {
                // Non-recurring: original behavior
                btn.replaceWith(Object.assign(document.createElement('span'), {
                    className: 'chore-check',
                    textContent: '✅',
                }));

                await API.post('/api/completions', {
                    child_id: state.currentChildId,
                    chore_id: choreId,
                    date: state.activeDate,
                });
                await loadPoints();
                launchConfetti();

                setTimeout(() => {
                    card.classList.remove('glow');
                    card.classList.add('completed');
                }, 600);
            }
        });
    });
}

// ============================================
// Calendar Tab
// ============================================

function computeStreak(completionsByDate, today) {
    let streak = 0;
    const d = new Date(today);
    for (let i = 0; i < 365; i++) {
        const key = ds(d);
        if (completionsByDate[key] && completionsByDate[key].length > 0) {
            streak++;
        } else if (i > 0) {
            break; // gap — stop (skip today if no completions yet)
        } else if (i === 0 && (!completionsByDate[key] || completionsByDate[key].length === 0)) {
            // today has no completions yet — check yesterday
        }
        d.setDate(d.getDate() - 1);
    }
    return streak;
}

async function renderCalendar(main) {
    const d = state.calendarDate;
    const year = d.getFullYear();
    const month = d.getMonth();
    const monthName = d.toLocaleString('default', { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const todayStr = ds(today);

    const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
    let completions = [];
    let redemptions = [];
    if (state.currentChildId) {
        [completions, redemptions] = await Promise.all([
            API.get(`/api/completions?child_id=${state.currentChildId}&from=${from}&to=${to}`),
            API.get(`/api/redemptions?child_id=${state.currentChildId}&from=${from}&to=${to}`),
        ]);
    }

    const completionsByDate = {};
    completions.forEach(c => {
        if (!completionsByDate[c.date]) completionsByDate[c.date] = [];
        completionsByDate[c.date].push(c);
    });

    const redemptionsByDate = {};
    redemptions.forEach(r => {
        const dateKey = r.redeemed_at.split('T')[0].split(' ')[0];
        if (!redemptionsByDate[dateKey]) redemptionsByDate[dateKey] = [];
        redemptionsByDate[dateKey].push(r);
    });

    // Compute streak: count consecutive days (ending today) with at least one completion
    const streakDays = computeStreak(completionsByDate, today);
    const monthDone = completions.length;
    const monthStars = completions.reduce((s, c) => s + (c.chore_points || 0), 0);

    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const summaryHTML = `
    <div class="history-summary-grid">
        <div class="streak-card">
            <div class="card-label">${emojiImg('🔥', 'assign-emoji-img')} Current Streak</div>
            <div class="streak-count">${streakDays}<span class="streak-unit">Days!</span></div>
            <div class="streak-msg">Don't break the chain! ${emojiImg('🚀', 'assign-emoji-img')}</div>
        </div>
        <div class="month-summary-card">
            <div class="card-label">Month Summary</div>
            <div class="month-stats-grid">
                <div class="month-stat"><div class="val">${monthDone}</div><div class="lbl">Done</div></div>
                <div class="month-stat"><div class="val">${monthStars}${emojiImg('⭐', 'recurring-badge-img')}</div><div class="lbl">Stars</div></div>
            </div>
        </div>
    </div>`;

    let calendarHTML = summaryHTML + `
        <div class="calendar-header">
            <button class="calendar-nav-btn" id="cal-prev">◀</button>
            <span class="calendar-title">${monthName}</span>
            <button class="calendar-nav-btn" id="cal-next">▶</button>
        </div>
        <div class="calendar-grid">
            ${dayLabels.map(l => `<div class="calendar-day-label">${l}</div>`).join('')}
    `;

    for (let i = 0; i < firstDay; i++) {
        calendarHTML += '<div class="calendar-day empty"></div>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = dateStr === todayStr;
        const isSelected = dateStr === state.selectedDate;
        const dayCompletions = completionsByDate[dateStr] || [];
        const dayRedemptions = redemptionsByDate[dateStr] || [];
        const choreDots = dayCompletions.slice(0, 3).map(c => emojiImg(c.chore_emoji, 'day-dot-img')).join('');
        const rewardDots = dayRedemptions.slice(0, 1).map(r => emojiImg(r.reward_emoji, 'day-dot-img')).join('');
        const dots = choreDots + rewardDots;

        calendarHTML += `
            <div class="calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}"
                 data-date="${dateStr}">
                <span class="day-number">${day}</span>
                ${dots ? `<div class="day-dots">${dots}</div>` : ''}
            </div>`;
    }

    calendarHTML += '</div>';

    if (state.selectedDate) {
        const dayChores = completionsByDate[state.selectedDate] || [];
        const dayRewards = redemptionsByDate[state.selectedDate] || [];
        const hasActivity = dayChores.length > 0 || dayRewards.length > 0;

        if (hasActivity) {
            calendarHTML += `
                <div class="day-detail-container slide-up">
                    <div class="day-detail-title">${formatDate(state.selectedDate)}</div>`;

            if (dayChores.length > 0) {
                const chorePoints = dayChores.reduce((s, c) => s + c.chore_points, 0);
                calendarHTML += `
                    <div class="day-detail day-detail-chores">
                        <div class="day-detail-section-header">
                            <span class="day-detail-section-icon">${emojiImg('✅', 'item-emoji-img')}</span>
                            <span class="day-detail-section-label">Chores Completed</span>
                            <span class="day-detail-section-stat chore-stat">+${chorePoints}${emojiImg('⭐', 'recurring-badge-img')}</span>
                        </div>
                        ${dayChores.map(c => `
                            <div class="day-detail-item">
                                                ${emojiImg(c.chore_emoji, 'item-emoji-img')}
                                <span class="name">${c.chore_name}</span>
                                <span class="pts">+${c.chore_points}${emojiImg('⭐', 'recurring-badge-img')}</span>
                                <button class="undo-btn" data-completion-id="${c.id}">Undo</button>
                            </div>
                        `).join('')}
                    </div>`;
            }

            if (dayRewards.length > 0) {
                const rewardPoints = dayRewards.reduce((s, r) => s + r.points_cost, 0);
                calendarHTML += `
                    <div class="day-detail day-detail-rewards">
                        <div class="day-detail-section-header">
                            <span class="day-detail-section-icon">${emojiImg('🎁', 'item-emoji-img')}</span>
                            <span class="day-detail-section-label">Rewards Claimed</span>
                            <span class="day-detail-section-stat reward-stat">-${rewardPoints}${emojiImg('⭐', 'recurring-badge-img')}</span>
                        </div>
                        ${dayRewards.map(r => `
                            <div class="day-detail-item reward-detail-item">
                                ${emojiImg(r.reward_emoji, 'item-emoji-img')}
                                <span class="name">${r.reward_name}</span>
                                <span class="pts reward-cost">-${r.points_cost}${emojiImg('⭐', 'recurring-badge-img')}</span>
                                <button class="undo-btn" data-redemption-id="${r.id}">Undo</button>
                            </div>
                        `).join('')}
                    </div>`;
            }

            calendarHTML += '</div>';
        } else {
            calendarHTML += `<div class="no-completions slide-up">No activity on this day</div>`;
        }
    }

    main.innerHTML = calendarHTML;

    document.getElementById('cal-prev').addEventListener('click', () => {
        state.calendarDate = new Date(year, month - 1, 1);
        state.selectedDate = null;
        renderCalendar(main);
    });
    document.getElementById('cal-next').addEventListener('click', () => {
        state.calendarDate = new Date(year, month + 1, 1);
        state.selectedDate = null;
        renderCalendar(main);
    });

    main.querySelectorAll('.calendar-day:not(.empty)').forEach(dayEl => {
        dayEl.addEventListener('click', () => {
            state.selectedDate = dayEl.dataset.date;
            state.activeDate = dayEl.dataset.date;
            renderCalendar(main);
        });
    });

    main.querySelectorAll('.undo-btn[data-completion-id]').forEach(btn => {
        btn.addEventListener('click', async () => {
            await API.del(`/api/completions/${btn.dataset.completionId}`);
            await loadPoints();
            renderCalendar(main);
        });
    });

    main.querySelectorAll('.undo-btn[data-redemption-id]').forEach(btn => {
        btn.addEventListener('click', async () => {
            await API.del(`/api/redemptions/${btn.dataset.redemptionId}`);
            await loadPoints();
            renderCalendar(main);
        });
    });
}

function formatDate(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' });
}

// ============================================
// Rewards Tab
// ============================================

async function renderRewardsTab(main) {
    const todayStr = ds(new Date());
    let todayRedemptions = [];
    if (state.currentChildId) {
        todayRedemptions = await API.get(`/api/redemptions?child_id=${state.currentChildId}&from=${todayStr}&to=${todayStr}`);
    }

    let html = '';

    // Today's Claimed Rewards
    if (todayRedemptions.length > 0) {
        const todaySpent = todayRedemptions.reduce((s, r) => s + r.points_cost, 0);

        html += `
        <div class="rewards-overview">
            <h3>${emojiImg('🏆', 'assign-emoji-img')} Claimed Today</h3>
            <div class="rewards-overview-stats">
                <div class="overview-stat">
                    <div class="stat-value">${todayRedemptions.length}</div>
                    <div class="stat-label">Claimed</div>
                </div>
                <div class="overview-stat">
                    <div class="stat-value">${todaySpent}${emojiImg('⭐', 'recurring-badge-img')}</div>
                    <div class="stat-label">Spent Today</div>
                </div>
            </div>`;

        todayRedemptions.forEach(r => {
            html += `
            <div class="redemption-item">
                ${emojiImg(r.reward_emoji, 'item-emoji-img')}
                <span class="name">${r.reward_name}</span>
                <span class="cost">-${r.points_cost}${emojiImg('⭐', 'recurring-badge-img')}</span>
                <button class="undo-redemption-btn" data-redemption-id="${r.id}" title="Remove">✕</button>
            </div>`;
        });
        html += '</div>';
    }

    // Available rewards grid
    const childRewards = getRewardsForChild(state.currentChildId);

    if (childRewards.length === 0) {
        html = `<div class="empty-state"><div class="emoji">${emojiImg('🎁', 'item-emoji-img')}</div><p>No prizes yet! Add some in Settings.</p></div>`;
    } else {
        html += `
        <div class="section-title-row">
            <h3>Available Prizes</h3>
            <div class="title-line"></div>
        </div>
        <div class="rewards-grid">`;

        childRewards.forEach((reward, i) => {
            const pct = Math.min(100, (state.points / reward.points_cost) * 100);
            const canClaim = state.points >= reward.points_cost;
            const freqLabel = { continuous: '', daily: '· 1/day', weekly: '· 1/week' }[reward.claim_frequency || 'continuous'];

            html += `
            <div class="reward-card bounce-in" style="animation-delay: ${i * 0.05}s">
                <div class="reward-price-tag">
                    <span class="price-num">${reward.points_cost}</span>
                    <span class="price-label">Stars${freqLabel ? ' ' + freqLabel : ''}</span>
                </div>
                <div class="reward-emoji-banner">
                    ${emojiImg(reward.emoji, 'reward-emoji')}
                </div>
                <div class="reward-name">${reward.name}</div>
                <div class="reward-progress">
                    <div class="reward-progress-bar" style="width: ${pct}%"></div>
                </div>
                <button class="reward-claim-btn" data-reward-id="${reward.id}" ${canClaim ? '' : 'disabled'}>
                    ${canClaim ? `${emojiImg('🎉', 'assign-emoji-img')} Get It Now!` : `Need ${reward.points_cost - state.points} more ${emojiImg('⭐', 'assign-emoji-img')}`}
                </button>
            </div>`;
        });

        html += '</div>';
    }

    main.innerHTML = html;

    main.querySelectorAll('.reward-claim-btn:not(:disabled)').forEach(btn => {
        btn.addEventListener('click', async () => {
            const rewardId = parseInt(btn.dataset.rewardId);
            const result = await API.post('/api/redemptions', {
                child_id: state.currentChildId,
                reward_id: rewardId,
            });
            if (result.error) {
                showToast(result.error, 'error');
                return;
            }
            await loadPoints();
            launchConfetti();
            renderRewardsTab(main);
        });
    });

    // Delete individual redemption
    main.querySelectorAll('.undo-redemption-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            await API.del(`/api/redemptions/${btn.dataset.redemptionId}`);
            await loadPoints();
            renderRewardsTab(main);
        });
    });
}

// ============================================
// Print Tab — A4 chore chart with grid
// ============================================

function renderPrintTab(main) {
    const today = new Date();
    const monday = getMonday(today);
    const nextMonday = new Date(monday);
    nextMonday.setDate(nextMonday.getDate() + 7);

    const fmtWeek = (d) => {
        const end = new Date(d);
        end.setDate(end.getDate() + 6);
        return `${d.toLocaleDateString('default', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('default', { month: 'short', day: 'numeric' })}`;
    };

    let html = `
    <div class="print-tab-content">
        <div class="section-title">Print Chore Chart</div>
        <div class="print-options">
            <label>
                Child:
                <select id="print-child">
                    ${state.children.map(c => `<option value="${c.id}" ${c.id === state.currentChildId ? 'selected' : ''}>${c.emoji} ${c.name}</option>`).join('')}
                </select>
            </label>
            <label>
                Week:
                <select id="print-week">
                    <option value="${ds(monday)}">This week (${fmtWeek(monday)})</option>
                    <option value="${ds(nextMonday)}">Next week (${fmtWeek(nextMonday)})</option>
                </select>
            </label>
            <label>
                Filter:
                <select id="print-filter">
                    <option value="all">All chores</option>
                    <option value="daily">Daily only</option>
                    <option value="weekly">Weekly only</option>
                    <option value="bi-weekly">Bi-weekly only</option>
                    <option value="monthly">Monthly only</option>
                </select>
            </label>
        </div>
        <button class="print-btn" id="do-print">${emojiImg('🖨️', 'assign-emoji-img')} Print Chart</button>
        <div id="chart-preview"></div>
    </div>`;

    main.innerHTML = html;

    const render = () => renderChartPreview();
    document.getElementById('print-child').addEventListener('change', render);
    document.getElementById('print-week').addEventListener('change', render);
    document.getElementById('print-filter').addEventListener('change', render);
    document.getElementById('do-print').addEventListener('click', () => window.print());

    renderChartPreview();
}

function renderChartPreview() {
    const childId = parseInt(document.getElementById('print-child').value);
    const weekStart = document.getElementById('print-week').value;
    const filter = document.getElementById('print-filter').value;
    const child = state.children.find(c => c.id === childId);
    const childName = child ? `${emojiImg(child.emoji, 'cell-emoji-img')} ${child.name}` : 'Child';

    let chores = getChoresForChild(childId);
    if (filter !== 'all') chores = chores.filter(c => c.frequency === filter);

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const startDate = new Date(weekStart + 'T12:00:00');
    const dateHeaders = days.map((label, i) => {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        return { label, date: d.toLocaleDateString('default', { month: 'short', day: 'numeric' }) };
    });

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    const subtitle = `${childName} — ${startDate.toLocaleDateString('default', { month: 'long', day: 'numeric' })} to ${endDate.toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' })}`;

    const maxDaily = chores.reduce((s, c) => s + c.points, 0);

    let table = `
    <div class="chore-chart">
        <h2>${emojiImg('⭐', 'cell-emoji-img')} Chore Chart ${emojiImg('⭐', 'cell-emoji-img')}</h2>
        <div class="chart-subtitle">${subtitle}</div>
        <table>
            <thead>
                <tr>
                    <th class="chore-col">Chore</th>
                    ${dateHeaders.map(d => `<th>${d.label}<br><small>${d.date}</small></th>`).join('')}
                    <th class="pts-col">Pts</th>
                </tr>
            </thead>
            <tbody>
                ${chores.map(chore => `<tr>
                    <td class="chore-cell">${emojiImg(chore.emoji, 'cell-emoji-img')}${chore.name}</td>
                    ${days.map(() => `<td class="check-cell"><span class="check-box"></span></td>`).join('')}
                    <td class="pts-cell">${chore.points}</td>
                </tr>`).join('')}
            </tbody>
            <tfoot>
                <tr>
                    <td class="chore-cell"><strong>Daily Total</strong></td>
                    ${days.map(() => `<td class="check-cell"></td>`).join('')}
                    <td class="pts-cell">${maxDaily}</td>
                </tr>
                <tr>
                    <td class="chore-cell" colspan="${days.length + 1}" style="text-align:right"><strong>Week Total (max ${maxDaily * 7}):</strong></td>
                    <td class="pts-cell" style="font-size:1.1em">____</td>
                </tr>
            </tfoot>
        </table>
    </div>`;

    document.getElementById('chart-preview').innerHTML = table;
}

function getMonday(d) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    date.setHours(0, 0, 0, 0);
    return date;
}

// ============================================
// Settings Tab — editable children, chores, rewards
// ============================================

function renderSettings(main) {
    let html = '';

    // --- Children Section ---
    html += `
    <div class="settings-section">
        <h3>${emojiImg('👶', 'assign-emoji-img')} Children</h3>
        <ul class="settings-list" id="children-list">
            ${state.children.map(c => {
                if (editingChildId === c.id) {
                    return `<li class="edit-inline-form" data-edit-id="${c.id}">
                        <button class="emoji-pick-btn edit-emoji-btn" data-category="child" data-emoji="${c.emoji}">${emojiImg(c.emoji, 'pick-btn-img')}</button>
                        <input type="hidden" class="edit-emoji-val" value="${c.emoji}">
                        <input type="text" class="edit-name" value="${c.name}" maxlength="20">
                        <input type="color" class="edit-color" value="${c.color}">
                        <button class="save-btn" data-save="child" data-id="${c.id}">Save</button>
                        <button class="cancel-edit-btn" data-cancel="child">Cancel</button>
                    </li>`;
                }
                let assignSection = '';
                if (assigningChildId === c.id) {
                    const assignedChores = state.childChores[c.id] || [];
                    const assignedRewards = state.childRewards[c.id] || [];
                    assignSection = `
                    <div class="assign-section" data-child-id="${c.id}">
                        <div class="assign-header">
                            <span>Chores</span>
                            <div class="assign-actions">
                                <button class="assign-action-btn" data-select-all="chore" data-child-id="${c.id}">Select All</button>
                                <button class="assign-action-btn" data-clear-all="chore" data-child-id="${c.id}">Clear All</button>
                            </div>
                        </div>
                        <div class="assign-grid">
                            ${state.chores.map(ch => `
                                <label class="assign-item">
                                    <input type="checkbox" data-type="chore" data-child-id="${c.id}" data-item-id="${ch.id}"
                                        ${assignedChores.includes(ch.id) ? 'checked' : ''}>
                                    ${emojiImg(ch.emoji, 'assign-emoji-img')}
                                    <span class="assign-name">${ch.name}</span>
                                </label>
                            `).join('')}
                        </div>
                        <div class="assign-header">
                            <span>Rewards</span>
                            <div class="assign-actions">
                                <button class="assign-action-btn" data-select-all="reward" data-child-id="${c.id}">Select All</button>
                                <button class="assign-action-btn" data-clear-all="reward" data-child-id="${c.id}">Clear All</button>
                            </div>
                        </div>
                        <div class="assign-grid">
                            ${state.rewards.map(rw => `
                                <label class="assign-item">
                                    <input type="checkbox" data-type="reward" data-child-id="${c.id}" data-item-id="${rw.id}"
                                        ${assignedRewards.includes(rw.id) ? 'checked' : ''}>
                                    ${emojiImg(rw.emoji, 'assign-emoji-img')}
                                    <span class="assign-name">${rw.name}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>`;
                }
                return `<li>
                    ${emojiImg(c.emoji, 'item-emoji-img')}
                    <span class="item-name">${c.name}</span>
                    <span class="item-color" style="background: ${c.color}"></span>
                    <button class="assign-btn ${assigningChildId === c.id ? 'active' : ''}" data-assign="child" data-id="${c.id}" title="Assign chores & rewards">📋</button>
                    <button class="edit-btn" data-edit="child" data-id="${c.id}" title="Edit">${SVG_EDIT}</button>
                    <button class="delete-btn" data-delete="child" data-id="${c.id}" title="Remove">✕</button>
                </li>${assignSection}`;
            }).join('')}
        </ul>
        <div class="add-form">
            <input type="text" placeholder="Name" id="add-child-name" maxlength="20">
            <button class="emoji-pick-btn" id="add-child-emoji-btn" data-emoji="🌟">${emojiImg('🌟', 'pick-btn-img')}</button>
            <input type="hidden" id="add-child-emoji" value="🌟">
            <input type="color" id="add-child-color" value="#FFB347">
            <button class="add-btn" id="add-child-btn">+ Add</button>
        </div>
    </div>`;

    // --- Chores / Jobs Toggle Section ---
    const choresContent = `
        <ul class="settings-list">
            ${state.chores.map(c => {
                if (editingChoreId === c.id) {
                    return `<li class="edit-inline-form" data-edit-id="${c.id}">
                        <button class="emoji-pick-btn edit-emoji-btn" data-category="chore" data-emoji="${c.emoji}">${emojiImg(c.emoji, 'pick-btn-img')}</button>
                        <input type="hidden" class="edit-emoji-val" value="${c.emoji}">
                        <input type="text" class="edit-name" value="${c.name}" maxlength="30">
                        <input type="number" class="edit-points" value="${c.points}" min="1" max="100">
                        <select class="edit-freq">
                            <option value="daily" ${c.frequency === 'daily' ? 'selected' : ''}>Daily</option>
                            <option value="weekly" ${c.frequency === 'weekly' ? 'selected' : ''}>Weekly</option>
                            <option value="bi-weekly" ${c.frequency === 'bi-weekly' ? 'selected' : ''}>Bi-weekly</option>
                            <option value="monthly" ${c.frequency === 'monthly' ? 'selected' : ''}>Monthly</option>
                            <option value="once" ${c.frequency === 'once' ? 'selected' : ''}>Once</option>
                        </select>
                        <label class="toggle-label"><input type="checkbox" class="edit-recurring" ${c.recurring ? 'checked' : ''}> ${emojiImg('🔁', 'recurring-badge-img')}</label>
                        <button class="save-btn" data-save="chore" data-id="${c.id}">Save</button>
                        <button class="cancel-edit-btn" data-cancel="chore">Cancel</button>
                    </li>`;
                }
                return `<li>
                    ${emojiImg(c.emoji, 'item-emoji-img')}
                    <span class="item-name">${c.name}</span>
                    <span class="item-detail">${c.points}${emojiImg('⭐', 'recurring-badge-img')} · ${c.frequency}${c.recurring ? ` · ${emojiImg('🔁', 'recurring-badge-img')}` : ''}</span>
                    <button class="edit-btn" data-edit="chore" data-id="${c.id}" title="Edit">${SVG_EDIT}</button>
                    <button class="delete-btn" data-delete="chore" data-id="${c.id}" title="Remove">✕</button>
                </li>`;
            }).join('')}
        </ul>
        <div class="add-form">
            <input type="text" placeholder="Chore name" id="add-chore-name" maxlength="30">
            <button class="emoji-pick-btn" id="add-chore-emoji-btn" data-emoji="✅">${emojiImg('✅', 'pick-btn-img')}</button>
            <input type="hidden" id="add-chore-emoji" value="✅">
            <input type="number" placeholder="Pts" id="add-chore-points" value="5" min="1" max="100">
            <select id="add-chore-freq">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="bi-weekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
                <option value="once">Once</option>
            </select>
            <label class="toggle-label"><input type="checkbox" id="add-chore-recurring"> ${emojiImg('🔁', 'recurring-badge-img')}</label>
            <button class="add-btn" id="add-chore-btn">+ Add</button>
        </div>`;

    const jobsContent = `
        <ul class="settings-list">
            ${state.rewards.map(r => {
                const claimFreqLabel = { continuous: '', daily: `${emojiImg('📅', 'recurring-badge-img')} 1/day`, weekly: `${emojiImg('📅', 'recurring-badge-img')} 1/week` }[r.claim_frequency || 'continuous'];
                if (editingRewardId === r.id) {
                    return `<li class="edit-inline-form" data-edit-id="${r.id}">
                        <button class="emoji-pick-btn edit-emoji-btn" data-category="reward" data-emoji="${r.emoji}">${emojiImg(r.emoji, 'pick-btn-img')}</button>
                        <input type="hidden" class="edit-emoji-val" value="${r.emoji}">
                        <input type="text" class="edit-name" value="${r.name}" maxlength="30">
                        <input type="number" class="edit-cost" value="${r.points_cost}" min="1" max="1000">
                        <select class="edit-claim-freq">
                            <option value="continuous" ${(r.claim_frequency || 'continuous') === 'continuous' ? 'selected' : ''}>Unlimited</option>
                            <option value="daily" ${r.claim_frequency === 'daily' ? 'selected' : ''}>Once/day</option>
                            <option value="weekly" ${r.claim_frequency === 'weekly' ? 'selected' : ''}>Once/week</option>
                        </select>
                        <button class="save-btn" data-save="reward" data-id="${r.id}">Save</button>
                        <button class="cancel-edit-btn" data-cancel="reward">Cancel</button>
                    </li>`;
                }
                return `<li>
                    ${emojiImg(r.emoji, 'item-emoji-img')}
                    <span class="item-name">${r.name}</span>
                    <span class="item-detail">${r.points_cost}${emojiImg('⭐', 'recurring-badge-img')}${claimFreqLabel ? ' · ' + claimFreqLabel : ''}</span>
                    <button class="edit-btn" data-edit="reward" data-id="${r.id}" title="Edit">${SVG_EDIT}</button>
                    <button class="delete-btn" data-delete="reward" data-id="${r.id}" title="Remove">✕</button>
                </li>`;
            }).join('')}
        </ul>
        <div class="add-form">
            <input type="text" placeholder="Prize name" id="add-reward-name" maxlength="30">
            <button class="emoji-pick-btn" id="add-reward-emoji-btn" data-emoji="🎁">${emojiImg('🎁', 'pick-btn-img')}</button>
            <input type="hidden" id="add-reward-emoji" value="🎁">
            <input type="number" placeholder="Cost" id="add-reward-cost" value="25" min="1" max="1000">
            <select id="add-reward-claim-freq">
                <option value="continuous">Unlimited</option>
                <option value="daily">Once/day</option>
                <option value="weekly">Once/week</option>
            </select>
            <button class="add-btn" id="add-reward-btn">+ Add</button>
        </div>`;

    html += `
    <div class="settings-section settings-tabbed ${settingsContentTab === 'chores' ? 'tab-chores' : 'tab-jobs'}">
        <div class="settings-toggle-wrap">
            <div class="settings-toggle">
                <button class="toggle-pill ${settingsContentTab === 'chores' ? 'active' : ''}" data-settings-tab="chores">
                    ${emojiImg('✅', 'assign-emoji-img')} Chores
                    <span class="settings-tab-count">${state.chores.length}</span>
                </button>
                <button class="toggle-pill ${settingsContentTab === 'jobs' ? 'active' : ''}" data-settings-tab="jobs">
                    ${emojiImg('🎁', 'assign-emoji-img')} Prizes
                    <span class="settings-tab-count">${state.rewards.length}</span>
                </button>
            </div>
        </div>
        <div class="settings-tab-content">
            ${settingsContentTab === 'chores' ? choresContent : jobsContent}
        </div>
    </div>`;

    // --- Data Section ---
    html += `
    <div class="settings-section">
        <h3>${emojiImg('💾', 'assign-emoji-img')} Data</h3>
        <div class="data-actions">
            <button class="export-btn" id="export-db-btn">${emojiImg('📥', 'assign-emoji-img')} Export Database</button>
            <label class="import-btn" for="import-db-input">${emojiImg('📤', 'assign-emoji-img')} Import Database</label>
            <input type="file" id="import-db-input" accept=".json" style="display:none">
        </div>
        <p class="data-hint">Export saves all children, chores, rewards and history as a JSON file. Import replaces all current data.</p>
        <div id="import-status"></div>
    </div>`;

    // --- User Management Section ---
    html += `
    <div class="settings-section">
        <h3>${emojiImg('🔑', 'assign-emoji-img')} User Management</h3>
        <div id="users-list"></div>
        <div class="add-form">
            <input type="text" placeholder="Username" id="add-user-name" maxlength="30">
            <input type="password" placeholder="Password" id="add-user-password" maxlength="50">
            <button class="add-btn" id="add-user-btn">+ Add User</button>
        </div>
    </div>`;

    main.innerHTML = html;
    bindSettingsEvents(main);
    loadUsersList();
}

function bindSettingsEvents(main) {
    const emojiSets = { child: CHILD_EMOJIS, chore: CHORE_EMOJIS, reward: REWARD_EMOJIS };

    // --- Inline edit emoji pickers ---
    main.querySelectorAll('.edit-emoji-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const cat = btn.dataset.category;
            const li = btn.closest('li');
            openEmojiPicker(emojiSets[cat], (emoji) => {
                li.querySelector('.edit-emoji-val').value = emoji;
                btn.innerHTML = emojiImg(emoji, 'pick-btn-img');
                btn.dataset.emoji = emoji;
            });
        });
    });

    // --- Save edits ---
    main.querySelectorAll('[data-save]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const type = btn.dataset.save;
            const id = parseInt(btn.dataset.id);
            const li = btn.closest('li');
            const emoji = li.querySelector('.edit-emoji-val').value;
            const name = li.querySelector('.edit-name').value.trim();
            if (!name) return;

            if (type === 'child') {
                const color = li.querySelector('.edit-color').value;
                await API.put(`/api/children/${id}`, { name, emoji, color });
                editingChildId = null;
                await loadChildren();
                renderChildSelector();
            } else if (type === 'chore') {
                const points = parseInt(li.querySelector('.edit-points').value) || 5;
                const frequency = li.querySelector('.edit-freq').value;
                const recurring = li.querySelector('.edit-recurring').checked;
                await API.put(`/api/chores/${id}`, { name, emoji, points, frequency, recurring });
                editingChoreId = null;
                await loadChores();
                await loadPoints();
            } else if (type === 'reward') {
                const points_cost = parseInt(li.querySelector('.edit-cost').value) || 10;
                const claim_frequency = li.querySelector('.edit-claim-freq').value;
                await API.put(`/api/rewards/${id}`, { name, emoji, points_cost, claim_frequency });
                editingRewardId = null;
                await loadRewards();
                await loadPoints();
            }
            renderSettings(main);
        });
    });

    // --- Settings sub-tab toggle ---
    main.querySelectorAll('[data-settings-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            settingsContentTab = btn.dataset.settingsTab;
            editingChoreId = null;
            editingRewardId = null;
            renderSettings(main);
        });
    });

    // --- Cancel edits ---
    main.querySelectorAll('[data-cancel]').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.cancel;
            if (type === 'child') editingChildId = null;
            else if (type === 'chore') editingChoreId = null;
            else if (type === 'reward') editingRewardId = null;
            renderSettings(main);
        });
    });

    // --- Start editing ---
    main.querySelectorAll('[data-edit]').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.edit;
            const id = parseInt(btn.dataset.id);
            if (type === 'child') editingChildId = id;
            else if (type === 'chore') editingChoreId = id;
            else if (type === 'reward') editingRewardId = id;
            renderSettings(main);
        });
    });

    // --- Assign buttons ---
    main.querySelectorAll('[data-assign]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = parseInt(btn.dataset.id);
            if (assigningChildId === id) {
                assigningChildId = null;
            } else {
                assigningChildId = id;
                await loadChildAssignments(id);
            }
            renderSettings(main);
        });
    });

    // --- Assignment checkboxes ---
    main.querySelectorAll('.assign-section input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', async () => {
            const childId = parseInt(cb.dataset.childId);
            const itemId = parseInt(cb.dataset.itemId);
            const type = cb.dataset.type;
            const url = type === 'chore'
                ? `/api/children/${childId}/chores/${itemId}`
                : `/api/children/${childId}/rewards/${itemId}`;
            const result = await API.post(url);
            if (!result.error) {
                await loadChildAssignments(childId);
            }
        });
    });

    // --- Select All / Clear All ---
    main.querySelectorAll('[data-select-all]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const type = btn.dataset.selectAll;
            const childId = parseInt(btn.dataset.childId);
            const items = type === 'chore' ? state.chores : state.rewards;
            const assigned = type === 'chore' ? (state.childChores[childId] || []) : (state.childRewards[childId] || []);
            for (const item of items) {
                if (!assigned.includes(item.id)) {
                    const url = type === 'chore'
                        ? `/api/children/${childId}/chores/${item.id}`
                        : `/api/children/${childId}/rewards/${item.id}`;
                    await API.post(url);
                }
            }
            await loadChildAssignments(childId);
            renderSettings(main);
        });
    });

    main.querySelectorAll('[data-clear-all]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const type = btn.dataset.clearAll;
            const childId = parseInt(btn.dataset.childId);
            const assigned = type === 'chore' ? (state.childChores[childId] || []) : (state.childRewards[childId] || []);
            for (const itemId of assigned) {
                const url = type === 'chore'
                    ? `/api/children/${childId}/chores/${itemId}`
                    : `/api/children/${childId}/rewards/${itemId}`;
                await API.post(url);
            }
            await loadChildAssignments(childId);
            renderSettings(main);
        });
    });

    // --- Add-form emoji pickers ---
    document.getElementById('add-child-emoji-btn').addEventListener('click', () => {
        openEmojiPicker(CHILD_EMOJIS, (emoji) => {
            document.getElementById('add-child-emoji').value = emoji;
            document.getElementById('add-child-emoji-btn').innerHTML = emojiImg(emoji, 'pick-btn-img');
        });
    });
    document.getElementById('add-chore-emoji-btn')?.addEventListener('click', () => {
        openEmojiPicker(CHORE_EMOJIS, (emoji) => {
            document.getElementById('add-chore-emoji').value = emoji;
            document.getElementById('add-chore-emoji-btn').innerHTML = emojiImg(emoji, 'pick-btn-img');
        });
    });
    document.getElementById('add-reward-emoji-btn')?.addEventListener('click', () => {
        openEmojiPicker(REWARD_EMOJIS, (emoji) => {
            document.getElementById('add-reward-emoji').value = emoji;
            document.getElementById('add-reward-emoji-btn').innerHTML = emojiImg(emoji, 'pick-btn-img');
        });
    });

    // --- Add handlers ---
    document.getElementById('add-child-btn').addEventListener('click', async () => {
        const name = document.getElementById('add-child-name').value.trim();
        if (!name) return;
        await API.post('/api/children', {
            name,
            emoji: document.getElementById('add-child-emoji').value || '🌟',
            color: document.getElementById('add-child-color').value,
        });
        await loadChildren();
        if (state.children.length === 1) {
            state.currentChildId = state.children[0].id;
            await loadPoints();
        }
        renderChildSelector();
        renderSettings(main);
    });

    document.getElementById('add-chore-btn')?.addEventListener('click', async () => {
        const name = document.getElementById('add-chore-name').value.trim();
        if (!name) return;
        await API.post('/api/chores', {
            name,
            emoji: document.getElementById('add-chore-emoji').value || '✅',
            points: parseInt(document.getElementById('add-chore-points').value) || 5,
            frequency: document.getElementById('add-chore-freq').value,
            recurring: document.getElementById('add-chore-recurring').checked,
        });
        await loadChores();
        renderSettings(main);
    });

    document.getElementById('add-reward-btn')?.addEventListener('click', async () => {
        const name = document.getElementById('add-reward-name').value.trim();
        if (!name) return;
        await API.post('/api/rewards', {
            name,
            emoji: document.getElementById('add-reward-emoji').value || '🎁',
            points_cost: parseInt(document.getElementById('add-reward-cost').value) || 25,
            claim_frequency: document.getElementById('add-reward-claim-freq').value,
        });
        await loadRewards();
        renderSettings(main);
    });

    // --- Delete handlers ---
    main.querySelectorAll('[data-delete]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const type = btn.dataset.delete;
            const id = parseInt(btn.dataset.id);

            if (type === 'child') {
                const ok = await showConfirm({ icon: '👶', title: 'Remove Child?', message: 'Their history will also be deleted.', okLabel: 'Remove' });
                if (!ok) return;
                await API.del(`/api/children/${id}`);
                await loadChildren();
                if (state.currentChildId === id) {
                    state.currentChildId = state.children.length > 0 ? state.children[0].id : null;
                    await loadPoints();
                }
                renderChildSelector();
            } else if (type === 'chore') {
                const ok = await showConfirm({ icon: '🗑️', title: 'Remove Chore?', message: 'This chore will be permanently deleted.', okLabel: 'Remove' });
                if (!ok) return;
                await API.del(`/api/chores/${id}`);
                await loadChores();
                await loadPoints();
            } else if (type === 'reward') {
                const ok = await showConfirm({ icon: '🗑️', title: 'Remove Prize?', message: 'This prize will be permanently deleted.', okLabel: 'Remove' });
                if (!ok) return;
                await API.del(`/api/rewards/${id}`);
                await loadRewards();
                await loadPoints();
            }
            renderSettings(main);
        });
    });

    // --- Export / Import ---
    document.getElementById('export-db-btn').addEventListener('click', async () => {
        const res = await fetch('/api/export');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `choreboard-backup-${ds(new Date())}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });

    document.getElementById('import-db-input').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const okImport = await showConfirm({ icon: '📤', title: 'Replace All Data?', message: 'This will overwrite all children, chores, rewards and history.', okLabel: 'Import' });
        if (!okImport) {
            e.target.value = '';
            return;
        }

        const statusEl = document.getElementById('import-status');
        statusEl.textContent = 'Importing...';
        statusEl.className = 'import-status-msg';

        try {
            const text = await file.text();
            JSON.parse(text); // validate JSON
            const res = await fetch('/api/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: text,
            });
            const result = await res.json();
            if (res.ok) {
                statusEl.textContent = `Imported ${result.children} children, ${result.chores} chores, ${result.rewards} rewards, ${result.completions} completions, ${result.redemptions} redemptions.`;
                statusEl.className = 'import-status-msg success';
                // Reload all data
                await loadChildren();
                await loadChores();
                await loadRewards();
                if (state.children.length > 0) {
                    state.currentChildId = state.children[0].id;
                    await loadPoints();
                }
                renderChildSelector();
                renderSettings(main);
            } else {
                statusEl.textContent = 'Import failed: ' + (result.error || 'Unknown error');
                statusEl.className = 'import-status-msg error';
            }
        } catch (err) {
            statusEl.textContent = 'Invalid file: ' + err.message;
            statusEl.className = 'import-status-msg error';
        }
        e.target.value = '';
    });

    // --- Add User ---
    document.getElementById('add-user-btn').addEventListener('click', async () => {
        const username = document.getElementById('add-user-name').value.trim();
        const password = document.getElementById('add-user-password').value;
        if (!username || !password) return;
        const result = await API.post('/api/users', { username, password });
        if (result.error) {
            showToast(result.error, 'error');
            return;
        }
        document.getElementById('add-user-name').value = '';
        document.getElementById('add-user-password').value = '';
        loadUsersList();
    });
}

async function loadUsersList() {
    const container = document.getElementById('users-list');
    if (!container) return;
    const users = await API.get('/api/users');
    if (users.error) return;

    container.innerHTML = users.map(u => `
        <div class="user-item">
            <span class="user-name">${u.username}</span>
            <span class="user-role">${u.role}</span>
            <button class="reset-pw-btn" data-user-id="${u.id}">Reset Password</button>
            <button class="delete-btn" data-delete-user="${u.id}" title="Remove">✕</button>
        </div>
    `).join('');

    container.querySelectorAll('.reset-pw-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const newPw = prompt('Enter new password:');
            if (!newPw) return;
            const result = await API.put(`/api/users/${btn.dataset.userId}/password`, { password: newPw });
            if (result.error) {
                showToast(result.error, 'error');
            } else {
                showToast('Password reset', 'success');
            }
        });
    });

    container.querySelectorAll('[data-delete-user]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const okUser = await showConfirm({ icon: '🔑', title: 'Delete User?', message: 'This user account will be permanently removed.', okLabel: 'Delete' });
            if (!okUser) return;
            const result = await API.del(`/api/users/${btn.dataset.deleteUser}`);
            if (result.error) {
                showToast(result.error, 'error');
            } else {
                loadUsersList();
            }
        });
    });
}

// ============================================
// Confetti
// ============================================

function launchConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#00cbfe', '#ffd709', '#59ee50', '#3b82f6', '#fb5151', '#ffffff', '#000000'];
    const particles = [];

    for (let i = 0; i < 80; i++) {
        particles.push({
            x: canvas.width / 2 + (Math.random() - 0.5) * 200,
            y: canvas.height / 2,
            vx: (Math.random() - 0.5) * 15,
            vy: Math.random() * -18 - 5,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: Math.random() * 8 + 4,
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 10,
            gravity: 0.4,
            life: 1,
        });
    }

    let frame;
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = false;

        particles.forEach(p => {
            if (p.life <= 0) return;
            alive = true;
            p.x += p.vx;
            p.vy += p.gravity;
            p.y += p.vy;
            p.rotation += p.rotationSpeed;
            p.life -= 0.015;

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
            ctx.restore();
        });

        if (alive) {
            frame = requestAnimationFrame(animate);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            cancelAnimationFrame(frame);
        }
    }

    animate();
}

// ============================================
// Start
// ============================================

document.addEventListener('DOMContentLoaded', init);
