// ==============================
// Config
// ==============================
const ROBLOX_USER_ID = null; // <- Zet hier Daley's Roblox userId (nummer) als je de avatar wilt tonen
const SOUND_OK = 'ok.wav';    // lokale WAV's
const SOUND_NO = 'no.wav';

// ==============================
// State
// ==============================
let gameState = {
  playerName: '',
  selectedTables: [],
  questions: [],
  currentQuestionIndex: 0,
  correct: 0,
  incorrect: 0,
  sessionLength: 20,
  tablePerformance: {},
  wrongs: [],
  hard: {}, // key: "table-multiplier" -> {attempts, wrongs}
  lastMode: 'random' // 'random' | 'systematic' | 'hard'
};

// ==============================
// Init
// ==============================
function init() {
  createTableGrid();

  // Restore naam
  const nm = localStorage.getItem('playerName');
  if (nm) document.getElementById('playerName').value = nm;

  // Restore geselecteerde tafels
  try {
    const saved = JSON.parse(localStorage.getItem('selectedTables') || '[]');
    saved.forEach(v => {
      const cb = document.getElementById('table' + v);
      if (cb) cb.checked = true;
    });
  } catch {}

  // Restore hard-dict
  try {
    gameState.hard = JSON.parse(localStorage.getItem('hardDict') || '{}');
  } catch { gameState.hard = {}; }
  updateHardButtonState();

  // Enter->check
  document.getElementById('answerInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') checkAnswer();
  });

  // Roblox avatar
  if (ROBLOX_USER_ID) {
    const url = `https://www.roblox.com/headshot-thumbnail/image?userId=${ROBLOX_USER_ID}&width=150&height=150&format=png`;
    const img = document.getElementById('rbxAvatar');
    img.src = url;
    document.getElementById('rbxAvatarWrap').style.display = 'flex';
  }
}

// ==============================
// UI Builders
// ==============================
function createTableGrid() {
  const grid = document.getElementById('tabelGrid');
  grid.innerHTML = '';
  for (let i = 1; i <= 10; i++) {
    const wrap = document.createElement('div');
    wrap.className = 'checkbox-wrapper';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = 'table' + i;
    input.value = i;

    const label = document.createElement('label');
    label.className = 'checkbox-label';
    label.setAttribute('for', 'table' + i);
    label.textContent = 'Tafel ' + i;

    wrap.appendChild(input);
    wrap.appendChild(label);
    grid.appendChild(wrap);
  }
}

function selectAll() {
  document.querySelectorAll('#tabelGrid input[type="checkbox"]').forEach(cb => cb.checked = true);
}
function deselectAll() {
  document.querySelectorAll('#tabelGrid input[type="checkbox"]').forEach(cb => cb.checked = false);
}

function updateHardButtonState() {
  const btn = document.getElementById('startHardBtn');
  const hasHard = Object.values(gameState.hard).some(v => v.attempts >= 2 && v.wrongs / v.attempts >= 0.5);
  btn.disabled = !hasHard;
}

// ==============================
// Start flows
// ==============================
function startQuick() { startGame(20, 'random'); }
function startLong()  { startGame(40, 'random'); }
function startSystematic() { startGame(null, 'systematic'); }
function startHard()  {
  gameState.lastMode = 'hard';
  const ok = generateHardOnes();
  if (!ok) return;
  showScreen('quizScreen');
  loadQuestion();
}

function startGame(length, mode = 'random') {
  const name = document.getElementById('playerName').value.trim();
  if (!name) { alert('Vul alsjeblieft je naam in! 📝'); return; }

  const selected = Array.from(document.querySelectorAll('#tabelGrid input[type="checkbox"]:checked')).map(cb => parseInt(cb.value, 10));
  if (selected.length === 0) { alert('Kies alsjeblieft minstens één tafel! 📚'); return; }

  // Persist voorkeuren
  localStorage.setItem('playerName', name);
  localStorage.setItem('selectedTables', JSON.stringify(selected));

  // Reset state
  gameState.playerName = name;
  gameState.selectedTables = selected;
  gameState.correct = 0;
  gameState.incorrect = 0;
  gameState.currentQuestionIndex = 0;
  gameState.tablePerformance = {};
  gameState.wrongs = [];
  gameState.lastMode = mode;

  selected.forEach(t => gameState.tablePerformance[t] = { correct: 0, total: 0 });

  if (mode === 'systematic') {
    generateQuestionsSystematic(); // sets sessionLength
  } else {
    gameState.sessionLength = length ?? 20;
    generateQuestions();
  }

  showScreen('quizScreen');
  loadQuestion();
}

