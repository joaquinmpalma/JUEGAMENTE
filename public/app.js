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


/* JUEGAMENTE 0.3 — category hubs, language games and progressive mathematics */
const categoryHubs = {
  logic: {title:"Acertijos y lógica",tag:"LABORATORIO DEL LENGUAJE",intro:"Descifra, interpreta, relaciona y juega con las palabras.",items:[
    ["riddle","Acertijos clásicos","Enigmas y deducción","◇"],
    ["anagram","Anagramas","Reordena letras y descubre palabras","↔"],
    ["cryptogram","Criptogramas","Descifra mensajes secretos","⌁"],
    ["oddword","Palabra intrusa","Encuentra el término que no encaja","!"],
    ["analogy","Analogías verbales","Descubre relaciones entre conceptos","≈"],
    ["spelling","Detective ortográfico","Encuentra el error escondido","✎"],
    ["hiddenword","Palabra oculta","Completa la palabra a partir de pistas","▦"],
    ["reading","Comprensión lectora","Lee con atención y deduce","▤"],
    ["palindrome","Palíndromos","Reconoce palabras y frases capicúa","↔"],
    ["wordchain","Cadena de palabras","Continúa una cadena usando la última sílaba","⛓"]
  ]},
  math:{title:"Matemáticas y cálculo",tag:"GIMNASIO MATEMÁTICO",intro:"Avanza desde las operaciones básicas hasta el cálculo universitario.",items:[
    ["level:0","Nivel 1 · Primeros pasos","Sumas y restas sencillas","＋"],
    ["level:1","Nivel 2 · Aritmética","Multiplicación, división y operaciones","×"],
    ["level:2","Nivel 3 · Fracciones y porcentajes","Proporciones, decimales y porcentajes","¼"],
    ["level:3","Nivel 4 · Álgebra","Expresiones y ecuaciones","x"],
    ["level:4","Nivel 5 · Potencias y raíces","Exponentes, radicales y propiedades","√"],
    ["level:5","Nivel 6 · Funciones y logaritmos","Funciones, exponenciales y logaritmos","log"],
    ["level:6","Nivel 7 · Trigonometría","Seno, coseno y tangente","∠"],
    ["level:7","Nivel 8 · Cálculo","Límites, derivadas e integrales","∫"]
  ]},
  memory:{title:"Memoria y concentración",tag:"ENTRENA TU MENTE",intro:"Recuerda patrones, secuencias y detalles.",items:[
    ["memory","Memoria de parejas","Encuentra todas las parejas","▦"],
    ["sequence","Secuencia relámpago","Memoriza y repite la secuencia","◉"],
    ["numbermemory","Memoria numérica","Recuerda una serie de números","123"]
  ]},
  trivia:{title:"Trivia y cultura general",tag:"PON A PRUEBA LO QUE SABES",intro:"Conocimiento, curiosidades y preguntas de distintas áreas.",items:[
    ["trivia","Trivia mixta","Preguntas variadas","✦"],
    ["science","Ciencia y naturaleza","Descubre el mundo natural","⚛"],
    ["geography","Geografía","Países, capitales y lugares","◎"],
    ["history","Historia","Civilizaciones y acontecimientos","⌛"]
  ]},
  strategy:{title:"Juegos de estrategia",tag:"PIENSA ANTES DE MOVER",intro:"Planea, calcula riesgos y encuentra soluciones.",items:[
    ["strategy","Número secreto","Descubre el número con pistas","?"],
    ["pattern","Secuencia lógica","Encuentra la regla del patrón","⌁"],
    ["deduction","Deducción","Resuelve un caso con pistas","⌕"]
  ]},
  daily:{title:"Retos diarios y contrarreloj",tag:"UN NUEVO DESAFÍO",intro:"Pruebas cortas para superar tu propio récord.",items:[
    ["daily","Reto de ingenio","Un acertijo contra el reloj","◷"],
    ["dailywords","Palabra del día","Descubre la palabra secreta","Aa"],
    ["quickmath","Cálculo exprés","Resuelve operaciones en tiempo limitado","∑"]
  ]},
  arcade:{title:"Minijuegos de habilidad",tag:"ARCADE EN DESARROLLO",intro:"Estamos diseñando nuevas pruebas de reflejos y precisión.",items:[]},
  survival:{title:"Juegos de supervivencia",tag:"MODO SUPERVIVENCIA",intro:"Estamos preparando experiencias de supervivencia con decisiones, recursos y progresión.",items:[]}
};

const originalOpenGame = openGame;
openGame = function(id) {
  currentGame = id;
  score = 0;
  locked = false;
  stopTimer();
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden","false");
  document.body.classList.add("game-open");
  const hub = categoryHubs[id];
  if (hub) { renderCategoryHub(id); return; }
  if (id === "riddle") { logicGame(); return; }
  if (id === "anagram") { anagramGame(); return; }
  if (id === "cryptogram") { cryptogramGame(); return; }
  if (id === "oddword") { oddWordGame(); return; }
  if (id === "analogy") { analogyGame(); return; }
  if (id === "spelling") { spellingGame(); return; }
  if (id === "hiddenword") { hiddenWordGame(); return; }
  if (id === "reading") { readingGame(); return; }
  if (id === "palindrome") { palindromeGame(); return; }
  if (id === "wordchain") { wordChainGame(); return; }
  if (id.startsWith("level:")) { mathLevelGame(Number(id.split(":")[1])); return; }
  if (id === "sequence") { sequenceGame(); return; }
  if (id === "numbermemory") { numberMemoryGame(); return; }
  if (id === "science") { quizGame("Ciencia y naturaleza","Responde preguntas de ciencia.",scienceQuestions,50); return; }
  if (id === "geography") { quizGame("Geografía","Países, capitales y lugares.",geographyQuestions,50); return; }
  if (id === "history") { quizGame("Historia","Acontecimientos y civilizaciones.",historyQuestions,50); return; }
  if (id === "pattern") { patternGame(); return; }
  if (id === "deduction") { deductionGame(); return; }
  if (id === "dailywords") { dailyWordGame(); return; }
  if (id === "quickmath") { quickMathGame(); return; }
  originalOpenGame(id);
};

function renderCategoryHub(id) {
  const hub = categoryHubs[id];
  gameTitle.textContent = hub.title;
  gameDescription.textContent = hub.intro;
  updateScore();
  if (!hub.items.length) {
    gameContent.innerHTML = '<div class="hub-empty"><div class="hub-empty-icon">✦</div><h3>Estamos preparando esta categoría</h3><p>Queremos que tenga minijuegos completos, con mecánicas propias y progresión. Volverá a estar disponible en una próxima actualización.</p></div>';
    return;
  }
  const unlockedMath = Number(localStorage.getItem("juegamente-math-unlocked") || 0);
  gameContent.innerHTML = '<div class="hub-heading"><span>'+hub.tag+'</span><span>'+String(hub.items.length).padStart(2,"0")+' MODOS</span></div>'+(id==="math"?'<p class="math-unlock-note">Completa los niveles en orden para desbloquear el siguiente. Nivel disponible: '+(unlockedMath+1)+'/8.</p>':'')+'<div class="hub-grid">'+hub.items.map((item,index)=>{const lockedLevel=id==="math"&&Number(item[0].split(":")[1])>unlockedMath;return '<button type="button" class="hub-item '+(lockedLevel?'hub-item-locked':'')+'" data-hub-game="'+item[0]+'" '+(lockedLevel?'disabled':'')+'><span class="hub-item-icon">'+(lockedLevel?'🔒':item[3])+'</span><span class="hub-item-copy"><b>'+item[1]+'</b><small>'+item[2]+'</small></span><span class="hub-item-arrow">'+(lockedLevel?'Bloqueado':'↗')+'</span></button>';}).join("")+'</div><button type="button" class="hub-back" id="hub-back">← Volver al inicio</button>';
  gameContent.querySelectorAll("[data-hub-game]").forEach(button=>button.addEventListener("click",()=>openGame(button.dataset.hubGame)));
  document.querySelector("#hub-back").addEventListener("click",closeGame);
}

function finishSimpleGame(title,detail) { showResult(title,detail); }
function textAnswerForm(placeholder="Escribe tu respuesta") {
  return '<form class="answer-form" id="text-answer-form"><input id="text-answer" aria-label="Tu respuesta" autocomplete="off" placeholder="'+placeholder+'" required><button class="button button-primary" type="submit">Comprobar</button></form><p class="game-hint" id="text-feedback" aria-live="polite"></p>';
}
function normText(value) { return value.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,""); }

