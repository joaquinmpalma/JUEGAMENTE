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
    ["reading","Comprensión lectora","Lee con atención y deduce","▤"]
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
  gameContent.innerHTML = '<div class="hub-heading"><span>'+hub.tag+'</span><span>'+String(hub.items.length).padStart(2,"0")+' MODOS</span></div><div class="hub-grid">'+hub.items.map((item,index)=>'<button type="button" class="hub-item" data-hub-game="'+item[0]+'"><span class="hub-item-icon">'+item[3]+'</span><span class="hub-item-copy"><b>'+item[1]+'</b><small>'+item[2]+'</small></span><span class="hub-item-arrow">↗</span></button>').join("")+'</div><button type="button" class="hub-back" id="hub-back">← Volver al inicio</button>';
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
  const render=()=>{if(index>=list.length){finishSimpleGame("¡Buen vocabulario!", "Resolviste "+correct+" de 6 anagramas.");return;}document.querySelector("#word-index").textContent=index+1;document.querySelector("#scrambled-word").textContent=list[index].scramble.split("").join("  ");document.querySelector("#word-hint").textContent="Pista: "+list[index].hint;document.querySelector("#text-answer").value="";};
  document.querySelector("#text-answer-form").addEventListener("submit",e=>{e.preventDefault();const ok=normText(document.querySelector("#text-answer").value)===normText(list[index].answer);if(ok){correct++;addPoints(15);document.querySelector("#word-correct").textContent=correct;document.querySelector("#text-feedback").textContent="¡Correcto! +15 puntos";}else document.querySelector("#text-feedback").textContent="No es esa palabra. Inténtalo otra vez.";if(ok)setTimeout(()=>{index++;render();},650);});
  render();
}
const cryptoChallenges=[
  {cipher:"MB DBTB FTUB FO FM CPMTRVF",answer:"la casa esta en el bosque",hint:"Cada letra se ha desplazado una posición hacia adelante en el alfabeto."},
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
  setGame("Matemáticas · "+data.title,data.desc+' Cada ejercicio correcto suma 20 puntos.', '<div class="math-progress"><span>Nivel '+(level+1)+' de 8</span><span>Ejercicio <b id="math-index">1</b>/'+questions.length+'</span></div><div class="math-question" id="math-question"></div><div class="math-workspace"><div class="math-input-area"><label for="math-answer">Tu respuesta matemática</label><math-field id="math-answer" virtual-keyboard-mode="manual" smart-fence></math-field><div class="math-symbol-row"><button type="button" data-insert="\frac{#@}{#?}">a/b</button><button type="button" data-insert="^{#?}">x²</button><button type="button" data-insert="\sqrt{#0}">√</button><button type="button" data-insert="\pi">π</button><button type="button" data-insert="\log\left(#0\right)">log</button><button type="button" data-insert="\sin\left(#0\right)">sen</button><button type="button" data-insert="\cdot">·</button><button type="button" data-insert="\le">≤</button><button type="button" data-insert="\infty">∞</button></div><div class="math-actions"><button type="button" class="math-keyboard" id="show-math-keyboard">⌨ Teclado matemático</button><button type="button" class="math-check" id="check-math">Comprobar respuesta</button></div><p class="game-hint" id="math-feedback" aria-live="polite"></p></div><div class="math-board-area"><div class="board-heading"><b>Mi pizarra</b><button type="button" id="clear-board">Limpiar</button></div><canvas id="math-board" aria-label="Pizarra para desarrollar el ejercicio"></canvas><small>Escribe o dibuja con el mouse, lápiz o dedo.</small></div></div><div class="math-explanation" id="math-explanation" hidden></div><div class="math-level-footer"><button type="button" class="hub-back" id="math-level-back">← Niveles</button><span>Tu progreso se guarda en este dispositivo.</span></div>');
  const field=document.querySelector("#math-answer");
  const feedback=document.querySelector("#math-feedback");
  const render=()=>{if(index>=questions.length){showResult("¡Nivel completado!", "Respuestas correctas: "+correct+" de "+questions.length+". Puedes volver a elegir un nivel o seguir avanzando.");return;}document.querySelector("#math-index").textContent=index+1;document.querySelector("#math-question").textContent=questions[index].q;field.value="";feedback.textContent="";document.querySelector("#math-explanation").hidden=true;};
  document.querySelectorAll("[data-insert]").forEach(button=>button.addEventListener("click",()=>{field.focus();field.executeCommand(["insert",button.dataset.insert]);}));
  document.querySelector("#show-math-keyboard").addEventListener("click",()=>{field.focus();if(window.mathVirtualKeyboard){window.mathVirtualKeyboard.layouts=["numeric","symbols","alphabetic","greek"];window.mathVirtualKeyboard.show();}});
  document.querySelector("#check-math").addEventListener("click",()=>{
    const raw=field.getValue("ascii-math").trim();
    const normalized=raw.replace(/\s/g,"").replace(/,/g,".").replace(/[{}]/g,"").toLowerCase();
    const expected=questions[index].a.replace(/\s/g,"").replace(/,/g,".").toLowerCase();
    const numeric=Number(normalized);
    const numericExpected=Number(expected);
    const correctAnswer=normalized===expected || (normalized!=="" && Number.isFinite(numeric) && Number.isFinite(numericExpected) && Math.abs(numeric-numericExpected)<0.0001);
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
