const DATA_URL = "data/family.json";
const FOLLIES_URL = "data/folly.json";
const STORAGE_ROUND_KEY = "familyTrivia_round";

let familyData = [];
let roundNumber = 0;
let currentPerson = null;
let currentAnecdote = null;
let maxAnecdotes = 0;
let gridState = []; // { id, revealedType: 'none'|'photo'|'sad' }
let follyPrompts = [];
let follyFlag = 0;
let loadedImages = {};
let promptIdx = 0;

const headerRound = document.getElementById("round-display");
const roundUpBtn = document.getElementById("roundUp-btn");
const roundDownBtn = document.getElementById("roundDown-btn");
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
const soundBeaned = document.getElementById("sound-beaned");
const soundFolly = document.getElementById("sound-folly");

/* init(); */

export function init(familyJson, follyJson, images) {
  familyData = familyJson.family;
  //follyPrompts = follyJson.prompts;
  follyPrompts = follyJson.anecdotes || [];
  loadedImages = images; // keyed by filename
 
  getMaxAnecdotes();
  loadRound();
  updateRoundDisplay();
  buildInitialGrid();
  attachEvents();
  restartBtn.hidden = true;
}

/*
async function loadData() {
  const res = await fetch(DATA_URL);
  const json = await res.json();
  familyData = json.family || [];
}

async function loadFollies() {
  try {
    const res = await fetch(FOLLIES_URL);
    const json = await res.json();
    follyPrompts = json.prompts || [];
  } catch (e) {
    follyPrompts = [];
  }

} */

//find the largest number of stories anyone has
function getMaxAnecdotes() { 
  maxAnecdotes = Math.max(...familyData.map(p => p.anecdotes.length));
  //alert("maxAnecdotes = " + maxAnecdotes);
}

//get the round number saved in local storage in the browser
//roundNumber is 0 based, so brace yourself for confusion
function loadRound() {  
  const stored = localStorage.getItem(STORAGE_ROUND_KEY);
  roundNumber = stored ? parseInt(stored, 10) : 0;  //convert roundNumber to Int
}

function saveRound() {
  localStorage.setItem(STORAGE_ROUND_KEY, String(roundNumber));  //save roundNumber as String
}

function nextRound(step) {
  if (roundNumber <= 0 && step == -1) return;
  if (roundNumber >= maxAnecdotes-1 && step == 1) roundNumber = -1;
  roundNumber += step;
  saveRound();
  updateRoundDisplay();
  resetRound();
}

function resetRound() {
  // same round number, just reset grid state
  buildInitialGrid();
  clearStatusIndicators();
  hideQASection();
  playBtn.hidden = false;
  //restartBtn.hidden = true;
}

function updateRoundDisplay() {
  const currentRound = roundNumber + 1;
  const totalRounds = maxAnecdotes;

  headerRound.textContent = `Round: ${currentRound} of ${totalRounds}`;
}

function attachEvents() {
  playBtn.addEventListener("click", startRound);
  restartBtn.addEventListener("click", resetRound);
  roundDownBtn.addEventListener("click", () => nextRound(-1));
  roundUpBtn.addEventListener("click", () => nextRound(1));
  continueBtn.addEventListener("click", onContinue);
  document.getElementById("round-ended-ok").addEventListener("click", () => {
    document.getElementById("round-ended-modal").classList.add("hidden");
  });
}

function buildInitialGrid() {
  gridEl.innerHTML = "";
  gridState = familyData.map(person => ({
    id: person.id,
    revealedType: "none"
  }));

  familyData.forEach(person => {
    const item = document.createElement("div");
    item.className = "grid-item";
    item.dataset.id = person.id;

    // Create an <img> element
    const imgEl = document.createElement("img");

    // Retrieve the preloaded bitmap using the filename
    const imgBitmap = loadedImages[person.photo];

    if (imgBitmap) {
      // Use the already-loaded bitmap
      imgEl.src = imgBitmap.src;
    } else {
      console.warn("Missing preloaded image for:", person.photo);
      imgEl.alt = person.name;
    }

    item.appendChild(imgEl);
    gridEl.appendChild(item);

    console.log("Game wants image:", person.photo);
  });

  restartBtn.hidden = true;
  hideQASection();
}


function startRound() {
  // scramble positions and hide with colors
  const shuffled = shuffleArray([...gridState]);
  gridState = shuffled;
  playBtn.hidden = true;  //Hide the Play button once the round has started
  restartBtn.hidden = false;  //Show the Restart Round button once the round has started
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
  //gridSection.style.transform = "translateY(-10px)";
  gridSection.classList.add("hidden");
}

function disableTopButtons() {  //Disable the top buttons while the QA section is showing
  restartBtn.disabled = true;
  restartBtn.classList.add("disabled");
  playBtn.disabled = true;
  playBtn.classList.add("disabled");
  roundUpBtn.disabled = true;
  roundUpBtn.classList.add("disabled");
  roundDownBtn.disabled = true;
  roundDownBtn.classList.add("disabled");
}