const wordChallenges = [
  {scramble:"ROSA",answer:"rosa",hint:"Flor de cuatro letras."},
  {scramble:"PERRO",answer:"perro",hint:"Animal doméstico."},
  {scramble:"LAPIZ",answer:"lapiz",hint:"Objeto para escribir."},
  {scramble:"NUBE",answer:"nube",hint:"Está en el cielo."},
  {scramble:"LIBRO",answer:"libro",hint:"Tiene páginas y se lee."},
  {scramble:"PLANETA",answer:"planeta",hint:"Cuerpo celeste que orbita una estrella."}
];
function anagramGame() {
  let index=0, correct=0;
  const list=[...wordChallenges].sort(()=>Math.random()-.5);
  setGame("Anagramas","Ordena las letras para formar la palabra correcta. Cada acierto suma 15 puntos.",'<div class="game-meta"><span>Palabra <b id="word-index">1</b>/6</span><span>Aciertos: <b id="word-correct">0</b></span></div><div class="word-scramble" id="scrambled-word"></div><p class="game-hint" id="word-hint"></p>'+textAnswerForm());
  const render=()=>{if(index>=list.length){finishSimpleGame("¡Buen vocabulario!", "Resolviste "+correct+" de 6 anagramas.");return;}document.querySelector("#word-index").textContent=index+1;let letters=list[index].answer.toUpperCase().split("");let shuffled=letters.join("");while(shuffled===list[index].answer.toUpperCase()&&letters.length>2){letters.sort(()=>Math.random()-.5);shuffled=letters.join("");}document.querySelector("#scrambled-word").textContent=shuffled.split("").join("  ");document.querySelector("#word-hint").textContent="Pista: "+list[index].hint;document.querySelector("#text-answer").value="";};
  document.querySelector("#text-answer-form").addEventListener("submit",e=>{e.preventDefault();const ok=normText(document.querySelector("#text-answer").value)===normText(list[index].answer);if(ok){correct++;addPoints(15);document.querySelector("#word-correct").textContent=correct;document.querySelector("#text-feedback").textContent="¡Correcto! +15 puntos";}else document.querySelector("#text-feedback").textContent="No es esa palabra. Inténtalo otra vez.";if(ok)setTimeout(()=>{index++;render();},650);});
  render();
}
const cryptoChallenges=[
  {cipher:"MB DBTB FTUB FO FM CPTRVF",answer:"la casa esta en el bosque",hint:"Cada letra se ha desplazado una posición hacia adelante en el alfabeto."},
  {cipher:"IPMB NV OEP",answer:"hola mundo",hint:"Desplazamiento César: retrocede una letra para descifrar."},
  {cipher:"FM UJFNQP FT PS P",answer:"el tiempo es oro",hint:"Cada letra está desplazada una posición."}
];
function cryptogramGame(){
  let i=0;
  setGame("Criptogramas","Descifra el mensaje. Observa las pistas y escribe la frase.",'<div class="game-meta"><span>Mensaje <b id="crypto-index">1</b>/3</span><span>Premio: 20 puntos</span></div><div class="cipher-text" id="cipher-text"></div><p class="game-hint" id="cipher-hint"></p>'+textAnswerForm("Escribe el mensaje descifrado"));
  const render=()=>{if(i>=cryptoChallenges.length){finishSimpleGame("¡Mensaje descifrado!","Completaste los tres criptogramas.");return;}document.querySelector("#crypto-index").textContent=i+1;document.querySelector("#cipher-text").textContent=cryptoChallenges[i].cipher;document.querySelector("#cipher-hint").textContent=cryptoChallenges[i].hint;document.querySelector("#text-answer").value="";};
  document.querySelector("#text-answer-form").addEventListener("submit",e=>{e.preventDefault();if(normText(document.querySelector("#text-answer").value)===normText(cryptoChallenges[i].answer)){addPoints(20);document.querySelector("#text-feedback").textContent="¡Descifrado!";setTimeout(()=>{i++;render();},700);}else document.querySelector("#text-feedback").textContent="Todavía no. Revisa la pista.";});
  render();
}
const oddChallenges=[
  {q:"Manzana · Pera · Zanahoria · Plátano",a:"zanahoria",why:"La zanahoria es una hortaliza; las demás son frutas."},
  {q:"Triángulo · Cuadrado · Círculo · Kilogramo",a:"kilogramo",why:"Kilogramo es una unidad de masa; los demás son figuras geométricas."},
  {q:"Rojo · Azul · Verde · Martes",a:"martes",why:"Martes es un día de la semana; los demás son colores."}
];
function oddWordGame(){let i=0;setGame("Palabra intrusa","Encuentra el elemento que no pertenece al grupo.",'<div class="game-meta"><span>Ronda <b id="odd-index">1</b>/3</span><span>20 puntos por acierto</span></div><div class="quiz-question" id="odd-question"></div>'+textAnswerForm("¿Cuál es la palabra intrusa?"));const render=()=>{if(i>=oddChallenges.length){finishSimpleGame("¡Buena clasificación!","Completaste las tres rondas.");return;}document.querySelector("#odd-index").textContent=i+1;document.querySelector("#odd-question").textContent=oddChallenges[i].q;document.querySelector("#text-answer").value="";};document.querySelector("#text-answer-form").addEventListener("submit",e=>{e.preventDefault();if(normText(document.querySelector("#text-answer").value)===normText(oddChallenges[i].a)){addPoints(20);document.querySelector("#text-feedback").textContent=oddChallenges[i].why;setTimeout(()=>{i++;render();},1200);}else document.querySelector("#text-feedback").textContent="No es esa. Busca qué característica comparten las otras.";});render();}
const analogyChallenges=[
  {q:"Libro es a leer como tenedor es a…",a:"comer",opts:["cocinar","comer","cortar"]},
  {q:"Pájaro es a nido como abeja es a…",a:"colmena",opts:["cueva","colmena","madriguera"]},
  {q:"Termómetro es a temperatura como balanza es a…",a:"peso",opts:["altura","peso","tiempo"]},
  {q:"Semilla es a árbol como huevo es a…",a:"ave",opts:["nido","ave","pluma"]}
];
function analogyGame(){quizGame("Analogías verbales","Elige la relación que completa cada analogía.",analogyChallenges,70);}
const scienceQuestions=[
{q:"¿Qué órgano bombea la sangre?",a:"Corazón",opts:["Pulmón","Corazón","Hígado"]},
{q:"¿Cuál es el símbolo químico del oro?",a:"Au",opts:["Ag","Au","Fe"]},
{q:"¿Qué fuerza nos mantiene sobre la Tierra?",a:"Gravedad",opts:["Fricción","Magnetismo","Gravedad"]},
{q:"¿Qué parte de la célula contiene gran parte del ADN?",a:"Núcleo",opts:["Membrana","Núcleo","Citoplasma"]}
];
const geographyQuestions=[
{q:"¿Cuál es la capital de Japón?",a:"Tokio",opts:["Kioto","Tokio","Osaka"]},
{q:"¿En qué continente está Egipto?",a:"África",opts:["Asia","África","Europa"]},
{q:"¿Cuál es el río más caudaloso del mundo?",a:"Amazonas",opts:["Nilo","Amazonas","Yangtsé"]},
{q:"¿Qué país tiene forma de bota?",a:"Italia",opts:["Grecia","Italia","Portugal"]}
];
const historyQuestions=[
{q:"¿En qué año llegó Cristóbal Colón a América?",a:"1492",opts:["1492","1510","1453"]},
{q:"¿Qué civilización construyó Machu Picchu?",a:"Inca",opts:["Maya","Azteca","Inca"]},
{q:"¿En qué país comenzó la Revolución Industrial?",a:"Reino Unido",opts:["Francia","Reino Unido","Alemania"]},
{q:"¿Quién fue el primer emperador romano?",a:"Augusto",opts:["Julio César","Augusto","Nerón"]}
];
function spellingGame(){const questions=[{q:"¿Cuál está escrita correctamente?",a:"Excepción",opts:["Exepción","Excepción","Ecepción"]},{q:"¿Cuál está escrita correctamente?",a:"Hervir",opts:["Herbir","Ervir","Hervir"]},{q:"¿Cuál está escrita correctamente?",a:"Conciencia",opts:["Conciencia","Conciensia","Concensia"]}];quizGame("Detective ortográfico","Identifica la palabra correctamente escrita.",questions,60);}
function hiddenWordGame(){const qs=[{q:"Animal que ladra y suele vivir con las personas.",a:"perro"},{q:"Estación del año que viene después del invierno.",a:"primavera"},{q:"Instrumento que indica la hora.",a:"reloj"}];let i=0;setGame("Palabra oculta","Lee la definición y descubre la palabra.",'<div class="game-meta"><span>Pista <b id="hidden-index">1</b>/3</span><span>15 puntos por acierto</span></div><div class="quiz-question" id="hidden-clue"></div>'+textAnswerForm());const render=()=>{if(i>=qs.length){finishSimpleGame("¡Palabras encontradas!","Terminaste las tres pistas.");return;}document.querySelector("#hidden-index").textContent=i+1;document.querySelector("#hidden-clue").textContent=qs[i].q;document.querySelector("#text-answer").value="";};document.querySelector("#text-answer-form").addEventListener("submit",e=>{e.preventDefault();if(normText(document.querySelector("#text-answer").value)===normText(qs[i].a)){addPoints(15);document.querySelector("#text-feedback").textContent="¡Encontrada!";setTimeout(()=>{i++;render();},600);}else document.querySelector("#text-feedback").textContent="Prueba con otra palabra.";});render();}
function readingGame(){const q=[{text:"En una pequeña ciudad, la biblioteca abrió sus puertas antes del amanecer. Clara llegó temprano porque quería terminar una investigación. Aunque encontró la sala cerrada, el bibliotecario le permitió trabajar en el patio, donde la luz era suficiente y el silencio la ayudó a concentrarse.",question:"¿Por qué Clara llegó temprano?",a:"Quería terminar una investigación",opts:["Quería encontrarse con el bibliotecario","Quería terminar una investigación","La biblioteca cerraba al amanecer"]},{text:"Durante meses, el equipo estudió el comportamiento de las aves. Descubrieron que algunas modificaban sus rutas cuando escaseaba el alimento. El hallazgo mostró que el entorno influía directamente en sus decisiones.",question:"¿Qué provocaba cambios en las rutas de algunas aves?",a:"La escasez de alimento",opts:["La temperatura del agua","La escasez de alimento","La presencia de edificios"]}];let i=0;setGame("Comprensión lectora","Lee el fragmento y responde a partir de la información disponible.",'<div class="reading-passage" id="reading-passage"></div><div class="quiz-question" id="reading-question"></div><div class="quiz-options" id="reading-options"></div><p class="game-hint" id="reading-feedback"></p>');const render=()=>{if(i>=q.length){finishSimpleGame("¡Lectura completada!","Respondiste las preguntas de comprensión.");return;}document.querySelector("#reading-passage").textContent=q[i].text;document.querySelector("#reading-question").textContent=q[i].question;const box=document.querySelector("#reading-options");box.innerHTML="";q[i].opts.forEach(option=>{const b=document.createElement("button");b.className="quiz-option";b.textContent=option;b.addEventListener("click",()=>{if(option===q[i].a){addPoints(20);document.querySelector("#reading-feedback").textContent="Correcto: interpretaste el texto."; }else document.querySelector("#reading-feedback").textContent="Esa información no corresponde al texto.";setTimeout(()=>{i++;render();},900);});box.appendChild(b);});};render();}
function sequenceGame(){const seq=[2,5,1,8,4,7];let step=0;setGame("Secuencia relámpago","Memoriza la secuencia y repítela en el mismo orden.",'<div class="sequence-display" id="sequence-display">Prepárate…</div><div class="sequence-inputs" id="sequence-inputs"></div><button class="button button-primary" id="sequence-start" type="button">Mostrar secuencia</button><p class="game-hint" id="sequence-feedback"></p>');const display=document.querySelector("#sequence-display");document.querySelector("#sequence-start").addEventListener("click",()=>{step=0;display.textContent=seq.join(" · ");document.querySelector("#sequence-inputs").innerHTML="";setTimeout(()=>{display.textContent="¿Cuál era la secuencia?";const box=document.querySelector("#sequence-inputs");seq.forEach((_,i)=>{const input=document.createElement("input");input.type="number";input.min=0;input.max=9;input.setAttribute("aria-label","Número "+(i+1));box.appendChild(input);});const b=document.createElement("button");b.className="button button-primary";b.textContent="Comprobar";b.addEventListener("click",()=>{const values=[...box.querySelectorAll("input")].map(x=>Number(x.value));if(values.every((v,i)=>v===seq[i])){addPoints(30);finishSimpleGame("¡Memoria extraordinaria!","Repetiste correctamente los seis números.");}else document.querySelector("#sequence-feedback").textContent="No coincide. Vuelve a observar la secuencia.";});gameContent.appendChild(b);},2500);});}
function numberMemoryGame(){const n=String(Math.floor(100000+Math.random()*899999));setGame("Memoria numérica","Memoriza el número que aparecerá durante unos segundos.",'<div class="sequence-display" id="number-display">'+n+'</div><p class="game-hint">Memoriza el número. Se ocultará en 3 segundos.</p>'+textAnswerForm("Escribe el número que viste"));setTimeout(()=>{const d=document.querySelector("#number-display");if(d)d.textContent="● ● ● ● ● ●";},3000);document.querySelector("#text-answer-form").addEventListener("submit",e=>{e.preventDefault();if(document.querySelector("#text-answer").value.trim()===n){addPoints(25);finishSimpleGame("¡Buena memoria!","Recordaste todos los dígitos.");}else document.querySelector("#text-feedback").textContent="El número no coincide. Inténtalo de nuevo.";});}
function patternGame(){const rounds=[{q:"2 · 4 · 6 · 8 · ?",a:"10"},{q:"3 · 6 · 12 · 24 · ?",a:"48"},{q:"1 · 1 · 2 · 3 · 5 · ?",a:"8"}];let i=0;setGame("Secuencia lógica","Encuentra la regla y escribe el siguiente número.",'<div class="game-meta"><span>Patrón <b id="pattern-index">1</b>/3</span></div><div class="sequence-display" id="pattern-question"></div>'+textAnswerForm("Siguiente número"));const render=()=>{if(i>=rounds.length){finishSimpleGame("¡Patrones dominados!","Completaste las tres secuencias.");return;}document.querySelector("#pattern-index").textContent=i+1;document.querySelector("#pattern-question").textContent=rounds[i].q;document.querySelector("#text-answer").value="";};document.querySelector("#text-answer-form").addEventListener("submit",e=>{e.preventDefault();if(document.querySelector("#text-answer").value.trim()===rounds[i].a){addPoints(20);i++;render();}else document.querySelector("#text-feedback").textContent="Revisa la regla de la secuencia.";});render();}
function deductionGame(){const qs=[{q:"Ana llegó antes que Bruno. Carla llegó después de Bruno. ¿Quién llegó primero?",a:"ana",opts:["Ana","Bruno","Carla"]},{q:"Todos los zarpes son azules. Este objeto es un zarpe. ¿De qué color es?",a:"azul",opts:["Rojo","Azul","Verde"]}];let i=0;setGame("Deducción","Resuelve situaciones usando únicamente las pistas.",'<div class="quiz-question" id="deduction-question"></div><div class="quiz-options" id="deduction-options"></div><p class="game-hint" id="deduction-feedback"></p>');const render=()=>{if(i>=qs.length){finishSimpleGame("¡Caso resuelto!","Completaste las deducciones.");return;}document.querySelector("#deduction-question").textContent=qs[i].q;const box=document.querySelector("#deduction-options");box.innerHTML="";qs[i].opts.forEach(o=>{const b=document.createElement("button");b.className="quiz-option";b.textContent=o;b.addEventListener("click",()=>{if(normText(o)===qs[i].a){addPoints(20);i++;render();}else document.querySelector("#deduction-feedback").textContent="No se deduce de las pistas.";});box.appendChild(b);});};render();}
function dailyWordGame(){anagramGame();gameTitle.textContent="Palabra del día";}
function quickMathGame(){const qs=Array.from({length:8},()=>{const a=Math.floor(Math.random()*20)+1,b=Math.floor(Math.random()*20)+1;return {q:a+" + "+b,a:a+b,opts:[a+b,a+b+2,Math.max(0,a+b-3)]};});quizGame("Cálculo exprés","Ocho operaciones rápidas. Cada acierto suma 10 puntos.",qs,35);}

