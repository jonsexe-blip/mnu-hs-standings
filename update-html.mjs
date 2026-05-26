import { readFileSync, writeFileSync } from 'fs';

const data = JSON.parse(readFileSync('./state-data.json', 'utf8'));
let html = readFileSync('./index.html', 'utf8');
const original = html;

html = html.replace(
  /\/\/ STATE_DATA_START[\s\S]*?\/\/ STATE_DATA_END/,
  `// STATE_DATA_START\nconst STATE_DATA = ${JSON.stringify(data)};\n// STATE_DATA_END`
);

if (html === original) {
  console.log('No changes — STATE_DATA block not found or already up to date.');
} else {
  writeFileSync('./index.html', html);
  const completed = data.poolGames.filter(g => g.completed).length;
  console.log(`Updated index.html — ${completed}/${data.poolGames.length} pool games completed, ${data.bracketGames.length} bracket games.`);
}
