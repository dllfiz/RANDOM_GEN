/* =========================================================
   app.js —— 界面与交互
   ========================================================= */

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.prototype.slice.call(document.querySelectorAll(s));

const LS_HIS = 'randgen_history';
const LS_FAV = 'randgen_fav';
/* 历史存储上限（轮次 X：60 → 200；收藏不限量） */
const HISTORY_MAX = 200;
const FAV_MAX = 100;
const LS_AUTOTRIM = 'randgen_autotrim';
const LS_CHARS = 'randgen_chars';
const LS_UNLOCK = 'randgen_unlock_nsfw';
const LS_CNEG = 'randgen_custom_neg';
const LS_SEED = 'randgen_seed';
const LS_TAG_PRESETS = 'randgen_tag_presets';

const state = {
  mode: 'sfw',
  model: 'animagine',
  gender: 'random',
  /* 出场构成（NSFW）：男/女人数分开选，actors = 两者之和（至少 1）。
     默认必须与 #actorsM/#actorsF 选择器的默认项一致（M=0 / F=1 = 单人女），
     否则首轮生成会按「另一个值」算，得手动切一次下拉才对齐。 */
  actorsM: 0,
  actorsF: 1,
  actors: 1,
  artstyle: 'random',
  artistPicks: [],       /* 手选画师（英文标签串），为空 = 用随机画风 */
  artistOpen: false,
  artistQ: '',
  artistCats: [],        /* 画师按风格类别筛选（多选，meta.artist.names） */
  tags: [],
  tagW: {},              /* 点击加权：tagId → 1 勾选（必出）/ 2 ★((tag:1.2)) / 3 ★★((tag:1.5)) */
  themes: [],            /* 一键题材包：选中的主题 key（R18_THEMES），只在夜灯下生效 */
  themeW: {},            /* 题材包加权：主题 key → 1 / 2 / 3，语义同 tagW */
  actPicks: [],          /* 动作自选：MS_CODEX 下标数组（勾选必出整组 tag） */
  actQ: '',              /* 动作自选搜索词 */
  posCat: '',            /* 体位类别：'' 随机 / front / back / ride / oral */
  /* 场景自选：null = 随机；有值则锁定该项（中文原文，引擎按中文反查英文） */
  scenePick: {
    place: null,
    time: null,
    mood: null,
    camera: null,
    action: null,
    tone: null,
    eye: null
  },
  /* 体型自选：null=随机；锁定时 { id, zh, en, weight } weight 为 1 / 1.2 / 1.5 */
  bodyPick: null,
  current: null,
  history: [],
  fav: [],
  storeTab: 'history',
  /* 角色库筛选与视图 */
  charLib: [],            /* 自建角色卡（localStorage 持久化，见 loadMyCards） */
  pickSrc: 'all',         /* 角色来源筛选：all / preset / mine */
  /* 生成器：选择角色（不选 = 纯随机） */
  pickOpen: false,
  pickIds: [],
  pickRandom: false,     /* 随机抽卡：每次生成都从卡池抽（遵循作品/性别筛选），忽略手动勾选 */
  pickQ: '',
  pickFemale: true,
  pickMale: true,
  pickIps: [],           /* 角色选择器：按作品筛选（多选，PRESET_IPS） */
  genderLocked: false,   /* 已选角色卡时锁定性别选择器（改了会跟卡打架） */
  editing: null,          /* 正在编辑的自建卡（null = 新建） */
  /* 服装（#outfitPick）：'' = 默认（角色原设服装）/ '__random__' 随机换装 /
     其余 = 具体成套服饰名。旧版那个独立的「随机换装」开关已并入这个下拉，
     否则"默认"和开关会互相打架（开关默认勾着，就等于默认也要换掉原设）。 */
  outfitPick: '',
  /* 衣着状态（#outfitState，2026-10-09 轮次 L 从服饰下拉里拆出来）：
     '' 默认（随机状态）/ '__normal__' 正常着衣 / '__half__' 半脱 / '__topless__' 露胸 / '__nude__' 全裸。
     后三者只在夜灯下生效；状态与具体服装可同时选（例：露胸 + 兔女郎装），全裸与服装互斥（全裸优先）。 */
  outfitState: '',
  /* 随机种子：'' = 每次随机；数字字符串 = 固定种子（同配置可完全复现） */
  seed: '',
  lastSeed: null,
  /* 标签预设方案：[{ name, tags:[], tagW:{}, ts }] */
  tagPresets: [],
  /* 随机补全（角色库已独立成另一个项目，这里只留选择器所需） */
  psCard: null,
  psResult: null,
  /* NSFW 解锁 */
  unlocked: false,
  pendingMode: null
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
/* chip 四态点击循环：未选(0) → 勾选(1，必出) → ★(2，(tag:1.2)) → ★★(3，(tag:1.5)) → 未选 */
function tagWeightCycle(id){
  const next = ((state.tagW[id] || 0) + 1) % 4;
  if (next === 0) delete state.tagW[id]; else state.tagW[id] = next;
  const i = state.tags.indexOf(id);
  if (next === 0){ if (i >= 0) state.tags.splice(i, 1); }
  else if (i < 0) state.tags.push(id);
  return next;
}
function paintTagChip(b, name){
  const w = state.tagW[b.dataset.tag] || 0;
  b.classList.toggle('on', w >= 1);
  b.classList.toggle('hot', w >= 2);
  b.textContent = (w === 2 ? '★' : w === 3 ? '★★' : '') + name;
}

function buildChips(box){
  box.innerHTML = '';
  /* 60 个标签平铺太长，按 NSFW_TAG_GROUPS 分组；没写 group 的挂在「其他」下 */
  const groups = (typeof NSFW_TAG_GROUPS !== 'undefined' && NSFW_TAG_GROUPS.length)
    ? NSFW_TAG_GROUPS.slice() : [];
  const known = {};
  groups.forEach(g => { known[g.id] = true; });

  /* 大组默认收起（>30 条），点组头展开/收起——避免几百个 chip 平铺糊满整屏 */
  const FOLD_AT = 30;
  const render = (name, list) => {
    if (!list.length) return;
    const wrap = document.createElement('div');
    wrap.className = 'chip-group';
    const row = document.createElement('div');
    row.className = 'chip-group-body';
    if (name && list.length > FOLD_AT){
      wrap.classList.add('is-folded');
      const h = document.createElement('div');
      h.className = 'chip-group-head is-toggle';
      h.innerHTML = '<span class="chip-fold-ico">▸</span>' + name +
        ' <span class="chip-group-count">（' + list.length + '，点击展开）</span>';
      h.addEventListener('click', () => {
        const fold = wrap.classList.toggle('is-folded');
        h.querySelector('.chip-fold-ico').textContent = fold ? '▸' : '▾';
        h.querySelector('.chip-group-count').textContent =
          fold ? '（' + list.length + '，点击展开）' : '（' + list.length + '）';
      });
      wrap.appendChild(h);
    } else if (name){
      const h = document.createElement('div');
      h.className = 'chip-group-head';
      h.textContent = name;
      wrap.appendChild(h);
    }
    list.forEach(t => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.dataset.tag = t.id;
      /* 悬停显示该标签实际注入的英文 tags（来自 NS_TAG_EN） */
      b.title = (typeof NS_TAG_EN !== 'undefined' && NS_TAG_EN[t.id])
        ? String(NS_TAG_EN[t.id]).split(',').map(s => s.trim()).join('\n') +
          '\n（点一次勾选必出 · 再点一次 ★ 加权强调）'
        : '';
      paintTagChip(b, t.name);
      b.addEventListener('click', () => {
        tagWeightCycle(t.id);
        paintTagChip(b, t.name);
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

function renderTagChips(){
  const box = $('#tagChips');
  if (box) buildChips(box);
}

/* 全选 / 清空 / 反选：按勾选（权重 1）处理，chip 文字与 ★ 状态同步重刷 */
function setTags(ids){
  state.tags = ids.slice();
  state.tagW = {};
  state.tags.forEach(id => { state.tagW[id] = 1; });
  $$('#tagChips .chip').forEach(c => {
    paintTagChip(c, (c.textContent || '').replace(/^★/, ''));
  });
}

/* ---------- 标签预设方案（localStorage randgen_tag_presets） ---------- */
function loadTagPresets(){
  try {
    const a = JSON.parse(localStorage.getItem(LS_TAG_PRESETS) || '[]');
    return Array.isArray(a) ? a : [];
  } catch (e){ return []; }
}
function saveTagPresets(){
  try { localStorage.setItem(LS_TAG_PRESETS, JSON.stringify(state.tagPresets || [])); } catch (e){}
}
/* 把当前勾选（含★权重）存成命名方案 */
function saveTagPreset(){
  if (!state.tags.length){ toast('先勾选内容标签再存方案'); return; }
  const nameEl = $('#tagPresetName');
  const name = (nameEl && nameEl.value.trim()) || ('方案 ' + (state.tagPresets.length + 1));
  state.tagPresets.push({ name, tags: state.tags.slice(), tagW: Object.assign({}, state.tagW), ts: Date.now() });
  saveTagPresets();
  if (nameEl) nameEl.value = '';
  renderTagPresets();
  toast('已存方案「' + name + '」（' + state.tags.length + ' 个标签）');
}
/* 载入方案：tags 与权重（★）一并还原 */
function applyTagPreset(i){
  const p = state.tagPresets[i];
  if (!p) return;
  state.tags = p.tags.slice();
  state.tagW = Object.assign({}, p.tagW || {});
  /* 权重缺失的按 1 补（旧格式 / 手改过存档） */
  state.tags.forEach(id => { if (!state.tagW[id]) state.tagW[id] = 1; });
  $$('#tagChips .chip').forEach(c => {
    paintTagChip(c, (c.textContent || '').replace(/^★/, ''));
  });
  toast('已载入方案「' + p.name + '」（' + p.tags.length + ' 个标签）');
}
function delTagPreset(i){
  const p = state.tagPresets[i];
  if (!p) return;
  state.tagPresets.splice(i, 1);
  saveTagPresets();
  renderTagPresets();
  toast('已删除方案「' + p.name + '」');
}
function renderTagPresets(){
  const box = $('#tagPresetChips');
  if (!box) return;
  box.innerHTML = '';
  if (!state.tagPresets.length){
    box.innerHTML = '<span class="hint">暂无方案：勾好标签后点「💾 存为方案」</span>';
    return;
  }
  state.tagPresets.forEach((p, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = p.name + ' (' + p.tags.length + ')';
    b.title = p.tags.join(', ');
    b.addEventListener('click', () => applyTagPreset(i));
    box.appendChild(b);
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'mini-btn danger';
    del.textContent = '✕';
    del.title = '删除方案「' + p.name + '」';
    del.addEventListener('click', () => delTagPreset(i));
    box.appendChild(del);
  });
}

/* ---------- 一键题材包（R18_THEMES，18 类） ---------- */
function renderThemeChips(){
  const box = $('#themeChips');
  if (!box || typeof R18_THEMES === 'undefined') return;
  box.innerHTML = '';
  const ZH = (typeof R18_TAG_ZH !== 'undefined')
    ? Object.assign({}, R18_TAG_ZH, (typeof R18_TAG_ZH_EXTRA !== 'undefined' ? R18_TAG_ZH_EXTRA : {})) : {};
  R18_THEMES.forEach(t => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    /* 悬停展示该主题整组 tags 及中文对照（R18_TAG_ZH + R18_TAG_ZH_EXTRA） */
    b.title = t.tags.map(en => ZH[en] ? en + ' · ' + ZH[en] : en).join('\n') +
      '\n（点一次勾选必出 · 再点一次 ★ 加权强调）';
    const paint = () => {
      const w = state.themeW[t.key] || 0;
      b.classList.toggle('on', w >= 1);
      b.classList.toggle('hot', w >= 2);
      b.textContent = (w === 2 ? '★' : w === 3 ? '★★' : '') + t.zh;
    };
    paint();
    b.addEventListener('click', () => {
      /* 与内容标签一致的四态循环：未选 → 勾选（整组必出）→ ★(1.2) → ★★(1.5) */
      const next = ((state.themeW[t.key] || 0) + 1) % 4;
      if (next === 0) delete state.themeW[t.key]; else state.themeW[t.key] = next;
      const i = state.themes.indexOf(t.key);
      if (next === 0){ if (i >= 0) state.themes.splice(i, 1); }
      else if (i < 0) state.themes.push(t.key);
      paint();
      doGenerate(false);   /* 立即按新题材重出一版，所见即所得 */
    });
    box.appendChild(b);
  });
}

/* ---------- 按作品筛选（角色选择器，PRESET_IPS 9 个作品） ---------- */
function renderIpChips(){
  const box = $('#pickIpChips');
  if (!box || typeof PRESET_IPS === 'undefined') return;
  box.innerHTML = '';
  PRESET_IPS.forEach(ip => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (state.pickIps.indexOf(ip) >= 0 ? ' on' : '');
    const cnt = allCards().filter(c => c.ip === ip).length;
    b.textContent = ip + ' ' + cnt;
    b.title = '只看「' + ip + '」的角色（再点一次取消）';
    b.addEventListener('click', () => {
      toggleIn(state.pickIps, ip);
      renderPick();
    });
    box.appendChild(b);
  });

  /* 与 role-studio 角色库一致：选中作品后给一个一键退出口 */
  if (state.pickIps.length){
    const clr = document.createElement('button');
    clr.type = 'button';
    clr.className = 'chip chip-clr';
    clr.textContent = '✕ 清空作品筛选';
    clr.title = '取消全部作品筛选，回到全部 ' + allCards().length + ' 个角色';
    clr.addEventListener('click', () => { state.pickIps.length = 0; renderPick(); });
    box.appendChild(clr);
  }
}

/* ---------- 渲染提示词 ---------- */
/* ---------- token 估算与超限提示（阶段一 1.4） ----------
   CLIP text encoder 的可用上限是 225（77×3 段），超出部分被静默截断：
   用户看到提示词还在，但尾部内容模型根本没读到 —— 表现出来的就是
   「明明写了，图里却没有」。实测四人+重度配置 98% 超限（评估文档 §4.1）。

   file:// 下加载不了 wasm 分词器或外部词典，所以用启发式估算，并与文档基线的
   「段数 × 2.2」取 max 兜底 —— 宁可高估，不能低估（低估等于什么都没提示）。
   提示词是多行结构（质量词行 / 人数行 / random N: 角色行 / 动作行），换行、冒号、
   加权括号 (tag:1.2) 各自都占 token，只按 split(',') 数段会系统性低估。 */
const TOKEN_LIMIT = 225;
/* 底模上限预留位：animagine / illustrious / pony 都是 SDXL 系，上限一致 */
const TOKEN_LIMIT_BY_MODEL = {
  illustrious: 225, animagine: 225, pony: 225, noobai: 225,
  wai_illu_v170: 225, wai_illu_v160: 225, wai_illu_v140: 225,
  illu_xl_v11: 225, illu_xl10_v10: 225, coco_noobai_v70: 225
};
function tokenLimit(){ return TOKEN_LIMIT_BY_MODEL[state.model] || TOKEN_LIMIT; }

function estTokens(text){
  if (!text) return 0;
  let n = 0, segs = 0;
  const lines = String(text).split('\n');
  n += lines.length - 1;                        /* 换行各占 1 token */
  lines.forEach(function(line){
    const arr = line.split(',');
    n += arr.length - 1;                        /* 逗号各占 1 token */
    arr.forEach(function(seg){
      const s = seg.trim();
      if (!s) return;
      segs++;
      const lp = /^\(+/.exec(s);  if (lp) n += lp[0].length;
      const rp = /\)+$/.exec(s);  if (rp) n += rp[0].length;
      if (s.indexOf(':') >= 0) n += 1;          /* 加权冒号 / random 1: */
      const body = s.replace(/^[()]+/, '').replace(/[()]+$/, '')
                    .replace(/:[0-9.]+$/, '').trim();
      if (!body) return;
      body.split(/\s+/).forEach(function(w){
        w = w.replace(/[^A-Za-z0-9_-]/g, '');
        if (!w) return;
        w.split(/[-_]/).forEach(function(p){
          if (!p) return;
          n += p.length <= 4 ? 1 : (p.length <= 8 ? 1.3 : Math.min(4, Math.ceil(p.length / 4)));
        });
      });
    });
  });
  return Math.max(Math.round(n * 1.06), Math.round(segs * 2.2));
}

/* 自动裁剪：从尾部往前丢段。
   为什么从尾部：CLIP 本来就从尾部截断，我们主动裁掉的与它本来会丢的是同一批，
   区别只是用户知道丢了什么。不重排 —— 重排会破坏引擎排好的顺序（质量词在头、
   人数 tag 第二行），也会让 seed 复现的结果对不上。
   保护名单：人数 tag（丢了整张图的人数就错）+ random N: 角色行。
   注意这只是止损：四人+重度场景超限是结构性的（四个角色各占一长行，光角色描述
   就吃掉 150+ token），根治要靠「按角色分块预算」，属阶段二。 */
const TRIM_PROTECT = /^\s*\({0,2}\d*\s*(girl|boy|girls|boys|other|multiple|no humans)/i;
const TRIM_LOWVALUE = /^(masterpiece|best quality|high quality|normal quality|low quality|worst quality|anime style|anime coloring|clean lineart|cel shading|vibrant colors|soft gradient shading|detailed anime eyes|studio-quality|dreamy|sparkl\w*|cinematic|atmospheric|soft light|warm light|depth of field|lens flare)$/i;

function trimToLimit(text, limit){
  const lines = String(text || '').split('\n');
  const now = function(){ return estTokens(lines.join('\n')); };
  for (let pass = 0; pass < 2 && now() > limit; pass++){
    for (let li = lines.length - 1; li >= 0 && now() > limit; li--){
      const segs = lines[li].split(',');
      for (let si = segs.length - 1; si >= 0 && now() > limit; si--){
        const t = segs[si].trim();
        if (!t) continue;
        if (TRIM_PROTECT.test(t)) continue;
        /* 第一轮只丢低价值词；第二轮放开，但仍保住角色行 */
        if (pass === 0 && !TRIM_LOWVALUE.test(t)) continue;
        if (pass === 1 && /^\s*random\s+\d+\s*:/i.test(lines[li])) continue;
        segs.splice(si, 1);
        lines[li] = segs.join(',').replace(/,\s*,/g, ',').replace(/^,\s*/, '').replace(/,\s*$/, '');
      }
    }
  }
  return lines.filter(function(l){ return l.trim(); }).join('\n');
}

/* 自动裁剪开关：持久化在 localStorage，默认关闭（不改现有行为） */
function autoTrimOn(){
  try { return localStorage.getItem(LS_AUTOTRIM) === '1'; } catch (e){ return false; }
}
function setAutoTrim(v){
  try { localStorage.setItem(LS_AUTOTRIM, v ? '1' : '0'); } catch (e){}
}

/* 结果卡下方的长度条：显示 ≈N / 225；超限时标红并说明后果 / 列出被裁掉的内容 */
function renderTokBar(raw, shown, n, limit){
  const t = $('#tokUsed'), bar = $('#tokBar');
  const over = n > limit;
  if (t){
    t.textContent = '≈' + n + ' / ' + limit + ' token';
    t.classList.toggle('is-over', over);
  }
  if (!bar) return;
  if (!over){ bar.hidden = true; bar.textContent = ''; bar.classList.remove('is-over'); return; }
  bar.hidden = false;
  bar.classList.add('is-over');
  if (String(shown) === String(raw)){
    bar.textContent = '⚠ 超出 ' + (n - limit) + ' token：CLIP 会静默截断尾部，模型读不到。建议减少标签或提高画师权重。';
  } else {
    bar.textContent = '⚠ 已裁到上限（原文 ≈' + estTokens(raw) + '）：' + tailLost(raw, shown);
  }
}
function tailLost(raw, shown){
  const a = String(raw || ''), b = String(shown || '');
  if (b && a.indexOf(b) === 0){
    const t = a.slice(b.length).replace(/^[\s,]+/, '');
    return '已裁掉尾部 ' + (t.length > 160 ? t.slice(0, 160) + '…' : t);
  }
  return '内容有调整';
}

function renderAll(){
  const res = state.current;
  const posEl = $('#promptPos'), negEl = $('#promptNeg');
  const raw = res ? res.prompt : '';
  const limit = tokenLimit();
  let shown = raw;
  let n = estTokens(raw);
  /* 裁剪结果只用于显示与导出，不进存档（历史 / 收藏 / 复现都用完整 prompt） */
  if (res) delete res.__trimmed;
  if (res && n > limit && autoTrimOn()){
    shown = trimToLimit(raw, limit);
    res.__trimmed = shown;
    n = estTokens(shown);
  }
  if (posEl){
    posEl.value = shown;
    posEl.classList.toggle('is-over', n > limit);
  }
  if (negEl) negEl.value = res ? res.negative : '';
  renderTokBar(raw, shown, n, limit);
  renderFieldPanel();
}

/* ---------- 字段级重掷（引擎 rerollField / rerollSceneField 接 UI） ---------- */
/* 角色身上可单独重掷的字段（其余键要么是身份说明要么无池可掷） */
const REROLLABLE_FIELDS = ['hair','eyes','body','skin','expr','age','role','personality',
  'top','bottom','socks','acc','breast','nipple','pubic','genital','butt','leg','skin2',
  'penis','penisDetail','penisState','futa','quote'];
const SCENE_REROLLABLE = ['place','time','mood','camera','action','position','tone'];

function renderFieldPanel(){
  const panel = $('#fieldPanel');
  const box = $('#fieldList');
  if (!panel || !box) return;
  const res = state.current;
  if (!res || !res.chars){ panel.hidden = true; box.innerHTML = ''; return; }
  panel.hidden = false;
  let html = '';
  const GN = { female: '女', male: '男', futa: '扶她' };
  res.chars.forEach((c, i) => {
    const nm = (c.meta && c.meta.name) || ('角色 ' + (i + 1));
    html += '<div class="fp-char">' + esc(nm) + (c.gender ? '（' + (GN[c.gender] || c.gender) + '）' : '') + '</div>';
    const f = c.fields || {};
    Object.keys(f).forEach(k => {
      if (REROLLABLE_FIELDS.indexOf(k) < 0) return;
      html += '<div class="fp-row"><span class="fp-label">' + esc(f[k].label || k) + '</span>'
        + '<span class="fp-val">' + esc(f[k].zh || '') + '</span>'
        + '<button type="button" class="mini-btn fp-reroll" data-char="' + i + '" data-key="' + k + '" title="只重掷这一项">🎲</button></div>';
    });
  });
  const sc = res.scene;
  if (sc && sc.fields){
    html += '<div class="fp-char">场景</div>';
    Object.keys(sc.fields).forEach(k => {
      if (SCENE_REROLLABLE.indexOf(k) < 0) return;
      html += '<div class="fp-row"><span class="fp-label">' + esc(sc.fields[k].label || k) + '</span>'
        + '<span class="fp-val">' + esc(sc.fields[k].zh || '') + '</span>'
        + '<button type="button" class="mini-btn fp-reroll" data-scene="1" data-key="' + k + '" title="只重掷这一项">🎲</button></div>';
    });
  }
  if (!html) html = '<p class="hint">本次结果来自角色卡（明细在角色卡里），暂无可重掷字段。</p>';
  box.innerHTML = html;
}

function rerollOneField(btn){
  const res = state.current;
  if (!res) return;
  const key = btn.dataset.key;
  if (!key) return;
  const ctx = buildCtx();
  if (btn.dataset.scene){
    if (res.scene) rerollSceneField(res.scene, key, ctx);
  } else {
    const c = res.chars && res.chars[Number(btn.dataset.char)];
    if (c && c.fields && c.fields[key]) rerollField(c, key, ctx);
  }
  /* 重拼提示词与正文：单卡路径保持「预设补全」写法，其余走 buildPrompt。
     （重掷只改被点的那个字段；提示词里少量装饰性短语会随重拼微调） */
  const card = (res.picked && res.picked.length === 1 && res.chars.length === 1)
    ? allCards().find(c => c.id === res.picked[0]) : null;
  if (card){
    const pr = buildPresetPrompt(card, Object.assign({}, ctx, { actors: 1, gender: card.gender, _gearOverride: res.scene && res.scene.fields && res.scene.fields.toy, _sceneFields: res.scene && res.scene.fields }));
    res.prompt = forceSceneTagsIntoPrompt(pr.prompt, res.scene);
    res.negative = pr.negative;
    res.presetInfo = pr.info;
  } else {
    res.prompt = buildPrompt(ctx, res.chars, res.scene);
    res.negative = buildNegative(ctx);
  }
  res.story = buildStory(ctx, res.chars, res.scene);
  renderAll();
}

/* 右栏「中文情境」面板已移除（第七轮用户要求删掉情景文本结果卡，
   第十五轮为「要中文」误加回，本轮按原要求删除）。
   中文内容仍在：引擎照旧产出 charToText / res.story，跟着 TXT 导出走。 */

/* 一键题材包：选中的主题 → 整组英文 tags（只在夜灯下生效） */
function themeTagPool(){
  if (state.mode !== 'nsfw' || !state.themes.length) return [];
  const out = [];
  (typeof R18_THEMES !== 'undefined' ? R18_THEMES : []).forEach(t => {
    if (state.themes.indexOf(t.key) >= 0) out.push.apply(out, t.tags);
  });
  return out;
}

/* 主题加权映射：tag 英文原文 → 权重（2 → :1.2，3 → :1.5）。
   引擎按 ctx.themeTagW 把主题 tags 逐条包成 (tag:权重) 数值语法。 */
function themeTagWeightMap(){
  const m = {};
  if (state.mode !== 'nsfw' || !state.themes.length) return m;
  (typeof R18_THEMES !== 'undefined' ? R18_THEMES : []).forEach(t => {
    const w = state.themeW[t.key];
    if (!w) return;
    t.tags.forEach(en => { const k = String(en).trim(); if (k) m[k] = w; });
  });
  return m;
}

/* 自定义常驻负面词（localStorage 持久化，追加到每次 Negative 末尾） */
function customNegText(){
  try { return localStorage.getItem(LS_CNEG) || ''; } catch (e){ return ''; }
}

/* ---------- 动作自选（2026-10-09「增加 NSFW 提示词的选择」）----------
   法典动作库 MS_CODEX（7152 条，g=人数组合 / part=部位 / zh=动作名 / en=整组加权 tag）。
   勾选的动作 en 整串并入 ctx.themeTags 走引擎既有注入管线
   （人数过滤 / 百合过滤 / 全裸清洗 / 用户勾选放行全部自动生效）。
   与当前人数 / 性别不符的条目自动跳过（单男单人没有可跳的动作，
   单人女 → solo/any；两人以上 → 全部组合类）。 */
function actPickGroups(){ /* （已废弃：人数闸随轮次 T2 移除，函数保留防悬空引用） */
  if (state.actors < 2){
    const g0 = state.gender === 'random' ? 'female' : state.gender;
    return g0 === 'male' ? [] : ['solo', 'any'];
  }
  return ['mf', 'mff', 'mmf', 'orgy', 'yuri', 'any'];
}

/* 指向性条目排除（2026-10-10）：动作自选面板不含百合 / 伪娘 / 扶她系条目——
   这些条目自带构成指向（女女 / 男娘 / 双性），与大多数场景相抵触；
   MS_CODEX 数据本体不动（百合场景的自动体位池仍在用），只在面板与注入端排除 */
const ACT_PICK_EXCLUDE_RE = /伪娘|伪男|男娘|男の娘|扶她|扶他|femboy|otokonoko|futanari|\bfuta\b|crossdress/i;
function actPickExcluded(e){
  return !e || ACT_PICK_EXCLUDE_RE.test(e.zh || '') || ACT_PICK_EXCLUDE_RE.test(e.en || '');
}
/* 人数 / 构成前提剥离（2026-10-10 轮次 T2）：
   「陷入触手洞二人」→「陷入触手洞」，「百合恶堕触手少女侵犯」→「恶堕触手少女侵犯」。
   出场人数由当前 cast 决定（人数行 2girls / 1boy 已按选择生成），
   条目文本不再自带二人 / 百合 / 多人词——选两个角色就生成两个人的版本。
   伪娘 / 扶她系仍排除（角色类型指向，无法中性化）。 */
const ACT_PICK_STRIP_ZH = [
  /^百合/, /百合/g,
  /的?[二两三四五六七八九\d]+人(组合|一起)?/g,
  /双女/g, /两女一男/g, /女女/g
];
function actPickStripZh(zh){
  let out = String(zh || '');
  for (let i = 0; i < 3; i++){
    const before = out;
    ACT_PICK_STRIP_ZH.forEach(re => { out = out.replace(re, ''); });
    if (out === before) break;
  }
  return out.trim() || String(zh || '').trim();
}
const ACT_PICK_STRIP_EN = [
  /\byuri\b/gi, /\bgirls? only\b/gi, /\bboys? only\b/gi,
  /\bmultiple (girls|boys)\b/gi, /\b(ffm|mmf) threesome\b/gi, /\b(ffm|mmf)\b/gi,
  /\bthreesome\b/gi, /\bfoursome\b/gi, /\bgangbang\b/gi, /\bgroup sex\b/gi, /\borgy\b/gi,
  /\btwo girls\b/gi, /\bthree girls\b/gi, /\bfour girls\b/gi,
  /\btwo boys\b/gi, /\bthree boys\b/gi,
  /\(\d+\s*(girls|boys)(:[\d.]+)?\)/gi,
  /\b([a-z_]+)::/gi,
  /,\s*,/g, /,\s*\)/g, /\(\s*,/g, /\(\s*\)/g
];
function actPickStripEn(en){
  let out = String(en || '');
  for (let i = 0; i < 3; i++){
    const before = out;
    ACT_PICK_STRIP_EN.forEach(re => { out = out.replace(re, ' '); });
    if (out === before) break;
  }
  /* 源数据畸形：'(::uncensored:1.5)' 这类前置 :: 剥掉 */
  out = out.replace(/\(\s*::\s*/g, '(');
  return out.replace(/\(\s*,/g, '(').replace(/,\s*\)/g, ')').replace(/\(\s*\)/g, '')
    .replace(/,\s*,/g, ',').replace(/\s+/g, ' ').replace(/(,\s*)+/g, ', ')
    .replace(/^[,\s]+|[\s,]+$/g, '');
}
function actPickEn(){
  if (state.mode !== 'nsfw' || !state.actPicks.length || typeof MS_CODEX === 'undefined') return [];
  /* nonhuman 条目不再要求另勾触手 / 兽交标签（轮次 U）：在动作自选里点选
     触手条目本身就是明确意图，直接出（actPickTokens 注入路径不经过非人闸门） */
  const out = [];
  state.actPicks.forEach(i => {
    const e = MS_CODEX[i];
    if (!e || actPickExcluded(e)) return;
    const rawEn = (typeof msCodexEnClean === 'function') ? msCodexEnClean(e.en) : e.en;
    const en = actPickStripEn(rawEn);
    if (en) out.push(en);
    /* 点选触手 / 兽交条目 = 明确要这类画面：自动补基础词，
       否则条目里往往只有 tentacle pit 之类孤立词，底模画不出触手 / 兽 */
    if (/tentacle/i.test(en)) out.push('tentacles, tentacle sex, tentacle insertion');
    if (/bestiality|animal cock|animal on human|animal genitalia/i.test(en)) out.push('bestiality, animal genitalia');
  });
  /* 去重（多条件命中会推重） */
  const seen = new Set();
  return out.filter(t => { if (seen.has(t)) return false; seen.add(t); return true; });
}

const ACT_PICK_MAX = 24;

function renderActPick(){
  const list = $('#actList');
  if (!list || typeof MS_CODEX === 'undefined') return;
  const sel = state.actPicks;

  /* 已选 chips（带 ✕ 移除） */
  const chips = $('#actSelChips');
  if (chips){
    chips.innerHTML = '';
    sel.forEach(i => {
      const e = MS_CODEX[i];
      if (!e) return;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip on';
      b.title = actPickStripEn(e.en);
      b.textContent = actPickStripZh(e.zh) + ' ✕';
      b.dataset.actRemove = i;
      chips.appendChild(b);
    });
  }

  const q = (state.actQ || '').trim().toLowerCase();
  const hit = $('#actHit');
  if (!q){
    list.hidden = true;
    list.innerHTML = '';
    if (hit) hit.textContent = sel.length ? ('已选 ' + sel.length + ' 个动作') : '';
    return;
  }

  const hits = [];
  for (let i = 0; i < MS_CODEX.length && hits.length < 40; i++){
    const e = MS_CODEX[i];
    if (!e || actPickExcluded(e)) continue;
    if (e.zh.toLowerCase().indexOf(q) >= 0 || e.en.toLowerCase().indexOf(q) >= 0) hits.push(i);
  }
  if (hit) hit.textContent = '命中 ' + hits.length + ' 条' + (hits.length >= 40 ? '（仅显示前 40）' : '');
  list.hidden = false;
  list.innerHTML = '';
  hits.forEach(i => {
    const e = MS_CODEX[i];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'lib-item' + (sel.indexOf(i) >= 0 ? ' is-active' : '');
    b.textContent = actPickStripZh(e.zh) + ' · ' + e.g + '/' + e.part;
    b.title = actPickStripEn(e.en);
    b.dataset.actIdx = i;
    list.appendChild(b);
  });
}


/* ---------- 场景自选 chips ---------- */
function scenePoolPairs(){
  /* 返回 { key: [[zh...],[en...]] }，场所用 modern 池 */
  const placeZh = (typeof PLACE !== 'undefined' && PLACE.modern) ? PLACE.modern : [];
  const placeEn = (typeof PLACE_EN !== 'undefined' && PLACE_EN.modern) ? PLACE_EN.modern : placeZh;
  const actionZh = (typeof SFW_ACTION !== 'undefined') ? SFW_ACTION : [];
  const actionEn = actionZh; /* SFW_ACTION 无独立 EN，引擎会只用 zh 或透传 */
  const toneZh = (typeof SFW_TONE !== 'undefined') ? SFW_TONE : [];
  return {
    place:  [placeZh, placeEn],
    time:   [typeof TIME_LIGHT !== 'undefined' ? TIME_LIGHT : [], typeof TIME_LIGHT_EN !== 'undefined' ? TIME_LIGHT_EN : []],
    mood:   [typeof MOOD_ATMOS !== 'undefined' ? MOOD_ATMOS : [], typeof MOOD_ATMOS_EN !== 'undefined' ? MOOD_ATMOS_EN : []],
    camera: [typeof CAMERA !== 'undefined' ? CAMERA : [], typeof CAMERA_EN !== 'undefined' ? CAMERA_EN : []],
    action: [actionZh, actionEn],
    tone:   [toneZh, toneZh],
    eye:    [typeof EYE_SPECIAL !== 'undefined' ? EYE_SPECIAL : [], typeof EYE_SPECIAL_EN !== 'undefined' ? EYE_SPECIAL_EN : []]
  };
}

function renderScenePicks(){
  const pools = scenePoolPairs();
  const map = {
    place: 'pickPlace', time: 'pickTime', mood: 'pickMood',
    camera: 'pickCamera', action: 'pickAction', tone: 'pickTone', eye: 'pickEye'
  };
  Object.keys(map).forEach(key => {
    const box = document.getElementById(map[key]);
    if (!box) return;
    box.innerHTML = '';
    const zhArr = pools[key][0] || [];
    const cur = state.scenePick[key];
    /* 随机按钮 */
    const rnd = document.createElement('button');
    rnd.type = 'button';
    rnd.className = 'chip' + (cur == null ? ' on' : '');
    rnd.textContent = '🎲 随机';
    rnd.addEventListener('click', () => { state.scenePick[key] = null; renderScenePicks(); });
    box.appendChild(rnd);
    zhArr.forEach((zh, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (cur === zh ? ' on' : '');
      b.textContent = zh.length > 14 ? zh.slice(0, 14) + '…' : zh;
      b.title = zh;
      b.addEventListener('click', () => {
        state.scenePick[key] = (state.scenePick[key] === zh) ? null : zh;
        renderScenePicks();
      });
      box.appendChild(b);
    });
  });
}


function renderBodySizePicks(){
  const box = document.getElementById('pickBodySize');
  if (!box) return;
  box.innerHTML = '';
  const tiers = (typeof BODY_SIZE_TIERS !== 'undefined') ? BODY_SIZE_TIERS : [];
  const cur = state.bodyPick;
  const rnd = document.createElement('button');
  rnd.type = 'button';
  rnd.className = 'chip' + (!cur ? ' on' : '');
  rnd.textContent = '🎲 随机';
  rnd.addEventListener('click', () => { state.bodyPick = null; renderBodySizePicks(); });
  box.appendChild(rnd);
  tiers.forEach(tier => {
    const b = document.createElement('button');
    b.type = 'button';
    const on = cur && cur.id === tier.id;
    b.className = 'chip' + (on ? ' on' : '');
    let label = tier.zh;
    if (on && cur.weight === 2) label += ' ★';
    if (on && cur.weight === 3) label += ' ★★';
    b.textContent = label;
    b.title = (tier.en || '') + (on ? (' · 权重 ' + (cur.weight || 1)) : ' · 点击锁定，再点切换权重');
    b.addEventListener('click', () => {
      /* weight 与引擎 weightToken 一致：1 原样 / 2→(tag:1.2) / 3→(tag:1.5) */
      if (state.bodyPick && state.bodyPick.id === tier.id){
        const w = state.bodyPick.weight || 1;
        if (w === 1) state.bodyPick = { id: tier.id, zh: tier.zh, en: tier.en, weight: 2 };
        else if (w === 2) state.bodyPick = { id: tier.id, zh: tier.zh, en: tier.en, weight: 3 };
        else state.bodyPick = null;
      } else {
        state.bodyPick = { id: tier.id, zh: tier.zh, en: tier.en, weight: 1 };
      }
      renderBodySizePicks();
    });
    box.appendChild(b);
  });
}

function scenePickEnOf(key, zh){
  if (!zh) return '';
  const pools = scenePoolPairs();
  const pair = pools[key];
  if (!pair) return zh;
  const i = pair[0].indexOf(zh);
  if (i >= 0 && pair[1] && pair[1][i]) return pair[1][i];
  return zh;
}

/* ---------- 生成 ---------- */
function buildCtx(){
  return {
    mode: state.mode,
    model: state.model,
    /* 世界背景已移除，引擎里仍按这个键取词库（服装/场所），统一走现代都市 */
    world: 'modern',
    gender: state.gender,
    actors: state.actors,
    /* 男/女人数精确构成；引擎只在 NSFW 下采用，清水模式忽略 */
    genderMix: { male: state.actorsM, female: state.actorsF },
    artstyle: state.artstyle,
    /* 画师：选中项存的是中文名，这里翻成英文标签串再交给引擎 */
    artistPicks: pickedArtists(),
    pov: 'third',
    tags: state.tags.slice(),
    tagW: Object.assign({}, state.tagW),
    themes: state.themes.slice(),
    themeW: Object.assign({}, state.themeW),
    themeTags: themeTagPool(),
    /* 动作自选：用户在法典动作库勾选的整组 tag。单独成字段——引擎端按
       「用户显式勾选必出」处理（豁免 SOLO / GROUP / 百合过滤），不与题材包混算 */
    actPickTokens: actPickEn().join('|').split('|').map(x => x.trim()).filter(Boolean),
    themeTagW: themeTagWeightMap(),
    posCat: state.posCat || '',
    customNeg: customNegText(),
    outfitPick: state.outfitPick,
    outfitState: state.outfitState,
    /* 随机种子：有效数字 → 同配置完全复现；空/非法 → 引擎自己随机播 */
    seed: parseSeedInput(state.seed),
    /* ctx.recloth：只有明确选了「随机换装」才是 true。
       默认（不选）= 保留角色原设服装，这正是「默认」这个选项的含义。 */
    recloth: state.outfitPick === OUTFIT_RANDOM,
    scenePick: Object.assign({}, state.scenePick),
    bodyPick: state.bodyPick ? Object.assign({}, state.bodyPick) : null
  };
}

/* 种子输入解析：纯数字（含 0）→ 整数；其余（含空串）→ undefined（引擎随机播） */
function parseSeedInput(v){
  const s = String(v == null ? '' : v).trim();
  return /^\d+$/.test(s) ? Number(s) : undefined;
}

function doGenerate(saveToHistory){
  const ctx = buildCtx();
  /* 随机抽卡模式 → 每次生成都从卡池现抽；否则用手动勾选的卡 */
  const cards = state.pickRandom ? drawRandomCards() : pickedCards();
  const res = generateAll(ctx);
  applyPickedCards(res, cards, ctx);
  /* 手选卡性别与男/女人数构成不符被跳过时，明确提示而不是静默吞掉 */
  if (res.skippedCards && res.skippedCards.length)
    toast('有 ' + res.skippedCards.length + ' 张卡因性别与男/女人数不符未使用，调整男人数/女人数后可全部用上');
  /* 本次实际用的种子（复现：填同一个数字即可重出完全一致的结果） */
  res.seed = ctx.__seed;
  state.lastSeed = ctx.__seed;
  updateSeedUI();
  state.current = res;
  renderAll();
  if (saveToHistory !== false){
    pushHistory(res);
  }
}

/* 结果卡上显示本次种子；「同配置 + 同种子 → 提示词一致」 */
function updateSeedUI(){
  const el = $('#seedUsed');
  if (el) el.textContent = state.lastSeed == null ? '' : 'seed: ' + state.lastSeed;
}

/* 把选中的角色卡套进本次结果：
   - 有几个卡就替换前几个角色
   - 卡比在场人数少 → 剩下的由引擎随机补
   - 卡比在场人数多 → 只取前 N 个 */

/* 单卡 buildPresetPrompt 后：强制把场景自选的场所/光线/构图英文写进提示词
   （防止遗漏或旧缓存导致配置明细与 POSITIVE 不一致） */
function forceSceneTagsIntoPrompt(prompt, scene){
  if (!prompt || !scene || !scene.fields) return prompt;
  /* 场景 + NSFW 明细里带英文的字段，都应出现在最终提示词中 */
  const keys = ['place', 'time', 'camera', 'mood', 'position', 'fluid', 'toy', 'fetish'];
  const inject = [];
  keys.forEach(k => {
    const f = scene.fields[k];
    if (!f) return;
    let en = (f.en || '').trim();
    if (!en && f.zh){
      try { en = scenePickEnOf(k, f.zh) || ''; } catch (e) { en = ''; }
    }
    if (!en || en === f.zh) return;
    /* 整段或关键子串已在提示词中则跳过 */
    const head = en.split(',')[0].trim();
    const check = head.length >= 4 ? head : en;
    const re = new RegExp(check.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    if (re.test(prompt)) return;
    inject.push(en);
  });
  if (!inject.length) return prompt;
  const styleMark = /,?\s*anime style\b/i;
  if (styleMark.test(prompt)){
    return prompt.replace(styleMark, ', ' + inject.join(', ') + ', anime style');
  }
  return prompt.replace(/\s*$/, '') + ', ' + inject.join(', ');
}

function applyPickedCards(res, cards, ctx){
  if (!cards.length) return;
  const n = res.chars.length;
  /* 按性别对位填卡（2026-10-09 人数修正）：
     女卡（female/futa）只能填女生位、男卡只能填男生位，
     保证人数 tag（1girl, 3boys…）与「男/女人数」选择严格一致；
     性别对不上位的卡跳过（不覆盖该位，保留引擎按构成生成的随机角色）。 */
  const used = new Array(n).fill(false);
  const matched = [], skipped = [];
  cards.forEach(card => {
    const isM = card.gender === 'male';
    let at = -1;
    for (let k = 0; k < n; k++){
      if (used[k]) continue;
      const g = res.chars[k].gender;
      if (isM ? g === 'male' : (g === 'female' || g === 'futa')){ at = k; break; }
    }
    /* 卡优先的条件：性别=随机，且构成没有被显式锁定。
       NSFW 下 genderMix（男/女人数选择器）生效即构成锁定，维持对位跳过
       （smoke-countfix.js 场景 D 钉死的契约；此时 roll 出的槽位必与构成一致，
       同性卡必然对得上，跳过只发生在异性卡——用户明确要了这个构成）。
       SFW 下引擎忽略 genderMix、按随机掷性别——此时没有可保护的构成，
       卡必须 100% 生效：修「随机性别下选中的卡有 30-50% 概率被静默跳过，
       用户选了伊落玛丽，生成的却是随机角色，提示词里没有 (mari blue archive)」。
       替换后的角色性别跟着卡走，人数 tag 由 buildPrompt 从 chars 现场推导，
       自动保持一致（1girl / 2girls…）。 */
    const mixLocked = ctx.mode === 'nsfw' && !!(ctx.genderMix &&
      ((ctx.genderMix.male || 0) + (ctx.genderMix.female || 0) > 0));
    if (at < 0 && ctx.gender === 'random' && !mixLocked) at = used.indexOf(false);
    if (at < 0){ skipped.push(card); return; }
    used[at] = true;
    const pc = pseudoCharFromCard(card);
    pc.idx = res.chars[at].idx;
    res.chars[at] = pc;
    matched.push(card.id);
  });
  if (!matched.length) return;
  if (skipped.length) res.skippedCards = skipped.map(c => c.name || c.id);
  res.picked = matched;
  /* 换完角色后，中文小传 / 情境文本（导出用）与提示词都要按新身体重算 */
  res.story = buildStory(ctx, res.chars, res.scene);
  res.prompt = buildPrompt(ctx, res.chars, res.scene);
  /* 有卡的场景走「预设补全」写法更完整：单人且只有一张卡时用 buildPresetPrompt */
  if (n === 1 && res.chars.length === 1){
    /* 单卡道具统一（轮次 AC）：buildPresetPrompt 复用 scene 已抽的道具，
       否则字段面板与提示词各抽各的，用户看到道具 A、提示词里是道具 B */
    const pr = buildPresetPrompt(cards[0], Object.assign({}, ctx, { actors: 1, gender: cards[0].gender, _gearOverride: res.scene.fields.toy, _sceneFields: res.scene.fields }));
    res.prompt = forceSceneTagsIntoPrompt(pr.prompt, res.scene);
    res.negative = pr.negative;
    res.presetInfo = pr.info;
    /* 同步明细里的英文，避免只显示中文、提示词却对不上 */
    if (pr.info){
      if (pr.info['背景'] && res.scene.fields.place) res.scene.fields.place.zh = pr.info['背景'];
      if (pr.info['光线'] && res.scene.fields.time) res.scene.fields.time.zh = pr.info['光线'];
      if (pr.info['构图'] && res.scene.fields.camera) res.scene.fields.camera.zh = pr.info['构图'];
    }
  }
}

function snapshotTitle(res){
  if (!res || !res.chars.length) return '未命名';
  return res.chars.map(c => c.meta.name).join(' × ');
}

/* ---------- 仓库 ---------- */
/* 入库前剥离运行期对象：scene.__facts 是 Set，JSON 往返会变成普通对象 {}，
   载入后再喂给引擎会 TypeError；且它体积不小、落盘无用（要用时会重算） */
function stripRuntime(res){
  if (res){
    if (res.scene && res.scene.__facts) delete res.scene.__facts;
    if (res.__facts) delete res.__facts;
    if (res.__trimmed) delete res.__trimmed;
  }
  return res;
}

function pushHistory(res){
  const item = { id: newId('h'), title: snapshotTitle(res), data: stripRuntime(res) };
  state.history.unshift(item);
  /* 历史超上限要丢最早的：先把挂在它上面的收藏实体化，否则收藏会变成空壳 */
  if (state.history.length > HISTORY_MAX){
    state.history.length = HISTORY_MAX;
    materializeFav();
  }
  saveStore();
  renderStore();
  return item.id;
}

/* ---------- 收藏（阶段一 1.5）----------
   收藏不再整份复制 data：能指到历史条目就只存 {id,title,ref}，
   历史被挤掉 / 删掉 / 清空时再把数据实体化回来，避免「收藏在、数据没了」。
   上限 FAV_MAX = 100，超了从最早的开始丢。 ---------- */
function newId(p){ return p + Date.now() + Math.random().toString(36).slice(2, 6); }

/* 这个结果对象在历史里的 id（同一对象引用才算） */
function historyIdOf(res){
  if (!res) return '';
  for (let i = 0; i < state.history.length; i++){
    if (state.history[i].data === res) return state.history[i].id;
  }
  return '';
}

/* 取条目的数据本体：自带 data 的直接给；只有 ref 的去历史里取；都没有返回 null */
function itemData(it){
  if (!it) return null;
  if (it.data) return it.data;
  if (it.ref){
    for (let i = 0; i < state.history.length; i++){
      if (state.history[i].id === it.ref) return state.history[i].data || null;
    }
  }
  return null;
}

/* 历史要被裁剪 / 删除 / 清空之前调用：把「只有 ref」的收藏实体化 */
function materializeFav(){
  let n = 0;
  state.fav.forEach(it => {
    if (it.data || !it.ref) return;
    for (let i = 0; i < state.history.length; i++){
      if (state.history[i].id === it.ref){ it.data = state.history[i].data; n++; return; }
    }
  });
  return n;
}

/* 收藏页去重：同一份数据只留一条（ref 与 data 指向同一条历史也算重复） */
function favHas(res){
  const hid = historyIdOf(res);
  return state.fav.some(f => f.data === res || (hid && f.ref === hid));
}

/* 统一入口：能引用就不复制；返回 true 表示真的加进去了 */
function addFav(res, title){
  if (!res) return false;
  if (favHas(res)){ toast('已在收藏页'); return false; }
  const hid = historyIdOf(res);
  const t = title || snapshotTitle(res);
  state.fav.unshift(hid
    ? { id: newId('f'), title: t, ref: hid }
    : { id: newId('f'), title: t, data: stripRuntime(res) });
  if (state.fav.length > FAV_MAX) state.fav.length = FAV_MAX;
  saveStore();
  renderStore();
  return true;
}

function pushFav(res){ return addFav(res); }

function saveStore(){
  try {
    localStorage.setItem(LS_HIS, JSON.stringify(state.history));
    localStorage.setItem(LS_FAV, JSON.stringify(state.fav));
  } catch (e){ toast('⚠ 存档空间已满：最新记录可能没存上，建议先「↓ 备份全部存档」再清理历史'); }
}

/* 老存档（收藏整份带 data）与新存档（只带 ref）都能读：
   补 id、去重、按 FAV_MAX 截断；ref 指不到历史的先留着，UI 里按「失效」处理 */
function normalizeFav(list){
  if (!Array.isArray(list)) return [];
  const seen = Object.create(null);
  const out = [];
  list.forEach((it, i) => {
    if (!it || typeof it !== 'object') return;
    if (!it.data && !it.ref) return;
    if (!it.id || seen[it.id]) it.id = newId('f') + i;
    if (!it.title) it.title = '未命名';
    seen[it.id] = 1;
    out.push(it);
  });
  return out.slice(0, FAV_MAX);
}

function loadStore(){
  try {
    state.history = JSON.parse(localStorage.getItem(LS_HIS) || '[]');
    state.fav = normalizeFav(JSON.parse(localStorage.getItem(LS_FAV) || '[]'));
  } catch (e){ state.history = []; state.fav = []; }
  if (!Array.isArray(state.history)) state.history = [];
}

function renderStore(){
  const list = (state.storeTab === 'history') ? state.history : state.fav;
  $('#hisCount').textContent = state.history.length + '/' + HISTORY_MAX;
  $('#favCount').textContent = state.fav.length + '/' + FAV_MAX;
  const box = $('#storeList');
  box.innerHTML = '';
  if (!list.length){
    box.innerHTML = '<p class="empty">暂无记录</p>';
    return;
  }
  list.forEach(it => {
    /* 收藏只存了 ref、而历史那条已经没了 → 数据取不到，标成失效而不是崩掉 */
    const gone = !itemData(it);
    const d = document.createElement('div');
    d.className = 'store-item' + (gone ? ' is-gone' : '');
    d.innerHTML = '<span class="si-name" title="' + (gone ? '原历史记录已清除，数据不可恢复' : '单击载入 · 双击重命名')
      + '">' + esc(it.title) + (gone ? ' <em class="si-gone">失效</em>' : '') + '</span>'
      + '<span class="si-edit" title="编辑提示词 / 中文正文">✎</span>'
      + (state.storeTab === 'history' ? '<span class="si-fav" title="收藏到收藏页">☆</span>' : '')
      + '<span class="si-del" title="删除">✕</span>';
    d.querySelector('.si-name').addEventListener('dblclick', (ev) => {
      ev.stopPropagation();
      const nv = prompt('重命名这条' + (state.storeTab === 'history' ? '历史' : '收藏'), it.title);
      if (nv === null) return;
      it.title = nv.trim() || it.title;
      saveStore(); renderStore();
    });
    d.querySelector('.si-edit').addEventListener('click', (ev) => {
      ev.stopPropagation();
      const dat = itemData(it);
      if (!dat){ toast('这条收藏指向的历史已清除，无法编辑'); return; }
      const old = d.querySelector('.store-editor');
      if (old){ old.remove(); return; }
      const ed = document.createElement('div');
      ed.className = 'store-editor';
      ed.innerHTML = '<label>英文提示词<textarea rows="4" data-f="prompt">' + esc(dat.prompt || '') + '</textarea></label>'
        + '<label>中文正文<textarea rows="4" data-f="story">' + esc(dat.story || '') + '</textarea></label>'
        + '<div class="se-btns"><button type="button" class="se-save">保存</button><button type="button" class="se-cancel">取消</button></div>';
      ed.querySelector('.se-save').addEventListener('click', (e2) => {
        e2.stopPropagation();
        ed.querySelectorAll('textarea[data-f]').forEach(t => { dat[t.dataset.f] = t.value; });
        saveStore();
        ed.remove();
        toast('已保存编辑');
      });
      ed.querySelector('.se-cancel').addEventListener('click', (e2) => { e2.stopPropagation(); ed.remove(); });
      ed.addEventListener('click', (e2) => e2.stopPropagation());
      d.appendChild(ed);
    });
    const favBtn = d.querySelector('.si-fav');
    if (favBtn) favBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      addFav(it.data, it.title);
    });
    d.addEventListener('click', (e) => {
      if (e.target.classList.contains('si-del')){
        const arr = (state.storeTab === 'history') ? state.history : state.fav;
        const i = arr.indexOf(it);
        if (i >= 0) arr.splice(i, 1);
        /* 删的是历史：先把挂在它上面的收藏实体化，否则收藏变空壳 */
        if (state.storeTab === 'history') materializeFav();
        saveStore(); renderStore();
        return;
      }
      const dat = itemData(it);
      if (!dat){ toast('这条收藏指向的历史已清除，数据不可恢复'); return; }
      state.current = dat;
      /* 只有条目真是成人向生成结果（引擎回写的 mode）、且当前已解锁，才点亮夜灯。
         旧版写法 `it.data.chars && it.data.tags` 对任何正常结果都恒真，
         会把清水历史也静默切成 NSFW 且绕过解锁确认。 */
      if (dat.mode === 'nsfw' && state.unlocked && state.mode !== 'nsfw'){
        state.mode = 'nsfw';
        applyModeUI();
      }
      renderAll();
      toast('已载入');
    });
    box.appendChild(d);
  });
}

/* ---------- 导出 ---------- */
function exportJSON(){
  const list = (state.storeTab === 'history') ? state.history : state.fav;
  if (!list.length){ toast('仓库为空'); return; }
  const data = list.map(it => ({ title: it.title, data: itemData(it) })).filter(x => x.data);
  download(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), 'randgen-' + state.storeTab + '.json');
}

function exportTXT(){
  const list = (state.storeTab === 'history') ? state.history : state.fav;
  if (!list.length){ toast('仓库为空'); return; }
  let s = '';
  list.forEach((it, i) => {
    const d = itemData(it);
    if (!d) return;
    s += '══════ #' + (i + 1) + '  ' + it.title + ' ══════\n\n';
    s += charToText(d.chars, d.scene) + '\n\n';
    if (d.story) s += '【情境文本】\n' + d.story + '\n\n';
    s += '【提示词】\n' + d.prompt + '\n\n';
    s += '【负面词】\n' + d.negative + '\n\n\n';
  });
  download(new Blob([s], { type: 'text/plain;charset=utf-8' }), 'randgen-' + state.storeTab + '.txt');
}

/* 导出 Markdown：正负词进代码块，可直接贴进文档 / 笔记 */
function exportMD(){
  const list = (state.storeTab === 'history') ? state.history : state.fav;
  if (!list.length){ toast('仓库为空'); return; }
  let s = '# randgen 提示词 · ' + state.storeTab + '\n\n';
  list.forEach((it, i) => {
    const d = itemData(it);
    if (!d) return;
    s += '## ' + (i + 1) + '. ' + (it.title || '') + (d.seed != null ? '（seed: ' + d.seed + '）' : '') + '\n\n';
    s += '```\n' + d.prompt + '\n```\n\n';
    s += '**Negative：**\n\n```\n' + d.negative + '\n```\n\n';
    if (d.story) s += '> ' + String(d.story).replace(/\n/g, '\n> ') + '\n\n';
  });
  download(new Blob([s], { type: 'text/markdown;charset=utf-8' }), 'randgen-' + state.storeTab + '.md');
}

/* 导出 CSV：一行一条（Excel / 表格软件直接开；字段内引号与逗号按 RFC 4180 转义） */
function csvCell(v){
  v = String(v == null ? '' : v);
  return '"' + v.replace(/"/g, '""') + '"';
}
function exportCSV(){
  const list = (state.storeTab === 'history') ? state.history : state.fav;
  if (!list.length){ toast('仓库为空'); return; }
  const rows = [['#', '标题', 'seed', 'Positive', 'Negative', '情境文本']];
  list.forEach((it, i) => {
    const d = itemData(it);
    if (!d) return;
    rows.push([String(i + 1), it.title || '', d.seed != null ? String(d.seed) : '', d.prompt || '', d.negative || '', d.story || '']);
  });
  /* BOM：让 Excel 正确识别 UTF-8 */
  const s = '\uFEFF' + rows.map(r => r.map(csvCell).join(',')).join('\r\n');
  download(new Blob([s], { type: 'text/csv;charset=utf-8' }), 'randgen-' + state.storeTab + '.csv');
}

/* 导出 PNG：canvas 把正负词烧成卡片（长按 / 右键即可保存分享） */
function exportPNG(){
  const d = state.current;
  if (!d){ toast('先生成一组提示词'); return; }
  const c = document.createElement('canvas');
  const W = 900, PAD = 40, LH = 22;
  c.width = W;
  const ctx2 = c.getContext && c.getContext('2d');
  if (!ctx2){ toast('当前环境不支持画布导出 PNG'); return; }
  /* 先量行数再定高度：自动换行 */
  ctx2.font = '15px Consolas, monospace';
  const wrap = (text, maxW) => {
    const out = [];
    String(text || '').split('\n').forEach(par => {
      let line = '';
      par.split(' ').forEach(word => {
        const t = line ? line + ' ' + word : word;
        if (ctx2.measureText(t).width > maxW && line){ out.push(line); line = word; }
        else line = t;
      });
      out.push(line);
    });
    return out;
  };
  const posLines = wrap(d.__trimmed || d.prompt, W - PAD * 2);
  const negLines = wrap(d.negative, W - PAD * 2);
  const headH = 64, gap = 30;
  c.height = headH + (posLines.length + negLines.length + 6) * LH + PAD;
  /* 重设 canvas 尺寸会重置状态，字体要再设一次 */
  ctx2.font = '15px Consolas, monospace';
  ctx2.fillStyle = '#1d2330';
  ctx2.fillRect(0, 0, c.width, c.height);
  ctx2.fillStyle = '#e8ecf4';
  ctx2.font = 'bold 18px sans-serif';
  ctx2.fillText('randgen 提示词卡片', PAD, 36);
  ctx2.font = '13px sans-serif';
  ctx2.fillStyle = '#8fa3c4';
  ctx2.fillText((d.seed != null ? 'seed: ' + d.seed : '') + '  ·  ' + new Date().toLocaleString(), PAD + 190, 36);
  let y = headH;
  ctx2.font = 'bold 15px sans-serif';
  ctx2.fillStyle = '#7fd18c';
  ctx2.fillText('Positive', PAD, y); y += LH + 6;
  ctx2.font = '15px Consolas, monospace';
  ctx2.fillStyle = '#e8ecf4';
  posLines.forEach(l => { ctx2.fillText(l, PAD, y); y += LH; });
  y += gap - LH;
  ctx2.font = 'bold 15px sans-serif';
  ctx2.fillStyle = '#e08a8a';
  ctx2.fillText('Negative', PAD, y); y += LH + 6;
  ctx2.font = '15px Consolas, monospace';
  ctx2.fillStyle = '#c9d2e0';
  negLines.forEach(l => { ctx2.fillText(l, PAD, y); y += LH; });
  c.toBlob(blob => { if (blob) download(blob, 'randgen-提示词-' + (d.seed != null ? d.seed : stampNow()) + '.png'); }, 'image/png');
}

function download(blob, name){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); document.body.removeChild(a); }, 100);
  toast('已导出 ' + name);
}

/* ---------- 全量存档：备份 / 恢复 ----------
   localStorage 换环境（换电脑 / 换浏览器 / 换端口）带不走，
   这里把 4 个 key 打成一个快照文件，新环境导入即可完整恢复。 */
function stampNow(){
  const d = new Date(), p = n => String(n).padStart(2, '0');
  return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
}

function exportAllStore(){
  const snap = {
    v: 2, app: 'randgen', ts: Date.now(),
    history: state.history, fav: state.fav,
    chars: state.charLib, unlock: state.unlocked ? '1' : '0',
    cneg: customNegText(),
    seed: state.seed || '',
    tagPresets: (typeof state.tagPresets !== 'undefined') ? state.tagPresets : []
  };
  download(new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' }),
    'randgen-存档-' + stampNow() + '.json');
}


/* ---------- 随包走的存档文件（存档/store.js） ----------
   localStorage 换电脑 / 换浏览器带不走，但普通 <script src> 在 file:// 下能加载，
   所以把快照写成 .js 放进 存档/ 目录 —— 整个文件夹拷走就等于存档跟着走。

     · 双击 HTML：本机第一次打开（localStorage 空）时自动接管存档文件；
       之后要把新数据写回文件，点仓库区「写回存档文件」再拖进 存档/ 覆盖。
     · 本地服务器启动（启动生成器.bat）：由 server-mode.js 自动同步，不用手动点。
------------------------------------------------------------------------------ */
function storeSnapshot(){
  return {
    v: 2, app: 'randgen', ts: Date.now(),
    history: state.history, fav: state.fav,
    chars: state.charLib, unlock: state.unlocked ? '1' : '0',
    cneg: customNegText(), seed: state.seed || '',
    tagPresets: (typeof state.tagPresets !== 'undefined') ? state.tagPresets : []
  };
}

/* 导出成 store.js（不是 json）——下载后直接拖进 存档/ 覆盖同名文件 */
function exportStoreJs(){
  const snap = storeSnapshot();
  const txt = '/* randgen 存档文件 · 自动生成 ' + stampNow() + ' · 勿手改 */\n'
    + 'window.__RG_STORE__ = ' + JSON.stringify(snap) + ';\n';
  download(new Blob([txt], { type: 'application/javascript' }), 'store.js');
  toast('已导出 store.js · 拖进「存档/」覆盖同名文件即可带走');
}

/* 存档文件里一共有多少条内容 */
function fileStoreSize(o){
  if (!o || typeof o !== 'object') return 0;
  return (o.history ? o.history.length : 0) + (o.fav ? o.fav.length : 0) + (o.chars ? o.chars.length : 0);
}

/* 本机存档是不是空的（= 这台机器 / 这个浏览器第一次用） */
function storeIsEmpty(){
  return !state.history.length && !state.fav.length && !state.charLib.length;
}

/* 换环境零点击：本机为空 + 随包存档文件有内容 → 直接接管 */
function adoptFileStore(){
  const o = window.__RG_STORE__;
  if (!fileStoreSize(o)) return false;
  state.history = (o.history || []).slice();
  state.fav = normalizeFav(o.fav);
  state.charLib = (o.chars || []).map(normCard);
  if (o.unlock === '1' || o.unlock === 1 || o.unlock === true) state.unlocked = true;
  if (typeof o.cneg === 'string' && o.cneg){ try { localStorage.setItem(LS_CNEG, o.cneg); } catch (e){} }
  if (typeof o.seed === 'string' && o.seed){ state.seed = o.seed; try { localStorage.setItem(LS_SEED, o.seed); } catch (e){} }
  if (Array.isArray(o.tagPresets)){ state.tagPresets = o.tagPresets; saveTagPresets(); }
  saveStore(); saveCharLib();
  try { localStorage.setItem(LS_UNLOCK, state.unlocked ? '1' : '0'); } catch (e){}
  if (state.unlocked) state.mode = 'nsfw';
  toast('已从「存档/store.js」接管 · 历史 ' + state.history.length
    + ' · 收藏 ' + state.fav.length + ' · 角色卡 ' + state.charLib.length);
  return true;
}

/* 仓库区提示：随包存档文件当前是什么状态 */
function annotateFileStore(){
  const el = $('#storeEnvTip');
  if (!el || !el.parentNode) return;
  const o = window.__RG_STORE__;
  const n = fileStoreSize(o);
  const p = document.createElement('p');
  p.className = 'tip';
  p.id = 'storeFileTip';
  if (!n){
    p.textContent = '「存档/store.js」现在是空的：点「写回存档文件」把当前存档存进去，'
      + '以后换电脑只要拷整个文件夹。';
  } else {
    let when = '';
    if (o && o.ts){ const d = new Date(o.ts);
      when = '（' + d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
        + '-' + String(d.getDate()).padStart(2, '0') + '）'; }
    p.textContent = '「存档/store.js」里有 ' + n + ' 条' + when
      + '。换电脑拷整个文件夹即可带走；要合并进本机点「↑ 恢复存档」。';
  }
  el.parentNode.insertBefore(p, el.nextSibling);
}

/* 角色卡字段归一化（与「我的角色」同构，两个项目可互认） */
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

/* 按 id 去重合并：新导入的在前，已有的补在后 */
function mergeById(head, tail){
  const ids = new Set(head.map(x => x && x.id));
  return head.concat(tail.filter(x => x && !ids.has(x.id)));
}

/* 兼容三种输入：本函数导出的快照 / 旧版「导出 JSON」的记录数组 / role-studio 的卡库数组 */
function importStoreFromText(txt){
  let o;
  try { o = JSON.parse(txt); } catch (e){ toast('文件不是合法 JSON'); return; }
  if (!o || typeof o !== 'object'){ toast('存档格式不认识'); return; }
  let nH = 0, nF = 0, nC = 0;
  if (Array.isArray(o)){
    if (o.length && o[0] && o[0].data){ state.history = mergeById(o, state.history); nH = o.length; }
    else if (o.length && o[0] && (o[0].name || o[0].base)){
      state.charLib = mergeById(o.map(normCard), state.charLib); nC = o.length;
    } else { toast('存档里没有可用内容'); return; }
  } else {
    if (Array.isArray(o.history)){ state.history = mergeById(o.history, state.history); nH = o.history.length; }
    if (Array.isArray(o.fav)){ state.fav = normalizeFav(mergeById(o.fav, state.fav)); nF = o.fav.length; }
    if (Array.isArray(o.chars)){ state.charLib = mergeById(o.chars.map(normCard), state.charLib); nC = o.chars.length; }
    if (o.unlock === '1' || o.unlock === 1 || o.unlock === true) state.unlocked = true;
    if (typeof o.cneg === 'string'){ try { localStorage.setItem(LS_CNEG, o.cneg); } catch (e){} }
    /* 种子偏好与标签预设方案随快照走 */
    if (typeof o.seed === 'string'){ state.seed = o.seed; try { localStorage.setItem(LS_SEED, o.seed); } catch (e){} }
    if (Array.isArray(o.tagPresets)){ state.tagPresets = o.tagPresets; saveTagPresets(); }
  }
  /* 导入的收藏可能引用着没跟过来的历史：先实体化再落盘 */
  materializeFav();
  saveStore();
  saveCharLib();
  try { localStorage.setItem(LS_UNLOCK, state.unlocked ? '1' : '0'); } catch (e){}
  if (state.unlocked) state.mode = 'nsfw';
  const cnegIn = $('#customNeg');
  if (cnegIn) cnegIn.value = customNegText();
  renderThemeChips();
  applyModeUI(); renderStore(); renderPick(); renderAll();
  if (state.unlocked) renderTagChips();
  toast('存档已恢复 · 历史 +' + nH + ' · 收藏 +' + nF + ' · 角色卡 +' + nC);
}

function importStoreFile(file){
  const r = new FileReader();
  r.onload = () => importStoreFromText(String(r.result));
  r.onerror = () => toast('读取文件失败');
  r.readAsText(file, 'utf-8');
}

/* =========================================================
   生成器 · 角色选择（不选 = 纯随机）
   数据源 = 内置预设库 PRESET_CHARS + 自建角色卡 state.charLib
   ========================================================= */

/* 性别字形 */
const GLYPH = { female: '♀', male: '♂', futa: '⚥' };

/* 预设在前、自建在后，合成一个库（与 role-studio 的 libAll() 同构） */
function allCards(){
  return PRESET_CARDS.concat(state.charLib);
}

/* 选中卡对象（按 id 还原） */
function pickedCards(){
  const all = allCards();
  return state.pickIds
    .map(id => all.find(c => c.id === id))
    .filter(Boolean);
}

/* 随机抽卡池（2026-10-09「随机在角色卡里随机抽取生成」）：
   遵循角色来源面板的 作品 chip / 来源(预设·自建) / ♀♂ 筛选；
   基本设定里性别若明确选定（非随机），卡池也只留该性别，
   保证「性别=女性 + 抽卡」不会抽出男性卡跟场景打架。
   抽取数量 = 出场人数（上限 4），不重复。 */
function drawRandomCards(){
  const base = allCards().filter(it => {
    if (state.pickIps.length && state.pickIps.indexOf(it.ip) < 0) return false;
    if (state.pickSrc === 'preset' && it.src !== 'preset') return false;
    if (state.pickSrc === 'mine' && it.src !== 'mine') return false;
    return true;
  });
  if (!base.length) return [];
  /* 按男/女人数构成配额抽取（2026-10-09 人数修正）：
     女位从女卡（female/futa）抽、男位从男卡抽，人数 tag（1girl, 3boys…）
     始终与「男/女人数」选择严格一致；某性别卡不足时该位少抽，
     由引擎的随机角色补齐（引擎性别构成同样是精确的）。 */
  const fPool = fyShuffle(base.filter(it => it.gender !== 'male'));
  const mPool = fyShuffle(base.filter(it => it.gender === 'male'));
  return fPool.slice(0, state.actorsF).concat(mPool.slice(0, state.actorsM))
    .slice(0, state.actors);
}

/* 搜索 + 性别 + 来源筛选 */
function pickFiltered(){
  const q = state.pickQ.trim();
  return allCards().filter(it => {
    if (state.pickSrc === 'preset' && it.src !== 'preset') return false;
    if (state.pickSrc === 'mine' && it.src !== 'mine') return false;
    /* 按作品筛选：勾了作品 chip 时只留该作品（自建卡若填了同作品名也能命中） */
    if (state.pickIps.length && state.pickIps.indexOf(it.ip) < 0) return false;
    if (it.gender === 'male' && !state.pickMale) return false;
    if (it.gender !== 'male' && !state.pickFemale) return false;
    return cardMatches(it, q);
  });
}

function renderPick(){
  const panel = $('#pickPanel');
  const acts  = $('#pickActions');
  if (!panel) return;
  panel.hidden = !state.pickOpen;
  acts.hidden  = !state.pickOpen;
  $('#pickToggle').textContent = state.pickOpen ? '收起' : '选择角色';

  const list = pickFiltered();
  const q = state.pickQ.trim();
  $('#pickHit').textContent = q
    ? '命中 ' + list.length + ' 个'
    : '共 ' + list.length + ' 个角色（自建 ' + state.charLib.length + '）';
  $('#pickSearchClr').classList.toggle('on', !!q);

  /* 来源筛选按钮（全部 / 预设 / 自建） */
  const srcBox = $('#pickSource');
  if (srcBox) $$('#pickSource .src-btn').forEach(b => b.classList.toggle('is-active', b.dataset.src === state.pickSrc));
  renderIpChips();

  const box = $('#pickList');
  box.innerHTML = '';
  if (!list.length){
    box.innerHTML = state.pickSrc === 'mine'
      ? '<p class="empty">还没有自建角色。可以在下面直接新建一张，' +
        '或切到「全部」把喜欢的预设卡「存」进卡库再改。</p>' +
        '<div class="empty-acts">' +
          '<button type="button" class="mini-btn" data-act="new">＋ 新建角色卡</button>' +
        '</div>'
      : '<p class="empty">没有匹配的角色</p>';
  } else {
    list.forEach(it => box.appendChild(pickRow(it, q)));
  }

  const cards = pickedCards();
  if (state.pickRandom){
    $('#pickCur').textContent = '🎴 随机抽卡：每次生成从卡池随机抽取'
      + (state.pickIps.length ? '（限 ' + state.pickIps.join(' / ') + '）' : '');
    $('#pickCur').classList.add('is-on');
  } else {
    $('#pickCur').textContent = cards.length
      ? '🎯 指定角色：' + cards.map(c => c.name).join(' × ')
      : '🎲 纯随机（不指定角色）';
    $('#pickCur').classList.toggle('is-on', cards.length > 0);
  }
  const prBtn = $('#pickRandom');
  if (prBtn){
    prBtn.classList.toggle('is-active', state.pickRandom);
    prBtn.textContent = state.pickRandom ? '🎴 抽卡中' : '🎴 随机抽卡';
  }
  /* 全是女性卡且在场不止一个人 → 会走百合（女女）写法，这里先说一声 */
  const yuriTip = cards.length >= 2 && state.actors >= 2 &&
    cards.slice(0, state.actors).every(c => c.gender !== 'male' && c.gender !== 'futa');
  $('#pickTip').textContent = cards.length
    ? '已选 ' + cards.length + ' 个，最多按在场人数取用' + (yuriTip ? '（全是女性 → 自动走百合写法）' : '')
    : '没选角色时，全部外貌由引擎随机生成';

  /* 选了卡 → 性别由卡决定，下拉置灰并给提示 */
  const gsel = $('#gender');
  if (gsel){
    const gs = cards.map(c => c.gender);
    const same = gs.length && gs.every(g => g === gs[0]);
    gsel.disabled = state.genderLocked;
    gsel.title = state.genderLocked
      ? (same ? '性别由选中的角色卡决定' : '多张卡性别不同，各自按本卡性别出场')
      : '';
    $('#genderHint').textContent = state.genderLocked
      ? (same ? '已按角色卡锁定：' + ({ female:'女性', male:'男性', futa:'扶她' }[gs[0]] || gs[0])
              : '多张卡性别不同，各自按本卡性别出场')
      : '';
    $('#genderHint').hidden = !state.genderLocked;
  }
}

/* 一行一个角色，点一下选中/取消（多选，顺序即出场顺序）
   预设卡给「存」（复制到我的卡库），自建卡给「改 / 删」 */
function pickRow(it, q){
  const d = document.createElement('div');
  const ord = state.pickIds.indexOf(it.id);
  const mine = it.src === 'mine';
  d.className = 'lib-row pick-row' + (ord >= 0 ? ' is-picked' : '');
  d.dataset.id = it.id;
  d.dataset.src = it.src || 'preset';
  d.innerHTML =
    '<span class="pr-ord">' + (ord >= 0 ? (ord + 1) : '') + '</span>' +
    '<span class="lr-g">' + (GLYPH[it.gender] || '?') + '</span>' +
    '<span class="lr-name">' + escHl(it.name || '未命名', q) + '</span>' +
    '<span class="lr-tag">' + (mine ? '自建' : '预设') + '</span>' +
    (it.ip ? '<span class="lr-ip">' + escHl(it.ip, q) + '</span>' : '') +
    '<span class="lr-note">' + escHl(it.note || it.base || '', q) + '</span>' +
    '<span class="lr-ops">' +
      (mine
        ? '<button type="button" class="mini-btn" data-act="edit">改</button>' +
          '<button type="button" class="mini-btn danger" data-act="del">删</button>'
        : '<button type="button" class="mini-btn" data-act="save" title="把这张预设卡复制一份到我的卡库，之后可以随意改">存</button>') +
    '</span>';
  return d;
}

function onPickClick(e){
  /* 空状态里的「＋ 新建角色卡」 */
  if (e.target.closest('[data-act="new"]')){ openCharModal(null); return; }

  const row = e.target.closest('.pick-row');
  if (!row) return;
  const id = row.dataset.id;

  /* 行上的按钮：不参与选中，直接改 / 删 / 存 */
  const btn = e.target.closest('[data-act]');
  if (btn){
    const it = allCards().find(c => c.id === id);
    if (!it) return;
    if (btn.dataset.act === 'edit') openCharModal(it);
    else if (btn.dataset.act === 'del') deleteCard(it);
    else if (btn.dataset.act === 'save') saveToLib(it);
    return;
  }

  const i = state.pickIds.indexOf(id);
  if (i >= 0) state.pickIds.splice(i, 1);
  else {
    if (state.pickIds.length >= 4){ toast('最多同时指定 4 个角色'); return; }
    state.pickIds.push(id);
  }
  syncGenderFromPick();
  renderPick();
}

/* 选了角色卡 → 性别自动跟着卡走，不用再手选
   - 只有 1 张卡：性别直接锁定为该角色的性别
   - 多张卡性别一致：同样锁定
   - 多张卡性别不一致：退回「随机」，让每张卡各按自己的性别出场
   - 取消到没卡：回到「随机」 */
function syncGenderFromPick(){
  const cards = pickedCards();
  const sel = $('#gender');
  if (!cards.length){
    state.gender = 'random';
    state.genderLocked = false;
    if (sel) sel.value = 'random';
    return;
  }
  const gs = cards.map(c => c.gender);
  const same = gs.every(g => g === gs[0]);
  if (same){
    state.gender = gs[0];
    state.genderLocked = true;
    if (sel) sel.value = gs[0];
  } else {
    state.gender = 'random';
    state.genderLocked = true;   /* 多卡混合时也不该手改，改了会跟卡打架 */
    if (sel) sel.value = 'random';
  }
}

/* =========================================================
   画师多选
   - 默认不选 = 引擎随机挑一套画风
   - 可多选：选中的画师串会全部追加进提示词
   - 数据来自 data-library.js 的 __LIB.meta.artist / __LIB.data.artist
   ========================================================= */

/* 把库里的 artist 行拍平成 {zh, en} —— en 是多条标签，用逗号连成一条串；
   cat = 风格类别（meta.artist.names[r[2]]，如「厚涂画风」「清淡日系」） */
let ARTIST_LIST = null;
function buildArtistList(){
  if (ARTIST_LIST) return ARTIST_LIST;
  ARTIST_LIST = [];
  try {
    const L = (typeof window !== 'undefined' && window.__LIB) ? window.__LIB : null;
    if (!L || !L.data || !L.data.artist) return ARTIST_LIST;
    const dict = L.dict || [];
    const catNames = (L.meta && L.meta.artist && L.meta.artist.names) || [];
    L.data.artist.forEach(row => {
      const zh = row[0];
      const cat = catNames[row[2]] || '';
      const groups = row[3] || [];
      const parts = [];
      groups.forEach(g => {
        const s = g.map(i => dict[i] || '').filter(Boolean).join(',');
        if (s) parts.push(s);
      });
      const en = parts.join(',').trim();
      if (zh && en) ARTIST_LIST.push({ zh: zh, en: en, cat: cat, q: (zh + ' ' + en + ' ' + cat).toLowerCase() });
    });
  } catch (e){
    ARTIST_LIST = [];
  }
  return ARTIST_LIST;
}

/* 风格类别清单（按画师数排序，带计数） */
function artistCats(){
  const cnt = {};
  buildArtistList().forEach(it => { if (it.cat) cnt[it.cat] = (cnt[it.cat] || 0) + 1; });
  return Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]).map(c => ({ name: c, count: cnt[c] }));
}

