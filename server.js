#!/usr/bin/env node
/* =========================================================================
   server.js —— 零依赖本地服务器（只用 Node 内置模块，不需要 npm install）
   -------------------------------------------------------------------------
   用途：不想双击 index.html 时用它启动。相比 file:// 多两件事：

     1. 地址是 http://localhost:8777，存档存在「localhost 端口」这一格；
     2. 存档会自动落到 存档/store.js —— 不用再手动点「写回存档文件」。

   自动落盘的实现：返回 HTML 时往 </body> 前插一行
   <script src="/server-mode.js"></script>。
   源码里的 index.html 保持零 fetch，「双击即用」守护脚本继续全绿；
   只有在 http 模式下才注入这段增强代码。

   用法：
     node server.js            # 默认 8777，端口被占自动 +1
     node server.js 9000       # 指定端口
     PORT=9000 node server.js
     RG_NO_BROWSER=1 node server.js 9000   # 只起服务，不自动开浏览器
   ========================================================================= */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = __dirname;
const STORE_JS = path.join(ROOT, '存档', 'store.js');
const MODE_JS = path.join(ROOT, 'server-mode.js');
const LLM_CFG = path.join(ROOT, 'config', 'llm.json');
const DEFAULT_LLM = { base_url: 'https://api.deepseek.com', api_key: '', model: 'deepseek-chat', enabled: false };

function readLlmConfig(){
  try {
    const o = JSON.parse(fs.readFileSync(LLM_CFG, 'utf8'));
    return Object.assign({}, DEFAULT_LLM, o || {});
  } catch (e) {
    return Object.assign({}, DEFAULT_LLM);
  }
}
function writeLlmConfig(obj){
  const dir = path.dirname(LLM_CFG);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const next = Object.assign({}, DEFAULT_LLM, obj || {});
  /* 不把空 key 误清成 undefined */
  if (typeof next.api_key !== 'string') next.api_key = '';
  fs.writeFileSync(LLM_CFG, JSON.stringify(next, null, 2), 'utf8');
  return next;
}



const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.zip': 'application/zip',
  '.pth': 'application/octet-stream',
};

/* ---------- 图片放大（Real-ESRGAN + ComfyUI） ---------- */
const UPSCALE_DIR = path.join(ROOT, 'models', 'upscale_models');
const UPSCALE_OUT_DEFAULT = path.join(ROOT, 'upscale-output');
const UPSCALE_HIST = path.join(ROOT, 'config', 'upscale-history.json');
const UPSCALE_CFG = path.join(ROOT, 'config', 'upscale.json');

function readUpscaleCfg(){
  try {
    return Object.assign({ output_dir: 'upscale-output' }, JSON.parse(fs.readFileSync(UPSCALE_CFG, 'utf8')) || {});
  } catch (e) {
    return { output_dir: 'upscale-output' };
  }
}
function writeUpscaleCfg(obj){
  ensureDir(path.dirname(UPSCALE_CFG));
  const cur = readUpscaleCfg();
  const next = Object.assign({}, cur, obj || {});
  fs.writeFileSync(UPSCALE_CFG, JSON.stringify(next, null, 2), 'utf8');
  return next;
}
function getUpscaleOutDir(){
  const cfg = readUpscaleCfg();
  let d = String(cfg.output_dir || 'upscale-output').trim() || 'upscale-output';
  if (!path.isAbsolute(d)) d = path.join(ROOT, d);
  d = path.resolve(d);
  ensureDir(d);
  return d;
}

const UPSCALE_MODELS = [
  {
    name: 'RealESRGAN_x2plus.pth',
    url: 'https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.1/RealESRGAN_x2plus.pth'
  },
  {
    name: 'RealESRGAN_x4plus.pth',
    url: 'https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth'
  }
];

function ensureDir(p){
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function candidateComfyUpscaleDirs(){
  const home = process.env.USERPROFILE || process.env.HOME || '';
  const list = [
    path.join(ROOT, '..', 'ComfyUI', 'models', 'upscale_models'),
    path.join(ROOT, '..', '..', 'ComfyUI', 'models', 'upscale_models'),
    path.join(home, 'ComfyUI', 'models', 'upscale_models'),
    path.join(home, 'Documents', 'ComfyUI', 'models', 'upscale_models'),
    path.join('C:\\', 'ComfyUI', 'models', 'upscale_models'),
    path.join('D:\\', 'ComfyUI', 'models', 'upscale_models')
  ];
  return list.filter((p, i, a) => a.indexOf(p) === i);
}

function findExistingModel(name){
  ensureDir(UPSCALE_DIR);
  const primary = path.join(UPSCALE_DIR, name);
  if (fs.existsSync(primary) && fs.statSync(primary).size > 1000000) return primary;
  for (const d of candidateComfyUpscaleDirs()) {
    try {
      const p = path.join(d, name);
      if (fs.existsSync(p) && fs.statSync(p).size > 1000000) return p;
    } catch (e) {}
  }
  return null;
}

function downloadFile(url, dest){
  return new Promise((resolve, reject) => {
    ensureDir(path.dirname(dest));
    const tmp = dest + '.part';
    const lib = url.startsWith('https') ? require('https') : http;
    const file = fs.createWriteStream(tmp);
    const req = lib.get(url, { headers: { 'User-Agent': 'RANDOM-GEN-Upscale/1.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        try { fs.unlinkSync(tmp); } catch (e) {}
        return downloadFile(res.headers.location, dest).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        try { fs.unlinkSync(tmp); } catch (e) {}
        reject(new Error('下载失败 HTTP ' + res.statusCode));
        res.resume();
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          try {
            fs.renameSync(tmp, dest);
            resolve(dest);
          } catch (e) { reject(e); }
        });
      });
    });
    req.on('error', e => {
      try { fs.unlinkSync(tmp); } catch (e2) {}
      reject(e);
    });
  });
}

async function ensureUpscaleModels(doDownload){
  ensureDir(UPSCALE_DIR);
  const models = [];
  const missing = [];
  for (const m of UPSCALE_MODELS) {
    const found = findExistingModel(m.name);
    models.push({ name: m.name, exists: !!found, path: found || path.join(UPSCALE_DIR, m.name) });
    if (!found) missing.push(m);
  }
  if (!doDownload || !missing.length) {
    return {
      ok: true,
      ready: missing.length === 0,
      downloading: false,
      models,
      dir: UPSCALE_DIR,
      message: missing.length ? ('缺失：' + missing.map(x => x.name).join(', ')) : '全部就绪'
    };
  }
  const notes = [];
  for (const m of missing) {
    const dest = path.join(UPSCALE_DIR, m.name);
    notes.push('下载 ' + m.name + ' …');
    await downloadFile(m.url, dest);
    /* 尝试复制到常见 ComfyUI 目录 */
    for (const d of candidateComfyUpscaleDirs()) {
      try {
        if (fs.existsSync(path.dirname(d)) || fs.existsSync(path.dirname(path.dirname(d)))) {
          ensureDir(d);
          const target = path.join(d, m.name);
          if (!fs.existsSync(target)) fs.copyFileSync(dest, target);
          notes.push('已同步 → ' + target);
          break;
        }
      } catch (e) {}
    }
  }
  const models2 = UPSCALE_MODELS.map(m => {
    const found = findExistingModel(m.name);
    return { name: m.name, exists: !!found, path: found || path.join(UPSCALE_DIR, m.name) };
  });
  return {
    ok: true,
    ready: models2.every(x => x.exists),
    downloading: false,
    models: models2,
    dir: UPSCALE_DIR,
    message: notes.join('\n')
  };
}


