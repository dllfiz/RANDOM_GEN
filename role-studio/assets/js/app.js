/* =========================================================
   app.js —— 界面与交互
   ========================================================= */

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.prototype.slice.call(document.querySelectorAll(s));

const LS_HIS = 'randgen_history';
const LS_FAV = 'randgen_fav';
const LS_CHARS = 'randgen_chars';
const LS_UNLOCK = 'randgen_unlock_nsfw';

const state = {
  mode: 'sfw',
  model: 'illustrious',
  current: null,
  history: [],
  fav: [],
  storeTab: 'history',
  /* 角色库（内置预设 + 我的角色，合并为一个库） */
  charLib: [],
  picked: [],
  slots: [null, null],
  stMode: 'sfw',
  stWorld: 'modern',
  stArt: 'random',
  stPov: 'third',
  stTags: [],
  shortResults: [],
  editing: null,
  /* 角色库筛选与视图 */
  libSrc: 'all',
  libQ: '',
  libIps: [],            /* 角色库：按作品筛选（多选，PRESET_IPS） */
  libFemale: true,
  libMale: true,
  libDens: 'compact',
  /* 随机补全 */
  psCard: null,
  psResult: null,
  /* 服装（#psOutfitPick）：'' = 默认（角色原设服装）/ '__random__' 随机换装 /
     其余 = 具体成套服饰名。独立的「随机换装」开关已并入这个下拉。 */
  outfitPick: '',
  /* 衣着状态（#psOutfitState，2026-10-09 轮次 L 从服饰下拉里拆出来）：
     '' 默认（随机状态）/ '__normal__' 正常着衣 / '__half__' 半脱 / '__topless__' 露胸 / '__nude__' 全裸。
     后三者只在夜灯下生效；状态与具体服装可同时选，全裸与服装互斥（全裸优先）。 */
  outfitState: '',
  /* NSFW 解锁 */
  unlocked: false,
  pendingMode: null,
  stPending: false
};

/* ---------- 工具 ---------- */
function toast(msg){
  let t = $('.toast');
  if (!t){
    t = document.createElement('div');
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._tm);
  t._tm = setTimeout(() => t.classList.remove('show'), 1600);
}

function copyText(str){
  if (navigator.clipboard && window.isSecureContext){
    navigator.clipboard.writeText(str).then(() => toast('已复制')).catch(() => fallbackCopy(str));
  } else {
    fallbackCopy(str);
  }
}
function fallbackCopy(str){
  const ta = document.createElement('textarea');
  ta.value = str;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); toast('已复制'); } catch (e){ toast('复制失败'); }
  document.body.removeChild(ta);
}

function esc(s){
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* 把命中的关键词包一层高亮；先转义再插 <mark>，避免 XSS */
function escHl(s, q){
  const safe = esc(s);
  if (!q) return safe;
  const tokens = q.split(/\s+/).map(t => t.trim()).filter(t => t.length >= 1);
  if (!tokens.length) return safe;
  let out = safe;
  tokens.forEach(t => {
    const re = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
    out = out.replace(re, '<mark class="hl">$1</mark>');
  });
  return out;
}

/* 卡片是否命中搜索词。
   匹配范围：显示名 / 作品 / 中文备注 / 英文基础提示词 / 原设服装
   中英混合命中靠 note 做桥：搜「银灰」能命中 note，搜「silver grey」能命中 base */
function cardMatches(it, q){
  if (!q) return true;
  const hay = [
    it.name || '', it.ip || '', it.note || '',
    it.base || '', it.core || '', it.outfit || ''
  ].join(' ').toLowerCase();
  return q.split(/\s+/).every(t => !t || hay.indexOf(t.toLowerCase()) >= 0);
}

/* ---------- 侧栏标签 ---------- */
function buildChips(box, isOn, toggle){
  box.innerHTML = '';
  /* 60 个标签平铺太长，按 NSFW_TAG_GROUPS 分组；没写 group 的挂在「其他」下 */
  const groups = (typeof NSFW_TAG_GROUPS !== 'undefined' && NSFW_TAG_GROUPS.length)
    ? NSFW_TAG_GROUPS.slice() : [];
  const known = {};
  groups.forEach(g => { known[g.id] = true; });

  const render = (name, list) => {
    if (!list.length) return;
    const wrap = document.createElement('div');
    wrap.className = 'chip-group';
    if (name){
      const h = document.createElement('div');
      h.className = 'chip-group-head';
      h.textContent = name;
      wrap.appendChild(h);
    }
    const row = document.createElement('div');
    row.className = 'chip-group-body';
    list.forEach(t => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (isOn(t.id) ? ' on' : '');
      b.textContent = t.name;
      b.dataset.tag = t.id;
      b.addEventListener('click', () => {
        toggle(t.id);
        b.classList.toggle('on', isOn(t.id));
      });
      row.appendChild(b);
    });
    wrap.appendChild(row);
    box.appendChild(wrap);
  };

  groups.forEach(g => render(g.name, NSFW_TAGS.filter(t => t.group === g.id)));
  render('其他', NSFW_TAGS.filter(t => !known[t.group || '']));
}

function toggleIn(arr, id){
  const i = arr.indexOf(id);
  if (i >= 0) arr.splice(i, 1); else arr.push(id);
}

/* 本项目没有生成器侧栏，标签芯片只有情境子页这一组 */
function renderTagChips(){
  const box = $('#stTagChips');
  if (box) buildChips(box, id => state.stTags.includes(id), id => toggleIn(state.stTags, id));
}

function setStTags(ids){
  state.stTags = ids.slice();
  $$('#stTagChips .chip').forEach(c => {
    c.classList.toggle('on', state.stTags.includes(c.dataset.tag));
  });
}

/* 本项目没有生成器控制面板，这些固定值保证引擎侧拿到完整 ctx */
function buildCtx(){
  return {
    mode: state.mode,
    model: state.model,
    world: state.stWorld || 'modern',
    gender: 'random',
    actors: 1,
    artstyle: state.stArt || 'random',
    pov: 'third',
    tags: []
  };
}

/* =========================================================
   夜灯：NSFW 开关
   默认熄灭（清水）。点亮前先弹一次性确认，确认结果存 localStorage。
   未点亮时即使 URL 带 ?mode=nsfw 也不会直接生效。
   ========================================================= */

