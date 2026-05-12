import { readFileSync, writeFileSync } from 'fs';

// Game-list-item parser (same logic as parse-games.mjs)
function parseGamesFromHtml(html) {
  const games = [];
  const blocks = html.split(/id="game-list-item-\d+"/);
  blocks.shift();
  for (const block of blocks) {
    const teamMatches = [...block.matchAll(/btn-label">([^<]+)<\/span>/g)].slice(0, 2);
    if (teamMatches.length < 2) continue;
    const scoreMatches = [...block.matchAll(/<div class="[^"]*\bscore\b[^"]*\btext-strong\b[^"]*">\s*(\d+)\s*<\/div>/g)].slice(0, 2);
    if (scoreMatches.length < 2) continue;
    games.push({
      team1: teamMatches[0][1].trim(),
      score1: parseInt(scoreMatches[0][1]),
      team2: teamMatches[1][1].trim(),
      score2: parseInt(scoreMatches[1][1]),
    });
  }
  return games;
}

async function fetchAllPages(baseUrl) {
  const firstHtml = await fetch(baseUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }).then(r => r.text());
  const pageNums = [...firstHtml.matchAll(/page=(\d+)/g)].map(m => parseInt(m[1]));
  const maxPage = Math.max(...pageNums, 1);
  console.log(`  Pages: ${maxPage}`);

  const allGames = parseGamesFromHtml(firstHtml);
  console.log(`  Page 1: ${allGames.length} games`);

  for (let p = 2; p <= maxPage; p++) {
    const html = await fetch(`${baseUrl}?page=${p}`, { headers: { 'User-Agent': 'Mozilla/5.0' } }).then(r => r.text());
    const games = parseGamesFromHtml(html);
    console.log(`  Page ${p}: ${games.length} games`);
    allGames.push(...games);
    await new Promise(r => setTimeout(r, 300));
  }
  return allGames;
}

// Tournament URLs (only what's available per the user)
const TOURNAMENT_URLS = [
  { label: 'Matoska Classic D1', url: 'https://mnyu.ultimatecentral.com/e/2026-matoska-classic/schedule/division/Open+D1/stage/all' },
  { label: 'Matoska Classic D2', url: 'https://mnyu.ultimatecentral.com/e/2026-matoska-classic/schedule/division/Open+D2/stage/all' },
  { label: 'Matoska Classic D3', url: 'https://mnyu.ultimatecentral.com/e/2026-matoska-classic/schedule/division/Open+D3/stage/all' },
  { label: 'Spring Jamboree',    url: 'https://edinaultimate.org/e/jamboree26/schedule/division/Open/stage/163191' },
  // Hopkins Hustle D1: only bracket (no pool play), no D2/D3 available
  { label: 'Hopkins Hustle D1',  url: 'https://mnyu.ultimatecentral.com/e/2026-hopkins-hustle/schedule' },
];

const allTournamentGames = [];
for (const { label, url } of TOURNAMENT_URLS) {
  console.log(`\nFetching ${label}...`);
  const games = await fetchAllPages(url);
  console.log(`  Total: ${games.length} games`);
  allTournamentGames.push(...games);
}

console.log(`\nTotal tournament games (raw): ${allTournamentGames.length}`);

// Name normalization (union of all known names)
const NAME_MAP = {
  'Andover': 'Andover', 'Andover JV': 'Andover JV', 'Andover Open Varsity': 'Andover',
  'Apple Valley': 'Apple Valley', 'Apple Valley JV': 'Apple Valley JV', 'Apple Valley Open': 'Apple Valley', 'Apple Valley Open JV': 'Apple Valley JV',
  'Avalon': 'Avalon',
  "Benilde-St. Margaret's": "Benilde-St Margaret's", "Benilde-St. Margaret's Open": "Benilde-St Margaret's",
  'Blake': 'Blake', 'Blake Open': 'Blake',
  'Bloomington Ultimate Frisbee HS': 'Bloomington', 'Bloomington Open': 'Bloomington',
  'Cathedral': 'Cathedral', 'Cathedral Boys High School': 'Cathedral',
  'Cooper Armstrong HS Open': 'Robbinsdale Cooper', 'Robbinsdale Cooper Open': 'Robbinsdale Cooper',
  'Cretin-Derham Hall': 'Cretin-Derham Hall', 'Cretin-Derham Hall (Open)': 'Cretin-Derham Hall',
  'Eagan Boys': 'Eagan', 'Eagan Open': 'Eagan',
  'Eagan JV Blue': 'Eagan JV', 'Eagan JV': 'Eagan JV', 'Eagan Open JV': 'Eagan JV',
  'East Ridge': 'East Ridge', 'East Ridge Open': 'East Ridge',
  'East Ridge JV': 'East Ridge JV', 'East Ridge Open JV': 'East Ridge JV',
  'Eden Prairie': 'Eden Prairie', 'Eden Prairie Open': 'Eden Prairie',
  'Edina': 'Edina', 'Edina Varsity Boys': 'Edina',
  'Edina JV1': 'Edina JV1', 'Edina JV2': 'Edina JV2',
  'Great River School': 'Great River School', 'Great River School Open': 'Great River School',
  'Great River School JV': 'Great River School JV', 'Great River School Open JV': 'Great River School JV',
  'Hastings': 'Hastings', 'Hastings Open': 'Hastings',
  'Hopkins JV': 'Hopkins JV', 'Hopkins Open JV': 'Hopkins JV',
  'Hopkins MMP Varsity': 'Hopkins', 'Hopkins Open Varsity': 'Hopkins',
  'Irondale': 'Irondale', 'Irondale Open': 'Irondale',
  'Lakeville North': 'Lakeville North', 'Lakeville North Varsity': 'Lakeville North',
  'Lakeville South': 'Lakeville South', 'Lakeville South Open': 'Lakeville South',
  'Maple Grove': 'Maple Grove', 'Maple Grove Open': 'Maple Grove',
  'Minneapolis South JV': 'Minneapolis South JV', 'Minneapolis South Open JV': 'Minneapolis South JV',
  'Minneapolis Southwest': 'Minneapolis Southwest', 'Minneapolis Ultimate Southwest': 'Minneapolis Southwest',
  'Minneapolis Squall Open Varsity': 'Minneapolis South', 'Minneapolis South Open': 'Minneapolis South',
  'Minneapolis Squall Open JV': 'Minneapolis South JV', 'Minneapolis Squall JV': 'Minneapolis South JV',
  'Minnetonka': 'Minnetonka', 'Minnetonka Narwhal Open Varsity': 'Minnetonka', 'Minnetonka Open': 'Minnetonka',
  'Minnetonka JV': 'Minnetonka JV', 'Minnetonka Narwhal Open JV': 'Minnetonka JV', 'Minnetonka Open JV': 'Minnetonka JV',
  'Mounds View': 'Mounds View', 'Mounds View Open': 'Mounds View',
  'Mounds View JV': 'Mounds View JV', 'Mounds View JV1': 'Mounds View JV',
  'Mounds View JV2': 'Mounds View JV2',
  'Open World Learning Community - Open JV': 'Open World Learning Community JV',
  'Open World Learning Community - Open Varsity': 'Open World Learning Community',
  'Open World Learning Community Open': 'Open World Learning Community',
  'Open World Learning Community Open JV': 'Open World Learning Community JV',
  'OWLC Open JV': 'Open World Learning Community JV',
  'Prior Lake': 'Prior Lake', 'Prior Lake Varsity': 'Prior Lake',
  'Prior Lake JV': 'Prior Lake JV',
  'Providence Academy High School Mixed': 'Providence Academy', 'Providence Academy Open': 'Providence Academy',
  'Red Wing': 'Red Wing',
  'Richfield Roundabouts': 'Richfield', 'Richfield Open': 'Richfield',
  'Rosemount': 'Rosemount', 'Rosemount Open': 'Rosemount',
  'Roseville Riptide': 'Roseville', 'Roseville Open': 'Roseville',
  'St Louis Park JV': 'St Louis Park JV',
  'St Thomas Academy': 'St Thomas Academy', 'Saint Thomas Academy Cadets': 'St Thomas Academy',
  'St. Louis Park - Open JV': 'St Louis Park JV', 'St. Louis Park JV': 'St Louis Park JV',
  'St. Louis Park Boys Ultimate': 'St Louis Park', 'St. Louis Park Open Varsity': 'St Louis Park',
  'St. Paul Academy': 'St Paul Academy', 'Saint Paul Academy Open': 'St Paul Academy',
  'St. Paul Central Revolution - Open JV': 'St Paul Central JV',
  'St. Paul Central Revolution - Open Varsity': 'St Paul Central',
  'Saint Paul Central Open': 'St Paul Central', 'Saint Paul Central Open JV': 'St Paul Central JV',
  'Stillwater Open': 'Stillwater Area', 'Stillwater Area': 'Stillwater Area', 'Stillwater Area Open': 'Stillwater Area',
  'Washburn Open': 'Minneapolis Washburn', 'Washburn Open-JV': 'Minneapolis Washburn JV',
  'Minneapolis Washburn Open': 'Minneapolis Washburn', 'Minneapolis Washburn Open JV': 'Minneapolis Washburn JV',
  'Wayzata': 'Wayzata', 'Wayzata Open': 'Wayzata',
  'White Bear Lake Bears Open Varsity': 'White Bear Lake', 'White Bear Lake': 'White Bear Lake',
  'White Bear Lake Bears Open JV': 'White Bear Lake JV', 'White Bear Lake JV': 'White Bear Lake JV',
  'Woodbury Ultimate': 'Woodbury', 'Woodbury Open': 'Woodbury',
  // Out-of-state teams (Wisconsin) — included for SOS calculations, excluded from MN rankings display
  'Madison East Ultimate': 'Madison East',
  'Madison West Varsity': 'Madison West',
  'Middleton Ultimate': 'Middleton',
  'Verona Area High School': 'Verona Area',
};

function norm(n) { return NAME_MAP[n] || n; }

const normalized = allTournamentGames.map(g => ({
  team1: norm(g.team1),
  score1: g.score1,
  team2: norm(g.team2),
  score2: g.score2,
}));

// Show any unmapped names
const known = new Set(Object.values(NAME_MAP));
const unmapped = new Set();
normalized.forEach(g => {
  if (!known.has(g.team1)) unmapped.add(g.team1);
  if (!known.has(g.team2)) unmapped.add(g.team2);
});
if (unmapped.size > 0) {
  console.log('\nUNMAPPED team names (add to NAME_MAP):');
  [...unmapped].sort().forEach(n => console.log(' ', n));
} else {
  console.log('\nAll team names mapped successfully.');
}

// Load existing games and merge (deduplicate by team+score signature)
const existing = JSON.parse(readFileSync('./games.json', 'utf8'));
console.log(`\nExisting games: ${existing.length}`);

// Dedup key: sorted team pair + scores
function gameKey(g) {
  const [t1, s1, t2, s2] = g.team1 < g.team2
    ? [g.team1, g.score1, g.team2, g.score2]
    : [g.team2, g.score2, g.team1, g.score1];
  return `${t1}|${s1}|${t2}|${s2}`;
}
const existingKeys = new Set(existing.map(gameKey));
const newGames = normalized.filter(g => !existingKeys.has(gameKey(g)));
console.log(`Tournament games (deduped, new only): ${newGames.length}`);

const merged = [...existing, ...newGames];
console.log(`Total merged: ${merged.length}`);

writeFileSync('./games.json', JSON.stringify(merged, null, 2));
console.log('Saved to games.json');
