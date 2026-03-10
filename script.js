const DATA_URL = "data/family.json";
const STORAGE_ROUND_KEY = "familyTrivia_round";

let familyData = [];
let roundNumber = 0;
let currentPerson = null;
let currentAnecdote = null;
let gridState = []; // { id, revealedType: 'none'|'photo'|'sad' }

const headerRound = document.getElementById("round-display");
const playBtn = document.getElementById("play-btn");
const restartBtn = document.getElementById("restart-btn");
const gridSection = document.getElementById("grid-section");
const gridEl = document.getElementById("grid");
const qaSection = document.getElementById("qa-section");
const personNameEl = document.getElementById("person-name");
const personPhotoEl = document.getElementById("person-photo");
const questionTextEl = document.getElementById("question-text");
const answersForm = document.getElementById("answers-form");
const anecdoteEl = document.getElementById("anecdote");
const continueBtn = document.getElementById("continue-btn");
const statusIndicators = document.getElementById("status-indicators");
const soundCorrect = document.getElementById("sound-correct");
const soundIncorrect = document.getElementById("sound-incorrect");

init();

async function init() {
  await loadData();
  loadRound();
  updateRoundDisplay();
  buildInitialGrid();
  attachEvents();
}

async function loadData() {
  const res = await fetch(DATA_URL);
  const json = await res.json();
  familyData = json.family || [];
}

function loadRound() {
  const stored = localStorage.getItem(STORAGE_ROUND_KEY);
  roundNumber = stored ? parseInt(stored, 10) : 0;
}

function saveRound() {
  localStorage.setItem(STORAGE_ROUND_KEY, String(roundNumber));
}

function nextRound() {
  roundNumber++;
  saveRound();
  updateRoundDisplay();
}

function resetRound() {
  // same round number, just reset grid state
  buildInitialGrid();
  clearStatusIndicators();
  hideQASection();
}

function updateRoundDisplay() {
  headerRound.textContent = `Round: ${roundNumber + 1}`;
}

function attachEvents() {
  playBtn.addEventListener("click", startRound);
  restartBtn.addEventListener("click", resetRound);
  continueBtn.addEventListener("click", onContinue);
}

function buildInitialGrid() {
  gridEl.innerHTML = "";
  gridState = familyData.map(person => ({
    id: person.id,
    revealedType: "none"
  }));

  // initial: show real photos
  familyData.forEach(person => {
    const item = document.createElement("div");
    item.className = "grid-item";
    item.dataset.id = person.id;

    const img = document.createElement("img");
    img.src = person.photo;
    img.alt = person.name;

    item.appendChild(img);
    gridEl.appendChild(item);
  });

  hideQASection();
}

function startRound() {
  // scramble positions and hide with colors
  const shuffled = shuffleArray([...gridState]);
  gridState = shuffled;

  gridEl.innerHTML = "";
  shuffled.forEach((entry, index) => {
    const person = getPersonById(entry.id);
    const item = document.createElement("div");
    item.className = "grid-item";
    item.dataset.id = person.id;
    item.dataset.index = index;

    const colorDiv = document.createElement("div");
    colorDiv.className = "color-square";
    colorDiv.style.backgroundColor = randomColor();

    item.appendChild(colorDiv);
    item.addEventListener("click", onGridItemClick);

    gridEl.appendChild(item);
  });

  clearStatusIndicators();
  hideQASection();
}

function onGridItemClick(e) {
  const item = e.currentTarget;
  if (item.classList.contains("disabled")) return;

  const id = item.dataset.id;
  const stateEntry = gridState.find(s => s.id === id);
  if (!stateEntry || stateEntry.revealedType !== "none") return;

  currentPerson = getPersonById(id);
  currentAnecdote = getAnecdoteForCurrentRound(currentPerson);

  showQAForPerson(currentPerson, currentAnecdote);

  // slide grid up (visual cue)
  gridSection.style.transform = "translateY(-10px)";
}

