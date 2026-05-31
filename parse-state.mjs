import { writeFileSync } from 'fs';

const EVENT = 'https://mnyu.ultimatecentral.com/e/2026-high-school-state-championship';
const POOL_STAGE = '164244';
const BRACKET_STAGE = '164253';

const POOLS = {
  A: ['Edina', 'Mounds View', 'White Bear Lake', 'Minnetonka'],
  B: ['Minneapolis Washburn', 'St Louis Park', 'Apple Valley', 'Eagan'],
  C: ['Andover', 'St Paul Central', 'Woodbury', 'Maple Grove'],
  D: ['Minneapolis South', 'Great River School', 'Open World Learning Community', 'Hopkins'],
};

// Canonical team names normalized from UltimateCentral display names
const NAME_MAP = {
  'Andover': 'Andover',
  'Apple Valley': 'Apple Valley',
  'Eagan Boys': 'Eagan',
  'Edina Varsity Boys': 'Edina',
  'Great River School Open': 'Great River School',
  'Hopkins MMP Varsity': 'Hopkins',
  'Maple Grove': 'Maple Grove',
  'Minneapolis Squall Open Varsity': 'Minneapolis South',
  'Minnetonka Narwhal Open Varsity': 'Minnetonka',
  'Mounds View': 'Mounds View',
  'Open World Learning Community - Open Varsity': 'Open World Learning Community',
  'St. Louis Park Open Varsity': 'St Louis Park',
  'St. Paul Central Revolution - Open Varsity': 'St Paul Central',
  'Washburn Open': 'Minneapolis Washburn',
  'White Bear Lake Bears Open Varsity': 'White Bear Lake',
  'Woodbury Ultimate': 'Woodbury',
};
function norm(n) { return NAME_MAP[n] || n; }

// Team logos (CloudFront CDN, c-40-40 cropped, scraped from teams page)
const LOGOS = {
  'Andover':                      'https://d36m266ykvepgv.cloudfront.net/uploads/media/4DGmfnQ8wd/c-40-40/andovermn-boys-2024-300x179.png',
  'Apple Valley':                 'https://d36m266ykvepgv.cloudfront.net/uploads/media/Ycp4xlPRzw/c-40-40/avujacketlogo.png',
  'Eagan':                        'https://d36m266ykvepgv.cloudfront.net/uploads/media/NPjqP3Y7FR/c-40-40/boys-varsity.jpg',
  'Edina':                        'https://d36m266ykvepgv.cloudfront.net/uploads/media/NXid7TzikS/c-40-40/screen-shot-2019-11-27-at-12-21-51-pm.png',
  'Great River School':           'https://d36m266ykvepgv.cloudfront.net/uploads/media/NelRuwXz6E/c-40-40/stars-2016-backgroundandlogo.jpg',
  'Hopkins':                      'https://d36m266ykvepgv.cloudfront.net/uploads/media/WVXwsJu4Ot/c-40-40/hurt-logo-2.png',
  'Maple Grove':                  'https://d36m266ykvepgv.cloudfront.net/uploads/media/RYFAhJkJKD/c-40-40/image-6.jpg',
  'Minneapolis South':            'https://d36m266ykvepgv.cloudfront.net/uploads/media/3HK81faKbr/c-40-40/south-squall-ultimate-7.jpg',
  'Minneapolis Washburn':         'https://d36m266ykvepgv.cloudfront.net/uploads/media/ee4ijRaJn4/c-40-40/washburn-ultimate-logo.jpg',
  'Minnetonka':                   'https://d36m266ykvepgv.cloudfront.net/uploads/media/i7lZ2na9zJ/c-40-40/tonka.jpg',
  'Mounds View':                  'https://d36m266ykvepgv.cloudfront.net/uploads/media/oAlUtO7JCo/c-40-40/blackgreenwhite-8.png',
  'Open World Learning Community':'https://d36m266ykvepgv.cloudfront.net/uploads/media/gr9zYs83B0/c-40-40/owlmanateeimage.png',
  'St Louis Park':                'https://d36m266ykvepgv.cloudfront.net/uploads/media/unN2UCB9kF/c-40-40/slp-logo-1-copy.jpg',
  'St Paul Central':              'https://d36m266ykvepgv.cloudfront.net/uploads/media/UuMJHzLr5N/c-40-40/revolution-logo-transparent-2.png',
  'White Bear Lake':              'https://d36m266ykvepgv.cloudfront.net/uploads/media/FCufp1WUfX/c-40-40/boys-400x400.jpg',
  'Woodbury':                     'https://d36m266ykvepgv.cloudfront.net/uploads/media/0Noa5hH65j/c-40-40/f5bee1a5feed44bfb94356b8518b84b9.jpg',
};

// Build reverse lookup: team → pool
const TEAM_POOL = {};
for (const [pool, teams] of Object.entries(POOLS)) {
  for (const t of teams) TEAM_POOL[t] = pool;
}

