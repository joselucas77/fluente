/**
 * Fluente — A2 → C1
 * Native Mobile App Logic with Bootstrap 5.3 Standardization
 * Architecture: Clean Vanilla JS
 */

(function () {
  'use strict';

  // --- STORAGE KEYS & CONSTANTS ---
  const STORE_KEY = 'englishJourneyA2C1_v1';
  const THEME_KEY = 'english_journey_theme';
  const ACTIVE_PAGE_KEY = 'english_journey_page';
  const ACTIVE_WEEK_KEY = 'english_journey_active_week';

  const DAY_TOTAL = DATA.weeks.length * 7;
  const VOCAB_TOTAL = DATA.weeks.length * 70;

  // --- APPLICATION STATE ---
  let state = loadState();
  let activePage = localStorage.getItem(ACTIVE_PAGE_KEY) || 'dashboard';
  let activePhase = 1;
  let activeWeekNum = getInitialActiveWeek();
  let todaySelectedDayIndex = null; // will be set by getTodayInfo()
  let currentQuery = '';
  let trilhaViewMode = 'slide'; // 'slide' | 'list'
  let currentSlideIndex = 0;
  let filteredWeeks = [];

  // Vocab page state
  let vocabPageFilter = 'all'; // 'all' | 'pending' | 'done'
  let vocabPageQuery = '';

  // Trilha week slide internal UI state: { [weekNumber]: { tab: 'days'|'mission'|'resources'|'vocab', activeDay: number } }
  const weekUiState = {};

  // DOM Helpers
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));
  }

  function fmt(n) {
    return n.toLocaleString('pt-BR');
  }

  function phaseObj(n) {
    return DATA.phases[n - 1] || DATA.phases[0];
  }

  function getWeekByNumber(num) {
    return DATA.weeks.find(w => w.number === num) || DATA.weeks[0];
  }

  function getInitialActiveWeek() {
    const saved = localStorage.getItem(ACTIVE_WEEK_KEY);
    if (saved && DATA.weeks.some(w => w.number === Number(saved))) {
      return Number(saved);
    }
    const firstIncomplete = DATA.weeks.find(w => !w.days.every(d => (state.days || {})[d.id]));
    return firstIncomplete ? firstIncomplete.number : 1;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        return {
          days: d.days || {},
          vocab: d.vocab || {}
        };
      }
    } catch (e) {
      console.warn('Erro ao carregar progresso:', e);
    }
    return { days: {}, vocab: {} };
  }

  function saveState() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Não foi possível salvar no navegador', e);
    }
  }

  // --- DATE DETECTION FUNCTION ---
  function getTodayInfo() {
    const daysMap = [
      { id: 'sun', index: 6, short: 'DOM', name: 'Domingo' },
      { id: 'mon', index: 0, short: 'SEG', name: 'Segunda-feira' },
      { id: 'tue', index: 1, short: 'TER', name: 'Terça-feira' },
      { id: 'wed', index: 2, short: 'QUA', name: 'Quarta-feira' },
      { id: 'thu', index: 3, short: 'QUI', name: 'Quinta-feira' },
      { id: 'fri', index: 4, short: 'SEX', name: 'Sexta-feira' },
      { id: 'sat', index: 5, short: 'SÁB', name: 'Sábado' }
    ];

    const now = new Date();
    const dayOfWeek = now.getDay();
    const dayInfo = daysMap[dayOfWeek];

    const rawDate = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    const formattedDate = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);

    return {
      now,
      dayOfWeek,
      dayInfo,
      dayIndex: dayInfo.index,
      formattedDate
    };
  }

  // --- STATS & COUNTERS ---
  function weekDoneCount(w) {
    return w.days.filter(d => state.days[d.id]).length;
  }

  function weekVocabCount(w) {
    return w.vocab.filter(v => state.vocab[v.id]).length;
  }

  function stats() {
    const done = Object.values(state.days).filter(Boolean).length;
    const words = Object.values(state.vocab).filter(Boolean).length;
    const weeks = DATA.weeks.filter(w => w.days.every(d => state.days[d.id])).length;
    return { done, words, weeks };
  }

  function updateOverallProgressDisplays() {
    const s = stats();
    const pct = Math.round((s.done / DAY_TOTAL) * 100);

    const dashPct = $('#dashOverallPercent');
    if (dashPct) dashPct.textContent = pct + '%';

    const dashFill = $('#dashProgressFill');
    if (dashFill) dashFill.style.width = pct + '%';

    const dashBar = $('#dashProgressBar');
    if (dashBar) dashBar.setAttribute('aria-valuenow', pct);

    const dashDays = $('#dashDaysDone');
    if (dashDays) dashDays.textContent = `${fmt(s.done)} / ${fmt(DAY_TOTAL)}`;

    const dashWeeks = $('#dashWeeksDone');
    if (dashWeeks) dashWeeks.textContent = `${s.weeks} / 156`;

    const dashWords = $('#dashWordsDone');
    if (dashWords) dashWords.textContent = `${fmt(s.words)} / ${fmt(VOCAB_TOTAL)}`;

    const currentW = getWeekByNumber(activeWeekNum);
    const dashPhase = $('#dashActivePhase');
    if (dashPhase) dashPhase.textContent = `Ano ${currentW.phase}`;
  }

  // --- THEME MANAGEMENT (BOOTSTRAP 5 DATA-BS-THEME HARMONIZATION) ---
  function initTheme() {
    let savedTheme = localStorage.getItem(THEME_KEY);
    if (!savedTheme) {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      savedTheme = prefersDark ? 'dark' : 'light';
    }
    applyTheme(savedTheme);

    const toggleBtn = $('#themeToggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-bs-theme') || 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
      });
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-bs-theme', theme);
    localStorage.setItem(THEME_KEY, theme);

    const metaTheme = $('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'dark' ? '#0b1120' : '#f8fafc');
    }

    const toggleBtn = $('#themeToggle');
    if (toggleBtn) {
      const hint = theme === 'dark' ? 'Ativar Modo Claro' : 'Ativar Modo Escuro';
      toggleBtn.setAttribute('title', hint);
      toggleBtn.setAttribute('aria-label', hint);
    }
  }

  // --- PAGE NAVIGATION (BOTTOM NAV) ---
  function switchPage(pageId) {
    activePage = pageId;
    localStorage.setItem(ACTIVE_PAGE_KEY, pageId);

    // Update bottom nav items
    $$('.bottom-nav .nav-item').forEach(btn => {
      const isTarget = btn.dataset.target === pageId;
      btn.classList.toggle('active', isTarget);
    });

    // Hide all pages, show target page
    $$('.app-page').forEach(page => {
      if (page.id === `page-${pageId}`) {
        page.classList.add('active-page');
        page.hidden = false;
      } else {
        page.classList.remove('active-page');
        page.hidden = true;
      }
    });

    // Render corresponding page
    if (pageId === 'dashboard') {
      renderDashboard();
    } else if (pageId === 'today') {
      renderTodayPage();
    } else if (pageId === 'trilha') {
      filterWeeks();
      renderTrilhaPage();
    } else if (pageId === 'vocab') {
      renderVocabPage();
    }

    updateOverallProgressDisplays();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function initBottomNav() {
    $$('.bottom-nav .nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        if (target) switchPage(target);
      });
    });

    const toTodayBtn = $('#dashGoToTodayBtn');
    if (toTodayBtn) toTodayBtn.addEventListener('click', () => switchPage('today'));

    const toTrilhaBtn = $('#dashGoToTrilhaBtn');
    if (toTrilhaBtn) toTrilhaBtn.addEventListener('click', () => switchPage('trilha'));
  }

  // =========================================================================
  // --- 1. DASHBOARD PAGE LOGIC ---
  // =========================================================================
  function renderDashboard() {
    const today = getTodayInfo();
    const currentWeek = getWeekByNumber(activeWeekNum);
    const dayPlan = currentWeek.days[today.dayIndex] || currentWeek.days[0];
    const isTodayDone = !!state.days[dayPlan.id];

    const dashDate = $('#dashTodayDate');
    if (dashDate) dashDate.textContent = today.formattedDate;

    const dashGreeting = $('#dashGreeting');
    if (dashGreeting) {
      const hour = new Date().getHours();
      let greeting = 'Olá!';
      if (hour >= 5 && hour < 12) greeting = 'Bom dia!';
      else if (hour >= 12 && hour < 18) greeting = 'Boa tarde!';
      else greeting = 'Boa noite!';
      dashGreeting.textContent = greeting;
    }

    const dashDayName = $('#dashTodayDayName');
    if (dashDayName) dashDayName.textContent = today.dayInfo.name;

    const dashTitle = $('#dashTodayTitle');
    if (dashTitle) dashTitle.textContent = `${dayPlan.name} · ${dayPlan.kind}`;

    const dashWeek = $('#dashTodayWeek');
    if (dashWeek) dashWeek.textContent = `Semana ${currentWeek.topicNum}: ${currentWeek.title}`;

    const dashStatus = $('#dashStatusBadge');
    if (dashStatus) {
      dashStatus.textContent = isTodayDone ? '✓ Concluído hoje' : 'Pendente hoje';
      dashStatus.className = `badge ${isTodayDone ? 'bg-success' : 'bg-warning-subtle text-warning-emphasis'}`;
    }

    const p = phaseObj(currentWeek.phase);
    const dashPhaseTag = $('#dashPhaseTag');
    if (dashPhaseTag) dashPhaseTag.textContent = `Ano ${currentWeek.phase} · ${p.short}`;

    const dashPhaseTitle = $('#dashPhaseTitle');
    if (dashPhaseTitle) dashPhaseTitle.textContent = p.sub;

    const dashPhaseMeta = $('#dashPhaseMeta');
    if (dashPhaseMeta) dashPhaseMeta.textContent = `${p.range} · Foco em autonomia e fala`;

    updateOverallProgressDisplays();
  }

  // =========================================================================
  // --- 2. HOJE / DIA A DIA PAGE LOGIC ---
  // =========================================================================
  function renderTodayPage() {
    const today = getTodayInfo();

    if (todaySelectedDayIndex === null) {
      todaySelectedDayIndex = today.dayIndex;
    }

    const dateBadge = $('#todayFormattedDate');
    if (dateBadge) {
      dateBadge.textContent = today.formattedDate;
    }

    const weekSelect = $('#todayWeekSelect');
    if (weekSelect) {
      weekSelect.innerHTML = DATA.weeks.map(w => {
        const isSelected = w.number === activeWeekNum;
        const done = weekDoneCount(w) === 7;
        const check = done ? '✓ ' : '';
        return `<option value="${w.number}" ${isSelected ? 'selected' : ''}>
          ${check}Semana ${w.topicNum}: ${esc(w.title)}
        </option>`;
      }).join('');

      weekSelect.onchange = e => {
        activeWeekNum = Number(e.target.value);
        localStorage.setItem(ACTIVE_WEEK_KEY, activeWeekNum);
        renderTodayPage();
        updateOverallProgressDisplays();
      };
    }

    const currentWeek = getWeekByNumber(activeWeekNum);

    const strip = $('#todayDaysStrip');
    if (strip) {
      strip.innerHTML = currentWeek.days.map((d, index) => {
        const isSelected = index === todaySelectedDayIndex;
        const isRealToday = index === today.dayIndex;
        const isDone = !!state.days[d.id];

        return `
          <button type="button" class="today-day-btn ${isSelected ? 'active' : ''} ${isRealToday ? 'is-today' : ''}" data-day-index="${index}">
            <span class="today-day-name">${esc(d.short)}</span>
            <span class="today-day-check">${isDone ? '✓' : ''}</span>
          </button>
        `;
      }).join('');

      $$('.today-day-btn', strip).forEach(btn => {
        btn.addEventListener('click', () => {
          todaySelectedDayIndex = Number(btn.dataset.dayIndex);
          renderTodayFocusCard(currentWeek, today);
          renderTodayPage();
        });
      });
    }

    renderTodayFocusCard(currentWeek, today);
  }

  function renderTodayFocusCard(currentWeek, today) {
    const focusCard = $('#todayFocusCard');
    if (!focusCard) return;

    const activeDay = currentWeek.days[todaySelectedDayIndex] || currentWeek.days[0];
    const isCompleted = !!state.days[activeDay.id];
    const isRealToday = todaySelectedDayIndex === today.dayIndex;

    focusCard.className = `today-focus-card card shadow-sm p-3 mb-2 ${isCompleted ? 'day-completed' : ''}`;

    focusCard.innerHTML = `
      <div class="today-card-top d-flex justify-content-between align-items-start gap-2 flex-wrap mb-3">
        <div class="today-focus-title-wrap">
          <div class="badge bg-secondary-subtle text-secondary-emphasis mb-1">
            Semana ${currentWeek.topicNum} · ${esc(activeDay.name)} ${isRealToday ? '(Hoje)' : ''}
          </div>
          <h2 class="h5 fw-bold mb-1">${esc(activeDay.name)} · ${esc(activeDay.kind)}</h2>
          <div class="text-muted small">Sessão estruturada de ${activeDay.minutes} minutos</div>
        </div>

        <button type="button" class="btn ${isCompleted ? 'btn-success' : 'btn-outline-success'} fw-bold px-3 py-2" id="todayToggleDoneBtn">
          ${isCompleted ? '✓ Dia Concluído' : 'Marcar Dia Concluído'}
        </button>
      </div>

      <!-- Step-by-Step 30-min Breakdown -->
      <div class="today-steps-container d-flex flex-column gap-2 mb-3">
        ${activeDay.steps.map(s => `
          <div class="card bg-body-tertiary border-0 p-3">
            <div class="d-flex align-items-start gap-3">
              <span class="badge bg-primary fs-6 p-2 rounded-3">${s.minutes}m</span>
              <div class="flex-grow-1">
                <h4 class="h6 fw-bold mb-1">${esc(s.label)}</h4>
                <p class="small text-muted mb-2">${esc(s.task)}</p>
                <a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline-primary py-1 px-2">
                  ↗ ${esc(s.source)}
                </a>
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="card bg-body-tertiary border-0 p-3 small text-muted">
        <p class="mb-0">💡 <strong>Dica do dia:</strong> Pratique em voz alta. Mesmo que hesite ou erre a pronúncia, seu cérebro precisa registrar os padrões sonoros em uso ativo!</p>
      </div>
    `;

    const toggleBtn = $('#todayToggleDoneBtn', focusCard);
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        if (state.days[activeDay.id]) {
          delete state.days[activeDay.id];
        } else {
          state.days[activeDay.id] = true;
        }
        saveState();
        updateOverallProgressDisplays();
        renderTodayPage();
      });
    }
  }

  // =========================================================================
  // --- 3. TRILHA / SEMANAS PAGE LOGIC ---
  // =========================================================================
  function renderPhasesNav() {
    const wrap = $('#phaseButtons');
    if (!wrap) return;

    wrap.innerHTML = DATA.phases.map((p, i) => {
      const phaseNum = i + 1;
      const isActive = activePhase === phaseNum;
      return `
        <button type="button" class="phase-tab-btn ${isActive ? 'active' : ''} phase-${p.color}" data-phase="${phaseNum}">
          <span class="phase-dot"></span>
          <span class="phase-tab-title">Ano ${phaseNum}</span>
          <span class="phase-tab-sub">${esc(p.short)}</span>
        </button>
      `;
    }).join('');

    $$('.phase-tab-btn', wrap).forEach(btn => {
      btn.addEventListener('click', () => {
        activePhase = Number(btn.dataset.phase);
        currentSlideIndex = 0;
        renderPhasesNav();
        filterWeeks();
        renderTrilhaPage();
      });
    });
  }

  function filterWeeks() {
    const q = currentQuery.trim().toLowerCase();
    const all = DATA.weeks.filter(w => w.phase === activePhase);

    if (!q) {
      filteredWeeks = all;
    } else {
      filteredWeeks = all.filter(w => {
        const pool = [
          w.title,
          w.area,
          w.grammar,
          w.goal,
          w.scenario,
          w.query,
          w.contentTitle,
          `semana ${w.topicNum}`,
          `semana ${w.number}`
        ].join(' ').toLowerCase();

        return pool.includes(q);
      });
    }

    if (currentSlideIndex >= filteredWeeks.length) {
      currentSlideIndex = Math.max(0, filteredWeeks.length - 1);
    }
  }

  function renderTrilhaPage() {
    const p = phaseObj(activePhase);
    const phaseTitle = $('#phaseTitle');
    const phaseSubtitle = $('#phaseSubtitle');
    const weekCount = $('#weekCount');

    if (phaseTitle) phaseTitle.textContent = p.label;
    if (phaseSubtitle) phaseSubtitle.textContent = p.sub;
    if (weekCount) weekCount.textContent = `${filteredWeeks.length} de 52 semanas`;

    const emptyState = $('#emptyState');
    const slideContainer = $('#slideContainer');
    const listContainer = $('#listContainer');

    if (filteredWeeks.length === 0) {
      if (emptyState) emptyState.hidden = false;
      if (slideContainer) slideContainer.hidden = true;
      if (listContainer) listContainer.hidden = true;
      return;
    }

    if (emptyState) emptyState.hidden = true;

    if (trilhaViewMode === 'slide') {
      if (slideContainer) slideContainer.hidden = false;
      if (listContainer) listContainer.hidden = true;
      renderSlideView();
    } else {
      if (slideContainer) slideContainer.hidden = true;
      if (listContainer) listContainer.hidden = false;
      renderListView();
    }
  }

  // --- TRILHA SLIDE VIEW ---
  function renderSlideView() {
    const currentWeek = filteredWeeks[currentSlideIndex];
    if (!currentWeek) return;

    const prevBtn = $('#prevSlideBtn');
    const nextBtn = $('#nextSlideBtn');
    if (prevBtn) prevBtn.disabled = currentSlideIndex === 0;
    if (nextBtn) nextBtn.disabled = currentSlideIndex === filteredWeeks.length - 1;

    const counter = $('#slideCounter');
    if (counter) {
      if (currentQuery) {
        counter.textContent = `${currentSlideIndex + 1} de ${filteredWeeks.length} (busca)`;
      } else {
        counter.textContent = `Semana ${currentWeek.topicNum} de 52`;
      }
    }

    const dropdown = $('#weekSelectDropdown');
    if (dropdown) {
      dropdown.innerHTML = filteredWeeks.map((w, idx) => {
        const isDone = weekDoneCount(w) === 7;
        const check = isDone ? '✓ ' : '';
        return `<option value="${idx}" ${idx === currentSlideIndex ? 'selected' : ''}>
          ${check}Semana ${w.topicNum}: ${esc(w.title)}
        </option>`;
      }).join('');

      dropdown.onchange = e => {
        currentSlideIndex = Number(e.target.value);
        renderSlideView();
      };
    }

    const cardContainer = $('#activeSlideCard');
    if (cardContainer) {
      cardContainer.innerHTML = renderWeekCardMarkup(currentWeek);
      wireWeekCardEvents(cardContainer, currentWeek);
    }
  }

  function nextSlide() {
    if (currentSlideIndex < filteredWeeks.length - 1) {
      currentSlideIndex++;
      const card = $('#activeSlideCard');
      if (card) {
        card.classList.remove('slide-in-right', 'slide-in-left');
        void card.offsetWidth;
        card.classList.add('slide-in-right');
      }
      renderSlideView();
      if (card && card.scrollIntoView) {
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }

  function prevSlide() {
    if (currentSlideIndex > 0) {
      currentSlideIndex--;
      const card = $('#activeSlideCard');
      if (card) {
        card.classList.remove('slide-in-right', 'slide-in-left');
        void card.offsetWidth;
        card.classList.add('slide-in-left');
      }
      renderSlideView();
      if (card && card.scrollIntoView) {
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }

  // --- TRILHA LIST VIEW ---
  function renderListView() {
    const list = $('#weekList');
    if (!list) return;

    list.innerHTML = filteredWeeks.map(w => {
      const d = weekDoneCount(w);
      return `
        <details class="week-card card shadow-sm" data-week="${w.number}" data-phase="${w.phase}">
          <summary class="week-summary card-header bg-body d-flex align-items-center justify-content-between p-3">
            <div class="d-flex align-items-center gap-3 min-w-0">
              <div class="week-card-avatar shadow-sm">${w.topicNum}</div>
              <div class="week-title-box min-w-0">
                <h3 class="week-title h6 fw-bold mb-1">${esc(w.title)}</h3>
                <p class="week-sub text-muted small mb-0">Semana ${w.topicNum} de 52 · ${esc(w.area)} · Gramática: ${esc(w.grammar)}</p>
              </div>
            </div>
            <div class="week-tags d-flex align-items-center gap-2 flex-shrink-0">
              <span class="badge ${d === 7 ? 'bg-success' : 'bg-secondary-subtle text-secondary-emphasis'}">${d === 7 ? '✓ Completa' : `${d}/7 dias`}</span>
              <span class="chevron" aria-hidden="true">⌄</span>
            </div>
          </summary>
          <div class="week-body card-body p-3" data-rendered="0">
            <div class="loading-week text-muted small">Carregando detalhes...</div>
          </div>
        </details>
      `;
    }).join('');

    $$('.week-card', list).forEach(card => {
      card.addEventListener('toggle', () => {
        if (card.open) {
          const body = $('.week-body', card);
          if (body && body.dataset.rendered !== '1') {
            const weekNum = Number(card.dataset.week);
            const week = DATA.weeks.find(w => w.number === weekNum);
            if (week) {
              body.innerHTML = renderWeekContentMarkup(week);
              body.dataset.rendered = '1';
              wireWeekCardEvents(card, week);
            }
          }
        }
      });
    });
  }

  // --- WEEK CARD MARKUP ---
  function getWeekUi(w) {
    if (!weekUiState[w.number]) {
      weekUiState[w.number] = {
        tab: 'days',
        activeDayIndex: 0
      };
    }
    return weekUiState[w.number];
  }

  function renderWeekCardMarkup(w) {
    const done = weekDoneCount(w);
    const phaseClass = w.phase === 1 ? 'phase-mint' : w.phase === 2 ? 'phase-blue' : 'phase-violet';

    return `
      <article class="week-slide-card card shadow-sm ${phaseClass}" data-week="${w.number}" data-phase="${w.phase}">
        <!-- Card Header with Clean Avatar -->
        <header class="slide-card-header card-header bg-body d-flex align-items-center justify-content-between p-3 border-bottom">
          <div class="d-flex align-items-center gap-3 min-w-0">
            <div class="week-avatar shadow-sm" aria-label="Semana ${w.topicNum}">
              ${w.topicNum}
            </div>

            <div class="slide-header-text min-w-0">
              <div class="slide-eyebrow text-muted small fw-bold text-uppercase">Semana ${w.topicNum} de 52 · ${esc(w.area)}</div>
              <h2 class="slide-title h5 fw-bold mb-1">${esc(w.title)}</h2>
              <div class="slide-meta text-muted small">
                <span>Gramática: ${esc(w.grammar)}</span>
              </div>
            </div>
          </div>

          <div class="slide-completion-box flex-shrink-0 ms-2">
            <span class="badge ${done === 7 ? 'bg-success' : 'bg-secondary-subtle text-secondary-emphasis'}">
              ${done === 7 ? '✓ Completa' : `${done}/7 dias`}
            </span>
          </div>
        </header>

        <!-- Inner Content (Tabs) -->
        <div class="slide-body-content card-body p-3">
          ${renderWeekContentMarkup(w)}
        </div>
      </article>
    `;
  }

  function renderWeekContentMarkup(w) {
    const ui = getWeekUi(w);
    const done = weekDoneCount(w);
    const vCount = weekVocabCount(w);

    const tabsHtml = `
      <nav class="week-inner-tabs d-flex flex-wrap gap-1 mb-3" role="tablist">
        <button type="button" class="inner-tab-btn ${ui.tab === 'days' ? 'active' : ''}" data-tab="days">
          <span>📅 Dias (${done}/7)</span>
        </button>
        <button type="button" class="inner-tab-btn ${ui.tab === 'mission' ? 'active' : ''}" data-tab="mission">
          <span>🎯 Missão & Guia</span>
        </button>
        <button type="button" class="inner-tab-btn ${ui.tab === 'resources' ? 'active' : ''}" data-tab="resources">
          <span>🔗 Recursos (${w.resources.length})</span>
        </button>
        <button type="button" class="inner-tab-btn ${ui.tab === 'vocab' ? 'active' : ''}" data-tab="vocab">
          <span>📖 Vocabulário (${vCount}/70)</span>
        </button>
      </nav>
    `;

    let activeTabContentHtml = '';
    if (ui.tab === 'days') {
      activeTabContentHtml = renderTrilhaDaysTab(w, ui);
    } else if (ui.tab === 'mission') {
      activeTabContentHtml = renderTrilhaMissionTab(w);
    } else if (ui.tab === 'resources') {
      activeTabContentHtml = renderTrilhaResourcesTab(w);
    } else if (ui.tab === 'vocab') {
      activeTabContentHtml = renderTrilhaVocabTab(w);
    }

    return `
      ${tabsHtml}
      <div class="tab-panel-container">
        ${activeTabContentHtml}
      </div>
    `;
  }

  function renderTrilhaDaysTab(w, ui) {
    const daysStripHtml = w.days.map((d, index) => {
      const isDone = !!state.days[d.id];
      const isSelected = ui.activeDayIndex === index;
      return `
        <button type="button" class="day-chip-btn ${isSelected ? 'active' : ''}" data-day-index="${index}">
          <span class="day-chip-short">${esc(d.short)}</span>
          <span class="day-chip-dot">${isDone ? '✓' : ''}</span>
        </button>
      `;
    }).join('');

    const currentDay = w.days[ui.activeDayIndex] || w.days[0];
    const isDayDone = !!state.days[currentDay.id];

    return `
      <div class="trilha-days-tab">
        <div class="days-nav-strip mb-3">
          ${daysStripHtml}
        </div>

        <div class="card bg-body-tertiary border-0 p-3 ${isDayDone ? 'border-start border-4 border-success' : ''}">
          <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <div>
              <h3 class="h6 fw-bold mb-0">${esc(currentDay.name)} · ${esc(currentDay.kind)}</h3>
              <span class="text-muted small">${currentDay.minutes} minutos</span>
            </div>
            <button type="button" class="btn btn-sm ${isDayDone ? 'btn-success' : 'btn-outline-success'} fw-bold mark-day-inline">
              ${isDayDone ? '✓ Concluído' : 'Marcar concluído'}
            </button>
          </div>

          <div class="d-flex flex-column gap-2">
            ${currentDay.steps.map(s => `
              <div class="card bg-body border-0 p-2">
                <div class="d-flex align-items-start gap-2">
                  <span class="badge bg-primary-subtle text-primary fw-bold p-1">${s.minutes}m</span>
                  <div class="flex-grow-1">
                    <h4 class="small fw-bold mb-1">${esc(s.label)}</h4>
                    <p class="small text-muted mb-1">${esc(s.task)}</p>
                    <a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" class="badge bg-light text-primary border text-decoration-none py-1 px-2">
                      ↗ ${esc(s.source)}
                    </a>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function renderTrilhaMissionTab(w) {
    return `
      <div class="d-flex flex-column gap-2">
        <div class="card bg-body-tertiary border-0 p-3">
          <div class="badge bg-primary-subtle text-primary align-self-start mb-2">🎯 Missão da Semana</div>
          <h4 class="h6 fw-bold mb-1">${esc(w.goal)}</h4>
          <p class="small text-muted mb-0">${esc(w.levelNote)}</p>
        </div>

        <div class="card bg-body-tertiary border-0 p-3">
          <div class="badge bg-info-subtle text-info-emphasis align-self-start mb-2">🗣️ Conversação Real</div>
          <h4 class="h6 fw-bold mb-1">${esc(w.scenario)}</h4>
          <p class="small text-muted mb-0">Faça o diálogo sem ler texto pronto. Pratique falar com ritmo natural.</p>
        </div>

        <div class="card bg-body-tertiary border-0 p-3">
          <div class="badge bg-warning-subtle text-warning-emphasis align-self-start mb-2">📚 Gramática em Uso</div>
          <h4 class="h6 fw-bold mb-1">${esc(w.grammar)}</h4>
          <p class="small text-muted mb-2">${esc(w.grammarOutcome)}</p>
          <a href="${esc(w.grammarUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline-primary py-1 px-2 align-self-start">
            ↗ Consultar no Cambridge Dictionary
          </a>
        </div>

        <div class="card bg-body-tertiary border-0 p-3">
          <div class="badge bg-danger-subtle text-danger-emphasis align-self-start mb-2">🎬 Conteúdo de Apoio</div>
          <h4 class="h6 fw-bold mb-1">${esc(w.contentTitle)}</h4>
          <p class="small text-muted mb-2">Assista ao vídeo para treinar compreensão e pronúncia em contexto.</p>
          <a href="${esc(w.contentUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline-primary py-1 px-2 align-self-start">
            ↗ Abrir busca no YouTube
          </a>
        </div>
      </div>
    `;
  }

  function renderTrilhaResourcesTab(w) {
    return `
      <div class="d-flex flex-column gap-2">
        ${w.resources.map(r => `
          <a class="card bg-body-tertiary border-0 p-3 text-decoration-none text-body" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">
            <div class="d-flex justify-content-between align-items-center">
              <span class="fw-bold text-primary">${esc(r.label)}</span>
              <span class="text-muted">↗</span>
            </div>
            <div class="small text-muted mt-1">${esc(r.purpose)}</div>
          </a>
        `).join('')}
        <a class="card bg-primary-subtle border-0 p-3 text-decoration-none text-body" href="${esc(w.contentUrl)}" target="_blank" rel="noopener noreferrer">
          <div class="d-flex justify-content-between align-items-center">
            <span class="fw-bold text-primary">YouTube · Vídeo Curado</span>
            <span class="text-primary">↗</span>
          </div>
          <div class="small text-muted mt-1">Busca temática no YouTube</div>
        </a>
      </div>
    `;
  }

  function renderTrilhaVocabTab(w) {
    const vCount = weekVocabCount(w);
    return `
      <div class="d-flex flex-column gap-2">
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <span class="small fw-bold">${vCount} de 70 vocabulários revistos</span>
          <button type="button" class="btn btn-sm btn-outline-primary goToVocabTabBtn">Abrir na Aba Vocabulário →</button>
        </div>
        <div class="vocab-page-grid" style="max-height: 320px;">
          ${w.vocab.slice(0, 20).map(v => {
            const known = !!state.vocab[v.id];
            return `
              <label class="vocab-item ${known ? 'checked' : ''}" data-vocab="${v.id}">
                <input type="checkbox" class="vocab-inline-chk" ${known ? 'checked' : ''}>
                <span class="vocab-text">
                  <strong>${esc(v.en)}</strong>
                  <small>${esc(v.pt)}</small>
                </span>
              </label>
            `;
          }).join('')}
        </div>
        <div class="text-center mt-1">
          <button type="button" class="btn btn-sm btn-primary goToVocabTabBtn">Ver todas as 70 palavras da semana</button>
        </div>
      </div>
    `;
  }

  function wireWeekCardEvents(root, w) {
    const ui = getWeekUi(w);

    $$('.inner-tab-btn', root).forEach(btn => {
      btn.addEventListener('click', () => {
        ui.tab = btn.dataset.tab;
        refreshWeekContent(root, w);
      });
    });

    $$('.day-chip-btn', root).forEach(btn => {
      btn.addEventListener('click', () => {
        ui.activeDayIndex = Number(btn.dataset.dayIndex);
        refreshWeekContent(root, w);
      });
    });

    const markDayBtn = $('.mark-day-inline', root);
    if (markDayBtn) {
      markDayBtn.addEventListener('click', () => {
        const activeDay = w.days[ui.activeDayIndex];
        if (!activeDay) return;
        if (state.days[activeDay.id]) delete state.days[activeDay.id];
        else state.days[activeDay.id] = true;
        saveState();
        updateOverallProgressDisplays();
        refreshWeekContent(root, w);
      });
    }

    $$('.goToVocabTabBtn', root).forEach(btn => {
      btn.addEventListener('click', () => {
        activeWeekNum = w.number;
        localStorage.setItem(ACTIVE_WEEK_KEY, activeWeekNum);
        switchPage('vocab');
      });
    });

    $$('.vocab-inline-chk', root).forEach(chk => {
      chk.addEventListener('change', () => {
        const item = chk.closest('.vocab-item');
        const id = item.dataset.vocab;
        if (chk.checked) state.vocab[id] = true;
        else delete state.vocab[id];
        item.classList.toggle('checked', chk.checked);
        saveState();
        updateOverallProgressDisplays();
      });
    });
  }

  function refreshWeekContent(root, w) {
    const bodyContent = $('.slide-body-content', root) || $('.week-body', root);
    if (bodyContent) {
      bodyContent.innerHTML = renderWeekContentMarkup(w);
      wireWeekCardEvents(root, w);
    }
    const tag = $('.completion-tag', root);
    if (tag) {
      const n = weekDoneCount(w);
      tag.textContent = n === 7 ? '✓ Completa' : `${n}/7 dias`;
      tag.classList.toggle('done', n === 7);
    }
  }

  // --- SWIPE GESTURE SUPPORT (MOBILE) ---
  function initSwipeGestures() {
    const slider = $('#slideContainer');
    if (!slider) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    slider.addEventListener('touchstart', e => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
      }
    }, { passive: true });

    slider.addEventListener('touchend', e => {
      if (e.changedTouches.length === 1) {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        const elapsedTime = Date.now() - touchStartTime;

        if (elapsedTime < 600 && Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
          if (deltaX < 0) nextSlide();
          else prevSlide();
        }
      }
    }, { passive: true });
  }

  // =========================================================================
  // --- 4. VOCABULÁRIO PAGE LOGIC ---
  // =========================================================================
  function renderVocabPage() {
    const select = $('#vocabWeekSelect');
    if (select) {
      select.innerHTML = DATA.weeks.map(w => {
        const isSelected = w.number === activeWeekNum;
        const vCount = weekVocabCount(w);
        return `<option value="${w.number}" ${isSelected ? 'selected' : ''}>
          Semana ${w.topicNum}: ${esc(w.title)} (${vCount}/70)
        </option>`;
      }).join('');

      select.onchange = e => {
        activeWeekNum = Number(e.target.value);
        localStorage.setItem(ACTIVE_WEEK_KEY, activeWeekNum);
        renderVocabPage();
      };
    }

    const currentWeek = getWeekByNumber(activeWeekNum);
    const vCount = weekVocabCount(currentWeek);

    const markAllBtn = $('#vocabPageMarkAllBtn');
    if (markAllBtn) {
      markAllBtn.textContent = vCount === 70 ? 'Desmarcar todos' : 'Marcar 70 como vistos';
    }

    let items = currentWeek.vocab;
    if (vocabPageFilter === 'pending') {
      items = items.filter(v => !state.vocab[v.id]);
    } else if (vocabPageFilter === 'done') {
      items = items.filter(v => !!state.vocab[v.id]);
    }

    const q = vocabPageQuery.trim().toLowerCase();
    if (q) {
      items = items.filter(v => v.en.toLowerCase().includes(q) || v.pt.toLowerCase().includes(q));
    }

    const grid = $('#vocabPageGrid');
    if (grid) {
      if (items.length === 0) {
        grid.innerHTML = '<div class="text-center text-muted p-4 small" style="grid-column: 1/-1;">Nenhuma palavra encontrada neste filtro.</div>';
      } else {
        grid.innerHTML = items.map(v => {
          const known = !!state.vocab[v.id];
          return `
            <label class="vocab-item ${known ? 'checked' : ''}" data-vocab="${v.id}">
              <input type="checkbox" class="vocab-chk" ${known ? 'checked' : ''} aria-label="Marcar ${esc(v.en)} como visto">
              <span class="vocab-text">
                <strong>${esc(v.en)}</strong>
                <small>${esc(v.pt)}</small>
              </span>
            </label>
          `;
        }).join('');

        $$('.vocab-chk', grid).forEach(box => {
          box.addEventListener('change', () => {
            const item = box.closest('.vocab-item');
            const id = item.dataset.vocab;
            if (box.checked) state.vocab[id] = true;
            else delete state.vocab[id];
            item.classList.toggle('checked', box.checked);
            saveState();
            updateOverallProgressDisplays();

            const newCount = weekVocabCount(currentWeek);
            if (markAllBtn) {
              markAllBtn.textContent = newCount === 70 ? 'Desmarcar todos' : 'Marcar 70 como vistos';
            }
          });
        });
      }
    }
  }

  function initVocabPageControls() {
    $$('#page-vocab .filter-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('#page-vocab .filter-pill').forEach(b => {
          b.className = 'btn btn-outline-secondary filter-pill';
        });
        btn.className = 'btn btn-primary active filter-pill';
        vocabPageFilter = btn.dataset.vfilter;
        renderVocabPage();
      });
    });

    const searchInput = $('#vocabPageSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', e => {
        vocabPageQuery = e.target.value;
        renderVocabPage();
      });
    }

    const markAllBtn = $('#vocabPageMarkAllBtn');
    if (markAllBtn) {
      markAllBtn.addEventListener('click', () => {
        const currentWeek = getWeekByNumber(activeWeekNum);
        const vCount = weekVocabCount(currentWeek);
        const shouldCheck = vCount < 70;

        currentWeek.vocab.forEach(v => {
          if (shouldCheck) state.vocab[v.id] = true;
          else delete state.vocab[v.id];
        });

        saveState();
        updateOverallProgressDisplays();
        renderVocabPage();
      });
    }
  }

  // --- TRILHA TOOLBAR & CONTROLS ---
  function initTrilhaToolbar() {
    const searchInput = $('#weekSearch');
    const clearBtn = $('#clearSearchBtn');
    const resetSearchBtn = $('#resetSearchBtn');

    if (searchInput) {
      searchInput.addEventListener('input', e => {
        currentQuery = e.target.value;
        if (clearBtn) clearBtn.hidden = !currentQuery;
        currentSlideIndex = 0;
        filterWeeks();
        renderTrilhaPage();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        currentQuery = '';
        clearBtn.hidden = true;
        currentSlideIndex = 0;
        filterWeeks();
        renderTrilhaPage();
        if (searchInput.focus) searchInput.focus();
      });
    }

    if (resetSearchBtn) {
      resetSearchBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        currentQuery = '';
        if (clearBtn) clearBtn.hidden = true;
        currentSlideIndex = 0;
        filterWeeks();
        renderTrilhaPage();
      });
    }

    const slideBtn = $('#slideModeBtn');
    const listBtn = $('#listModeBtn');

    if (slideBtn && listBtn) {
      slideBtn.addEventListener('click', () => {
        trilhaViewMode = 'slide';
        slideBtn.className = 'btn btn-primary active';
        listBtn.className = 'btn btn-outline-primary';
        renderTrilhaPage();
      });

      listBtn.addEventListener('click', () => {
        trilhaViewMode = 'list';
        listBtn.className = 'btn btn-primary active';
        slideBtn.className = 'btn btn-outline-primary';
        renderTrilhaPage();
      });
    }

    const prevBtn = $('#prevSlideBtn');
    const nextBtn = $('#nextSlideBtn');

    if (prevBtn) prevBtn.addEventListener('click', prevSlide);
    if (nextBtn) nextBtn.addEventListener('click', nextSlide);

    window.addEventListener('keydown', e => {
      if (activePage !== 'trilha' || trilhaViewMode !== 'slide') return;
      if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevSlide();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextSlide();
      }
    });
  }

  // --- INITIALIZATION ---
  function init() {
    initTheme();
    initBottomNav();
    renderPhasesNav();
    initTrilhaToolbar();
    initSwipeGestures();
    initVocabPageControls();

    switchPage(activePage);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