function readUpscaleHist(){
  try {
    const o = JSON.parse(fs.readFileSync(UPSCALE_HIST, 'utf8'));
    return Array.isArray(o.items) ? o : { items: [] };
  } catch (e) { return { items: [] }; }
}
function writeUpscaleHist(o){
  ensureDir(path.dirname(UPSCALE_HIST));
  fs.writeFileSync(UPSCALE_HIST, JSON.stringify(o, null, 2), 'utf8');
}
function addUpscaleHistItem(item){
  const o = readUpscaleHist();
  o.items = [item].concat(o.items || []).slice(0, 100);
  writeUpscaleHist(o);
  return item;
}
function deleteUpscaleHist(id, removeFile){
  const o = readUpscaleHist();
  const hit = (o.items || []).find(x => x.id === id);
  o.items = (o.items || []).filter(x => x.id !== id);
  writeUpscaleHist(o);
  if (removeFile && hit && hit.file) {
    try { fs.unlinkSync(path.join(getUpscaleOutDir(), path.basename(hit.file))); } catch (e) {}
  }
  return true;
}
function clearUpscaleHist(removeFile){
  const o = readUpscaleHist();
  if (removeFile) {
    (o.items || []).forEach(hit => {
      if (hit.file) try { fs.unlinkSync(path.join(getUpscaleOutDir(), path.basename(hit.file))); } catch (e) {}
    });
  }
  writeUpscaleHist({ items: [] });
}

function parseDataUrl(dataUrl){
  const m = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
  if (!m) throw new Error('图片 data URL 无效');
  return { mime: m[1], buffer: Buffer.from(m[2], 'base64') };
}

