import fs from 'fs';
import path from 'path';

const templatePath = '/Users/shangguanchenhuan/Documents/home2025/coke-github-summary/index.html';
const dataPath = path.resolve('../github-summary/repos_enriched.json');
const outPath = path.resolve('index.html');

const EXCLUDE = new Set(['my-binance','coke-moltbook']);

// Manual screenshots captured from live sites (one per project)
const OVERRIDE_SHOTS = {
  'coke-blog': 'images/coke-blog/blog.png',
  'coke-comic': 'images/coke-comic/read.png',
};

// Manual description overrides (repo description can be empty on GitHub)
const OVERRIDE_DESC = {
  'coke-blog': '一个现代化的全栈博客系统（Claude 风格设计，基于 Gemini Canvas 原型开发）。',
  'coke-comic': '一个漫画网站 / 漫画阅读器（在线阅读与浏览体验）。',
};

const repos = JSON.parse(fs.readFileSync(dataPath,'utf8'))
  .filter(r=>!EXCLUDE.has(r.name));

function normalizeAssetPath(p){
  if(!p) return null;
  // repos_enriched.json was generated before we renamed underscore-prefixed images in the Pages repo.
  // GitHub Pages/Jekyll ignores files starting with '_' so we renamed them by stripping the leading underscores.
  // Normalize paths accordingly.
  return p.replace(/\/_([^/]+)/g, (_m, name)=>`/${name}`); // '/_xxx' -> '/xxx'
}

function hasImageExt(p){
  return /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(p||'');
}

function pickScreenshot(r){
  if(OVERRIDE_SHOTS[r.name]) return OVERRIDE_SHOTS[r.name];

  const imgs = (r.images||[])
    .map(i=>({
      ...i,
      file: normalizeAssetPath(i.file)
    }))
    .filter(i=>i.file && hasImageExt(i.file));

  if(!imgs.length) return null;

  // Prefer 'home'/'main'/'demo'/'01-world' like screenshots
  const preferred = imgs.find(i=>/home|main|demo|world|01-|index|preview|trade|dashboard/i.test(i.file));
  return (preferred||imgs[0]).file.replace(/^home2025\/github-summary\//,'');
}

const withShot = repos
  .map(r=>({r, shot: pickScreenshot(r)}))
  .filter(x=>x.shot);

// Sort by stars desc then pushed desc
withShot.sort((a,b)=>{
  const ds = (b.r.stargazers_count||0)-(a.r.stargazers_count||0);
  if(ds) return ds;
  return (b.r.pushed_at||'').localeCompare(a.r.pushed_at||'');
});

// pick top N cards for the grid
const cards = withShot.slice(0, 15);

function langBadge(lang){
  if(!lang) return '';
  const map = {
    'TypeScript': ['bg-blue-50','text-blue-600'],
    'JavaScript': ['bg-yellow-50','text-yellow-700'],
    'Vue': ['bg-green-50','text-green-700'],
    'HTML': ['bg-gray-100','text-gray-700'],
  };
  const cls = map[lang] || ['bg-slate-50','text-slate-700'];
  return `<span class="px-2 py-1 ${cls[0]} ${cls[1]} text-xs font-medium rounded-md">${lang}</span>`;
}

function topicBadges(topics){
  const ts = (topics||[]).slice(0,2);
  return ts.map(t=>`<span class="px-2 py-1 bg-cyan-50 text-cyan-700 text-xs font-medium rounded-md">${t}</span>`).join('');
}

function escapeHtml(s){
  return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function cardHtml({r, shot}){
  const stars = r.stargazers_count||0;
  const rawDesc = OVERRIDE_DESC[r.name] || r.description || '（无描述）';
  const desc = escapeHtml(rawDesc);
  const badges = `${langBadge(r.language)}${topicBadges(r.topics)}`;
  const imgSrc = shot.startsWith('images/') ? shot : `images/${shot}`;
  return `
  <article class="project-card bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover border border-gray-200 flex flex-col h-full">
    <div class="relative h-48 overflow-hidden bg-gray-100 group">
      <img src="${imgSrc}" alt="${r.name} screenshot" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105">
      <div class="absolute top-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded-md text-xs font-bold shadow-sm flex items-center gap-1 text-google-text">
        <i class="fas fa-star text-google-yellow"></i> ${stars}
      </div>
    </div>
    <div class="p-6 flex flex-col flex-grow">
      <div class="flex gap-2 mb-3 flex-wrap">${badges}</div>
      <h3 class="text-xl font-sans font-bold text-google-text mb-2">${r.name}</h3>
      <p class="text-google-subtext text-sm mb-4 line-clamp-3">${desc}</p>
      <div class="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center">
        <a href="${r.html_url}" target="_blank" class="text-google-blue font-medium text-sm hover:underline">View on GitHub</a>
        <a href="${r.html_url}" target="_blank" class="text-google-subtext hover:text-google-text transition-colors">
          <i class="fab fa-github text-xl"></i>
        </a>
      </div>
    </div>
  </article>`;
}

let tpl = fs.readFileSync(templatePath,'utf8');

// Year range copy fixes
tpl = tpl.replaceAll('2024-2025回顾', '2025-2026回顾');
tpl = tpl.replaceAll('Selection of key projects from 2024', 'Selection of key projects from 2025-2026');

// Update numbers in stat cards + hero copy
const totalRepos = repos.length;
const totalStars = repos.reduce((s,r)=>s+(r.stargazers_count||0),0);

// Replace Repositories number (first occurrence of >34< near Stat 2)
tpl = tpl.replace(/(<h3[^>]*>Repositories<\/h3>[\s\S]*?<p class="text-3xl[^>]*">)\d+(<\/p>)/, `$1${totalRepos}$2`);
// Replace Stars Earned number (first occurrence of >432< near Stat 4)
tpl = tpl.replace(/(<h3[^>]*>Stars Earned<\/h3>[\s\S]*?<p class="text-3xl[^>]*">)\d+(<\/p>)/, `$1${totalStars}$2`);

// Replace projects grid contents
const gridRe = /<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">[\s\S]*?<\/div>\s*<\/div>\s*<\/section>/;
const gridStart = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">';
const newGridInner = `
                ${cards.map(cardHtml).join('\n')}

                <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 flex flex-col justify-center items-center text-center border border-blue-100 border-dashed border-2">
                    <div class="h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                        <i class="fas fa-plus text-google-blue text-xl"></i>
                    </div>
                    <h3 class="text-lg font-bold text-google-text">More on GitHub</h3>
                    <p class="text-sm text-google-subtext mt-2 mb-6">Explore all repositories</p>
                    <a href="https://github.com/cokepoppy" target="_blank" class="px-5 py-2 bg-white text-google-blue font-medium rounded-full shadow-sm hover:shadow text-sm border border-gray-200">Visit Profile</a>
                </div>
`; 

// surgical replace the inner grid only
const idx = tpl.indexOf(gridStart);
if(idx === -1) throw new Error('Grid start not found in template');
const afterStart = idx + gridStart.length;
const endIdx = tpl.indexOf('</div>\n            </div>\n        </section>', afterStart);
if(endIdx === -1) throw new Error('Grid end marker not found');

const before = tpl.slice(0, afterStart);
const after = tpl.slice(endIdx);
const rebuilt = before + newGridInner + after;

fs.writeFileSync(outPath, rebuilt);
console.log('Wrote', outPath, 'cards:', cards.length, 'repos_total:', totalRepos, 'stars_total:', totalStars);