function artistFiltered(){
  const all = buildArtistList();
  const q = state.artistQ.trim().toLowerCase();
  let list = all;
  /* 按风格类别筛选（多选；勾了类别只留该类） */
  if (state.artistCats.length) list = list.filter(it => state.artistCats.indexOf(it.cat) >= 0);
  if (!q) return list;
  return list.filter(it => it.q.indexOf(q) >= 0);
}

/* 一键选当前筛选出的整组画师（按列表顺序并入已选，去重） */
function pickAllArtists(){
  const list = artistFiltered();
  if (!list.length){ toast('当前没有可选的画师'); return; }
  list.forEach(it => {
    if (state.artistPicks.indexOf(it.zh) < 0) state.artistPicks.push(it.zh);
  });
  renderArtist();
  toast('已选入 ' + list.length + ' 位画师（最多取前 6 位进提示词）');
}

/* 已选画师 → 英文串数组（按选择顺序） */
function pickedArtists(){
  const all = buildArtistList();
  return state.artistPicks
    .map(zh => { const hit = all.find(it => it.zh === zh); return hit ? hit.en : ''; })
    .filter(Boolean);
}

function renderArtist(){
  const panel = $('#artistPanel');
  if (!panel) return;
  panel.hidden = !state.artistOpen;
  const acts = $('#artistActions');
  if (acts) acts.hidden = !state.artistOpen;

  const list = artistFiltered();
  const q = state.artistQ.trim();
  const hit = $('#artistHit');
  if (hit) hit.textContent = (q || state.artistCats.length)
    ? '命中 ' + list.length + ' 位'
    : '共 ' + list.length + ' 位画师';
  const clr = $('#artistSearchClr');
  if (clr) clr.classList.toggle('on', !!q);

  /* 风格类别 chip 条（多选筛选） */
  const catBox = $('#artistCatChips');
  if (catBox){
    catBox.innerHTML = '';
    artistCats().forEach(c => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (state.artistCats.indexOf(c.name) >= 0 ? ' on' : '');
      b.textContent = c.name + ' ' + c.count;
      b.title = '只看「' + c.name + '」的画师（可多选，再点取消）';
      b.addEventListener('click', () => {
        toggleIn(state.artistCats, c.name);
        renderArtist();
      });
      catBox.appendChild(b);
    });
  }

  const box = $('#artistList');
  if (box){
    box.innerHTML = '';
    if (!list.length){
      box.innerHTML = '<p class="empty">没有匹配的画师</p>';
    } else {
      /* 最多渲染 300 条，避免一次插 1400+ 行 DOM 卡顿 */
      list.slice(0, 300).forEach(it => box.appendChild(artistRow(it, q)));
      if (list.length > 300){
        const more = document.createElement('p');
        more.className = 'empty';
        more.textContent = '还有 ' + (list.length - 300) + ' 位，输入关键词缩小范围';
        box.appendChild(more);
      }
    }
  }

  /* 当前选中摘要 */
  const cur = $('#artistCur');
  if (cur){
    const n = state.artistPicks.length;
    cur.textContent = n
      ? '🖌️ 已选 ' + n + ' 位画师：' + state.artistPicks.slice(0, 3).join(' · ') +
        (n > 3 ? ' …' : '')
      : '🖌️ 未选画师（随机画风）';
    cur.classList.toggle('is-on', n > 0);
  }
  /* 按钮上的展开状态提示 */
  const open = $('#artistOpen');
  if (open) open.textContent = state.artistOpen ? '收起' : '选择画师';
}