function uploadImageToComfy(origin, filename, buffer, mime){
  return new Promise((resolve, reject) => {
    const u = new URL(origin);
    const boundary = '----RGUpscale' + Date.now();
    const head = Buffer.from(
      '--' + boundary + '\r\n' +
      'Content-Disposition: form-data; name="image"; filename="' + filename.replace(/"/g, '') + '"\r\n' +
      'Content-Type: ' + (mime || 'image/png') + '\r\n\r\n'
    );
    const mid = Buffer.from(
      '\r\n--' + boundary + '\r\n' +
      'Content-Disposition: form-data; name="overwrite"\r\n\r\ntrue' +
      '\r\n--' + boundary + '--\r\n'
    );
    const body = Buffer.concat([head, buffer, mid]);
    const lib = u.protocol === 'https:' ? require('https') : http;
    const req = lib.request({
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: '/upload/image',
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Content-Length': body.length
      }
    }, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(buf);
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(j);
          else reject(new Error((j && (j.error || j.message)) || buf || ('HTTP ' + res.statusCode)));
        } catch (e) {
          reject(new Error(buf || e.message));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function buildUpscaleApiWorkflow(imageName, scale){
  /* ComfyUI API format
     2×：用 x4 模型放大后再 ImageScaleBy 0.5（很多环境没有 x2 模型，x4 更通用）
     4×：x4 一次
     6×：x4 一次再 ×1.5
     8×：x4 两次
  */
  const s = parseInt(scale, 10) || 4;
  const model4 = 'RealESRGAN_x4plus.pth';
  const api = {
    '1': {
      class_type: 'LoadImage',
      inputs: { image: imageName }
    }
  };
  let lastImage = ['1', 0];
  let nid = 2;

  function addUpscale(modelName){
    const loaderId = String(nid++);
    const upId = String(nid++);
    api[loaderId] = {
      class_type: 'UpscaleModelLoader',
      inputs: { model_name: modelName }
    };
    api[upId] = {
      class_type: 'ImageUpscaleWithModel',
      inputs: {
        upscale_model: [loaderId, 0],
        image: lastImage
      }
    };
    lastImage = [upId, 0];
  }
  function addScaleBy(factor){
    const scaleId = String(nid++);
    api[scaleId] = {
      class_type: 'ImageScaleBy',
      inputs: {
        image: lastImage,
        upscale_method: 'lanczos',
        scale_by: factor
      }
    };
    lastImage = [scaleId, 0];
  }

  if (s <= 2) {
    addUpscale(model4);
    addScaleBy(0.5);
  } else if (s <= 4) {
    addUpscale(model4);
  } else if (s <= 6) {
    addUpscale(model4);
    addScaleBy(1.5);
  } else {
    addUpscale(model4);
    addUpscale(model4);
  }

  const saveId = String(nid++);
  api[saveId] = {
    class_type: 'SaveImage',
    inputs: {
      images: lastImage,
      filename_prefix: 'RG_upscale_' + s + 'x'
    }
  };
  return api;
}


function readStore() {
  try {
    const s = fs.readFileSync(STORE_JS, 'utf8');
    const i = s.indexOf('window.__RG_STORE__');
    if (i < 0) return null;
    const eq = s.indexOf('=', i);
    let end = s.indexOf(';', eq);
    if (end < 0) end = s.length;
    return JSON.parse(s.slice(eq + 1, end).trim());
  } catch (e) {
    return null;
  }
}

function writeStore(obj) {
  const ts = Date.now();
  const d = new Date(ts), p = n => String(n).padStart(2, '0');
  const stamp = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
    + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  const head = '/* =========================================================================\n'
    + '   存档/store.js —— 随包走的存档文件（双击 HTML 也会自动读取）\n'
    + '   -------------------------------------------------------------------------\n'
    + '   这个文件是存档的「唯一真相源」：换电脑时整个文件夹一起拷走即可，\n'
    + '   不用在浏览器里导出 / 导入。\n'
    + '\n'
    + '   它是 .js 而不是 .json —— 因为 file:// 下浏览器禁止 fetch 读本地文件，\n'
    + '   但普通 <script src> 可以加载，所以存档以脚本形式随包走。\n'
    + '\n'
    + '   用法：\n'
    + '     · 换到新环境：整个文件夹拷过去，双击 index.html，存档自动载入。\n'
    + '     · 把当前存档写回文件：仓库区点「写回存档文件」，下载得到 store.js，\n'
    + '       拖进 存档/ 覆盖同名文件即可。\n'
    + '     · 用本地服务器启动（启动生成器.bat）时，这一步是自动的。\n'
    + '\n'
    + '   自动生成文件，内容勿手改；结构由 app.js 的 exportStoreJs() 产出。\n'
    + '   最后写入：' + stamp + '\n'
    + '   ========================================================================= */\n';
  const body = 'window.__RG_STORE__ = ' + JSON.stringify(obj, null, 2) + ';\n';
  /* 写临时文件再替换，避免写一半崩掉把存档毁了 */
  const tmp = STORE_JS + '.tmp';
  fs.writeFileSync(tmp, (head + body).replace(/\n/g, '\r\n'), 'utf8');
  fs.renameSync(tmp, STORE_JS);
  return true;
}

const EMPTY = { v: 1, app: 'randgen', ts: 0, history: [], fav: [], chars: [], unlock: '0', cneg: '', seed: '', tagPresets: [] };

function sizeOf(o) {
  if (!o || typeof o !== 'object') return 0;
  return (o.history || []).length + (o.fav || []).length + (o.chars || []).length;
}

function listTemplates(){
  const dir = path.join(ROOT, 'comfy-templates');
  let names = [];
  try {
    names = fs.readdirSync(dir).filter(n => n.toLowerCase().endsWith('.json'));
  } catch (e) { names = []; }
  const rank = n => {
    if (n === 'base.json') return '0';
    if (n === 'simple.json') return '1';
    if (n.indexOf('竖屏') === 0) return '2' + n;
    if (n.indexOf('横屏') === 0) return '3' + n;
    if (n.indexOf('方图') === 0) return '4' + n;
    return '9' + n;
  };
  names.sort((a, b) => rank(a).localeCompare(rank(b), 'zh'));
  return names;
}

function templatePath(name){
  const base = path.basename(String(name || 'base.json'));
  if (!/^[A-Za-z0-9._\-\u4e00-\u9fff ()]+\.json$/.test(base)) throw new Error('模板文件名不合法');
  const abs = path.join(ROOT, 'comfy-templates', base);
  if (!abs.startsWith(path.join(ROOT, 'comfy-templates'))) throw new Error('模板路径不合法');
  if (!fs.existsSync(abs)) throw new Error('找不到模板 ' + base);
  return abs;
}

/* 在 UI 工作流里定位正/负 CLIP 节点（跟 KSampler 的 positive/negative 连线）。 */
function findPosNegNodeIds(graph){
  const byId = {};
  (graph.nodes || []).forEach(n => { byId[n.id] = n; });
  let posId = null, negId = null;
  (graph.links || []).forEach(l => {
    /* links: [id, fromId, fromSlot, toId, toSlot, type] */
    const to = byId[l[3]];
    if (!to || to.type !== 'KSampler') return;
    const inp = (to.inputs || [])[l[4]];
    if (!inp) return;
    if (inp.name === 'positive') posId = l[1];
    if (inp.name === 'negative') negId = l[1];
  });
  return { posId, negId };
}

/* 把正负词 / 种子 / 前缀写进 UI 工作流（可 Load 进工作台的那种）。 */
function setWidget(n, key, value, indexHint){
  const named = Object.assign({}, n.widgets_values_named || {});
  named[key] = value;
  n.widgets_values_named = named;
  if (Array.isArray(n.widgets_values) && indexHint != null && indexHint < n.widgets_values.length) {
    n.widgets_values[indexHint] = value;
  }
}

function fillUiWorkflow(graph, positive, negative, opts){
  const g = JSON.parse(JSON.stringify(graph));
  const { posId, negId } = findPosNegNodeIds(g);
  if (posId == null) throw new Error('模板里找不到正面提示词节点');
  if (negId == null) throw new Error('模板里找不到负面提示词节点');
  const prefix = opts.prefix || '1';
  const batch = Math.max(1, Math.min(16, parseInt(opts.batch_size, 10) || 1));
  const seedMode = opts.seed_mode || 'randomize';
  const dMode = opts.detailer_seed_mode || seedMode;
  const seed = opts.seed;
  const dSeed = (opts.detailer_seed != null ? opts.detailer_seed : seed);
  const ckpt = opts.ckpt || opts.checkpoint || '';
  const loraList = Array.isArray(opts.loras) ? opts.loras : [];
  const disableCharLora = !!opts.disable_char_lora;
  let loraSlot = 0;
  (g.nodes || []).forEach(n => {
    if (n.type === 'CheckpointLoaderSimple' && ckpt) {
      setWidget(n, 'ckpt_name', ckpt, 0);
    }
    if (n.type === 'LoraLoader') {
      /* 第一个 LoraLoader 视为角色 LoRA 槽：可关闭为仅底模 */
      if (loraSlot === 0 && disableCharLora && !loraList.length) {
        setWidget(n, 'strength_model', 0, 1);
        setWidget(n, 'strength_clip', 0, 2);
        loraSlot++;
      } else if (loraSlot < loraList.length) {
        const L = loraList[loraSlot++];
        if (L && L.name) {
          const sm = L.strength_model != null ? Number(L.strength_model) : 1;
          const sc = L.strength_clip != null ? Number(L.strength_clip) : sm;
          setWidget(n, 'lora_name', L.name, 0);
          setWidget(n, 'strength_model', sm, 1);
          setWidget(n, 'strength_clip', sc, 2);
        }
      } else {
        loraSlot++;
      }
    }

    if (n.id === posId && n.type === 'CLIPTextEncode') {
      n.widgets_values = [positive];
      n.widgets_values_named = Object.assign({}, n.widgets_values_named || {}, { text: positive });
    }
    if (n.id === negId && n.type === 'CLIPTextEncode') {
      n.widgets_values = [negative];
      n.widgets_values_named = Object.assign({}, n.widgets_values_named || {}, { text: negative });
    }
    if (n.type === 'EmptyLatentImage') {
      setWidget(n, 'batch_size', batch, 2);
    }
    if (n.type === 'KSampler') {
      /* [seed, control_after_generate, steps, ...] */
      setWidget(n, 'seed', seed, 0);
      setWidget(n, 'control_after_generate', seedMode, 1);
    }
    if (n.type === 'DetailerForEach') {
      /* [guide_size, guide_size_for, max_size, seed, control_after_generate, ...]
         绝不能写 widgets_values[0]，否则会把引导大小 512 冲掉 */
      setWidget(n, 'seed', dSeed, 3);
      setWidget(n, 'control_after_generate', dMode, 4);
    }
    if (n.type === 'SaveImage') {
      setWidget(n, 'filename_prefix', prefix, 0);
    }
  });
  return g;
}

/* UI 工作流 → /prompt 用的 API 格式。 */
function workflowToApi(graph){
  const linkFrom = {};
  (graph.links || []).forEach(l => { linkFrom[l[0]] = [String(l[1]), l[2]]; });
  const prompt = {};
  (graph.nodes || []).forEach(n => {
    const inputs = {};
    (n.inputs || []).forEach(inp => {
      if (inp.link != null && linkFrom[inp.link]) {
        inputs[inp.name] = linkFrom[inp.link];
      } else if (inp.widget && n.widgets_values_named && Object.prototype.hasOwnProperty.call(n.widgets_values_named, inp.name)) {
        inputs[inp.name] = n.widgets_values_named[inp.name];
      }
    });
    /* 部分自定义节点（如 Impact 的 BboxDetectorSEGS）会把必填 widget
       只写在 widgets_values_named 里，inputs 列表里没有对应项。
       不合并的话会报 Required input is missing: labels */
    if (n.widgets_values_named) {
      Object.keys(n.widgets_values_named).forEach(k => {
        if (k === 'control_after_generate') return;
        if (!Object.prototype.hasOwnProperty.call(inputs, k)) {
          inputs[k] = n.widgets_values_named[k];
        }
      });
    }
    const node = { class_type: n.type, inputs: inputs };
    if (n._meta && n._meta.title) node._meta = { title: n._meta.title };
    prompt[String(n.id)] = node;
  });
  return prompt;
}

function resolveSeed(mode, raw){
  const m = mode || 'randomize';
  if (m === 'randomize' || raw === '' || raw == null || raw === undefined) {
    return Math.floor(Math.random() * 1e15);
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) return Math.floor(Math.random() * 1e15);
  return Math.floor(n);
}

function nextSeed(seed, mode, step){
  if (mode === 'increment') return seed + step;
  if (mode === 'decrement') return seed - step;
  if (mode === 'randomize') return Math.floor(Math.random() * 1e15);
  return seed; /* fixed */
}

function workflowHasBatchIncompatibleDetailer(graph){
  return (graph.nodes || []).some(n =>
    n.type === 'DetailerForEach' ||
    n.type === 'BboxDetectorSEGS' ||
    n.type === 'BboxDetectorForEach' ||
    n.type === 'SAMDetectorCombined' ||
    n.type === 'FaceDetailer'
  );
}

function buildComfyJob(graph, positive, negative, opts){
  opts = opts || {};
  const seedMode = opts.seed_mode || 'randomize';
  const dMode = opts.detailer_seed_mode || seedMode;
  const seed = resolveSeed(seedMode, opts.seed);
  const detailer_seed = resolveSeed(dMode, opts.detailer_seed != null ? opts.detailer_seed : opts.seed);
  const full = Object.assign({}, opts, {
    seed: seed,
    detailer_seed: detailer_seed,
    seed_mode: seedMode,
    detailer_seed_mode: dMode,
    batch_size: opts.batch_size || 1,
    prefix: opts.prefix || '1',
    ckpt: opts.ckpt || opts.checkpoint || '',
    loras: opts.loras || []
  });
  const ui = fillUiWorkflow(graph, positive, negative, full);
  const api = workflowToApi(ui);
  return { ui, api, seed, detailer_seed: detailer_seed, batch_size: full.batch_size };
}

function localComfyUrl(raw){
  let u;
  try { u = new URL(raw || 'http://127.0.0.1:8188'); } catch (e) { throw new Error('ComfyUI 地址不合法'); }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('只支持 http/https');
  const host = u.hostname;
  if (host !== '127.0.0.1' && host !== 'localhost' && host !== '::1') {
    throw new Error('只允许提交到本机 ComfyUI（127.0.0.1 / localhost）');
  }
  return u.origin.replace(/\/$/, '');
}

function readBody(req, limit){
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', c => {
      size += c.length;
      if (size > limit) {
        reject(new Error('请求体过大（上限 ' + Math.round(limit / 1024 / 1024) + 'MB），请压缩图片后重试'));
        try { req.destroy(); } catch (e) {}
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function postJson(url, obj, extraHeaders){
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const body = JSON.stringify(obj);
    const lib = u.protocol === 'https:' ? require('https') : http;
    const headers = Object.assign({ 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }, extraHeaders || {});
    const rq = lib.request({
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + u.search,
      method: 'POST',
      headers: headers
    }, rs => {
      let buf = '';
      rs.on('data', c => { buf += c; });
      rs.on('end', () => resolve({ status: rs.statusCode, body: buf }));
    });
    rq.on('error', reject);
    rq.setTimeout(120000, () => { rq.destroy(new Error('请求超时')); });
    rq.end(body);
  });
}

function getJson(url){
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? require('https') : http;
    const rq = lib.request({
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + u.search,
      method: 'GET'
    }, rs => {
      let buf = '';
      rs.on('data', c => { buf += c; });
      rs.on('end', () => resolve({ status: rs.statusCode, body: buf }));
    });
    rq.on('error', reject);
    rq.setTimeout(10000, () => { rq.destroy(new Error('连接 ComfyUI 超时')); });
    rq.end();
  });
}


/* ---------- 服务器 ---------- */

function makeServer() {
  return http.createServer((req, res) => {
    let p;
    try {
      p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    } catch (e) {
      res.writeHead(400); res.end('bad request'); return;
    }

    /* --- 存档 API：只有 http 模式下才存在 --- */
    if (p === '/__api/store') {
      if (req.method === 'GET') {
        const o = readStore() || EMPTY;
        res.writeHead(200, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' });
        res.end(JSON.stringify(o));
        return;
      }
      if (req.method === 'POST') {
        let raw = '';
        req.on('data', c => { raw += c; if (raw.length > 40 * 1024 * 1024) req.destroy(); });
        req.on('end', () => {
          let obj;
          try { obj = JSON.parse(raw); } catch (e) {
            res.writeHead(400); res.end('{"ok":false,"err":"bad json"}'); return;
          }
          /* 保护：本地存档比文件里的还少时，不拿空快照覆盖掉有内容的旧文件 */
          const old = readStore();
          if (old && sizeOf(old) > sizeOf(obj)) {
            res.writeHead(200, { 'Content-Type': MIME['.json'] });
            res.end(JSON.stringify({ ok: false, skipped: true, reason: 'file has more' }));
            return;
          }
          try {
            writeStore(obj);
            res.writeHead(200, { 'Content-Type': MIME['.json'] });
            res.end(JSON.stringify({ ok: true, size: sizeOf(obj) }));
          } catch (e) {
            res.writeHead(500); res.end(JSON.stringify({ ok: false, err: e.message }));
          }
        });
        return;
      }
      res.writeHead(405); res.end(); return;
    }

    if (p === '/__api/llm/config') {
      if (req.method === 'GET') {
        const c = readLlmConfig();
        const safe = Object.assign({}, c, {
          api_key: c.api_key ? (c.api_key.slice(0, 4) + '****' + c.api_key.slice(-4)) : '',
          has_key: !!(c.api_key && c.api_key.length > 0),
          api_key_full: undefined
        });
        /* 本机工具：仍返回完整 key 方便回填输入框（仅 localhost） */
        safe.api_key = c.api_key || '';
        res.writeHead(200, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' });
        res.end(JSON.stringify({ ok: true, config: safe }));
        return;
      }
      if (req.method === 'POST') {
        readBody(req, 64 * 1024).then(raw => {
          let body;
          try { body = JSON.parse(raw || '{}'); } catch (e) {
            res.writeHead(400, { 'Content-Type': MIME['.json'] });
            res.end(JSON.stringify({ ok: false, err: 'bad json' }));
            return;
          }
          const cur = readLlmConfig();
          const next = {
            base_url: String(body.base_url || cur.base_url || '').replace(/\/$/, ''),
            api_key: body.api_key != null ? String(body.api_key) : cur.api_key,
            model: String(body.model || cur.model || 'deepseek-chat'),
            enabled: body.enabled != null ? !!body.enabled : cur.enabled
          };
          writeLlmConfig(next);
          res.writeHead(200, { 'Content-Type': MIME['.json'] });
          res.end(JSON.stringify({ ok: true }));
        }).catch(e => {
          res.writeHead(400, { 'Content-Type': MIME['.json'] });
          res.end(JSON.stringify({ ok: false, err: e.message }));
        });
        return;
      }
      res.writeHead(405); res.end(); return;
    }

    if (p === '/__api/llm/chat' && req.method === 'POST') {
      readBody(req, 32 * 1024 * 1024).then(raw => {
        let body;
        try { body = JSON.parse(raw || '{}'); } catch (e) {
          res.writeHead(400, { 'Content-Type': MIME['.json'] });
          res.end(JSON.stringify({ ok: false, err: 'bad json' }));
          return;
        }
        const cfg = readLlmConfig();
        const base = String(body.base_url || cfg.base_url || '').replace(/\/$/, '');
        const key = String(body.api_key != null ? body.api_key : cfg.api_key || '');
        const model = String(body.model || cfg.model || 'deepseek-chat');
        if (!base) {
          res.writeHead(400, { 'Content-Type': MIME['.json'] });
          res.end(JSON.stringify({ ok: false, err: '请填写 API 地址' }));
          return;
        }
        if (!key) {
          res.writeHead(400, { 'Content-Type': MIME['.json'] });
          res.end(JSON.stringify({ ok: false, err: '请填写 API Key' }));
          return;
        }
        const messages = body.messages || [];
        if (!messages.length) {
          res.writeHead(400, { 'Content-Type': MIME['.json'] });
          res.end(JSON.stringify({ ok: false, err: 'messages 为空' }));
          return;
        }
        const endpoint = /\/chat\/completions$/.test(base) ? base : (base + '/chat/completions');
        const payload = {
          model: model,
          messages: messages,
          temperature: body.temperature != null ? body.temperature : 0.7
        };
        postJson(endpoint, payload, {
          Authorization: 'Bearer ' + key
        }).then(r => {
          let parsed = null;
          try { parsed = JSON.parse(r.body); } catch (e) { parsed = null; }
          if (r.status < 200 || r.status >= 300) {
            res.writeHead(502, { 'Content-Type': MIME['.json'] });
            res.end(JSON.stringify({
              ok: false,
              status: r.status,
              err: (parsed && (parsed.error && (parsed.error.message || JSON.stringify(parsed.error)))) || r.body || '大模型请求失败'
            }));
            return;
          }
          const content = parsed && parsed.choices && parsed.choices[0] && parsed.choices[0].message
            ? parsed.choices[0].message.content
            : '';
          res.writeHead(200, { 'Content-Type': MIME['.json'] });
          res.end(JSON.stringify({ ok: true, content: content, raw: parsed }));
        }).catch(e => {
          res.writeHead(502, { 'Content-Type': MIME['.json'] });
          res.end(JSON.stringify({ ok: false, err: '请求大模型失败：' + e.message }));
        });
      }).catch(e => {
        res.writeHead(400, { 'Content-Type': MIME['.json'] });
        res.end(JSON.stringify({ ok: false, err: e.message }));
      });
      return;
    }

    if (p === '/__api/comfy/models' && req.method === 'GET') {
      let origin;
      try {
        const u = new URL(req.url, 'http://127.0.0.1');
        origin = localComfyUrl(u.searchParams.get('url') || 'http://127.0.0.1:8188');
      } catch (e) {
        res.writeHead(400, { 'Content-Type': MIME['.json'] });
        res.end(JSON.stringify({ ok: false, err: e.message }));
        return;
      }
      Promise.all([
        getJson(origin + '/models/checkpoints').catch(e => ({ status: 0, body: '[]', err: e.message })),
        getJson(origin + '/models/loras').catch(e => ({ status: 0, body: '[]', err: e.message }))
      ]).then(([ck, lr]) => {
        function parseList(r) {
          try {
            const j = JSON.parse(r.body || '[]');
            return Array.isArray(j) ? j : [];
          } catch (e) { return []; }
        }
        const checkpoints = parseList(ck);
        const loras = parseList(lr);
        const ok = checkpoints.length > 0 || loras.length > 0 || (ck.status >= 200 && ck.status < 300);
        res.writeHead(ok ? 200 : 502, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' });
        res.end(JSON.stringify({
          ok: ok,
          checkpoints: checkpoints,
          loras: loras,
          err: ok ? '' : ((ck.err || lr.err) || '无法从 ComfyUI 读取模型列表，请确认已启动')
        }));
      });
      return;
    }



    if (p === '/__api/upscale/history' && req.method === 'GET') {
      const o = readUpscaleHist();
      const items = (o.items || []).map(it => Object.assign({}, it, {
        url: '/upscale-output/' + encodeURIComponent(path.basename(it.file || ''))
      }));
      res.writeHead(200, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ ok: true, items: items }));
      return;
    }
    if (p === '/__api/upscale/history' && req.method === 'DELETE') {
      let id = '';
      let removeFile = false;
      try {
        const u = new URL(req.url, 'http://127.0.0.1');
        id = u.searchParams.get('id') || '';
        removeFile = u.searchParams.get('files') === '1' || u.searchParams.get('remove_file') === '1';
      } catch (e) {}
      if (id) deleteUpscaleHist(id, removeFile);
      else clearUpscaleHist(removeFile);
      res.writeHead(200, { 'Content-Type': MIME['.json'] });
      res.end(JSON.stringify({ ok: true, removed_files: removeFile }));
      return;
    }
    if (p === '/__api/upscale/config' && req.method === 'GET') {
      const cfg = readUpscaleCfg();
      const abs = getUpscaleOutDir();
      res.writeHead(200, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ ok: true, output_dir: cfg.output_dir, abs_path: abs }));
      return;
    }
    if (p === '/__api/upscale/config' && req.method === 'POST') {
      readBody(req, 64 * 1024).then(raw => {
        const body = JSON.parse(raw || '{}');
        let d = String(body.output_dir || '').trim() || 'upscale-output';
        /* 禁止明显危险路径 */
        if (d.includes('..') && !path.isAbsolute(d)) throw new Error('目录不能包含 ..');
        const cfg = writeUpscaleCfg({ output_dir: d });
        const abs = getUpscaleOutDir();
        res.writeHead(200, { 'Content-Type': MIME['.json'] });
        res.end(JSON.stringify({ ok: true, output_dir: cfg.output_dir, abs_path: abs }));
      }).catch(e => {
        res.writeHead(400, { 'Content-Type': MIME['.json'] });
        res.end(JSON.stringify({ ok: false, err: e.message }));
      });
      return;
    }
    if (p === '/__api/upscale/wait-gen' && req.method === 'GET') {
      let origin = 'http://127.0.0.1:8188';
      let promptId = '';
      try {
        const u = new URL(req.url, 'http://127.0.0.1');
        origin = localComfyUrl(u.searchParams.get('url') || origin);
        promptId = u.searchParams.get('prompt_id') || '';
      } catch (e) {}
      getJson(origin + '/history/' + encodeURIComponent(promptId)).then(r => {
        let hist = null;
        try { hist = JSON.parse(r.body || '{}'); } catch (e) {}
        const item = hist && hist[promptId];
        if (!item) {
          res.writeHead(200, { 'Content-Type': MIME['.json'] });
          res.end(JSON.stringify({ ok: false, pending: true }));
          return;
        }
        const outputs = item.outputs || {};
        let img = null;
        Object.keys(outputs).forEach(k => {
          const o = outputs[k];
          if (o && o.images && o.images[0] && !img) img = o.images[0];
        });
        if (!img) {
          res.writeHead(200, { 'Content-Type': MIME['.json'] });
          res.end(JSON.stringify({ ok: false, pending: true }));
          return;
        }
        const view = origin + '/view?filename=' + encodeURIComponent(img.filename) +
          '&subfolder=' + encodeURIComponent(img.subfolder || '') +
          '&type=' + encodeURIComponent(img.type || 'output');
        res.writeHead(200, { 'Content-Type': MIME['.json'] });
        res.end(JSON.stringify({ ok: true, image_url: view, meta: img }));
      }).catch(e => {
        res.writeHead(500, { 'Content-Type': MIME['.json'] });
        res.end(JSON.stringify({ ok: false, err: e.message }));
      });
      return;
    }
    if (p === '/__api/upscale/fetch-image' && req.method === 'GET') {
      let src = '';
      try {
        const u = new URL(req.url, 'http://127.0.0.1');
        src = u.searchParams.get('src') || '';
      } catch (e) {}
      if (!src || !/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//i.test(src)) {
        res.writeHead(400, { 'Content-Type': MIME['.json'] });
        res.end(JSON.stringify({ ok: false, err: '仅允许本机 ComfyUI 图片地址' }));
        return;
      }
      try {
        const u = new URL(src);
        const lib = u.protocol === 'https:' ? require('https') : http;
        lib.get({ hostname: u.hostname, port: u.port || 80, path: u.pathname + u.search, method: 'GET' }, rs => {
          const chunks = [];
          rs.on('data', c => chunks.push(c));
          rs.on('end', () => {
            const buf = Buffer.concat(chunks);
            const mime = rs.headers['content-type'] || 'image/png';
            res.writeHead(200, { 'Content-Type': MIME['.json'] });
            res.end(JSON.stringify({ ok: true, data_url: 'data:' + mime + ';base64,' + buf.toString('base64') }));
          });
        }).on('error', e => {
          res.writeHead(500, { 'Content-Type': MIME['.json'] });
          res.end(JSON.stringify({ ok: false, err: e.message }));
        });
      } catch (e) {
        res.writeHead(500, { 'Content-Type': MIME['.json'] });
        res.end(JSON.stringify({ ok: false, err: e.message }));
      }
      return;
    }


    if (p.startsWith('/upscale-output/')) {
      const name = path.basename(decodeURIComponent(p.slice('/upscale-output/'.length)));
      const outDir = getUpscaleOutDir();
      const fp = path.join(outDir, name);
      if (!fp.startsWith(outDir) || !fs.existsSync(fp)) {
        res.writeHead(404); res.end('not found'); return;
      }
      res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' });
      fs.createReadStream(fp).pipe(res);
      return;
    }

    if (p === '/__api/upscale/status' && req.method === 'GET') {
      let download = false;
      try {
        const u = new URL(req.url, 'http://127.0.0.1');
        download = u.searchParams.get('download') === '1';
      } catch (e) {}
      ensureUpscaleModels(download).then(j => {
        res.writeHead(200, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' });
        res.end(JSON.stringify(j));
      }).catch(e => {
        res.writeHead(500, { 'Content-Type': MIME['.json'] });
        res.end(JSON.stringify({ ok: false, err: e.message || String(e) }));
      });
      return;
    }

    if (p === '/__api/upscale/run' && req.method === 'POST') {
      readBody(req, 32 * 1024 * 1024).then(async raw => {
        const body = JSON.parse(raw || '{}');
        const origin = localComfyUrl(body.url || 'http://127.0.0.1:8188');
        const scale = parseInt(body.scale, 10) || 4;
        if (![2, 4, 6, 8].includes(scale)) throw new Error('倍率仅支持 2 / 4 / 6 / 8');
        const ready = await ensureUpscaleModels(false);
        if (!ready.ready) {
          await ensureUpscaleModels(true);
        }
        const parsed = parseDataUrl(body.image_data_url);
        const fname = path.basename(String(body.filename || 'input.png')).replace(/[^\w.\-]+/g, '_') || 'input.png';
        const up = await uploadImageToComfy(origin, fname, parsed.buffer, parsed.mime);
        const imageName = up.name || up.image || fname;
        const api = buildUpscaleApiWorkflow(imageName, scale);
        const r = await postJson(origin + '/prompt', { prompt: api });
        let parsedResp = null;
        try { parsedResp = JSON.parse(r.body || '{}'); } catch (e) {}
        if (!(r.status >= 200 && r.status < 300) || (parsedResp && parsedResp.error)) {
          throw new Error((parsedResp && (parsedResp.error.message || JSON.stringify(parsedResp.error))) || r.body || 'ComfyUI 拒绝');
        }
        res.writeHead(200, { 'Content-Type': MIME['.json'] });
        res.end(JSON.stringify({ ok: true, prompt_id: parsedResp.prompt_id, image_name: imageName, scale: scale, save_history: !!body.save_history }));
      }).catch(e => {
        res.writeHead(500, { 'Content-Type': MIME['.json'] });
        res.end(JSON.stringify({ ok: false, err: e.message || String(e) }));
      });
      return;
    }

    if (p === '/__api/upscale/result' && req.method === 'GET') {
      let origin = 'http://127.0.0.1:8188';
      let promptId = '';
      try {
        const u = new URL(req.url, 'http://127.0.0.1');
        origin = localComfyUrl(u.searchParams.get('url') || origin);
        promptId = u.searchParams.get('prompt_id') || '';
      } catch (e) {}
      if (!promptId) {
        res.writeHead(400, { 'Content-Type': MIME['.json'] });
        res.end(JSON.stringify({ ok: false, err: '缺少 prompt_id' }));
        return;
      }
      getJson(origin + '/history/' + encodeURIComponent(promptId)).then(r => {
        let hist = null;
        try { hist = JSON.parse(r.body || '{}'); } catch (e) {}
        const item = hist && hist[promptId];
        if (!item) {
          res.writeHead(200, { 'Content-Type': MIME['.json'] });
          res.end(JSON.stringify({ ok: false, pending: true }));
          return;
        }
        const outputs = item.outputs || {};
        let img = null;
        Object.keys(outputs).forEach(k => {
          const o = outputs[k];
          if (o && o.images && o.images[0] && !img) img = o.images[0];
        });
        if (!img) {
          res.writeHead(200, { 'Content-Type': MIME['.json'] });
          res.end(JSON.stringify({ ok: false, pending: true }));
          return;
        }
        const view = origin + '/view?filename=' + encodeURIComponent(img.filename) +
          '&subfolder=' + encodeURIComponent(img.subfolder || '') +
          '&type=' + encodeURIComponent(img.type || 'output');
        const u = new URL(view);
        const lib = u.protocol === 'https:' ? require('https') : http;
        lib.get({ hostname: u.hostname, port: u.port || 80, path: u.pathname + u.search }, rs => {
          const chunks = [];
          rs.on('data', c => chunks.push(c));
          rs.on('end', () => {
            try {
              ensureDir(getUpscaleOutDir());
              const id = 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
              const fname = id + '.png';
              fs.writeFileSync(path.join(getUpscaleOutDir(), fname), Buffer.concat(chunks));
              addUpscaleHistItem({ id: id, file: fname, name: fname, scale: '', ts: new Date().toLocaleString() });
              res.writeHead(200, { 'Content-Type': MIME['.json'] });
              res.end(JSON.stringify({ ok: true, image_url: view, saved_url: '/upscale-output/' + encodeURIComponent(fname), history_id: id, meta: img }));
            } catch (e) {
              res.writeHead(200, { 'Content-Type': MIME['.json'] });
              res.end(JSON.stringify({ ok: true, image_url: view, meta: img, save_err: e.message }));
            }
          });
        }).on('error', e => {
          res.writeHead(200, { 'Content-Type': MIME['.json'] });
          res.end(JSON.stringify({ ok: true, image_url: view, meta: img, save_err: e.message }));
        });
      }).catch(e => {
        res.writeHead(500, { 'Content-Type': MIME['.json'] });
        res.end(JSON.stringify({ ok: false, err: e.message || String(e) }));
      });
      return;
    }

    if (p === '/__api/comfy/templates' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ ok: true, files: listTemplates() }));
      return;
    }

    if (p === '/__api/comfy') {
      if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
      readBody(req, 2 * 1024 * 1024).then(raw => {
        let body;
        try { body = JSON.parse(raw || '{}'); } catch (e) {
          res.writeHead(400, { 'Content-Type': MIME['.json'] });
          res.end(JSON.stringify({ ok: false, err: 'bad json' }));
          return;
        }
        const positive = String(body.positive || '').trim();
        const negative = String(body.negative || '').trim();
        if (!positive) {
          res.writeHead(400, { 'Content-Type': MIME['.json'] });
          res.end(JSON.stringify({ ok: false, err: '还没有正面提示词，先点生成' }));
          return;
        }
        let origin;
        try { origin = localComfyUrl(body.url || 'http://127.0.0.1:8188'); }
        catch (e) {
          res.writeHead(400, { 'Content-Type': MIME['.json'] });
          res.end(JSON.stringify({ ok: false, err: e.message }));
          return;
        }
        const seedOpts = {
          prefix: body.prefix || '1',
          batch_size: body.batch_size || 1,
          seed: body.seed,
          seed_mode: body.seed_mode || 'randomize',
          detailer_seed: body.detailer_seed,
          detailer_seed_mode: body.detailer_seed_mode || body.seed_mode || 'randomize',
          ckpt: body.ckpt || body.checkpoint || '',
          loras: Array.isArray(body.loras) ? body.loras : [],
          disable_char_lora: !!body.disable_char_lora
        };

        /* 支持多模板：templates[] 优先；否则用单个 template */
        let templateNames = [];
        if (Array.isArray(body.templates) && body.templates.length) {
          templateNames = body.templates.map(t => path.basename(String(t || ''))).filter(Boolean);
        } else {
          templateNames = [path.basename(body.template || 'base.json')];
        }
        /* 去重保序 */
        {
          const seen = {};
          templateNames = templateNames.filter(n => {
            if (seen[n]) return false;
            seen[n] = 1;
            return true;
          });
        }
        if (!templateNames.length) templateNames = ['base.json'];

        const graphCache = {};
        function loadGraph(name){
          if (graphCache[name]) return graphCache[name];
          const g = JSON.parse(fs.readFileSync(templatePath(name), 'utf8'));
          graphCache[name] = g;
          return g;
        }
        try {
          templateNames.forEach(loadGraph);
        } catch (e) {
          res.writeHead(500, { 'Content-Type': MIME['.json'] });
          res.end(JSON.stringify({ ok: false, err: '读不到模板：' + (e.message || e) }));
          return;
        }

        /* jobs: [{positive,negative,prefix}, ...] 多组入队；没有则用顶层正负词一组 */
        let jobList = Array.isArray(body.jobs) && body.jobs.length
          ? body.jobs.map(j => ({
              positive: String(j.positive || '').trim(),
              negative: String(j.negative || '').trim(),
              prefix: j.prefix != null ? String(j.prefix) : seedOpts.prefix
            })).filter(j => j.positive)
          : [{ positive: positive, negative: negative, prefix: seedOpts.prefix }];
        if (!jobList.length) {
          res.writeHead(400, { 'Content-Type': MIME['.json'] });
          res.end(JSON.stringify({ ok: false, err: '没有可提交的提示词' }));
          return;
        }

        /* 提示词组 × 模板 展开（例如 10 组 × 3 模板 = 30 个任务） */
        {
          const cross = [];
          jobList.forEach((j, ji) => {
            templateNames.forEach((tpl, ti) => {
              let prefix = j.prefix;
              if (templateNames.length > 1) {
                const stem = tpl.replace(/\.json$/i, '');
                if (/^\d+$/.test(String(j.prefix))) {
                  prefix = String(parseInt(j.prefix, 10) + ti);
                } else {
                  prefix = String(j.prefix) + '_' + stem;
                }
              }
              cross.push({
                positive: j.positive,
                negative: j.negative,
                prefix: prefix,
                template: tpl,
                _promptIndex: ji,
                _tplIndex: ti
              });
            });
          });
          jobList = cross;
        }

        /* Impact Pack 的 Bbox/Detailer 不支持一次多张 batch 图。
           有这些节点时：把「每组 N 张」拆成 N 个独立队列任务（batch_size=1）。 */
        const wantBatch = Math.max(1, Math.min(16, parseInt(seedOpts.batch_size, 10) || 1));
        const anyDetailer = templateNames.some(n => workflowHasBatchIncompatibleDetailer(graphCache[n]));
        if (wantBatch > 1 && anyDetailer) {
          const expanded = [];
          jobList.forEach((j, ji) => {
            for (let k = 0; k < wantBatch; k++) {
              let prefix = j.prefix;
              if (/^\d+$/.test(String(j.prefix))) {
                prefix = String(parseInt(j.prefix, 10) + k);
              } else {
                const m = String(j.prefix).match(/^(.*?)(\d+)$/);
                if (m) prefix = m[1] + String(parseInt(m[2], 10) + k);
                else prefix = j.prefix + '-' + (k + 1);
              }
              expanded.push(Object.assign({}, j, {
                prefix: prefix,
                _splitIndex: ji * wantBatch + k
              }));
            }
          });
          jobList = expanded;
          seedOpts.batch_size = 1;
          seedOpts._splitBatch = wantBatch;
        } else {
          seedOpts._splitBatch = 1;
        }

        if (body.download_only) {
          let job;
          try {
            const g0 = loadGraph(jobList[0].template || templateNames[0]);
            job = buildComfyJob(g0, jobList[0].positive, jobList[0].negative, Object.assign({}, seedOpts, { prefix: jobList[0].prefix }));
          } catch (e) {
            res.writeHead(500, { 'Content-Type': MIME['.json'] });
            res.end(JSON.stringify({ ok: false, err: e.message }));
            return;
          }
          const fname = String(jobList[0].prefix || '1').replace(/[^\w\u4e00-\u9fff.-]+/g, '_') + '.json';
          res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Disposition': 'attachment; filename="' + fname + '"'
          });
          res.end(JSON.stringify(job.ui, null, 2));
          return;
        }

        /* 逐组提交；种子按模式递进（固定/递增/递减/随机） */
        const results = [];
        let baseSeed = null;
        let baseDSeed = null;
        const mode = seedOpts.seed_mode || 'randomize';
        const dMode = seedOpts.detailer_seed_mode || mode;

        function submitOne(i){
          if (i >= jobList.length) {
            const okN = results.filter(r => r.ok).length;
            res.writeHead(okN ? 200 : 502, { 'Content-Type': MIME['.json'] });
            res.end(JSON.stringify({
              ok: okN > 0,
              total: jobList.length,
              ok_count: okN,
              batch_size: seedOpts._splitBatch > 1 ? seedOpts._splitBatch : (seedOpts.batch_size || 1),
              split: seedOpts._splitBatch > 1,
              templates: templateNames,
              template_count: templateNames.length,
              results: results,
              err: okN === jobList.length ? '' : results.filter(r => !r.ok).map(r => r.err).join('；')
            }));
            return;
          }
          const item = jobList[i];
          let seedVal = seedOpts.seed;
          let dSeedVal = seedOpts.detailer_seed;
          if (i === 0) {
            /* 首组：交给 buildComfyJob 解析 */
          } else if (mode === 'increment' || mode === 'decrement' || mode === 'fixed') {
            seedVal = nextSeed(baseSeed, mode, i);
            dSeedVal = nextSeed(baseDSeed, dMode === 'randomize' ? 'randomize' : dMode, i);
          } else {
            seedVal = null; /* randomize each */
            dSeedVal = null;
          }
          let job;
          try {
            const gItem = loadGraph(item.template || templateNames[0]);
            job = buildComfyJob(gItem, item.positive, item.negative, Object.assign({}, seedOpts, {
              prefix: item.prefix,
              seed: seedVal,
              detailer_seed: dSeedVal
            }));
          } catch (e) {
            results.push({ ok: false, err: e.message, index: i, template: item.template });
            submitOne(i + 1);
            return;
          }
          if (i === 0) { baseSeed = job.seed; baseDSeed = job.detailer_seed; }
          const payload = {
            prompt: job.api,
            client_id: 'randgen-' + Date.now() + '-' + i,
            extra_data: { extra_pnginfo: { workflow: job.ui } }
          };
          postJson(origin + '/prompt', payload).then(r => {
            let parsed = null;
            try { parsed = JSON.parse(r.body); } catch (e) { parsed = { raw: r.body }; }
            const nodeErr = parsed && parsed.node_errors && Object.keys(parsed.node_errors).length
              ? JSON.stringify(parsed.node_errors) : '';
            const ok = r.status >= 200 && r.status < 300 && parsed && parsed.prompt_id && !nodeErr;
            results.push({
              ok: !!ok,
              index: i,
              prompt_id: parsed && parsed.prompt_id,
              seed: job.seed,
              detailer_seed: job.detailer_seed,
              prefix: item.prefix,
              template: item.template || '',
              err: ok ? '' : ((parsed && parsed.error && (parsed.error.message || JSON.stringify(parsed.error))) || nodeErr || r.body || '拒绝')
            });
            submitOne(i + 1);
          }).catch(e => {
            results.push({ ok: false, index: i, err: e.message });
            submitOne(i + 1);
          });
        }
        submitOne(0);
      }).catch(e => {
        res.writeHead(400, { 'Content-Type': MIME['.json'] });
        res.end(JSON.stringify({ ok: false, err: e.message }));
      });
      return;
    }

    if (p === '/server-mode.js') {
      fs.readFile(MODE_JS, (err, buf) => {
        if (err) { res.writeHead(404); res.end(''); return; }
        res.writeHead(200, { 'Content-Type': MIME['.js'] });
        res.end(buf);
      });
      return;
    }

    /* --- 静态文件 --- */
    if (p === '/' || p === '') p = '/index.html';
    const abs = path.join(ROOT, p);
    /* 路径穿越防护 */
    if (!abs.startsWith(ROOT)) { res.writeHead(403); res.end('forbidden'); return; }

    fs.stat(abs, (err, st) => {
      if (err || !st.isFile()) { res.writeHead(404); res.end('404 ' + p); return; }
      const ext = path.extname(abs).toLowerCase();
      const type = MIME[ext] || 'application/octet-stream';
      if (ext === '.html' || ext === '.htm') {
        fs.readFile(abs, 'utf8', (e2, html) => {
          if (e2) { res.writeHead(500); res.end(); return; }
          /* 注入自动落盘脚本（源码本身不含它，file:// 下不受影响） */
          const inject = '<script src="/server-mode.js"></script>\n';
          const out = html.includes('</body>')
            ? html.replace('</body>', inject + '</body>')
            : html + '\n' + inject;
          res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
          res.end(out);
        });
        return;
      }
      res.writeHead(200, { 'Content-Type': type });
      fs.createReadStream(abs).pipe(res);
    });
  });
}

