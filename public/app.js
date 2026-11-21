const year = document.querySelector("#year");
if (year) year.textContent = new Date().getFullYear();

const modal = document.querySelector("#juego");
const gameTitle = document.querySelector("#game-title");
const gameDescription = document.querySelector("#game-description");
const gameContent = document.querySelector("#game-content");
const scoreLabel = document.querySelector("#game-score");
const recordLabel = document.querySelector("#game-record");
let score = 0;
let currentGame = "";
let timerId = null;
let secondsLeft = 0;
let locked = false;

const records = JSON.parse(localStorage.getItem("juegamente-records") || "{}");
const saveRecord = () => {
  const previous = Number(records[currentGame] || 0);
  if (score > previous) records[currentGame] = score;
  localStorage.setItem("juegamente-records", JSON.stringify(records));
  updateScore();
};
function updateScore() {
  scoreLabel.textContent = "Puntos: " + score;
  recordLabel.textContent = "Récord: " + Number(records[currentGame] || 0);
}
function addPoints(value) {
  score += value;
  updateScore();
}
function stopTimer() {
  if (timerId) clearInterval(timerId);
  timerId = null;
}
function startTimer(seconds, onEnd) {
  stopTimer();
  secondsLeft = seconds;
  const timer = document.querySelector("#game-timer");
  if (timer) timer.textContent = secondsLeft + " s";
  timerId = setInterval(() => {
    secondsLeft -= 1;
    const current = document.querySelector("#game-timer");
    if (current) current.textContent = secondsLeft + " s";
    if (secondsLeft <= 0) {
      stopTimer();
      onEnd();
    }
  }, 1000);
}
function showResult(message, extra = "") {
  stopTimer();
  saveRecord();
  gameContent.innerHTML = '<div class="game-result"><div class="result-icon">✦</div><h3>' + message + '</h3><p>Has conseguido <strong>' + score + ' puntos</strong>.</p><p>' + extra + '</p><button class="button button-primary" id="play-again" type="button">Volver a jugar ↻</button></div>';
  document.querySelector("#play-again").addEventListener("click", () => launchGame(currentGame));
}
function openGame(id) {
  currentGame = id;
  score = 0;
  locked = false;
  stopTimer();
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("game-open");
  updateScore();
  const launchers = {
    memory: memoryGame,
    math: mathGame,
    trivia: triviaGame,
    logic: logicGame,
    daily: dailyGame,
    arcade: arcadeGame,
    strategy: strategyGame,
    survival: survivalGame
  };
  (launchers[id] || logicGame)();
}
function launchGame(id) {
  openGame(id);
}
function closeGame() {
  stopTimer();
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("game-open");
}
document.querySelectorAll("[data-game]").forEach(link => {
  link.addEventListener("click", event => {
    event.preventDefault();
    openGame(link.dataset.game);
  });
});
document.querySelector(".game-close").addEventListener("click", closeGame);
modal.addEventListener("click", event => { if (event.target === modal) closeGame(); });
document.addEventListener("keydown", event => { if (event.key === "Escape" && modal.classList.contains("is-open")) closeGame(); });