/* 把当前模式同步到界面各处（灯泡、body、NSFW 区块、情境子页 NSFW 开关） */
function applyModeUI(){
  document.body.className = 'mode-' + state.mode;
  const on = (state.mode === 'nsfw');
  $('#bulbBtn').setAttribute('aria-pressed', on ? 'true' : 'false');
  $('#bulbBtn').title = on ? '夜灯已点亮 · 点击关闭成人内容' : '夜灯：点亮后开启成人内容';
  $('#bulbTxt').textContent = on ? '夜间' : '清水';
  /* 服饰下拉随模式重建：「全裸」与成人向成衣柜只有夜灯亮时才可选 */
  fillOutfitOptions();
}

/* 真正切换模式（确认之后才调） */
function setMode(m){
  state.mode = m;
  applyModeUI();
  renderPsHint();
  if (state.psCard) genPreset(state.psCard);
}

function openUnlock(){
  $('#unlockModal').hidden = false;
}
function closeUnlock(){
  $('#unlockModal').hidden = true;
  state.pendingMode = null;
}

/* 点灯泡 */
function onBulbClick(){
  if (state.mode === 'nsfw'){
    /* 点亮状态再点 = 关灯（回到清水），不弹窗 */
    setMode('sfw');
    toast('夜灯已关 · 回到清水');
    return;
  }
  if (state.unlocked){
    setMode('nsfw');
    toast('夜灯已点亮');
    return;
  }
  /* 没解锁过 → 先问一次 */
  state.pendingMode = 'nsfw';
  openUnlock();
}

function confirmUnlock(){
  state.unlocked = true;
  try { localStorage.setItem(LS_UNLOCK, '1'); } catch (e){}
  /* 若这次解锁是情境子页的模式下拉触发的，就把那一栏也切到 NSFW */
  if (state.stPending){
    state.stPending = false;
    state.stMode = 'nsfw';
    $('#stMode').value = 'nsfw';
    $('#stNsfwBox').hidden = false;
  }
  closeUnlock();
  setMode('nsfw');
  toast('夜灯已点亮 · 可随时点灯关闭');
}

/* 读解锁状态；URL 带 ?mode=nsfw 也要走确认，不直接生效 */
function loadUnlock(){
  try { state.unlocked = localStorage.getItem(LS_UNLOCK) === '1'; } catch (e){ state.unlocked = false; }
  return state.unlocked;
}

/* ---------- 事件绑定 ---------- */
function bind(){
  /* 夜灯 */
  $('#bulbBtn').addEventListener('click', onBulbClick);
  $('#unlockOk').addEventListener('click', confirmUnlock);
  $('#unlockCancel').addEventListener('click', () => { closeUnlock(); toast('已取消 · 保持清水'); });
  $('#unlockClose').addEventListener('click', closeUnlock);
  $('#unlockModal').addEventListener('click', e => { if (e.target.id === 'unlockModal') closeUnlock(); });

  /* ===== 页面导航 ===== */
  $$('#pageNav .page-tab').forEach(t => {
    t.addEventListener('click', () => goPage(t.dataset.page));
  });

  /* ===== 底模 ===== */
  $('#modelPick').addEventListener('change', e => {
    state.model = e.target.value;
    renderPsHint();
    if (state.psCard) genPreset(state.psCard);
  });

  /* ===== 角色库：来源 / 搜索 / 性别 / 密度 ===== */
  $$('#libSource .src-btn').forEach(b => {
    b.addEventListener('click', () => { state.libSrc = b.dataset.src; renderCharLib(); });
  });
  $$('#libDens .dens-btn').forEach(b => {
    b.addEventListener('click', () => { state.libDens = b.dataset.dens; renderCharLib(); });
  });
  $('#libSearch').addEventListener('input', e => { state.libQ = e.target.value; renderCharLib(); });
  $('#libSearchClr').addEventListener('click', () => {
    state.libQ = ''; $('#libSearch').value = ''; renderCharLib(); $('#libSearch').focus();
  });
  $('#libFemale').addEventListener('change', e => { state.libFemale = e.target.checked; renderCharLib(); });
  $('#libMale').addEventListener('change', e => { state.libMale = e.target.checked; renderCharLib(); });
  renderIpChips();   /* 首屏先画一遍；之后由 renderCharLib() 负责重刷 */
  $('#psOutfitState').addEventListener('change', e => {
    state.outfitState = e.target.value;
    if (state.psCard) genPreset(state.psCard);
  });
  $('#psOutfitPick').addEventListener('change', e => {
    state.outfitPick = e.target.value;
    if (state.psCard) genPreset(state.psCard);
  });

  /* ===== 随机补全结果区 ===== */
  $('#psAgain').addEventListener('click', () => {
    if (!state.psCard){ toast('先点左侧一个角色'); return; }
    genPreset(state.psCard);
  });
  $('#psCopy').addEventListener('click', () => copyText($('#psPos').value));
  $('#psToLib').addEventListener('click', () => {
    if (!state.psCard){ toast('先点左侧一个角色'); return; }
    /* 存的是"角色 + 本次随机到的服装"，仍然只含外貌，可直接复用 */
    addCard({
      name: state.psCard.name,
      gender: state.psCard.gender,
      ip: state.psCard.ip || '',
      core: state.psCard.core || '',
      outfit: state.psCard.outfit || '',
      base: (state.psResult && state.psResult.base) ? state.psResult.base : (state.psCard.base || ''),
      note: state.psCard.note || ''
    });
    toast('已存入「我的角色」');
  });

  /* ===== 角色库卡片操作 ===== */
  $('#charLib').addEventListener('click', onCharLibClick);
  $('#btnNewChar').addEventListener('click', () => openCharModal(null));
  $('#btnRandomChar').addEventListener('click', () => {
    const list = libFiltered();
    if (!list.length){ toast('当前筛选下没有角色'); return; }
    const it = list[Math.floor(Math.random() * list.length)];
    genPreset(it);
    toast('随机到「' + it.name + '」');
  });
  $('#btnRandomFull').addEventListener('click', () => {
    const ctx = Object.assign(buildCtx(), { actors: 1 });
    const g = planGenders(ctx)[0];
    const r = genBasePrompt(ctx, g);
    /* 外貌 / 服饰分开存（与编辑器「默认服饰」字段同构），随机换装才能整段剥 */
    addCard({ name: genName(ctx, g), gender: g, core: r.base, outfit: r.outfit || '', base: [r.base, r.outfit].filter(Boolean).join(', '), note: r.note });
    toast('已随机生成一张');
  });
  $('#btnExportChars').addEventListener('click', () => {
    if (!state.charLib.length){ toast('「我的角色」还是空的'); return; }
    download(new Blob([JSON.stringify(state.charLib, null, 2)], { type: 'application/json' }), 'randgen-chars.json');
  });
  $('#btnImportChars').addEventListener('click', () => $('#importCharsFile').click());
  $('#importCharsFile').addEventListener('change', e => {
    const f = e.target.files && e.target.files[0];
    if (f) importCharsFile(f);
    e.target.value = '';
  });

  /* ===== 编辑弹窗 ===== */
  $('#modalClose').addEventListener('click', closeCharModal);
  $('#charModal').addEventListener('click', e => { if (e.target.id === 'charModal') closeCharModal(); });
  /* Esc 关闭弹窗；在文本框里按 Esc 也算 */
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' && e.key !== 'Esc') return;
    if (!$('#unlockModal').hidden){ closeUnlock(); return; }
    if (!$('#charModal').hidden) closeCharModal();
  });
  /* 回车保存（多行文本框除外，那里回车要换行） */
  $('#edName').addEventListener('keydown', e => { if (e.key === 'Enter') saveFromEditor(); });
  $('#edNote').addEventListener('keydown', e => { if (e.key === 'Enter') saveFromEditor(); });
  $('#edSave').addEventListener('click', saveFromEditor);
  $('#edFill').addEventListener('click', () => {
    const g = $('#edGender').value;
    const ctx = Object.assign(buildCtx(), { actors: 1, gender: g });
    const r = genBasePrompt(ctx, g);
    $('#edBase').value = r.base;
    $('#edOutfit').value = r.outfit || '';
    if (!$('#edNote').value.trim()) $('#edNote').value = r.note;
    if (!$('#edName').value.trim()) $('#edName').value = genName(ctx, g);
  });
  $('#edClear').addEventListener('click', () => {
    $('#edName').value = ''; $('#edNameEn').value = ''; $('#edIp').value = '';
    $('#edBase').value = ''; $('#edOutfit').value = ''; $('#edNote').value = '';
  });

  /* ===== 情境子页 ===== */
  $('#castList').addEventListener('change', e => {
    const sel = e.target.closest('select[data-slot]');
    if (!sel) return;
    state.slots[parseInt(sel.dataset.slot, 10)] = sel.value || null;
  });
  $('#castList').addEventListener('click', e => {
    const b = e.target.closest('[data-rm]');
    if (!b) return;
    state.slots.splice(parseInt(b.dataset.rm, 10), 1);
    if (!state.slots.length) state.slots = [null];
    renderCast();
  });
  $('#btnAddSlot').addEventListener('click', () => {
    if (state.slots.length >= 4){ toast('最多 4 人'); return; }
    state.slots.push(null); renderCast();
  });
  $('#stMode').addEventListener('change', e => {
    const want = e.target.value;
    /* 没点亮夜灯就不给切到 NSFW */
    if (want === 'nsfw' && !state.unlocked){
      e.target.value = 'sfw';
      state.stMode = 'sfw';
      state.pendingMode = 'nsfw';
      state.stPending = true;
      openUnlock();
      return;
    }
    state.stMode = want;
    $('#stNsfwBox').hidden = (want !== 'nsfw');
  });
  $('#stWorld').addEventListener('change', e => { state.stWorld = e.target.value; });
  $('#stArt').addEventListener('change', e => { state.stArt = e.target.value; });
  $('#stTagAll').addEventListener('click', () => setStTags(NSFW_TAGS.map(t => t.id)));
  $('#stTagNone').addEventListener('click', () => setStTags([]));

  $('#btnGenShort').addEventListener('click', () => genShort(1));
  $('#btnGenShortBatch').addEventListener('click', () => genShort(5));
  $('#btnShortAgain').addEventListener('click', () => genShort(1));
  $('#btnShortCopy').addEventListener('click', () => copyText($('#shortOut').textContent));
  $('#btnShortFav').addEventListener('click', () => {
    const s = $('#shortOut').textContent;
    if (!s || s.indexOf('选择人物') >= 0){ toast('还没有生成内容'); return; }
    state.fav.unshift({
      id: 'fs' + Date.now(),
      title: '短篇 · ' + s.slice(0, 12) + '…',
      data: { chars: [], scene: { fields: {} }, story: s, prompt: '', negative: '', tags: [] }
    });
    saveStore();
    toast('已收藏');
  });
}