const mathLevels=[
{title:"Primeros pasos",desc:"Sumas y restas sencillas.",questions:[{q:"5 + 4",a:"9",ex:"5 + 4 = 9"},{q:"12 − 7",a:"5",ex:"12 − 7 = 5"},{q:"8 + 6",a:"14",ex:"8 + 6 = 14"}]},
{title:"Aritmética",desc:"Multiplicación, división y operaciones combinadas.",questions:[{q:"7 × 8",a:"56",ex:"7 × 8 = 56"},{q:"48 ÷ 6 + 7",a:"15",ex:"48 ÷ 6 = 8; 8 + 7 = 15"},{q:"(15 − 3) × 4",a:"48",ex:"Primero paréntesis: 12 × 4 = 48"}]},
{title:"Fracciones y porcentajes",desc:"Decimales, fracciones, razones y porcentajes.",questions:[{q:"¿Cuánto es el 25% de 80?",a:"20",ex:"0,25 × 80 = 20"},{q:"1/2 + 1/4 (responde en decimal)",a:"0.75",ex:"0,5 + 0,25 = 0,75"},{q:"Si 3 cuadernos cuestan $6, ¿cuánto cuestan 5?",a:"10",ex:"Cada cuaderno cuesta $2; 5 × 2 = $10"}]},
{title:"Álgebra",desc:"Expresiones, ecuaciones y despeje de incógnitas.",questions:[{q:"Resuelve: 3x + 5 = 20. ¿Cuánto vale x?",a:"5",ex:"3x = 20 − 5 = 15; x = 5"},{q:"Resuelve: 2x − 7 = 9. ¿Cuánto vale x?",a:"8",ex:"2x = 16; x = 8"},{q:"Si y = 2x + 1, calcula y cuando x = 4.",a:"9",ex:"y = 2(4) + 1 = 9"}]},
{title:"Potencias y raíces",desc:"Exponentes, radicales y propiedades.",questions:[{q:"Calcula 3² + √16",a:"13",ex:"9 + 4 = 13"},{q:"¿Cuál es la raíz cuadrada positiva de 144?",a:"12",ex:"12 × 12 = 144"},{q:"Calcula 2³ × 3²",a:"72",ex:"8 × 9 = 72"}]},
{title:"Funciones y logaritmos",desc:"Funciones exponenciales y logaritmos.",questions:[{q:"Calcula log₂(32)",a:"5",ex:"2⁵ = 32, por eso log₂(32) = 5."},{q:"Calcula log₁₀(1000)",a:"3",ex:"10³ = 1000."},{q:"Si f(x) = x² − 1, calcula f(5).",a:"24",ex:"5² − 1 = 24."}]},
{title:"Trigonometría",desc:"Razones trigonométricas en ángulos notables.",questions:[{q:"sen(30°)",a:"0.5",ex:"sen(30°) = 1/2 = 0,5."},{q:"cos(60°)",a:"0.5",ex:"cos(60°) = 1/2 = 0,5."},{q:"tan(45°)",a:"1",ex:"tan(45°) = 1."}]},
{title:"Cálculo",desc:"Límites, derivadas e integrales elementales.",questions:[{q:"Deriva f(x) = x². ¿Cuál es f'(x) en x = 3?",a:"6",ex:"f'(x) = 2x; f'(3) = 6."},{q:"Calcula el límite de (x² − 1)/(x − 1) cuando x tiende a 1.",a:"2",ex:"Factoriza: (x−1)(x+1)/(x−1) = x+1; el límite es 2."},{q:"Calcula la integral definida de 2x entre 0 y 2.",a:"4",ex:"La primitiva es x²; 2² − 0² = 4."}]}
];
function mathLevelGame(level){
  const data=mathLevels[level];let index=0,correct=0;
  const questions=[...data.questions].sort(()=>Math.random()-.5);
  setGame("Matemáticas · "+data.title,data.desc+' Cada ejercicio correcto suma 20 puntos.', '<div class="math-progress"><span>Nivel '+(level+1)+' de 8</span><span>Ejercicio <b id="math-index">1</b>/'+questions.length+'</span></div><div class="math-question" id="math-question"></div><div class="math-workspace"><div class="math-input-area"><label for="math-answer">Tu respuesta matemática</label><math-field id="math-answer" virtual-keyboard-mode="manual" smart-fence></math-field><div class="math-symbol-row"><button type="button" data-insert="\\frac{#@}{#?}">a/b</button><button type="button" data-insert="^{#?}">x²</button><button type="button" data-insert="\\sqrt{#0}">√</button><button type="button" data-insert="\\pi">π</button><button type="button" data-insert="\\log\\left(#0\\right)">log</button><button type="button" data-insert="\\sin\\left(#0\\right)">sen</button><button type="button" data-insert="\\cdot">·</button><button type="button" data-insert="\\le">≤</button><button type="button" data-insert="\\infty">∞</button></div><div class="math-actions"><button type="button" class="math-keyboard" id="show-math-keyboard">⌨ Teclado matemático</button><button type="button" class="math-check" id="check-math">Comprobar respuesta</button></div><p class="game-hint" id="math-feedback" aria-live="polite"></p></div><div class="math-board-area"><div class="board-heading"><b>Mi pizarra</b><button type="button" id="clear-board">Limpiar</button></div><canvas id="math-board" aria-label="Pizarra para desarrollar el ejercicio"></canvas><small>Escribe o dibuja con el mouse, lápiz o dedo.</small></div></div><div class="math-explanation" id="math-explanation" hidden></div><div class="math-level-footer"><button type="button" class="hub-back" id="math-level-back">← Niveles</button><span>Tu progreso se guarda en este dispositivo.</span></div>');
  const field=document.querySelector("#math-answer");
  const feedback=document.querySelector("#math-feedback");
  const render=()=>{if(index>=questions.length){if(correct>=2){const next=Math.min(7,level+1);localStorage.setItem("juegamente-math-unlocked",String(Math.max(Number(localStorage.getItem("juegamente-math-unlocked")||0),next)));}showResult("¡Nivel completado!", "Respuestas correctas: "+correct+" de "+questions.length+". "+(correct>=2&&level<7?"Has desbloqueado el siguiente nivel.":"Puedes volver a practicar para mejorar tu resultado."));const back=document.createElement("button");back.type="button";back.className="hub-back";back.textContent="← Volver a niveles";back.addEventListener("click",()=>renderCategoryHub("math"));gameContent.appendChild(back);return;}document.querySelector("#math-index").textContent=index+1;document.querySelector("#math-question").textContent=questions[index].q;field.value="";feedback.textContent="";document.querySelector("#math-explanation").hidden=true;};
  document.querySelectorAll("[data-insert]").forEach(button=>button.addEventListener("click",()=>{field.focus();field.executeCommand(["insert",button.dataset.insert]);}));
  document.querySelector("#show-math-keyboard").addEventListener("click",()=>{field.focus();if(window.mathVirtualKeyboard){window.mathVirtualKeyboard.layouts=["numeric","symbols","alphabetic","greek"];window.mathVirtualKeyboard.show();}});
  document.querySelector("#check-math").addEventListener("click",()=>{
    const raw=field.getValue("ascii-math").trim();
    const normalized=raw.replace(/\s/g,"").replace(/,/g,".").replace(/[{}]/g,"").toLowerCase();
    const expected=questions[index].a.replace(/\s/g,"").replace(/,/g,".").toLowerCase();
    const numeric=evaluateMathExpression(normalized);
    const numericExpected=Number(expected);
    const correctAnswer=normalized===expected || (numeric!==null && Number.isFinite(numericExpected) && Math.abs(numeric-numericExpected)<0.0001);
    if(correctAnswer){correct++;addPoints(20);feedback.textContent="¡Correcto! +20 puntos";feedback.className="math-feedback good";}else{feedback.textContent="Todavía no es correcto. Revisa tu desarrollo en la pizarra e inténtalo otra vez.";feedback.className="math-feedback bad";return;}
    const explanation=document.querySelector("#math-explanation");explanation.hidden=false;explanation.textContent="Desarrollo orientativo: "+questions[index].ex;
    setTimeout(()=>{index++;render();},1300);
  });
  document.querySelector("#math-level-back").addEventListener("click",()=>renderCategoryHub("math"));
  setupMathBoard();
  render();
}
function setupMathBoard(){
  const canvas=document.querySelector("#math-board");if(!canvas)return;
  const ctx=canvas.getContext("2d");const rect=canvas.getBoundingClientRect();const dpr=window.devicePixelRatio||1;
  canvas.width=Math.max(1,rect.width*dpr);canvas.height=Math.max(1,rect.height*dpr);ctx.scale(dpr,dpr);ctx.strokeStyle="#f2f3ff";ctx.lineWidth=2.3;ctx.lineCap="round";ctx.lineJoin="round";
  let drawing=false,last=null;
  const point=e=>{const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};};
  canvas.addEventListener("pointerdown",e=>{drawing=true;last=point(e);canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener("pointermove",e=>{if(!drawing)return;const p=point(e);ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();last=p;});
  const stop=()=>{drawing=false;last=null;};canvas.addEventListener("pointerup",stop);canvas.addEventListener("pointercancel",stop);
  document.querySelector("#clear-board").addEventListener("click",()=>ctx.clearRect(0,0,canvas.width,canvas.height));
}

function evaluateMathExpression(source){
  const text=source.replace(/\s/g,"").replace(/,/g,".");
  const tokens=text.match(/sqrt|√|\d+(?:\.\d+)?|[()+\-*/^]/gi);
  if(!tokens || tokens.join("")!==text)return null;
  let i=0;
  function primary(){
    const t=tokens[i++];
    if(t==="+")return primary();
    if(t==="-")return -primary();
    if(t==="√"||t.toLowerCase()==="sqrt"){if(tokens[i]==="("){i++;const v=expression();if(tokens[i++]!==")")throw 0;return Math.sqrt(v);}return Math.sqrt(primary());}
    if(t==="("){const v=expression();if(tokens[i++]!==")")throw 0;return v;}
    const n=Number(t);if(!Number.isFinite(n))throw 0;return n;
  }
  function power(){let v=primary();if(tokens[i]==="^"){i++;v=Math.pow(v,power());}return v;}
  function term(){let v=power();while(tokens[i]==="*"||tokens[i]==="/"){const op=tokens[i++],r=power();v=op==="*"?v*r:v/r;}return v;}
  function expression(){let v=term();while(tokens[i]==="+"||tokens[i]==="-"){const op=tokens[i++],r=term();v=op==="+"?v+r:v-r;}return v;}
  try{const value=expression();return i===tokens.length&&Number.isFinite(value)?value:null;}catch(_){return null;}
}


function palindromeGame(){const qs=[{q:"¿Cuál de estas palabras es un palíndromo?",a:"reconocer",opts:["camino","reconocer","ventana"]},{q:"¿Qué palabra se lee igual de izquierda a derecha y al revés?",a:"radar",opts:["radar","rueda","carta"]},{q:"¿Cuál de estas opciones es un palíndromo?",a:"somos",opts:["silla","somos","soles"]}];quizGame("Palíndromos","Identifica palabras que se leen igual en ambos sentidos.",qs,55);}
function wordChainGame(){const chain=[{start:"CASA",next:"SÁBADO",hint:"Empieza con la última sílaba de CASA: SA."},{start:"LUNA",next:"NARANJA",hint:"Empieza con la última sílaba de LUNA: NA."},{start:"CAMINO",next:"NOVELA",hint:"Empieza con la última sílaba de CAMINO: NO."}];let i=0;setGame("Cadena de palabras","Encuentra una palabra que comience con la última sílaba de la palabra mostrada.",'<div class="game-meta"><span>Ronda <b id="chain-index">1</b>/3</span><span>20 puntos</span></div><div class="word-scramble" id="chain-word"></div><p class="game-hint" id="chain-hint"></p>'+textAnswerForm("Escribe una palabra"));const render=()=>{if(i>=chain.length){finishSimpleGame("¡Cadena completada!","Has conectado las tres palabras.");return;}document.querySelector("#chain-index").textContent=i+1;document.querySelector("#chain-word").textContent=chain[i].start;document.querySelector("#chain-hint").textContent=chain[i].hint;document.querySelector("#text-answer").value="";};document.querySelector("#text-answer-form").addEventListener("submit",e=>{e.preventDefault();if(normText(document.querySelector("#text-answer").value)===normText(chain[i].next)){addPoints(20);i++;render();}else document.querySelector("#text-feedback").textContent="La palabra no coincide con la cadena propuesta. Prueba otra.";});render();}


/* JUEGAMENTE 0.4 — deeper word puzzles, 4x4 category connections, story maths */
const previousOpenGameV04 = openGame;
categoryHubs.logic.items.push(["crossword","Crucigrama","Cruza palabras con pistas horizontales y verticales","▦"]);
categoryHubs.daily.items = [
  ["dailywords","Palabra del día · Misterio","Descubre la palabra con pistas graduales","?"],
  ["wordguess","Palabra del día · Intentos","Deduce la palabra y analiza tus letras","Aa"],
  ["wordriddle","Palabra del día · Enigma","Resuelve una definición con doble sentido","◇"],
  ["crossword","Crucigrama","Completa la cuadrícula con pistas cruzadas","▦"],
  ["anagram","Anagrama contrarreloj","Reordena letras bajo presión","↔"]
];
const oldDailyItems = categoryHubs.daily.items;
categoryHubs.daily.intro = "Cinco retos de vocabulario. Descubre palabras por pistas, lógica y cruces.";
const oldLogicIntro = categoryHubs.logic.intro;
categoryHubs.logic.intro = "Conecta conceptos, interpreta dobles sentidos y descubre patrones que no se ven a primera vista.";
const oldOddIntro = categoryHubs.logic.items.find(x=>x[0]==="oddword");
if(oldOddIntro) oldOddIntro[2]="Conecta cuatro palabras de una misma familia semántica en un tablero 4×4";

openGame = function(id) {
  if(id==="wordguess"){wordGuessGame();return;}
  if(id==="wordriddle"){wordRiddleGame();return;}
  if(id==="crossword"){crosswordGame();return;}
  previousOpenGameV04(id);
};

const connectionSets = [
  {category:"Frutas",words:["Níspero","Kumquat","Membrillo","Pomelo"]},
  {category:"Verduras",words:["Chirivía","Colinabo","Endibia","Acelga"]},
  {category:"Hierbas aromáticas",words:["Perifollo","Mejorana","Estragón","Eneldo"]},
  {category:"Infusiones",words:["Rooibos","Matcha","Chai","Tisana"]}
];
function oddWordGame(){
  const tiles=connectionSets.flatMap((group,g)=>group.words.map(word=>({word,group:g}))).sort(()=>Math.random()-.5);
  let selected=[],solved=[],mistakes=0;
  setGame("Palabra intrusa","Hay 16 palabras y cuatro familias ocultas. Selecciona cuatro que pertenezcan a la misma categoría y conéctalas. Al acertar, descubrirás su nombre.",'<div class="connection-status"><span id="connection-progress">0 de 4 categorías descubiertas</span><span>Errores: <b id="connection-errors">0</b>/4</span></div><div class="connection-grid" id="connection-grid"></div><div class="connection-controls"><span id="connection-selected">Selecciona cuatro palabras</span><button class="math-check" id="connection-check" type="button" disabled>Conectar grupo</button></div><p class="game-hint" id="connection-feedback" aria-live="polite"></p><div id="connection-solved" class="connection-solved"></div>');
  const grid=document.querySelector("#connection-grid");
  const render=()=>{
    grid.innerHTML="";
    tiles.forEach((tile,index)=>{
      if(solved.includes(tile.group))return;
      const b=document.createElement("button");b.type="button";b.className="connection-tile"+(selected.includes(index)?" selected":"");b.textContent=tile.word;b.setAttribute("aria-pressed",selected.includes(index)?"true":"false");
      b.addEventListener("click",()=>{
        if(selected.includes(index)){selected=selected.filter(x=>x!==index);}
        else if(selected.length<4)selected.push(index);
        document.querySelector("#connection-selected").textContent=selected.length===4?"Cuatro elegidas. ¿Forman una familia?":selected.length+" de 4 palabras seleccionadas";
        document.querySelector("#connection-check").disabled=selected.length!==4;
        render();
      });
      grid.appendChild(b);
    });
  };
  document.querySelector("#connection-check").addEventListener("click",()=>{
    if(selected.length!==4)return;
    const groups=selected.map(i=>tiles[i].group);
    if(groups.every(g=>g===groups[0])&&!solved.includes(groups[0])){
      const group=groups[0];solved.push(group);addPoints(40);
      const reveal=document.createElement("div");reveal.className="connection-reveal";reveal.innerHTML="<b>"+connectionSets[group].category+"</b><span>"+connectionSets[group].words.join(" · ")+"</span>";
      document.querySelector("#connection-solved").appendChild(reveal);
      document.querySelector("#connection-feedback").textContent="¡Conexión descubierta! La categoría era "+connectionSets[group].category+".";
      selected=[];document.querySelector("#connection-selected").textContent="Grupo revelado";
      document.querySelector("#connection-check").disabled=true;
      document.querySelector("#connection-progress").textContent=solved.length+" de 4 categorías descubiertas";
      render();
      if(solved.length===4)showResult("¡Conectaste las 4 familias!","Has clasificado las 16 palabras y descubierto todas las categorías.");
    }else{
      mistakes++;document.querySelector("#connection-errors").textContent=mistakes;
      document.querySelector("#connection-feedback").textContent="Estas cuatro palabras no pertenecen todas a la misma familia. Observa sus significados y posibles usos.";
      selected=[];document.querySelector("#connection-selected").textContent="Vuelve a intentarlo";
      document.querySelector("#connection-check").disabled=true;render();
      if(mistakes>=4){document.querySelector("#connection-feedback").textContent="Se acabaron los intentos. Puedes seguir jugando, pero el reto ya no dará bonificación perfecta.";}
    }
  });
  render();
}

const crypticWordChallenges=[
  {clue:"Un recipiente que conserva el calor se une a una unidad de medida. ¿Qué instrumento resulta?",answer:"termometro",parts:"TERMO + METRO",explain:"TERMO (conserva la temperatura) + METRO (medida) forman TERMÓMETRO.",hint:"Piensa en un objeto que guarda calor y algo que sirve para medir."},
  {clue:"Cuando el reloj avanza, algo pasa; cuando tienes un rato libre, también puedes tenerlo. ¿Qué palabra une ambas ideas?",answer:"pasatiempo",parts:"PASA + TIEMPO",explain:"PASA + TIEMPO forman PASATIEMPO: actividad para entretenerse.",hint:"La respuesta puede ser una actividad para entretenerse."},
  {clue:"No es una persona que salva, ni son vidas separadas: es lo que puede mantenerte a flote en el agua.",answer:"salvavidas",parts:"SALVA + VIDAS",explain:"SALVA + VIDAS forman SALVAVIDAS.",hint:"Se encuentra en playas, piscinas y embarcaciones."},
  {clue:"Piensa en lo que haces cuando llega una fecha especial y en el número de años que celebras.",answer:"cumpleaños",parts:"CUMPLE + AÑOS",explain:"CUMPLE + AÑOS forman CUMPLEAÑOS.",hint:"Una celebración que ocurre una vez cada año."},
  {clue:"Lo que hace un paraguas con el agua que cae del cielo. Junta la acción con aquello que detiene.",answer:"paraguas",parts:"PARA + AGUAS",explain:"PARA + AGUAS forman PARAGUAS.",hint:"Lo abres cuando llueve."}
];
function cryptogramGame(){
  let index=0,correct=0,revealed=false;
  const deck=[...crypticWordChallenges].sort(()=>Math.random()-.5);
  setGame("Criptogramas de palabras","No hay letras desplazadas. Cada pista es un pequeño acertijo: interpreta las partes, los dobles sentidos y la definición para descubrir una palabra compuesta.",'<div class="game-meta"><span>Enigma <b id="crypto-index">1</b>/5</span><span>+30 puntos por solución</span></div><div class="cryptic-card"><span class="cryptic-label">PISTA CRÍPTICA</span><p id="cryptic-clue"></p></div><div class="cryptic-hint-row"><button type="button" class="hub-back" id="cryptic-hint">Pedir una pista (sin puntos)</button><button type="button" class="hub-back" id="cryptic-reveal">Ver construcción</button></div><p class="game-hint" id="cryptic-extra" aria-live="polite"></p>'+textAnswerForm("Escribe la palabra que se forma"));
  const render=()=>{if(index>=deck.length){showResult("¡Descifraste las palabras!","Respuestas correctas: "+correct+" de 5. Cada pista exigía interpretar el significado.");return;}revealed=false;document.querySelector("#crypto-index").textContent=index+1;document.querySelector("#cryptic-clue").textContent=deck[index].clue;document.querySelector("#cryptic-extra").textContent="";document.querySelector("#text-answer").value="";};
  document.querySelector("#cryptic-hint").addEventListener("click",()=>{document.querySelector("#cryptic-extra").textContent=deck[index].hint;});
  document.querySelector("#cryptic-reveal").addEventListener("click",()=>{revealed=true;document.querySelector("#cryptic-extra").textContent="Construcción: "+deck[index].parts+". "+deck[index].explain;});
  document.querySelector("#text-answer-form").addEventListener("submit",e=>{e.preventDefault();if(normText(document.querySelector("#text-answer").value)===normText(deck[index].answer)){if(!revealed){addPoints(30);correct++;}else correct++;document.querySelector("#text-feedback").textContent="¡Exacto! "+deck[index].explain;setTimeout(()=>{index++;render();},1500);}else document.querySelector("#text-feedback").textContent="No coincide. Piensa en las dos ideas que se esconden dentro de la pista.";});
  render();
}

const wordOfDayPuzzles=[
  {word:"laberinto",clues:["No siempre tiene paredes, pero puede hacerte perder el rumbo.","Tiene caminos, bifurcaciones y una salida que debes encontrar.","Empieza por L y termina en O."],definition:"Un recorrido complejo con caminos y pasajes que confunden."},
  {word:"brujula",clues:["No te dice dónde estás, sino hacia dónde orientar tus pasos.","Su aguja busca una dirección constante.","Tiene siete letras y comienza por B."],definition:"Instrumento que señala el norte magnético."},
  {word:"paradoja",clues:["Parece contradecirse, pero invita a pensar.","Puede ser una afirmación aparentemente imposible.","Tiene ocho letras y comienza por P."],definition:"Idea que contiene una contradicción aparente."},
  {word:"umbral",clues:["Puedes cruzarlo sin salir de una habitación.","Marca el comienzo o la entrada de algo.","Tiene seis letras y empieza por U."],definition:"Entrada o límite que da paso a otro espacio o estado."},
  {word:"efimero",clues:["Su duración es tan corta que puede desaparecer antes de apreciarlo.","Se opone a lo permanente.","Tiene siete letras y comienza por E."],definition:"Algo que dura muy poco tiempo."}
];
function wordGuessGame(){
  const puzzle=wordOfDayPuzzles[Math.floor((Date.now()/86400000)%wordOfDayPuzzles.length)];
  const answer=puzzle.word;let tries=0,won=false,history=[];
  setGame("Palabra del día · Intentos","Adivina la palabra oculta. Tienes seis intentos. Las letras verdes están en el lugar correcto; las doradas aparecen en otra posición.",'<div class="game-meta"><span>Intentos <b id="word-tries">0</b>/6</span><span>Longitud: '+answer.length+' letras</span></div><div class="word-guess-board" id="word-guess-board"></div>'+textAnswerForm("Escribe una palabra de "+answer.length+" letras"));
  const board=document.querySelector("#word-guess-board");
  const render=()=>{board.innerHTML="";history.forEach(row=>{const line=document.createElement("div");line.className="word-guess-row";row.forEach((letter,i)=>{const cell=document.createElement("span");cell.className="word-guess-cell "+(letter===answer[i]?"exact":answer.includes(letter)?"present":"absent");cell.textContent=letter.toUpperCase();line.appendChild(cell);});board.appendChild(line);});};
  document.querySelector("#text-answer-form").addEventListener("submit",e=>{e.preventDefault();if(won||tries>=6)return;const guess=normText(document.querySelector("#text-answer").value);if(guess.length!==answer.length){document.querySelector("#text-feedback").textContent="La palabra debe tener exactamente "+answer.length+" letras.";return;}tries++;document.querySelector("#word-tries").textContent=tries;history.push(guess.split(""));render();if(guess===answer){won=true;addPoints(50);document.querySelector("#text-feedback").textContent="¡La encontraste! "+puzzle.definition;showResult("¡Palabra descubierta!","La palabra era "+answer.toUpperCase()+".");}else if(tries===6){document.querySelector("#text-feedback").textContent="Se acabaron los intentos. La palabra era "+answer.toUpperCase()+".";showResult("Fin de los intentos","La palabra era "+answer.toUpperCase()+".");}else document.querySelector("#text-feedback").textContent="No es esa. Observa las posiciones y prueba otra palabra.";document.querySelector("#text-answer").value="";});
}
function dailyWordGame(){wordRiddleGame();}
function wordRiddleGame(){
  const puzzle=wordOfDayPuzzles[Math.floor((Date.now()/86400000)%wordOfDayPuzzles.length)];
  let clue=0,usedHint=false;
  setGame("Palabra del día · Enigma","Resuelve una definición ambigua. Puedes pedir pistas, pero cada pista reduce la puntuación.",'<div class="game-meta"><span>Pistas usadas: <b id="word-hints">0</b>/3</span><span>Premio máximo: 45 puntos</span></div><div class="cryptic-card"><span class="cryptic-label">ENIGMA DEL DÍA</span><p id="word-riddle-clue"></p></div><button type="button" class="hub-back" id="word-next-hint">Revelar siguiente pista</button>'+textAnswerForm("¿Qué palabra es?"));
  const clueNode=document.querySelector("#word-riddle-clue");clueNode.textContent=puzzle.clues[0];
  document.querySelector("#word-next-hint").addEventListener("click",()=>{if(clue<2){clue++;usedHint=true;document.querySelector("#word-hints").textContent=clue;clueNode.textContent=puzzle.clues[clue];}});
  document.querySelector("#text-answer-form").addEventListener("submit",e=>{e.preventDefault();if(normText(document.querySelector("#text-answer").value)===normText(puzzle.word)){addPoints(usedHint?15:45);document.querySelector("#text-feedback").textContent="¡Correcto! "+puzzle.definition;showResult("¡Enigma resuelto!","La palabra era "+puzzle.word.toUpperCase()+".");}else document.querySelector("#text-feedback").textContent="No es esa. Busca una palabra que encaje con todas las pistas.";});
}
function crosswordGame(){
  const entries=[
    {word:"CASA",dir:"across",row:0,col:0,num:1,clue:"Lugar donde vive una familia."},
    {word:"AVE",dir:"down",row:0,col:1,num:2,clue:"Animal con plumas, pico y alas."},
    {word:"ECO",dir:"across",row:2,col:1,num:3,clue:"Repetición de un sonido."},
    {word:"AROS",dir:"down",row:0,col:3,num:4,clue:"Anillos que se usan como adorno."}
  ];
  const cells={};entries.forEach(entry=>[...entry.word].forEach((letter,i)=>{const r=entry.row+(entry.dir==="down"?i:0),c=entry.col+(entry.dir==="across"?i:0),key=r+"-"+c;if(!cells[key])cells[key]={letter,number:[],across:false,down:false};cells[key].number.push(entry.num);cells[key][entry.dir]=true;}));
  setGame("Crucigrama","Completa las palabras horizontales y verticales. Las respuestas se cruzan: una letra correcta puede ayudarte a resolver otra palabra.",'<div class="crossword-layout"><div class="crossword-board" id="crossword-board"></div><div class="crossword-clues"><b>Horizontales</b><ol id="cross-across"></ol><b>Verticales</b><ol id="cross-down"></ol><button class="math-check" type="button" id="cross-check">Comprobar crucigrama</button><p class="game-hint" id="cross-feedback"></p></div></div>');
  const board=document.querySelector("#crossword-board");
  for(let r=0;r<4;r++)for(let c=0;c<4;c++){
    const key=r+"-"+c,cell=cells[key];
    const el=document.createElement("div");el.className="crossword-cell"+(cell?"":" blocked");
    if(cell){const n=document.createElement("small");n.textContent=cell.number[0];el.appendChild(n);const input=document.createElement("input");input.maxLength=1;input.dataset.key=key;input.setAttribute("aria-label","Fila "+(r+1)+", columna "+(c+1));input.autocomplete="off";input.addEventListener("input",()=>{input.value=normText(input.value).slice(-1).toUpperCase();});el.appendChild(input);}
    board.appendChild(el);
  }
  entries.forEach(entry=>{const li=document.createElement("li");li.textContent=entry.num+". "+entry.clue;document.querySelector(entry.dir==="across"?"#cross-across":"#cross-down").appendChild(li);});
  document.querySelector("#cross-check").addEventListener("click",()=>{let correct=0;entries.forEach(entry=>{const value=[...entry.word].map((_,i)=>{const r=entry.row+(entry.dir==="down"?i:0),c=entry.col+(entry.dir==="across"?i:0);return board.querySelector('[data-key="'+r+'-'+c+'"]').value;}).join("");if(value===entry.word)correct++;});document.querySelector("#cross-feedback").textContent=correct+" de 4 palabras correctas.";if(correct===4){addPoints(60);showResult("¡Crucigrama resuelto!","Completaste las cuatro palabras cruzadas.");}});
}

const storyMath = [
[
{q:"En la cocina, Pepito tenía 5 manzanas para preparar colaciones. Ana le regaló otras 4. ¿Cuántas manzanas tiene ahora?",a:"9",ex:"5 + 4 = 9 manzanas."},
{q:"Una caja contiene 8 paquetes con 5 lápices cada uno. Durante la clase se reparten 13 lápices. ¿Cuántos lápices quedan?",a:"27",ex:"8 × 5 = 40; 40 − 13 = 27 lápices."},
{q:"En una excursión, 23 estudiantes suben a un bus. En la siguiente parada bajan 7 y suben 4. ¿Cuántos estudiantes continúan?",a:"20",ex:"23 − 7 + 4 = 20 estudiantes."}
],
[
{q:"Una cuadrilla instala 7 filas de baldosas con 8 piezas en cada fila. Se rompen 9 durante el traslado. ¿Cuántas piezas utilizables quedan?",a:"47",ex:"7 × 8 = 56; 56 − 9 = 47."},
{q:"Un depósito de 96 litros se reparte por igual entre 8 estanques. Luego cada estanque recibe 3 litros adicionales. ¿Cuántos litros tiene cada uno?",a:"15",ex:"96 ÷ 8 = 12; 12 + 3 = 15 litros."},
{q:"Una compra cuesta $18.000 y se paga en 3 cuotas iguales. A cada cuota se agregan $1.500 de despacho. ¿Cuál es el total de una cuota?",a:"7500",ex:"18.000 ÷ 3 = 6.000; 6.000 + 1.500 = 7.500."}
],
[
{q:"Una tienda recibe 80 sacos de cemento. Vende el 25% durante la mañana y 18 sacos por la tarde. ¿Cuántos sacos quedan?",a:"42",ex:"25% de 80 = 20; 80 − 20 − 18 = 42."},
{q:"Una receta usa 3/4 de litro de leche. Si se prepara el doble y luego se utiliza 1/2 litro, ¿cuánta leche queda?",a:"1",ex:"2 × 3/4 = 1,5; 1,5 − 0,5 = 1 litro."},
{q:"Un plano representa 4 metros reales con 2 centímetros. Si un muro mide 7,5 centímetros en el plano, ¿cuántos metros representa?",a:"15",ex:"La escala equivale a 2 m por centímetro; 7,5 × 2 = 15 m."}
],
[
{q:"Una empresa cobra $5.000 de visita y $2.500 por cada hora de trabajo. Si una reparación costó $17.500, ¿cuántas horas se trabajó?",a:"5",ex:"17.500 − 5.000 = 12.500; 12.500 ÷ 2.500 = 5 horas."},
{q:"Un estanque tenía x litros. Se utilizaron 18 litros y quedaron 27. ¿Cuántos litros tenía al comienzo?",a:"45",ex:"x − 18 = 27; x = 27 + 18 = 45 litros."},
{q:"El largo de un terreno rectangular mide el doble del ancho. Su perímetro es 36 metros. ¿Cuánto mide el ancho?",a:"6",ex:"2(2x + x) = 36; 6x = 36; x = 6 m."}
],
[
{q:"Una colonia de bacterias se duplica cada hora. Si comienza con 3 bacterias, ¿cuántas habrá después de 4 horas?",a:"48",ex:"3 × 2⁴ = 3 × 16 = 48."},
{q:"Una escalera tiene 10 peldaños de igual altura. Cada uno mide √(0,36) metros. ¿Cuál es la altura total?",a:"6",ex:"√0,36 = 0,6 m; 10 × 0,6 = 6 m."},
{q:"Un terreno cuadrado tiene una superficie de 196 m². ¿Cuánto mide cada lado?",a:"14",ex:"√196 = 14 metros."}
],
[
{q:"Una población de microorganismos sigue el modelo P(t)=500·2ᵗ. ¿Cuántos microorganismos habrá cuando t=3?",a:"4000",ex:"P(3)=500 × 2³ = 500 × 8 = 4.000."},
{q:"El nivel de ruido se modela con L=10 log₁₀(I/I₀). Si I/I₀=1000, ¿cuál es L?",a:"30",ex:"log₁₀(1000)=3; L=10 × 3=30."},
{q:"Una máquina pierde valor según V(t)=120000·(0,9)ᵗ. ¿Cuál será su valor después de 2 periodos? Responde en miles.",a:"97.2",ex:"120 × 0,9² = 120 × 0,81 = 97,2 miles."}
],
[
{q:"Una rampa forma un triángulo rectángulo. Su longitud inclinada es 10 m y el ángulo con el suelo es 30°. ¿Qué altura alcanza? (sen 30°=0,5)",a:"5",ex:"Altura = 10 × sen 30° = 10 × 0,5 = 5 m."},
{q:"Desde un punto situado a 12 m de un edificio se observa la cima con un ángulo de 45°. ¿Qué altura tiene el edificio si tan 45°=1?",a:"12",ex:"tan 45° = altura/12 = 1; altura = 12 m."},
{q:"Un cable de 20 m forma un ángulo de 60° con el suelo. ¿Qué distancia horizontal cubre? (cos 60°=0,5)",a:"10",ex:"Distancia horizontal = 20 × cos 60° = 10 m."}
],
[
{q:"La velocidad de una partícula es v(t)=3t². ¿Qué aceleración tiene en t=4? (La aceleración es la derivada de v.)",a:"24",ex:"a(t)=v'(t)=6t; a(4)=24."},
{q:"El costo marginal de producir x unidades es C'(x)=2x+4. ¿Cuál es el aumento de costo entre x=0 y x=3?",a:"21",ex:"∫₀³(2x+4)dx = [x²+4x]₀³ = 9+12 = 21."},
{q:"Un objeto se mueve con posición s(t)=t²+2t. ¿Cuál es su velocidad instantánea cuando t=5?",a:"12",ex:"s'(t)=2t+2; s'(5)=12."}
]
];
function mathLevelGame(level){
  const data=mathLevels[level],questions=storyMath[level];let index=0,correct=0;
  setGame("Matemáticas · "+data.title,"Lee el caso, identifica los datos relevantes y resuelve el problema. Puedes desarrollar todo en la pizarra.",'<div class="math-progress"><span>Nivel '+(level+1)+' de 8</span><span>Problema <b id="math-index">1</b>/3</span></div><div class="math-story-card"><span>PROBLEMA CONTEXTUALIZADO</span><p id="math-question"></p></div><div class="math-workspace math-workspace-wide"><div class="math-board-area math-board-large"><div class="board-heading"><b>Tu pizarra de desarrollo</b><button type="button" id="clear-board">Limpiar</button></div><canvas id="math-board" aria-label="Pizarra amplia para desarrollar el problema"></canvas><small>Desarrolla operaciones, esquemas, ecuaciones o dibujos. Puedes usar mouse o dedo.</small></div><div class="math-input-area math-answer-side"><label for="math-answer">Tu respuesta final</label><math-field id="math-answer" virtual-keyboard-mode="manual" smart-fence></math-field><div class="math-symbol-row"><button type="button" data-insert="\\frac{#@}{#?}">a/b</button><button type="button" data-insert="^{#?}">x²</button><button type="button" data-insert="\\sqrt{#0}">√</button><button type="button" data-insert="\\pi">π</button><button type="button" data-insert="\\log\\left(#0\\right)">log</button><button type="button" data-insert="\\sin\\left(#0\\right)">sen</button><button type="button" data-insert="\\cdot">·</button><button type="button" data-insert="\\le">≤</button><button type="button" data-insert="\\infty">∞</button></div><div class="math-actions"><button type="button" class="math-keyboard" id="show-math-keyboard">⌨ Teclado matemático</button><button type="button" class="math-check" id="check-math">Comprobar</button></div><p class="math-feedback" id="math-feedback" aria-live="polite"></p></div></div><div class="math-explanation" id="math-explanation" hidden></div><div class="math-level-footer"><button type="button" class="hub-back" id="math-level-back">← Volver a niveles</button><span>Los ejercicios se vuelven más complejos en cada nivel.</span></div>');
  const field=document.querySelector("#math-answer"),feedback=document.querySelector("#math-feedback");
  const render=()=>{if(index>=questions.length){if(correct>=2){const next=Math.min(7,level+1);localStorage.setItem("juegamente-math-unlocked",String(Math.max(Number(localStorage.getItem("juegamente-math-unlocked")||0),next)));}showResult("¡Nivel completado!","Respuestas correctas: "+correct+" de 3. "+(correct>=2&&level<7?"Has desbloqueado el siguiente nivel.":"Puedes volver a practicar para mejorar."));const back=document.createElement("button");back.className="hub-back";back.textContent="← Volver a niveles";back.addEventListener("click",()=>renderCategoryHub("math"));gameContent.appendChild(back);return;}document.querySelector("#math-index").textContent=index+1;document.querySelector("#math-question").textContent=questions[index].q;field.value="";feedback.textContent="";document.querySelector("#math-explanation").hidden=true;const ctx=document.querySelector("#math-board").getContext("2d");ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);};
  document.querySelectorAll("[data-insert]").forEach(b=>b.addEventListener("click",()=>{field.focus();field.executeCommand(["insert",b.dataset.insert]);}));
  document.querySelector("#show-math-keyboard").addEventListener("click",()=>{field.focus();if(window.mathVirtualKeyboard){window.mathVirtualKeyboard.layouts=["numeric","symbols","alphabetic","greek"];window.mathVirtualKeyboard.show();}});
  document.querySelector("#check-math").addEventListener("click",()=>{const raw=field.getValue("ascii-math").trim(),normalized=raw.replace(/\s/g,"").replace(/,/g,".").replace(/[{}]/g,"").toLowerCase(),expected=questions[index].a,n=evaluateMathExpression(normalized),correctAnswer=normalized===expected|| (n!==null&&Math.abs(n-Number(expected))<0.0001);if(!correctAnswer){feedback.textContent="No coincide todavía. Revisa los datos del problema y tu desarrollo.";feedback.className="math-feedback bad";return;}correct++;addPoints(25);feedback.textContent="¡Correcto! +25 puntos";feedback.className="math-feedback good";const ex=document.querySelector("#math-explanation");ex.hidden=false;ex.textContent="Desarrollo orientativo: "+questions[index].ex;setTimeout(()=>{index++;render();},1900);});
  document.querySelector("#math-level-back").addEventListener("click",()=>renderCategoryHub("math"));
  setupMathBoard();
  render();
}