function artistRow(it, q){
  const d = document.createElement('div');
  const ord = state.artistPicks.indexOf(it.zh);
  d.className = 'lib-row pick-row artist-row' + (ord >= 0 ? ' is-picked' : '');
  d.dataset.zh = it.zh;
  d.innerHTML =
    '<span class="pr-ord">' + (ord >= 0 ? (ord + 1) : '') + '</span>' +
    '<span class="lr-name">' + escHl(it.zh, q) + '</span>' +
    '<span class="lr-note artist-en">' + escHl(it.en, q) + '</span>';
  return d;
}

function onArtistClick(e){
  const row = e.target.closest('.artist-row');
  if (!row) return;
  const zh = row.dataset.zh;
  const i = state.artistPicks.indexOf(zh);
  if (i >= 0) state.artistPicks.splice(i, 1);
  else {
    if (state.artistPicks.length >= 6){ toast('最多同时叠加 6 位画师'); return; }
    state.artistPicks.push(zh);
  }
  renderArtist();
  /* 立刻按新画师重出一版提示词，所见即所得 */
  doGenerate(false);
}


/* 把当前模式同步到界面各处（灯泡、body、NSFW 区块、情境子页 NSFW 开关） */
function applyModeUI(){
  document.body.className = 'mode-' + state.mode;
  const on = (state.mode === 'nsfw');
  $('#bulbBtn').setAttribute('aria-pressed', on ? 'true' : 'false');
  $('#bulbBtn').title = on ? '夜灯已点亮 · 点击关闭成人内容' : '夜灯：点亮后开启成人内容';
  $('#bulbTxt').textContent = on ? '夜间' : '清水';
  $('#nsfwBlock').hidden = !on;
  if (on) renderActPick();
  /* 出场人数只在 NSFW 下出现；切回清水时强制回 1 人（清水是单人向） */
  const ab = $('#actorBlock');
  if (ab){
    ab.hidden = !on;
    if (!on && (state.actorsM !== 0 || state.actorsF !== 1)){
      state.actorsM = 0; state.actorsF = 1; state.actors = 1;
      if (state.pickIds.length > 1) state.pickIds = state.pickIds.slice(0, 1);
    }
    /* state 是唯一真相：切模式/初始化后都把选择器同步过来，
       避免「界面显示 1 人、引擎按 2 人生成」这种两端不一致。 */
    const selM = $('#actorsM'), selF = $('#actorsF');
    if (selM) selM.value = String(state.actorsM);
    if (selF) selF.value = String(state.actorsF);
    /* 人数精确构成后说明「角色性别」下拉的新语义 */
    const gh = $('#genderHint');
    if (gh && !state.genderLocked){
      gh.textContent = on ? '男/女人数决定出场构成；角色性别选「扶她」时女生位为扶她' : '';
      gh.hidden = !on;
    }
  }
  /* 顶栏隐藏的 SFW/NSFW 旧按钮同步状态，保持兼容 */
  $$('#modeSwitch .mode-btn').forEach(x => x.classList.toggle('is-active', x.dataset.mode === state.mode));
  /* 服饰下拉随模式重建：「全裸」与成人向成衣柜只在夜灯亮时可选项。
     切回清水时若正选着「全裸」，这里会把它回落成「默认」。 */
  fillOutfitOptions();
}