/* =========================================================
   角色库（内置预设 + 我的角色，合并为一个库）
   一张统一卡 = { id, src, name, ip, gender, core, outfit, base, note, ts }
     src='preset' → core 与 outfit 分离，可随机换装，base 由二者拼出
     src='mine'   → core 为空，base 独立存在
   ========================================================= */
const WORLD_LABEL = {
  modern:'现代都市', campus:'校园', xianxia:'东方幻想', western:'西幻',
  cyber:'赛博朋克', postapoc:'末世废土', office:'职场'
};

/* 内置预设的运行时条目（从 PRESET_CHARS 转换一次，常驻内存） */
let PRESET_CARDS = [];
function buildPresetCards(){
  PRESET_CARDS = PRESET_CHARS.map(presetToCard);
}

/* 读取"我的角色"（localStorage）；预设不落盘，每次从数据生成 */
function loadMyCards(){
  let arr = [];
  try { arr = JSON.parse(localStorage.getItem(LS_CHARS) || '[]'); } catch (e){ arr = []; }
  return arr.map(it => {
    /* 兼容最早期的结构化字段卡 */
    if (it && it.char){
      const ctx = {
        mode: 'sfw', world: (it.char.meta && it.char.meta.world) || 'modern',
        gender: 'random', actors: 1, artstyle: 'random', pov: 'third', tags: []
      };
      return {
        id: it.id, src: 'mine', ts: it.ts, ip: '',
        name: (it.char.meta && it.char.meta.name) || '未命名',
        gender: it.char.gender || 'female',
        core: '', outfit: '',
        base: buildCharPrompt(it.char, ctx),
        note: noteOfChar(it.char)
      };
    }
    /* 兼容合并前的扁平卡（无 src/ip/core/outfit） */
    return {
      id: it.id,
      src: 'mine',
      name: it.name || '未命名',
      nameEn: it.nameEn || '',
      gender: it.gender || 'female',
      ip: it.ip || '',
      core: it.core || '',
      outfit: it.outfit || '',
      base: it.base || '',
      note: it.note || '',
      ts: it.ts || 0
    };
  });
}
/* 合并视图：预设在前，我的角色在后 */
function libAll(){
  return PRESET_CARDS.concat(state.charLib);
}
/* 只把"我的角色"写回 localStorage，预设不落盘 */
function saveCharLib(){
  try { localStorage.setItem(LS_CHARS, JSON.stringify(state.charLib)); } catch (e){}
}