/* Arcade and survival get dedicated mode menus and playable variations. */
categoryHubs.arcade.intro="Pruebas de reflejos, precisión y memoria a contrarreloj. Supera tus marcas.";
categoryHubs.arcade.items=[
 ["targetrush","Cazaobjetivos","Golpea objetivos móviles antes de que acabe el tiempo","◎"],
 ["precision","Pulso de precisión","Detén el indicador dentro de la zona perfecta","⌁"],
 ["sequence","Memoria relámpago","Repite patrones cada vez más largos","◉"]
];
categoryHubs.survival.intro="Decisiones, recursos limitados y entornos hostiles. Cada día cuenta.";
categoryHubs.survival.items=[
 ["island","La isla","Consigue comida, madera y resiste seis días","🏝"],
 ["coldsurvival","Frontera helada","Controla el frío, la energía y el refugio","❄"],
 ["nightwatch","Última guardia","Administra recursos durante noches peligrosas","🌙"]
];
const previousOpenGameV05=openGame;
openGame=function(id){
 if(id==="precision"){precisionGame();return;}
 if(id==="coldsurvival"){coldSurvivalGame();return;}
 if(id==="nightwatch"){nightWatchGame();return;}
 previousOpenGameV05(id);
};
function precisionGame(){
 let round=0,hits=0,position=0,direction=1;
 setGame("Pulso de precisión","El marcador se mueve. Detenlo cuando esté dentro de la zona luminosa. La zona se estrecha en cada ronda.",'<div class="game-meta"><span>Ronda <b id="precision-round">1</b>/5</span><span>Perfectos: <b id="precision-hits">0</b></span></div><div class="precision-track"><div class="precision-zone" id="precision-zone"></div><div class="precision-marker" id="precision-marker"></div></div><button class="math-check precision-stop" id="precision-stop" type="button">¡DETENER!</button><p class="game-hint" id="precision-feedback">Pulsa cuando el marcador esté dentro de la zona.</p>');
 const marker=document.querySelector("#precision-marker"),zone=document.querySelector("#precision-zone");
 const run=()=>{round++;if(round>5){showResult("¡Prueba de precisión terminada!","Aciertos perfectos: "+hits+" de 5.");return;}document.querySelector("#precision-round").textContent=round;const width=Math.max(7,24-round*3);const left=12+Math.random()*(76-width);zone.style.left=left+"%";zone.style.width=width+"%";position=0;direction=1;marker.style.left="0%";if(precisionIntervalId!==null)clearInterval(precisionIntervalId);precisionIntervalId=setInterval(()=>{position+=direction*2.1;if(position>=96){position=96;direction=-1;}if(position<=0){position=0;direction=1;}marker.style.left=position+"%";},24);};
 document.querySelector("#precision-stop").addEventListener("click",()=>{if(precisionIntervalId===null)return;clearInterval(precisionIntervalId);precisionIntervalId=null;const left=parseFloat(zone.style.left),width=parseFloat(zone.style.width);if(position>=left&&position<=left+width){hits++;addPoints(20);document.querySelector("#precision-hits").textContent=hits;document.querySelector("#precision-feedback").textContent="¡Precisión perfecta! +20 puntos.";}else document.querySelector("#precision-feedback").textContent="Fuera de la zona. Observa el ritmo y vuelve a intentarlo.";setTimeout(run,850);});
 run();
 const oldStop=stopTimer; // interval is explicitly cleared when the modal closes via next launch.
}
function coldSurvivalGame(){
 let day=1,temperature=55,food=3,wood=3,shelter=0,health=100;
 const update=()=>{document.querySelector("#cold-day").textContent=day;document.querySelector("#cold-temp").textContent=temperature;document.querySelector("#cold-food").textContent=food;document.querySelector("#cold-wood").textContent=wood;document.querySelector("#cold-shelter").textContent=shelter;document.querySelector("#cold-health").textContent=health;};
 setGame("Frontera helada","Una tormenta te aisló en la montaña. Mantén el calor, administra comida y mejora tu refugio. Sobrevive 8 jornadas.",'<div class="survival-status cold-status"><span>❤️ Salud <b id="cold-health">100</b></span><span>🌡️ Calor <b id="cold-temp">55</b></span><span>🍲 Comida <b id="cold-food">3</b></span></div><div class="cold-resources"><span>Día <b id="cold-day">1</b>/8</span><span>🪵 Leña <b id="cold-wood">3</b></span><span>🏠 Refugio <b id="cold-shelter">0</b></span></div><div class="survival-scene"><b>REFUGIO EN LA MONTAÑA</b><p>El viento golpea la puerta. Debes decidir cómo usar las horas de luz.</p></div><div class="survival-actions survival-actions-grid"><button class="quiz-option" data-cold="wood">Recolectar leña</button><button class="quiz-option" data-cold="fire">Encender fuego</button><button class="quiz-option" data-cold="food">Buscar alimento</button><button class="quiz-option" data-cold="shelter">Reforzar refugio</button><button class="quiz-option" data-cold="rest">Descansar</button></div><p class="game-hint" id="cold-log" aria-live="polite">La temperatura baja al terminar cada jornada.</p>');
 document.querySelectorAll("[data-cold]").forEach(b=>b.addEventListener("click",()=>{const action=b.dataset.cold;let message="";if(action==="wood"){wood+=2;message="Encontraste ramas secas. +2 leña.";}if(action==="fire"){if(wood>=2){wood-=2;temperature=Math.min(100,temperature+28);message="Encendiste un fuego. El refugio recupera calor.";}else message="No tienes suficiente leña para encender el fuego.";}if(action==="food"){food+=2;message="Encontraste provisiones bajo la nieve. +2 comida.";}if(action==="shelter"){if(wood>=3){wood-=3;shelter++;message="Reforzaste el refugio. El viento tendrá menos efecto.";}else message="Necesitas 3 unidades de leña.";}if(action==="rest"){if(food>0){food--;health=Math.min(100,health+12);message="Comiste y recuperaste fuerzas.";}else message="No tienes comida. Descansar con hambre es peligroso.";}day++;temperature-=Math.max(4,14-shelter*3);if(temperature<35)health-=Math.ceil((35-temperature)*.7);if(food===0)health-=8;else food--;temperature=Math.max(0,temperature);document.querySelector("#cold-log").textContent=message+" La noche reduce el calor.";update();if(health<=0){showResult("La tormenta te venció","Sobreviviste "+(day-1)+" jornadas. La próxima vez equilibra fuego, comida y refugio.");}else if(day>8){addPoints(50);showResult("¡Sobreviviste a la frontera helada!","Mantuviste la salud y el refugio durante ocho jornadas.");}}));
}
function nightWatchGame(){
 let night=1,ammo=4,food=3,noise=0,health=3;
 setGame("Última guardia","Una estación aislada recibe visitas después del anochecer. Escucha, administra munición y decide cuándo mantener silencio.",'<div class="survival-status"><span>🌙 Noche <b id="watch-night">1</b>/6</span><span>❤️ Vida <b id="watch-health">3</b></span><span>🔦 Batería <b id="watch-ammo">4</b></span><span>🥫 Comida <b id="watch-food">3</b></span></div><div class="survival-scene"><b id="watch-scene">Algo se mueve fuera de la cerca.</b><p id="watch-detail">No puedes distinguir si es un animal o una persona.</p></div><div class="survival-actions survival-actions-grid"><button class="quiz-option" data-watch="listen">Escuchar primero</button><button class="quiz-option" data-watch="light">Encender foco</button><button class="quiz-option" data-watch="hide">Apagar todo y ocultarte</button><button class="quiz-option" data-watch="ration">Comer y recuperar fuerzas</button></div><p class="game-hint" id="watch-log">No todas las amenazas son lo que parecen.</p>');
 const scenes=[["Un golpe seco suena en el cobertizo.","Una sombra cruza detrás del tanque."],["Se escuchan pasos lentos sobre la grava.","La radio emite una voz entre interferencias."],["Algo araña la puerta del almacén.","Una luz parpadea en el bosque."],["El generador se detiene de golpe.","Una figura aparece junto a la verja."],["La tormenta tapa todos los sonidos.","La puerta exterior queda entreabierta."],["El amanecer está cerca, pero aún queda una última ronda.","Un ruido llega desde el techo."]];
 document.querySelectorAll("[data-watch]").forEach(b=>b.addEventListener("click",()=>{const action=b.dataset.watch,scene=scenes[night-1][Math.floor(Math.random()*2)];let msg="";if(action==="listen"){msg="Esperaste y reconociste el patrón del ruido. Evitaste gastar recursos.";if(Math.random()<.55)health=Math.min(3,health+0);}if(action==="light"){if(ammo>0){ammo--;msg="Iluminaste el exterior y detectaste la amenaza a tiempo.";}else{health--;msg="La batería está agotada. Algo se acercó demasiado.";}}if(action==="hide"){msg="Apagaste las luces y permaneciste inmóvil.";if(Math.random()<.25)health--;}if(action==="ration"){if(food>0){food--;health=Math.min(3,health+1);msg="Comiste una ración y recuperaste una vida.";}else msg="No queda comida."; }if(night%2===0&&action!=="light"&&Math.random()<.35){health--;msg+=" Un ruido te tomó por sorpresa.";}document.querySelector("#watch-scene").textContent=scene;document.querySelector("#watch-detail").textContent="La estación permanece a oscuras.";document.querySelector("#watch-log").textContent=msg;night++;document.querySelector("#watch-night").textContent=Math.min(night,6);document.querySelector("#watch-health").textContent=health;document.querySelector("#watch-ammo").textContent=ammo;document.querySelector("#watch-food").textContent=food;if(health<=0)showResult("La guardia terminó","La estación no resistió. Llegaste a la noche "+(night-1)+".");else if(night>6){addPoints(50);showResult("¡Amaneció!","Sobreviviste seis noches administrando tus recursos.");}}));
}

