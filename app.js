// ── State ──────────────────────────────────────────────────────────────────
const state = {
  playerCount: 4,
  currentPlayer: 1,
  playerNames: ['Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5', 'Player 6'],
  announceNameAlways: true,
  diceCount: 2,
  dieSides: 6,
  dice: [],
  autoRoll: false,
  rollInterval: 30,
  pauseOnRobber: true,
  history: [],
  isPaused: false,
  timerAnimFrame: null,
  timerStart: null,
  selectedVoice: null,
  muted: false,
  rollCounts: {},
  fairRoll: false,
  fairDeck: [],
  fairDeckPos: 0,
};

let isRolling = false;
let hasRolled = false;

const DIE_FACES  = ['face-1','face-2','face-3','face-4','face-5','face-6'];
const NUM_WORDS  = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve'];
const DIE_CHARS  = ['','⚀','⚁','⚂','⚃','⚄','⚅'];

// ── DOM refs ────────────────────────────────────────────────────────────────
const diceContainerEl     = document.getElementById('dice-container');
const rollSumEl           = document.getElementById('roll-sum');
const robberLabelEl       = document.getElementById('robber-label');
const playerDisplayEl     = document.getElementById('player-display');
const historyListEl       = document.getElementById('history-list');
const rollAreaEl          = document.getElementById('roll-area');
const tapHintEl           = document.getElementById('tap-hint');
const resumeBtnEl         = document.getElementById('resume-btn');
const timerBarContainerEl = document.getElementById('timer-bar-container');
const timerBarEl          = document.getElementById('timer-bar');
const settingsOverlayEl   = document.getElementById('settings-overlay');
const settingsBtnEl       = document.getElementById('settings-btn');
const closeSettingsEl     = document.getElementById('close-settings');
const playerCountEl       = document.getElementById('player-count');
const autoRollToggleEl    = document.getElementById('auto-roll-toggle');
const rollIntervalEl      = document.getElementById('roll-interval');
const pauseOnRobberEl     = document.getElementById('pause-on-robber');
const intervalRowEl       = document.getElementById('interval-row');
const pauseRowEl          = document.getElementById('pause-row');
const installBtnEl        = document.getElementById('install-btn');
const pauseBtnEl          = document.getElementById('pause-btn');
const themeBtnEl          = document.getElementById('theme-btn');
const diceCountEl          = document.getElementById('dice-count');
const dieSidesEl           = document.getElementById('die-sides');
const statsPanelEl         = document.getElementById('stats-panel');
const statsChartEl         = document.getElementById('stats-chart');
const resetStatsBtnEl      = document.getElementById('reset-stats-btn');
const muteBtnEl            = document.getElementById('mute-btn');
const announceNameToggleEl = document.getElementById('announce-name-toggle');
const announceNameRowEl    = document.getElementById('announce-name-row');
const voiceSelectEl        = document.getElementById('voice-select');
const voiceTestBtnEl       = document.getElementById('voice-test-btn');
const fairRollToggleEl     = document.getElementById('fair-roll-toggle');
const fairRollRowEl        = document.getElementById('fair-roll-row');
const deckProgressEl       = document.getElementById('deck-progress');

// ── Player name helpers ──────────────────────────────────────────────────────
function getPlayerName(n) {
  return state.playerNames[n - 1] || `Player ${n}`;
}

function renderNameInputs() {
  const section = document.getElementById('player-names-section');
  const container = document.getElementById('player-name-inputs');

  if (state.playerCount <= 1) {
    section.classList.add('hidden');
    announceNameRowEl.classList.add('hidden');
    return;
  }
  announceNameRowEl.classList.remove('hidden');

  section.classList.remove('hidden');
  container.innerHTML = '';

  for (let i = 1; i <= state.playerCount; i++) {
    const row = document.createElement('div');
    row.className = 'name-input-row';

    const label = document.createElement('label');
    label.textContent = `P${i}`;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'player-name-input';
    input.placeholder = `Player ${i}`;
    input.maxLength = 14;
    // Only pre-fill if it's been customised from the default
    const defaultName = `Player ${i}`;
    input.value = state.playerNames[i - 1] !== defaultName ? state.playerNames[i - 1] : '';

    input.addEventListener('input', () => {
      state.playerNames[i - 1] = input.value.trim() || `Player ${i}`;
      updatePlayerDisplay();
      renderHistory();
    });

    row.appendChild(label);
    row.appendChild(input);
    container.appendChild(row);
  }
}

