import { writeFileSync } from 'fs';

const BASE = 'https://mnyu.ultimatecentral.com/e/2026-high-school-spring-league/schedule/division/Open/game_type/with_result';

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

// Find max page from first page
const firstHtml = await fetch(BASE, { headers: { 'User-Agent': 'Mozilla/5.0' } }).then(r => r.text());
const pageNums = [...firstHtml.matchAll(/page=(\d+)/g)].map(m => parseInt(m[1]));
const maxPage = Math.max(...pageNums, 1);
console.log(`Found pages up to: ${maxPage}`);

const allGames = parseGamesFromHtml(firstHtml);
console.log(`Page 1: ${allGames.length} games`);

for (let p = 2; p <= maxPage; p++) {
  const html = await fetch(`${BASE}?page=${p}`, { headers: { 'User-Agent': 'Mozilla/5.0' } }).then(r => r.text());
  const games = parseGamesFromHtml(html);
  console.log(`Page ${p}: ${games.length} games`);
  allGames.push(...games);
  await new Promise(r => setTimeout(r, 300));
}

console.log(`\nTotal games parsed: ${allGames.length}`);

// Normalize team names
const nameMap = {
  'St. Louis Park - Open JV': 'St Louis Park JV',
  'St. Louis Park Boys Ultimate': 'St Louis Park',
  'Edina Varsity Boys': 'Edina',
  'Minneapolis Washburn Open': 'Minneapolis Washburn',
  'Minneapolis South Open': 'Minneapolis South',
  'Andover Open Varsity': 'Andover',
  'Great River School Open': 'Great River School',
  'Saint Paul Central Open': 'St Paul Central',
  'White Bear Lake Bears Open': 'White Bear Lake',
  'White Bear Lake Bears Open Varsity': 'White Bear Lake',
  'Apple Valley Open': 'Apple Valley',
  'Mounds View Open': 'Mounds View',
  'Hopkins Open Varsity': 'Hopkins',
  'Woodbury Open': 'Woodbury',
  'Minnetonka Narwhal Open Varsity': 'Minnetonka',
  'Open World Learning Community Open': 'Open World Learning Community',
  'Open World Learning Community - Open Varsity': 'Open World Learning Community',
  'Open World Learning Community - Open JV': 'Open World Learning Community JV',
  "Benilde-St. Margaret's Open": "Benilde-St Margaret's",
  'Maple Grove Open': 'Maple Grove',
  'Cathedral Boys High School': 'Cathedral',
  'Eagan Open': 'Eagan',
  'Saint Paul Academy Open': 'St Paul Academy',
  'Lakeville North Varsity': 'Lakeville North',
  'St. Louis Park JV': 'St Louis Park JV',
  'Blake Open': 'Blake',
  'Edina JV2': 'Edina JV2',
  'Great River School Open JV': 'Great River School JV',
  'Andover JV': 'Andover JV',
  'East Ridge Open': 'East Ridge',
  'Edina JV1': 'Edina JV1',
  'Lakeville South Open': 'Lakeville South',
  'Saint Thomas Academy Cadets': 'St Thomas Academy',
  'Minneapolis South Open JV': 'Minneapolis South JV',
  'White Bear Lake Bears Open JV': 'White Bear Lake JV',
  'Roseville Open': 'Roseville',
  'Prior Lake Varsity': 'Prior Lake',
  'Rosemount Open': 'Rosemount',
  'Minneapolis Washburn Open JV': 'Minneapolis Washburn JV',
  'Hopkins Open JV': 'Hopkins JV',
  'Mounds View JV': 'Mounds View JV',
  'Irondale Open': 'Irondale',
  'Eden Prairie Open': 'Eden Prairie',
  'Wayzata Open': 'Wayzata',
  'Minneapolis Ultimate Southwest': 'Minneapolis Southwest',
  'Red Wing': 'Red Wing',
  'Saint Paul Central Open JV': 'St Paul Central JV',
  'St. Paul Central Revolution - Open Varsity': 'St Paul Central',
  'St. Paul Central Revolution - Open JV': 'St Paul Central JV',
  'Stillwater Area Open': 'Stillwater Area',
  'Cretin-Derham Hall (Open)': 'Cretin-Derham Hall',
  'Robbinsdale Cooper Open': 'Robbinsdale Cooper',
  'OWLC Open JV': 'Open World Learning Community JV',
  'Open World Learning Community Open JV': 'Open World Learning Community JV',
  'Apple Valley Open JV': 'Apple Valley JV',
  'Eagan Open JV': 'Eagan JV',
  'Minnetonka Open JV': 'Minnetonka JV',
  'Richfield Open': 'Richfield',
  'Mounds View JV2': 'Mounds View JV2',
  'Avalon': 'Avalon',
  'Bloomington Open': 'Bloomington',
  'Bloomington Ultimate Frisbee HS': 'Bloomington',
  'East Ridge Open JV': 'East Ridge JV',
  'Hastings Open': 'Hastings',
  'Prior Lake JV': 'Prior Lake JV',
  'Providence Academy Open': 'Providence Academy',
  'Providence Academy High School Mixed': 'Providence Academy',
  'Minneapolis Squall Open JV': 'Minneapolis South JV',
  'Minneapolis Squall Open Varsity': 'Minneapolis South',
  'Cooper Armstrong HS Open': 'Robbinsdale Cooper',
  'Eagan Boys': 'Eagan',
  'Eagan JV Blue': 'Eagan JV',
  'Hopkins MMP Varsity': 'Hopkins',
  'Minnetonka Narwhal Open JV': 'Minnetonka JV',
  'Mounds View JV1': 'Mounds View JV',
  'Richfield Roundabouts': 'Richfield',
  'Roseville Riptide': 'Roseville',
  'St. Louis Park Open Varsity': 'St Louis Park',
  'Stillwater Open': 'Stillwater Area',
  'Washburn Open': 'Minneapolis Washburn',
  'Washburn Open-JV': 'Minneapolis Washburn JV',
  'Woodbury Ultimate': 'Woodbury',
};

function normName(n) {
  return nameMap[n] || n;
}

const EXCLUDE_KW = ['girls', 'female', 'women', 'fmp', 'gnb', 'nonbinary'];
function isOpenGame(g) {
  const both = (g.team1 + ' ' + g.team2).toLowerCase();
  return !EXCLUDE_KW.some(kw => both.includes(kw));
}

const normalized = allGames
  .map(g => ({ team1: normName(g.team1), score1: g.score1, team2: normName(g.team2), score2: g.score2 }))
  .filter(isOpenGame);

// Show unique team names for verification
const teamNames = new Set();
normalized.forEach(g => { teamNames.add(g.team1); teamNames.add(g.team2); });
console.log(`\nUnique teams: ${teamNames.size}`);
console.log([...teamNames].sort().join('\n'));

writeFileSync('./games.json', JSON.stringify(normalized, null, 2));
console.log('\nSaved to games.json');