/* ---------- 存档：下载 / 备份 / 恢复 ----------
   本项目的「我的角色」与主项目共用 localStorage key（randgen_chars），
   这里的导入既能读自己导出的卡库数组，也能读主项目的整包快照。 */
function download(blob, name){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); document.body.removeChild(a); }, 100);
  toast('已导出 ' + name);
}

function saveStore(){
  try { localStorage.setItem(LS_FAV, JSON.stringify(state.fav)); } catch (e){}
}

function stampNow(){
  const d = new Date(), p = n => String(n).padStart(2, '0');
  return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
}

function exportAllStore(){
  const snap = { v: 1, app: 'role-studio', ts: Date.now(), chars: state.charLib, fav: state.fav };
  download(new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' }),
    'role-studio-存档-' + stampNow() + '.json');
}

function normCard(it){
  return {
    id: it.id || ('c' + Math.random().toString(36).slice(2, 10)),
    src: 'mine',
    name: it.name || '未命名',
    nameEn: it.nameEn || '',
    gender: it.gender || 'female',
    ip: it.ip || '',
    core: it.core || '',
    outfit: it.outfit || '',
    base: it.base || '',
    note: it.note || '',
    ts: it.ts || 0
  };
}

function importCharsFromText(txt){
  let o;
  try { o = JSON.parse(txt); } catch (e){ toast('文件不是合法 JSON'); return; }
  let arr = null;
  if (Array.isArray(o)) arr = o;
  else if (o && Array.isArray(o.chars)) arr = o.chars;
  if (!arr){ toast('没找到角色卡数组'); return; }
  arr = arr.filter(c => c && (c.name || c.base)).map(normCard);
  if (!arr.length){ toast('文件里没有可用角色卡'); return; }
  const ids = new Set(arr.map(c => c.id));
  state.charLib = arr.concat(state.charLib.filter(c => !ids.has(c.id)));
  saveCharLib();
  renderCharLib();
  toast('已导入 ' + arr.length + ' 张角色卡');
}

function importCharsFile(file){
  const r = new FileReader();
  r.onload = () => importCharsFromText(String(r.result));
  r.onerror = () => toast('读取文件失败');
  r.readAsText(file, 'utf-8');
}

/* 从角色对象提炼一句中文外貌备注，用于写进短篇 */
function noteOfChar(c){
  const f = c.fields || {};
  const bits = [];
  if (f.hair) bits.push(String(f.hair.zh).split(' · ')[0]);
  if (f.eyes) bits.push(f.eyes.zh);
  return bits.join('、').slice(0, 20);
}

/* 新建一张"我的角色"卡 */
function addCard(o){
  const item = {
    id: 'c' + Date.now() + Math.random().toString(36).slice(2, 6),
    src: 'mine',
    name: o.name || '未命名',
    nameEn: o.nameEn || '',
    gender: o.gender || 'female',
    ip: o.ip || '',
    core: o.core || '',
    outfit: o.outfit || '',
    base: o.base || '',
    note: o.note || '',
    ts: Date.now()
  };
  state.charLib.unshift(item);
  saveCharLib();
  renderCharLib();
  return item;
}

/* 把角色卡伪装成角色对象，供提示词拼装与短篇生成使用 */
function pseudoCharFromCard(card, world){
  const GN = ({ female: '女性', male: '男性', futa: '扶她' })[card.gender] || '女性';
  return {
    idx: 0,
    gender: card.gender,
    base: card.base,
    card: card,
    fields: {
      name: { key: 'name', label: '姓名', zh: card.name, en: '', locked: false },
      gender: { key: 'gender', label: '性别', zh: GN, en: '', locked: false },
      base: { key: 'base', label: '基础提示词', zh: card.base || '（空）', en: '', locked: false }
    },
    meta: { name: card.name, nameEn: cardNameEn(card), world: world || state.stWorld }
  };
}

/* 首次使用铺示例卡（只在"我的角色"为空时） */
function seedCards(){
  addCard({
    name: 'Silver Wolf',
    gender: 'female',
    base: '(silver wolf honkai star rail), 1girl, silver grey short hair, side ponytail, pink-purple eyes, ' +
          'slim body, small breasts, black cropped jacket, short shorts, thighhighs, fingerless gloves',
    note: '银灰短发、侧马尾、粉紫瞳'
  });
  addCard({
    name: 'Kafka',
    gender: 'female',
    base: '(kafka honkai star rail), 1girl, long wavy purple hair, red eyes, mature body, large breasts, ' +
          'white dress shirt, black long coat, high heels, beauty mark',
    note: '紫色波浪长发、红瞳'
  });
  addCard({
    name: 'Blade',
    gender: 'male',
    base: '(blade honkai star rail), 1boy, long black hair, red eyes, tall, muscular body, broad shoulders, ' +
          'bare chest, black coat, sword on back',
    note: '黑色长发、红瞳、高壮'
  });
}

/* ---------- 筛选 ---------- */
/* 作品筛选是否命中（没选任何作品 = 不过滤） */
function ipPass(it){
  return !state.libIps.length || state.libIps.indexOf(it.ip) >= 0;
}

function libFiltered(){
  const q = state.libQ.trim();
  return libAll().filter(it => {
    if (state.libSrc === 'preset' && it.src !== 'preset') return false;
    if (state.libSrc === 'mine' && it.src !== 'mine') return false;
    /* 按作品筛选（多选，与主项目角色选择器同逻辑） */
    if (!ipPass(it)) return false;
    if (it.gender === 'male' && !state.libMale) return false;
    if (it.gender !== 'male' && !state.libFemale) return false;
    return cardMatches(it, q);
  });
}

/* ---------- 按作品筛选（PRESET_IPS 9 个作品，与主项目同逻辑） ----------
   2026-10-09 轮次 N 修的两个毛病：
     · 「点了没反馈」：以前 chip 只在 bind() 里画一次，点完不重绘，选中态永远不亮。
       现在高亮交给 renderCharLib() 统一重刷，任何筛选动作都会同步。
     · 「计数显示错误」：以前 libCounts() 不算作品筛选，顶部「全部 / 预设 / 我的」
       三位数一直是全量，与过滤后的列表对不上。现在两边口径一致。
   选中任一作品时，行末追加一枚「✕ 清空作品筛选」，一键回到全部。 */
