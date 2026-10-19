import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const pkg=JSON.parse(read('package.json'));
const engine=read('src/services/continue-engine.ts');
const prefs=read('src/services/workspace-preferences.ts');
const home=read('src/views/WorkspaceHome.tsx');
const board=read('src/runtime/whiteboard-core.js');
const css=read('src/runtime/workspace-preferences.css');
const index=read('index.html');
const prep=read('scripts/prepare-assets.mjs');
const main=read('src/main.tsx');
const checks=[
  ['Version is at least 1.18.5',(()=>{const p=pkg.version.split('.').map(Number);return p[0]>1||(p[0]===1&&(p[1]>18||(p[1]===18&&p[2]>=5)))})()],
  ['Continue Engine is a dedicated service',/export function buildContinueReport/.test(engine)],
  ['Continue targets are references, not graph copies',/targetId: string/.test(prefs)&&/targetType: WorkspaceTargetType/.test(prefs)],
  ['Continue supports tracked and inferred context',/source: 'tracked' \| 'inferred'/.test(engine)],
  ['Continue distinguishes opened edited created commented navigated',/opened/.test(prefs)&&/edited/.test(prefs)&&/created/.test(prefs)&&/commented/.test(prefs)&&/navigated/.test(prefs)],
  ['Continue ranking is deterministic by timestamp',/Date\.parse\(b\.activityAt\) - Date\.parse\(a\.activityAt\)/.test(engine)],
  ['Continue uses activity weight as deterministic tie-breaker',/ACTIVITY_WEIGHT\[b\.activity\] - ACTIVITY_WEIGHT\[a\.activity\]/.test(engine)],
  ['Editing has greater activity weight than opening',/edited: 5/.test(engine)&&/opened: 2/.test(engine)],
  ['Continue infers activity from real timestamps',/lastEditedAt/.test(engine)&&/lastOpenedAt/.test(engine)&&/inferredActivity/.test(engine)],
  ['Continue filters missing targets',/orphanedReferences/.test(engine)&&/if \(!target\)/.test(engine)],
  ['Continue result is bounded',/slice\(0, Math\.max\(1, limit\)\)/.test(engine)],
  ['Preference store is independent from Service Graph',/blue-ocean-workspace-preferences/.test(prefs)&&!/ServiceGraph/.test(prefs)],
  ['Preferences are scoped by user and workspace',/userId: string/.test(prefs)&&/workspaceId: string/.test(prefs)&&/userId}::\$\{scope\.workspaceId/.test(prefs)],
  ['Preferences persist in IndexedDB',/indexedDB\.open\(DB_NAME, 1\)/.test(prefs)&&/createObjectStore\(STORE_NAME/.test(prefs)],
  ['Preferences have localStorage fallback',/localStorage\.getItem/.test(prefs)&&/localStorage\.setItem/.test(prefs)],
  ['IndexedDB open has bounded timeout and blocked fallback',/IDB_OPEN_TIMEOUT_MS = 1800/.test(prefs)&&/request\.onblocked/.test(prefs)&&/Timeout ao abrir preferências/.test(prefs)],
  ['Freshest cached or durable preference state wins',/function newestPreferences/.test(prefs)&&/bTime > aTime/.test(prefs)],
  ['Recent context is capped at 50',/MAX_RECENT_CONTEXTS = 50/.test(prefs)],
  ['Recent context deduplicates by target key',/filter\(\(item\) => refKey\(item\) !== key\)/.test(prefs)],
  ['Favorites can be explicitly added and removed',/export function setFavorite/.test(prefs)&&/if \(enabled\) next\.unshift/.test(prefs)],
  ['Pins can be explicitly fixed and unfixed',/export function setPinned/.test(prefs)&&/if \(!enabled\)/.test(prefs)],
  ['Pins carry explicit persistent order',/order: number/.test(prefs)&&/pinnedAt: string/.test(prefs)],
  ['Pins can be reordered without recency sorting',/export function movePin/.test(prefs)&&/swapIndex/.test(prefs)],
  ['Deleted references are pruned safely',/export function pruneWorkspacePreferences/.test(prefs)&&/existingKeys\.has/.test(prefs)],
  ['Global activity tracker consumes context events',/bo-workspace-context/.test(prefs)&&/recordRecentContext/.test(prefs)],
  ['Global activity tracker consumes preference events',/bo-workspace-preference/.test(prefs)&&/detail\.preference === 'favorite'/.test(prefs)],
  ['Global preference mutations are serialized by scope',/mutationQueue/.test(prefs)&&/enqueueWorkspaceMutation/.test(prefs)&&/previous\.catch/.test(prefs)],
  ['Home consumes Continue Engine',/buildContinueReport\(workspaceTargets, workspacePreferences, 50\)/.test(home)],
  ['Dashboard recents are composed from Continue Engine before fallback targets',/for \(const item of \[\.\.\.continueReport\.items, \.\.\.fallbackTargets\]\)/.test(home)&&!/ACTIVITY_WEIGHT/.test(home)],
  ['Continue card uses top engine result',/continueItem = continueReport\.top/.test(home)],
  ['Continue exposes history separate from favorites',/Recentes de/.test(home)&&/Ver todos os recentes/.test(home)&&/Favoritos de/.test(home)],
  ['Favorites have explicit toggle control',/toggleFavoriteTarget/.test(home)&&/Adicionar aos favoritos/.test(home)],
  ['Pins have explicit toggle control',/togglePinnedTarget/.test(home)&&/Fixar na Home/.test(home)],
  ['Pins preserve deliberate order while staying visually secondary',/workspacePreferences\.pins\]\.sort\(\(a, b\) => a\.order - b\.order\)/.test(home)&&/itens fixados permanecem priorizados/.test(home)],
  ['Home hydrates durable preferences asynchronously',/loadWorkspacePreferences\(preferenceScope\)/.test(home)],
  ['Home preference actions use functional state updates',/setWorkspacePreferencesState\(\(current\)/.test(home)&&/updatePreferences/.test(home)],
  ['Home preserves legacy Journey favorites during transition',/journeyRecords\.filter\(\(record\) => record\.favorite\)/.test(home)],
  ['Home preserves legacy Blueprint favorites during transition',/blueprintRecords\.filter\(\(record\) => record\.favorite\)/.test(home)],
  ['Home prunes deleted preference references',/pruneWorkspacePreferences/.test(home)&&/existingKeys/.test(home)],
  ['Journey opening emits global workspace context',/targetType:'journey'/.test(board)&&/bo-workspace-context/.test(board)],
  ['Blueprint opening emits global workspace context',/targetType:'blueprint'/.test(board)&&/activity:'opened'/.test(board)],
  ['Journey favorite changes emit preference event',/targetType:'journey'.*preference:'favorite'/.test(board)],
  ['Blueprint favorite changes emit preference event',/targetType:'blueprint'.*preference:'favorite'/.test(board)],
  ['Main installs global workspace tracking',/installWorkspaceActivityTracking/.test(main)&&/getStoredUser/.test(main)],
  ['V1.18.5 body class is enabled',/bo-v1185/.test(main)],
  ['Workspace preference CSS loads after Attention Engine',index.indexOf('/v1185-workspace-preferences.css')>index.indexOf('/v1184-attention-engine.css')],
  ['prepare-assets publishes V1.18.5 CSS',/workspace-preferences\.css'.*v1185-workspace-preferences\.css/.test(prep)],
  ['V1.18.5 CSS has responsive rules',/@media\(max-width:700px\)/.test(css)&&/@media\(max-width:520px\)/.test(css)],
  ['V1.18.5 CSS has no typography below 11px',!Array.from(css.matchAll(/font-size:\s*([0-9.]+)px/g)).some(m=>Number(m[1])<11)],
  ['QA chain includes workspace preferences smoke',pkg.scripts.qa.includes('workspace-preferences:smoke')],
];
let bad=0;for(const [name,ok] of checks){console.log(`${ok?'OK  ':'FAIL'} ${name}`);if(!ok)bad++}
console.log(`\nContinue + Favorites + Pins: ${checks.length-bad}/${checks.length}`);if(bad)process.exit(1);
