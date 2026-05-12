import { readFileSync, writeFileSync } from 'fs';

// ── Name normalization ─────────────────────────────────────────────────────────
const NAME_MAP = {
  'Andover': 'Andover',
  'Andover JV': 'Andover JV',
  'Apple Valley': 'Apple Valley',
  'Apple Valley JV': 'Apple Valley JV',
  'Avalon': 'Avalon',
  "Benilde-St. Margaret's": "Benilde-St Margaret's",
  'Blake': 'Blake',
  'Bloomington Ultimate Frisbee HS': 'Bloomington',
  'Cathedral': 'Cathedral',
  'Cooper Armstrong HS Open': 'Robbinsdale Cooper',
  'Cretin-Derham Hall': 'Cretin-Derham Hall',
  'Eagan Boys': 'Eagan',
  'Eagan JV Blue': 'Eagan JV',
  'East Ridge': 'East Ridge',
  'East Ridge JV': 'East Ridge JV',
  'Eden Prairie': 'Eden Prairie',
  'Edina': 'Edina',
  'Edina JV1': 'Edina JV1',
  'Edina JV2': 'Edina JV2',
  'Great River School': 'Great River School',
  'Great River School JV': 'Great River School JV',
  'Hastings': 'Hastings',
  'Hopkins JV': 'Hopkins JV',
  'Hopkins MMP Varsity': 'Hopkins',
  'Irondale': 'Irondale',
  'Lakeville North': 'Lakeville North',
  'Lakeville South': 'Lakeville South',
  'Maple Grove': 'Maple Grove',
  'Minneapolis South JV': 'Minneapolis South JV',
  'Minneapolis Southwest': 'Minneapolis Southwest',
  'Minneapolis Squall Open Varsity': 'Minneapolis South',
  'Minneapolis Squall Open JV': 'Minneapolis South JV',
  'Minnetonka': 'Minnetonka',
  'Minnetonka Narwhal Open Varsity': 'Minnetonka',
  'Minnetonka Narwhal Open JV': 'Minnetonka JV',
  'Mounds View': 'Mounds View',
  'Mounds View JV': 'Mounds View JV',
  'Mounds View JV1': 'Mounds View JV',
  'Mounds View JV2': 'Mounds View JV2',
  'Open World Learning Community - Open JV': 'Open World Learning Community JV',
  'Open World Learning Community - Open Varsity': 'Open World Learning Community',
  'OWLC Open JV': 'Open World Learning Community JV',
  'Prior Lake': 'Prior Lake',
  'Prior Lake JV': 'Prior Lake JV',
  'Prior Lake Varsity': 'Prior Lake',
  'Providence Academy High School Mixed': 'Providence Academy',
  'Red Wing': 'Red Wing',
  'Richfield Roundabouts': 'Richfield',
  'Rosemount': 'Rosemount',
  'Roseville Riptide': 'Roseville',
  'St Louis Park JV': 'St Louis Park JV',
  'St Thomas Academy': 'St Thomas Academy',
  'St. Louis Park - Open JV': 'St Louis Park JV',
  'St. Louis Park Boys Ultimate': 'St Louis Park',
  'St. Louis Park Open Varsity': 'St Louis Park',
  'St. Paul Academy': 'St Paul Academy',
  'St. Paul Central Revolution - Open JV': 'St Paul Central JV',
  'St. Paul Central Revolution - Open Varsity': 'St Paul Central',
  'Stillwater Open': 'Stillwater Area',
  'Stillwater Area': 'Stillwater Area',
  'Washburn Open': 'Minneapolis Washburn',
  'Washburn Open-JV': 'Minneapolis Washburn JV',
  'Wayzata': 'Wayzata',
  'White Bear Lake Bears Open Varsity': 'White Bear Lake',
  'White Bear Lake Bears Open JV': 'White Bear Lake JV',
  'White Bear Lake JV': 'White Bear Lake JV',
  'Woodbury Ultimate': 'Woodbury',
  // Out-of-state teams (Wisconsin) — included for SOS, excluded from display
  'Madison East': 'Madison East',
  'Madison West': 'Madison West',
  'Middleton': 'Middleton',
  'Verona Area': 'Verona Area',
};

function norm(name) { return NAME_MAP[name] || name; }

// ── Load & normalize games ─────────────────────────────────────────────────────
const raw = JSON.parse(readFileSync('./games.json', 'utf8'));
const games = raw.map(g => ({
  team1: norm(g.team1), score1: g.score1,
  team2: norm(g.team2), score2: g.score2,
}));