function renderIpChips(){
  const box = $('#libIpChips');
  if (!box || typeof PRESET_IPS === 'undefined') return;
  box.innerHTML = '';
  PRESET_IPS.forEach(ip => {
    const on = state.libIps.indexOf(ip) >= 0;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (on ? ' on' : '');
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    const cnt = libAll().filter(c => c.ip === ip).length;
    b.textContent = ip + ' ' + cnt;
    b.title = '只看「' + ip + '」的角色（可多选，再点取消）';
    b.addEventListener('click', () => {
      toggleIn(state.libIps, ip);
      renderCharLib();
    });
    box.appendChild(b);
  });

  /* 有筛选时给个显眼的退出口，省得逐个再点一遍 */
  if (state.libIps.length){
    const clr = document.createElement('button');
    clr.type = 'button';
    clr.className = 'chip chip-clr';
    clr.textContent = '✕ 清空作品筛选';
    clr.title = '取消全部作品筛选，回到全部 ' + libAll().length + ' 个角色';
    clr.addEventListener('click', () => { state.libIps.length = 0; renderCharLib(); });
    box.appendChild(clr);
  }

  /* 标题行的小提示也跟着变，点完一眼能看到"选中了几个" */
  const hint = $('#libIpHint');
  if (hint) hint.textContent = state.libIps.length
    ? '已选 ' + state.libIps.length + ' 个作品 · 再点标签取消'
    : '点标签只看某个作品，可多选';
}

/* 来源按钮上的实时计数（受作品 / 搜索 / 性别筛选影响，不受来源自身限制）
   作品筛选也算进来，保证「全部 / 内置预设 / 我的角色」三个数字与本页列表口径一致 */
function libCounts(){
  const q = state.libQ.trim();
  const pass = it => {
    if (!ipPass(it)) return false;
    if (it.gender === 'male' && !state.libMale) return false;
    if (it.gender !== 'male' && !state.libFemale) return false;
    return cardMatches(it, q);
  };
  const all = libAll();
  return {
    all: all.filter(pass).length,
    preset: all.filter(it => it.src === 'preset' && pass(it)).length,
    mine: all.filter(it => it.src === 'mine' && pass(it)).length
  };
}

/* ---------- 渲染 ---------- */
const GLYPH = { female: '♀', male: '♂', futa: '⚥' };

/* 「衣着状态」四值判定（旧存档里状态值曾写在 outfitPick 里，用于迁移） */
function isOutfitStateValue(v){
  return v === OUTFIT_NUDE || v === OUTFIT_HALF || v === OUTFIT_TOPLESS || v === OUTFIT_NORMAL;
}

/* 服饰板块 = 两个选择器（2026-10-09 轮次 L 从单个下拉拆开）：
     #psOutfitState —— 衣着状态：'' 默认（随机状态）/ 正常着衣 / 半脱 / 露胸 / 全裸（后三者夜灯限定）
     #psOutfitPick  —— 具 体 服 装：'' 默认（角色原设服装）/ 随机换装 / 成套服饰（夜灯亮时再挂成人向组）
   两者可同时选；全裸与服装互斥（引擎里全裸优先）。选项随模式重建。 */
function fillOutfitOptions(){
  const nsfw = (state.mode === 'nsfw');

  /* 旧存档 / 旧调用兼容：状态值以前存在 outfitPick 里 → 搬到 outfitState，outfitPick 归 '' */
  if (isOutfitStateValue(state.outfitPick)){
    if (!state.outfitState) state.outfitState = state.outfitPick;
    state.outfitPick = '';
  }

  /* ① 衣着状态 */
  const stSel = $('#psOutfitState');
  if (stSel){
    const keepSt = stSel.value || state.outfitState;
    const stOpts = [
      { v: '',              t: '默认（随机状态）' },
      { v: OUTFIT_NORMAL,   t: '正常着衣' },
      { v: OUTFIT_HALF,     t: '半脱', night: true },
      { v: OUTFIT_TOPLESS,  t: '露胸', night: true },
      { v: OUTFIT_NUDE,     t: '全裸', night: true }
    ];
    const usableSt = stOpts.filter(o => !(o.night && !nsfw));
    stSel.innerHTML = usableSt
      .map(o => '<option value="' + esc(o.v) + '">' + esc(o.t) + '</option>').join('');
    state.outfitState = usableSt.some(o => o.v === keepSt) ? keepSt : '';
    stSel.value = state.outfitState;
  }

  /* ② 具体服装 */
  const sel = $('#psOutfitPick');
  if (sel){
    const keep = sel.value || state.outfitPick;
    const opts = [
      { group: '',  v: '',             t: '默认（角色原设服装）' },
      { group: '',  v: OUTFIT_RANDOM,  t: '随机换装（另抽一套）' }
    ];
    (typeof ANIME_OUTFIT !== 'undefined' ? ANIME_OUTFIT : []).forEach(o => opts.push({ group: '成套服饰', v: o, t: o }));
    if (nsfw && typeof ANIME_OUTFIT_NSFW !== 'undefined'){
      ANIME_OUTFIT_NSFW.forEach(o => opts.push({ group: '成人向服饰', v: o, t: o }));
    }
    let html = '', curGroup = null;
    opts.forEach(o => {
      if (o.group !== curGroup){
        if (curGroup) html += '</optgroup>';
        if (o.group) html += '<optgroup label="' + esc(o.group) + '">';
        curGroup = o.group;
      }
      html += '<option value="' + esc(o.v) + '">' + esc(o.t) + '</option>';
    });
    if (curGroup) html += '</optgroup>';
    sel.innerHTML = html;
    state.outfitPick = opts.some(o => o.v === keep) ? keep : '';
    sel.value = state.outfitPick;
  }

  const hint = $('#psOutfitHint');
  if (hint) hint.textContent = nsfw
    ? '状态与服装可同时选；不选 = 角色原来的服饰；「半脱 / 露胸 / 全裸」需先点亮夜灯'
    : '不选 = 角色原来的服饰（「半脱 / 露胸 / 全裸」需先点亮夜灯）';
}

