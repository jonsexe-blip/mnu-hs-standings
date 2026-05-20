import { readFileSync, writeFileSync, existsSync } from 'fs';

const WI = new Set(['Madison East', 'Madison West', 'Middleton', 'Verona Area']);

const results = JSON.parse(readFileSync('./rri-results.json', 'utf8'));
const games = JSON.parse(readFileSync('./games.json', 'utf8'));

const mn = results.filter(r => !WI.has(r.team));
mn.forEach((r, i) => r.mnRank = i + 1);

const count = games.length;

// Load previous snapshot for rank-change indicators
const prevPath = './prev-rankings.json';
const prev = existsSync(prevPath) ? JSON.parse(readFileSync(prevPath, 'utf8')) : null;

// chg: positive = moved up, negative = moved down, null = first run
function rankChange(team, newRank) {
  if (!prev) return null;
  const old = prev[team];
  if (old == null) return null;
  return old - newRank; // e.g. was 5, now 3 → +2 (improved)
}

// Build new RRI_MAP block
const lines = mn.map(r => {
  const chg = rankChange(r.team, r.mnRank);
  const chgStr = chg === null ? 'null' : chg;
  return `  ${JSON.stringify(r.team)}:{rri:${r.rri.toFixed(3)},krach:${r.krach.toFixed(3)},calcRank:${r.mnRank},gp:${r.gamesPlayed},chg:${chgStr}}`;
});
const newBlock =
  `// Computed RRI scores from Bradley-Terry MLE on ${count} games (league + Matoska Classic, Spring Jamboree, Hopkins Hustle)\n` +
  `// 4 out-of-state WI teams included in KRACH calculation for SOS accuracy but excluded from MN display\n` +
  `const RRI_MAP = {\n${lines.join(',\n')},\n};`;

// Compute new games since last run
const prevGamesPath = './prev-games.json';
const prevGameKeys = existsSync(prevGamesPath)
  ? new Set(JSON.parse(readFileSync(prevGamesPath, 'utf8')))
  : null;

function gameKey(g) {
  const [t1, s1, t2, s2] = g.team1 < g.team2
    ? [g.team1, g.score1, g.team2, g.score2]
    : [g.team2, g.score2, g.team1, g.score1];
  return `${t1}|${s1}|${t2}|${s2}`;
}

const newGames = prevGameKeys
  ? games.filter(g => !prevGameKeys.has(gameKey(g)))
  : [];

// Build NEW_GAMES JS literal (with run date for staleness check)
const runDate = new Date().toISOString().slice(0, 10);
const newGamesBlock =
  `// Games added in the most recent auto-update run (populated by update-html.mjs)\n` +
  `const LAST_RUN = "${runDate}";\n` +
  `const NEW_GAMES = ${JSON.stringify(newGames)};`;

let html = readFileSync('./index.html', 'utf8');
const original = html;

// Replace RRI_MAP block
html = html.replace(
  /\/\/ Computed RRI scores from Bradley-Terry MLE on \d+ games[\s\S]*?\nconst RRI_MAP = \{[\s\S]*?\n\};/,
  newBlock
);

// Replace NEW_GAMES block
html = html.replace(
  /\/\/ Games added in the most recent auto-update run[\s\S]*?\nconst NEW_GAMES = \[.*?\];/,
  newGamesBlock
);

// Replace game count in key places
html = html.replace(/(<strong id="gameCount">)\d+(<\/strong>)/, `$1${count}$2`);
html = html.replace(/(KRACH\/RRI from )\d+( games using)/, `$1${count}$2`);
html = html.replace(/(from )\d+( games \(league)/g, `$1${count}$2`);
html = html.replace(/(computed from )\d+( games)/g, `$1${count}$2`);
html = html.replace(/(computed from )\d+( games\))/g, `$1${count}$2`);

if (html === original) {
  console.log('No changes — index.html is already up to date.');
} else {
  writeFileSync('./index.html', html);
  console.log(`Updated index.html (${count} games, ${mn.length} MN teams, ${newGames.length} new games).`);
}

// Save current ranks as next run's snapshot
const snapshot = {};
mn.forEach(r => { snapshot[r.team] = r.mnRank; });
writeFileSync(prevPath, JSON.stringify(snapshot, null, 2));
console.log('Saved prev-rankings.json snapshot.');

// Save current game keys as next run's snapshot
const currentKeys = games.map(gameKey);
writeFileSync(prevGamesPath, JSON.stringify(currentKeys, null, 2));
console.log('Saved prev-games.json snapshot.');