// ── Fair deck ────────────────────────────────────────────────────────────────
function buildFairDeck() {
  const deck = [];
  for (let a = 1; a <= 6; a++)
    for (let b = 1; b <= 6; b++)
      deck.push([a, b]);
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  state.fairDeck = deck;
  state.fairDeckPos = 0;
}

function updateFairRollVisibility() {
  const eligible = state.diceCount === 2 && state.dieSides === 6;
  fairRollRowEl.style.display = eligible ? 'flex' : 'none';
  if (!eligible && state.fairRoll) {
    state.fairRoll = false;
    fairRollToggleEl.checked = false;
  }
}

// ── Dice helpers ────────────────────────────────────────────────────────────
function randDie() {
  return Math.ceil(Math.random() * state.dieSides);
}

function setDieValue(el, value) {
  if (state.dieSides === 6) {
    DIE_FACES.forEach(f => el.classList.remove(f));
    el.classList.add(`face-${value}`);
  } else {
    const span = el.querySelector('.die-val');
    if (span) span.textContent = value;
  }
}

function resetRollCounts() {
  state.rollCounts = {};
  for (let i = state.diceCount; i <= state.diceCount * state.dieSides; i++) {
    state.rollCounts[i] = 0;
  }
  if (state.fairRoll) buildFairDeck();
}

function renderDiceElements() {
  diceContainerEl.innerHTML = '';
  state.dice = [];
  const sizes = { 1: '28vmin', 2: '22vmin', 3: '18vmin', 4: '15vmin', 5: '13vmin' };
  const dieSize = sizes[state.diceCount] || '13vmin';

  for (let i = 0; i < state.diceCount; i++) {
    const die = document.createElement('div');
    die.style.setProperty('--die-size', dieSize);

    if (state.dieSides === 6) {
      die.className = 'die face-1';
      for (let p = 1; p <= 7; p++) {
        const pip = document.createElement('div');
        pip.className = `pip p${p}`;
        die.appendChild(pip);
      }
    } else {
      die.className = 'die die--number';
      const span = document.createElement('span');
      span.className = 'die-val';
      span.textContent = '1';
      die.appendChild(span);
    }

    diceContainerEl.appendChild(die);
    state.dice.push(die);
  }
}

// ── Roll ────────────────────────────────────────────────────────────────────
function roll() {
  if (isRolling || state.isPaused) return;

  if (state.autoRoll) state.timerStart = Date.now();

  if (!hasRolled) {
    hasRolled = true;
    tapHintEl.classList.add('hidden');
  }

  let rolls;
  if (state.fairRoll && state.diceCount === 2 && state.dieSides === 6) {
    if (state.fairDeckPos >= state.fairDeck.length) buildFairDeck();
    rolls = state.fairDeck[state.fairDeckPos++];
  } else {
    rolls = Array.from({ length: state.diceCount }, () => randDie());
  }
  const sum = rolls.reduce((a, b) => a + b, 0);
  const isRobber = sum === 7;

  state.history.unshift({ rolls, sum, isRobber, player: state.currentPlayer, dieSides: state.dieSides });
  if (state.history.length > 15) state.history.pop();
  if (state.rollCounts[sum] !== undefined) state.rollCounts[sum]++;

  animateRoll(rolls, () => {
    rollSumEl.textContent = sum;

    if (isRobber) {
      robberLabelEl.classList.remove('hidden');
      rollAreaEl.classList.remove('robber');
      void rollAreaEl.offsetWidth;
      rollAreaEl.classList.add('robber');
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      const robberWho = state.playerCount > 1 ? `${getPlayerName(state.currentPlayer)}, ` : '';
      speak(`${robberWho}Robber!`);

      if (state.autoRoll && state.pauseOnRobber) {
        stopAutoRoll();
        state.isPaused = true;
        resumeBtnEl.classList.remove('hidden');
        updatePauseBtn();
      }
    } else {
      robberLabelEl.classList.add('hidden');
      rollAreaEl.classList.remove('robber');
      const who = (state.playerCount > 1 && state.announceNameAlways) ? `${getPlayerName(state.currentPlayer)}, ` : '';
      speak(`${who}${NUM_WORDS[sum] || String(sum)}`);
    }

    advancePlayer();
    renderHistory();
    renderStats();
  });
}