function renderCharLib(){
  const box = $('#charLib');
  const list = libFiltered();
  const c = libCounts();
  const q = state.libQ.trim();

  /* 作品 chip 的高亮 / 清空按钮 / 提示文案都跟着筛选状态走 */
  renderIpChips();

  /* 角标 = 当前列表条数，和列表口径一致（以前写的是全量，切来源就对不上） */
  $('#charCount').textContent = list.length;
  $('#nAll').textContent = c.all;
  $('#nPreset').textContent = c.preset;
  $('#nMine').textContent = c.mine;
  $('#libHit').textContent = q
    ? '命中 ' + list.length + ' 个' + (state.libSrc === 'all' ? '' : '（当前来源）')
    : '共 ' + list.length + ' 个角色';

  /* 来源与密度按钮状态 */
  $$('#libSource .src-btn').forEach(b => b.classList.toggle('is-active', b.dataset.src === state.libSrc));
  $$('#libDens .dens-btn').forEach(b => b.classList.toggle('is-active', b.dataset.dens === state.libDens));
  $('#libSearchClr').classList.toggle('on', !!q);

  box.className = state.libDens === 'compact' ? 'lib-list' : 'lib-grid';
  box.innerHTML = '';

  if (!list.length){
    $('#libEmpty').hidden = false;
    $('#libEmpty').textContent = q
      ? '没有匹配「' + q + '」的角色，换个关键词试试。'
      : (state.libIps.length
        ? '作品筛选「' + state.libIps.join(' / ') + '」下没有角色；点上面的「✕ 清空作品筛选」看全部。'
        : (state.libSrc === 'mine' ? '还没有自己的角色。点右上角「＋ 新建卡」，或从内置预设「存入我的角色」。'
          : '这个筛选下没有角色。'));
    return;
  }
  $('#libEmpty').hidden = true;

  if (state.libDens === 'compact') list.forEach(it => box.appendChild(compactRow(it, q)));
  else list.forEach(it => box.appendChild(gridCard(it, q)));
}

/* 紧凑列表：一行一个，一屏 15+ 个 */
function compactRow(it, q){
  const d = document.createElement('div');
  d.className = 'lib-row'
    + (state.psCard && state.psCard.id === it.id ? ' is-on' : '')
    + (state.picked.includes(it.id) ? ' is-picked' : '');
  d.dataset.id = it.id;
  d.dataset.src = it.src;
  d.innerHTML =
    '<span class="lr-g">' + (GLYPH[it.gender] || '?') + '</span>' +
    '<span class="lr-name">' + escHl(it.name || '未命名', q) + '</span>' +
    '<span class="lr-tag">' + (it.src === 'preset' ? '预设' : '自建') + '</span>' +
    (it.ip ? '<span class="lr-ip">' + escHl(it.ip, q) + '</span>' : '') +
    '<span class="lr-note">' + escHl(it.note || it.base || '', q) + '</span>' +
    '<span class="lr-ops">' +
      (it.src === 'preset'
        ? '<button type="button" class="mini-btn" data-act="keep" title="复制一份到我的角色，之后可以随意改">存入</button>'
        : '') +
      '<button type="button" class="mini-btn" data-act="gen">随机补全</button>' +
      '<button type="button" class="mini-btn" data-act="more">更多</button>' +
    '</span>';
  return d;
}

/* 卡片网格：一屏 6–8 个，适合细看外貌提示词 */
function gridCard(it, q){
  const d = document.createElement('div');
  d.className = 'char-card'
    + (state.psCard && state.psCard.id === it.id ? ' is-on' : '')
    + (state.picked.includes(it.id) ? ' is-picked' : '');
  d.dataset.id = it.id;
  d.dataset.src = it.src;
  const ops = it.src === 'preset'
    ? '<button type="button" class="mini-btn" data-act="gen">随机补全</button>' +
      '<button type="button" class="mini-btn" data-act="base">只用外貌</button>' +
      '<button type="button" class="mini-btn" data-act="keep">存入我的角色</button>' +
      '<button type="button" class="mini-btn" data-act="cast">选入子页</button>'
    : '<button type="button" class="mini-btn" data-act="prompt">提示词</button>' +
      '<button type="button" class="mini-btn" data-act="copy">复制</button>' +
      '<button type="button" class="mini-btn" data-act="cast">选入子页</button>' +
      '<button type="button" class="mini-btn" data-act="edit">编辑</button>' +
      '<button type="button" class="mini-btn" data-act="del">删除</button>';
  d.innerHTML =
    '<span class="cc-tag">' + (it.src === 'preset' ? '预设' : '自建') + '</span>' +
    '<div class="cc-gender">' + (GLYPH[it.gender] || '?') + '</div>' +
    '<div class="cc-top">' +
      '<div class="cc-avatar">' + esc((it.name || '?').slice(0, 1)) + '</div>' +
      '<div style="min-width:0">' +
        '<div class="cc-name">' + escHl(it.name || '未命名', q) + '</div>' +
        '<div class="cc-sub">' + escHl(it.note || '未填写外貌备注', q) + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="cc-base">' + escHl(it.base || '（未填写基础提示词）', q) + '</div>' +
    '<div class="cc-ops">' + ops + '</div>';
  return d;
}

/* 卡片上的操作（事件委托） */
function onCharLibClick(e){
  const host = e.target.closest('.lib-row') || e.target.closest('.char-card');
  if (!host) return;
  const it = libAll().find(x => x.id === host.dataset.id);
  if (!it) return;
  const btn = e.target.closest('[data-act]');

  /* 点基础提示词 = 折叠/展开全文 */
  const baseEl = e.target.closest('.cc-base');
  if (baseEl){ baseEl.classList.toggle('open'); return; }

  /* 点空白处 = 选中/取消（供情境子页使用） */
  if (!btn){
    const i = state.picked.indexOf(it.id);
    if (i >= 0) state.picked.splice(i, 1); else state.picked.push(it.id);
    host.classList.toggle('is-picked', state.picked.includes(it.id));
    return;
  }
  const act = btn.dataset.act;

  /* 预设专属：随机补全 / 只用外貌 / 存入我的角色 */
  if (act === 'gen'){ genPreset(it); goPage('chars'); return; }
  if (act === 'base'){ copyText(it.base || ''); return; }
  if (act === 'keep'){
    /* 判重，避免连点堆出一排一样的卡 */
    const dup = state.charLib.find(c =>
      (c.name || '') === (it.name || '') && (c.base || '') === (it.base || ''));
    if (dup){ toast('「' + (it.name || '未命名') + '」已经在我的角色里了'); return dup; }
    const fresh = addCard({
      name: it.name, nameEn: it.nameEn || cardNameEn(it),
      gender: it.gender, ip: it.ip,
      core: it.core, outfit: it.outfit, base: it.base, note: it.note
    });
    toast('已存入「我的角色」');
    return fresh;
  }
  if (act === 'more'){
    /* 紧凑视图的「更多」= 在卡片视图里定位到它，方便看完整外貌 */
    state.libDens = 'card';
    renderCharLib();
    toast('已切到卡片视图');
    return;
  }

  /* 共用操作 */
  if (act === 'cast'){
    const empty = state.slots.indexOf(null);
    if (empty >= 0) state.slots[empty] = it.id; else state.slots.push(it.id);
    renderCast();
    goPage('story');
    toast('已选入情境子页');
    return;
  }
  if (act === 'copy'){ copyText(it.base || ''); return; }

  if (act === 'prompt'){
    const ctx = Object.assign(buildCtx(), { actors: 1, gender: it.gender });
    ctx.activeTags = pickActiveTags(ctx, it.gender === 'male' || it.gender === 'futa');
    const scene = makeScene(ctx);
    const full = buildPrompt(ctx, [pseudoCharFromCard(it)], scene);
    let box = host.querySelector('.cc-prompt');
    if (box){ box.remove(); return; }
    box = document.createElement('div');
    box.className = 'cc-prompt';
    box.innerHTML =
      '<div class="cpp-t">基础提示词</div>' +
      '<div class="cpp-b">' + esc(it.base || '（空）') + '</div>' +
      '<div class="cpp-t">当前设定下的完整提示词</div>' +
      '<div class="cpp-b">' + esc(full) + '</div>' +
      '<button type="button" class="mini-btn" data-copy="base">复制基础</button> ' +
      '<button type="button" class="mini-btn" data-copy="full">复制完整</button>';
    box.querySelector('[data-copy="base"]').addEventListener('click', ev => { ev.stopPropagation(); copyText(it.base || ''); });
    box.querySelector('[data-copy="full"]').addEventListener('click', ev => { ev.stopPropagation(); copyText(full); });
    host.appendChild(box);
    return;
  }
  if (act === 'edit'){ openCharModal(it); return; }
  if (act === 'del'){
    const i = state.charLib.indexOf(it);
    if (i >= 0) state.charLib.splice(i, 1);
    const pi = state.picked.indexOf(it.id);
    if (pi >= 0) state.picked.splice(pi, 1);
    state.slots = state.slots.map(s => (s === it.id ? null : s));
    saveCharLib(); renderCharLib(); renderCast();
    toast('已删除');
    return;
  }
}