/* Small lifecycle fixes and the third daily word mode. */
const openGameBeforeLifecycleFix=openGame;
openGame=function(id){
 if(["wordguess","wordriddle","wordmix","crossword","precision","coldsurvival","nightwatch"].includes(id)){
   currentGame=id;score=0;locked=false;stopTimer();updateScore();
   if(!modal.classList.contains("is-open")){modal.classList.add("is-open");modal.setAttribute("aria-hidden","false");document.body.classList.add("game-open");}
 }
 openGameBeforeLifecycleFix(id);
};
categoryHubs.daily.items=[
 ["wordguess","Palabra del día · Intentos","Descubre la palabra con seis intentos y pistas visuales","Aa"],
 ["wordriddle","Palabra del día · Enigma","Resuelve una definición con dobles sentidos","◇"],
 ["wordmix","Palabra del día · Letras ocultas","Reconstruye la palabra con letras mezcladas","↔"],
 ["crossword","Crucigrama","Completa la cuadrícula con pistas cruzadas","▦"]
];
function wordMixGame(){
 const p=wordOfDayPuzzles[Math.floor((Date.now()/86400000)%wordOfDayPuzzles.length)];
 let letters=p.word.toUpperCase().split("").sort(()=>Math.random()-.5);while(letters.join("")===p.word.toUpperCase()){letters=p.word.toUpperCase().split("").sort(()=>Math.random()-.5);}
 let attempts=0;
 setGame("Palabra del día · Letras ocultas","Las letras están mezcladas. La definición es deliberadamente indirecta: encuentra la palabra del día.",'<div class="game-meta"><span>Intentos <b id="mix-attempts">0</b>/5</span><span>Longitud: '+letters.length+'</span></div><div class="word-scramble" id="mix-letters">'+letters.join(" · ")+'</div><p class="game-hint">'+p.clues[0]+'</p>'+textAnswerForm("Reconstruye la palabra"));
 document.querySelector("#text-answer-form").addEventListener("submit",e=>{e.preventDefault();attempts++;document.querySelector("#mix-attempts").textContent=attempts;if(normText(document.querySelector("#text-answer").value)===p.word){addPoints(Math.max(15,50-(attempts-1)*7));showResult("¡Palabra reconstruida!","La palabra era "+p.word.toUpperCase()+". "+p.definition);}else if(attempts>=5){showResult("Se agotaron los intentos","La palabra era "+p.word.toUpperCase()+".");}else document.querySelector("#text-feedback").textContent="No coincide. Puedes usar la pista semántica y reorganizar las letras." ;document.querySelector("#text-answer").value="";});
}
const openGameBeforeWordMix=openGame;
openGame=function(id){
 if(id==="wordmix"){currentGame=id;score=0;locked=false;stopTimer();updateScore();wordMixGame();return;}
 openGameBeforeWordMix(id);
};
let precisionIntervalId=null;
const stopTimerBeforePrecisionFix=stopTimer;
stopTimer=function(){if(precisionIntervalId!==null){clearInterval(precisionIntervalId);precisionIntervalId=null;}stopTimerBeforePrecisionFix();};