/* 真正切换模式（确认之后才调） */
function setMode(m){
  state.mode = m;
  applyModeUI();
  /* 清水会强制回 1 人，选择器 UI 要跟着同步 */
  renderPick();
  renderArtist();
  doGenerate();
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

  /* 角色选择 */
  $('#pickToggle').addEventListener('click', () => { state.pickOpen = !state.pickOpen; renderPick(); });
  $('#pickSearch').addEventListener('input', e => { state.pickQ = e.target.value; renderPick(); });
  $('#pickSearchClr').addEventListener('click', () => {
    state.pickQ = ''; $('#pickSearch').value = ''; renderPick(); $('#pickSearch').focus();
  });
  $('#pickFemale').addEventListener('change', e => { state.pickFemale = e.target.checked; renderPick(); });
  $('#pickMale').addEventListener('change', e => { state.pickMale = e.target.checked; renderPick(); });
  $('#pickList').addEventListener('click', onPickClick);
  $('#pickClear').addEventListener('click', () => { state.pickIds = []; renderPick(); doGenerate(false); });
  /* 随机抽卡开关：开了之后手动勾选不再参与生成 */
  const prToggle = $('#pickRandom');
  if (prToggle) prToggle.addEventListener('click', () => {
    state.pickRandom = !state.pickRandom;
    renderPick();
    doGenerate(false);
    toast(state.pickRandom ? '已开启随机抽卡：每次生成都从卡池现抽' : '已关闭随机抽卡');
  });
  const pSrc = $('#pickSource');
  if (pSrc) pSrc.addEventListener('click', e => {
    const b = e.target.closest('.src-btn');
    if (!b) return;
    state.pickSrc = b.dataset.src;
    renderPick();
  });

  /* 新建 / 编辑角色卡 */
  const addBtn = $('#cardAddBtn');
  if (addBtn) addBtn.addEventListener('click', () => openCharModal(null));
  const pAdd = $('#pickAddBtn');
  if (pAdd) pAdd.addEventListener('click', () => openCharModal(null));
  const mClose = $('#modalClose');
  if (mClose) mClose.addEventListener('click', closeCharModal);
  const mBox = $('#charModal');
  if (mBox) mBox.addEventListener('click', e => { if (e.target.id === 'charModal') closeCharModal(); });
  const mSave = $('#edSave');
  if (mSave) mSave.addEventListener('click', saveFromEditor);
  const mFill = $('#edFill');
  if (mFill) mFill.addEventListener('click', fillRandomBase);
  const mFillCard = $('#edFillCard');
  if (mFillCard) mFillCard.addEventListener('click', fillRandomCard);
  const mDel = $('#edDelete');
  if (mDel) mDel.addEventListener('click', () => {
    const it = state.editing;
    if (!it) return;
    closeCharModal();          /* 先关弹窗（会清 state.editing），再删 */
    deleteCard(it);
  });
  const mClear = $('#edClear');
  if (mClear) mClear.addEventListener('click', () => {
    $('#edName').value = ''; $('#edNameEn').value = ''; $('#edIp').value = '';
    $('#edBase').value = ''; $('#edOutfit').value = ''; $('#edNote').value = '';
  });
  /* Esc 关弹窗 */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && mBox && !mBox.hidden) closeCharModal();
  });

  /* 下拉 */
  $('#gender').addEventListener('change', e => { state.gender = e.target.value; });
  const syncActors = () => {
    state.actors = Math.max(1, state.actorsM + state.actorsF);
    /* 在场人数变了，选中的卡最多留这么多 */
    if (state.pickIds.length > state.actors) state.pickIds = state.pickIds.slice(0, state.actors);
    renderPick();
  };
  const amSel = $('#actorsM'), afSel = $('#actorsF');
  if (amSel) amSel.addEventListener('change', e => {
    state.actorsM = parseInt(e.target.value, 10) || 0;
    syncActors();
  });
  if (afSel) afSel.addEventListener('change', e => {
    state.actorsF = parseInt(e.target.value, 10) || 0;
    syncActors();
  });
  /* 画师多选 */
  const aOpen = $('#artistOpen');
  if (aOpen) aOpen.addEventListener('click', () => { state.artistOpen = !state.artistOpen; renderArtist(); });
  const aCur = $('#artistCur');
  if (aCur) aCur.addEventListener('click', () => { state.artistOpen = !state.artistOpen; renderArtist(); });
  const aSearch = $('#artistSearch');
  if (aSearch) aSearch.addEventListener('input', e => { state.artistQ = e.target.value; renderArtist(); });
  const aClr = $('#artistSearchClr');
  if (aClr) aClr.addEventListener('click', () => {
    state.artistQ = ''; $('#artistSearch').value = ''; renderArtist(); $('#artistSearch').focus();
  });
  const aClear = $('#artistClear');
  if (aClear) aClear.addEventListener('click', () => {
    state.artistPicks = []; renderArtist(); doGenerate(false); toast('已清空画师');
  });
  const aPickAll = $('#artistPickAll');
  if (aPickAll) aPickAll.addEventListener('click', pickAllArtists);
  const aList = $('#artistList');
  if (aList) aList.addEventListener('click', onArtistClick);

  /* 体位类别（NSFW 面板） */
  const posSel = $('#posCat');
  if (posSel){
    posSel.value = state.posCat || '';
    posSel.addEventListener('change', e => { state.posCat = e.target.value; });
  }

  /* 动作自选（法典动作库搜索 / 勾选） */
  const actSearch = $('#actSearch');
  if (actSearch) actSearch.addEventListener('input', e => { state.actQ = e.target.value; renderActPick(); });
  const actClrS = $('#actSearchClr');
  if (actClrS) actClrS.addEventListener('click', () => {
    state.actQ = ''; $('#actSearch').value = ''; renderActPick(); $('#actSearch').focus();
  });
  const actClear = $('#actClear');
  if (actClear) actClear.addEventListener('click', () => {
    state.actPicks = []; renderActPick(); toast('已清空自选动作');
  });
  const actList = $('#actList');
  if (actList) actList.addEventListener('click', e => {
    const btn = e.target.closest('[data-act-idx]');
    if (!btn) return;
    const i = Number(btn.dataset.actIdx);
    const at = state.actPicks.indexOf(i);
    if (at >= 0) state.actPicks.splice(at, 1);
    else {
      if (state.actPicks.length >= ACT_PICK_MAX){ toast('最多同时选 ' + ACT_PICK_MAX + ' 个动作'); return; }
      state.actPicks.push(i);
    }
    renderActPick();
  });
  const actChips = $('#actSelChips');
  if (actChips) actChips.addEventListener('click', e => {
    const btn = e.target.closest('[data-act-remove]');
    if (!btn) return;
    const i = Number(btn.dataset.actRemove);
    const at = state.actPicks.indexOf(i);
    if (at >= 0) state.actPicks.splice(at, 1);
    renderActPick();
  });

  /* 服饰：状态与服装两个下拉（可同时选；全裸与具体服装互斥，由引擎按优先级处理） */
  $('#outfitState').addEventListener('change', e => { state.outfitState = e.target.value; });
  $('#outfitPick').addEventListener('change', e => { state.outfitPick = e.target.value; });

  /* 标签工具 */
  $('#tagAll').addEventListener('click', () => setTags(NSFW_TAGS.map(t => t.id)));
  $('#tagNone').addEventListener('click', () => setTags([]));
  $('#tagInvert').addEventListener('click', () => {
    const all = NSFW_TAGS.map(t => t.id);
    setTags(all.filter(id => !state.tags.includes(id)));
  });

  /* 生成 */


  /* ---------- 大模型配置 + 中文转提示词 ---------- */
  function loadLlmConfigUi(){
    if (location.protocol === 'file:') return;
    fetch('/__api/llm/config').then(r => r.json()).then(j => {
      if (!j || !j.ok || !j.config) return;
      const c = j.config;
      if ($('#llmEnabled')) $('#llmEnabled').value = c.enabled ? '1' : '0';
      if ($('#llmBase')) $('#llmBase').value = c.base_url || '';
      if ($('#llmKey')) $('#llmKey').value = c.api_key || '';
      if ($('#llmModel')) $('#llmModel').value = c.model || '';
    }).catch(() => {});
  }
  loadLlmConfigUi();

  const btnLlmSave = $('#btnLlmSave');
  if (btnLlmSave) btnLlmSave.addEventListener('click', () => {
    if (location.protocol === 'file:'){ toast('请用启动生成器.bat 打开以保存配置'); return; }
    const body = {
      enabled: ($('#llmEnabled') && $('#llmEnabled').value) === '1',
      base_url: ($('#llmBase') && $('#llmBase').value || '').trim(),
      api_key: ($('#llmKey') && $('#llmKey').value || '').trim(),
      model: ($('#llmModel') && $('#llmModel').value || '').trim()
    };
    fetch('/__api/llm/config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(r => r.json()).then(j => {
      if (j && j.ok) toast('大模型配置已保存到 config/llm.json');
      else toast((j && j.err) || '保存失败');
    }).catch(e => toast('保存失败：' + e.message));
  });

  function forcedCharsFromPicker(){
    const cards = (typeof pickedCards === 'function') ? pickedCards() : [];
    return cards.map(c => {
      const core = c.core || c.base || '';
      const trigger = core ? String(core).split(',')[0].trim() : (c.nameEn || c.name || '');
      return {
        trigger: trigger,
        core: core || '',
        name: c.name || '',
        gender: c.gender || ''
      };
    });
  }

  function zhContextNotes(){
    const ctx = (typeof buildCtx === 'function') ? buildCtx() : {};
    const notes = [];
    notes.push('底模: ' + (ctx.model || ($('#model') && $('#model').value) || 'noobai'));
    notes.push('模式: ' + (ctx.mode || 'sfw'));
    if (ctx.gender) notes.push('性别设定: ' + ctx.gender);
    if (ctx.outfitPick) notes.push('服饰: ' + ctx.outfitPick);
    if (ctx.outfitState) notes.push('衣着状态: ' + ctx.outfitState);
    const forced = forcedCharsFromPicker();
    if (forced.length) notes.push('角色来源: ' + forced.map(c => c.trigger || c.name).join(', '));
    else notes.push('角色来源: 未指定（可由中文推断或用通用 1girl）');
    return { ctx: ctx, forced: forced, notes: notes };
  }

  function parseLlmPromptJson(content){
    let s = String(content || '').trim();
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) s = fence[1].trim();
    try {
      const o = JSON.parse(s);
      return {
        prompt: String(o.prompt || o.positive || '').trim(),
        negative: String(o.negative || o.neg || '').trim()
      };
    } catch (e) {
      /* 非 JSON：尝试 Positive:/Negative: 分段 */
      const mPos = s.match(/positive\s*[:：]\s*([\s\S]*?)(?=negative\s*[:：]|$)/i);
      const mNeg = s.match(/negative\s*[:：]\s*([\s\S]*?)$/i);
      if (mPos) return { prompt: mPos[1].trim(), negative: mNeg ? mNeg[1].trim() : '' };
      return { prompt: s, negative: '' };
    }
  }


  /* 参考图 base64（data URL） */
  state.zhImageDataUrl = state.zhImageDataUrl || null;

  function buildLlmMessages(zh, kind, prevPrompt, prevNeg, imageDataUrl){
    const pack = zhContextNotes();
    const hasImg = !!(imageDataUrl && String(imageDataUrl).indexOf('data:') === 0);
    const hasZh = !!(zh && String(zh).trim());
    const sys = [
      '你是 Stable Diffusion / NoobAI-XL 的提示词工程师。',
      '只输出 JSON：{"prompt":"...","negative":"..."}，不要其它解释。',
      'prompt 必须是英文 danbooru 风格标签，逗号分隔。',
      '硬性规则：',
      '1) 角色触发词与外貌必须以「角色来源」给出的 core 为准；禁止用中文名或图片里的脸替换触发词。',
      '2) 角色触发词必须放在 prompt 最开头（与 core 第一段一致）。',
      '3) 合并基本设定（底模、性别、服饰、衣着状态），不要丢弃。',
      '4) 若有参考图：以图为主，重点描述 服装（上衣/下装/袜子/鞋子/配色）、眼神与表情、姿势与动作、背景场景、光影重点；中文描述仅作辅助补充。',
      '5) 若只有中文、没有图：按中文场景/服装/动作生成。',
      '6) 加入适量质量词（masterpiece, best quality 等）。',
      '7) negative 写常见画质与肢体负面词。',
      '8) 不要输出中文标签。'
    ].join('\n');
    const textParts = [
      '【基本设定与角色来源】\n' + pack.notes.join('\n'),
      pack.forced.length ? ('【角色 core — 必须原样放在 prompt 开头】\n' + pack.forced.map(c => c.core || c.trigger).join('\n')) : ''
    ];
    if (hasZh) textParts.push('【中文辅助描述】\n' + zh.trim());
    if (hasImg) textParts.push('【参考图】已附上。请以图中的服装、姿势、表情、背景、光影为主生成标签；中文仅辅助。');
    if (kind === 'optimize' && prevPrompt) {
      textParts.push('【当前 Positive】\n' + prevPrompt);
      if (prevNeg) textParts.push('【当前 Negative】\n' + prevNeg);
      textParts.push('请在保留角色来源与基本设定的前提下优化/补全，仍只输出 JSON。');
    } else {
      textParts.push('请直接生成 prompt 与 negative。');
    }
    const text = textParts.filter(Boolean).join('\n\n');
    let userContent;
    if (hasImg) {
      userContent = [
        { type: 'text', text: text },
        { type: 'image_url', image_url: { url: imageDataUrl } }
      ];
    } else {
      userContent = text;
    }
    return [
      { role: 'system', content: sys },
      { role: 'user', content: userContent }
    ];
  }

  function applyZhResult(prompt, negative, note){
    const posEl = $('#promptPos'), negEl = $('#promptNeg');
    if (posEl) posEl.value = prompt || '';
    if (negEl) negEl.value = negative || '';
    state.current = Object.assign({}, state.current || {}, {
      prompt: prompt || '',
      negative: negative || '',
      __fromZh: true
    });
    const st = $('#zhStatus');
    if (st) st.textContent = note || '已写入右侧，可继续编辑';
  }

  function runRuleConvert(zh){
    const pack = zhContextNotes();
    const model = (pack.ctx && pack.ctx.model) || ($('#model') && $('#model').value) || 'noobai';
    let outfit = '';
    if (typeof pickedOutfit === 'function') {
      try {
        const o = pickedOutfit(pack.ctx);
        if (o && o.en) outfit = o.en;
      } catch (e) {}
    }
    const r = convertZhToPrompt(zh, {
      model: model,
      gender: pack.ctx.gender,
      forcedChars: pack.forced,
      outfit: outfit
    });
    return r;
  }

  function runLlmConvert(zh, kind){
    const prevP = ($('#promptPos') && $('#promptPos').value || '').trim();
    const prevN = ($('#promptNeg') && $('#promptNeg').value || '').trim();
    const img = state.zhImageDataUrl || null;
    const messages = buildLlmMessages(zh, kind, prevP, prevN, img);
    return fetch('/__api/llm/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: messages, temperature: kind === 'optimize' ? 0.6 : 0.7 })
    }).then(r => {
      return r.text().then(txt => {
        let j = null;
        try { j = JSON.parse(txt); } catch (e) {}
        if (!r.ok) {
          throw new Error((j && j.err) || ('HTTP ' + r.status + (txt ? (': ' + txt.slice(0, 160)) : '')));
        }
        return j;
      });
    }).catch(e => {
      const msg = (e && e.message) ? e.message : String(e);
      if (/Failed to fetch|NetworkError|Load failed|网络/i.test(msg)) {
        throw new Error('网络请求失败：请确认用「启动生成器.bat」打开，且图片不要过大；服务端已支持约 20MB 原图（会自动压缩）');
      }
      throw e;
    }).then(j => {
      if (!j || !j.ok) throw new Error((j && j.err) || '大模型调用失败');
      const parsed = parseLlmPromptJson(j.content);
      if (!parsed.prompt) throw new Error('大模型未返回有效 prompt');
      const forced = forcedCharsFromPicker();
      let prompt = parsed.prompt;
      if (forced.length) {
        const leads = forced.map(c => c.trigger).filter(Boolean);
        leads.forEach(t => {
          const re = new RegExp('(^|,)\\s*' + t.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&') + '\\s*(?=,|$)', 'gi');
          prompt = prompt.replace(re, '$1');
        });
        prompt = leads.join(', ') + ', ' + prompt.replace(/^[,\\s]+/, '');
      }
      let negative = parsed.negative;
      if (!negative && typeof convertZhToPrompt === 'function') {
        negative = runRuleConvert(zh || '1girl').negative;
      }
      return { prompt: prompt, negative: negative };
    });
  }

  /* 参考图上传 */

  /* 识图前压缩：最长边 1536，JPEG 质量 0.85，避免请求体过大导致 Failed to fetch */
  function compressImageDataUrl(dataUrl, maxSide, quality){
    maxSide = maxSide || 1536;
    quality = quality == null ? 0.85 : quality;
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;
        if (!w || !h) { resolve(dataUrl); return; }
        const scale = Math.min(1, maxSide / Math.max(w, h));
        w = Math.max(1, Math.round(w * scale));
        h = Math.max(1, Math.round(h * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        try {
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (e) {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  const zhImage = $('#zhImage');
  if (zhImage) zhImage.addEventListener('change', () => {
    const f = zhImage.files && zhImage.files[0];
    const prev = $('#zhImagePreview');
    const clr = $('#btnZhImageClear');
    if (!f) {
      state.zhImageDataUrl = null;
      if (prev) { prev.hidden = true; prev.innerHTML = ''; }
      if (clr) clr.hidden = true;
      return;
    }
    if (f.size > 20 * 1024 * 1024) { toast('图片请小于 20MB'); zhImage.value = ''; return; }
    const reader = new FileReader();
    reader.onload = () => {
      const raw = reader.result;
      if (prev) {
        prev.hidden = false;
        prev.innerHTML = '<img alt="参考图预览" src="' + raw + '">';
      }
      const nm = $('#zhImageName');
      if (nm) nm.textContent = (f.name || '已选择图片') + ' · 压缩中…';
      compressImageDataUrl(raw, 1536, 0.85).then(url => {
        state.zhImageDataUrl = url;
        if (prev) prev.innerHTML = '<img alt="参考图预览" src="' + url + '">';
        if (nm) {
          const kb = Math.round((url.length * 0.75) / 1024);
          nm.textContent = (f.name || '已选择图片') + ' · 约 ' + kb + 'KB';
        }
        if (clr) clr.hidden = false;
        toast('已载入参考图（已压缩便于识图）');
      });
    };
    reader.readAsDataURL(f);
  });
  const btnZhImageClear = $('#btnZhImageClear');
  if (btnZhImageClear) btnZhImageClear.addEventListener('click', () => {
    state.zhImageDataUrl = null;
    if (zhImage) zhImage.value = '';
    const prev = $('#zhImagePreview');
    if (prev) { prev.hidden = true; prev.innerHTML = ''; }
    const nm = $('#zhImageName');
    if (nm) nm.textContent = '未选择文件';
    btnZhImageClear.hidden = true;
    toast('已清除参考图');
  });

  const btnZh = $('#btnZhConvert');
  if (btnZh) btnZh.addEventListener('click', () => {
    const zh = ($('#zhInput') && $('#zhInput').value || '').trim();
    const hasImg = !!(state.zhImageDataUrl);
    if (!zh && !hasImg) { toast('请写中文描述，或上传参考图'); return; }
    const useLlm = ($('#llmEnabled') && $('#llmEnabled').value) === '1';
    const st = $('#zhStatus');
    /* 有图必须走大模型；无图可本地规则 */
    if (hasImg || useLlm) {
      if (location.protocol === 'file:'){ toast('大模型/识图需要用 bat 启动'); return; }
      if (!useLlm && hasImg) {
        toast('识图需要启用大模型（右侧底部大模型设置）');
        return;
      }
      if (st) st.textContent = hasImg ? '正在识图并生成提示词…' : '正在调用大模型…';
      btnZh.disabled = true;
      runLlmConvert(zh, 'convert').then(r => {
        applyZhResult(r.prompt, r.negative, hasImg
          ? '已按参考图生成（角色来源置顶）· 可再优化或手动改'
          : '大模型已转换 · 角色来源与设定已约束');
        toast('转换完成');
      }).catch(e => {
        if (zh && typeof convertZhToPrompt === 'function') {
          const rule = runRuleConvert(zh);
          applyZhResult(rule.prompt, rule.negative, '大模型失败，已回退本地规则：' + e.message);
          toast('大模型失败，已用本地规则');
        } else {
          toast('失败：' + e.message);
          if (st) st.textContent = e.message;
        }
      }).then(() => { btnZh.disabled = false; });
    } else {
      if (typeof convertZhToPrompt !== 'function') { toast('转换模块未加载'); return; }
      const r = runRuleConvert(zh);
      applyZhResult(r.prompt, r.negative, (r.notes && r.notes.join(' · ')) || '本地规则已转换');
      toast('已转换（本地规则）');
    }
  });

  const btnZhOpt = $('#btnZhOptimize');
  if (btnZhOpt) btnZhOpt.addEventListener('click', () => {
    const zh = ($('#zhInput') && $('#zhInput').value || '').trim();
    const hasImg = !!(state.zhImageDataUrl);
    if (!zh && !hasImg) { toast('先写中文或上传参考图'); return; }
    if (location.protocol === 'file:'){ toast('请用 bat 启动以调用大模型'); return; }
    if (($('#llmEnabled') && $('#llmEnabled').value) !== '1'){ toast('请先启用并保存大模型配置'); return; }
    const st = $('#zhStatus');
    if (st) st.textContent = '正在优化…';
    btnZhOpt.disabled = true;
    runLlmConvert(zh, 'optimize').then(r => {
      applyZhResult(r.prompt, r.negative, '已优化一轮 · 可继续点「再优化」或手动改词后提交');
      toast('优化完成');
    }).catch(e => toast('优化失败：' + e.message))
      .then(() => { btnZhOpt.disabled = false; });
  });

  const btnZhApply = $('#btnZhApply');
  if (btnZhApply) btnZhApply.addEventListener('click', () => {
    const posEl = $('#promptPos'), negEl = $('#promptNeg');
    if (!posEl || !posEl.value.trim()) { toast('请先转换或生成提示词'); return; }
    state.current = Object.assign({}, state.current || {}, {
      prompt: posEl.value.trim(),
      negative: (negEl && negEl.value || '').trim()
    });
    toast('已同步当前提示词，可提交 ComfyUI');
  });

  ['promptPos', 'promptNeg'].forEach(id => {
    const el = $('#' + id);
    if (!el) return;
    el.addEventListener('change', () => {
      if (!state.current) state.current = {};
      if (id === 'promptPos') state.current.prompt = el.value;
      else state.current.negative = el.value;
    });
  });


  const pickListEl = $('#pickList');
  if (pickListEl) pickListEl.addEventListener('click', () => {
    setTimeout(() => applyCharModelPrefs(true), 0);
  });

  $('#btnGen').addEventListener('click', () => doGenerate());

  const comfyUrlEl = $('#comfyUrl');
  if (comfyUrlEl){
    try {
      const saved = localStorage.getItem('randgen_comfy_url');
      if (saved) comfyUrlEl.value = saved;
    } catch (e) {}
    comfyUrlEl.addEventListener('change', () => {
      try { localStorage.setItem('randgen_comfy_url', comfyUrlEl.value.trim()); } catch (e) {}
    });
  }
  function selectedComfyTemplates(){
    const boxes = document.querySelectorAll('#comfyTplList input[type=checkbox]:checked');
    const list = [];
    boxes.forEach(b => { if (b.value) list.push(b.value); });
    if (!list.length) {
      const hidden = $('#comfyTpl');
      if (hidden && hidden.value) list.push(hidden.value);
      else list.push('base.json');
    }
    return list;
  }
  function renderComfyTplList(files){
    const box = $('#comfyTplList');
    const hidden = $('#comfyTpl');
    if (!box) return;
    let saved = [];
    try {
      const raw = localStorage.getItem('randgen_comfy_tpls');
      if (raw) saved = JSON.parse(raw);
      if (!Array.isArray(saved)) saved = [];
    } catch (e) { saved = []; }
    if (!saved.length) {
      try {
        const one = localStorage.getItem('randgen_comfy_tpl');
        if (one) saved = [one];
      } catch (e) {}
    }
    if (!saved.length && files.indexOf('base.json') >= 0) saved = ['base.json'];
    if (!saved.length && files.length) saved = [files[0]];
    box.innerHTML = '';
    files.forEach(name => {
      const lab = document.createElement('label');
      lab.className = 'tpl-check';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = name;
      cb.checked = saved.indexOf(name) >= 0;
      cb.addEventListener('change', () => {
        try { localStorage.setItem('randgen_comfy_tpls', JSON.stringify(selectedComfyTemplates())); } catch (e) {}
        if (hidden) {
          const cur = selectedComfyTemplates();
          hidden.value = cur[0] || name;
        }
      });
      lab.appendChild(cb);
      lab.appendChild(document.createTextNode(' ' + name));
      box.appendChild(lab);
    });
    if (hidden) {
      hidden.innerHTML = '';
      files.forEach(name => {
        const o = document.createElement('option');
        o.value = name;
        o.textContent = name;
        hidden.appendChild(o);
      });
      hidden.value = saved[0] || files[0] || 'base.json';
    }
  }
  const comfyTpl = $('#comfyTpl');
  function loadComfyTemplates(){
    if (location.protocol === 'file:') {
      const box = $('#comfyTplList');
      if (box && !box.querySelectorAll('input').length) {
        renderComfyTplList(['base.json']);
      }
      return;
    }
    fetch('/__api/comfy/templates')
      .then(r => r.json())
      .then(j => {
        const files = (j && j.files) || [];
        if (!files.length) return;
        renderComfyTplList(files);
      })
      .catch(e => console.warn('templates', e));
  }
  loadComfyTemplates();
  setTimeout(loadComfyTemplates, 800);

  /* ---------- Comfy 底模 / LoRA 列表 ---------- */
  function fillSelect(sel, items, keepValue){
    if (!sel) return;
    const cur = keepValue != null ? keepValue : sel.value;
    sel.innerHTML = '';
    const o0 = document.createElement('option');
    o0.value = '';
    o0.textContent = (sel.id === 'comfyLoraChar')
      ? '不使用角色 LoRA（仅底模）'
      : '（保持模板默认）';
    sel.appendChild(o0);
    (items || []).forEach(name => {
      const o = document.createElement('option');
      o.value = name;
      o.textContent = name;
      sel.appendChild(o);
    });
    if (cur && Array.prototype.some.call(sel.options, o => o.value === cur)) sel.value = cur;
  }

  function refreshComfyModels(){
    if (location.protocol === 'file:') return;
    const url = (comfyUrlEl && comfyUrlEl.value.trim()) || 'http://127.0.0.1:8188';
    const status = $('#comfyStatus');
    fetch('/__api/comfy/models?url=' + encodeURIComponent(url))
      .then(r => r.json())
      .then(j => {
        if (!j || !j.ok) {
          if (status) status.textContent = (j && j.err) || '读取模型列表失败';
          return;
        }
        fillSelect($('#comfyCkpt'), j.checkpoints || []);
        fillSelect($('#comfyLoraChar'), j.loras || []);
        /* 尝试匹配角色卡推荐 */
        applyCharModelPrefs(false);
        if (status) status.textContent = '已读取底模 ' + (j.checkpoints||[]).length + ' · LoRA ' + (j.loras||[]).length;
      })
      .catch(e => { if (status) status.textContent = '读取模型失败：' + e.message; });
  }

  /* 从 checkpoint 文件名反查顶栏底模 key（MODEL_PRESETS） */
  function modelKeyFromCkpt(ckpt){
    if (!ckpt || typeof MODEL_PRESETS === 'undefined') return '';
    const base = String(ckpt).replace(/\.safetensors$/i, '').toLowerCase();
    const keys = Object.keys(MODEL_PRESETS);
    for (let i = 0; i < keys.length; i++){
      const M = MODEL_PRESETS[keys[i]];
      if (!M || !M.ckpt) continue;
      const mb = String(M.ckpt).replace(/\.safetensors$/i, '').toLowerCase();
      if (mb === base || base.indexOf(mb) >= 0 || mb.indexOf(base) >= 0) return keys[i];
    }
    /* 常见别名兜底 */
    if (/wai.*illustrious.*v170|waiillustrioussdxl_v170/i.test(base)) return 'wai_illu_v170';
    if (/wai.*illustrious.*v160|waiillustrioussdxl_v160/i.test(base)) return 'wai_illu_v160';
    if (/wai.*illustrious.*v140|waiillustrioussdxl_v140/i.test(base)) return 'wai_illu_v140';
    if (/illustrious-xl-v1\.1|illustrious_xl_v11/i.test(base)) return 'illu_xl_v11';
    if (/illustriousxl10/i.test(base)) return 'illu_xl10_v10';
    if (/cocostyle.*noobai|coco_noobai/i.test(base)) return 'coco_noobai_v70';
    if (/noobai/i.test(base)) return 'noobai';
    if (/animagine/i.test(base)) return 'animagine';
    if (/pony/i.test(base)) return 'pony';
    if (/illustrious/i.test(base)) return 'illustrious';
    return '';
  }

  function applyCharModelPrefs(force){
    const cards = (typeof pickedCards === 'function') ? pickedCards() : [];
    if (!cards.length) return;
    const card = cards[0];
    /* 角色卡可自带 preferredCkpt；否则按当前底模预设的 ckpt；再否则默认 NoobAI */
    let defaultCkpt = 'NoobAI-XL-v1.1.safetensors';
    if (card.preferredCkpt) defaultCkpt = card.preferredCkpt;
    else if (typeof MODEL_PRESETS !== 'undefined' && state.model && MODEL_PRESETS[state.model] && MODEL_PRESETS[state.model].ckpt) {
      defaultCkpt = MODEL_PRESETS[state.model].ckpt;
    }
    const ckptSel = $('#comfyCkpt');
    const loraSel = $('#comfyLoraChar');
    const strEl = $('#comfyLoraStr');
    if (ckptSel) {
      const want = defaultCkpt;
      if (force || !ckptSel.value) {
        if (Array.prototype.some.call(ckptSel.options, o => o.value === want)) ckptSel.value = want;
        else {
          /* 模糊匹配文件名主干 */
          const base = String(want).replace(/\.safetensors$/i,'');
          const hit = Array.prototype.find.call(ckptSel.options, o => o.value && o.value.indexOf(base) >= 0);
          if (hit) ckptSel.value = hit.value;
        }
      }
    }
    /* 选中角色卡时：顶栏「底模」与下方 Comfy checkpoint 同步
       优先 card.preferredModel；否则由 preferredCkpt 反查 MODEL_PRESETS */
    if (force) {
      let wantModel = card.preferredModel || '';
      if (!wantModel && card.preferredCkpt) wantModel = modelKeyFromCkpt(card.preferredCkpt);
      if (!wantModel && defaultCkpt) wantModel = modelKeyFromCkpt(defaultCkpt);
      const mp = $('#modelPick');
      if (wantModel && mp && Array.prototype.some.call(mp.options, o => o.value === wantModel)) {
        if (state.model !== wantModel) {
          mp.value = wantModel;
          state.model = wantModel;
          try {
            const lab = mp.options[mp.selectedIndex] ? mp.options[mp.selectedIndex].textContent : wantModel;
            toast('已自动切换顶栏底模：' + lab);
          } catch (e) {}
        } else {
          mp.value = wantModel;
          state.model = wantModel;
        }
      }
    }
    if (loraSel && card.lora) {
      /* 用户手动选了「不使用」时，非 force 不强行改回；换卡 force 时优先填入角色自带 LoRA */
      if (force) {
        try { delete loraSel.dataset.userCleared; } catch (e) {}
      }
      if (loraSel.dataset.userCleared && !force) {
        /* 保持「仅底模」 */
      } else if (force || !loraSel.value) {
        if (Array.prototype.some.call(loraSel.options, o => o.value === card.lora)) {
          loraSel.value = card.lora;
        } else {
          const base = String(card.lora).replace(/\.safetensors$/i,'');
          const hit = Array.prototype.find.call(loraSel.options, o => o.value && o.value.indexOf(base) >= 0);
          if (hit) loraSel.value = hit.value;
        }
      }
    }
    if (strEl && card.loraStrength != null) {
      if (force || !strEl.dataset.userSet) strEl.value = String(card.loraStrength);
    }
  }

  const btnRefreshModels = $('#btnRefreshModels');
  if (btnRefreshModels) btnRefreshModels.addEventListener('click', () => refreshComfyModels());
  if (comfyUrlEl) comfyUrlEl.addEventListener('change', () => refreshComfyModels());
  setTimeout(refreshComfyModels, 400);

  const loraStrEl = $('#comfyLoraStr');
  if (loraStrEl) loraStrEl.addEventListener('change', () => { loraStrEl.dataset.userSet = '1'; });


  function comfyPrefixValue(){
    const el = $('#comfyPrefix');
    let v = (el && el.value || '').trim();
    if (!v) v = '1';
    return v;
  }
  function bumpComfyPrefix(n){
    const el = $('#comfyPrefix');
    if (!el) return;
    let steps = Math.max(1, n || 1);
    for (let s = 0; s < steps; s++){
      let v = (el.value || '').trim() || '1';
      if (/^\d+$/.test(v)) {
        el.value = String(parseInt(v, 10) + 1);
      } else {
        const m = v.match(/^(.*?)(\d+)$/);
        if (m) el.value = m[1] + String(parseInt(m[2], 10) + 1);
        else break;
      }
    }
    try { localStorage.setItem('randgen_comfy_prefix', el.value); } catch (e) {}
  }
  function comfySeedFields(){
    const mode = ($('#comfySeedMode') && $('#comfySeedMode').value) || 'randomize';
    let dMode = ($('#comfyDetailSeedMode') && $('#comfyDetailSeedMode').value) || 'same';
    if (dMode === 'same') dMode = mode;
    const seedRaw = ($('#comfySeed') && $('#comfySeed').value || '').trim();
    const dSeedRaw = ($('#comfyDetailSeed') && $('#comfyDetailSeed').value || '').trim();
    return {
      batch_size: parseInt(($('#comfyBatch') && $('#comfyBatch').value) || '1', 10) || 1,
      seed_mode: mode,
      seed: seedRaw === '' ? null : seedRaw,
      detailer_seed_mode: dMode,
      detailer_seed: dSeedRaw === '' ? null : dSeedRaw
    };
  }
  function comfyJobList(){
    const scope = ($('#comfyScope') && $('#comfyScope').value) || 'current';
    const basePrefix = comfyPrefixValue();
    if (scope === 'batch' && state.lastComfyBatch && state.lastComfyBatch.length){
      return state.lastComfyBatch.map((it, i) => {
        let prefix = basePrefix;
        /* 多组时编号顺延：纯数字或末段数字 + i */
        if (/^\d+$/.test(basePrefix)) prefix = String(parseInt(basePrefix, 10) + i);
        else {
          const m = basePrefix.match(/^(.*?)(\d+)$/);
          if (m) prefix = m[1] + String(parseInt(m[2], 10) + i);
          else prefix = basePrefix + '-' + (i + 1);
        }
        return {
          positive: (it.positive || (it.data && it.data.prompt) || '').trim(),
          negative: (it.negative || (it.data && it.data.negative) || '').trim(),
          prefix: prefix
        };
      }).filter(j => j.positive);
    }
    const pos = ($('#promptPos') && $('#promptPos').value || '').trim();
    const neg = ($('#promptNeg') && $('#promptNeg').value || '').trim();
    return pos ? [{ positive: pos, negative: neg, prefix: basePrefix }] : [];
  }
  function comfyModelFields(){
    const ckpt = ($('#comfyCkpt') && $('#comfyCkpt').value) || '';
    const lora = ($('#comfyLoraChar') && $('#comfyLoraChar').value) || '';
    const str = parseFloat(($('#comfyLoraStr') && $('#comfyLoraStr').value) || '0.85');
    const loras = [];
    if (lora) loras.push({ name: lora, strength_model: str, strength_clip: str });
    return {
      ckpt: ckpt,
      loras: loras,
      /* 空 = 明确不使用角色 LoRA，仅靠底模（模板里第一个 LoraLoader 强度置 0） */
      disable_char_lora: !lora
    };
  }
  function comfyPayload(extra){
    const url = (comfyUrlEl && comfyUrlEl.value.trim()) || 'http://127.0.0.1:8188';
    const jobs = comfyJobList();
    const first = jobs[0] || { positive: '', negative: '', prefix: comfyPrefixValue() };
    const tpls = (typeof selectedComfyTemplates === 'function')
      ? selectedComfyTemplates()
      : [((comfyTpl && comfyTpl.value) || 'base.json')];
    return Object.assign({
      positive: first.positive,
      negative: first.negative,
      url: url,
      prefix: first.prefix,
      template: tpls[0] || 'base.json',
      templates: tpls,
      jobs: jobs
    }, comfySeedFields(), comfyModelFields(), extra || {});
  }
  const btnComfy = $('#btnComfy');
  if (btnComfy) btnComfy.addEventListener('click', () => {
    const body = comfyPayload();
    if (!body.jobs || !body.jobs.length){ toast('先生成提示词再提交'); return; }
    if (location.protocol === 'file:'){
      toast('请用「启动生成器.bat」打开后再提交到 ComfyUI');
      return;
    }
    const status = $('#comfyStatus');
    if (status) status.textContent = '正在提交…';
    btnComfy.disabled = true;
    fetch('/__api/comfy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(r => r.json().then(j => ({ okHttp: r.ok, j: j }))).then(({ j }) => {
      if (j && j.ok){
        const n = j.ok_count || (j.results ? j.results.filter(function(r){ return r.ok; }).length : 1);
        const total = j.total || 1;
        const bs = j.batch_size || 1;
        let msg = '已入队 ' + n + '/' + total + ' 组';
        if (bs > 1) msg += (j.split ? ' · 已拆成 ' + total + ' 个任务' : ' · 每组 ' + bs + ' 张') + ' · 约 ' + total + ' 张';
        if (j.err) msg += '；部分失败: ' + j.err;
        if (status) status.textContent = msg;
        toast(msg);
        bumpComfyPrefix(n);
        try {
          const au = $('#comfyAutoUpscale');
          const sc = au ? parseInt(au.value, 10) : 0;
          if (sc > 0) {
            const ids = (j.results || []).filter(function(r){ return r && r.ok && r.prompt_id; }).map(function(r){ return r.prompt_id; });
            if (ids.length) {
              const url = (comfyUrlEl && comfyUrlEl.value.trim()) || 'http://127.0.0.1:8188';
              const strip = ($('#comfyUpscaleStrip') && $('#comfyUpscaleStrip').checked) ? '1' : '0';
              const payload = {
                type: 'upscale-job',
                scale: sc,
                prompt_ids: ids,
                url: url,
                strip: strip === '1',
                ts: Date.now()
              };
              let handed = false;
              if (typeof BroadcastChannel !== 'undefined') {
                const ch = new BroadcastChannel('randgen-upscale');
                const onMsg = function(ev) {
                  if (ev.data && ev.data.type === 'upscale-ack' && ev.data.ts === payload.ts) {
                    handed = true;
                    ch.removeEventListener('message', onMsg);
                  }
                };
                ch.addEventListener('message', onMsg);
                ch.postMessage(payload);
                setTimeout(function() {
                  ch.removeEventListener('message', onMsg);
                  if (!handed) {
                    const href = 'upscale.html?auto=1&scale=' + sc + '&prompt_ids=' + encodeURIComponent(ids.join(',')) + '&url=' + encodeURIComponent(url) + '&strip=' + strip;
                    window.open(href, 'randgen_upscale');
                  }
                  try { ch.close(); } catch (e2) {}
                }, 450);
              } else {
                const href = 'upscale.html?auto=1&scale=' + sc + '&prompt_ids=' + encodeURIComponent(ids.join(',')) + '&url=' + encodeURIComponent(url) + '&strip=' + strip;
                window.open(href, 'randgen_upscale');
              }
            }
          }
        } catch (e) {}
      } else {
        const err = (j && j.err) || '提交失败';
        if (status) status.textContent = err;
        toast(err);
      }
    }).catch(e => {
      const err = '提交失败：' + (e && e.message ? e.message : e);
      if (status) status.textContent = err;
      toast(err);
    }).then(() => { btnComfy.disabled = false; });
  });
  const btnComfyDl = $('#btnComfyDl');
  if (btnComfyDl) btnComfyDl.addEventListener('click', () => {
    const body = comfyPayload({ download_only: true });
    if (!body.jobs || !body.jobs.length){ toast('先生成提示词再下载'); return; }
    if (location.protocol === 'file:'){
      toast('请用「启动生成器.bat」打开后再下载工作流');
      return;
    }
    const status = $('#comfyStatus');
    if (status) status.textContent = '正在生成工作流文件…';
    btnComfyDl.disabled = true;
    fetch('/__api/comfy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(r => {
      if (!r.ok) return r.json().then(j => { throw new Error((j && j.err) || '下载失败'); });
      return r.text();
    }).then(text => {
      const blob = new Blob([text], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = comfyPrefixValue().replace(/[^\w\u4e00-\u9fff.-]+/g, '_') + '.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      if (status) status.textContent = '已下载 JSON，可在 ComfyUI 里 Load';
      toast('已下载工作流 JSON');
      bumpComfyPrefix();
    }).catch(e => {
      const err = e && e.message ? e.message : String(e);
      if (status) status.textContent = err;
      toast(err);
    }).then(() => { btnComfyDl.disabled = false; });
  });

  /* 侧栏折叠 + 顶栏跳转 */
  (function setupPanelUX(){
    /* 左右侧所有可折叠区块（含移到右侧的中文/仓库/生成） */
    document.querySelectorAll('.panel-title.panel-acc').forEach(title => {
      title.addEventListener('click', () => {
        const sec = title.closest('.panel-block');
        if (!sec) return;
        sec.classList.add('is-collapsible');
        sec.classList.toggle('is-open');
      });
    });
    const panel = document.querySelector('.panel');
    if (!panel) return;
    /* 默认：生成打开；其余按 is-open 类。标签/仓库默认收起已在 HTML 处理 */
    const prefixEl = $('#comfyPrefix');
    if (prefixEl){
      try {
        const s = localStorage.getItem('randgen_comfy_prefix');
        if (s) prefixEl.value = s;
      } catch (e) {}
      prefixEl.addEventListener('change', () => {
        try { localStorage.setItem('randgen_comfy_prefix', prefixEl.value.trim() || '1'); } catch (e) {}
      });
    }
    const plus = $('#comfyPrefixPlus');
    if (plus) plus.addEventListener('click', () => bumpComfyPrefix());

    const nav = $('#panelNav');
    if (nav) nav.querySelectorAll('.panel-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        nav.querySelectorAll('.panel-nav-btn').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        const id = btn.getAttribute('data-sec');
        const targets = panel.querySelectorAll('[data-nav="'+id+'"]');
        targets.forEach(t => t.classList.add('is-open'));
        const first = document.getElementById(id) || targets[0];
        if (first) first.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  })();

  $('#btnBatch').addEventListener('click', () => {
    /* 随机抽卡模式：批量 10 组每轮独立抽卡，组组不同角色；
       手动指定模式：整批用同一批卡（旧行为）。 */
    const fixed = state.pickRandom ? null : pickedCards();
    for (let i = 0; i < 10; i++){
      /* 逐轮重取 ctx（引擎会把 activeTags 等写回 ctx），
         并把已选角色卡套回结果 —— 否则批量会把选好的卡全部变随机。
         固定种子时逐轮 +i，10 组互不相同且各自可复现。 */
      const ctx = buildCtx();
      if (typeof ctx.seed === 'number') ctx.seed = ctx.seed + i;
      const res = generateAll(ctx);
      applyPickedCards(res, fixed || drawRandomCards(), ctx);
      res.seed = ctx.__seed;
      pushHistory(res);
    }
    state.current = state.history[0].data;
    renderAll();
    toast('已生成 10 组，存入历史' + (state.pickRandom ? '（随机抽卡：每批角色各不相同）' : ''));
  });

  $('#btnCopyPrompt').addEventListener('click', () => copyText($('#promptPos').value));
  $('#btnCopyNeg').addEventListener('click', () => copyText($('#promptNeg').value));

  /* token 超限自动裁剪开关（阶段一 1.4）：即改即存、立刻重渲染 */
  const atIn = $('#autoTrim');
  if (atIn){
    atIn.checked = autoTrimOn();
    atIn.addEventListener('change', function(e){
      setAutoTrim(e.target.checked);
      renderAll();
      toast(e.target.checked ? '已开启：超 225 时自动裁剪尾部' : '已关闭：保留完整提示词');
    });
  }

  /* 标签预设方案 */
  $('#btnTagPresetSave').addEventListener('click', saveTagPreset);
  renderTagPresets();

  /* 字段级重掷：面板内 🎲 用事件委托（面板内容随每次生成重建） */
  const fp = $('#fieldList');
  if (fp){
    fp.addEventListener('click', e => {
      const btn = e.target && e.target.closest ? e.target.closest('.fp-reroll') : null;
      if (btn) rerollOneField(btn);
    });
  }

  /* 导出格式扩展：Markdown / CSV / PNG 卡片 */
  $('#btnExportMd').addEventListener('click', exportMD);
  $('#btnExportCsv').addEventListener('click', exportCSV);
  $('#btnExportPng').addEventListener('click', exportPNG);

  /* 收藏当前结果 */
  $('#btnFav').addEventListener('click', () => {
    if (!state.current){ toast('先生成一组提示词'); return; }
    if (pushFav(state.current)) toast('已加入收藏');
  });

  /* 随机种子：即改即存；留空 = 每次随机 */
  const seedIn = $('#seedInput');
  if (seedIn){
    seedIn.value = state.seed || '';
    seedIn.addEventListener('input', e => {
      state.seed = e.target.value.trim();
      try { localStorage.setItem(LS_SEED, state.seed); } catch (err){}
    });
  }

  /* 自定义常驻负面词：即改即存，并立刻刷新当前 Negative 显示（不重新随机） */
  const cnegIn = $('#customNeg');
  if (cnegIn){
    cnegIn.value = customNegText();
    cnegIn.addEventListener('input', e => {
      try { localStorage.setItem(LS_CNEG, e.target.value); } catch (err){}
      if (state.current){
        state.current.negative = buildNegative(buildCtx());
        renderAll();
      }
    });
  }

  /* 仓库 */
  $$('#storeTabs .tab').forEach(t => {
    t.addEventListener('click', () => {
      $$('#storeTabs .tab').forEach(x => x.classList.remove('is-active'));
      t.classList.add('is-active');
      state.storeTab = t.dataset.store;
      renderStore();
    });
  });
  $('#btnExport').addEventListener('click', exportJSON);
  $('#btnExportTxt').addEventListener('click', exportTXT);
  $('#btnExportAll').addEventListener('click', exportAllStore);  const sfBtn = $('#btnSaveStoreFile');

  if (sfBtn) sfBtn.addEventListener('click', exportStoreJs);
  $('#btnImportStore').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', e => {
    const f = e.target.files && e.target.files[0];
    if (f) importStoreFile(f);
    e.target.value = '';
  });
  $('#btnClearStore').addEventListener('click', () => {
    if (state.storeTab === 'history'){ materializeFav(); state.history = []; } else state.fav = [];
    saveStore(); renderStore();
    toast('已清空');
  });

  /* ===== 底模 ===== */
  /* 场景自选 */
  renderScenePicks();
  const spClr = $('#scenePickClear');
  if (spClr) spClr.addEventListener('click', () => {
    Object.keys(state.scenePick).forEach(k => { state.scenePick[k] = null; });
    renderScenePicks();
    toast('已清空场景自选');
  });

  /* 体型自选（Q版 → 成人大体型 + 权重） */
  renderBodySizePicks();
  const bpClr = $('#bodyPickClear');
  if (bpClr) bpClr.addEventListener('click', () => {
    state.bodyPick = null;
    renderBodySizePicks();
    toast('已清空体型锁定');
  });

  $('#modelPick').addEventListener('change', e => {
    state.model = e.target.value;
    /* 若该底模预设带具体 ckpt 文件名，尝试同步到 Comfy 底模下拉 */
    try {
      const M = (typeof MODEL_PRESETS !== 'undefined') && MODEL_PRESETS[state.model];
      const ckptSel = $('#comfyCkpt');
      if (M && M.ckpt && ckptSel) {
        if (Array.prototype.some.call(ckptSel.options, o => o.value === M.ckpt)) {
          ckptSel.value = M.ckpt;
        } else {
          const base = String(M.ckpt).replace(/\.safetensors$/i,'');
          const hit = Array.prototype.find.call(ckptSel.options, o => o.value && o.value.indexOf(base) >= 0);
          if (hit) ckptSel.value = hit.value;
        }
      }
    } catch (err) {}
    doGenerate();          /* 让已生成的提示词立刻换成新底模的写法 */
  });
}

/* =========================================================
   预设卡的轻量支持（角色库已独立成项目，这里只保留生成器需要的部分）
   ========================================================= */

/* 内置预设 → 统一卡结构（与独立项目同构，便于互相搬运 JSON） */
let PRESET_CARDS = [];
function buildPresetCards(){
  PRESET_CARDS = PRESET_CHARS.map(presetToCard);
}

/* 把卡伪装成角色对象，供提示词拼装与情境文本使用。
   meta.name 是显示名（可能中英混排，给中文正文用），
   meta.nameEn 是英文 tag 名（给英文提示词行用）—— 两者不能混。 */
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
    meta: { name: card.name, nameEn: cardNameEn(card), world: world || 'modern' }
  };
}