function animateRoll(finalRolls, callback) {
  isRolling = true;
  state.dice.forEach(d => d.classList.add('rolling'));

  const DURATION = 500;
  const TICK = 60;
  let elapsed = 0;

  const interval = setInterval(() => {
    state.dice.forEach(d => setDieValue(d, randDie()));
    elapsed += TICK;

    if (elapsed >= DURATION) {
      clearInterval(interval);
      finalRolls.forEach((v, i) => setDieValue(state.dice[i], v));
      state.dice.forEach(d => d.classList.remove('rolling'));
      isRolling = false;
      callback();
    }
  }, TICK);
}

// ── Player tracking ─────────────────────────────────────────────────────────
function advancePlayer() {
  if (state.playerCount <= 1) return;
  state.currentPlayer = (state.currentPlayer % state.playerCount) + 1;
  playerDisplayEl.textContent = `${getPlayerName(state.currentPlayer)}'s Turn`;
}

function updatePauseBtn() {
  if (!state.autoRoll) {
    pauseBtnEl.classList.add('hidden');
    return;
  }
  pauseBtnEl.classList.remove('hidden');
  if (state.isPaused) {
    pauseBtnEl.innerHTML = '&#9654;'; // play triangle
    pauseBtnEl.classList.add('paused');
    pauseBtnEl.setAttribute('aria-label', 'Resume');
  } else {
    pauseBtnEl.innerHTML = '&#9646;&#9646;'; // pause bars
    pauseBtnEl.classList.remove('paused');
    pauseBtnEl.setAttribute('aria-label', 'Pause');
  }
}

function updatePlayerDisplay() {
  if (state.playerCount > 1) {
    playerDisplayEl.textContent = `${getPlayerName(state.currentPlayer)}'s Turn`;
  } else {
    playerDisplayEl.textContent = 'Tap to Roll';
  }
}

// ── Text-to-speech ───────────────────────────────────────────────────────────
function speak(text) {
  if (!('speechSynthesis' in window) || state.muted) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 0.9;
  if (state.selectedVoice) utt.voice = state.selectedVoice;
  window.speechSynthesis.speak(utt);
}

function loadVoices() {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return;

  const english = voices.filter(v => v.lang.startsWith('en'));
  if (!english.length) return;

  voiceSelectEl.innerHTML = '<option value="">Default</option>';
  english.forEach((v, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = v.name;
    opt.dataset.index = voices.indexOf(v);
    voiceSelectEl.appendChild(opt);
  });

  // Pick a good default: prefer Google or Siri voices
  const preferred = english.find(v => /google|siri/i.test(v.name));
  const defaultVoice = preferred || english[0];
  const defaultOpt = [...voiceSelectEl.options].find(
    o => o.textContent === defaultVoice.name
  );
  if (defaultOpt) {
    defaultOpt.selected = true;
    state.selectedVoice = defaultVoice;
  }
}