/* 生成一条提示词并展示（随机补全） */
function genPreset(card){
  const ctx = Object.assign(buildCtx(), { actors: 1, gender: card.gender,
    recloth: state.outfitPick === OUTFIT_RANDOM,
    outfitPick: state.outfitPick, outfitState: state.outfitState });
  ctx.activeTags = pickActiveTags(ctx, card.gender === 'male' || card.gender === 'futa');
  const res = buildPresetPrompt(card, ctx);
  state.psCard = card;
  state.psResult = res;

  $('#psTarget').innerHTML =
    '<div class="psc-head"><span class="psc-name">' + esc(card.name) + '</span>' +
    '<span class="psc-g">' + (GLYPH[card.gender] || '?') + '</span></div>' +
    '<div class="psc-ip">' + esc([card.ip, card.note].filter(Boolean).join(' · ')) + '</div>' +
    '<div class="psc-core">' + esc(card.base || '') + '</div>';

  const info = res.info;
  $('#psInfo').innerHTML = Object.keys(info).map(k =>
    '<div class="psi-row"><span class="psi-k">' + esc(k) + '</span><span class="psi-v">' + esc(info[k]) + '</span></div>'
  ).join('');

  $('#psPos').value = res.prompt;
  $('#psNeg').value = res.negative;
  renderCharLib();
  renderPsHint();
}

function renderPsHint(){
  const M = MODEL_PRESETS[state.model] || MODEL_PRESETS.illustrious;
  $('#psModelHint').textContent = '底模：' + M.name + ' —— ' + M.hint + '。切换底模在右上角。';
  $('#psModeTag').textContent = '当前：' + (state.mode === 'nsfw' ? 'NSFW 成人' : 'SFW 清水');
}

/* =========================================================
   人物卡编辑弹窗
   一张卡 = { name, gender, base, note }
   base 是"只含外貌"的英文基础提示词
   ========================================================= */

/* 规范化：全角逗号/顿号/分号统一成半角逗号，去掉多余空格与空标签 */
function normBase(s){
  return String(s || '')
    .replace(/[，、；;]/g, ',')
    .replace(/\s+/g, ' ')
    .split(',')
    .map(x => x.trim())
    .filter(Boolean)
    .join(', ');
}

function openCharModal(item){
  state.editing = item || null;
  $('#modalTitle').textContent = item ? '编辑人物卡' : '新建人物卡';
  $('#edName').value  = item ? (item.name || '') : '';
  $('#edNameEn').value = item ? (item.nameEn || '') : '';
  $('#edGender').value = item ? (item.gender || 'female') : 'female';
  $('#edIp').value    = item ? (item.ip || '') : '';
  /* 卡有独立 outfit 时基础提示词框只回填外貌（core），服饰回填到「默认服饰」框 */
  $('#edBase').value  = item ? (item.core || item.base || '') : '';
  $('#edOutfit').value = item ? (item.outfit || '') : '';
  $('#edNote').value  = item ? (item.note || '') : '';
  $('#charModal').hidden = false;
  setTimeout(() => $('#edName').focus(), 30);
}

function closeCharModal(){
  $('#charModal').hidden = true;
  state.editing = null;
}

function saveFromEditor(){
  const nameEn = $('#edNameEn').value.trim();
  const name  = $('#edName').value.trim() || nameEn || '未命名';
  const gender = $('#edGender').value;
  const ip    = $('#edIp').value.trim();
  const base  = normBase($('#edBase').value);
  /* 默认服饰（2026-10-09 新增）：填了就与预设卡同构 ——
     core = 外貌（基础提示词框），outfit = 服饰，base = 二者拼接 */
  const outfit = normBase($('#edOutfit').value);
  const core = outfit ? base : '';
  const fullBase = outfit ? normBase(base + ', ' + outfit) : base;
  const note  = $('#edNote').value.trim();

  if (!base){ toast('基础提示词不能为空'); $('#edBase').focus(); return; }

  try {
    if (state.editing){
      state.editing.name = name;
      state.editing.nameEn = nameEn;
      state.editing.gender = gender;
      state.editing.ip = ip;
      state.editing.core = core;
      state.editing.outfit = outfit;
      state.editing.base = fullBase;
      state.editing.note = note;
      saveCharLib();
      renderCharLib();
      renderCast();
      toast('已保存');
    } else {
      const it = addCard({ name: name, nameEn: nameEn, gender: gender, ip: ip, core: core, outfit: outfit, base: fullBase, note: note });
      const empty = state.slots.indexOf(null);
      if (empty >= 0) state.slots[empty] = it.id; else state.slots.push(it.id);
      renderCast();
      toast('已新建并选入子页');
    }
  } finally {
    /* 无论中间出什么岔子，弹窗都必须关掉 */
    closeCharModal();
  }
}