/* =========================================================
   自建角色卡（localStorage: randgen_chars）
   与 role-studio 的字段完全同构，JSON 可以互相搬运
   ========================================================= */

/* 读自建卡；预设不落盘，每次从 PRESET_CHARS 生成 */
function loadMyCards(){
  let arr = [];
  try { arr = JSON.parse(localStorage.getItem(LS_CHARS) || '[]'); } catch (e){ arr = []; }
  if (!Array.isArray(arr)) arr = [];
  return arr.map(it => ({
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
  }));
}

function saveCharLib(){
  try { localStorage.setItem(LS_CHARS, JSON.stringify(state.charLib)); } catch (e){}
}

/* 新建一张自建卡 */
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
  return item;
}

function deleteCard(it){
  const i = state.charLib.indexOf(it);
  if (i >= 0) state.charLib.splice(i, 1);
  const pi = state.pickIds.indexOf(it.id);
  if (pi >= 0) state.pickIds.splice(pi, 1);
  saveCharLib();
  syncGenderFromPick();
  renderPick();
  doGenerate(false);
  toast('已删除「' + (it.name || '未命名') + '」');
}

/* 把一张卡（通常是预设卡）复制一份进我的卡库，之后可以随便改
   预设卡是只读的，想改外观只能先「存」下来 —— 这是自建卡的第二个入口 */