// ── Stats ────────────────────────────────────────────────────────────────────
function renderStats() {
  const min = state.diceCount;
  const max = state.diceCount * state.dieSides;
  const range = max - min + 1;
  const mean = state.diceCount * (state.dieSides + 1) / 2;

  if (range > 20) {
    statsPanelEl.classList.add('hidden');
    return;
  }
  statsPanelEl.classList.remove('hidden');

  const counts = state.rollCounts;
  const maxCount = Math.max(1, ...Object.values(counts));

  if (state.fairRoll && deckProgressEl) {
    deckProgressEl.textContent = `Roll ${state.fairDeckPos} / 36`;
  } else if (deckProgressEl) {
    deckProgressEl.textContent = '';
  }

  statsChartEl.innerHTML = Array.from({ length: range }, (_, i) => {
    const n = min + i;
    const count = counts[n] || 0;
    const pct = (count / maxCount) * 100;
    const isRobber = n === 7;
    const isHot = !isRobber && Math.abs(n - mean) <= range * 0.15;
    const cls = isRobber ? 'bar-robber' : isHot ? 'bar-hot' : 'bar-normal';
    return `<div class="stat-col">
      <div class="stat-count">${count || ''}</div>
      <div class="stat-bar-wrap">
        <div class="stat-bar ${cls}" style="height:${pct}%"></div>
      </div>
      <div class="stat-num">${n}</div>
    </div>`;
  }).join('');
}

resetStatsBtnEl.addEventListener('click', () => {
  resetRollCounts();
  state.history = [];
  renderStats();
  renderHistory();
});

// ── History ──────────────────────────────────────────────────────────────────
function renderHistory() {
  historyListEl.innerHTML = state.history.map(entry => {
    const playerBadge = state.playerCount > 1
      ? `<span class="history-player">${getPlayerName(entry.player)}</span>`
      : '';
    const robberMark = entry.isRobber ? ' 🔴' : '';
    const diceDisplay = entry.dieSides === 6
      ? entry.rolls.map(r => DIE_CHARS[r]).join(' ')
      : entry.rolls.map(r => `[${r}]`).join('+');
    return `<li class="${entry.isRobber ? 'robber-entry' : ''}">
      ${playerBadge}${diceDisplay}
      <span class="history-sum">${entry.sum}${robberMark}</span>
    </li>`;
  }).join('');
}

// ── Auto-roll ────────────────────────────────────────────────────────────────
function startAutoRoll() {
  stopAutoRoll();
  state.isPaused = false;
  state.timerStart = Date.now();
  timerBarContainerEl.classList.remove('hidden');
  resumeBtnEl.classList.add('hidden');

  const animate = () => {
    const elapsed = Date.now() - state.timerStart;
    const duration = state.rollInterval * 1000;
    const pct = Math.min(elapsed / duration, 1);
    timerBarEl.style.width = `${(1 - pct) * 100}%`;

    // Fire roll when time is up and not already mid-roll
    if (elapsed >= duration && !isRolling) {
      state.timerStart = Date.now();
      roll();
    }

    state.timerAnimFrame = requestAnimationFrame(animate);
  };

  state.timerAnimFrame = requestAnimationFrame(animate);
}

function stopAutoRoll() {
  if (state.timerAnimFrame) {
    cancelAnimationFrame(state.timerAnimFrame);
    state.timerAnimFrame = null;
  }
  timerBarContainerEl.classList.add('hidden');
  timerBarEl.style.width = '100%';
}

// ── Event listeners ──────────────────────────────────────────────────────────
rollAreaEl.addEventListener('click', roll);

resumeBtnEl.addEventListener('click', () => {
  rollAreaEl.classList.remove('robber');
  robberLabelEl.classList.add('hidden');
  resumeBtnEl.classList.add('hidden');
  state.isPaused = false;
  if (state.autoRoll) startAutoRoll();
  updatePauseBtn();
});

pauseBtnEl.addEventListener('click', () => {
  if (state.isPaused) {
    state.isPaused = false;
    resumeBtnEl.classList.add('hidden');
    startAutoRoll();
  } else {
    stopAutoRoll();
    state.isPaused = true;
  }
  updatePauseBtn();
});

settingsBtnEl.addEventListener('click', () => {
  settingsOverlayEl.classList.remove('hidden');
});

closeSettingsEl.addEventListener('click', () => {
  settingsOverlayEl.classList.add('hidden');
});

settingsOverlayEl.addEventListener('click', e => {
  if (e.target === settingsOverlayEl) settingsOverlayEl.classList.add('hidden');
});

diceCountEl.addEventListener('change', () => {
  state.diceCount = parseInt(diceCountEl.value);
  resetRollCounts();
  state.history = [];
  renderDiceElements();
  updateFairRollVisibility();
  renderStats();
  renderHistory();
});