const openGameBeforeFinalRouting=openGame;
openGame=function(id){
  if(id==="wordmix"){
    currentGame=id;score=0;locked=false;stopTimer();updateScore();
    if(!modal.classList.contains("is-open")){modal.classList.add("is-open");modal.setAttribute("aria-hidden","false");document.body.classList.add("game-open");}
    wordMixGame();return;
  }
  openGameBeforeFinalRouting(id);
};

const openGameBeforeFinalModes=openGame;
openGame=function(id){
 if(id==="targetrush"||id==="island"){
   currentGame=id;score=0;locked=false;stopTimer();updateScore();
   if(!modal.classList.contains("is-open")){modal.classList.add("is-open");modal.setAttribute("aria-hidden","false");document.body.classList.add("game-open");}
   if(id==="targetrush")arcadeGame();else survivalGame();
   return;
 }
 openGameBeforeFinalModes(id);
};


/* 0.5 — consistency and game-flow corrections */
function evaluateMathExpression(source){
  let text=String(source).trim().toLowerCase();
  if(!text)return null;
  text=text.replace(/\\left|\\right/g,"").replace(/\\cdot|\\times/g,"*").replace(/\\div/g,"/");
  text=text.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g,"($1)/($2)").replace(/\\sqrt\{([^{}]+)\}/g,"sqrt($1)");
  text=text.replace(/\\log_\{?(\d+)\}?/g,"log_$1").replace(/\\sin/g,"sin").replace(/\\cos/g,"cos").replace(/\\tan/g,"tan").replace(/\\pi/g,"pi");
  text=text.replace(/\\mathrm\{([^{}]+)\}/g,"$1").replace(/°|\\circ|deg/g,"").replace(/,/g,".").replace(/\s+/g,"");
  if(text.includes("="))text=text.slice(text.lastIndexOf("=")+1);
  const tokens=text.match(/log_\d+|log|ln|sqrt|sin|cos|tan|sen|pi|√|\d+(?:\.\d+)?|[()+\-*/^]/gi);
  if(!tokens||tokens.join("")!==text)return null;
  let i=0;
  function primary(){
    const token=tokens[i++];
    if(token===undefined)throw 0;
    if(token==="+")return primary();
    if(token==="-")return -primary();
    if(token==="("){const v=expression();if(tokens[i++]!==")")throw 0;return v;}
    if(token==="√"||token==="sqrt"){if(tokens[i]==="(")i++;const v=expression();if(tokens[i]===")")i++;return Math.sqrt(v);}
    if(token==="pi")return Math.PI;
    if(token==="sin"||token==="sen"||token==="cos"||token==="tan"){
      if(tokens[i]==="(")i++;
      const v=expression();if(tokens[i]===")")i++;
      const rad=v*Math.PI/180;
      return token==="sin"||token==="sen"?Math.sin(rad):token==="cos"?Math.cos(rad):Math.tan(rad);
    }
    if(token==="log"||token==="ln"||token.startsWith("log_")){
      let base=10;if(token.startsWith("log_"))base=Number(token.slice(4));if(token==="ln")base=Math.E;
      if(tokens[i]==="(")i++;
      const v=expression();if(tokens[i]===")")i++;
      return Math.log(v)/Math.log(base);
    }
    const n=Number(token);if(!Number.isFinite(n))throw 0;return n;
  }
  function power(){let v=primary();if(tokens[i]==="^"){i++;v=Math.pow(v,power());}return v;}
  function term(){let v=power();while(tokens[i]==="*"||tokens[i]==="/"){const op=tokens[i++],r=power();v=op==="*"?v*r:v/r;}return v;}
  function expression(){let v=term();while(tokens[i]==="+"||tokens[i]==="-"){const op=tokens[i++],r=term();v=op==="+"?v+r:v-r;}return v;}
  try{const value=expression();return i===tokens.length&&Number.isFinite(value)?value:null;}catch(_){return null;}
}