function saveToLib(it){
  if (!it) return null;
  if (it.src === 'mine'){ toast('这已经是自建卡了，直接点「改」'); return it; }

  /* 判重：显示名 + 基础提示词都一样，就认为存过了，不再堆重复卡 */
  const dup = state.charLib.find(c =>
    (c.name || '') === (it.name || '') && (c.base || '') === (it.base || ''));
  if (dup){
    toast('「' + (it.name || '未命名') + '」已经在卡库里了');
    if (state.pickIds.indexOf(dup.id) < 0 && state.pickIds.length < 4) state.pickIds.push(dup.id);
    state.pickSrc = 'mine';
    syncGenderFromPick();
    renderPick();
    doGenerate(false);
    return dup;
  }

  const fresh = addCard({
    name: it.name,
    nameEn: it.nameEn || (typeof cardNameEn === 'function' ? cardNameEn(it) : ''),
    gender: it.gender,
    ip: it.ip || '',
    core: it.core || '',
    outfit: it.outfit || '',
    base: it.base || '',
    note: it.note || ''
  });
  /* 存完直接选中，并切到「自建」筛选，让用户看到结果 */
  if (state.pickIds.length < 4) state.pickIds.push(fresh.id);
  state.pickSrc = 'mine';
  syncGenderFromPick();
  renderPick();
  doGenerate(false);
  toast('已存入我的卡库：' + (fresh.name || '未命名'));
  return fresh;
}

