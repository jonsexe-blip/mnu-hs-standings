import { readFileSync, writeFileSync } from 'fs';

const WI = new Set(['Madison East', 'Madison West', 'Middleton', 'Verona Area']);

const results = JSON.parse(readFileSync('./rri-results.json', 'utf8'));
const games = JSON.parse(readFileSync('./games.json', 'utf8'));

const mn = results.filter(r => !WI.has(r.team));
mn.forEach((r, i) => r.mnRank = i + 1);

const count = games.length;

// Build new RRI_MAP block
const lines = mn.map(r =>
  `  ${JSON.stringify(r.team)}:{rri:${r.rri.toFixed(3)},krach:${r.krach.toFixed(3)},calcRank:${r.mnRank},gp:${r.gamesPlayed}}`
);
const newBlock =
  `// Computed RRI scores from Bradley-Terry MLE on ${count} games (league + Matoska Classic, Spring Jamboree, Hopkins Hustle)\n` +
  `// 4 out-of-state WI teams included in KRACH calculation for SOS accuracy but excluded from MN display\n` +
  `const RRI_MAP = {\n${lines.join(',\n')},\n};`;

let html = readFileSync('./index.html', 'utf8');
const original = html;

// Replace RRI_MAP block
html = html.replace(
  /\/\/ Computed RRI scores from Bradley-Terry MLE on \d+ games[\s\S]*?\nconst RRI_MAP = \{[\s\S]*?\n\};/,
  newBlock
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
  console.log(`Updated index.html (${count} games, ${mn.length} MN teams).`);
}