dieSidesEl.addEventListener('change', () => {
  state.dieSides = parseInt(dieSidesEl.value);
  resetRollCounts();
  state.history = [];
  renderDiceElements();
  updateFairRollVisibility();
  renderStats();
  renderHistory();
});

fairRollToggleEl.addEventListener('change', () => {
  state.fairRoll = fairRollToggleEl.checked;
  if (state.fairRoll) buildFairDeck();
  renderStats();
});

playerCountEl.addEventListener('change', () => {
  state.playerCount = parseInt(playerCountEl.value);
  state.currentPlayer = 1;
  updatePlayerDisplay();
  renderNameInputs();
  renderHistory();
});

autoRollToggleEl.addEventListener('change', () => {
  state.autoRoll = autoRollToggleEl.checked;
  intervalRowEl.style.display = state.autoRoll ? 'flex' : 'none';
  pauseRowEl.style.display = state.autoRoll ? 'flex' : 'none';

  if (state.autoRoll) {
    startAutoRoll();
  } else {
    stopAutoRoll();
    resumeBtnEl.classList.add('hidden');
    state.isPaused = false;
  }
  updatePauseBtn();
});

rollIntervalEl.addEventListener('change', () => {
  const val = parseInt(rollIntervalEl.value);
  state.rollInterval = isNaN(val) ? 30 : Math.max(5, val);
  rollIntervalEl.value = state.rollInterval;
  if (state.autoRoll && !state.isPaused) startAutoRoll();
});

pauseOnRobberEl.addEventListener('change', () => {
  state.pauseOnRobber = pauseOnRobberEl.checked;
});

// Pause auto-roll when app goes to background
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (state.autoRoll && !state.isPaused) stopAutoRoll();
  } else {
    if (state.autoRoll && !state.isPaused) startAutoRoll();
  }
});

// ── PWA install prompt ───────────────────────────────────────────────────────
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  installBtnEl.classList.remove('hidden');
});

installBtnEl.addEventListener('click', () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(() => {
    deferredPrompt = null;
    installBtnEl.classList.add('hidden');
  });
});

// ── Wake lock ────────────────────────────────────────────────────────────────
let wakeLock = null;

async function requestWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
  } catch (_) { /* permission denied or not supported */ }
}

// Wake lock is released automatically when the page is hidden — re-acquire on return
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') requestWakeLock();
});

requestWakeLock();

// ── Service worker ───────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}

voiceSelectEl.addEventListener('change', () => {
  const allVoices = window.speechSynthesis.getVoices();
  const english = allVoices.filter(v => v.lang.startsWith('en'));
  const idx = parseInt(voiceSelectEl.value);
  state.selectedVoice = isNaN(idx) ? null : english[idx];
});

muteBtnEl.addEventListener('click', () => {
  state.muted = !state.muted;
  muteBtnEl.textContent = state.muted ? '🔇' : '🔊';
  muteBtnEl.setAttribute('aria-label', state.muted ? 'Unmute' : 'Mute');
  if (state.muted) window.speechSynthesis?.cancel();
});

announceNameToggleEl.addEventListener('change', () => {
  state.announceNameAlways = announceNameToggleEl.checked;
});

voiceTestBtnEl.addEventListener('click', () => speak('Eight'));

// ── Theme ─────────────────────────────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeBtnEl.textContent = theme === 'light' ? '☀️ Light' : '🌙 Dark';
  localStorage.setItem('theme', theme);
}

themeBtnEl.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'light' ? 'dark' : 'light');
});

// ── Init ─────────────────────────────────────────────────────────────────────
applyTheme(localStorage.getItem('theme') || 'dark');
intervalRowEl.style.display = 'none';
pauseRowEl.style.display = 'none';
renderNameInputs();
resetRollCounts();
renderDiceElements();
updateFairRollVisibility();
renderStats();

if ('speechSynthesis' in window) {
  // Chrome loads voices async; Firefox/Safari loads sync
  loadVoices();
  window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
}