/* 规范化基础提示词：全角逗号统一成半角，去掉空标签 */
function normBase(s){
  return String(s || '')
    .replace(/[，、；;]/g, ',')
    .replace(/\s+/g, ' ')
    .split(',')
    .map(x => x.trim())
    .filter(Boolean)
    .join(', ');
}

/* ---------- 人物卡编辑弹窗 ---------- */
function openCharModal(item){
  const m = $('#charModal');
  if (!m) return;
  state.editing = item || null;
  $('#modalTitle').textContent = item ? '编辑角色卡' : '新建角色卡';
  $('#edName').value   = item ? (item.name || '') : '';
  $('#edNameEn').value = item ? (item.nameEn || '') : '';
  $('#edIp').value     = item ? (item.ip || '') : '';
  $('#edGender').value = item ? (item.gender || 'female') : 'female';
  /* 卡有独立 outfit（预设卡复制来的 / 编辑器里填过默认服饰）时，
     基础提示词框只回填外貌（core），服饰回填到「默认服饰」框；
     老卡（服饰混在 base 里）维持整条回填，行为不变 */
  $('#edBase').value   = item ? (item.core || item.base || '') : '';
  $('#edOutfit').value = item ? (item.outfit || '') : '';
  $('#edNote').value   = item ? (item.note || '') : '';
  /* 「删除」只在编辑已有自建卡时出现 */
  const del = $('#edDelete');
  if (del) del.hidden = !item;
  m.hidden = false;
  setTimeout(() => $('#edName').focus(), 30);
}

