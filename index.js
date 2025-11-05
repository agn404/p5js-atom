let vw, vh;
let canvas;
let searchInput;
let elementLabel;
let atomicNumber = 8; // default
let elementsData;

function preload() {
  elementsData = loadJSON("elements.json",
    () => console.log("JSON loaded!"),
    err => console.error("Failed to load JSON:", err)
  );
}

function setup() {
  vw = windowWidth;
  vh = windowHeight;
  canvas = createCanvas(vw * 0.8, document.getElementById('canvasParent').clientHeight * 0.7);
  canvas.parent("#canvasParent");
  textFont("JetBrains Mono");
  angleMode(DEGREES);
  textAlign(CENTER, CENTER);

  // input field
  searchInput = createInput("");
  searchInput.id("sInput");
  searchInput.parent("atnoInput");
  searchInput.size(250, 40);
  searchInput.attribute("placeholder", "Enter atomic number (1–118)");
  searchInput.attribute("type", "number");
  searchInput.attribute("min", "1");
  searchInput.attribute("max", "118");
  searchInput.input(handleSearch);

  elementLabel = document.getElementById("elementLabel");
  
  updateLabel(atomicNumber);

  noLoop();
}

function handleSearch() {
  const val = int(searchInput.value());
  if (!isNaN(val) && val >= 1 && val <= 118) {
    atomicNumber = val;
    updateLabel(atomicNumber)
    redraw();
  }
}

function draw() {
  background(24,13,30);
  drawLDC(atomicNumber);
}

function drawLDC(atomicNumber) {
  const pr = ceil(atomicNumber);
  const el = pr;
  const ne = getNeutron(atomicNumber);
  const w2 = width / 2;
  const h2 = height / 2;
  const hst = h2 - 0.1 * height; //standard height

  // draw nucleus
  fill(250, 100, 120);
  noStroke();
  ellipse(w2, hst, 25, 25);

  // labels
  push();
  fill(255);
  noStroke();
  textAlign(LEFT);
  const fontSize = 17;
  textSize(fontSize);
  text(`protons: ${pr}`,20, hst + fontSize * 3);
  text(`neutrons: ${ne}`, 20, hst + fontSize * 4.5);
  text(`electrons: ${el}`, 20, hst + fontSize * 6);
  textSize(20);
  const configStr = getEleconfig(atomicNumber);
  const map = { "0":"⁰","1":"¹","2":"²","3":"³","4":"⁴","5":"⁵","6":"⁶","7":"⁷","8":"⁸","9":"⁹" }; //map digits to superscript
  const displayConfig = configStr.replace(/([spdf])(\d+)/g, (_, letter, num) => //only replace after [spdf]
  letter + num.split('').map(d => map[d]).join('')
);

text(`config: ${displayConfig}`, 20, hst + fontSize * 7.5);
  pop();

// draw shells + electrons
const shells = getShellDistribution(atomicNumber);
push();
translate(w2, hst);
noFill();
stroke(108, 66, 100);
strokeWeight(1.5);
let baseRadius = 25;

for (let i = 0; i < shells.length; i++) {
  const r = baseRadius * (i + 1);
  ellipse(0, 0, r*2, r*2); //shell
  
  const electrons = shells[i];
  const angleStep = 360 / electrons;
  
  for (let j = 0; j < electrons; j++) {
    const angle = j * angleStep;
    const x = cos(angle) * r;
    const y = sin(angle) * r;
    push();
    noStroke();
    fill(216, 112, 175);
    circle(x, y, 10); //electron
    pop();
  }
}
pop();
}

function getShellDistribution(atomicNumber) {
  const config = getEleconfigObj(atomicNumber); // array of {n, subshell, e}
  const shells = []; // index 0 = K shell (n=1)

  for (let {n, e} of config) {
    if (!shells[n-1]) shells[n-1] = 0;
    shells[n-1] += e;
  }

  return shells.filter(s => s > 0); // remove empty shells
}