function setGame(name, description, content) {
  gameTitle.textContent = name;
  gameDescription.textContent = description;
  gameContent.innerHTML = content;
  updateScore();
}
function memoryGame() {
  setGame("Memoria relámpago", "Encuentra las parejas. Cada acierto suma 10 puntos.", '<div class="game-meta"><span>Movimientos: <b id="moves">0</b></span><span>Tiempo: <b id="game-timer">45 s</b></span></div><div class="memory-grid" id="memory-grid"></div><p class="game-hint">Voltea dos cartas por turno. ¡Encuentra las seis parejas!</p>');
  const symbols = ["🍒","🚀","🎮","⭐","🍀","💎"];
  const deck = [...symbols, ...symbols].sort(() => Math.random() - .5);
  const grid = document.querySelector("#memory-grid");
  let first = null, moves = 0, matched = 0;
  deck.forEach((symbol, index) => {
    const card = document.createElement("button");
    card.type = "button"; card.className = "memory-card"; card.textContent = "?";
    card.setAttribute("aria-label", "Carta " + (index + 1) + " oculta");
    card.addEventListener("click", () => {
      if (locked || card.classList.contains("flipped") || card.classList.contains("matched")) return;
      card.textContent = symbol; card.classList.add("flipped");
      if (!first) { first = {card, symbol}; return; }
      moves++; document.querySelector("#moves").textContent = moves;
      if (first.symbol === symbol) {
        first.card.classList.add("matched"); card.classList.add("matched");
        first = null; matched++; addPoints(10);
        if (matched === symbols.length) showResult("¡Memoria perfecta!", "Has encontrado todas las parejas en " + moves + " movimientos.");
      } else {
        locked = true; const previous = first.card; first = null;
        setTimeout(() => { previous.textContent = "?"; card.textContent = "?"; previous.classList.remove("flipped"); card.classList.remove("flipped"); locked = false; }, 700);
      }
    });
    grid.appendChild(card);
  });
  startTimer(45, () => showResult("¡Se acabó el tiempo!", "Vuelve a intentarlo para superar tu récord."));
}
const mathQuestions = [
  {q:"12 × 3 − 8",a:28,opts:[28,32,36]},
  {q:"144 ÷ 12 + 7",a:19,opts:[17,19,21]},
  {q:"25% de 80",a:20,opts:[15,20,25]},
  {q:"(9 + 3) × 4",a:48,opts:[36,42,48]},
  {q:"81 ÷ 9 + 16",a:25,opts:[24,25,26]},
  {q:"7² − 13",a:36,opts:[34,36,38]}
];
function quizGame(title, description, questions, time = 40) {
  let index = 0;
  setGame(title, description, '<div class="game-meta"><span>Pregunta <b id="question-number">1</b>/' + questions.length + '</span><span>Tiempo: <b id="game-timer">' + time + ' s</b></span></div><div class="quiz-question" id="question-text"></div><div class="quiz-options" id="quiz-options"></div><p class="game-hint" id="quiz-feedback" aria-live="polite"></p>');
  const render = () => {
    if (index >= questions.length) { showResult("¡Desafío completado!", "Respuestas correctas: " + (score / 10) + " de " + questions.length + "."); return; }
    const q = questions[index];
    document.querySelector("#question-number").textContent = index + 1;
    document.querySelector("#question-text").textContent = q.q;
    const options = document.querySelector("#quiz-options"); options.innerHTML = "";
    q.opts.forEach(option => {
      const button = document.createElement("button"); button.type = "button"; button.className = "quiz-option"; button.textContent = option;
      button.addEventListener("click", () => {
        if (locked) return; locked = true;
        if (option === q.a) { addPoints(10); document.querySelector("#quiz-feedback").textContent = "¡Correcto! +10 puntos"; }
        else document.querySelector("#quiz-feedback").textContent = "No era esa. La respuesta correcta es " + q.a + ".";
        setTimeout(() => { locked = false; index++; render(); }, 650);
      });
      options.appendChild(button);
    });
  };
  render();
  startTimer(time, () => showResult("¡Tiempo terminado!", "Completaste " + index + " de " + questions.length + " preguntas."));
}
function mathGame() {
  const qs = [...mathQuestions].sort(() => Math.random() - .5);
  quizGame("Cálculo mental", "Resuelve las operaciones antes de que termine el tiempo. Cada acierto vale 10 puntos.", qs, 40);
}
const triviaQuestions = [
  {q:"¿Cuál es el planeta más grande del sistema solar?",a:"Júpiter",opts:["Marte","Júpiter","Saturno"]},
  {q:"¿Cuántos lados tiene un hexágono?",a:"6",opts:["5","6","8"]},
  {q:"¿En qué continente está Japón?",a:"Asia",opts:["Europa","Asia","Oceanía"]},
  {q:"¿Qué gas absorben principalmente las plantas?",a:"Dióxido de carbono",opts:["Oxígeno","Nitrógeno","Dióxido de carbono"]},
  {q:"¿Cuál es el océano más extenso?",a:"Pacífico",opts:["Atlántico","Índico","Pacífico"]},
  {q:"¿Cuántos minutos tiene una hora y media?",a:"90",opts:["80","90","100"]}
];
function triviaGame() { quizGame("Trivia relámpago", "Seis preguntas de cultura general. Cada respuesta correcta suma 10 puntos.", triviaQuestions, 45); }
const riddles = [
  {q:"Tengo agujas y no sé coser; tengo números y no sé leer. ¿Qué soy?",a:["reloj","un reloj"]},
  {q:"Cuanto más quitas, más grande se vuelve. ¿Qué es?",a:["agujero","un agujero"]},
  {q:"Tiene ciudades, pero no casas; montañas, pero no árboles; agua, pero no peces. ¿Qué es?",a:["mapa","un mapa"]}
];
function logicGame() {
  let index = 0;
  setGame("Acertijos de ingenio", "Lee con atención y escribe tu respuesta. Cada solución correcta suma 20 puntos.", '<div class="game-meta"><span>Acertijo <b id="question-number">1</b>/3</span><span>Tiempo: <b id="game-timer">60 s</b></span></div><div class="quiz-question" id="question-text"></div><form id="riddle-form" class="answer-form"><input id="riddle-answer" autocomplete="off" placeholder="Escribe tu respuesta" required><button class="button button-primary" type="submit">Responder</button></form><p class="game-hint" id="riddle-feedback" aria-live="polite"></p>');
  const render = () => {
    if (index >= riddles.length) { showResult("¡Mente brillante!", "Has terminado los tres acertijos."); return; }
    document.querySelector("#question-number").textContent = index + 1;
    document.querySelector("#question-text").textContent = riddles[index].q;
    document.querySelector("#riddle-answer").value = "";
    document.querySelector("#riddle-answer").focus();
  };
  document.querySelector("#riddle-form").addEventListener("submit", event => {
    event.preventDefault(); const answer = document.querySelector("#riddle-answer").value.trim().toLowerCase();
    if (riddles[index].a.includes(answer)) { addPoints(20); document.querySelector("#riddle-feedback").textContent = "¡Exacto! +20 puntos"; }
    else document.querySelector("#riddle-feedback").textContent = "La respuesta era: " + riddles[index].a[0] + ".";
    setTimeout(() => { index++; render(); }, 900);
  });
  render(); startTimer(60, () => showResult("¡Tiempo terminado!", "Resueltos: " + index + " de 3 acertijos."));
}
function dailyGame() { logicGame(); gameTitle.textContent = "Reto diario de ingenio"; }
function arcadeGame() {
  setGame("Reflejos arcade", "Pulsa el objetivo tantas veces como puedas en 15 segundos. Cada toque suma 1 punto.", '<div class="game-meta"><span>Toques: <b id="tap-count">0</b></span><span>Tiempo: <b id="game-timer">15 s</b></span></div><div class="tap-arena" id="tap-arena"><button class="tap-target" id="tap-target" type="button">¡TOCA!</button></div><p class="game-hint">¡Ojo! El objetivo cambia de posición.</p>');
  const arena = document.querySelector("#tap-arena"), target = document.querySelector("#tap-target");
  target.addEventListener("click", () => {
    addPoints(1); document.querySelector("#tap-count").textContent = score;
    target.style.left = (5 + Math.random() * 75) + "%"; target.style.top = (5 + Math.random() * 70) + "%";
  });
  startTimer(15, () => showResult("¡Buen reflejo!", "Has acertado " + score + " veces."));
}
function strategyGame() {
  const secret = Math.floor(Math.random() * 20) + 1; let attempts = 5;
  setGame("Estrategia: número secreto", "Descubre el número entre 1 y 20. Tienes cinco intentos; cada intento te dará una pista.", '<div class="game-meta"><span>Intentos restantes: <b id="attempts">5</b></span><span>Premio: 30 puntos</span></div><form id="number-form" class="answer-form"><input id="number-answer" type="number" min="1" max="20" placeholder="1 al 20" required><button class="button button-primary" type="submit">Probar</button></form><p class="game-hint" id="number-feedback" aria-live="polite">Elige tu primera jugada.</p>');
  document.querySelector("#number-form").addEventListener("submit", event => {
    event.preventDefault(); const value = Number(document.querySelector("#number-answer").value); attempts--;
    document.querySelector("#attempts").textContent = attempts;
    if (value === secret) { addPoints(30); showResult("¡Gran estrategia!", "Descubriste el número secreto."); }
    else if (attempts <= 0) showResult("Partida terminada", "El número secreto era " + secret + ".");
    else document.querySelector("#number-feedback").textContent = value < secret ? "El número secreto es MAYOR." : "El número secreto es MENOR.";
    document.querySelector("#number-answer").value = "";
  });
}
function survivalGame() {
  let health = 3, food = 0, day = 1;
  setGame("Supervivencia: isla", "Sobrevive tomando decisiones. Cada día debes elegir una acción.", '<div class="survival-status"><span>❤️ Vida: <b id="health">3</b></span><span>🍎 Comida: <b id="food">0</b></span><span>☀️ Día: <b id="day">1</b></span></div><p class="quiz-question">Despiertas en una isla. ¿Qué haces primero?</p><div class="survival-actions"><button class="quiz-option" data-action="food">Buscar comida</button><button class="quiz-option" data-action="wood">Recolectar madera</button><button class="quiz-option" data-action="rest">Descansar</button></div><p class="game-hint" id="survival-log" aria-live="polite">Cada decisión afecta tu supervivencia.</p>');
  document.querySelectorAll("[data-action]").forEach(button => button.addEventListener("click", () => {
    const action = button.dataset.action; day++;
    if (action === "food") { food++; document.querySelector("#survival-log").textContent = "Encontraste comida. ¡Buena decisión!"; }
    if (action === "wood") { document.querySelector("#survival-log").textContent = "Conseguiste madera para tu refugio."; addPoints(5); }
    if (action === "rest") { health = Math.min(3, health + 1); document.querySelector("#survival-log").textContent = "Recuperaste fuerzas."; }
    if (day % 2 === 0 && food > 0) food--;
    else if (day % 2 === 0) health--;
    document.querySelector("#health").textContent = health; document.querySelector("#food").textContent = food; document.querySelector("#day").textContent = day;
    if (health <= 0) { showResult("La isla te venció", "Sobreviviste " + (day - 1) + " días."); return; }
    if (day >= 7) { addPoints(30); showResult("¡Resististe seis días!", "Has demostrado ser un gran superviviente."); }
  }));
}