function closeCharModal(){
  const m = $('#charModal');
  if (m) m.hidden = true;
  state.editing = null;
}

function saveFromEditor(){
  const nameEn = $('#edNameEn').value.trim();
  const name = $('#edName').value.trim() || nameEn || '未命名';
  const gender = $('#edGender').value;
  const ip = $('#edIp').value.trim();
  const base = normBase($('#edBase').value);
  /* 默认服饰（2026-10-09 新增）：填了就与预设卡同构 ——
     core = 外貌（基础提示词框），outfit = 服饰，base = 二者拼接。
     好处：生成时默认穿这一套；全裸 / 随机换装时引擎整段剥掉，不会出现
     「completely nude」和「白衬衫」并存。留空则维持老格式（服饰混在 base 里）。 */
  const outfit = normBase($('#edOutfit').value);
  const core = outfit ? base : '';
  const fullBase = outfit ? normBase(base + ', ' + outfit) : base;
  const note = $('#edNote').value.trim();

  if (!base){ toast('基础提示词不能为空'); $('#edBase').focus(); return; }

  try {
    if (state.editing){
      Object.assign(state.editing, { name: name, nameEn: nameEn, gender: gender, ip: ip, core: core, outfit: outfit, base: fullBase, note: note, ts: Date.now() });
      saveCharLib();
      toast('已保存');
    } else {
      const it = addCard({ name: name, nameEn: nameEn, gender: gender, ip: ip, core: core, outfit: outfit, base: fullBase, note: note });
      /* 新建后直接选中（不超过 4 个的上限） */
      if (state.pickIds.length < 4) state.pickIds.push(it.id);
      syncGenderFromPick();
      toast('已新建并选中');
    }
  } finally {
    closeCharModal();
    renderPick();
    doGenerate(false);
  }
}

/* 「随机生成一套」：抽一版外貌 + 默认服饰填进编辑器，省得手写。
   引擎已把服饰单独拆出（genBasePrompt → outfit），正好分别落进两个框 */
function fillRandomBase(){
  const g = $('#edGender').value;
  const ctx = Object.assign(buildCtx(), { actors: 1, gender: g });
  const r = genBasePrompt(ctx, g);
  $('#edBase').value = r.base;
  $('#edOutfit').value = r.outfit || '';
  if (!$('#edNote').value.trim()) $('#edNote').value = r.note;
}

/* ---------- 随机整卡（2026-10-09「增加一个随机角色卡生成」）----------
   一键生成一个原创角色：中英名 / 性别 / 外貌 / 服饰 / 备注一次填好。
   名字从字库里随机拼（中文名字库与英文名库各自独立取名，
   避开预设卡用过的知名角色名），外貌 / 服饰复用引擎 genBasePrompt，
   core 用 (original character) 标明原创身份。再点一次 = 重抽。 */
const OC_ZH_SURNAME = ['苏','林','沈','顾','白','江','洛','温','秦','楚','姜','叶','云','宋','祁','阮','穆','池','凌','席'];
const OC_ZH_GIVEN_F = ['语汐','芷晴','疏影','念安','南絮','星阑','未晞','清菡','映真','暮雪','青梧','檀雨','雾枝','雀笙','柳眠','棠梨','阑夜','霜华','素商','云杪','绯樱','枕流','静好','初霁'];
const OC_ZH_GIVEN_M = ['墨渊','承影','听澜','砚秋','青崖','长歌','叙白','折竹','临渊','朗月','晏清','行舟','暮山','疏桐','既明','望舒'];
const OC_EN_F = ['Mira','Lyra','Elsie','Nona','Sable','Iris','Vera','Wren','Sera','Noelle','Cassia','Mabel','Odette','Sylvie','Fina','Liesel'];
const OC_EN_M = ['Kael','Rowan','Silas','Ansel','Cyril','Dorian','Edric','Jasper','Milo','Nero','Corin','Aldric'];
const OC_EN_LAST = ['Ashford','Vale','Hartley','Winters','Mercer','Lyle','Cross','Faye'];

function randomOCName(gender){
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const fem = gender !== 'male';
  const zh = pick(OC_ZH_SURNAME) + pick(fem ? OC_ZH_GIVEN_F : OC_ZH_GIVEN_M);
  let en = pick(fem ? OC_EN_F : OC_EN_M);
  if (Math.random() < 0.5) en += ' ' + pick(OC_EN_LAST);
  return { zh: zh, en: en };
}

function fillRandomCard(){
  /* 性别偏女性向：女 70% / 男 15% / 扶她 15%（与生成器主基调一致） */
  const dice = Math.random();
  const g = dice < 0.70 ? 'female' : dice < 0.85 ? 'male' : 'futa';
  const ctx = Object.assign(buildCtx(), { actors: 1, gender: g });
  const r = genBasePrompt(ctx, g);
  const core = g === 'male' ? '(original character), 1boy' : '(original character), 1girl';
  const nm = randomOCName(g);
  $('#edName').value = nm.zh + ' ' + nm.en;
  $('#edNameEn').value = nm.en;
  $('#edIp').value = '原创';
  $('#edGender').value = g;
  /* genBasePrompt 的 base 以 1girl/1boy 开头，core 里已带，剥掉避免连续重复 */
  const body = r.base.replace(/^1(girl|boy)\s*,\s*/i, '');
  $('#edBase').value = core + ', ' + body;
  $('#edOutfit').value = r.outfit || '';
  $('#edNote').value = nm.zh + '（原创）· ' + r.note;
  toast('已生成原创角色「' + nm.zh + ' ' + nm.en + '」，满意就点保存');
}

/* 「衣着状态」四值判定（旧存档里状态值曾写在 outfitPick 里，用于迁移） */
function isOutfitStateValue(v){
  return v === OUTFIT_NUDE || v === OUTFIT_HALF || v === OUTFIT_TOPLESS || v === OUTFIT_NORMAL || v === OUTFIT_TORN;
}

/* 服饰板块 = 两个选择器（2026-10-09 轮次 L 从单个下拉拆开）：
     #outfitState —— 衣着状态：'' 默认（随机状态）/ 正常着衣 / 半脱 / 露胸 / 全裸
                    （半脱 / 露胸 / 全裸 夜灯限定）
     #outfitPick  —— 具 体 服 装：'' 默认（角色原设服装）/ 随机换装 / 成套服饰
                    （夜灯亮时再挂成人向成衣柜）
   两者可同时选（例：露胸 + 兔女郎装）；全裸与服装互斥（引擎里全裸优先）。
   选项随模式重建，所以切夜灯 / 回清水时会自动增删状态项与成人向那一组；
   当前选中项在新模式下不存在时（例如清水下不该有的「全裸」），回落到默认。 */
function fillOutfitOptions(){
  const nsfw = (state.mode === 'nsfw');

  /* 旧存档 / 旧调用兼容：状态值以前存在 outfitPick 里 → 搬到 outfitState，outfitPick 归 '' */
  if (isOutfitStateValue(state.outfitPick)){
    if (!state.outfitState) state.outfitState = state.outfitPick;
    state.outfitPick = '';
  }

  /* ① 衣着状态 */
  const stSel = $('#outfitState');
  if (stSel){
    const keepSt = stSel.value || state.outfitState;
    const stOpts = [
      { v: '',              t: '默认（随机状态）' },
      { v: OUTFIT_NORMAL,   t: '正常着衣' },
      { v: OUTFIT_TORN,     t: '破损' },
      { v: OUTFIT_HALF,     t: '半脱', night: true },
      { v: OUTFIT_TOPLESS,  t: '露胸', night: true },
      { v: OUTFIT_NUDE,     t: '全裸', night: true }
    ];
    const usableSt = stOpts.filter(o => !(o.night && !nsfw));
    stSel.innerHTML = usableSt
      .map(o => '<option value="' + esc(o.v) + '">' + esc(o.t) + '</option>').join('');
    /* 纯值比较，桩环境里也成立（不依赖 DOM 的 selectedIndex） */
    state.outfitState = usableSt.some(o => o.v === keepSt) ? keepSt : '';
    stSel.value = state.outfitState;
  }

  /* ② 具体服装 */
  const sel = $('#outfitPick');
  if (sel){
    const keep = sel.value || state.outfitPick;
    const opts = [
      { group: '',  v: '',              t: '默认（角色原设服装）' },
      { group: '',  v: OUTFIT_RANDOM,   t: '随机换装（另抽一套）' }
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

  const hint = $('#outfitHint');
  if (hint) hint.textContent = nsfw
    ? '状态与服装可同时选（例：露胸 + 兔女郎装）；不选 = 随机；「半脱 / 露胸 / 全裸」需先点亮夜灯'
    : '不选 = 随机（角色原设或随机配装）；「半脱 / 露胸 / 全裸」需先点亮夜灯';
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
  buildPresetCards();          /* 内置预设 → 生成器的选择器用 */
  state.charLib = loadMyCards(); /* 自建角色卡（localStorage） */
  fillOutfitOptions();
  buildArtistList();           /* 画师库（来自 data-library.js） */

  /* 种子偏好与标签预设方案（localStorage 持久化） */
  try { state.seed = localStorage.getItem(LS_SEED) || ''; } catch (e){}
  state.tagPresets = loadTagPresets();

  /* 默认清水：先按 SFW 起，再读解锁状态；已解锁则直接点亮 */
  state.mode = 'sfw';
  renderTagChips();
  renderThemeChips();
  bind();
  /* 人数以界面选择器的默认项为准（HTML 第一项 = 1 人）。
     初始化时显式读一次，防止 state 与 DOM 两端默认值走偏。 */
  const amSel0 = $('#actorsM'), afSel0 = $('#actorsF');
  if (amSel0){
    const m = parseInt(amSel0.value, 10);
    if (!isNaN(m) && m >= 0) state.actorsM = m;
  }
  if (afSel0){
    const f = parseInt(afSel0.value, 10);
    if (!isNaN(f) && f >= 0) state.actorsF = f;
  }
  state.actors = Math.max(1, state.actorsM + state.actorsF);
  loadStore();
  loadUnlock();
  /* 换环境零点击：本机第一次打开 + 随包存档文件有内容 → 直接接管 */

  if (storeIsEmpty()) adoptFileStore();

  if (state.unlocked) state.mode = 'nsfw';

  renderStore();
  renderPick();
  renderArtist();

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
  annotateEnv();  annotateFileStore();
  renderPick();
  renderArtist();
  doGenerate(false);
}

document.addEventListener('DOMContentLoaded', init);