function wordGuessGame(){
  const dayNumber=Math.floor(Date.now()/86400000);
  const puzzle=wordOfDayPuzzles[((dayNumber%wordOfDayPuzzles.length)+wordOfDayPuzzles.length)%wordOfDayPuzzles.length];
  const answer=normText(puzzle.word);let tries=0,won=false,history=[];
  setGame("Palabra del día · Intentos","Adivina la palabra oculta. Tienes seis intentos. Verde: letra y posición correctas. Dorado: la letra aparece, pero en otra posición.",'<div class="game-meta"><span>Intentos <b id="word-tries">0</b>/6</span><span>Longitud: '+answer.length+' letras</span></div><div class="word-guess-board" id="word-guess-board" aria-live="polite"></div>'+textAnswerForm("Escribe una palabra de "+answer.length+" letras"));
  const board=document.querySelector("#word-guess-board");
  const render=()=>{board.innerHTML="";history.forEach(row=>{const states=Array(row.length).fill("absent"),remaining={};[...answer].forEach((ch,i)=>{if(row[i]===ch)states[i]="exact";else remaining[ch]=(remaining[ch]||0)+1;});row.forEach((ch,i)=>{if(states[i]==="exact")return;if(remaining[ch]>0){states[i]="present";remaining[ch]--;}});const line=document.createElement("div");line.className="word-guess-row";row.forEach((letter,i)=>{const cell=document.createElement("span");cell.className="word-guess-cell "+states[i];cell.textContent=letter.toUpperCase();line.appendChild(cell);});board.appendChild(line);});};
  document.querySelector("#text-answer-form").addEventListener("submit",e=>{e.preventDefault();if(won||tries>=6)return;const guess=normText(document.querySelector("#text-answer").value);if(guess.length!==answer.length){document.querySelector("#text-feedback").textContent="La respuesta debe tener exactamente "+answer.length+" letras.";return;}tries++;document.querySelector("#word-tries").textContent=tries;history.push([...guess]);render();document.querySelector("#text-answer").value="";if(guess===answer){won=true;addPoints(50);document.querySelector("#text-feedback").textContent="¡La encontraste! "+puzzle.definition;showResult("¡Palabra descubierta!","La palabra era "+answer.toUpperCase()+".");}else if(tries===6){document.querySelector("#text-feedback").textContent="Se acabaron los intentos. La palabra era "+answer.toUpperCase()+".";showResult("Fin de los intentos","La palabra era "+answer.toUpperCase()+".");}else document.querySelector("#text-feedback").textContent="No es esa. Observa las posiciones y prueba otra palabra.";});
}