function showQAForPerson(person, anecdote) {
  qaSection.classList.remove("hidden");
  personNameEl.textContent = person.name;
  personPhotoEl.src = person.photo;
  personPhotoEl.alt = person.name;
  questionTextEl.textContent = anecdote.question;
  anecdoteEl.textContent = anecdote.story;
  anecdoteEl.classList.add("hidden");
  continueBtn.classList.add("hidden");

  buildAnswers(anecdote);
}

function buildAnswers(anecdote) {
  answersForm.innerHTML = "";

  anecdote.answers.forEach((answer, idx) => {
    const label = document.createElement("label");
    label.className = "answer-option";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "answer";
    input.value = idx;

    const span = document.createElement("span");
    span.textContent = answer;

    label.appendChild(input);
    label.appendChild(span);
    answersForm.appendChild(label);
  });

  answersForm.addEventListener("change", onAnswerSelected, { once: true });
}

function onAnswerSelected() {
  const selected = answersForm.querySelector("input[name='answer']:checked");
  if (!selected) return;

  const chosenIndex = parseInt(selected.value, 10);
  const correctIndex = currentAnecdote.correct;

  const isCorrect = chosenIndex === correctIndex;
  showResult(isCorrect);
}

function showResult(isCorrect) {
  // play sound
  try {
    (isCorrect ? soundCorrect : soundIncorrect).play();
  } catch (e) {
    // ignore autoplay issues
  }

  // status square in header
  const sq = document.createElement("div");
  sq.className = "status-square " + (isCorrect ? "correct" : "incorrect");
  statusIndicators.appendChild(sq);

  // show anecdote, hide answers
  answersForm.innerHTML = "";
  anecdoteEl.classList.remove("hidden");
  continueBtn.classList.remove("hidden");

  // update grid state for this person
  const entry = gridState.find(s => s.id === currentPerson.id);
  if (entry) {
    entry.revealedType = isCorrect ? "photo" : "sad";
  }
}

function onContinue() {
  // slide grid back down
  gridSection.style.transform = "translateY(0)";

  // update grid visuals
  updateGridVisuals();

  hideQASection();

  // check if all done
  if (gridState.every(s => s.revealedType !== "none")) {
    // round finished
    nextRound();
    alert("Round complete! Next time you play, new anecdotes will be used.");
  }
}

function hideQASection() {
  qaSection.classList.add("hidden");
}

function updateGridVisuals() {
  gridEl.innerHTML = "";

  gridState.forEach((entry, index) => {
    const person = getPersonById(entry.id);
    const item = document.createElement("div");
    item.className = "grid-item";
    item.dataset.id = person.id;
    item.dataset.index = index;

    if (entry.revealedType === "none") {
      const colorDiv = document.createElement("div");
      colorDiv.className = "color-square";
      colorDiv.style.backgroundColor = randomColor();
      item.appendChild(colorDiv);
      item.addEventListener("click", onGridItemClick);
    } else if (entry.revealedType === "photo") {
      const img = document.createElement("img");
      img.src = person.photo;
      img.alt = person.name;
      item.appendChild(img);
      item.classList.add("disabled");
    } else if (entry.revealedType === "sad") {
      const sad = document.createElement("div");
      sad.style.width = "100%";
      sad.style.height = "100%";
      sad.style.display = "flex";
      sad.style.alignItems = "center";
      sad.style.justifyContent = "center";
      sad.style.fontSize = "40px";
      sad.textContent = "☹";
      item.appendChild(sad);
      item.classList.add("disabled");
    }

    gridEl.appendChild(item);
  });
}

function clearStatusIndicators() {
  statusIndicators.innerHTML = "";
}

function getPersonById(id) {
  return familyData.find(p => p.id === id);
}

function getAnecdoteForCurrentRound(person) {
  const anecdotes = person.anecdotes || [];
  if (anecdotes.length === 0) {
    return {
      question: "No anecdotes defined.",
      answers: ["", "", "", ""],
      correct: 0,
      story: ""
    };
  }
  const index = roundNumber % anecdotes.length;
  return anecdotes[index];
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function randomColor() {
  const colors = ["#ff8a80", "#ffab40", "#ffd740", "#69f0ae", "#40c4ff", "#b388ff", "#ff80ab"];
  return colors[Math.floor(Math.random() * colors.length)];
}