// ==============================
// Generators
// ==============================
function generateQuestions() {
  gameState.questions = [];
  const tables = gameState.selectedTables;
  let last = null;
  for (let i = 0; i < gameState.sessionLength; i++) {
    let q;
    do {
      const table = tables[Math.floor(Math.random() * tables.length)];
      const multiplier = Math.floor(Math.random() * 10) + 1;
      q = { table, multiplier, answer: table * multiplier };
    } while (last && q.table === last.table && q.multiplier === last.multiplier);
    gameState.questions.push(q);
    last = q;
  }
}

function generateQuestionsSystematic() {
  const qs = [];
  for (const t of gameState.selectedTables) {
    for (let m = 1; m <= 10; m++) {
      qs.push({ table: t, multiplier: m, answer: t * m });
    }
  }
  // shuffle
  for (let i = qs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [qs[i], qs[j]] = [qs[j], qs[i]];
  }
  gameState.questions = qs;
  gameState.sessionLength = qs.length;
}

function generateHardOnes(limit = 20) {
  const entries = Object.entries(gameState.hard)
    .filter(([, v]) => v.attempts >= 2 && v.wrongs / v.attempts >= 0.5)
    .sort((a, b) => (b[1].wrongs / b[1].attempts) - (a[1].wrongs / a[1].attempts))
    .slice(0, limit)
    .map(([k]) => {
      const [table, multiplier] = k.split('-').map(Number);
      return { table, multiplier, answer: table * multiplier };
    });

  if (entries.length === 0) {
    alert('Geen lastige sommen gevonden. Goed bezig!');
    return false;
  }
  gameState.questions = entries;
  gameState.sessionLength = entries.length;
  gameState.currentQuestionIndex = 0;
  gameState.correct = 0;
  gameState.incorrect = 0;
  return true;
}

// ==============================
// Quiz loop
// ==============================
function loadQuestion() {
  const q = gameState.questions[gameState.currentQuestionIndex];
  document.getElementById('question').textContent = `${q.multiplier} × ${q.table} = ?`;
  document.getElementById('questionNumber').textContent = gameState.currentQuestionIndex + 1;
  document.getElementById('totalQuestions').textContent = gameState.sessionLength;
  document.getElementById('answerInput').value = '';
  document.getElementById('feedback').innerHTML = '';
  document.getElementById('playerNameDisplay').textContent = gameState.playerName;

  // Punt 1: toon alleen aantal goed (geen 0/0)
  document.getElementById('scoreDisplay').textContent = `📊 ${gameState.correct} goed`;

  const progress = (gameState.currentQuestionIndex / gameState.sessionLength) * 100;
  document.getElementById('progressFill').style.width = progress + '%';

  document.getElementById('answerInput').focus();
}

function checkAnswer() {
  const ansStr = document.getElementById('answerInput').value;
  const answer = parseInt(ansStr, 10);
  const q = gameState.questions[gameState.currentQuestionIndex];

  const key = `${q.table}-${q.multiplier}`;
  const h = (gameState.hard[key] ||= { attempts: 0, wrongs: 0 });
  h.attempts++;

  if (answer === q.answer) {
    gameState.correct++;
    gameState.tablePerformance[q.table].correct++;
    showFeedback(true);
    playSound(true);
    celebrateCorrect();
  } else {
    gameState.incorrect++;
    gameState.wrongs.push(q);
    h.wrongs++;
    showFeedback(false, q.answer);
    playSound(false);
  }
  gameState.tablePerformance[q.table].total++;

  // disable check tijdens overgang
  document.getElementById('answerInput').disabled = true;
  document.getElementById('checkBtn').disabled = true;

  setTimeout(() => {
    if (gameState.currentQuestionIndex < gameState.sessionLength - 1) {
      gameState.currentQuestionIndex++;
      loadQuestion();
      document.getElementById('answerInput').disabled = false;
      document.getElementById('checkBtn').disabled = false;
      document.getElementById('answerInput').focus();
    } else {
      showResults();
    }
  }, 1200);
}

function showFeedback(correct, answer) {
  const feedback = document.getElementById('feedback');
  if (correct) {
    feedback.innerHTML = '✅ <strong>CORRECT!</strong> Goed gedaan! 🎉';
    feedback.className = 'feedback correct';
  } else {
    feedback.innerHTML = `❌ <strong>Helaas!</strong> Het antwoord was ${answer}`;
    feedback.className = 'feedback incorrect';
  }
}

// ==============================
// Audio + confetti (geoptimaliseerd)
// ==============================
let sndOk, sndNo;
function playSound(ok) {
  try {
    if (document.getElementById('mute')?.checked) return;
    if (!sndOk) { sndOk = new Audio(SOUND_OK); }
    if (!sndNo) { sndNo = new Audio(SOUND_NO); }
    const a = ok ? sndOk : sndNo;
    a.currentTime = 0; a.play().catch(()=>{});
  } catch {}
}

