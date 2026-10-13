#!/usr/bin/env node
/* =========================================================================
   server-mode.js —— 只在「本地服务器」模式下生效的存档自动同步
   -------------------------------------------------------------------------
   这个文件不被 index.html 直接引用 —— 是 server.js 在返回 HTML 时
   动态注入 <script src="/server-mode.js"> 的。

   为什么这么绕：项目硬约束是「双击 index.html 必须能用」，而 file:// 下
   浏览器禁止 fetch / XHR 读本地文件。如果把 fetch 写进 app.js，
   「双击即用」守护脚本 fileproto-check.js 就会报警。
   所以：源码零 fetch，只有 http 模式才注入这段增强代码。

   它做的事：
     1. 启动后拉一次 存档/store.js 的内容（GET  /__api/store）
        —— 本机 localStorage 为空就直接采用；两边都有就取条数多的那边；
        文件里有、本机没有的条目会合并进来（按 id 去重）。
     2. 之后每次保存都自动 POST 回写（1.5 秒防抖），
        关页面 / 切走时用 sendBeacon 再补一次。
   结果：用服务器启动时，存档落盘全自动，不用再点「写回存档文件」。
   ========================================================================= */
(function () {
  if (typeof window === 'undefined') return;
  if (location.protocol === 'file:') return;          /* 双击打开的，什么都不做 */
  if (typeof fetch !== 'function') return;

  var API = '/__api/store';
  var timer = null;
  var dirty = false;
  var lastPush = 0;

  function log(msg) {
    if (window.console && console.info) console.info('[存档同步] ' + msg);
  }

  function sizeOf(o) {
    if (!o || typeof o !== 'object') return 0;
    return (o.history || []).length + (o.fav || []).length + (o.chars || []).length;
  }

  function mergeById(head, tail) {
    var ids = {};
    (head || []).forEach(function (x) { if (x && x.id) ids[x.id] = 1; });
    return (head || []).concat((tail || []).filter(function (x) { return x && !(x.id && ids[x.id]); }));
  }

  function snapshot() {
    var s = (typeof state !== 'undefined') ? state : null;
    if (!s) return null;
    return {
      v: 1, app: 'randgen', ts: Date.now(),
      history: s.history || [],
      fav: s.fav || [],
      chars: s.charLib || [],
      unlock: s.unlocked ? '1' : '0',
      cneg: (typeof customNegText === 'function') ? customNegText() : '',
      seed: s.seed || '',
      tagPresets: s.tagPresets || []
    };
  }

  /* ---------- 拉取 ---------- */
  function pull(done) {
    fetch(API, { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (o) {
        if (!o || typeof o !== 'object') { done && done(null); return; }
        if (!sizeOf(o)) { done && done(o); return; }

        var s = (typeof state !== 'undefined') ? state : null;
        if (!s) { done && done(o); return; }

        /* 文件里的条目合并进本机（按 id 去重，本机的在前） */
        s.history = mergeById(s.history || [], o.history || []);
        s.fav = mergeById(s.fav || [], o.fav || []);
        if (typeof normCard === 'function') {
          s.charLib = mergeById(s.charLib || [], (o.chars || []).map(normCard));
        }
        if (o.unlock === '1' || o.unlock === 1 || o.unlock === true) s.unlocked = true;
        if (typeof o.cneg === 'string' && o.cneg && typeof localStorage !== 'undefined') {
          try { localStorage.setItem('randgen_custom_neg', o.cneg); } catch (e) {}
          var ci = document.getElementById('customNeg'); if (ci) ci.value = o.cneg;
        }
        if (typeof o.seed === 'string' && o.seed) {
          s.seed = o.seed;
          try { localStorage.setItem('randgen_seed', o.seed); } catch (e) {}
        }
        if (Array.isArray(o.tagPresets) && o.tagPresets.length) {
          s.tagPresets = o.tagPresets;
          if (typeof saveTagPresets === 'function') saveTagPresets();
        }

        if (typeof saveStore === 'function') saveStore();
        if (typeof saveCharLib === 'function') saveCharLib();
        try { localStorage.setItem('randgen_unlock_nsfw', s.unlocked ? '1' : '0'); } catch (e) {}
        if (s.unlocked && typeof applyModeUI === 'function') { s.mode = 'nsfw'; applyModeUI(); }

        /* 刷新界面 */
        ['renderStore', 'renderPick', 'renderArtist', 'renderAll'].forEach(function (fn) {
          if (typeof window[fn] === 'function') { try { window[fn](); } catch (e) {} }
        });
        if (s.unlocked && typeof renderTagChips === 'function') { try { renderTagChips(); } catch (e) {} }

        if (typeof toast === 'function') {
          toast('存档已同步 · 历史 ' + s.history.length + ' · 收藏 ' + s.fav.length
            + ' · 角色卡 ' + s.charLib.length);
        }
        log('拉取完成，共 ' + sizeOf(snapshot()) + ' 条');
        done && done(o);
      })
      .catch(function (e) { log('拉取失败：' + e.message); done && done(null); });
  }

  /* ---------- 回写（防抖） ---------- */
  function pushNow(beacon) {
    var snap = snapshot();
    if (!snap) return;
    if (beacon && typeof navigator.sendBeacon === 'function') {
      try {
        navigator.sendBeacon(API, new Blob([JSON.stringify(snap)], { type: 'application/json' }));
        return;
      } catch (e) {}
    }
    lastPush = Date.now();
    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snap)
    }).then(function (r) { return r.json(); })
      .then(function (j) {
        if (j && j.ok) { dirty = false; log('已写回 ' + j.size + ' 条'); }
        else if (j && j.skipped) log('跳过（文件里的比本机多）');
      })
      .catch(function (e) { log('写回失败：' + e.message); });
  }

  function schedulePush() {
    dirty = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () { timer = null; pushNow(false); }, 1500);
  }

  /* 包装现有的保存函数 —— app.js 里调用 saveStore() 会走到这里 */
  ['saveStore', 'saveCharLib'].forEach(function (name) {
    if (typeof window[name] !== 'function') return;
    var orig = window[name];
    window[name] = function () {
      var r = orig.apply(this, arguments);
      try { schedulePush(); } catch (e) {}
      return r;
    };
  });
  /* 解锁状态变化也要落盘 */
  ['renderStore', 'renderAll'].forEach(function (name) {
    if (typeof window[name] !== 'function') return;
    var orig = window[name];
    window[name] = function () {
      var r = orig.apply(this, arguments);
      return r;
    };
  });

  /* 关页面 / 切走时补一次（用 beacon，不受页面卸载打断） */
  window.addEventListener('beforeunload', function () { if (dirty) pushNow(true); });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden' && dirty) pushNow(true);
  });
  /* 兜底：每 30 秒扫一次，有脏就写 */
  setInterval(function () { if (dirty && Date.now() - lastPush > 30000) pushNow(false); }, 30000);

  /* 启动：等 app.js 的 init 跑完再拉，别和它抢 state */
  function boot() {
    var s = (typeof state !== 'undefined') ? state : null;
    if (!s || !s.history) { setTimeout(boot, 120); return; }
    pull();
  }
  if (document.readyState === 'complete') setTimeout(boot, 200);
  else window.addEventListener('load', function () { setTimeout(boot, 200); });
})();