// Find any unmapped names
const allNames = new Set();
games.forEach(g => { allNames.add(g.team1); allNames.add(g.team2); });
const known = new Set(Object.values(NAME_MAP));
const unmapped = [...allNames].filter(n => !known.has(n));
if (unmapped.length) { console.log('UNMAPPED teams:', unmapped); process.exit(1); }

const TEAMS = [...allNames].sort();
console.log(`Teams: ${TEAMS.length}, Games: ${games.length}`);

// ── Build game matrix ──────────────────────────────────────────────────────────
// For each pair (i,j): number of games and RRI win values for team i
const idx = {};
TEAMS.forEach((t,i) => idx[t] = i);
const N = TEAMS.length;

// wins[i] = total RRI win value for team i (score-weighted)
// games_ij[i][j] = total games between teams i and j
const wins = new Float64Array(N).fill(0);
const gamesMatrix = Array.from({length:N}, () => new Float64Array(N).fill(0));

for (const g of games) {
  const i = idx[g.team1];
  const j = idx[g.team2];
  const total = g.score1 + g.score2;
  if (total === 0) continue; // skip 0-0 games
  const v1 = g.score1 / total; // RRI win value for team1
  const v2 = g.score2 / total; // RRI win value for team2
  wins[i] += v1;
  wins[j] += v2;
  gamesMatrix[i][j] += 1;
  gamesMatrix[j][i] += 1;
}

// ── KRACH iterative computation (Bradley-Terry MLE) ───────────────────────────
// KRACH_i = wins_i / Σ_j [ gamesMatrix[i][j] / (KRACH_i + KRACH_j) ]
// Iterate until convergence.
// For teams with 0 wins, add a tiny virtual win (Laplace smoothing)

const MIN_WIN = 0.01; // small epsilon to avoid log(0)
for (let i = 0; i < N; i++) {
  if (wins[i] < MIN_WIN) wins[i] = MIN_WIN;
}

let krach = new Float64Array(N).fill(1.0);

const MAX_ITER = 5000;
const TOLERANCE = 1e-9;

for (let iter = 0; iter < MAX_ITER; iter++) {
  const newKrach = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    let denom = 0;
    for (let j = 0; j < N; j++) {
      if (gamesMatrix[i][j] > 0 && i !== j) {
        denom += gamesMatrix[i][j] / (krach[i] + krach[j]);
      }
    }
    newKrach[i] = denom > 0 ? wins[i] / denom : krach[i];
  }

  // Normalize to geometric mean = 1
  const logSum = newKrach.reduce((s,v) => s + Math.log(v), 0);
  const logMean = logSum / N;
  const scale = Math.exp(-logMean);
  for (let i = 0; i < N; i++) newKrach[i] *= scale;

  // Check convergence
  let maxDelta = 0;
  for (let i = 0; i < N; i++) {
    maxDelta = Math.max(maxDelta, Math.abs(newKrach[i] - krach[i]));
  }
  krach = newKrach;
  if (maxDelta < TOLERANCE) {
    console.log(`Converged after ${iter+1} iterations (max delta: ${maxDelta.toExponential(2)})`);
    break;
  }
  if (iter === MAX_ITER - 1) console.log('Warning: did not converge');
}

// ── Compute RRI = ln(KRACH) ────────────────────────────────────────────────────
const results = TEAMS.map((team, i) => ({
  team,
  krach: krach[i],
  rri: Math.log(krach[i]),
  wins: wins[i],
  gamesPlayed: games.filter(g => g.team1===team || g.team2===team).length,
})).sort((a,b) => b.rri - a.rri);

// Rank by RRI
results.forEach((r,i) => { r.rriRank = i+1; });

console.log('\n── RRI Rankings ────────────────────────────────────────────────────');
console.log('Rank  Team                                    RRI     KRACH    Games');
results.forEach(r => {
  const name = r.team.padEnd(42);
  const rri = r.rri.toFixed(3).padStart(7);
  const krach = r.krach.toFixed(4).padStart(9);
  const gp = String(r.gamesPlayed).padStart(5);
  console.log(`${String(r.rriRank).padStart(4)}  ${name} ${rri} ${krach} ${gp}`);
});

writeFileSync('./rri-results.json', JSON.stringify(results, null, 2));
console.log('\nSaved to rri-results.json');