function celebrateCorrect() {
  createConfetti();
}

function createConfetti() {
  const N = 10; // minder DOM-load
  for (let i = 0; i < N; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.textContent = ['🌟','⭐','✨','🎉','🎊'][Math.floor(Math.random()*5)];
    confetti.style.position = 'fixed';
    confetti.style.left = Math.random()*100 + '%';
    confetti.style.top = '-10px';
    confetti.style.fontSize = (Math.random()*20 + 20) + 'px';
    confetti.style.pointerEvents = 'none';

    const duration = Math.random() * 1 + 1;
    confetti.style.transition = `transform ${duration}s linear, opacity ${duration}s linear`;
    document.body.appendChild(confetti);

    requestAnimationFrame(() => {
      confetti.style.transform = 'translateY(500px) rotate(360deg)';
      confetti.style.opacity = '0';
    });
    setTimeout(() => confetti.remove(), duration * 1000 + 100);
  }
}

// ==============================
// Results + navigation
// ==============================
function showResults() {
  // persist hard-dict zodat "Lastige sommen" blijft bestaan
  localStorage.setItem('hardDict', JSON.stringify(gameState.hard));
  updateHardButtonState();

  const percentage = Math.round((gameState.correct / gameState.sessionLength) * 100);
  const emojis = {
    100: '😍 PERFECT!',
    90: '🤩 GEWELDIG!',
    75: '😄 HEEL GOED!',
    50: '😊 GOED BEZIG!',
    0:  '😤 VOLGENDE KEER BETER!'
  };
  let emoji = '😔';
  if (percentage >= 100) emoji = emojis[100];
  else if (percentage >= 90) emoji = emojis[90];
  else if (percentage >= 75) emoji = emojis[75];
  else if (percentage >= 50) emoji = emojis[50];
  else emoji = emojis[0];

  document.getElementById('resultEmoji').textContent = emoji;
  document.getElementById('resultPlayerName').textContent = gameState.playerName;
  document.getElementById('scoreResult').textContent = `${gameState.correct}/${gameState.sessionLength}`;
  document.getElementById('correctCount').textContent = gameState.correct;
  document.getElementById('incorrectCount').textContent = gameState.incorrect;
  document.getElementById('percentage').textContent = percentage + '%';

  const breakdown = document.getElementById('tablesBreakdown');
  let html = '<h3 style="color: var(--accent); margin-bottom: 12px;">📊 Per Tafel:</h3>';
  Object.keys(gameState.tablePerformance).forEach(table => {
    const perf = gameState.tablePerformance[table];
    const tablePerc = perf.total > 0 ? Math.round((perf.correct / perf.total) * 100) : 0;
    html += `
      <div style="margin:10px 0; padding:10px; background: rgba(72,226,111,0.08); border-left:3px solid #48e26f; border-radius:5px;">
        <strong>Tafel ${table}:</strong> ${perf.correct}/${perf.total} goed (${tablePerc}%)
      </div>
    `;
  });
  breakdown.innerHTML = html;

  showScreen('resultsScreen');
}

function practiceWrongs() {
  if (!gameState.wrongs || gameState.wrongs.length === 0) {
    alert('Top! Geen fouten om te oefenen.');
    return;
  }
  const wr = gameState.wrongs.slice();
  gameState.questions = wr;
  gameState.sessionLength = wr.length;
  gameState.currentQuestionIndex = 0;
  gameState.correct = 0;
  gameState.incorrect = 0;
  showScreen('quizScreen');
  loadQuestion();
}

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

function goHome() {
  // reset zonder je voorkeuren te wissen
  gameState.playerName = localStorage.getItem('playerName') || '';
  gameState.selectedTables = [];
  gameState.questions = [];
  gameState.currentQuestionIndex = 0;
  gameState.correct = 0;
  gameState.incorrect = 0;
  gameState.sessionLength = 20;
  gameState.tablePerformance = {};
  gameState.wrongs = [];

  // laat eerder ingevulde naam staan
  const nm = localStorage.getItem('playerName') || 'Daley';
  document.getElementById('playerName').value = nm;

  // deselecteer grid, dan herstel saved selectie (optioneel)
  deselectAll();
  try {
    const saved = JSON.parse(localStorage.getItem('selectedTables') || '[]');
    saved.forEach(v => {
      const cb = document.getElementById('table' + v);
      if (cb) cb.checked = true;
    });
  } catch {}

  showScreen('welcomeScreen');
}

function playAgain() {
  const mode = gameState.lastMode || 'random';
  if (mode === 'hard') { return startHard(); }
  if (mode === 'systematic') { return startSystematic(); }
  // standaard: herstart met zelfde lengte
  startGame(gameState.sessionLength, 'random');
}

// ==============================
// Boot
// ==============================
init();