function enableTopButtons() {  //Enable the top buttons while the Grid section is showing
  restartBtn.disabled = false;
  restartBtn.classList.remove("disabled");
  playBtn.disabled = false;
  playBtn.classList.remove("disabled");
  roundUpBtn.disabled = false;
  roundUpBtn.classList.remove("disabled");
  roundDownBtn.disabled = false;
  roundDownBtn.classList.remove("disabled");
}

function showQAForPerson(person, anecdote) {
  qaSection.classList.remove("hidden");
  disableTopButtons();

  //here is where we set how often to do Follies (0.15 percent)
  if (Math.random() < 0.15 && follyPrompts.length > 0 && !follyFlag) {
    follyFlag = 1;
    showFolly(person, anecdote);  
    return;
  }
  follyFlag = 0;
  //personPhotoEl.src = person.photo;
  //personPhotoEl.src = loadedImages[person.photo];
  personPhotoEl.src = loadedImages[person.photo].src;

  personPhotoEl.alt = person.name;
  questionTextEl.textContent = anecdote.question;
  anecdoteEl.textContent = anecdote.story;
  anecdoteEl.classList.add("hidden");
  
  if (person.name.toLowerCase().startsWith("wildcard")) {
    soundBeaned.play();  //play sound
    //personNameEl.textContent = "You've been Beaned!";
    personNameEl.textContent = anecdote.story;
    setRevealedType(person, "photo");
  }
  else { 
    personNameEl.textContent = person.name;
    continueBtn.classList.add("hidden");
    buildAnswers(anecdote);
  } 
}

/*function showFolly() {
  soundFolly.play(); //play sound
  promptIdx = Math.floor(Math.random() * follyPrompts.length);
  //alert("Folly " + promptIdx);
  personPhotoEl.src = "images/folly.jpg";
  personNameEl.textContent = "Family Follies!";
  questionTextEl.textContent = follyPrompts[promptIdx];
  anecdoteEl.textContent = "";
  continueBtn.classList.remove("hidden");
  //follyFlag = 1;
}*/

function showFolly(person, anecdote) {
  soundFolly.play();

  // Pick a random folly anecdote
  const idx = Math.floor(Math.random() * follyPrompts.length);
  const folly = follyPrompts[idx];

  // Use the follies photo if it was preloaded
  const folliesPhoto = loadedImages["follies.jpg"] || loadedImages["folly.jpg"];

  if (folliesPhoto) {
    personPhotoEl.src = folliesPhoto.src;
  } else {
    personPhotoEl.src = "images/folly.jpg"; // fallback
  }

  personNameEl.textContent = folly.story; //"Family Follies!";
  questionTextEl.textContent = folly.question || ""; //follyPrompts[promptIdx];
  anecdoteEl.textContent = "";
  continueBtn.classList.remove("hidden");
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

  /*
  // status square in header
  const sq = document.createElement("div");
  sq.className = "status-square " + (isCorrect ? "correct" : "incorrect");
  statusIndicators.appendChild(sq);
  */

  // show anecdote, hide answers
  answersForm.innerHTML = "";
  anecdoteEl.classList.remove("hidden");
  continueBtn.classList.remove("hidden");

  /*// update grid state for this person
  const entry = gridState.find(s => s.id === currentPerson.id);
  if (entry) {
    entry.revealedType = isCorrect ? "photo" : "sad";
  }*/

  setRevealedType(currentPerson, isCorrect ? "photo" : "sad");  
      
}

function setRevealedType(person, type) {
  const entry = gridState.find(s => s.id === person.id);
  if (entry) {
    entry.revealedType = type;
  }
}


function onContinue() {
  // slide grid back down
  //gridSection.style.transform = "translateY(0)";
  if (follyFlag) {
    //follyFlag = 0;
    showQAForPerson(currentPerson, currentAnecdote);
    return;
  }

  gridSection.classList.remove("hidden");

  // update grid visuals
  updateGridVisuals();

  hideQASection();
  enableTopButtons();

  // check if all done
  if (gridState.every(s => s.revealedType !== "none")) {
    // round finished
    nextRound(1);
    //alert("Round complete! Next time you play, new stories will be used.");
    showRoundEnded("Nice job! Get ready for the next round.");
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
      const imgEl = document.createElement("img");

      // Retrieve the preloaded bitmap using the filename
      const imgBitmap = loadedImages[person.photo];

      if (imgBitmap) {
        imgEl.src = imgBitmap.src;   // Use the decoded bitmap
      } else {
        console.warn("Missing preloaded image for:", person.photo);
        imgEl.alt = person.name;
      }

      item.appendChild(imgEl);
      item.classList.add("disabled");

    } else if (entry.revealedType === "sad") {
      const frame = Math.floor(Math.random() * 8);
      const sprite = document.createElement("div");
      sprite.className = "sad-sprite";
      sprite.style.backgroundPosition = `-${frame * 100}px 0`;
      item.appendChild(sprite);
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
  const colors = ["#3167a5", "#ffab40", "#fcf817", "#2ba74a", "#40c4ff", "#b388ff", "#ff80ab"];
  return colors[Math.floor(Math.random() * colors.length)];
}

function showRoundEnded(message) {
  const modal = document.getElementById("round-ended-modal");
  const msg = document.getElementById("round-ended-message");

  msg.textContent = message;
  modal.classList.remove("hidden");
}