function cryptogramGame(){
  let index=0,correct=0,lockedCrypto=false,hintUsed=false,revealed=false;
  const deck=[...crypticWordChallenges];
  setGame("Criptogramas de palabras","Interpreta definiciones, dobles sentidos y construcciones. No se trata de sustituir letras.",'<div class="game-meta"><span>Enigma <b id="crypto-index">1</b>/'+deck.length+'</span><span>Hasta 30 puntos por solución</span></div><div class="cryptic-card"><span class="cryptic-label">PISTA CRÍPTICA</span><p id="cryptic-clue"></p></div><div class="cryptic-hint-row"><button type="button" class="hub-back" id="cryptic-hint">Pedir una pista</button><button type="button" class="hub-back" id="cryptic-reveal">Ver construcción</button></div><p class="game-hint" id="cryptic-extra" aria-live="polite"></p>'+textAnswerForm("Escribe la palabra que se forma"));
  const render=()=>{if(index>=deck.length){showResult("¡Descifraste las palabras!","Respuestas correctas: "+correct+" de "+deck.length+".");return;}lockedCrypto=false;hintUsed=false;revealed=false;document.querySelector("#crypto-index").textContent=index+1;document.querySelector("#cryptic-clue").textContent=deck[index].clue;document.querySelector("#cryptic-extra").textContent="";document.querySelector("#text-answer").value="";document.querySelector("#text-feedback").textContent="";};
  document.querySelector("#cryptic-hint").addEventListener("click",()=>{if(lockedCrypto)return;hintUsed=true;document.querySelector("#cryptic-extra").textContent=deck[index].hint;});
  document.querySelector("#cryptic-reveal").addEventListener("click",()=>{if(lockedCrypto)return;revealed=true;document.querySelector("#cryptic-extra").textContent="Construcción: "+deck[index].parts+". "+deck[index].explain;});
  document.querySelector("#text-answer-form").addEventListener("submit",e=>{e.preventDefault();if(lockedCrypto)return;if(normText(document.querySelector("#text-answer").value)===normText(deck[index].answer)){lockedCrypto=true;correct++;const earned=revealed?0:hintUsed?15:30;if(earned)addPoints(earned);document.querySelector("#text-feedback").textContent="¡Exacto! "+deck[index].explain+(earned?" +"+earned+" puntos.":"");setTimeout(()=>{index++;render();},1300);}else document.querySelector("#text-feedback").textContent="No coincide. Piensa en las ideas y palabras que forman la respuesta.";});
  render();
}

function deductionGame(){
 const qs=[
  {q:"Todos los tulipanes de este invernadero son azules. Esta flor es uno de esos tulipanes. ¿Qué puedes concluir?",a:"azul",opts:["Azul","Roja","No se puede saber"]},
  {q:"Marta llegó antes que Luis. Luis llegó antes que Paula. ¿Quién llegó en segundo lugar?",a:"luis",opts:["Marta","Luis","Paula"]},
  {q:"Ningún objeto de vidrio de esta caja es flexible. La pieza A es de vidrio y está dentro de la caja. ¿Qué afirmación es válida?",a:"no es flexible",opts:["Es flexible","No es flexible","Es irrompible"]}
 ];
 let i=0;
 setGame("Deducción","Resuelve situaciones usando únicamente la información que entregan las pistas.",'<div class="game-meta"><span>Caso <b id="deduction-index">1</b>/'+qs.length+'</span><span>20 puntos por caso</span></div><div class="quiz-question" id="deduction-question"></div><div class="quiz-options" id="deduction-options"></div><p class="game-hint" id="deduction-feedback" aria-live="polite"></p>');
 const render=()=>{if(i>=qs.length){finishSimpleGame("¡Casos resueltos!","Completaste las tres deducciones.");return;}document.querySelector("#deduction-index").textContent=i+1;document.querySelector("#deduction-question").textContent=qs[i].q;document.querySelector("#deduction-feedback").textContent="";const box=document.querySelector("#deduction-options");box.innerHTML="";qs[i].opts.forEach(o=>{const b=document.createElement("button");b.type="button";b.className="quiz-option";b.textContent=o;b.addEventListener("click",()=>{if(normText(o)===normText(qs[i].a)){addPoints(20);i++;render();}else document.querySelector("#deduction-feedback").textContent="Esa conclusión no se desprende necesariamente de las premisas.";});box.appendChild(b);});};render();
}

function mathLevelGame(level){
 if(!Number.isInteger(level)||level<0||level>=mathLevels.length){renderCategoryHub("math");return;}
 const questions=storyMath[level];let index=0,correct=0,checking=false;
 setGame("Matemáticas · "+mathLevels[level].title,"Lee el caso, identifica los datos y resuelve el problema. Puedes desarrollar los pasos en la pizarra.",'<div class="math-progress"><span>Nivel '+(level+1)+' de 8</span><span>Problema <b id="math-index">1</b>/'+questions.length+'</span></div><div class="math-story-card"><span>PROBLEMA CONTEXTUALIZADO</span><p id="math-question"></p></div><div class="math-workspace math-workspace-wide"><div class="math-board-area math-board-large"><div class="board-heading"><b>Tu pizarra de desarrollo</b><button type="button" id="clear-board">Limpiar</button></div><canvas id="math-board" aria-label="Pizarra para desarrollar el problema"></canvas><small>Desarrolla operaciones, esquemas y ecuaciones con mouse o dedo.</small></div><div class="math-input-area math-answer-side"><label for="math-answer">Tu respuesta final</label><math-field id="math-answer" virtual-keyboard-mode="manual" smart-fence></math-field><div class="math-symbol-row"><button type="button" data-insert="\\frac{#@}{#?}">a/b</button><button type="button" data-insert="^{#?}">x²</button><button type="button" data-insert="\\sqrt{#0}">√</button><button type="button" data-insert="\\pi">π</button><button type="button" data-insert="\\log_{10}\\left(#0\\right)">log</button><button type="button" data-insert="\\sin\\left(#0\\right)">sen</button><button type="button" data-insert="\\cdot">·</button><button type="button" data-insert="\\le">≤</button><button type="button" data-insert="\\infty">∞</button></div><div class="math-actions"><button type="button" class="math-keyboard" id="show-math-keyboard">⌨ Teclado matemático</button><button type="button" class="math-check" id="check-math">Comprobar</button></div><p class="math-feedback" id="math-feedback" aria-live="polite"></p></div></div><div class="math-explanation" id="math-explanation" hidden></div><div class="math-level-footer"><button type="button" class="hub-back" id="math-level-back">← Volver a niveles</button><span>Necesitas 2 de 3 respuestas correctas para desbloquear el siguiente nivel.</span></div>');
 const field=document.querySelector("#math-answer"),feedback=document.querySelector("#math-feedback");
 const render=()=>{if(index>=questions.length){if(correct>=2){const next=Math.min(7,level+1);localStorage.setItem("juegamente-math-unlocked",String(Math.max(Number(localStorage.getItem("juegamente-math-unlocked")||0),next)));}showResult("¡Nivel completado!","Respuestas correctas: "+correct+" de "+questions.length+". "+(correct>=2&&level<7?"Has desbloqueado el siguiente nivel.":"Puedes repetirlo para mejorar tu resultado."));const back=document.createElement("button");back.className="hub-back";back.textContent="← Volver a niveles";back.addEventListener("click",()=>renderCategoryHub("math"));gameContent.appendChild(back);return;}checking=false;document.querySelector("#math-index").textContent=index+1;document.querySelector("#math-question").textContent=questions[index].q;field.value="";feedback.textContent="";document.querySelector("#math-explanation").hidden=true;const ctx=document.querySelector("#math-board").getContext("2d");ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);};
 document.querySelectorAll("[data-insert]").forEach(b=>b.addEventListener("click",()=>{field.focus();field.executeCommand(["insert",b.dataset.insert]);}));
 document.querySelector("#show-math-keyboard").addEventListener("click",()=>{field.focus();if(window.mathVirtualKeyboard)window.mathVirtualKeyboard.show();});
 document.querySelector("#check-math").addEventListener("click",()=>{if(checking)return;const raw=field.getValue("ascii-math"),value=evaluateMathExpression(raw),expected=Number(questions[index].a);if(value===null||!Number.isFinite(expected)||Math.abs(value-expected)>Math.max(1e-7,Math.abs(expected)*1e-7)){feedback.textContent="Todavía no coincide. Revisa las operaciones, los signos y las unidades.";feedback.className="math-feedback bad";return;}checking=true;correct++;addPoints(25);feedback.textContent="¡Correcto! +25 puntos.";feedback.className="math-feedback good";const ex=document.querySelector("#math-explanation");ex.hidden=false;ex.textContent="Desarrollo orientativo: "+questions[index].ex;setTimeout(()=>{if(!modal.classList.contains("is-open"))return;index++;render();},1600);});
 document.querySelector("#math-level-back").addEventListener("click",()=>renderCategoryHub("math"));
 setupMathBoard();render();
}

/* One routing table replaces the accumulated wrapper chain. */
openGame=function(id){
 currentGame=id;score=0;locked=false;stopTimer();
 if(precisionIntervalId!==null){clearInterval(precisionIntervalId);precisionIntervalId=null;}
 if(!modal.classList.contains("is-open")){modal.classList.add("is-open");modal.setAttribute("aria-hidden","false");document.body.classList.add("game-open");}
 updateScore();
 if(categoryHubs[id]){renderCategoryHub(id);return;}
 const routes={
  riddle:logicGame,anagram:anagramGame,cryptogram:cryptogramGame,oddword:oddWordGame,
  analogy:analogyGame,spelling:spellingGame,hiddenword:hiddenWordGame,reading:readingGame,
  palindrome:palindromeGame,wordchain:wordChainGame,crossword:crosswordGame,
  wordguess:wordGuessGame,wordriddle:wordRiddleGame,wordmix:wordMixGame,
  precision:precisionGame,coldsurvival:coldSurvivalGame,nightwatch:nightWatchGame,
  targetrush:arcadeGame,island:survivalGame,
  sequence:sequenceGame,numbermemory:numberMemoryGame,science:()=>quizGame("Ciencia y naturaleza","Responde preguntas de ciencia.",scienceQuestions,50),
  geography:()=>quizGame("Geografía","Países, capitales y lugares.",geographyQuestions,50),
  history:()=>quizGame("Historia","Acontecimientos y civilizaciones.",historyQuestions,50),
  pattern:patternGame,deduction:deductionGame,dailywords:wordGuessGame,quickmath:quickMathGame
 };
 if(id.startsWith("level:")){mathLevelGame(Number(id.split(":")[1]));return;}
 (routes[id]||originalOpenGame)(id);
};