function getEleconfigObj(atomicNumber) {
  const configStr = getEleconfig(atomicNumber); // "1s² 2s² 2p⁶..."
  const regex = /(\d)([spdf])(\d+)/g;
  const config = [];
  let match;
  while ((match = regex.exec(configStr)) !== null) {
    config.push({ n: parseInt(match[1]), subshell: match[2], e: parseInt(match[3]) });
  }
  return config;
}

function updateLabel(atomicNumber) {
  const el = elementsData.find(e => e.number === atomicNumber);
  if(el) {
    elementLabel.innerHTML = `${toSuperscript(atomicNumber)}${el.symbol} — ${el.name}`;
  }
}

function getNeutron(atomicNumber) {
  const el = elementsData.find(e => e.number === atomicNumber);
  if (!el) return round(atomicNumber * 1.1); // fallback
  const mass = el.atomicWeight;
  const neutrons = Math.round(mass - atomicNumber);
  return neutrons;
  return round(atomicNumber * 1.1); // fallback
}

function getEleconfig(atomicNumber) {
  const subshells = [
    [1, "s", 2], [2, "s", 2], [2, "p", 6],
    [3, "s", 2], [3, "p", 6], [4, "s", 2],
    [3, "d", 10], [4, "p", 6], [5, "s", 2],
    [4, "d", 10], [5, "p", 6], [6, "s", 2],
    [4, "f", 14], [5, "d", 10], [6, "p", 6],
    [7, "s", 2], [5, "f", 14], [6, "d", 10], [7, "p", 6]
  ];

  let remaining = atomicNumber;
  const config = [];

  // Aufbau fill
  for (let [n, subshell, max] of subshells) {
    if (remaining <= 0) break;
    const filled = Math.min(remaining, max);
    config.push({ n, subshell, e: filled });
    remaining -= filled;
  }

  // Experimental exceptions
  const exceptions = {
    24: [["4s", -1], ["3d", +1]],    // Chromium
    29: [["4s", -1], ["3d", +1]],    // Copper
    41: [["5s", -1], ["4d", +1]],    // Niobium
    42: [["5s", -1], ["4d", +1]],    // Molybdenum
    44: [["5s", -1], ["4d", +1]],    // Ruthenium
    45: [["5s", -1], ["4d", +1]],    // Rhodium
    46: [["5s", -2], ["4d", +2]],    // Palladium (5s0 4d10)
    47: [["5s", -1], ["4d", +1]],    // Silver
    57: [["6s", -1], ["5d", +1]],    // Lanthanum
    58: [["6s", -1], ["4f", +1]],    // Cerium
    64: [["6s", -1], ["4f", +1]],    // Gadolinium
    78: [["6s", -1], ["5d", +1]],    // Platinum
    79: [["6s", -1], ["5d", +1]],    // Gold
    89: [["7s", -1], ["6d", +1]],    // Actinium
    90: [["7s", -1], ["6d", +1]],    // Thorium
    91: [["7s", -1], ["5f", +1]],    // Protactinium
    92: [["7s", -1], ["5f", +1]],    // Uranium
    93: [["7s", -1], ["5f", +1]],    // Neptunium
    96: [["7s", -1], ["5f", +1]],    // Curium
    103: [["7s", -1], ["6d", +1]]    // Lawrencium
  };

  const ex = exceptions[atomicNumber];
  if (ex) {
    ex.forEach(([subshell, delta]) => {
      const target = config.find(c => `${c.n}${c.subshell}` === subshell);
      if (target) target.e = Math.max(0, target.e + delta);
    });
  }

  // Remove empty subshells
  const cleaned = config.filter(c => c.e > 0);

  // Format nicely
  return cleaned.map(c => `${c.n}${c.subshell}${c.e}`).join(" ");
}

function toSuperscript(num) {
  const superscripts = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];
  return num
    .toString()
    .split("")
    .map(d => superscripts[parseInt(d)])
    .join("");
}