/* =========================================================
   情境子页
   ========================================================= */
function renderCast(){
  const box = $('#castList');
  const all = libAll();
  box.innerHTML = '';
  if (!all.length){
    box.innerHTML = '<p class="slot-empty">角色库为空，先到「角色库」新建或生成一张卡。</p>';
    return;
  }
  state.slots.forEach((sid, i) => {
    const d = document.createElement('div');
    d.className = 'slot' + (sid ? ' is-set' : '');
    const opts = all.map(it =>
      '<option value="' + it.id + '"' + (it.id === sid ? ' selected' : '') + '>' +
      esc(it.name) + '（' + (GLYPH[it.gender] || '?') + '）</option>'
    ).join('');
    const cur = sid ? all.find(x => x.id === sid) : null;
    d.innerHTML =
      '<div class="slot-head"><span>人物 ' + (i + 1) + '</span>' +
      '<button type="button" class="op-btn" data-rm="' + i + '" title="移除">✕</button></div>' +
      '<select data-slot="' + i + '"><option value="">— 不参与 —</option>' + opts + '</select>' +
      (cur ? '<div class="slot-base" title="' + esc(cur.base) + '">' + esc(cur.base) + '</div>' : '');
    box.appendChild(d);
  });
}

function genShort(n){
  const all = libAll();
  const cast = state.slots
    .map(id => all.find(it => it.id === id))
    .filter(Boolean)
    .map(it => pseudoCharFromCard(it, state.stWorld));
  if (!cast.length){ toast('先在左侧选择至少一位人物'); return; }

  const ctx = {
    mode: state.stMode,
    world: state.stWorld,
    gender: 'random',
    actors: cast.length,
    artstyle: state.stArt,
    pov: state.stPov,
    tags: state.stTags.slice()
  };
  const hasPenis = cast.some(c => c.gender === 'male' || c.gender === 'futa');
  ctx.activeTags = pickActiveTags(ctx, hasPenis);
  const scene = makeScene(ctx);

  const out = [];
  for (let i = 0; i < n; i++) out.push(buildShortStory(ctx, cast, scene));
  state.shortResults = out;

  showShort(out[0]);
  $('#shortTagInfo').textContent = (state.stMode === 'nsfw')
    ? '标签：' + (ctx.activeTags || []).map(id => (NSFW_TAGS.find(t => t.id === id) || {}).name || id).join(' / ')
    : '';

  const b = $('#shortBatch');
  b.innerHTML = '';
  out.forEach((s, i) => {
    const d = document.createElement('div');
    d.className = 'short-item';
    d.innerHTML = '<span class="si-idx">' + (i + 1) + '</span><span>' + esc(s) + '</span>';
    d.addEventListener('click', () => showShort(s));
    b.appendChild(d);
  });
}

function showShort(s){
  $('#shortOut').textContent = s;
  const L = s.replace(/\s/g, '').length;
  const el = $('#shortLen');
  el.textContent = '字数 ' + L;
  el.className = (L >= 50 && L <= 100) ? 'ok' : '';
}

/* =========================================================
   页面切换
   ========================================================= */
function goPage(p){
  $$('#pageNav .page-tab').forEach(t => t.classList.toggle('is-active', t.dataset.page === p));
  $('#pageChars').hidden = (p !== 'chars');
  $('#pageStory').hidden = (p !== 'story');
  if (p === 'chars'){ renderCharLib(); renderPsHint(); }
  if (p === 'story') renderCast();
}

/* ---------- 运行环境自检（「双击打开」与「本地服务」的差异提示） ---------- */
/* 实测探测 localStorage 是否真的可用：某些浏览器策略下会静默失败，
   表面"存了"、刷新即丢。失败时在界面上给出可见告警，而不是假装成功。 */
function storageUsable(){
  try {
    const k = '__randgen_probe__';
    localStorage.setItem(k, '1');
    const ok = localStorage.getItem(k) === '1';
    localStorage.removeItem(k);
    return ok;
  } catch (e){ return false; }
}
function annotateEnv(){
  const el = $('#storeEnvTip');
  if (!el) return;
  const isFile = location.protocol === 'file:';
  const ok = storageUsable();
  const parts = [];
  parts.push(isFile
    ? '打开方式：本地文件（双击 index.html）· 存档存在本机浏览器里'
    : '打开方式：本地服务（' + location.origin + '）· 存档存在本机浏览器里');
  parts.push(isFile
    ? '换电脑请先点「备份全部存档」带走。注意「本地文件」与「本地服务」两种打开方式的存档互不相通。'
    : '同一台机器上，改用「本地文件」方式打开时看不到这里的存档，反之亦然。');
  if (!ok) parts.push('⚠ 当前浏览器禁止本地存储，保存会失效——请换 Chrome / Edge 打开，或每次手动导出。');
  el.textContent = parts.join('　');
}

/* ---------- 启动 ---------- */
function init(){
  buildPresetCards();          /* 内置预设 → 统一卡结构 */
  state.charLib = loadMyCards();/* "我的角色"从 localStorage 读 */

  /* 默认清水：先按 SFW 起，再读解锁状态；已解锁则直接点亮 */
  state.mode = 'sfw';
  renderTagChips();
  bind();
  fillOutfitOptions();
  loadUnlock();
  if (state.unlocked) state.mode = 'nsfw';

  renderCharLib();
  renderCast();
  renderPsHint();
  annotateEnv();

  /* URL 带 ?mode=nsfw 时，只有已解锁才生效；没解锁则停在清水并提示 */
  let wantNsfw = false;
  try {
    const m = new URLSearchParams(location.search).get('mode');
    if (m === 'nsfw') wantNsfw = true;
  } catch (e){}
  if (wantNsfw && !state.unlocked){
    state.mode = 'sfw';
    setTimeout(() => toast('成人内容需先点亮夜灯'), 600);
  } else if (wantNsfw && state.unlocked){
    state.mode = 'nsfw';
  }

  applyModeUI();

  /* 首次使用自动铺 3 张示例卡，避免"我的角色"空空如也 */
  if (!state.charLib.length) seedCards();
  /* 情境子页默认给第一个位置安排一张卡，省得进来是空的 */
  if (!state.slots.some(Boolean) && libAll().length){
    state.slots[0] = libAll()[0].id;
    renderCast();
  }
  renderCharLib();
  goPage('chars');
}

document.addEventListener('DOMContentLoaded', init);
