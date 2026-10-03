// Notes Toolkit - Day 3 assignment

let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" }
];

const VALID_CATEGORIES = ["personal", "work", "study"];

// Returns an array of notes whose text contains `word` (case-insensitive).
function searchNotes(word) {
  const term = String(word).trim().toLowerCase();
  if (term === "") return []; // an empty search matches nothing
  return notes.filter(note => note.text.toLowerCase().includes(term));
}

// Returns the note with the most characters, or null if there are no notes.
function longestNote() {
  if (notes.length === 0) return null;
  let longest = notes[0];
  for (const note of notes) {
    if (note.text.length > longest.text.length) {
      longest = note;
    }
  }
  return longest;
}

// Returns an object counting notes per category.
function countByCategory() {
  const counts = {};
  for (const note of notes) {
    if (counts[note.category]) {
      counts[note.category] += 1;
    } else {
      counts[note.category] = 1;
    }
  }
  return counts;
}

// Returns a sentence such as "5 notes: 2 personal, 1 work, 2 study."
function getSummary() {
  const counts = countByCategory();
  const total = notes.length;
  const word = total === 1 ? "note" : "notes";
  if (total === 0) return `0 ${word}.`;

  const parts = [];
  for (const category of VALID_CATEGORIES) {
    if (counts[category]) parts.push(`${counts[category]} ${category}`);
  }
  return `${total} ${word}: ${parts.join(", ")}.`;
}

// Lower-cases, trims and collapses repeated spaces.
function normalise(text) {
  return String(text).trim().replace(/\s+/g, " ").toLowerCase();
}

// True if a note with the same text (ignoring case and extra spaces) exists.
function isDuplicate(text) {
  const target = normalise(text);
  return notes.some(note => normalise(note.text) === target);
}

// Adds a note if valid. Returns true when added, false otherwise (logs why).
function addNote(text, category) {
  const cleaned = String(text).trim().replace(/\s+/g, " ");

  if (cleaned.length < 1 || cleaned.length > 200) {
    console.log(`Not added: text must be 1-200 characters (got ${cleaned.length}).`);
    return false;
  }
  if (isDuplicate(cleaned)) {
    console.log(`Not added: "${cleaned}" already exists.`);
    return false;
  }
  if (!VALID_CATEGORIES.includes(category)) {
    console.log(`Not added: category must be one of ${VALID_CATEGORIES.join(", ")} (got "${category}").`);
    return false;
  }

  const nextId = notes.length > 0 ? Math.max(...notes.map(n => n.id)) + 1 : 1;
  notes.push({ id: nextId, text: cleaned, category: category });
  return true;
}

// ---------------- Tests ----------------

console.log("--- searchNotes ---");
console.log(searchNotes("the"));
// Expected: array of 2 notes -> id 2 ("Finish the Day 3 assignment") and id 3 ("Email the project report to Grace")
console.log(searchNotes("JAVASCRIPT"));
// Expected: array of 1 note -> id 4 ("Revise JavaScript arrays")  (case ignored)
console.log(searchNotes("zebra"));
// Expected: []  (no results)

console.log("--- longestNote ---");
console.log(longestNote());
// Expected: { id: 3, text: "Email the project report to Grace", category: "work" }
const savedNotes = notes;
notes = [];
console.log(longestNote());
// Expected: null  (empty array)
notes = savedNotes;

console.log("--- countByCategory ---");
console.log(countByCategory());
// Expected: { personal: 2, study: 2, work: 1 }
notes = [];
console.log(countByCategory());
// Expected: {}  (empty array)
notes = savedNotes;

console.log("--- getSummary ---");
console.log(getSummary());
// Expected: "5 notes: 2 personal, 1 work, 2 study."
notes = [{ id: 1, text: "Only one", category: "work" }];
console.log(getSummary());
// Expected: "1 note: 1 work."  (singular "note")
notes = [];
console.log(getSummary());
// Expected: "0 notes."
notes = savedNotes;

console.log("--- isDuplicate ---");
console.log(isDuplicate("  call   MUM  "));
// Expected: true  (ignores case and extra spaces)
console.log(isDuplicate("Walk the dog"));
// Expected: false

console.log("--- addNote ---");
console.log(addNote("Plan weekend trip", "personal"));
// Expected: true  (note added with id 6)
console.log(addNote("call mum", "personal"));
// Expected: logs 'Not added: "call mum" already exists.' then false
console.log(addNote("   ", "work"));
// Expected: logs "Not added: text must be 1-200 characters (got 0)." then false
console.log(addNote("a".repeat(201), "work"));
// Expected: logs "Not added: text must be 1-200 characters (got 201)." then false
console.log(addNote("Go to the gym", "fitness"));
// Expected: logs 'Not added: category must be one of personal, work, study (got "fitness").' then false
console.log(getSummary());
// Expected: "6 notes: 3 personal, 1 work, 2 study."  (only "Plan weekend trip" was added)