function parseGames(html) {
  const games = [];
  const blocks = html.split(/id="game-list-item-\d+"/);
  blocks.shift();
  for (const block of blocks) {
    const dateMatch = block.match(/(\w+, \d+ \w+ \d+)/);
    const timeMatch = block.match(/(\d+:\d+ [AP]M)/);
    const teamMatches = [...block.matchAll(/btn-label">([^<]+)<\/span>/g)].slice(0, 2);
    if (teamMatches.length < 2) continue;
    const t1raw = teamMatches[0][1].trim();
    const t2raw = teamMatches[1][1].trim();
    const team1 = norm(t1raw);
    const team2 = norm(t2raw);
    // Skip pagination artifacts
    if (!TEAM_POOL[team1] && !TEAM_POOL[team2]) continue;
    const scoreMatches = [...block.matchAll(/<div class="[^"]*\bscore\b[^"]*\btext-strong\b[^"]*">\s*(\d+)\s*<\/div>/g)].slice(0, 2);
    const score1 = scoreMatches.length >= 2 ? parseInt(scoreMatches[0][1]) : null;
    const score2 = scoreMatches.length >= 2 ? parseInt(scoreMatches[1][1]) : null;
    // Extract c-40-40 logos from game block
    const logoMatches = [...block.matchAll(/src="(https:\/\/d36m266ykvepgv\.cloudfront\.net\/[^"]+)"/g)];
    const logo1 = logoMatches[0]?.[1] || LOGOS[team1] || '';
    const logo2 = logoMatches[1]?.[1] || LOGOS[team2] || '';
    const pool = TEAM_POOL[team1] || TEAM_POOL[team2] || null;
    games.push({
      date: dateMatch?.[1] || '',
      time: timeMatch?.[1] || '',
      team1, logo1, score1,
      team2, logo2, score2,
      pool,
      completed: score1 !== null,
    });
  }
  return games;
}

async function fetchAllPages(baseUrl) {
  const firstHtml = await fetch(baseUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }).then(r => r.text());
  const pageNums = [...firstHtml.matchAll(/page=(\d+)/g)].map(m => parseInt(m[1]));
  const maxPage = Math.max(...pageNums, 1);
  if (maxPage > 1) console.log(`  Pages: ${maxPage}`);
  const allGames = parseGames(firstHtml);
  for (let p = 2; p <= maxPage; p++) {
    const html = await fetch(`${baseUrl}?page=${p}`, { headers: { 'User-Agent': 'Mozilla/5.0' } }).then(r => r.text());
    const games = parseGames(html);
    // Dedup by team pair+time
    for (const g of games) {
      const key = `${g.team1}|${g.team2}|${g.date}|${g.time}`;
      if (!allGames.some(e => `${e.team1}|${e.team2}|${e.date}|${e.time}` === key)) allGames.push(g);
    }
    await new Promise(r => setTimeout(r, 300));
  }
  return allGames;
}

console.log('Fetching pool play games...');
const poolGames = await fetchAllPages(`${EVENT}/schedule/division/Open+D1/stage/${POOL_STAGE}`);
console.log(`  ${poolGames.length} pool play games`);

// stage/164253 uses a different HTML structure — use stage/all filtered to Sunday
console.log('Fetching bracket games...');
const BRACKET_BASE = `${EVENT}/schedule/division/Open+D1/stage/all`;
const upcomingBracket = (await fetchAllPages(`${BRACKET_BASE}/game_type/upcoming`))
  .filter(g => g.date === 'Sun, 31 May 2026');
const completedBracket = (await fetchAllPages(`${BRACKET_BASE}/game_type/completed`))
  .filter(g => g.date === 'Sun, 31 May 2026');
const seen = new Set();
const bracketGames = [...upcomingBracket, ...completedBracket].filter(g => {
  const k = `${g.team1}|${g.team2}|${g.time}`;
  return seen.has(k) ? false : (seen.add(k), true);
});
console.log(`  ${bracketGames.length} bracket games`);

// Compute pool standings from completed pool games
const ALL_TEAMS = Object.values(POOLS).flat();
const standings = Object.fromEntries(ALL_TEAMS.map(t => [t, { w: 0, l: 0, pf: 0, pa: 0, pd: 0 }]));
for (const g of poolGames.filter(g => g.completed)) {
  const s1 = standings[g.team1], s2 = standings[g.team2];
  if (!s1 || !s2) continue;
  s1.pf += g.score1; s1.pa += g.score2; s1.pd += g.score1 - g.score2;
  s2.pf += g.score2; s2.pa += g.score1; s2.pd += g.score2 - g.score1;
  if (g.score1 > g.score2) { s1.w++; s2.l++; }
  else { s2.w++; s1.l++; }
}

// Sort each pool: W desc → PD desc → PF desc
function poolSort(a, b) { return b.w - a.w || b.pd - a.pd || b.pf - a.pf; }
const pools = Object.fromEntries(
  Object.entries(POOLS).map(([p, teams]) => [
    p,
    teams.map(t => ({ team: t, logo: LOGOS[t] || '', ...standings[t] })).sort(poolSort),
  ])
);

// Check for unmapped names
const known = new Set(ALL_TEAMS);
const unmapped = new Set();
[...poolGames, ...bracketGames].forEach(g => {
  if (!known.has(g.team1)) unmapped.add(g.team1);
  if (!known.has(g.team2)) unmapped.add(g.team2);
});
if (unmapped.size > 0) {
  console.log('\nWARNING — unmapped team names:', [...unmapped].sort());
} else {
  console.log('All team names mapped.');
}

const completedPool = poolGames.filter(g => g.completed).length;
console.log(`Completed pool play games: ${completedPool}/${poolGames.length}`);

writeFileSync('./state-data.json', JSON.stringify({
  updatedAt: new Date().toISOString(),
  pools,
  poolGames,
  bracketGames,
}, null, 2));
console.log('Saved state-data.json');