const DEFAULT_PORT = parseInt(process.env.PORT || (process.argv[2] || '8777'), 10);

function tryListen(port, triesLeft, done) {
  const srv = makeServer();
  srv.once('error', e => {
    if (e.code === 'EADDRINUSE' && triesLeft > 0) {
      console.log('  端口 ' + port + ' 被占用，试 ' + (port + 1));
      tryListen(port + 1, triesLeft - 1, done);
    } else {
      console.error('启动失败：' + e.message);
      process.exit(1);
    }
  });
  srv.listen(port, '127.0.0.1', () => done(srv, port));
}

tryListen(DEFAULT_PORT, 20, (srv, port) => {
  const url = 'http://localhost:' + port + '/index.html';
  const studio = 'http://localhost:' + port + '/role-studio/index.html';
  const st = readStore();
  console.log('');
  console.log('  RANDOM GEN 已启动');
  console.log('  ------------------------------------------');
  console.log('  生成器   ' + url);
  console.log('  角色工坊 ' + studio);
  console.log('  存档文件 ' + STORE_JS);
  console.log('            当前 ' + sizeOf(st) + ' 条（历史 ' + ((st && st.history) || []).length
    + ' / 收藏 ' + ((st && st.fav) || []).length + ' / 角色卡 ' + ((st && st.chars) || []).length + '）');
  console.log('  ------------------------------------------');
  console.log('  存档会自动写回上面的文件，不用手动导出。');
  console.log('  要停止：在这个窗口按 Ctrl+C');
  console.log('');

  /* 尝试打开默认浏览器（设 RG_NO_BROWSER=1 可只起服务、不开浏览器） */
  try {
    if (process.env.RG_NO_BROWSER) throw new Error('skip');
    if (process.platform === 'win32') spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
    else if (process.platform === 'darwin') spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
    else spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
  } catch (e) { /* 打不开就手动复制地址 */ }

  process.on('SIGINT', () => { console.log('\n已停止。'); process.exit(0); });
});
