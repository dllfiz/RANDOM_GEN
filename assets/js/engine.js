/* =========================================================
   engine.js —— 随机引擎 / 拼装器
   ========================================================= */

/* ---------- 随机工具 ---------- */
/* 可播种 PRNG（mulberry32）：generateAll(ctx) 每轮开头 srand(ctx.seed)，
   之后引擎内所有随机都走 rnd() —— 同 seed + 同配置 → 结果完全一致（复现 / 分享用）。
   未给 seed 时用真随机数播种，行为与旧版无异。 */
let _rng = Math.random;
function mulberry32(a){
  return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function srand(seed){ _rng = mulberry32((seed >>> 0) || 1); }
function rnd(){ return _rng(); }
/* 真随机（不受播种影响）：只用于「抽一个种子」本身 */
function rnd0(){ return Math.random(); }
function R(arr){ return arr[Math.floor(rnd() * arr.length)]; }
function RI(arr){ return Math.floor(rnd() * arr.length); }
function RN(a, b){ return Math.floor(rnd() * (b - a + 1)) + a; }
/* Fisher-Yates 均匀洗牌：替换旧版 sort(() => rnd() - 0.5) 偏置洗牌
   （那种写法首尾元素概率差可达 1/3，且依赖具体引擎的排序实现） */
function fyShuffle(arr){
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--){
    const j = Math.floor(rnd() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

/* 按索引同时取中英，返回 {zh, en} */
function PAIR(zhArr, enArr){
  const i = RI(zhArr);
  return { zh: zhArr[i], en: (enArr && enArr[i]) ? enArr[i] : '' };
}

/* 从标签池取（可指定候选标签）——（已废弃删除：全项目零引用） */

/* =========================================================
   器具分流工具（两个合并 IIFE 共用）
   ---------------------------------------------------------
   外部素材（data-extra.js / data-r18.js）里，「口部器具 / 蒙眼物 /
   束缚具 / 器械」和「体位 / 动作句」是混在一起的。早前它们被整池倒进
   体位池或 NS_TAG_POOL 的动作键，结果是：
     · 体位字段显示成「球塞」「分腿捆绑」这种名词；
     · 名词被当成动作句填进 {act}，出现「被按成窥阴癖，球塞。」病句；
     · 名词绕过了事实过滤，「口塞」和口交同时出现。
   这里统一按用途识别并放进四条独立池，中英索引同步推进。
   ========================================================= */
const GEAR_KIND = [
  { to: 'gag',       re: /口塞|口球|口枷|封口|胶带封|布团|塞口|口具|嘴里塞|堵着嘴|嘴被捂住|mouth covered|ballgag|ball gag|bitgag|bit gag|ring gag|cleave gag|tapegag|tape gag|panty gag|\bgag\b/i },
  { to: 'blind',     re: /眼罩|蒙眼|蒙住眼|头套|blindfold|eyes blind/i },
  { to: 'restraint', re: /绑在|捆绑|束缚|手铐|项圈|牵引|固定在|绑成|拘束|按住|绑住|绳|suspens|tied to|\bbound\b|bondage|restrain|spreader|\brope\b|collar|pinned|hung from|hogtie|frogtie|shibari|pillory|leash|肩枷/i },
  { to: 'toy',       re: /器具|假屌|假阳具|按摩棒|跳蛋|肛塞|肛珠|用水果蔬菜|fruit insertion|dildo|vibrator|beads|\bplug\b|\bwand\b|with a toy|mounted toy|chastity|nipple clamp|clit clamp|pussy pump|hookpull|拉珠|灌肠/i }
];
function gearKindOf(text){ for (const k of GEAR_KIND){ if (k.re.test(text)) return k.to; } return ''; }
function gearPools(){
  return {
    gag:       [typeof NS_GAG !== 'undefined' ? NS_GAG : null,       typeof NS_GAG_EN !== 'undefined' ? NS_GAG_EN : null],
    blind:     [typeof NS_BLIND !== 'undefined' ? NS_BLIND : null,   typeof NS_BLIND_EN !== 'undefined' ? NS_BLIND_EN : null],
    restraint: [typeof NS_RESTRAINT !== 'undefined' ? NS_RESTRAINT : null, typeof NS_RESTRAINT_EN !== 'undefined' ? NS_RESTRAINT_EN : null],
    toy:       [typeof NS_TOY !== 'undefined' ? NS_TOY : null,       typeof NS_TOY_EN !== 'undefined' ? NS_TOY_EN : null]
  };
}
function pushGear(kind, zh, en){
  const pair = gearPools()[kind];
  if (!pair || !pair[0] || !zh) return false;
  /* 去重：中文表补全后，同一件器具可能同时由手工条目与 R18 tag 提供
     （例如「肛尾」既写在 data-nsfw.js 里，又由 tail plug 查表得到），
     重复会让中英平行数组错位。 */
  const k = String(zh).trim();
  if (pair[0].some(x => String(x).trim() === k)) return true;
  pair[0].push(zh);
  if (pair[1]) pair[1].push(en || zh);
  return true;
}

/* =========================================================
   词库合并 —— 把 data-extra.js（联网补充）并入主词库
   用 push 原地追加，保持索引对应；只执行一次
   ========================================================= */
(function mergeExtraPools(){
  if (typeof EX_PLACE_MODERN === 'undefined') return;

  /* 1. 背景：现代/西式 + 东方国风 + R18 场景 并入 ANIME_PLACE */
  if (typeof ANIME_PLACE !== 'undefined'){
    ANIME_PLACE.push.apply(ANIME_PLACE, EX_PLACE_MODERN);
    ANIME_PLACE.push.apply(ANIME_PLACE, EX_PLACE_ORIENT);
    ANIME_PLACE_EN.push.apply(ANIME_PLACE_EN, EX_PLACE_MODERN_EN);
    ANIME_PLACE_EN.push.apply(ANIME_PLACE_EN, EX_PLACE_ORIENT_EN);
    if (typeof EX_PLACE_KINK !== 'undefined'){
      ANIME_PLACE.push.apply(ANIME_PLACE, EX_PLACE_KINK);
      ANIME_PLACE_EN.push.apply(ANIME_PLACE_EN, EX_PLACE_KINK_EN);
    }
  }

  /* 1.5 成人向服饰：并入 ANIME_OUTFIT_NSFW（只有 NSFW 模式会取用） */
  if (typeof ANIME_OUTFIT_NSFW !== 'undefined' && typeof EX_OUTFIT_KINK !== 'undefined'){
    ANIME_OUTFIT_NSFW.push.apply(ANIME_OUTFIT_NSFW, EX_OUTFIT_KINK);
    ANIME_OUTFIT_NSFW_EN.push.apply(ANIME_OUTFIT_NSFW_EN, EX_OUTFIT_KINK_EN);
  }

  /* 2. 构图：补充镜头语言并入 CAMERA */
  if (typeof CAMERA !== 'undefined'){
    CAMERA.push.apply(CAMERA, EX_CAMERA);
    CAMERA_EN.push.apply(CAMERA_EN, EX_CAMERA_EN);
  }

  /* 3. NSFW 动作：这批素材是从旧配方里直接抓来的**混合池**。
        绝大多数条目（"嘴被捂住" / "绑在椅子上" / "腿被分开固定住"）是
        动作短语，留在体位池反而更合适——makeScene 会拿它推演出
        gagged / restrained 等事实，自动约束后面的声音与台词。
        真正必须移出的只有**纯名词**：留在体位池会让"体位"那一栏显示成
        「球塞」「分腿捆绑」，既读不通，又绕过了事实过滤（名词里不含
        "含住 / 口交" 这类禁用词），于是和口交撞在一起。 */
  const EX_NOUN = /^(口塞|球塞|棍塞|口枷|布团|用布勒住嘴|胶带封口|用内裤塞口|手臂捆绑|手腕捆绑|分腿捆绑|胯下捆绑|曲膝捆绑|肛珠|肛尾|假屌|双头龙|跳蛋|宠物链|身上有字|用水果蔬菜|反剪双手|双手各握着一根阴茎|双重爆菊|多P乳交|双向吸乳|着衣乳交|自吸乳)$/;
  const EX_NOUN_KIND = [
    { to: 'gag',       re: /口塞|球塞|棍塞|口枷|布团|勒住嘴|封口|塞口/ },
    { to: 'restraint', re: /捆绑|反剪|绑住|手腕/ },
    { to: 'toy',       re: /肛珠|肛尾|假屌|双头龙|跳蛋|水果蔬菜|器具|真空吸引/ }
  ];
  /* 情节 / 癖好词不是"体位"：「做到一半有人推门」放在体位栏里读不通，
     抽进模板还会变成「随机1被按住，做到一半有人推门」。它们并入
     NS_ACTION（中文池，不参与 PAIR）。
     但注意：这一批里混着**光杆名词与半截短语**（裸露癖 / 窥阴癖 / 憋尿 /
     性骚扰 / 被发现 / 将要被强暴…），直接丢进动作池会渲染成
     「随机1一个人待着，裸露癖。」，所以先在这里补成完整句子。 */
  const EX_PLOT = /发现|看着|拍下来|推门|强暴|骚扰|裸露癖|窥阴癖|憋尿|被人看|有人在看/;
  const EX_PLOT_SENT = {
    '裸露癖':            '明知道会被看见，也没把衣服拉上',
    '窥阴癖':            '躲在暗处把全程都看完了',
    '憋尿':              '憋到小腹发胀，还是忍着不肯去',
    '性骚扰':            '被堵在角落里，对方的手已经伸了过来',
    '被发现':            '做到一半，门突然被推开了',
    '进门被发现':        '门被推开，站在门口的人愣在那里',
    '将要被强暴':        '还没反应过来就被按倒，挣都挣不开',
    '做到一半有人推门':  '做到一半，门突然被推开了',
    '被人从门缝看着':    '门外有人隔着缝一直在看',
    '装作没发现有人在看':'明明察觉到了那道视线，却装作什么都不知道',
    '被人看':            '知道有人在看，反而更收不住',
    '有人在看':          '察觉到视线落在身上，动作顿了一下'
  };
  if (typeof NS_POSITION !== 'undefined'){
    for (let i = 0; i < EX_NSFW_ACT.length; i++){
      const zh = EX_NSFW_ACT[i], en = (EX_NSFW_ACT_EN && EX_NSFW_ACT_EN[i]) || '';
      if (EX_NOUN.test(zh)){
        const hit = EX_NOUN_KIND.find(k => k.re.test(zh));
        if (hit && pushGear(hit.to, zh, en)) continue;
      }
      if (EX_PLOT.test(zh) && typeof NS_ACTION !== 'undefined'){
        const sent = EX_PLOT_SENT[zh] || zh;
        if (NS_ACTION.indexOf(sent) < 0) NS_ACTION.push(sent);
        continue;
      }
      NS_POSITION.push({ zh, en, grp: inferPosGrp(zh, en) });
    }
  }
})();

/* =========================================================
   词库合并 2 —— 把 data-r18.js（外部 R18 参考）并入 NSFW 池
   来源：ComfyUI r18 流水线 18 类 580 条 + Tag 工具箱 187 个标准 tag
   ========================================================= */
(function mergeR18Pools(){
  if (typeof R18_ACT === 'undefined') return;

  /* 中文查表：主表 187 项 + 补充表，缺一项就会把裸英文落进中文文本 */
  const ZH = Object.assign({}, (typeof R18_TAG_ZH === 'undefined' ? {} : R18_TAG_ZH),
                            (typeof R18_TAG_ZH_EXTRA === 'undefined' ? {} : R18_TAG_ZH_EXTRA));
  const zh = en => ZH[en] || ZH[String(en).toLowerCase()] || '';

  const uniqPush = (arr, s) => {
    if (!s) return;
    const k = String(s).toLowerCase();
    if (arr.some(x => String(x).toLowerCase() === k)) return;
    arr.push(s);
  };

  /* 1. 性行为 tag 并入体位池（带 grp 分组，供剧情模板挑选）
        R18_ACT 里混着器具 / 束缚具 / 状态效果词，它们根本不是「体位」：
        混进来之后体位字段会输出「球塞」「胶带封口」「失神」这种读起来
        荒谬的结果（用户反馈的"AI 画不出来"组合多由这里渗漏）。
        器具/束缚具按用途分流到 NS_GAG / NS_BLIND / NS_RESTRAINT / NS_TOY，
        状态效果词直接丢弃（它们由表情池/事实推演负责，不该当体位）。 */
  const STATE_ONLY = /^(tally|humiliation|mind break|ahegao|rolling eyes|empty eyes|mind control|hypnosis|transformation|x-ray|body writing)$/i;
  if (typeof NS_POSITION !== 'undefined'){
    const seen = new Set(NS_POSITION.map(p => (p.en || '').toLowerCase()));
    R18_ACT.forEach(en => {
      const k = en.toLowerCase();
      if (seen.has(k)) return;
      if (STATE_ONLY.test(en)) return;
      seen.add(k);
      const kind = gearKindOf(en);
      if (kind){
        /* 中文名取查表结果；查不到就退回英文，宁可显示英文也不丢条目 */
        if (pushGear(kind, zh(en) || en, en)) return;
      }
      NS_POSITION.push({ zh: zh(en) || en, en: en, grp: inferPosGrp(zh(en), en) });
    });
  }

  /* 2. 动作细节并入 NS_ACTION（中文池）：拼成"完整动宾句"而不是名词 tag，
        否则读者会看到"深喉。""假阳具腰带。"这种生硬的名词罗列。
        下面这张表是 R18_ACT 的**兜底句表**：凡是没法当"体位"用的
        （行为名词 / 情节词 / 非人题材），都在这里给一句完整的话，
        素材照样进 NS_ACTION，体位字段则保持干净。 */
  if (typeof NS_ACTION !== 'undefined'){
    const SENT = {
      /* — 体位 / 交合 — */
      'vaginal':'缓慢顶入，整根埋进去再退到只剩头部',
      'fellatio':'低头含住，舌尖贴着柱身一路舔到根部',
      'spooning':'侧躺着从后面进入，一手抬起上面那条腿',
      'sex from behind':'从背后进入，一手掐住腰往自己身上带',
      'prone bone':'整个人压在背上，腿并拢着从后面深入',
      'leg lock':'两条腿死死锁住腰，退都退不开',
      'facesitting':'直接坐到脸上去，整个重量都压下来',
      'guided penetration':'自己扶着对准，一点点坐下去',
      /* — 行为 — */
      'spanking':'抬手落在臀上，留下几道发红的掌痕',
      'tribadism':'两条腿交叠着互相磨，谁也不肯先停',
      'thigh sex':'夹在腿缝之间来回抽送',
      'intercrural sex':'夹在腿缝之间来回抽送',
      'buttjob':'用臀缝夹住上下套弄',
      'hairjob':'抓住后脑，把整束头发垫在下面来回磨',
      'fisting':'整只手慢慢撑开入口，一直没到手腕',
      'anal fisting':'整只手慢慢撑开入口，一直没到手腕',
      'groping':'手从下摆探进去，一路往上揉过去',
      'grinding':'隔着布料贴着磨，越磨越湿',
      'crotch rub':'隔着布料贴着磨，越磨越湿',
      'pegging':'被绑在腰上的东西一点点撑开',
      'prostate massage':'手指按进深处那一小块，按得人整个弹起来',
      'masturbation':'自己动手，一点点把自己送到边缘',
      'double anal':'后面同时被撑到极限，抖得停不下来',
      /* — 器具 — */
      'enema':'灌进去的东西在肚子里翻搅，忍得浑身是汗',
      'anal beads':'一颗颗珠子被依次推进去，再慢慢拉出来',
      'chastity belt':'锁着不许碰，越忍越难熬',
      'nipple clamp':'乳夹咬住乳尖，坠着的重量一扯就是一颤',
      'clit clamp':'夹子扣在最敏感那一点上，动一下都像过电',
      'pussy pump':'负压吸着，充血胀大到发亮',
      'hookpull':'被钩住吊起来，脚尖几乎够不到地',
      /* — 情节 / 状态 — */
      'rape':'根本挣不开，只能被按着承受',
      'bestiality':'被按在身下，完全跟不上那个节奏',
      'urination':'憋到极限，终于一股股泄出来',
      'watersports':'液体浇在身上，顺着皮肤往下淌',
      'stuck in wall':'只剩下半身露在外面，逃都逃不掉',
      'oviposition':'一颗颗卵被推进最深处，怎么都排不干净',
      'egg laying':'一颗颗卵被推进最深处',
      /* — 多人 — */
      'group sex':'几个人轮流上前，中间几乎没有空隙',
      'gangbang':'被围在中间轮流使用，一刻都停不下来',
      'spitroast':'前后同时被填满，两头都退不开',
      'frottage':'两根贴在一起互相摩擦，越磨越烫',
      'double penetration':'两处同时被填满，连呼吸都被挤得不顺',
      /* — 非人（只在勾选「触手怪物」时才允许出现） — */
      'tentacle sex':'触手缠上四肢，一寸寸往里挤'
    };
    const raw = R18_ACT.map(en => SENT[en] || '').filter(Boolean);
    raw.forEach(s => uniqPush(NS_ACTION, s));
  }

  /* 3. 原本这里把 R18 的「名词 tag」（肛珠 / 口塞 / 球塞 / 手臂捆绑 /
        分腿捆绑 / 潮吹 / 内射…）直接 push 进 NS_TAG_POOL 的动作键。
        这些键存的是**中文动作句**，被塞进名词后会被 fromTagPoolArr
        当成动作句填进 {act}，于是出现两类问题：
          · 病句：「随机1被按成窥阴癖，球塞。」
          · 绕过事实过滤：名词「口塞」不含「含住/口交」这类禁用词，
            口部被占时照样输出，和口交撞在一起。
        器具本身已在第 1 步按类分流到四条器具池（中英成对），
        英文 tag 也早已写在 NS_TAG_EN 的对应键里，这里不再重复注入。 */

  /* 4. 体能/失神状态词并入高潮反应池（直接用中文句子池，避免裸英文） */
  if (typeof NS_ORGASM !== 'undefined' && typeof R18_ORGASM_ZH !== 'undefined'){
    R18_ORGASM_ZH.forEach(s => uniqPush(NS_ORGASM, s));
  }
})();

/* =========================================================
   体位文本分两类
   ---------------------------------------------------------
   'pos' —— 名词化的姿势名：跪姿后入 / 传教士体位 / 跨坐式
            模板里「被按成{pos}」通顺。
   'act' —— 动作短语：抵在墙上 / 一只手被按在墙上 / 在泳池边 / 嘴被捂住
            「被按成抵在墙上」是病句，必须走「被按住，{pos}」。

   判定靠"介词 / 助词 / 趋向补语"标记：真正的姿势名是一串名词，
   只要出现其中之一，就说明它是句子而不是一个词组。
   ========================================================= */
const POS_PHRASE_MARK = /[了着在从到又再先把被用就却还连随开住得起过来去，,、；;]/;
function posKindOf(zh){
  return POS_PHRASE_MARK.test(String(zh || '')) ? 'act' : 'pos';
}

/* =========================================================
   体位池净化（必须在 EX / R18 两个合并 IIFE 之后跑）
   ---------------------------------------------------------
   NS_POSITION 由三处拼成：data-nsfw 手工条目 + EX_NSFW_ACT + R18_ACT。
   混进来的东西其实有三类，都不是「体位」这一栏该显示的内容：

     ① 行为 / 情节名词（强暴 / 轮奸 / 深喉 / 乳交 / 潮吹 / 颜射…）
        会渲染成「被按成强暴」「被按成深喉」这种读不通的句子；
        素材已由 NS_TAG_POOL 的完整动作句与 NS_ACTION 兜底句覆盖，
        这里直接删（删掉的那一份在 mergeR18Pools 第 2 步的 SENT 表里）。
     ② 环境 / 地点短语（泳池边 / 天台栏杆旁 / 电梯里站立…）
        素材本身影响画面、值得留，但必须改写成「在…」形式，
        否则会被 {posLead} 拼成「被按成泳池边」。
     ③ 中文位是裸英文（R18 tag 漏进中文表）
        先由 R18_TAG_ZH_EXTRA 补齐；仍缺的从池里删掉——
        宁可少一条，也不要让中文正文里冒出 vaginal / prone bone。
   ========================================================= */
(function sanitizePositionPool(){
  if (typeof NS_POSITION === 'undefined') return;

  /* ① 「做什么」而不是「什么姿势」——删除 */
  const POS_NOT_A_POSE = /^(强暴|轮奸|群交|群P|人兽|兽交|打屁股|摸索|颜射|吃精|潮吹|自慰|手淫|隔着衣服自慰|乳交|着衣乳交|多P乳交|双向吸乳|自吸乳|吸乳（中）|深喉|口交|舔阴|肛吻|足交|手交|用手做|用双手手交|发交|腿交|臀交|性器摩擦|胯部摩擦|爆菊|手爆菊|拳爆菊|拳交|拳头插入|双重爆菊|双重入穴|双穴同插|三穴同插|一穴多插|巨大插入|菊花插入物|插入物|肛门插入|手插入|引导插入|抓住男性器插入自己|产卵|灌肠|女性使用假屌|双手各握着一根阴茎|女奸男（逆推）|前后夹攻|水中做爱|卡在墙里|排尿|放尿|触手|阴道交合|中出|射精|前后各一个人|两个人轮流上前|被围在中间|结束后腿还在抖|已经去了好几次|精液从里面往外淌)$/;

  /* ② 环境 / 地点短语：改写成「在…」形式后留在池里 */
  const POS_ENV_FIX = {
    '对着镜子':        '在镜子前',
    '电梯里站立':      '在电梯里贴着墙站着',
    '楼梯间里':        '在楼梯间里',
    '厕所隔间里':      '在厕所的隔间里',
    '教室课桌上':      '在教室的课桌上',
    '天台栏杆旁':      '在天台的栏杆旁',
    '车里副驾座':      '在车里的副驾座上',
    '电车车厢角落':    '在电车车厢的角落里',
    '图书馆书架之间':  '在图书馆的书架之间',
    '温泉池里':        '在温泉池里',
    '泳池边':          '在泳池边',
    '沙滩上':          '在沙滩上',
    '草地铺着外套':    '在草地上，身下垫着外套',
    '帐篷里':          '在帐篷里',
    '雪地里':          '在雪地里',
    '雨里':            '在雨里',
    '被单底下':        '在被单底下',
    '蒙在被子里':      '蒙在被子里',
    '狭窄空间里贴身':  '在狭窄的空间里贴着',
    '浴缸里后入':      '在浴缸里后入',
    '淋浴下站立':      '在淋浴下站着',
    '后背贴上玻璃，凉得一颤': '后背贴着玻璃，凉得一颤',
    '掌印叠着掌印':    '臀上叠着掌印',
    '被按在车窗上':    '按在车窗上',
    '磨豆腐':          '两条腿交叠着互相磨'
  };

  const isBareEn = s => /^[a-zA-Z0-9 ,\-]+$/.test(String(s || '').trim());

  const kept = [];
  let nFlip = 0;   /* 改写成「在…」的 */
  let nDrop = 0;   /* 删掉的 */
  NS_POSITION.forEach(p => {
    let zh = String(p.zh || '').trim();
    if (!zh){ nDrop++; return; }
    if (POS_ENV_FIX[zh]){ zh = POS_ENV_FIX[zh]; nFlip++; }
    if (POS_NOT_A_POSE.test(zh)){ nDrop++; return; }
    if (isBareEn(zh)){ nDrop++; return; }
    p.zh = zh;
    p.kind = posKindOf(zh);
    kept.push(p);
  });
  NS_POSITION.length = 0;
  NS_POSITION.push.apply(NS_POSITION, kept);
  /* 供回归脚本读取计数 */
  if (typeof window !== 'undefined'){ window.__posPurge = { drop: nDrop, flip: nFlip }; }
})();

/* =========================================================
   非人题材闸门
   ---------------------------------------------------------
   触手 / 怪物 / 兽 这类句子写在 NS_ACTION 与 NS_TAG_POOL.monster 里。
   NS_TAG_POOL 侧本来就只在勾选 monster 时才会被取用，但 NS_ACTION
   是"通用动作池"，不勾也会被随机抽到，于是普通场景会凭空长出触手。
   这里统一加闸：没勾 monster 就不许出现非人句子。
   ========================================================= */
const NONHUMAN_RE = /触手|触须|怪物|异形|兽交|人兽|兽身|兽类|兽性|藤蔓|产卵|寄生|透明的卵|黏液涂满/;
/* 触手系 / 兽系分开识别（2026-10-09 轮次 J）：
   勾「触手怪物」只放行触手句、勾「兽交」只放行兽类句，两个都勾才全放。
   旧版只认 monster —— 勾「兽交」时 NS_TAG_POOL.bestiality 的句子全被
   这道闸门剔掉，兽交提示词根本出不来。 */
const NONHUMAN_TENTACLE_RE = /触手|触须|怪物|异形|藤蔓|产卵|寄生|透明的卵|黏液涂满/;
const NONHUMAN_BEAST_RE = /兽交|人兽|兽身|兽类|兽性/;
function filterNonhuman(pool, ctx){
  if (!pool || !pool.length) return pool || [];
  const tags = actTags(ctx);
  const m = tags.indexOf('monster') >= 0, b = tags.indexOf('bestiality') >= 0;
  if (m && b) return pool;
  if (m) return pool.filter(s => !NONHUMAN_BEAST_RE.test(String(s)));
  if (b) return pool.filter(s => !NONHUMAN_TENTACLE_RE.test(String(s)));
  return pool.filter(s => !NONHUMAN_RE.test(String(s)));
}

/* =========================================================
   非人体位池（轮次 J 新增）
   ---------------------------------------------------------
   勾「触手怪物 / 兽交」时，人类体位池（骑乘 / 后入 / 传教士…）
   与画面自相矛盾，而且旧池里没有"插入"级的英文 tag ——
   Anima 上就是画不出插入感。这里给两类各配一组显式插入体位，
   勾了就整组顶掉人类体位（触手 / 兽本身就是"第二方"，单人场景照样成立）。
   措辞避开 SOLO_BLOCK（单人过滤）与非人闸门自己的词表：
   不用 penetration / all fours / sex from behind 这类会被剔的词。
   ========================================================= */
const NONHUMAN_POS = {
  monster: [
    { zh: '被触手吊在半空，最粗那根正往里挤',     en: 'suspended by tentacles, tentacle insertion, legs held apart by tentacles' },
    { zh: '趴在地上，触手从背后一寸寸顶进去',     en: 'lying prone, tentacle insertion from behind, tentacles coiling around thighs' },
    { zh: '被多条触手固定住，前面被顶得开开合合', en: 'bound by tentacles, tentacle in pussy, tentacles on breasts' },
    { zh: '触手缠住脚踝往两边拉开，卵一颗颗推进来', en: 'ankles bound by tentacles, tentacle oviposition, eggs pushed inside' },
    { zh: '被触手卷着抬起腰，最深处被一下下顶着', en: 'lifted by tentacles, deep tentacle thrusts inside, tentacles everywhere' }
  ],
  bestiality: [
    { zh: '被兽身压住，那东西抵着入口往里拱',     en: 'pinned under beast, animal cock pressing inside, mounting' },
    { zh: '兽从背后跨上来，一下下顶到最里面',     en: 'animal mounting from behind, animal cock thrusting deep, fur pressed against back' },
    { zh: '跪趴着由它跨上来，节奏完全由不得人',   en: 'on hands and knees under animal, mounting, animal genitalia' },
    { zh: '结扣胀在里面，一时半会儿退不出来',     en: 'knotting, knotted, canine penis, stuck together' },
    { zh: '被尺寸悬殊的那根撑到极限',             en: 'size difference, stretched to the limit by animal cock, belly bulge' }
  ]
};
/* 勾了 monster / bestiality 就用非人体位，否则维持人类体位池原样 */
/* 梦神法典·非人姿势并入（轮次 K）：勾标签时与手写非人体位同池竞争 */
if (typeof MS_CODEX !== 'undefined'){
  MS_CODEX.forEach(e => {
    if (e.g !== 'nonhuman' || !NONHUMAN_POS[e.nh]) return;
    /* en 里混中文残片（源站贴图文字）或畸形加权（::N::）的条目进不了英文提示词；
       多人群交类条目（火车便当 / 4p / gangbang）混进 1~2 人非人场景必错，一并剔掉
       （此处为加载期代码，常量尚未声明，用字面量） */
    if (/[\u4e00-\u9fa5\u3040-\u30ff]/.test(e.en) || /::\s*\d/.test(e.en)) return;
    if (/(?:gangbang|multiple boys|multiple girls|group sex|spitroast|double penetration|triple penetration|threesome|foursome|\d+\+?\s*boys|\d\s*p\b)/i.test(e.en)) return;
    NONHUMAN_POS[e.nh].push({ zh: e.zh, en: e.en });
  });
}
function pickPosAny(posPool, ctx, facts){
  const tags = actTags(ctx);
  const pools = [];
  if (tags.indexOf('monster') >= 0) pools.push.apply(pools, NONHUMAN_POS.monster);
  if (tags.indexOf('bestiality') >= 0) pools.push.apply(pools, NONHUMAN_POS.bestiality);
  if (!pools.length) return R(posPool);
  let pool = posPoolByFacts(pools, facts);   /* 睡奸等事实冲突时剔除；空池自动回落 */
  /* 器官适配（轮次 W 审计）：全男场景无阴道，非人体位里的
     'tentacle in pussy' / 'animal cock in pussy' 系写法全部剔除 */
  if (ctx && ctx._hasPussy === false){
    const f2 = pool.filter(p => !/pussy|vagina|cunnilingus/i.test(String(p.en || '')));
    if (f2.length) pool = f2;
  }
  return R((pool && pool.length) ? pool : pools);
}

/* =========================================================
   梦神法典·姿势并入体位池（轮次 K 新增）
   ---------------------------------------------------------
   data-nsfw.js 的 MS_CODEX（316 条，来源：梦神·涩涩法典 mengshen_r18）。
   按人数组合（g）+ 身体部位（part）双向匹配后并入体位池：
   - 人数组合：solo(单女) / mf(单男单女) / mff(单男多女) / mmf(多男单女)
     / orgy(多男多女) / yuri(百合) / any(通用)；非人条目走 NONHUMAN_POS，不在此列。
   - 部位：oral / hand / paizuri / foot / anal / bdsm / sex / misc，
     由勾选的内容标签推导，未勾具体部位时回落 sex + misc。
   并入后全裸过滤 / 事实冲突过滤 / 单人体位过滤 / 冲突重掷全部照常生效。
   ========================================================= */
function msCodexGroups(ctx){
  if (typeof MS_CODEX === 'undefined' || !MS_CODEX.length) return [];
  const tags = actTags(ctx);
  if (tags.indexOf('monster') >= 0 || tags.indexOf('bestiality') >= 0) return [];
  const genders = ctx._genders || [];
  const m = genders.filter(g => g === 'male' || g === 'futa').length;
  const f = genders.length - m;
  const actors = ctx.actors || 1;
  if (actors < 2){
    const g0 = genders[0] || ctx._gender0 || ctx.gender;
    if (g0 === 'male') return [];   /* 单女条目不适用男性单人 */
    /* 匿名男性补全：看不见脸的男人在场，男♀条目也成立 */
    return anonMaleFor(ctx) ? ['solo', 'mf'] : ['solo'];
  }
  if (ctx._yuri || (genders.length >= 2 && m === 0)) return ['yuri'];
  if (m === 1 && f === 1) return ['mf'];
  if (m === 1 && f >= 2) return ['mff', 'mf'];
  if (m >= 2 && f === 1) return ['mmf', 'mf'];
  if (m >= 2 && f >= 2) return ['orgy', 'mmf', 'mff', 'mf'];
  return [];
}

function msCodexParts(ctx){
  const tags = actTags(ctx);
  const has = id => tags.indexOf(id) >= 0;
  const parts = [];
  if (has('oral') || has('deepthroat') || has('cunnilingus')) parts.push('oral');
  if (has('handjob') || has('fisting')) parts.push('hand');
  if (has('paizuri')) parts.push('paizuri');
  if (has('footjob')) parts.push('foot');
  if (has('anal') || has('rimming')) parts.push('anal');
  if (has('bdsm') || has('bondage') || has('suspended') || has('gag') ||
      has('blindfold') || has('clamps') || has('electro') || has('wax') || has('toy')) parts.push('bdsm');
  parts.push('sex', 'misc');
  return parts;
}

/* 法典 en 里的裸露 / 内衣穿脱类状态词：默认（穿衣）模式下与衣着契约冲突，运行时剥掉。
   全裸模式整组不切换（见下），所以这里只需处理"非全裸"路径。
   只剥整词短语，保护 "nude male" / "naked apron" 这类合法组合。 */
function msCodexEnClean(en){
  return String(en || '')
    .replace(/\s*\b(?:completely nude|fully nude|no panties|no bra|bottomless|topless|breasts out|nipples out)\b[:\s]*,?/gi, '')
    .replace(/\s*\bgag reflex\b\s*,?/gi, '')
    /* 匿名构图词：双人有名场景不许出现（匿名男场景由 ANON_MALE_TAGS 专门注入） */
    .replace(/\s*\b(?:faceless male|disembodied penis|grey silhouette)\b\s*,?/gi, '')
    .replace(/,\s*,/g, ',').replace(/^[,\s]+/, '').replace(/[,\s]+$/, '');
}
/* 法典 en 里混入的中文残片（源站贴图文字 text:xxx / 转换残留）：
   这类条目无法用于英文提示词，整条跳过；
   ::N:: 形式的畸形加权残留（31 条）同样跳过 */
const MS_CODEX_CJK_RE = /[\u4e00-\u9fa5\u3040-\u30ff]/;
const MS_CODEX_BAD_W_RE = /::\s*\d/;

function msCodexMerge(base, ctx){
  if (typeof MS_CODEX === 'undefined' || !MS_CODEX.length) return base;
  const groups = msCodexGroups(ctx);
  if (!groups.length) return base;
  const parts = msCodexParts(ctx);
  const soloNoAnon = (ctx.actors || 1) < 2 && !anonMaleFor(ctx);
  const tags = actTags(ctx);
  const noNH = tags.indexOf('monster') < 0 && tags.indexOf('bestiality') < 0;
  const ms = [];
  MS_CODEX.forEach(e => {
    if (e.g === 'nonhuman') return;
    if (groups.indexOf(e.g) < 0 && e.g !== 'any') return;
    if (parts.indexOf(e.part) < 0) return;
    /* en 里混着中文残片（源站贴图文字）的条目用不了 */
    if (MS_CODEX_CJK_RE.test(e.en) || MS_CODEX_BAD_W_RE.test(e.en)) return;
    /* 器官适配（轮次 W 审计）：全男场景无阴道，法典条目里的 pussy 系写法剔除 */
    if (ctx && ctx._hasPussy === false && /pussy|vagina|cunnilingus/i.test(e.en)) return;
    /* 女女 / 无男场景（也没勾匿名男）：法典里带男性器官 / 精液描写的
       条目进不了画面（百合场景正文不许出现"吃精液便当"这类句子） */
    if (ctx._hasPenis === false && !anonMaleFor(ctx) && MALE_ORGAN_RE.test(e.zh + ' ' + e.en)) return;
    /* 未勾非人题材：触手 / 异种 / 兽类写法的法典条目不进人类场景 */
    if (noNH && NONHUMAN_RE.test(e.zh + ' ' + e.en)) return;
    /* 单人（无匿名男）：'any' 组条目本身就是多人插入语境，
       整组不进单人池；再过单人闸门（中）+ 多人词（英）两道兜底 */
    if (soloNoAnon && (e.g === 'any' || SOLO_POS_BLOCK.test(String(e.zh + ' ' + e.en)) ||
        SOLO_MULTI_EN_RE.test(String(e.en || '')))) return;
    ms.push(e);
  });
  if (!ms.length) return base;
  /* 全裸是用户显式选择：法典姿势大量着衣语境，全裸时整组不切换 */
  if (typeof isNude === 'function' && isNude(ctx)) return base;
  /* 概率整组切换：45% 的匹配场景整个体位池换成法典姿势（其余保持原池）。
     不用"按份数混入"——实测引擎的抽取链路会把混入条目稀释到不足一成。
     切换后的池仍走全裸 / 事实冲突过滤，且两处过滤都有空池回落。 */
  if (rnd() >= 0.45) return base;
  const out = [];
  ms.forEach(e => {
    const it = { zh: e.zh, en: msCodexEnClean(e.en), grp: inferPosGrp(e.zh, e.en), kind: posKindOf(e.zh) };
    /* 具体部位（口 / 手 / 乳 / 足 / 肛 / 束缚）×3 加权：
       用户勾了部位标签时，法典池里对应部位要占主导，不被 sex / misc 淹没 */
    const n = (e.part === 'sex' || e.part === 'misc') ? 1 : 3;
    for (let i = 0; i < n; i++) out.push(it);
  });
  return out;
}

/* =========================================================
   人数闸门
   ---------------------------------------------------------
   「被围在中间轮流使用」「前后同时被填满」这类句子至少要有三个人
   才成立——两个人在场做不出"被围在中间"。这些兜底句写在 NS_ACTION
   通用池里，谁都能抽到，所以必须按当前人数过滤。
   标签池（NS_TAG_POOL.orgy / dp…）只在用户显式勾选时才取用，不在此列。
   ========================================================= */
const GROUP_ACT_RE = /被围在中间|轮流上前|几个人轮流|一刻都停不下来|前后同时被填满|两头都退不开|一轮接一轮|前后都没空下来|所有人一起动作|围在中间轮流/;
function filterHeadcount(pool, ctx){
  if (!pool || !pool.length) return pool || [];
  if ((ctx.actors || 1) >= 3) return pool;
  const out = pool.filter(s => !GROUP_ACT_RE.test(String(s)));
  return out.length ? out : pool;
}

/* 动作池统一闸门：非人题材 + 人数。
   注意兜底顺序——如果整池都是群交句（例如用户只勾了 orgy 却只开两个人），
   要退回"通用池去掉群交句"，而不是原样返回那句话。 */
function guardActPool(pool, ctx){
  const nh = filterNonhuman(pool, ctx);
  /* 匿名群交（单人勾了 orgy/dp/bukkake 等）：看不见脸的男人们在场，群交句成立 */
  if ((ctx.actors || 1) >= 3 || anonMaleFor(ctx) === 'multi') return nh.length ? nh : (pool || []);
  const hc = nh.filter(s => !GROUP_ACT_RE.test(String(s)));
  if (hc.length) return hc;
  const base = filterNonhuman(NS_ACTION, ctx).filter(s => !GROUP_ACT_RE.test(String(s)));
  if (base.length) return base;
  return nh.length ? nh : (pool || []);
}

/* =========================================================
   器具名 → 纯名词
   ---------------------------------------------------------
   模板里 {toy} 落在名词槽：「手边只有{toy}」「{toy}就摆在一旁」
   「把{toy}固定在合适的位置」。而器具池的条目是"名称 + 后置描述"
   （「口球，塞得满满当当」「蒙眼布系在脑后，勒进发丝」），
   整条塞进名词槽就成病句。这里只给模板用短名，
   「道具」字段仍然显示完整描述。
   ========================================================= */
const GEAR_NOUN_FIX = {
  '整卷胶带封住嘴':'整卷胶带','用布勒住嘴':'勒嘴布条','胶带封口':'封口胶带',
  '用内裤塞口':'塞口内裤','蒙眼布系在脑后':'蒙眼布','被束缚':'束缚绳',
  '悬空捆绑':'悬空吊绳','曲膝捆绑':'曲膝绑带','青蛙捆绑':'青蛙式绑带',
  '捆绑':'捆绑绳','捆绑/奴役':'奴役束具','分腿捆绑':'分腿绑带','胯下捆绑':'胯下绳',
  '手臂捆绑':'手臂绑带','手腕捆绑':'手腕绑带','脚踝捆绑':'脚踝绑带',
  '用水果蔬菜':'水果蔬菜','低频电击贴片':'电击贴片'
};
function gearNoun(text){
  let s = String(text || '').trim();
  const c = s.search(/[，,]/);
  if (c > 0) s = s.slice(0, c);
  return GEAR_NOUN_FIX[s] || s;
}

/* 会震会动、真正算"器具"的那几条（供「开着最大档」这类句子使用）。
   口球 / 胶带 / 眼罩 / 绳索不在此列。 */
/* 器具使用句（轮次 AC）：按道具类型取使用过程描写 */
function toyUseKindOf(zh){
  const t = String(zh || '');
  if (/口球|塞口|封口|堵嘴|塞满嘴|胶带|口枷/.test(t)) return 'gag';
  if (/蒙眼|眼罩|眼带|头套|耳塞/.test(t)) return 'blind';
  if (/捆绑|束缚|拘束|绳|手铐|吊|束带|项圈|牵引|分腿|锁扣/.test(t)) return 'rest';
  if (/跳蛋|按摩棒|震动|吸吮|电击|遥控/.test(t)) return 'vibe';
  if (/假屌|假阳具|双头|拉珠|肛塞|扩张|自慰器|吸引泵|玻璃|器具|冰块|羽毛|灌肠|开口器/.test(t)) return 'insert';
  return '';
}
function toyUseZh(kind){
  const p = (typeof NS_TOY_USE !== 'undefined' && NS_TOY_USE[kind]) || [];
  return p.length ? R(p) : '';
}
function toyUseEn(kind){
  const p = (typeof NS_TOY_USE_EN !== 'undefined' && NS_TOY_USE_EN[kind]) || [];
  return p.length ? R(p) : '';
}

const TOY_DEVICE = (typeof NS_TOY === 'undefined' ? [] : NS_TOY)
  .filter(s => /跳蛋|按摩棒|震动|吸吮|假屌|假阳具|双头龙|拉珠|电击|扩张|自慰器|吸引泵|玻璃棒|器具/i.test(String(s)));

/* 从中英文本推断体位分组，保证与 NS_STORY_TPL 的分组键一致 */
function inferPosGrp(zh, en){
  const s = (zh + ' ' + en).toLowerCase();
  if (/口交|深喉|舔|吮|oral|fellatio|irrumatio|blowjob|cunnilingus|facesit|69/.test(s)) return 'oral';
  if (/骑乘|跨坐|坐在.*腿|女上|cowgirl|riding|straddl|on top|on lap/.test(s)) return 'ride';
  if (/后入|背后|从后|趴|翘臀|doggystyle|from behind|all fours|bent over|rear|on stomach/.test(s)) return 'back';
  return 'front';
}

/* 体位池按身体条件筛选。
   单人场景（单张角色卡 / 单人生成）里，体位也只能由这一个人完成，
   所以"女性角色被配了握着阴茎""男性角色被配了张开阴部"这类矛盾必须挡掉。 */
const POS_NEED_PENIS = /penis|cock|glans|scrotum|testicle|paizuri|fellatio|deepthroat|handjob|footjob|erection|cock ring|semen|precum|阴茎|龟头|肉棒|口交|深喉|乳交|手交|足交|射精|吞精/i;
const POS_NEED_PUSSY = /pussy|labia|clitoris|vagina|vaginal|cowgirl|girl on top|creampie|squirt|breast|nipple|milk|futa|阴部|阴唇|阴蒂|阴道|女上|骑乘|潮吹|乳房|乳尖|内射|泌乳|扶她/i;
function posPoolFor(hasPenis, hasPussy){
  const pool = NS_POSITION.filter(p => {
    const t = String(p.en || '') + ' ' + String(p.zh || '');
    if (!hasPenis && POS_NEED_PENIS.test(t)) return false;
    if (!hasPussy && POS_NEED_PUSSY.test(t)) return false;
    return true;
  });
  return pool.length ? pool : NS_POSITION;
}

/* 体位类别（ctx.posCat，2026-10-09「增加 NSFW 提示词的选择」）：
   用户在「体位类别」下拉里选定 front / back / ride / oral 后，
   体位池整池按 grp 过滤，本场景的体位都落在这一类。
   ''（随机）不过滤；池被滤空时回落原池（宁肯随机也不给空结果）。 */
function applyPosCat(pool, ctx){
  if (!ctx || !ctx.posCat) return pool;
  const f = (pool || []).filter(p => p && p.grp === ctx.posCat);
  return f.length ? f : pool;
}

/* =========================================================
   百合（女女 / 全员无阴茎）判定与配套池
   ---------------------------------------------------------
   两个女性角色的场景里没有可插入的主体：英文动作链原本写
   「is thrusting into … entering … from the rear」，中文动作池里
   也全是「整根埋进去 / 一路舔到根部」这类必须有阴茎才成立的句子。
   yuriScene() 为真时，体位 / 动作 / 动作链 / 台词全部切到女女版本。
   传 chars 就按角色实际性别判，只传 ctx 则读 generateAll 打的 _yuri 标。
   ========================================================= */
function yuriScene(ctx, chars){
  if (chars && chars.length){
    return chars.length >= 2 &&
      chars.every(c => c.gender !== 'male' && c.gender !== 'futa');
  }
  return !!(ctx && ctx._yuri);
}

/* 女女场景的体位池：把 NS_YURI_POSITION 按权重并进基础池。
   基础池被 data-extra / data-r18 扩到 150+ 条，百合体位只放一份会被
   稀释到 7% 左右，等于白加。这里按重复份数加权，让女女场景的体位
   大约四成落到磨蹭 / 剪刀式 / 69 / 坐在脸上这一组上。 */
function posPoolYuri(base){
  if (typeof NS_YURI_POSITION === 'undefined') return base.slice();
  const out = base.slice();
  const weight = Math.max(1, Math.round(base.length * 0.6 / NS_YURI_POSITION.length));
  for (let i = 0; i < weight; i++){
    NS_YURI_POSITION.forEach(p => out.push(p));
  }
  return out;
}

/* 女女场景要挡掉的中文动作句（必须有阴茎才成立的那些） */
const YURI_BLOCK_ZH = /阴茎|肉棒|龟头|柱身|根部|整根|精液|白浊|前列腺|阴囊|睾丸|射精|射进|射在|灌满|咽下|含到/;

/* 女女场景要挡掉的英文 tag（同上，英文侧） */
const YURI_BLOCK_EN = /erection|penis|cock\b|glans|semen|precum|testicle|scrotum|balls\b|shaft|futanari|paizuri|fellatio|handjob|footjob|creampie|facial|bukkake|deepthroat/i;

/* 百合英文补充片段：从 NS_YURI_TAG_EN 里抽 n 条 */
function yuriPick(n){
  if (typeof NS_YURI_TAG_EN === 'undefined' || !NS_YURI_TAG_EN.length) return [];
  return fyShuffle(NS_YURI_TAG_EN).slice(0, n || 2);
}

/* 女女场景的指代修正：同样是"年龄差 / 群交"，对象只能是女性。
   NS_TAG_EN.agegap 写的是 "older man, younger girl"，
   直接落进两个女孩的提示词里就成了画不出来的东西。 */
const YURI_TERM_FIX = [
  [/older man, younger girl/gi, 'older woman, younger girl'],
  [/older man/gi, 'older woman'],
  [/multiple boys/gi, 'multiple girls']
];
function yuriTerms(arr){
  return (arr || []).map(x => {
    let s = String(x);
    YURI_TERM_FIX.forEach(pair => { s = s.replace(pair[0], pair[1]); });
    return s;
  });
}

/* =========================================================
   物理状态推演与冲突消解（规则见 data-conflict.js）
   ---------------------------------------------------------
   随机抽池的老问题是「各抽各的」：口球、口交、台词三者互相独立，
   抽到一起就成了 AI 画不出来、读着也别扭的组合。这里把顺序反过来——
   先确定「身体的物理状态」（嘴被占 / 手被绑 / 眼被蒙 / 下体上锁…），
   再拿这个状态去过滤后面所有池与标签。
   ========================================================= */

/* 用嘴完成的标签：抽到这些就不再给这个人上口球 */
const MOUTH_TAGS = ['oral', 'deepthroat', 'swallow', 'rimming', 'cunnilingus'];
/* 用手完成的标签：抽到这些就跳过束缚具，免得"手被绑着还能自慰" */
const HAND_TAGS = ['masturb', 'handjob', 'toy', 'fisting'];

function factsFromTextOf(text, set){ if (typeof cfFactsFrom === 'function') cfFactsFrom(text, set); return set; }
function factsFromTagsOf(tags, set){
  if (typeof cfFactsFromTag === 'function') (tags || []).forEach(id => cfFactsFromTag(id, set));
  return set;
}
function factsFromItemsOf(items, set){
  if (typeof cfFactsFromItem === 'function') (items || []).forEach(x => cfFactsFromItem(x, set));
  return set;
}
/* 悬吊 / 头套 会连带出其他状态，这里统一补齐（与 data-conflict.js 的 cfFacts 保持一致） */
function factsClose(set){
  if (set.has('suspended')){ set.add('restrained'); set.add('handsBound'); set.add('legsBound'); }
  if (set.has('hooded')) set.add('blindfolded');
  return set;
}
/* 事实集安全读取：历史 / 收藏条目经 JSON 往返后 __facts 会从 Set 变成普通对象
   （JSON.stringify(new Set()) → {}），直接当 Set 用会 TypeError: add is not a function。
   所有读取点一律走这里：不是真 Set 就当空集处理，绝不把毒对象往下传。 */
function factsOf(scene){
  return (scene && scene.__facts instanceof Set) ? scene.__facts : new Set();
}
function factsOrNull(scene, ctx){
  if (scene && scene.__facts instanceof Set) return scene.__facts;
  if (ctx && ctx.__facts instanceof Set) return ctx.__facts;
  return null;
}
/* 依据当前上下文（标签 + 指定字段）推演事实，追加进 scene.__facts */
function factsOfCtx(ctx, scene, keys){
  const set = factsOf(scene);
  factsFromTagsOf(actTags(ctx), set);
  if (scene && scene.fields){
    const ks = keys || Object.keys(scene.fields);
    ks.forEach(k => {
      const f = scene.fields[k];
      if (!f) return;
      factsFromTextOf(f.zh || '', set);
      factsFromTextOf(f.en || '', set);
    });
  }
  factsClose(set);
  nudeFactsFix(ctx, set);
  if (scene) scene.__facts = set;
  return set;
}
/* 事实感知的池过滤（对字符串池 / 标签 id 列表 / 体位对象池 / 中英平行对） */
function poolByFacts(pool, facts, lang){
  if (typeof cfCleanPool !== 'function') return pool ? pool.slice() : [];
  return cfCleanPool(pool, facts, lang);
}
function tagsByFacts(ids, facts){
  if (typeof cfCleanTagIds !== 'function') return (ids || []).slice();
  return cfCleanTagIds(ids, facts);
}
function posPoolByFacts(pool, facts){
  if (typeof cfBlockRe !== 'function' || !facts.size) return pool;
  const rz = [], re = [];
  facts.forEach(f => {
    const a = cfBlockRe(f, 'zh'); if (a) rz.push(a);
    const b = cfBlockRe(f, 'en'); if (b) re.push(b);
  });
  if (!rz.length && !re.length) return pool;
  const out = pool.filter(p =>
    !rz.some(r => r.test(String(p.zh || ''))) && !re.some(r => r.test(String(p.en || ''))));
  return out.length ? out : pool;
}
/* 中英平行数组按索引同时过滤，保证 PAIR() 取到的仍是同一条 */
function pairByFacts(pair, facts){
  if (typeof cfBlockRe !== 'function' || !facts.size || !pair) return pair;
  /* 这个函数吃的是「中英平行数组对」{ zh: [...], en: [...] }。
     PAIR() 给的是单条 { zh: '…', en: '…' } —— 传进来的话下面 pair.zh[i]
     会按字符取，把整串拆成单字，提示词里就冒出 "c,l,e,a,r" 这种碎片。
     这里直接挡掉，并去两个调用点改成先过滤池再抽一条。 */
  if (typeof pair.zh === 'string' || typeof pair.en === 'string' ||
      !Array.isArray(pair.zh) || !Array.isArray(pair.en)) return pair;
  const rz = [], re = [];
  facts.forEach(f => {
    const a = cfBlockRe(f, 'zh'); if (a) rz.push(a);
    const b = cfBlockRe(f, 'en'); if (b) re.push(b);
  });
  if (!rz.length && !re.length) return pair;
  const n = Math.min(pair.zh.length, pair.en.length);
  const z = [], e = [];
  for (let i = 0; i < n; i++){
    if (rz.some(r => r.test(pair.zh[i])) || re.some(r => r.test(pair.en[i]))) continue;
    z.push(pair.zh[i]); e.push(pair.en[i]);
  }
  return z.length ? { zh: z, en: e } : pair;
}
/* 某个字段该用哪个池（被占用时换成替代池） */
function poolForField(field, base, facts, lang){
  if (typeof cfPoolFor !== 'function') return base ? base.slice() : [];
  return cfPoolFor(field, base, facts, lang);
}

/* 一条动作句可能自带**新的**物理状态——「被吊起来，脚尖几乎够不到地」
   就写在"捆绑"标签的动作池里。若这个新状态正好否定了当前体位，
   读出来就是「被按成跨坐式」+「整个人被吊起来」这种画不出来的组合。
   这里对候选句做一次预推演，把"会否定体位"的句子挡掉。 */
function actConflictsWith(text, facts, guardText){
  if (!guardText || typeof cfBlockRe !== 'function') return false;
  const t = new Set(facts);
  factsFromTextOf(text, t);
  let bad = false;
  t.forEach(f => {
    if (facts.has(f)) return;              /* 不是这句引入的，与它无关 */
    const r = cfBlockRe(f, 'zh');
    if (r && r.test(guardText)) bad = true;
  });
  return bad;
}
function pickActPool(pool, facts, guardText){
  if (!pool || !pool.length) return pool || [];
  const out = pool.filter(s => !actConflictsWith(s, facts, guardText));
  return out.length ? out : pool;
}

/* 道具抽取：器具 / 束缚具 / 口部器具 / 感官剥夺 四类按权重随机。
   勾了用嘴类标签就不抽口部器具，勾了用手类标签就跳过束缚具——
   用户的显式选择优先于随机。抽中的道具会立刻写进 facts。 */
function pickGear(ctx, facts){
  const tags = actTags(ctx);
  const usesMouth = tags.some(id => MOUTH_TAGS.indexOf(id) >= 0);
  const usesHand  = tags.some(id => HAND_TAGS.indexOf(id) >= 0);
  /* 全裸：束缚具池里「绳衣 / 皮制束带」这类带布料的条目先剔掉（麻绳、手铐照留） */
  const nudeNow = isNude(ctx);
  const poolOf = (zh, en) => {
    if (!nudeNow) return { zh: zh, en: en };
    const f = filterPair(zh, en || zh, NUDE_BLOCK_ANY);
    return f || { zh: zh, en: en };
  };
  const G_TOY   = poolOf(NS_TOY,       (typeof NS_TOY_EN !== 'undefined' ? NS_TOY_EN : null));
  const G_REST  = poolOf(NS_RESTRAINT, (typeof NS_RESTRAINT_EN !== 'undefined' ? NS_RESTRAINT_EN : null));
  const G_BLIND = poolOf(NS_BLIND,     (typeof NS_BLIND_EN !== 'undefined' ? NS_BLIND_EN : null));
  const G_GAG   = poolOf(NS_GAG,       (typeof NS_GAG_EN !== 'undefined' ? NS_GAG_EN : null));
  const groups = [
    { w: 42, zh: G_TOY.zh,   en: G_TOY.en }
  ];
  if (!usesHand) groups.push({ w: 20, zh: G_REST.zh,  en: G_REST.en });
  groups.push({ w: 14, zh: G_BLIND.zh, en: G_BLIND.en });
  if (!usesMouth) groups.push({ w: 14, zh: G_GAG.zh,  en: G_GAG.en });

  const total = groups.reduce((a, g) => a + g.w, 0);
  let r = rnd() * total, g = groups[0];
  for (let i = 0; i < groups.length; i++){ r -= groups[i].w; if (r <= 0){ g = groups[i]; break; } }

  const p = PAIR(g.zh, g.en || g.zh);
  factsFromTextOf(p.zh, facts);
  factsFromTextOf(p.en, facts);
  factsFromItemsOf([p.zh], facts);
  factsClose(facts);
  return p;
}

/* 恋物服装抽取：抽中就会带出"着衣"这类状态。
   全裸时整池换成"不依赖衣服"的部分（束缚具 / 皮革带…），
   否则会出现「一丝不挂」＋「护士服，裙子被掀到腰上」并存的画面。 */
function pickFetishPair(facts, ctx){
  let zh = NS_FETISH, en = (typeof NS_FETISH_EN !== 'undefined' ? NS_FETISH_EN : null);
  /* 梦神 / 所长法典·主题服装并入（轮次 K）：全男场景没有女性身体不并；
     全裸模式整个恋物装池都是服装，也不并 */
  if (typeof MS_CODEX_OUTFIT !== 'undefined' && MS_CODEX_OUTFIT.length &&
      typeof NS_FETISH_EN !== 'undefined' && !isNude(ctx) && (!ctx || ctx._hasPussy !== false)){
    /* 女女 / 无男场景：主题服装里带男性器官 / 精液描写的条目进不了画面；
       未勾非人题材：触手 / 藤蔓类主题服装同样不进；
       en 里混中文残片的条目用不了；嘴被占（口球等）时口交侍奉类服装不成立 */
    const noMale = (!ctx || ctx._hasPenis === false) && !anonMaleFor(ctx);
    const noNH = actTags(ctx).some(id => id === 'monster' || id === 'bestiality') === false;
    const gagged = facts && (facts.has ? facts.has('gagged') : facts.indexOf('gagged') >= 0);
    /* 主题服装是"穿在身上"的内容：条目里自带性行为描写的（乳交水手服 /
       口交侍奉…这类服饰+动作混写）一律不并 —— 动作该由动作池负责，
       混写条目会和人数 / 事实（泌乳✕乳交、口球✕口交）打架 */
    const ACT_FETISH_RE = /乳交|口交|足交|手交|足扈|后入|骑乘|颜面骑|坐在脸|坐到脸|插入|性交|交合|侍奉|传教士|paizuri|footjob|handjob|blowjob|deepthroat|irrumatio|doggystyle|\bpenetration\b|sex from behind|\bfuck|\bsex\b/i;
    const ORAL_FETISH_RE = /口交|深喉|侍奉|\boral\b|\bblowjob\b|\bdeepthroat\b|\bfellatio\b/i;
    const GAG_FETISH_RE = /口塞|口球|堵嘴|\bgag/i;
    const oralPicked = actTags(ctx).some(id => id === 'oral' || id === 'deepthroat' || id === 'swallow');
    const fits = MS_CODEX_OUTFIT.filter(e => {
      if (MS_CODEX_CJK_RE.test(e.en) || MS_CODEX_BAD_W_RE.test(e.en)) return false;
      if (ACT_FETISH_RE.test(e.zh + ' ' + e.en)) return false;
      if (noMale && MALE_ORGAN_RE.test(e.zh + ' ' + e.en)) return false;
      if (noNH && NONHUMAN_RE.test(e.zh + ' ' + e.en)) return false;
      if (gagged && ORAL_FETISH_RE.test(e.zh + ' ' + e.en)) return false;
      if (oralPicked && GAG_FETISH_RE.test(e.zh + ' ' + e.en)) return false;
      return true;
    });
    zh = NS_FETISH.concat(fits.map(e => e.zh));
    en = NS_FETISH_EN.concat(fits.map(e => msCodexEnClean(e.en)));
  }
  if (isNude(ctx)){
    const f = filterPair(zh, en || zh, NUDE_BLOCK_ANY);
    if (f){ zh = f.zh; en = f.en; }
  }
  const p = PAIR(zh, en);
  factsFromTextOf(p.zh, facts);
  factsFromItemsOf([p.zh], facts);
  factsClose(facts);
  return p;
}

/* =========================================================
   角色生成
   ========================================================= */

function genGender(ctx){
  if (ctx.gender !== 'random') return ctx.gender;
  const r = rnd();
  if (r < 0.46) return 'female';
  if (r < 0.88) return 'male';
  return 'futa';
}

function genName(ctx, gender){
  const w = WORLD_NAME[ctx.world] || WORLD_NAME.modern;
  if (w.type === 'code') return R(w.pool);
  if (w.type === 'west'){
    const first = gender === 'male' ? R(w.male) : R(w.female);
    return rnd() < 0.7 ? `${first} ${R(w.last)}` : first;
  }
  // east（扶她取女性名，本质仍是女性身体）
  const g = gender === 'male' ? R(w.male) : R(w.female);
  return rnd() < 0.85 ? `${R(w.sur)}${g}` : g;
}

/* 纯随机模式下的占位名：随机1 / 随机2 ……（中文）＋ Random 1（英文）
   选角色卡时用卡本身的姓名；不选卡时用这个，避免虚构名字干扰用户 */
function randomName(idx){
  const n = (typeof idx === 'number' ? idx : 0) + 1;
  return '随机' + n;
}
function randomNameEn(idx){
  const n = (typeof idx === 'number' ? idx : 0) + 1;
  return 'random ' + n;
}

function genAge(ctx){
  const base = ctx.world === 'campus' ? RN(18, 24)
             : ctx.world === 'office' ? RN(24, 42)
             : ctx.world === 'xianxia' ? RN(100, 900)
             : RN(19, 38);
  return ctx.world === 'xianxia' ? String(base) + ' 岁（修士）' : String(base) + ' 岁';
}

/* NSFW 场景下，视角模板里的 A 固定是被插入的一方，B 是插入的一方。
   因此随机模式下让 A 优先为女性/扶她，并保证场上有阴茎。 */
function planGenders(ctx){
  const arr = [];
  /* 男/女人数精确构成（2026-10-09）：ctx.genderMix = {male, female} 且总数>0 时
     按构成分配再洗牌；只在夜灯（NSFW）下生效，清水仍走随机/性别下拉。
     「角色性别」选「扶她」时把女生位换成扶她，其余下拉取值由人数说了算。 */
  const mix = ctx.genderMix;
  if (ctx.mode === 'nsfw' && mix &&
      ((mix.male || 0) + (mix.female || 0)) > 0){
    const femG = ctx.gender === 'futa' ? 'futa' : 'female';
    for (let i = 0; i < (mix.female || 0); i++) arr.push(femG);
    for (let i = 0; i < (mix.male || 0); i++) arr.push('male');
    for (let i = arr.length - 1; i > 0; i--){
      const j = Math.floor(rnd() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
  for (let i = 0; i < ctx.actors; i++) arr.push(genGender(ctx));
  if (ctx.mode !== 'nsfw' || ctx.gender !== 'random') return arr;

  if (ctx.actors === 1){
    const r = rnd();
    arr[0] = r < 0.80 ? 'female' : (r < 0.90 ? 'futa' : 'male');
    return arr;
  }
  arr[0] = rnd() < 0.90 ? 'female' : 'futa';
  if (!arr.some(g => g === 'male' || g === 'futa')){
    arr[Math.floor(rnd() * (arr.length - 1)) + 1] = rnd() < 0.85 ? 'male' : 'futa';
  }
  return arr;
}

/* 男性外观性别适配（轮次 AA）：随机男不抽女式发型 / 女性鞋袜 / 高腰女装。
   否则底模会把（无脸）男画成女性——「一女多男出现多个女性」观感的根因 */
const MASC_HAIR_BAD_ZH = /长发|波浪|马尾|辫|公主|姬发|盘发|丸子|羊毛|灯笼/;
const MASC_HAIR_BAD_EN = /long|wavy|ponytail|twin tails|twintails|braid|hime|princess|bun|curl|lantern/i;
const FEM_WEAR_ZH = /裙|吊带|露脐|抹胸|胸罩|文胸|蕾丝|丁字裤|丝袜|连裤袜|高跟|襦裙|旗袍|袜圈|吊袜带|一字肩|泡泡袖|高腰|过膝袜|及膝袜|长筒袜|渔网/;
const FEM_WEAR_EN = /skirt|dress|blouse|camisole|lace|garter|panties|thong|stocking|pantyhose|heel|crop top|croptop|sailor|high-?waisted|thigh-?high socks|knee-?high socks|loose socks/i;
function mascPairOk(z, en){ return !FEM_WEAR_ZH.test(z) && !FEM_WEAR_EN.test(en); }
function mascHairOk(z, en){ return !MASC_HAIR_BAD_ZH.test(z) && !MASC_HAIR_BAD_EN.test(en); }
function mascFilterPair(zA, eA, ok){
  const z2 = [], e2 = [];
  zA.forEach((z, i) => { if (ok(z, eA[i] || '')){ z2.push(z); e2.push(eA[i] || ''); } });
  return (z2.length && e2.length) ? [z2, e2] : [zA, eA];
}

function makeChar(ctx, idx, forcedGender){
  const gender = forcedGender || genGender(ctx);
  const c = {
    idx,
    gender,
    fields: {},
    meta: { world: ctx.world, name: '' }
  };

  const F = (key, label, zh, en) => { c.fields[key] = { key, label, zh, en: en || '', locked: false }; };

  /* --- 基础 --- */
  /* 不指定角色卡时用「随机N」占位，不再虚构人名 */
  const randMode = ctx.randName !== false;
  const name = randMode ? randomName(idx) : genName(ctx, gender);
  c.meta.name = name;
  c.meta.randName = randMode;
  F('name', '姓名', name, randMode ? randomNameEn(idx) : '');
  F('age', '年龄', genAge(ctx));
  F('gender', '性别', { female: '女性', male: '男性', futa: '扶她' }[gender]);
  F('role', '身份', R(SFW_ROLE[ctx.world] || SFW_ROLE.modern));

  /* --- 外貌 --- */
  /* 无脸男（轮次 Y）：女在场的多人 NSFW 场景，未指定男角色卡时随机男性
     一律无脸化——发色只出灰 / 黑，不生成瞳色与表情，加 faceless male。
     选了男角色卡时该槽位由 applyPickedCards 整体替换，不受影响。 */
  const flM = ctx.mode === 'nsfw' && (ctx.actors || 1) >= 2 && gender === 'male'
    && Array.isArray(ctx._genders) && ctx._genders.indexOf('female') >= 0;
  let hc = PAIR(HAIR_COLOR, HAIR_COLOR_EN);
  const hsA = (gender === 'male') ? mascFilterPair(HAIR_STYLE, HAIR_STYLE_EN, mascHairOk) : [HAIR_STYLE, HAIR_STYLE_EN];
  const hs = PAIR(hsA[0], hsA[1]);
  if (flM){ const ci = RI([0, 1]); hc = PAIR([['灰色', '黑色'][ci]], [['grey hair', 'black hair'][ci]]); }
  F('hair', '发型发色', `${hs.zh} · ${hc.zh}`, `${hc.en}, ${hs.en}`);
  if (flM) F('faceless', '无脸男', '无脸男（不生成脸部）', 'faceless male');
  if (flM) F('eyes', '瞳色', '无脸（不生成）', '');
  else { const eye = PAIR(EYE_COLOR, EYE_COLOR_EN); F('eyes', '瞳色', eye.zh, eye.en); }

  const isFem = (gender !== 'male');
  /* 体型自选优先：用户锁定 Q版→大体型 时覆盖随机身材，并按权重包 (tag:w) */
  if (ctx.bodyPick && ctx.bodyPick.en){
    const w = ctx.bodyPick.weight || 1;
    const enRaw = ctx.bodyPick.en;
    const enW = (typeof weightTokens === 'function')
      ? weightTokens(enRaw, w).join(', ')
      : (w > 1.01 ? '(' + enRaw + ':' + w + ')' : enRaw);
    F('body', '身材体型', ctx.bodyPick.zh || enRaw, enW);
  } else {
    const bodyArr = isFem ? BODY_FEMALE : BODY_MALE;
    const bodyEn = isFem ? BODY_FEMALE_EN : BODY_MALE_EN;
    const bd = PAIR(bodyArr, bodyEn);
    F('body', '身材体型', bd.zh, bd.en);
  }

  F('skin', '皮肤特征', R(SKIN_FEATURE));
  const ex = flM ? { zh: '无脸（不生成）', en: '' } : PAIR(EXPRESSION, EXPRESSION_EN);
  F('expr', '表情气质', ex.zh, ex.en);

  /* --- 服装 --- */
  /* 三种走法，优先级从高到低：
     ① 全裸     —— 不写任何服装，换成一条 nude tag
     ② 手动服饰 —— 全场景统一穿这一套，不再随机上装/下装
        （手动指定时若仍随机上装，提示词里会同时出现「白衬衫」和「兔女郎装」）
        —— 手动服饰可叠加衣着状态 tag（例：兔女郎装 + 半脱 / 露胸）
     ③ 其余     —— 随机上装 / 下装 / 鞋袜（默认、随机换装都走这条） */
  const fitMode = clothMode(ctx);
  const manualFit = pickedOutfit(ctx);
  if (fitMode === 'nude'){
    F('nude', '衣着', '全裸', NS_NUDE_TAG_EN);
  } else if (manualFit){
    F('top', '成套服饰', manualFit.zh + '（手动指定）', manualFit.en);
    /* 状态叠加：露胸 + 手动服饰保留整套（不剥上装），只补状态 tag */
    const stM = outfitState(ctx);
    if (stM && stM !== 'nude') F('ostate', '衣着状态', OUTFIT_STATE_ZH[stM], OUTFIT_STATE_EN[stM]);
  } else {
    const wp = ctx.world;
    let tops = TOP_WEAR[wp] || TOP_WEAR.modern;
    let topsEn = TOP_WEAR_EN[wp] || TOP_WEAR_EN.modern;
    let btms = BOTTOM_WEAR[wp] || BOTTOM_WEAR.modern;
    let btmsEn = BOTTOM_WEAR_EN[wp] || BOTTOM_WEAR_EN.modern;
    /* 男性服装性别适配（轮次 Z）：男性不抽裙装 / 吊带 / 蕾丝袜等女性衣物，
       中英两列按索引成对过滤，全被滤空则回落原池 */
    if (gender === 'male'){
      /* 词表已提升为模块级 FEM_WEAR_ZH/EN（轮次 AA：补高腰，鞋袜共用） */
      const keep = (zA, eA) => mascFilterPair(zA, eA, mascPairOk);
      [tops, topsEn] = keep(tops, topsEn);
      [btms, btmsEn] = keep(btms, btmsEn);
    }
    const tp = PAIR(tops, topsEn);
    const bt = PAIR(btms, btmsEn);
    const skA = (gender === 'male') ? mascFilterPair(SHOES_SOCKS, SHOES_SOCKS_EN, mascPairOk) : [SHOES_SOCKS, SHOES_SOCKS_EN];
    const sk = PAIR(skA[0], skA[1]);
    /* 衣着状态：露胸时不下发上装（白衬衫和 topless 同场会打架），
       半脱 / 正常照常穿上装，再补一条状态 tag */
    const st = (fitMode === 'state') ? outfitState(ctx) : null;
    if (st === 'topless'){
      F('ostate', '衣着', OUTFIT_STATE_ZH.topless, OUTFIT_STATE_EN.topless);
    } else {
      F('top', '上装', tp.zh, tp.en);
      if (st) F('ostate', '衣着状态', OUTFIT_STATE_ZH[st], OUTFIT_STATE_EN[st]);
    }
    F('bottom', '下装', bt.zh, bt.en);
    F('socks', '鞋袜', sk.zh, sk.en);
  }
  /* 全裸还挂着项链耳环就自相矛盾了，配饰一并跳过 */
  if (fitMode !== 'nude') F('acc', '配饰', R(ACCESSORY));

  /* --- NSFW 身体 --- */
  if (ctx.mode === 'nsfw'){
    if (isFem || gender === 'futa'){
      /* 勾了「乳交 / 泌乳」就不该随机到平胸——胸是平的却挤出奶、
         或被"双手把乳房往中间推"，AI 画不出来。 */
      let brZ = NS_BREAST, brE = NS_BREAST_EN;
      const tTags = actTags(ctx);
      if (tTags.indexOf('paizuri') >= 0 || tTags.indexOf('lactation') >= 0){
        const f = filterPair(brZ, brE, /平胸|贫乳|几乎没有胸|小胸|flat chest|small breasts|tiny breasts/i);
        if (f){ brZ = f.zh; brE = f.en; }
      }
      const br = clothedBreastPair(PAIR(brZ, brE), ctx);
      F('breast', '胸部', br.zh, br.en);
      /* 上装穿着时不写「乳头乳晕」：整池都是裸露才看得见的描写，
         写进提示词 / 正文，模型就把上装画没（2026-10-09 轮次 M） */
      const np = clothedNipple(ctx);
      if (np) F('nipple', '乳头乳晕', np);
      const ph = PAIR(NS_PUBIC_HAIR, NS_PUBIC_HAIR_EN);
      F('pubic', '阴毛', ph.zh, ph.en);
      const ge = PAIR(NS_GENITAL_F, NS_GENITAL_F_EN);
      F('genital', '阴部', ge.zh, ge.en);
      const bt2 = PAIR(NS_BUTT, NS_BUTT_EN);
      F('butt', '臀部', bt2.zh, bt2.en);
      F('leg', '腿部', R(NS_LEG));
      const skn = PAIR(NS_SKIN, NS_SKIN_EN);
      F('skin2', '身体状况', skn.zh, skn.en);
    }
    if (gender === 'male' || gender === 'futa'){
      const pn = PAIR(NS_PENIS, NS_PENIS_EN);
      F('penis', '阴茎', pn.zh, pn.en);
      const pd = PAIR(NS_PENIS_DETAIL, NS_PENIS_DETAIL_EN);
      F('penisDetail', '阴茎细节', pd.zh, pd.en);
      F('penisState', '状态', R(NS_PENIS_STATE));
      if (!isFem || gender === 'futa'){
        if (gender === 'futa') F('futa', '扶她特征', R(NS_FUTA));
        if (!c.fields.butt){
          const bt2 = PAIR(NS_BUTT, NS_BUTT_EN);
          F('butt', '臀部', bt2.zh, bt2.en);
        }
      }
    }
  }

  /* --- 内在 --- */
  F('personality', '性格', R(SFW_PERSONALITY));
  F('skill', '特长', R(SFW_SKILL));
  F('quote', '口头禅', R(SFW_QUOTE));
  F('backstory', '背景', R(SFW_BACKSTORY));
  if (ctx.actors > 1) F('relation', '关系', R(SFW_RELATION));

  return c;
}

/* 单字段重掷 */
function rerollField(char, key, ctx){
  const f = char.fields[key];
  if (!f) return;
  const gender = char.gender;
  const isFem = gender !== 'male';
  const wp = ctx.world;
  let p;

  switch (key){
    case 'name': {
      if (char.meta && char.meta.randName){
        char.meta.name = randomName(char.idx); f.zh = char.meta.name; f.en = randomNameEn(char.idx); return;
      }
      const n = genName(ctx, gender);
      char.meta.name = n; f.zh = n; return;
    }
    case 'age':  f.zh = genAge(ctx); return;
    case 'role': f.zh = R(SFW_ROLE[wp] || SFW_ROLE.modern); return;
    case 'hair': {
      const hc = PAIR(HAIR_COLOR, HAIR_COLOR_EN);
      const hsA = (gender === 'male') ? mascFilterPair(HAIR_STYLE, HAIR_STYLE_EN, mascHairOk) : [HAIR_STYLE, HAIR_STYLE_EN];
      const hs = PAIR(hsA[0], hsA[1]);
      f.zh = `${hs.zh} · ${hc.zh}`; f.en = `${hc.en}, ${hs.en}`; return;
    }
    case 'eyes': p = PAIR(EYE_COLOR, EYE_COLOR_EN); f.zh = p.zh; f.en = p.en; return;
    case 'body':
      p = isFem ? PAIR(BODY_FEMALE, BODY_FEMALE_EN) : PAIR(BODY_MALE, BODY_MALE_EN);
      f.zh = p.zh; f.en = p.en; return;
    case 'skin':  f.zh = R(SKIN_FEATURE); return;
    case 'expr':  p = PAIR(EXPRESSION, EXPRESSION_EN); f.zh = p.zh; f.en = p.en; return;
    case 'top':   p = PAIR(TOP_WEAR[wp] || TOP_WEAR.modern, TOP_WEAR_EN[wp] || TOP_WEAR_EN.modern); f.zh = p.zh; f.en = p.en; return;
    case 'bottom':p = PAIR(BOTTOM_WEAR[wp] || BOTTOM_WEAR.modern, BOTTOM_WEAR_EN[wp] || BOTTOM_WEAR_EN.modern); f.zh = p.zh; f.en = p.en; return;
    case 'socks': {
      const sA = (gender === 'male') ? mascFilterPair(SHOES_SOCKS, SHOES_SOCKS_EN, mascPairOk) : [SHOES_SOCKS, SHOES_SOCKS_EN];
      p = PAIR(sA[0], sA[1]); f.zh = p.zh; f.en = p.en; return;
    }
    case 'acc':   f.zh = R(ACCESSORY); return;
    case 'personality': f.zh = R(SFW_PERSONALITY); return;
    case 'skill': f.zh = R(SFW_SKILL); return;
    case 'quote': f.zh = R(SFW_QUOTE); return;
    case 'backstory': f.zh = R(SFW_BACKSTORY); return;
    case 'relation': f.zh = R(SFW_RELATION); return;
    case 'breast': p = clothedBreastPair(PAIR(NS_BREAST, NS_BREAST_EN), ctx); f.zh = p.zh; f.en = p.en; return;
    case 'nipple': { const np = clothedNipple(ctx); f.zh = np || BREAST_FALLBACK_ZH; return; }
    case 'pubic': p = PAIR(NS_PUBIC_HAIR, NS_PUBIC_HAIR_EN); f.zh = p.zh; f.en = p.en; return;
    case 'genital': p = PAIR(NS_GENITAL_F, NS_GENITAL_F_EN); f.zh = p.zh; f.en = p.en; return;
    case 'butt': p = PAIR(NS_BUTT, NS_BUTT_EN); f.zh = p.zh; f.en = p.en; return;
    case 'leg': f.zh = R(NS_LEG); return;
    case 'skin2': p = PAIR(NS_SKIN, NS_SKIN_EN); f.zh = p.zh; f.en = p.en; return;
    case 'penis': p = PAIR(NS_PENIS, NS_PENIS_EN); f.zh = p.zh; f.en = p.en; return;
    case 'penisDetail': p = PAIR(NS_PENIS_DETAIL, NS_PENIS_DETAIL_EN); f.zh = p.zh; f.en = p.en; return;
    case 'penisState': f.zh = R(NS_PENIS_STATE); return;
    case 'futa': f.zh = R(NS_FUTA); return;
    default: return;
  }
}

/* =========================================================
   场景生成
   ========================================================= */

function makeScene(ctx){
  const s = { fields: {} };
  const F = (key, label, zh, en) => { s.fields[key] = { key, label, zh, en: en || '', locked: false }; };
  const wp = ctx.world;
  const sp = (ctx && ctx.scenePick) ? ctx.scenePick : {};

  /* 场景自选：用户锁定的字段优先；未锁的继续随机 */
  function pickOrPair(key, zhPool, enPool){
    if (sp[key]){
      const zh = sp[key];
      let en = zh;
      if (zhPool && enPool){
        const i = zhPool.indexOf(zh);
        if (i >= 0 && enPool[i]) en = enPool[i];
      }
      return { zh, en };
    }
    return PAIR(zhPool, enPool);
  }

  const pl = pickOrPair('place', PLACE[wp] || PLACE.modern, (PLACE_EN[wp] || PLACE_EN.modern));
  F('place', '场所', pl.zh, pl.en);
  const tm = pickOrPair('time', TIME_LIGHT, TIME_LIGHT_EN);
  F('time', '时间光线', tm.zh, tm.en);
  const md = pickOrPair('mood', MOOD_ATMOS, MOOD_ATMOS_EN);
  F('mood', '氛围', md.zh, md.en);
  /* 单人场景剔除"双人互动/交合处特写"这类必须有第二个人才成立的构图
     （匿名男性在场时例外：disembodied penis 的交合特写反而成立） */
  let cmP = { zh: CAMERA.slice(), en: CAMERA_EN.slice() };
  if (ctx.actors < 2 && !anonMaleFor(ctx)){
    const cf = filterPair(cmP.zh, cmP.en, /joined part|two people|交合处|双人互动/i);
    if (cf) cmP = cf;
  }
  /* 先占位，值留到分支里填——NSFW 下构图要服从物理状态
     （蒙着眼就不可能 eye contact），而事实要到分支里才推演出来 */
  F('camera', '构图镜头', '', '');

  if (ctx.mode === 'sfw'){
    if (sp.camera){
      const i = cmP.zh.indexOf(sp.camera);
      s.fields.camera.zh = sp.camera;
      s.fields.camera.en = (i >= 0 && cmP.en[i]) ? cmP.en[i] : sp.camera;
    } else {
      const cm = PAIR(cmP.zh, cmP.en);
      s.fields.camera.zh = cm.zh; s.fields.camera.en = cm.en;
    }
    F('action', '行为姿态', sp.action || R(SFW_ACTION));
    F('tone', '情绪基调', sp.tone || R(SFW_TONE));
  } else {
    /* ---------- NSFW：先定「身体限制」，再据此抽其余池 ----------
       口球 + 口交、眼罩 + 对视、绑手 + 自慰这类组合物理上不成立，
       所以抽取顺序反过来：道具 → 事实 → 体位 → 动作 / 声音 / 台词。 */
    const facts = new Set(ctx.__preFacts || []);   /* 角色自身的身体条件（平胸 / 泌乳…）*/
    factsFromTagsOf(actTags(ctx), facts);

    /* 道具（决定嘴 / 手 / 眼是否被占）与恋物服装先抽，抽完立刻更新事实 */
    const gear = pickGear(ctx, facts);
    const fe   = pickFetishPair(facts, ctx);

    /* 体位：先按身体条件筛，再按事实筛（被吊起来就抽不到骑乘 / 跪姿）。
       女女场景并入 NS_YURI_POSITION：磨蹭 / 剪刀式 / 69 / 坐在脸上这些 */
    let posPool = (ctx._yuri && ctx.actors >= 2) ? posPoolYuri(NS_POSITION) : NS_POSITION;
    if (ctx.actors < 2){
      const g = ctx._gender0 || ctx.gender;
      if (g === 'male' || g === 'female' || g === 'futa'){
        /* 匿名男性在场：对方虽不可见，插入 / 口交类体位物理上成立，按男+女取池 */
        posPool = posPoolFor(g === 'male' || g === 'futa' || !!anonMaleFor(ctx), g !== 'male');
      }
      /* 单人场景还要剔除天然需要第二个人的体位：面对面 / 背抱 / 后入 /
         剪刀式 / 坐在脸上…（一个人做不出来）。匿名男性在场时不剔。 */
      if (!anonMaleFor(ctx)){
        const soloPos = posPool.filter(p => !SOLO_POS_BLOCK.test(String(p.zh || '')));
        if (soloPos.length) posPool = soloPos;
      }
    }
    /* 梦神法典姿势按人数组合 + 部位并入（轮次 K）。必须放在单人 posPoolFor
       重置之后——那一步会拿原始 NS_POSITION 重建池，提前并进去会被冲掉。
       并入后仍走全裸 / 事实冲突过滤。 */
    posPool = msCodexMerge(posPool, ctx);
    /* 全裸：体位池里「把裙子掀到腰上按住」「隔着丝袜慢慢地磨」这类
       必须有衣服才成立的条目要剔掉 —— data-extra 的 EX_NSFW_ACT 会整批并进体位池 */
    posPool = nudeSafePos(posPool, ctx);
    posPool = posPoolByFacts(posPool, facts);
    /* 体位类别：用户选定 front / back / ride / oral 后整池按类过滤 */
    posPool = applyPosCat(posPool, ctx);
    /* 勾了「触手怪物 / 兽交」→ 体位整组换成非人插入写法（见 NONHUMAN_POS） */
    let pos = pickPosAny(posPool, ctx, facts);
    /* 体位本身也可能自带限制（"手腕缚在床头"），再推一轮 */
    factsFromTextOf(pos.zh, facts);
    factsFromTextOf(pos.en, facts);
    factsClose(facts);

    /* 动作细节：标签整键按事实屏蔽，再逐条过滤中文池 */
    const tagIds = tagsByFacts(actTags(ctx), facts);
    const isSolo = ctx.actors < 2;
    const anon = anonMaleFor(ctx);   /* 匿名男性在场：单人按"有对方"处理 */
    /* 单人场景整池换成单人可成立的写法（含住自己的手指 / 器具抵着…），
       否则"动作细节"一栏会显示"低头含住，一路舔到根部"这种需要对方的话。
       匿名男性在场时例外：口交 / 乳交这些"对别人做"的句子正是本意。 */
    let tagPool = (isSolo && !anon) ? soloTagActsZh(ctx, facts) : fromTagPoolArrCtx(ctx, tagIds);
    if (!tagPool.length) tagPool = (isSolo && !anon) ? soloActPool(facts) : NS_ACTION;
    /* 女女：并入百合动作池（手指 / 口 / 磨蹭），并挡掉"必须有阴茎"的句子 */
    if (ctx._yuri && !isSolo){
      tagPool = tagPool.concat(NS_YURI_ACTION).filter(s => !YURI_BLOCK_ZH.test(s));
    }
    tagPool = poolByFacts(tagPool, facts, 'zh');
    tagPool = pickActPool(tagPool, facts, pos.zh);
    /* 没勾「触手怪物」就不许凭空长出触手；人数不够就不许出现群交句 */
    tagPool = guardActPool(tagPool, ctx);
    /* 全裸：动作细节里同样不能出现依赖衣服的句子 */
    tagPool = nudeSafeZh(tagPool);
    const tagAct = tagPool.length ? R(tagPool)
      : R(nudeSafeZh((ctx._yuri && !isSolo) ? NS_YURI_ACTION : NS_ACTION));

    /* 动作句本身也可能带出新的物理状态——「被吊起来，脚尖几乎够不到地」
       就写在"捆绑"标签的动作池里。它在体位抽完之后才出现，于是"悬空"
       配上"跨坐/跪姿"就成了画不出来的组合。这里动作抽完补推一轮事实，
       与已抽的体位冲突就把体位重掷掉（最多 12 轮，避免死循环）。 */
    factsFromTextOf(tagAct, facts);
    factsClose(facts);
    for (let g = 0; g < 12; g++){
      const rz = [], re = [];
      facts.forEach(k => {
        const a = cfBlockRe(k, 'zh'); if (a) rz.push(a);
        const b = cfBlockRe(k, 'en'); if (b) re.push(b);
      });
      const bad = rz.some(r => r.test(String(pos.zh || ''))) ||
                  re.some(r => r.test(String(pos.en || '')));
      if (!bad) break;
      posPool = posPoolByFacts(posPool, facts);
      pos = pickPosAny(posPool, ctx, facts);
      factsFromTextOf(pos.zh, facts);
      factsFromTextOf(pos.en, facts);
      factsClose(facts);
    }

    /* 声音 / 台词 / 体液 / 高潮反应：一律在「最终事实」下抽。
       否则会出现"人被吊着，台词却是自己动"这种半句矛盾。
       单人场景还要换成单人专属池——NS_DIRTY 里的"含住，全都咽下去"
       在独处场景里是画不出来的。 */
    /* 女女场景没有阴茎，体液池要先剔掉精液 / 前列腺液这一组：
       fluidPairFor() 中英两边一起过滤，否则英文侧会漏出 semen / precum。 */
    let flPair = { zh: (isSolo && !anon ? NS_FLUID_SOLO : NS_FLUID), en: NS_FLUID_EN };
    if (!isSolo && ctx._hasPussy === false && typeof NS_FLUID_M !== 'undefined'){
      /* 全男场景没有阴道，爱液 / pussy juice 这类描写物理上不成立 */
      flPair = { zh: NS_FLUID_M, en: (typeof NS_FLUID_M_EN !== 'undefined' ? NS_FLUID_M_EN : NS_FLUID_EN) };
    } else if (ctx._yuri && typeof fluidPairFor === 'function'){
      const f2 = fluidPairFor(false, true, true);
      if (f2 && f2.zh.length && f2.en.length) flPair = { zh: f2.zh, en: f2.en };
    }
    const flPool    = pairByFacts(flPair, facts);
    const fl        = PAIR(flPool.zh, flPool.en);
    const soundPool = poolForField('sound', isSolo && !anon ? NS_SOUND_SOLO : NS_SOUND, facts, 'zh');
    const organPool = poolByFacts(isSolo && !anon ? NS_ORGASM_SOLO : NS_ORGASM, facts, 'zh');
    const dirtyPool = poolForField('dirty', isSolo && !anon ? NS_DIRTY_SOLO : NS_DIRTY, facts, 'zh');

    /* 构图：蒙眼时不能出现 eye contact / 目光交汇，全包衣时不能出现
       "隔着衣服"的视角——这些都在 facts 推完之后才定得下来 */
    if (sp.camera){
      const i = cmP.zh.indexOf(sp.camera);
      s.fields.camera.zh = sp.camera;
      s.fields.camera.en = (i >= 0 && cmP.en[i]) ? cmP.en[i] : sp.camera;
    } else {
      const cmF = pairByFacts(cmP, facts);
      const cm  = PAIR(cmF.zh.length ? cmF.zh : cmP.zh, cmF.en.length ? cmF.en : cmP.en);
      s.fields.camera.zh = cm.zh; s.fields.camera.en = cm.en;
    }

    F('position', '体位', pos.zh, pos.en);
    s.fields.position.grp = pos.grp;
    /* 'pos' = 姿势名词，「被按成跪姿后入」；'act' = 动作短语，「被按住，抵在墙上」 */
    s.fields.position.kind = pos.kind || posKindOf(pos.zh);
    F('tagact', '动作细节', tagAct);
    F('fluid', '体液', fl.zh, fl.en);
    F('sound', '声音', R(soundPool.length ? soundPool : NS_SOUND));
    F('organ', '高潮反应', R(organPool.length ? organPool : NS_ORGASM));
    /* 器具使用描写（轮次 AC）：道具行 en 追加使用过程 token */
    const tukM = toyUseKindOf(gear.zh);
    const tueM = toyUseEn(tukM);
    F('toy', '道具', gear.zh, tueM ? gear.en + ', ' + tueM : gear.en);
    F('fetish', '恋物', fe.zh, fe.en);
    F('dirty', '露骨台词', R(dirtyPool.length ? dirtyPool : NS_DIRTY));
    F('tone', '情绪基调', sp.tone || R(SFW_TONE));

    factsClose(facts);
    nudeFactsFix(ctx, facts);
    s.__facts = facts;
  }
  /* 眼睛特效自选：写入 scene，供最终提示词注入 */
  if (sp.eye && sp.eye !== '普通瞳孔'){
    let eyeEn = sp.eye;
    if (typeof EYE_SPECIAL !== 'undefined' && typeof EYE_SPECIAL_EN !== 'undefined'){
      const ei = EYE_SPECIAL.indexOf(sp.eye);
      if (ei >= 0) eyeEn = EYE_SPECIAL_EN[ei];
    }
    F('eye', '眼睛特效', sp.eye, eyeEn);
  }
  return s;
}

function rerollSceneField(scene, key, ctx){
  const f = scene.fields[key];
  if (!f) return;
  const wp = ctx.world;
  /* 单字段重掷同样要守当前场景的物理状态（口球还在，就不能重掷出一句台词） */
  const facts = factsOf(scene);
  let p;
  switch (key){
    case 'place': p = PAIR(PLACE[wp] || PLACE.modern, PLACE_EN[wp] || PLACE_EN.modern); f.zh = p.zh; f.en = p.en; return;
    case 'time': p = PAIR(TIME_LIGHT, TIME_LIGHT_EN); f.zh = p.zh; f.en = p.en; return;
    case 'mood': p = PAIR(MOOD_ATMOS, MOOD_ATMOS_EN); f.zh = p.zh; f.en = p.en; return;
    case 'camera': {
      /* 重掷构图同样受物理状态约束（蒙眼时不能掷出 eye contact） */
      const cPair = pairByFacts({ zh: CAMERA.slice(), en: CAMERA_EN.slice() }, facts);
      const c = PAIR(cPair.zh, cPair.en);
      f.zh = c.zh; f.en = c.en; return;
    }
    case 'action': f.zh = R(SFW_ACTION); return;
    case 'tone': f.zh = R(SFW_TONE); return;
    case 'position': {
      let pool = (ctx._yuri && ctx.actors >= 2) ? posPoolYuri(NS_POSITION) : NS_POSITION;
      pool = msCodexMerge(pool, ctx);   /* 重掷同样含梦神法典姿势（轮次 K） */
      if (ctx.actors < 2){
        const g = ctx._gender0 || ctx.gender;
        if (g === 'male' || g === 'female' || g === 'futa')
          pool = posPoolFor(g === 'male' || g === 'futa', g !== 'male');
      }
      pool = posPoolByFacts(pool, facts);
      pool = nudeSafePos(pool, ctx);
      pool = applyPosCat(pool, ctx);    /* 体位类别：重掷同样保持所选类别 */
      /* 勾了「触手怪物 / 兽交」→ 重掷也保持非人插入体位（轮次 J） */
      const q = pickPosAny(pool, ctx, facts);
      f.zh = q.zh; f.en = q.en; f.grp = q.grp;
      f.kind = q.kind || posKindOf(q.zh);
      return;
    }
    case 'tagact': {
      let pool = guardActPool(
        poolByFacts(fromTagPoolArrCtx(ctx, tagsByFacts(actTags(ctx), facts)), facts, 'zh'), ctx);
      /* 重掷动作细节同样守百合口径：并入百合动作池，剔掉需要阴茎的句子 */
      if (ctx._yuri && ctx.actors >= 2){
        pool = pool.concat(NS_YURI_ACTION).filter(s => !YURI_BLOCK_ZH.test(s));
      }
      const fb = (ctx._yuri && ctx.actors >= 2) ? NS_YURI_ACTION : guardActPool(NS_ACTION, ctx);
      f.zh = pool.length ? R(pool) : R(fb); return;
    }
    case 'fluid': {
      /* 先按事实过滤平行池，再抽一条；不能把 PAIR() 的单条结果直接塞进 pairByFacts */
      const fp = pairByFacts({ zh: NS_FLUID, en: NS_FLUID_EN }, facts);
      const q = PAIR(fp.zh, fp.en);
      f.zh = q.zh; f.en = q.en; return;
    }
    case 'sound': { const pool = poolForField('sound', NS_SOUND, facts, 'zh'); f.zh = R(pool.length ? pool : NS_SOUND); return; }
    case 'organ': { const pool = poolByFacts(NS_ORGASM, facts, 'zh'); f.zh = R(pool.length ? pool : NS_ORGASM); return; }
    case 'toy': p = pickGear(ctx, facts); f.zh = p.zh; f.en = p.en; return;
    case 'fetish': p = pickFetishPair(facts, ctx); f.zh = p.zh; f.en = p.en; return;
    case 'dirty': { const pool = poolForField('dirty', NS_DIRTY, facts, 'zh'); f.zh = R(pool.length ? pool : NS_DIRTY); return; }
  }
}

/* =========================================================
   情境文本拼装
   ========================================================= */

/* 按体位分组选模板，避免"后入"的动作描写配上"正常位" */
function pickStoryTpl(ctx, scene){
  if (ctx.mode === 'sfw'){
    /* SFW 常规模板每条都含 {B}，单人场景必须换成不含 {B} 的写法，
       否则会渲染出"某人和另一个人"这种自相矛盾的句子。
       当前 SFW 池里没有单人模板，就现场合成一条。 */
    if (ctx.actors >= 2) return R(SFW_STORY_TPL);
    return SFW_SOLO_TPL[RI(SFW_SOLO_TPL)];
  }
  const pool0 = pickStoryTplPool(ctx, scene);
  /* 全裸：骨架里写死「裙子被掀到腰上」这类依赖衣物的模板先剔掉；
     全被剔光时 nudeSafeZh 会自动退回原池，不会出现空池 */
  const pool = isNude(ctx) ? nudeSafeZh(pool0) : pool0;
  /* 模板骨架本身也可能写死身体状态（「然后一点点坐下去」「交合的地方一片黏腻」），
     拼之前先按当前事实筛一遍，全被筛掉时再退回原池。 */
  const base = (scene && scene.__facts instanceof Set) ? scene.__facts : null;
  const cands = base ? pool.filter(t => tplSkeletonOk(t, base)) : pool.slice();
  const list = fyShuffle(cands.length ? cands : pool);
  return list.length ? list[0] : pool[0];
}

/* 由模板推演出的事实（与场景事实合并，用新 Set，不改原集合）。
   骨架里写死的话（例如某条模板直接写「绳索勒进手腕」）会带出 restrained，
   这些状态必须在拼装前并进场景事实，否则 {dirty}/{act} 的池仍按
   "未束缚"过滤，就会和模板自述的状态打架。
   注意：所有"断言状态"的句子都必须做成占位符（{posBind}/{selfbind}）再按事实取值，
   不要在模板里写死——写死的句子一定会绕过后面的所有过滤。 */
function tplFactsOf(tpl, base){
  const f = new Set(base || []);
  factsFromTextOf(String(tpl).replace(/\{[a-zA-Z]+\}/g, ''), f);
  factsClose(f);
  return f;
}

/* 模板候选池（不随机，供上层按事实筛） */
function pickStoryTplPool(ctx, scene){
  const tg = actTags(ctx);
  const grp = (scene && scene.fields.position && scene.fields.position.grp) || 'front';

  /* 单人优先：任何模板只要含 {B} 就会渲染成"另一个人"，
     所以单人场景必须在分组判断之前就分出去（bdsm/orgy 这些组都含 {B}）。 */
  if (ctx.actors === 1){
    const isKink = tg.includes('bdsm') || tg.includes('bondage') || tg.includes('petplay') || tg.includes('humil');
    return (isKink ? NS_STORY_TPL.soloKink.concat(NS_STORY_TPL.solo)
                   : NS_STORY_TPL.solo.slice());
  }
  if (ctx.actors >= 3) return NS_STORY_TPL.orgy.slice();

  /* 女女（百合）：优先用百合模板组（骨架里不写"插入 / 顶进去"），
     末尾挂一条通用正面模板当兜底，免得被事实筛完一条都不剩 */
  if (ctx.actors === 2 && ctx._yuri && typeof NS_STORY_TPL.yuri !== 'undefined'){
    return NS_STORY_TPL.yuri.concat([NS_STORY_TPL.third[0]]);
  }

  if (tg.includes('bdsm') || tg.includes('bondage') || tg.includes('humil') || tg.includes('petplay')){
    /* 70% 走 bdsm 组；另外 30% 落到通用组 */
    const rest = NS_STORY_TPL.third.slice(0, 1);
    if (rnd() < 0.7) return NS_STORY_TPL.bdsm.concat(rest);
  }

  /* 每个分组都把"通用正面模板"排在最后当兜底：
     否则遇到与当前事实冲突的模板（例如上着锁）、按事实筛完就一条都不剩了 */
  const generic = NS_STORY_TPL.third[0];
  if (ctx.pov === 'male') return [grp === 'oral' ? NS_STORY_TPL.male[1] : NS_STORY_TPL.male[0], generic];
  if (ctx.pov === 'female') return [grp === 'ride' ? NS_STORY_TPL.female[1] : NS_STORY_TPL.female[0], generic];
  if (ctx.pov === 'observer') return [NS_STORY_TPL.observer[0], generic];

  if (grp === 'back') return [NS_STORY_TPL.third[1], generic];
  if (grp === 'ride') return [NS_STORY_TPL.third[2], generic];
  if (grp === 'oral') return NS_STORY_TPL.oral.concat([generic]);
  return NS_STORY_TPL.third.slice();
}

/* 把模板里的 {占位符} 挖掉，只留"写死的话"，再拿事实的禁用正则过一遍。
   占位符的值来自各自的池、已经过 poolByFacts，不需要在这里重复检查。 */
function tplSkeletonOk(tpl, facts){
  if (typeof cfBlockRe !== 'function' || !facts || !facts.size) return true;
  const sk = String(tpl).replace(/\{[a-zA-Z]+\}/g, '');
  let ok = true;
  facts.forEach(f => {
    const r = cfBlockRe(f, 'zh');
    if (r && r.test(sk)) ok = false;
  });
  return ok;
}

const NUM_CN = { 1:'一', 2:'两', 3:'三', 4:'四', 5:'五', 6:'六' };

function fillTpl(tpl, fixed, dyn){
  let s = tpl;
  /* fixed 过两趟：`{bstate}` / `{ridelead}` 这类"按事实分级"的兜底句本身
     就带 `{B}`（「被{B}从身后圈住」），而 `{B}` 比它们先替换，
     单趟替换会把这半个占位符直接留在正文里。 */
  for (let pass = 0; pass < 2; pass++){
    for (const k in fixed){
      s = s.split('{' + k + '}').join(fixed[k]);
    }
  }
  for (const k in dyn){
    s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), () => R(dyn[k]));
  }
  return s;
}

/* 取角色身体描写（按性别给对应片段） */
function bodyOf(char, kind){
  const f = char.fields;
  switch (kind){
    case 'pussy':
      return f.genital ? f.genital.zh : R(NS_LEG);
    case 'penis':
      if (f.penis) return `${f.penis.zh}，${f.penisDetail.zh}`;
      return R(NS_PENIS);
    case 'breast':
      /* 上装穿着时引擎不再建 nipple 字段，这里要兜住（否则读 .zh 直接抛） */
      if (f.breast) return f.nipple ? `${f.breast.zh}，${f.nipple.zh}` : f.breast.zh;
      return R(NS_SKIN);
    case 'bioF':
      return f.genital ? `${f.breast.zh}；${f.pubic.zh}；${f.genital.zh}` : '';
    default: return '';
  }
}

function buildStory(ctx, chars, scene){
  const A = chars[0], B = chars[1] || chars[0];
  const fixed = {};
  const dyn = {};

  fixed.A = A.meta.name;
  fixed.B = B === A ? '另一个人' : B.meta.name;
  fixed.place = scene.fields.place.zh;
  fixed.time = scene.fields.time.zh;
  fixed.mood = scene.fields.mood.zh;

  if (ctx.mode === 'sfw'){
    fixed.act = scene.fields.action.zh;
    fixed.quote = scene.fields.quote ? scene.fields.quote.zh : R(SFW_QUOTE);
    fixed.rel = A.fields.relation ? A.fields.relation.zh : R(SFW_RELATION);
    const tpl = pickStoryTpl(ctx);
    return fillTpl(tpl, fixed, dyn);
  }

  /* NSFW：固定占位符 */
  const femaleChar = chars.find(c => c.gender !== 'male') || A;
  const maleChar = chars.find(c => c.gender === 'male' || c.gender === 'futa') || B;
  const hasPenis = chars.some(c => c.gender === 'male' || c.gender === 'futa');
  /* 女女（百合）：{penis} / 台词 / 动作池全部走女女版本 */
  const isYuri = yuriScene(null, chars);
  /* 全裸：动作、台词、恋物装、剧情模板都要剔掉"依赖身上的衣服"的句子 */
  const nudeNow = isNude(ctx);

  const aIsMale = (A.gender === 'male');
  const penChar = (B.fields.penis) ? B : maleChar;

  /* 当前场景的物理状态（口球 / 绑手 / 蒙眼 / 贞操带…）。
     所有"随机补全"的池都必须在它下面取，否则会漏出矛盾句——
     例如贞操带锁着，{pussy} 却抽出「被填满的地方」。 */
  const baseFacts = (scene && scene.__facts instanceof Set) ? scene.__facts : factsOfCtx(ctx, scene);

  /* 模板先选好：模板自己也会带出身体状态——{posBind} 必然渲染成「被绑成…」，
     soloKink[0] 的骨架里写死了「绳索勒进手腕」。这些状态必须并入下面的工作集，
     否则 {dirty}/{act}/{sound} 仍按"没束缚"过滤，就会出现
     「被绑成女上正骑」＋「我可以自己动」这种同段自相矛盾。 */
  const tpl = pickStoryTpl(ctx, scene);
  /* 局部工作集＝场景事实 ＋ 模板带出的事实。不写回 scene.__facts：
     后者描述的是"场景字段"，与"这一句模板怎么写"是两回事。 */
  const facts = tplFactsOf(tpl, baseFacts);

  fixed.pos = scene.fields.position.zh;
  /* 模板里的 {pussy}/{breast} 修饰的都是 A，因此一律取 A 的身体描写。
     角色卡里用户自己填的描写直接沿用（那是用户意图），
     只有"从随机池里补"的那部分才按事实过滤。 */
  fixed.pussy = aIsMale ? R(poolByFacts(NS_MALE_RECEIVE, facts, 'zh')) : bodyOf(A, 'pussy');
  fixed.penis = hasPenis ? bodyOf(penChar, 'penis')
              : R(poolByFacts(isYuri ? NS_YURI_TOOL : NS_NO_PENIS_TOOL, facts, 'zh'));
  fixed.breast = aIsMale ? R(poolByFacts(NS_MALE_CHEST, facts, 'zh')) : bodyOf(A, 'breast');
  fixed.bioF = bodyOf(femaleChar, 'bioF');
  fixed.bioM = penChar.fields.penis ? penChar.fields.penis.zh : '';
  /* {toy} 落在名词槽，用短名；「道具」字段本身仍显示完整描述 */
  fixed.toy = gearNoun(scene.fields.toy ? scene.fields.toy.zh : R(poolByFacts(NS_TOY, facts, 'zh')));
  fixed.fetish = scene.fields.fetish
    ? scene.fields.fetish.zh
    : R(nudeNow ? nudeSafeZh(poolByFacts(NS_FETISH, facts, 'zh')) : poolByFacts(NS_FETISH, facts, 'zh'));
  fixed.rel = A.fields.relation ? A.fields.relation.zh : R(SFW_RELATION);
  fixed.she = (A.gender === 'male') ? '他' : '她';
  fixed.he = (B.gender === 'male') ? '他' : '她';
  fixed.n = NUM_CN[chars.length] || (chars.length + '个');

  /* 多变占位符：每次出现重新随机
     单人场景只有一个人在场，凡是指向"另一个人"的描写都会自相矛盾：
       - {penis} 只能是道具（按摩棒之类），不能是"某人的身体部位"；
       - {fluid}/{organ}/{dirty} 要剔掉射精、灌入、被命令之类的双人台词；
       - {act} 要剔掉"从后面""握着腰把别人翻过去"这类预设了对方动作的句子。 */
  const solo = (chars.length < 2);
  const soloPenis = () => R(NS_NO_PENIS_TOOL);

  /* 当前场景的物理状态（口球 / 绑手 / 蒙眼…）已在函数开头取好（变量 facts），
     故事侧所有池都要服从它 */

  /* 单人：标签专属动作池整池替换（paizuri/handjob/anal 这些池写的是"对别人做"，
     solo 场景里同样的动作只能由自己完成）。dyn.act 与 dyn.tagact 都要换，
     否则中文故事里仍会冒出"整根送了进去"这类需要第二人的句子。
     匿名男性在场时例外：那些"对别人做"的句子正是本意（对方=看不见脸的男人）。 */
  const anon = anonMaleFor(ctx);
  const tagActs = (solo && !anon) ? soloTagActsZh(ctx)
    : poolByFacts(fromTagPoolArrCtx(ctx, tagsByFacts(actTags(ctx), facts)), facts, 'zh');
  /* SOLO_ACT_BLOCK 只在单人场景生效——多人场景本来就有"对方"，
     之前无条件过滤把「从背后」「整根送进去」这类句子也从多人池里删掉了。 */
  let actPool = (solo && !anon)
    ? NS_ACTION.filter(s => !SOLO_ACT_BLOCK.test(s)).concat(tagActs.filter(s => !SOLO_ACT_BLOCK.test(s)))
    : NS_ACTION.concat(tagActs);
  /* 女女：并入百合动作池（手指 / 口 / 磨蹭），并挡掉"必须有阴茎"的句子 */
  if (isYuri) actPool = actPool.concat(NS_YURI_ACTION).filter(s => !YURI_BLOCK_ZH.test(s));
  /* 非人题材（触手 / 怪物 / 产卵）只在勾选「触手怪物」时出现；
     群交类句子要够人数才成立 */
  /* 器具使用描写（轮次 AC）：抽中道具时并入使用过程句（×2 加权） */
  if (scene.fields && scene.fields.toy){
    const tukS = toyUseKindOf(scene.fields.toy.zh);
    const tuS = (typeof NS_TOY_USE !== 'undefined' && NS_TOY_USE[tukS]) || [];
    if (tuS.length) actPool = actPool.concat(tuS, tuS);
  }
  actPool = guardActPool(actPool, ctx);
  let actFallback = guardActPool(
    (solo && !anon) ? NS_ACTION.filter(s => !SOLO_ACT_BLOCK.test(s)) : NS_ACTION, ctx);
  /* 全裸：动作池里「把裙子一点点往上推」「把内裤拨到一边」这类必须衣服在身的
     句子要剔掉，否则正文一边说没穿、一边在解衣服。兜底池同样要过一遍。 */
  if (nudeNow){
    actPool = nudeSafeZh(actPool);
    actFallback = nudeSafeZh(actFallback);
  }

  /* 单人模板里写死的"只是自己动手"必须服从物理状态：
     手被绑着还说"自己动手"、睡着了还说主动迎合，都是画不出来的组合 */
  fixed.soloact = (facts.has('handsBound') || facts.has('restrained')) ? '只能绷着身体任它反应'
                 : facts.has('asleep') ? '半睡半醒地由着身体反应'
                 : '只是自己动手';
  /* 有些模板写死了束缚与主动姿态，同样要按事实改写，
     否则模板本身就成了漏网的矛盾来源。
     注意必须**按事实分级**：只有真 handsBound 才能说"手腕被绑"，
     光有 restrained 只说"被束着"——多说的那部分会绕过后面的所有过滤。 */
  fixed.bstate = facts.has('handsBound') ? '的手腕被绑在头顶'
               : facts.has('suspended') ? '被吊在那里，脚尖够不到地'
               : facts.has('restrained') ? '整个人被束着，动弹不得'
               : facts.has('asleep') ? '半睡半醒地靠在那里'
               : '被{B}从身后圈住';
  fixed.astate = facts.has('chastity') ? '被扶着摆好'
               : facts.has('asleep') ? '被扶着坐上去'
               : (facts.has('handsBound') || facts.has('restrained')) ? '被按着坐下去'
               : '自己坐上去';
  /* 嘴被占时"咽口水"这个动作本身就不成立 */
  fixed.gulp = facts.has('gagged') ? '被堵得噎了一下'
             : facts.has('ahegao') ? '喉头滚了一下'
             : '咽了一下';

  /* 模板里剩下的几句"写死的身体状态"同样要按事实分级——
     它们不是从池里抽的，所以 poolByFacts 管不到：
       {handnote} 「手上没停」        → 手被绑着就不成立
       {siton}    「然后一点点坐下去」→ 上着锁 / 被吊起来都不成立
       {join}     「交合的地方一片黏腻」→ 上锁 / 戴套时不是"交合"
       {ridelead} 「跨坐在{B}身上自己往下压」→ 受限时只能被摆上去 */
  fixed.handnote = facts.has('handsBound') ? '手腕被缚着，那点反应全藏不住'
                 : '手上没停，身上那点反应全都藏不住';
  fixed.siton = facts.has('chastity') ? '只能贴着锁扣一点点磨'
              : facts.has('suspended') ? '人被吊着，连坐都坐不下去'
              : (facts.has('handsBound') || facts.has('restrained')) ? '被按着慢慢放低身子'
              : '然后一点点坐下去';
  fixed.join = facts.has('chastity') ? '隔着锁扣的地方已经湿了一片，'
             : facts.has('condom') ? '隔着那一层薄薄的东西，'
             : '交合的地方一片黏腻，';
  fixed.ridelead = facts.has('chastity') ? '被按着在{B}身上磨'
                 : (facts.has('handsBound') || facts.has('restrained')) ? '被按坐在{B}身上'
                 : facts.has('asleep') ? '被扶着坐到{B}身上'
                 : '跨坐在{B}身上自己往下压';

  const fluidBase = (solo && !anon) ? NS_FLUID_SOLO : (hasPenis || anon ? NS_FLUID : NS_FLUID_F);
  const organBase = (solo && !anon) ? NS_ORGASM_SOLO : (hasPenis || anon ? NS_ORGASM : NS_ORGASM_F);
  /* 女女：在无阴茎台词池上并入百合台词（含"换我来，你躺好"这类） */
  const dirtyBase0 = (solo && !anon) ? NS_DIRTY_SOLO
                   : (hasPenis || anon) ? NS_DIRTY
                   : (isYuri ? NS_DIRTY_F.concat(NS_YURI_DIRTY) : NS_DIRTY_F);
  /* 全裸：台词池里的「贴着一层薄薄的布料来回磨」同样不成立 */
  const dirtyBase = nudeNow ? nudeSafeZh(dirtyBase0) : dirtyBase0;

  /* {act} 也要挡掉"自带新状态并否定体位"的句子（悬吊句 + 跨坐体位） */
  const posText = (scene.fields.position && scene.fields.position.zh) || '';
  dyn.act = pickActPool(
    poolByFacts(actPool.length ? actPool : actFallback, facts, 'zh'),
    facts, posText);

  /* 体位文本分两个类型（见 posKindOf）：
       'pos' 姿势名词 → 「被按成跪姿后入」
       'act' 动作短语 → 「被按住，抵在洗手台边」
     类型在 makeScene 里定好存在 fields.position.kind，重掷时会同步更新。
     动作短语本身若已经是被动句（"被压着却自己挺起腰"），再加「被按住，」
     就成了"被按住，被压着…"，所以这种情况不加前缀。 */
  const posKind = (scene.fields.position && scene.fields.position.kind) || posKindOf(posText);
  const posPassive = /^被/.test(posText);
  /* {posBind} 只能用在真有束缚的场景里。它原本无条件输出「被绑成…」，
     于是没勾任何束缚具的场景也会写出"被绑成女上正骑"，再配上
     动作/台词字段里"我可以自己动"就成了同段自相矛盾。
     没有束缚元素时退化成和 posLead 一样的按倒句。 */
  const posBound = facts.has('restrained') || facts.has('handsBound');
  fixed.posLead = posKind === 'pos' ? '被按成' + posText
                : posPassive ? posText
                : '被按住，' + posText;
  fixed.posBind = !posBound ? fixed.posLead
                : posKind === 'pos' ? '被绑成' + posText
                : posPassive ? posText
                : '被束住，' + posText;
  fixed.posHold = posKind === 'pos' ? '按成' + posText : '按住，' + posText;
  fixed.posBy   = posKind === 'pos' ? '按着' + posText : '按住，' + posText;
  fixed.posSet  = posKind === 'pos' ? '摆成' + posText : '按住，' + posText;
  fixed.posWay  = posText + '的姿势';
  /* 束缚系模板里"把绳子缠上去"这一句同样不能凭空写：
     场景没有束缚元素时改成器具自我调教，否则正文说"绳索勒进手腕"、
     字段面板却说"自己动手"，两边打架。 */
  fixed.selfbind = posBound ? '整个人被束着，胳膊被扭到身后'
                            : '把器具固定好抵在身下';
  fixed.bindnote = posBound ? '绳索勒进手腕，动一下都费劲'
                            : '稍微一动就顶到最敏感的地方，只能咬牙忍着';
  dyn.fluid = poolByFacts(fluidBase, facts, 'zh');
  dyn.sound = poolForField('sound', solo ? NS_SOUND_SOLO : NS_SOUND, facts, 'zh');
  dyn.organ = poolByFacts(organBase, facts, 'zh');
  dyn.dirty = poolForField('dirty', dirtyBase, facts, 'zh');
  dyn.quote = dyn.dirty;
  dyn.psound = NS_PAIN_SOUND;
  dyn.tagact = dyn.act;

  if (solo){
    /* NSFW 场景没有 action 字段（那是 SFW 的），有才覆盖 */
    if (scene.fields.action) fixed.act = scene.fields.action.zh;
    /* 单人模板里的 {penis} 一律换成道具/手指表述，避免"龟头"这类男性器官描写 */
    fixed.penis = R(NS_NO_PENIS_TOOL);
  }

  let s = fillTpl(tpl, fixed, dyn);

  /* 全裸：中文正文补一句衣着状态，否则读起来像是"没说穿没穿" */
  if (isNude(ctx) && typeof NS_NUDE_ZH !== 'undefined' && NS_NUDE_ZH.length){
    s = R(NS_NUDE_ZH) + '，' + s;
  }

  /* 器具使用描写（轮次 AC）：正文还没有使用过程句时，在场景行后插入一句保底，
     让抽中的道具从「名字」变成「使用中的内容」（actPool 的加权句只是锦上添花） */
  if (scene.fields && scene.fields.toy && typeof NS_TOY_USE !== 'undefined'){
    const tukG = toyUseKindOf(scene.fields.toy.zh);
    const tuG = NS_TOY_USE[tukG] || [];
    if (tuG.length && !tuG.some(x => s.indexOf(x) >= 0)){
      const ls = s.split('\n');
      ls.splice(Math.min(1, ls.length - 1), 0, R(tuG) + '。');
      s = ls.join('\n');
    }
  }

  /* 收尾补一句过渡/余韵（过渡句含"两个都没停"这类双人指向，单人时跳过） */
  if (!solo && rnd() < 0.35) s += '\n' + R(NS_TRANSITION) + '。';
  return s;
}

function fromTagPoolArr(tags){
  const ids = Object.keys(NS_TAG_POOL).filter(id => tags.includes(id));
  if (!ids.length) return [];
  let out = [];
  ids.forEach(id => { out = out.concat(NS_TAG_POOL[id]); });
  return out;
}

/* 勾「触手怪物」时（2026-10-10 轮次 Q）：映射 tag 的中文动作句整池换成触手版
   （默认由触手完成），未映射 tag 取原池；被事实闸掉的映射 tag（三穴同插这类
   "需要器官"的）捞回来——触手补位后单人也成立。不勾 monster 时零改动。 */
function fromTagPoolArrCtx(ctx, tags){
  const out = fromTagPoolArr(tags);
  const yuriOn = !!ctx._yuri && typeof NS_TAG_POOL_YURI !== 'undefined';
  const kinds = nonhumanKinds(ctx);
  const nh = kinds.monster || kinds.bestiality;
  /* 多人默认化（轮次 Z）：男性 ≥2 时映射 tag 换多人版（多人口交 / 多人手交…） */
  const males = (ctx._genders || []).filter(g => g === 'male').length;
  const multiOn = males >= 2 && typeof NS_TAG_POOL_MULTI !== 'undefined';
  if (!nh && !yuriOn && !multiOn) return out;
  const act = actTags(ctx).concat(ctx.tags || []);
  const merged = (tags || []).slice();
  act.forEach(id => {
    const mapped = (nh && nhMappedSentencePool(id, kinds).length)
      || (yuriOn && NS_TAG_POOL_YURI[id])
      || (multiOn && NS_TAG_POOL_MULTI[id]);
    if (mapped && merged.indexOf(id) < 0) merged.push(id);
  });
  const out2 = []; let hit = false;
  merged.forEach(id => {
    const nhS = nh ? nhMappedSentencePool(id, kinds) : [];
    const yuS = (yuriOn && NS_TAG_POOL_YURI[id]) || [];
    const muS = (multiOn && NS_TAG_POOL_MULTI[id]) || [];
    const extra = nhS.concat(yuS, muS);
    if (extra.length){ out2.push.apply(out2, extra); hit = true; }
    else if (NS_TAG_POOL[id]) out2.push.apply(out2, NS_TAG_POOL[id]);
  });
  return hit ? out2 : out;
}

/* =========================================================
   AI 绘图提示词拼装
   ========================================================= */

/* 单个角色的提示词片段，供整组提示词与"人物卡提示词"共用 */
function charPromptParts(c, ctx){
  const out = [];
  const f = c.fields;
  if (f.faceless && f.faceless.en) out.push(f.faceless.en);
  if (f.hair && f.hair.en) out.push(f.hair.en);
  if (f.eyes && f.eyes.en) out.push(f.eyes.en);
  if (f.body && f.body.en) out.push(f.body.en);
  if (f.expr && f.expr.en) out.push(f.expr.en);
  /* 全裸：衣着字段换成 nude 那一条，且不再有 top / bottom / socks */
  if (f.nude && f.nude.en) out.push(f.nude.en);
  if (f.top && f.top.en) out.push(f.top.en);
  if (f.ostate && f.ostate.en) out.push(f.ostate.en);   /* 衣着状态：半脱 / 露胸 / 正常着衣 */
  if (f.bottom && f.bottom.en) out.push(f.bottom.en);
  if (f.socks && f.socks.en) out.push(f.socks.en);
  if (ctx.mode === 'nsfw'){
    if (f.breast && f.breast.en) out.push(f.breast.en);
    if (f.pubic && f.pubic.en) out.push(f.pubic.en);
    if (f.genital && f.genital.en) out.push(f.genital.en);
    if (f.penis && f.penis.en) out.push(f.penis.en);
    if (f.penisDetail && f.penisDetail.en) out.push(f.penisDetail.en);
    if (f.butt && f.butt.en) out.push(f.butt.en);
    if (f.skin2 && f.skin2.en) out.push(f.skin2.en);
  }
  return out;
}

/* 取当前底模配置；没传就用 Illustrious（光辉） */
function modelCfg(key){
  return MODEL_PRESETS[key] || MODEL_PRESETS.illustrious;
}

/* 画风词（画质词交给底模预设，避免重复堆砌）
   优先级：手选画师串 > 画风预设 > 随机画风
   ctx.artistPicks：用户在「画师」面板选中的画师标签串数组 */
function styleParts(ctx, forceAnime){
  /* 1. 手动选中的画师（可多选，全部追加）*/
  if (ctx.artistPicks && ctx.artistPicks.length){
    const out = [];
    ctx.artistPicks.forEach(s => { if (s) out.push(s); });
    if (out.length) return out;
  }
  /* 2. 画风预设 */
  let styleKey = ctx.artstyle;
  if (forceAnime) styleKey = 'anime';
  if (styleKey === 'random' || !ART_STYLE[styleKey]){
    styleKey = R(Object.keys(ART_STYLE));
  }
  return ART_STYLE[styleKey].slice();
}

/* 按底模拼出头部画质词与尾部收尾标签 */
function modelHead(ctx){
  const M = modelCfg(ctx.model);
  return M.prefix ? M.prefix.slice() : QUALITY_TAG.slice();
}
function modelTail(ctx){
  const M = modelCfg(ctx.model);
  const out = [];
  if (M.suffix && M.suffix.length) out.push.apply(out, M.suffix);
  if (M.rating) out.push(ctx.mode === 'nsfw' ? M.rating.nsfw : M.rating.sfw);
  if (M.year) out.push(M.year);
  if (M.style) out.push.apply(out, M.style);
  return out;
}

function dedupeJoin(parts){
  const seen = new Set();
  const out = [];
  parts.forEach(p => {
    const k = String(p).trim().toLowerCase();
    if (!k || seen.has(k)) return;
    seen.add(k); out.push(String(p).trim());
  });
  return out.join(', ');
}

/* 人物卡专用提示词 = 基础提示词
   只描述人本身：人数/性别 + 发型发色 + 瞳色 + 身材 + 表情 + 服装鞋袜 + （NSFW）身体特征
   不含场景、动作、画风与画质词 —— 这些由最终提示词再往上拼。
   形如：1girl, silver grey short hair, side ponytail, pink-purple eyes */
function buildCharPrompt(char, ctx, withBody){
  const parts = [];
  parts.push(char.gender === 'male' ? '1boy' : '1girl');
  const f = char.fields || {};
  parts.push(f.hair && f.hair.en ? f.hair.en : '');
  parts.push(f.eyes && f.eyes.en ? f.eyes.en : '');
  parts.push(f.body && f.body.en ? f.body.en : '');
  parts.push(f.expr && f.expr.en ? f.expr.en : '');
  parts.push(f.top && f.top.en ? f.top.en : '');
  parts.push(f.bottom && f.bottom.en ? f.bottom.en : '');
  parts.push(f.socks && f.socks.en ? f.socks.en : '');
  if (withBody !== false && ctx.mode === 'nsfw'){
    parts.push(f.breast && f.breast.en ? f.breast.en : '');
    parts.push(f.pubic && f.pubic.en ? f.pubic.en : '');
    parts.push(f.penis && f.penis.en ? f.penis.en : '');
    parts.push(f.butt && f.butt.en ? f.butt.en : '');
  }
  return stripCoveredChest(dedupeJoin(parts), ctx);
}

/* 随机生成一套"只含外貌"的基础提示词 + 默认服饰 + 中文外貌备注
   形如：base  = 1girl, silver grey short hair, side ponytail, pink-purple eyes
         outfit = white shirt, pleated skirt, loafers
   服饰单独拆出来（2026-10-09）：编辑器里「基础提示词」只写外貌、「默认服饰」写穿搭，
   存卡后与预设卡同构（core / outfit 分离），全裸 / 随机换装时引擎能整段剥掉。 */
function genBasePrompt(ctx, gender){
  const g = gender || genGender(ctx);
  const isFem = (g !== 'male');
  const wp = ctx.world || 'modern';
  const parts = [];
  const wears = [];   /* 成套服饰：上装 / 下装 / 鞋袜，单独返回不给 base */

  parts.push(g === 'male' ? '1boy' : '1girl');

  const hc = PAIR(HAIR_COLOR, HAIR_COLOR_EN);
  const hsA = (g === 'male') ? mascFilterPair(HAIR_STYLE, HAIR_STYLE_EN, mascHairOk) : [HAIR_STYLE, HAIR_STYLE_EN];
  const hs = PAIR(hsA[0], hsA[1]);
  parts.push(hc.en, hs.en);

  const eye = PAIR(EYE_COLOR, EYE_COLOR_EN);
  parts.push(eye.en);

  const bd = isFem ? PAIR(BODY_FEMALE, BODY_FEMALE_EN) : PAIR(BODY_MALE, BODY_MALE_EN);
  parts.push(bd.en);

  const ex = PAIR(EXPRESSION, EXPRESSION_EN);
  parts.push(ex.en);

  const wM = (g === 'male');
  const wt = wM ? mascFilterPair(TOP_WEAR[wp] || TOP_WEAR.modern, TOP_WEAR_EN[wp] || TOP_WEAR_EN.modern, mascPairOk) : [TOP_WEAR[wp] || TOP_WEAR.modern, TOP_WEAR_EN[wp] || TOP_WEAR_EN.modern];
  const wb = wM ? mascFilterPair(BOTTOM_WEAR[wp] || BOTTOM_WEAR.modern, BOTTOM_WEAR_EN[wp] || BOTTOM_WEAR_EN.modern, mascPairOk) : [BOTTOM_WEAR[wp] || BOTTOM_WEAR.modern, BOTTOM_WEAR_EN[wp] || BOTTOM_WEAR_EN.modern];
  const ws = wM ? mascFilterPair(SHOES_SOCKS, SHOES_SOCKS_EN, mascPairOk) : [SHOES_SOCKS, SHOES_SOCKS_EN];
  wears.push(PAIR(wt[0], wt[1]).en);
  wears.push(PAIR(wb[0], wb[1]).en);
  wears.push(PAIR(ws[0], ws[1]).en);

  if (ctx.mode === 'nsfw'){
    if (isFem || g === 'futa'){
      parts.push(clothedBreastPair(PAIR(NS_BREAST, NS_BREAST_EN), ctx).en);
      parts.push(PAIR(NS_PUBIC_HAIR, NS_PUBIC_HAIR_EN).en);
    }
    if (g === 'male' || g === 'futa'){
      parts.push(PAIR(NS_PENIS, NS_PENIS_EN).en);
    }
    parts.push(PAIR(NS_BUTT, NS_BUTT_EN).en);
  }

  const note = [hs.zh, hc.zh, eye.zh].join('、').slice(0, 24);
  return { base: dedupeJoin(parts), outfit: dedupeJoin(wears), note: note, gender: g };
}

/* 角色的完整基础提示词 = 识别核心 + 原设服装。
   自建卡在编辑器里只填一条 base 时 core 与 outfit 都是空串，这时必须退回 card.base
   —— 否则「随机补全」会渲染出一张没有外貌的角色。
   2026-10-09 起编辑器支持单独填「默认服饰」：保存时 core = 外貌（基础提示词框内容）、
   outfit = 服饰，base = 二者拼接，与预设卡同构，全裸 / 随机换装走剥离逻辑。 */
function baseOfPreset(card){
  return [card.core, card.outfit].filter(Boolean).join(', ') || card.base || '';
}

/* 成套服饰下拉里的两个特殊值：
   - 「全裸」：不要任何服装，直接写 nude 那一条
   - 「随机换装」：明确要求引擎另抽一套（等价于旧版「随机换装」开关勾上） */
const OUTFIT_NUDE = '__nude__';
const OUTFIT_RANDOM = '__random__';
/* 衣着状态（2026-10-09 新增）：
   - 半脱     —— 成套衣服照穿，但被扒开 / 推上，内里外露
   - 露胸     —— 上身全裸，下装保留
   - 正常着衣 —— 明确穿好衣服（与全裸 / 露胸互斥，负面词里封死 nude 系） */
const OUTFIT_HALF = '__half__';
const OUTFIT_TOPLESS = '__topless__';
const OUTFIT_NORMAL = '__normal__';
/* 破损 —— 衣服照穿（保留身上原有服饰），但撕裂 / 破洞 / 挂彩；
   两种模式都可用（战斗破损场景清水也成立），可与具体服饰叠加 */
const OUTFIT_TORN = '__torn__';

/* 衣着状态对应的英文 tag 组（原文注入提示词） */
const OUTFIT_STATE_EN = {
  half:    'clothes pull, partially undressed, underwear visible',
  topless: 'topless, no bra, breasts out',
  normal:  'clothed, fully clothed',
  torn:    'torn clothes, torn fabric, ripped clothing'
};
const OUTFIT_STATE_ZH = { half: '半脱', topless: '露胸', normal: '正常着衣', torn: '破损' };

/* 当前选中的衣着状态：'nude' / 'half' / 'topless' / 'normal' 或 null。
   —— 2026-10-09 轮次 L：衣着状态与服装拆成两个选择器，
      状态读 ctx.outfitState（新），并回落读 ctx.outfitPick（旧存档兼容：
      旧版把 __nude__/__half__/__topless__/__normal__ 存在 outfitPick 里）。
   半脱 / 露胸只在夜灯下生效，清水回落 null；正常着衣两种模式都生效。 */
function outfitState(ctx){
  if (!ctx) return null;
  const s = ctx.outfitState;
  if (s === OUTFIT_NUDE) return (ctx.mode === 'nsfw') ? 'nude' : null;
  if (s === OUTFIT_HALF) return (ctx.mode === 'nsfw') ? 'half' : null;
  if (s === OUTFIT_TOPLESS) return (ctx.mode === 'nsfw') ? 'topless' : null;
  if (s === OUTFIT_NORMAL) return 'normal';
  if (s === OUTFIT_TORN) return 'torn';
  /* 旧存档兼容：状态值曾写在 outfitPick 里 */
  const p = ctx.outfitPick;
  if (p === OUTFIT_NUDE) return (ctx.mode === 'nsfw') ? 'nude' : null;
  if (p === OUTFIT_HALF) return (ctx.mode === 'nsfw') ? 'half' : null;
  if (p === OUTFIT_TOPLESS) return (ctx.mode === 'nsfw') ? 'topless' : null;
  if (p === OUTFIT_NORMAL) return 'normal';
  if (p === OUTFIT_TORN) return 'torn';
  return null;
}
/* 把状态 tag 组拆成数组；无状态 / 无对应 tag 返回 null */
function outfitStateTags(ctx){
  const s = outfitState(ctx);
  if (!s || !OUTFIT_STATE_EN[s]) return null;
  return OUTFIT_STATE_EN[s].split(',').map(x => x.trim()).filter(Boolean);
}

/* =========================================================
   上装是否穿着 —— 决定提示词里能不能出现「裸露的胸」
   ---------------------------------------------------------
   2026-10-09 轮次 M：修「选了正常着衣，正向提示词里却仍有
   nipples / areola / 乳沟，模型照样把上装画没」。
   只有「全裸」「露胸」两档算裸露；半脱是衣服被扒开、内里还在
   （underwear visible），不算。默认 / 手动服饰 / 随机换装 /
   正常着衣都是穿着上装。
   ========================================================= */
/* 手动选中的"成套服饰"本身就在露胸时，那是用户的本意，不算被遮住：
   成衣柜（ANIME_OUTFIT）与成人向成衣柜（ANIME_OUTFIT_NSFW）里
   带低胸 / 露胸开洞 / 无胸罩 / 透视语义的条目。 */
const OUTFIT_EXPOSING_EN = /cleavage|nipples?|areolas?|no bra|underboob|sideboob|topless|see-through|sheer|pasties|nippleless|revealing|erotic clothing|breastless/i;

function breastsExposed(ctx){
  if (!ctx || ctx.mode !== 'nsfw') return false;
  const st = outfitState(ctx);
  if (st === 'nude' || st === 'topless') return true;
  const fit = pickedOutfit(ctx);
  return !!(fit && OUTFIT_EXPOSING_EN.test(String(fit.en || '')));
}

/* 收尾兜底：正向提示词里还夹着"裸露的胸"的片段时统一剔除。
   来源是体位池 / 体液池 / 成衣柜里自带的 cleavage、areola、nipples 等
   （字段层清洗够不着）—— 模型读到就会把上装画没。
   2026-10-09 轮次 M。
   两条安全阀：
   ① 'covered nipples / covering nipples' 这类"挡住"的写法要放过；
   ② 括号不配对的片段（说明我们切在了某个权重括号内部）原样保留，
      宁可不删也不要把提示词切坏。 */
const CHEST_NAKED_EN = /nipples?|areolas?|cleavage|underboob|sideboob|breasts? out|topless|no bra|nipple slip/i;
const CHEST_NAKED_MODEST_EN = /^\s*\(?\s*(covered|covering|cover|hidden|shadow)/i;

/* tag 归一化：小写、剥掉权重括号与 :1.2 后缀，用来比对"这条是不是用户勾的" */
function normTag(t){
  return String(t == null ? '' : t).trim().toLowerCase()
    .replace(/^\((.*)\)$/, '$1').replace(/::?\s*[\d.]+\s*$/, '').trim();
}
/* 用户显式勾选的英文 token（动作标签 + 一键题材包）。
   收尾清洗必须放行它们：勾了「夹乳夹蒂」就不能因为"穿着上装"被引擎删掉。
   注意：只收 ctx.tags（用户勾选），不收 ctx.activeTags ——
   activeTags 还包含随机补位的 0-2 个 tag，放进去等于架空穿着清洗
   （二期扩展的 nipple_play 随机抽到就会在穿着场景漏出 nipple play）。 */
function userTagTokens(ctx){
  const set = new Set();
  const add = t => { const k = normTag(t); if (k) set.add(k); };
  if (ctx && ctx.themeTags) ctx.themeTags.forEach(add);
  if (ctx && typeof NS_TAG_EN !== 'undefined'){
    [].concat(ctx.tags || []).forEach(id => {
      const v = NS_TAG_EN[id];
      if (v) String(v).split(',').forEach(add);
    });
  }
  return set;
}

function stripCoveredChest(text, ctx){
  if (!ctx || breastsExposed(ctx)) return text;
  const allow = userTagTokens(ctx);
  /* NSFW 分支是多行结构（Anima 模板），按行处理再拼回去，别把换行拍成逗号 */
  return String(text || '').split('\n').map(line => {
    const out = [];
    line.split(',').forEach(seg => {
      const s = seg.trim();
      if (!s) return;
      if (allow.has(normTag(s))) { out.push(s); return; }   /* 用户勾的，放行 */
      const open = (s.match(/\(/g) || []).length;
      const close = (s.match(/\)/g) || []).length;
      if (open === close && CHEST_NAKED_EN.test(s) && !CHEST_NAKED_MODEST_EN.test(s)) return;
      out.push(s);
    });
    return out.join(', ');
  }).join('\n');
}

/* 只有「胸部裸露」才成立的英文 tag。
   NUDE_ONLY_TAG_EN 是整条精确匹配（/^(...|nipples out|...)$/i），
   漏掉了 NS_EN_BASE 里的 'nipples' —— 穿衣场景写出 nipples，
   模型照样把上装画没。这里补上。 */
const BREAST_BARE_TAG_EN = /^(nipples|topless|breasts out|nipples out|no bra)$/i;

/* 穿着上装时对「胸部」字段做清洗：
   按逗号分句，剔掉必须裸露才看得见的句（乳沟 / 乳晕 / 乳尖 / 乳头），
   只留隔着衣服也成立的罩杯 / 胸型 / 涨奶状态。
   事实推演用的关键词（平胸 / 贫乳 / 涨奶 / 泌乳 / 渗出奶水）都在保留句里，
   清洗不会让 data-conflict 的 flatChest / lactating 判据失准。
   整条被清空时回落到一条中性描写。 */
const BREAST_KEEP_ZH = /罩杯|巨乳|小胸|平胸|贫乳|丰满|水滴形|小而挺|涨奶|涨得发痛|渗出奶水|摊开|坠着/;
const BREAST_KEEP_EN = /\b(breasts?|chest|cup|heavy|full|soft|flat|firm|small|huge|giant|teardrop|swollen|lactating|leaking milk|spread when lying)\b/i;
const BREAST_NAKED_ZH = /乳沟|乳晕|乳尖|乳头/;
const BREAST_NAKED_EN = /nipples?|areolas?|cleavage/i;
const BREAST_FALLBACK_ZH = '胸部被上装裹着，轮廓明显';
const BREAST_FALLBACK_EN = 'breasts under clothing, outline visible';

function breastClauses(text, split, join, keepRe, nakedRe){
  return String(text || '').split(split)
    .map(x => x.trim()).filter(Boolean)
    .filter(x => !nakedRe.test(x) && keepRe.test(x))
    .join(join);
}
/* 成对清洗：中英各洗一遍；两边都空就回落到中性描写。
   全裸 / 露胸原样返回。 */
function clothedBreastPair(pair, ctx){
  if (!pair || breastsExposed(ctx)) return pair;
  const zh = breastClauses(pair.zh, /[，,]/, '，', BREAST_KEEP_ZH, BREAST_NAKED_ZH);
  const en = breastClauses(pair.en, /,/, ', ', BREAST_KEEP_EN, BREAST_NAKED_EN);
  return { zh: zh || BREAST_FALLBACK_ZH, en: en || BREAST_FALLBACK_EN };
}
/* 上装穿着时「乳头乳晕」整条不下发（返回 null），调用方跳过这个字段。
   NS_NIPPLE 整池都是"乳尖被捻红 / 乳晕上留牙印"这类裸露描写。 */
function clothedNipple(ctx){
  return breastsExposed(ctx) ? R(NS_NIPPLE) : null;
}

/* 当前衣着状态：
   'nude'     全裸（衣着状态选「全裸」）
   'manual'   手动指定了具体成套服饰（服装选择器）
   'random'   明确要求随机换装（服装选择器）
   'original' 默认 —— 不额外指定：有角色卡就用卡的原设服装；
              纯随机角色（没有卡、也就没有"原设"）由引擎随机配一套
   半脱 / 露胸 / 正常着衣（都是"状态"，见 outfitState）单独走 'state'。
   清水模式没有全裸这个概念，选了也一律当 'original'。 */
function clothMode(ctx){
  if (!ctx) return 'original';
  /* 衣着状态（含旧存档兼容）优先判定：全裸优先级最高，与具体服装互斥 */
  const st = outfitState(ctx);
  if (st === 'nude') return (ctx.mode === 'nsfw') ? 'nude' : 'original';
  const p = ctx.outfitPick;
  /* 随机换装 / 具体成套服饰（服装选择器） */
  if (p === OUTFIT_RANDOM) return 'random';
  if (p && pickedOutfit(ctx)) return 'manual';
  /* 半脱 / 露胸 / 正常着衣：都要给角色穿上衣服（状态 tag 在衣服之上改写）。
     半脱 / 露胸清水下回落 original；正常着衣两种模式都生效。 */
  if (st === 'half' || st === 'topless') return (ctx.mode === 'nsfw') ? 'state' : 'original';
  if (st === 'normal' || st === 'torn') return 'state';
  return 'original';
}
function isNude(ctx){ return clothMode(ctx) === 'nude'; }

/* 把角色卡 base 里的成套服饰串剥掉 —— 全裸时用。
   预设卡有 core（不含服装）可以直接换，但自建卡只有 base、
   原设服装就写在里面；不剥就会出现「completely nude」和「白衬衫」并存。 */
let OUTFIT_STRIP_RE = null;
function outfitStripRe(){
  if (OUTFIT_STRIP_RE) return OUTFIT_STRIP_RE;
  const escRe = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const list = []
    .concat((typeof ANIME_OUTFIT_EN !== 'undefined') ? ANIME_OUTFIT_EN : [])
    .concat((typeof ANIME_OUTFIT_NSFW_EN !== 'undefined') ? ANIME_OUTFIT_NSFW_EN : [])
    .filter(Boolean).map(escRe);
  OUTFIT_STRIP_RE = list.length ? new RegExp('(?:,\\s*)?(?:' + list.join('|') + ')', 'gi') : /(?!)/;
  return OUTFIT_STRIP_RE;
}
function stripOutfitTags(text){
  return String(text || '')
    .replace(outfitStripRe(), '')
    .replace(/\s*,\s*,+/g, ',')
    .replace(/^\s*,\s*|\s*,\s*$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/* 剥离增强：成衣柜池之外，卡上自带的 outfit 串（如 default outfit /
   black jacket, white shirt...）也要剥掉 —— 这些词不在 ANIME_OUTFIT_EN 池里，
   只靠 outfitStripRe() 剥不干净，全裸 / 换装时原衣 tag 会残留（2026-10-10）。 */
function stripCardOutfitTags(c, text){
  let out = stripOutfitTags(text);
  const of = c && (c.outfit || (c.card && c.card.outfit));
  if (of){
    const escRe = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tags = String(of).split(',').map(s => s.trim())
      .filter(s => s.length > 1).map(escRe);
    if (tags.length){
      out = out.replace(new RegExp('(?:,\\s*)?(?:' + tags.join('|') + ')', 'gi'), '')
        .replace(/\s*,\s*,+/g, ',')
        .replace(/^\s*,\s*|\s*,\s*$/g, '')
        .replace(/\s{2,}/g, ' ').trim();
    }
  }
  return out;
}

/* 全裸场景不能出现的描写：凡是依赖"身上有布料"的句子
   —— 撩起裙子 / 拨开内裤 / 衣服还挂在肩上 / 袜子一直没脱 / 围着围裙 ——
   都要从动作、台词、恋物装、剧情模板里滤掉，
   否则提示词写着 nude，正文却还在解扣子，前后自相矛盾。
   NUDE_BLOCK_ZH 给中文池用；NUDE_BLOCK_ANY 是中英合并版，给 filterPair（平行池）用。
   注意用 `(?<!更)(?<!洗)(?<!试)衣` 放过「更衣室 / 洗衣房 / 试衣间」这类地点名 ——
   那是场景，不是身上的衣服。 */
const NUDE_BLOCK_ZH = /裙|内裤|内衣|胸衣|胸罩|裤|袜|外套|领带|围裙|泳衣|浴巾|毛巾|布料|鞋|束带|拉链|制服|(?<!更)(?<!洗)(?<!试)衣/;
const NUDE_BLOCK_ANY = /裙|内裤|内衣|胸衣|胸罩|裤|袜|外套|领带|围裙|泳衣|浴巾|毛巾|布料|鞋|束带|拉链|制服|(?<!更)(?<!洗)(?<!试)衣|skirt|dress|panties|underwear|bra\b|thighhighs|pantyhose|stockings|socks|shirt|blouse|sweater|uniform|apron|kimono|swimsuit|bikini|heels|boots|jacket|necktie|ribbon|leotard|lingerie|negligee|robe|towel|latex|clothing/i;

/* 从中文池里剔掉"必须有衣服才成立"的句子；全被剔光时退回原池，避免空池 */
function nudeSafeZh(pool){
  if (!Array.isArray(pool) || !pool.length) return pool;
  const f = pool.filter(s => !NUDE_BLOCK_ZH.test(String(s)));
  return f.length ? f : pool;
}
function nudeSafeEn(pool){
  if (!Array.isArray(pool) || !pool.length) return pool;
  const f = pool.filter(s => !NUDE_BLOCK_ANY.test(String(s)));
  return f.length ? f : pool;
}
/* 体位池（对象数组）：zh / en 任一侧带服装词就剔掉 */
function nudeSafePos(pool, ctx){
  if (!isNude(ctx) || !Array.isArray(pool) || !pool.length) return pool;
  const f = pool.filter(p => !NUDE_BLOCK_ANY.test(String(p.zh || '')) && !NUDE_BLOCK_ANY.test(String(p.en || '')));
  return f.length ? f : pool;
}

/* 全裸时必须抹掉「着衣」这个事实：
   内容标签里的 roleplay / fetish 之类会推出 clothed，而 clothed 的冲突规则
   恰好屏蔽 completely nude —— 不抹掉就会出现「选了全裸却写不出全裸」。
   全裸是用户的显式选择，优先级高于随机标签的推演。 */
function nudeFactsFix(ctx, set){
  /* 全裸 / 半脱 / 露胸都是用户的显式衣着选择，优先级高于随机标签推演出的事实：
     roleplay / fetish 会推出 clothed，而 clothed 的屏蔽正则（/undressed|naked/ 等）
     恰好把「partially undressed / topless」也滤掉——不删就会出现
     「选了半脱却写不出半脱」。 */
  const st = outfitState(ctx);
  if (set && typeof set.delete === 'function'
      && (isNude(ctx) || st === 'half' || st === 'topless')) set.delete('clothed');
  return set;
}

/* 手动指定成套服饰（左栏「成套服饰」下拉）：
   中文名 → 英文 tag。命中成衣柜或成人向成衣柜都算；未指定 / 对不上返回 null。
   —— 这条路径以前只在 buildPresetPrompt 里生效，且被 `&& !!card.core` 挡住，
   自建卡（只有 base）和多人 / 纯随机场景都读不到，选了服饰也不会进提示词。 */
function pickedOutfit(ctx){
  /* 全裸优先：衣着状态选了「全裸」时，具体服饰一律忽略
     （两个选择器拆开后两者可以同时选中，引擎按"全裸优先"裁决） */
  if (ctx && ctx.outfitState === OUTFIT_NUDE && ctx.mode === 'nsfw') return null;
  const p = ctx && ctx.outfitPick;
  /* 「全裸」「随机换装」「半脱」「露胸」「正常着衣」是模式开关，不是具体服饰名 */
  if (!p || p === OUTFIT_NUDE || p === OUTFIT_RANDOM
      || p === OUTFIT_HALF || p === OUTFIT_TOPLESS || p === OUTFIT_NORMAL) return null;
  let i = ANIME_OUTFIT.indexOf(p);
  if (i >= 0) return { zh: p, en: (ANIME_OUTFIT_EN && ANIME_OUTFIT_EN[i]) || p };
  if (typeof ANIME_OUTFIT_NSFW !== 'undefined' && typeof ANIME_OUTFIT_NSFW_EN !== 'undefined'){
    i = ANIME_OUTFIT_NSFW.indexOf(p);
    if (i >= 0) return { zh: p, en: ANIME_OUTFIT_NSFW_EN[i] || p };
  }
  return null;
}

/* 角色调用词（卡 core/base 的第一段，如 nacho / yuki_miu / (name series)）
   必须出现在整段 Positive 的最开头，不能埋在质量词或外貌词后面。 */
function leadTokensOfCards(cards){
  const out = [];
  (cards || []).forEach(c => {
    const src = String((c && (c.core || c.base)) || '').trim();
    if (!src) return;
    const first = src.split(',')[0].trim();
    if (!first) return;
    if (/^(1girl|1boy|solo|masterpiece|best quality)$/i.test(first)) return;
    const isTrigger = /^[A-Za-z0-9_]{2,48}$/.test(first);
    const isParen = /^\([^)]+\)$/.test(first) && first.length < 90;
    if (!isTrigger && !isParen) return;
    if (out.indexOf(first) < 0) out.push(first);
  });
  return out;
}
function hoistCharLeads(prompt, cards){
  const leads = leadTokensOfCards(cards);
  if (!leads.length || !prompt) return prompt;
  const skip = {};
  leads.forEach(t => { skip[t.toLowerCase()] = 1; });
  const kept = String(prompt).split('\n').map(line => {
    return line.split(',').map(s => s.trim()).filter(s => s && !skip[s.toLowerCase()]).join(', ');
  }).filter(Boolean);
  return leads.join(', ') + (kept.length ? ', ' + kept.join('\n') : '');
}

/* =========================================================
   预设角色「随机补全」
   角色本体固定，其余全部随机：服装 / 配饰 / 动作 / 表情 / 背景 / 光线 / 构图 / 画风
   ctx.recloth = true  → 用 core + 随机服装（默认）
   ctx.recloth = false → 用 core + 原设服装，只随机其余部分
   返回 { prompt, negative, info }
   ========================================================= */
function buildPresetPrompt(card, ctx){
  const parts = modelHead(ctx);
  const apper = [];              /* 只含外貌的部分，可另存为人物卡 */
  const info = {};
  /* 物理状态集合：服装 → 道具 → 身体，逐步补齐；后面每个池都按它避让 */
  const facts = new Set();
  /* 手动指定的成套服饰：优先级最高，选了就一定穿上 */
  const manual = pickedOutfit(ctx);
  /* 全裸：不下发任何服装，改写成一条 nude tag */
  const nude = isNude(ctx);
  /* 衣着状态（半脱 / 露胸 / 正常着衣）：显式选择，强制由生成器配衣并叠加状态 tag */
  const oState = outfitState(ctx);
  const oStateEn = (oState && oState !== 'nude') ? OUTFIT_STATE_EN[oState] : null;
  /* 是否由生成器给这一身加服装：
     - 全裸                  → 不加衣服，改写 nude
     - 手动指定成套服饰       → 加（穿手动那一套）
     - 衣着状态（半脱/露胸/正常）→ 加（在此之上改写状态 tag）
     - 明确选「随机换装」      → 加（ctx.recloth === true）
     - 默认（不在下拉里选）    → 卡自带原设服装（预设卡有 outfit）就保留原设，不加；
                              自建卡没有原设服装，只能由生成器加，否则会光着身子
   ——「默认 = 角色原来的服饰」是这次改动的重点：旧写法用 `ctx.recloth !== false`，
      而 checkbox 默认勾着，等于"什么都不选也要把原设服装换掉"。 */
  const keepOrig = (oState === 'normal' || (oState === 'torn' && !!card.outfit));
  const addCloth = nude || !!manual || clothMode(ctx) === 'random'
    || (clothMode(ctx) === 'state' && !keepOrig) || !card.outfit;
  /* 角色本体：要换装且卡有 core → core（服装由生成器另加）；
     全裸 → core，没有 core 的自建卡就把 base 里的服饰串剥掉；
     其余走 baseOfPreset（原设服装 / 自建卡整条 base） */
  const body = nude
    ? (card.core ? card.core : stripCardOutfitTags(card, baseOfPreset(card)))
    : ((card.core && addCloth) ? card.core : baseOfPreset(card));

  /* 1. 角色本体 */
  parts.push(body);
  apper.push(body);
  /* 体型自选：单卡路径也写入（含权重） */
  if (ctx.bodyPick && ctx.bodyPick.en){
    const w = ctx.bodyPick.weight || 1;
    const toks = (typeof weightTokens === 'function')
      ? weightTokens(ctx.bodyPick.en, w)
      : [w > 1.01 ? '(' + ctx.bodyPick.en + ':' + w + ')' : ctx.bodyPick.en];
    parts.push.apply(parts, toks);
    info['体型'] = (ctx.bodyPick.zh || '') + (w === 2 ? ' ★' : w === 3 ? ' ★★' : '');
  }

  /* 2. 服装
     全裸 → 只写 nude 那一条；
     手动指定 → 优先；
     未指定（默认 / 随机换装）→ 按 45% 概率抽成套
     NSFW 模式下，成人向服饰池也进入候选（约 30% 概率抽到）*/
  if (addCloth){
    if (nude){
      parts.push(NS_NUDE_TAG_EN); apper.push(NS_NUDE_TAG_EN);
      info['服装'] = '全裸';
    } else if (manual){
      parts.push(manual.en); apper.push(manual.en);
      /* 状态叠加：手动服饰 + 衣着状态（例：兔女郎装 + 露胸）。
         露胸时保留整套（不剥上装），只补一条状态 tag。 */
      if (oStateEn){ parts.push(oStateEn); apper.push(oStateEn); }
      info['服装'] = manual.zh + '（手动指定' + (oStateEn ? ' · ' + OUTFIT_STATE_ZH[oState] : '') + '）';
    } else if (oState === 'topless'){
      /* 露胸：不下发上装，下装照穿，状态 tag 顶上 */
      const bA = (card.gender === 'male') ? mascFilterPair(ANIME_BOTTOM, ANIME_BOTTOM_EN, mascPairOk) : [ANIME_BOTTOM, ANIME_BOTTOM_EN];
      const b = PAIR(bA[0], bA[1]);
      const sA = (card.gender === 'male') ? mascFilterPair(ANIME_SHOES, ANIME_SHOES_EN, mascPairOk) : [ANIME_SHOES, ANIME_SHOES_EN];
      const s = PAIR(sA[0], sA[1]);
      parts.push(b.en, s.en, oStateEn); apper.push(b.en, s.en, oStateEn);
      info['服装'] = '露胸（下装：' + b.zh + '）';
    } else if (oStateEn){
      /* 半脱 / 正常着衣：从常规成衣柜抽一套打底，再叠加状态 tag
         （不从成人向柜抽——兔女郎装和「正常着衣」自相矛盾） */
      const o = PAIR(ANIME_OUTFIT, ANIME_OUTFIT_EN);
      parts.push(o.en); apper.push(o.en);
      parts.push(oStateEn); apper.push(oStateEn);
      info['服装'] = OUTFIT_STATE_ZH[oState] + '（' + o.zh + '）';
    } else if (rnd() < 0.45){
      /* 少量概率抽成人服饰（仅 NSFW）*/
      const useNsfw = ctx.mode === 'nsfw'
        && typeof ANIME_OUTFIT_NSFW !== 'undefined'
        && rnd() < 0.30;
      const oSrc = useNsfw ? [ANIME_OUTFIT_NSFW, ANIME_OUTFIT_NSFW_EN] : [ANIME_OUTFIT, ANIME_OUTFIT_EN];
      const oA = (card.gender === 'male') ? mascFilterPair(oSrc[0], oSrc[1], mascPairOk) : oSrc;
      const o = PAIR(oA[0], oA[1]);
      parts.push(o.en); apper.push(o.en);
      info['服装'] = o.zh;
    } else {
      const tA = (card.gender === 'male') ? mascFilterPair(ANIME_TOP, ANIME_TOP_EN, mascPairOk) : [ANIME_TOP, ANIME_TOP_EN];
      const t = PAIR(tA[0], tA[1]);
      const bA = (card.gender === 'male') ? mascFilterPair(ANIME_BOTTOM, ANIME_BOTTOM_EN, mascPairOk) : [ANIME_BOTTOM, ANIME_BOTTOM_EN];
      const b = PAIR(bA[0], bA[1]);
      const sA = (card.gender === 'male') ? mascFilterPair(ANIME_SHOES, ANIME_SHOES_EN, mascPairOk) : [ANIME_SHOES, ANIME_SHOES_EN];
      const s = PAIR(sA[0], sA[1]);
      parts.push(t.en, b.en, s.en);
      apper.push(t.en, b.en, s.en);
      info['服装'] = t.zh + ' + ' + b.zh + ' + ' + s.zh;
    }
  } else {
    /* 破损保留原设服装时补一条撕裂 tag，否则破损状态不进提示词 */
    if ((oState === 'torn' || oState === 'normal') && oStateEn){ parts.push(oStateEn); apper.push(oStateEn); }
    info['服装'] = nude ? '全裸'
                : (card.outfit ? ('原设服装（保留' + (oState === 'torn' ? ' · 破损' : oState === 'normal' ? ' · 正常着衣' : '') + '）')
                : (card.base ? '已含在基础提示词里' : '无'));
  }

  /* 3. 配饰（全裸时跳过 —— 一丝不挂却戴着耳环项链自相矛盾） */
  if (!nude && rnd() < 0.55){
    const a = PAIR(ANIME_ACC, ANIME_ACC_EN);
    parts.push(a.en); apper.push(a.en);
    info['配饰'] = a.zh;
  }

  /* 4. NSFW：身体特征 + 体位 + 体液 / 道具 + 标签英文
     预设角色是单人，所有描写必须只跟这一个人的身体自洽 */
  if (ctx.mode === 'nsfw'){
    const g = card.gender;
    const hasPenis = (g === 'male' || g === 'futa');
    const hasPussy = (g !== 'male');
    /* 写回上下文：法典并入 / 恋物装并闸 / 匿名男判定都要读这两个事实
       （generateAll 路径由引擎自己写，单卡路径在这补齐）。
       _gender0 必须写卡的真实性别——ctx.gender 可能还是 'random'，
       否则男卡会被当成非男并入法典女性条目 */
    ctx._hasPenis = hasPenis;
    ctx._hasPussy = hasPussy;
    ctx._gender0 = g;

    /* 物理状态：先由成套服装推演（束缚装口球 / 贞操内衣 / 全包紧身衣…），
       再由抽中的道具补全；后面的体位、标签、体液全部按它避让 */
    factsFromItemsOf([info['服装'] || ''], facts);

    if (!ctx.activeTags) ctx.activeTags = pickActiveTags(ctx, hasPenis, hasPussy);
    /* 匿名男性补全：女性单人卡显式勾了 口交/群交 等需男 tag 时不丢弃 */
    const anon = anonMaleFor(ctx);
    const drop = [];
    if (!hasPussy) drop.push.apply(drop, NEEDS_PUSSY_TAG);
    if (!hasPenis){
      drop.push.apply(drop, NEEDS_PENIS_TAG.filter(id => !(anon && ANON_MALE_TAGS.indexOf(id) >= 0)), ['futa']);
    }
    if (g === 'male') drop.push('futa');
    ctx.activeTags = ctx.activeTags.filter(id => drop.indexOf(id) < 0);

    /* 基础状态词按身体取舍：
       没有阴茎就不写 erection；没有阴道就剔掉 pussy / 乳房那一组，
       否则男性角色卡会带上 pussy，女性角色卡会带上阴茎相关词。
       另外：只有「全裸」才留 completely nude；穿着衣服时剔除
       topless / breasts out，避免和服装 tag 自相矛盾。 */
    const FEM_ONLY  = /pussy|labia|clitoris|vagina|cameltoe|nipples|breasts|topless/;
    const MASC_ONLY = /erection|penis|glans|scrotum|bulge/;
    parts.push.apply(parts, NS_EN_BASE.filter(t =>
      !(MASC_ONLY.test(t) && !hasPenis) && !(FEM_ONLY.test(t) && !hasPussy) &&
      (nude ? !/^(topless|breasts out)$/i.test(t) : !NUDE_ONLY_TAG_EN.test(t)) &&
      !(BREAST_BARE_TAG_EN.test(String(t).trim()) && !breastsExposed(ctx))));

    if (g === 'male'){
      parts.push(PAIR(NS_PENIS, NS_PENIS_EN).en);
      parts.push(PAIR(NS_PENIS_DETAIL, NS_PENIS_DETAIL_EN).en);
      parts.push(PAIR(NS_BUTT, NS_BUTT_EN).en);
      info['身体'] = '阴茎 / 臀部';
    } else {
      const brPick = clothedBreastPair(PAIR(NS_BREAST, NS_BREAST_EN), ctx);
      parts.push(brPick.en);
      /* 抽到平胸 / 泌乳时，体位与标签也要跟着改（不能平胸配乳交） */
      factsFromTextOf(brPick.zh, facts);
      factsClose(facts);
      parts.push(PAIR(NS_PUBIC_HAIR, NS_PUBIC_HAIR_EN).en);
      parts.push(PAIR(NS_GENITAL_F, NS_GENITAL_F_EN).en);
      if (g === 'futa') parts.push(PAIR(NS_PENIS, NS_PENIS_EN).en);
      parts.push(PAIR(NS_BUTT, NS_BUTT_EN).en);
      info['身体'] = (g === 'futa') ? '胸部 / 阴部 / 阴茎' : '胸部 / 阴部';
    }

    /* 道具先抽：它决定嘴 / 手 / 眼是否被占用。pickGear 已按勾选的标签避让，
       所以"勾了口交又抽到口球"这种事不会发生。 */
    /* 道具统一（轮次 AC）：单卡路径由 doGenerate 传入 scene 已抽的道具，
       字段面板与提示词不再是两次独立抽取 */
    const gear = ctx._gearOverride || pickGear(ctx, facts);
    if (ctx._gearOverride){
      factsFromTextOf(gear.zh, facts);
      factsFromTextOf(gear.en, facts);
      factsFromItemsOf([gear.zh], facts);
      factsClose(facts);
    }

    /* 体位：优先用 makeScene 已抽好的（与配置明细一致）；没有再按事实重抽 */
    let pos;
    const sfPos = ctx._sceneFields && ctx._sceneFields.position;
    if (sfPos && (sfPos.en || sfPos.zh)){
      pos = { zh: sfPos.zh || '', en: sfPos.en || sfPos.zh || '', grp: sfPos.grp, kind: sfPos.kind };
    } else {
      let posPool = posPoolByFacts(posPoolFor(hasPenis || !!anon, hasPussy), facts);
      posPool = msCodexMerge(posPool, ctx);
      posPool = applyPosCat(posPool, ctx);
      pos = pickPosAny(posPool, ctx, facts);
    }
    if (pos.en) parts.push(pos.en);
    info['体位'] = pos.zh;

    /* 体液：同样优先 scene 已抽结果，避免明细与提示词各说各话 */
    const sfFluid = ctx._sceneFields && ctx._sceneFields.fluid;
    if (sfFluid && (sfFluid.en || sfFluid.zh)){
      if (sfFluid.en) parts.push(sfFluid.en);
      info['体液'] = sfFluid.zh;
    } else {
      const fp = pairByFacts(fluidPairFor(hasPenis, hasPussy, g !== 'male'), facts);
      if (rnd() < 0.7){
        const f = PAIR(fp.zh, fp.en);
        parts.push(f.en); info['体液'] = f.zh;
      }
    }
    /* 器具使用描写（轮次 AC） */
    const tukP = toyUseKindOf(gear.zh);
    const tueP = toyUseEn(tukP);
    parts.push(tueP ? gear.en + ', ' + tueP : gear.en);
    info['道具'] = gear.zh;

    /* 内容标签：口径与池一致，被事实屏蔽的整键剔掉；
       全裸时再把 latex / stockings / lingerie 这类服装词剔掉。
       点击加权：★ → (tag:1.2)，★★ → (tag:1.5)，原地生效。 */
    const tagEn = [];
    tagsByFacts((ctx.activeTags || []), facts).forEach(id => {
      if (!NS_TAG_EN[id]) return;
      const w = (ctx.tagW && ctx.tagW[id]) || 1;
      weightTokens(NS_TAG_EN[id], w).forEach(t => { if (enTokenFitsBody(t, ctx)) tagEn.push(t); });
    });
    /* 勾触手：插入 / 捆绑 / 口部类 tag 追加触手化英文组（默认触手完成）。
       不经 tagsByFacts / 人数过滤——触手补位后，三穴同插这类 tag 单人也成立 */
    if (nonhumanOn(ctx)){
      const kinds = nonhumanKinds(ctx);
      tentacleMappedIds(ctx).forEach(id => {
        nhMappedEn(id, kinds).forEach(t => { if (enTokenFitsBody(t, ctx)) tagEn.push(t); });
      });
    }
    /* 多人默认化（轮次 Z）：男 ≥2 时映射 tag 补多人英文组 */
    if (typeof MULTI_TAG_EN !== 'undefined'
      && (ctx._genders || []).filter(g => g === 'male').length >= 2){
      (ctx.activeTags || []).forEach(id => {
        const extra = MULTI_TAG_EN[id];
        if (!extra) return;
        extra.split(',').map(x => x.trim()).filter(Boolean).forEach(t => { if (enTokenFitsBody(t, ctx)) tagEn.push(t); });
      });
    }
    parts.push.apply(parts, nude ? nudeSafeEn(tagEn) : tagEn);
    /* 匿名男性补全 tag：没有身体的阴茎 / 看不见脸的男人（用户指定） */
    if (anon){
      parts.push.apply(parts, ANON_MALE_EN[anon]);
      info['匿名男性'] = (anon === 'multi') ? '多个看不见脸的男人' : '看不见脸的男人 / 无身阴茎';
    }

    /* 一键题材包：单张角色卡（单人场景）同样注入主题 tags，过单人过滤；
       主题加权按 ctx.themeTagW（tag 原文 → 权重）逐条包数值 */
    if (ctx.themeTags && ctx.themeTags.length){
      const tw = ctx.themeTagW || {};
      /* 动作自选 token 并入（豁免 SOLO 过滤，用户显式勾选必出），题材包 token 照旧 */
      const apAllow = new Set(ctx.actPickTokens || []);
      let tt = poolByFacts(ctx.themeTags.concat(ctx.actPickTokens || [])
        .filter(x => !SOLO_BLOCK.test(String(x)) || apAllow.has(String(x).trim())), facts, 'en');
      tt = nudeSafeEn(tt).map(t => weightToken(t, tw[t] || 1));
      if (tt.length) parts.push.apply(parts, tt);
    }

    /* 单人预设卡的场景状态回写给调用方（短篇生成要用同一套约束） */
    ctx.__facts = facts;
  }

  /* 5. 动作 / 表情 / 背景 / 光线 / 构图
     预设角色是单人，剔除"喉结"（女性不该有）与"双人互动/交合处特写"这类构图。
     背景 / 光线 / 构图必须尊重场景自选（scenePick）与 makeScene 已锁定的字段，
     否则单卡路径会随机盖掉用户选的「地下车库」等场所。 */
  const ps = PAIR(ANIME_POSE, ANIME_POSE_EN);  parts.push(ps.en); info['动作'] = ps.zh;

  let exP = { zh: EXPRESSION.slice(), en: EXPRESSION_EN.slice() };
  if (card.gender !== 'male'){
    const f = filterPair(exP.zh, exP.en, /喉结|adam/i);
    if (f) exP = f;
  }
  /* 嘴里塞着东西时 "mouth open / something in mouth" 这类表情要换掉 */
  exP = pairByFacts(exP, facts);
  const ex = PAIR(exP.zh, exP.en); parts.push(ex.en); info['表情'] = ex.zh;

  /* 从已生成的 scene.fields / scenePick 取锁定值；找不到再随机 */
  function presetScenePick(key, zhPool, enPool){
    const sf = ctx && ctx._sceneFields;
    if (sf && sf[key] && (sf[key].en || sf[key].zh)){
      return { zh: sf[key].zh || '', en: sf[key].en || sf[key].zh || '' };
    }
    const sp = (ctx && ctx.scenePick) ? ctx.scenePick : {};
    if (sp[key]){
      const zh = sp[key];
      let en = zh;
      if (zhPool && enPool){
        const i = zhPool.indexOf(zh);
        if (i >= 0 && enPool[i]) en = enPool[i];
      }
      /* 场所可能来自 PLACE.* 而不在 ANIME_PLACE 里，再扫一遍 PLACE */
      if (en === zh && key === 'place' && typeof PLACE !== 'undefined' && typeof PLACE_EN !== 'undefined'){
        const keys = Object.keys(PLACE);
        for (let ki = 0; ki < keys.length; ki++){
          const pool = PLACE[keys[ki]];
          const i = pool ? pool.indexOf(zh) : -1;
          if (i >= 0 && PLACE_EN[keys[ki]] && PLACE_EN[keys[ki]][i]){
            en = PLACE_EN[keys[ki]][i];
            break;
          }
        }
      }
      return { zh: zh, en: en };
    }
    return PAIR(zhPool, enPool);
  }

  const pl = presetScenePick('place', ANIME_PLACE, ANIME_PLACE_EN);
  parts.push(pl.en); info['背景'] = pl.zh;
  const tl = presetScenePick('time', TIME_LIGHT, TIME_LIGHT_EN);
  parts.push(tl.en); info['光线'] = tl.zh;

  let cmP = { zh: CAMERA.slice(), en: CAMERA_EN.slice() };
  const cf = filterPair(cmP.zh, cmP.en, /joined part|two people|交合处|双人互动/i);
  if (cf) cmP = cf;
  const cm = presetScenePick('camera', cmP.zh, cmP.en);
  parts.push(cm.en); info['构图'] = cm.zh;

  /* 氛围：场景自选 / makeScene 锁定时写入（有英文才进提示词） */
  const md = presetScenePick('mood',
    (typeof MOOD_ATMOS !== 'undefined' ? MOOD_ATMOS : []),
    (typeof MOOD_ATMOS_EN !== 'undefined' ? MOOD_ATMOS_EN : []));
  if (md && md.en && md.en !== md.zh){
    parts.push(md.en);
    info['氛围'] = md.zh;
  } else if (md && md.zh){
    info['氛围'] = md.zh;
  }

  /* 6. 画风（预设角色一律走二次元）+ 底模收尾标签 */
  parts.push.apply(parts, styleParts(ctx, true));
  parts.push.apply(parts, modelTail(ctx));

  info['角色'] = card.name + '（' + card.ip + '）';
  info['底模'] = modelCfg(ctx.model).name;

  return {
    prompt: hoistCharLeads(stripCoveredChest(dedupeJoin(parts), ctx), [card]),
    negative: buildNegative(ctx),
    base: dedupeJoin(apper),
    info: info
  };
}

/* =========================================================
   Anima 规范：视角补全 / 动作链绑定 / 多人定位
   参考 Anima文生图提示词V2.2 的编译器式写法
   ========================================================= */

/* 从体位/动作文本推断最合适的视角，避免蹲/躺被遮挡。
   侧视角时前后关系要转译成左右关系（写作层另处理）。 */
function inferView(ctx, scene, chars){
  const bag = [];
  const sf = scene.fields || {};
  if (sf.position && (sf.position.zh || sf.position.en)) bag.push(sf.position.zh || '', sf.position.en || '');
  if (sf.camera && (sf.camera.zh || sf.camera.en)) bag.push(sf.camera.zh || '', sf.camera.en || '');
  const tg = actTags(ctx) || [];
  chars.forEach(c => {
    const f = c.fields || {};
    ['expr','body','hair'].forEach(k => { if (f[k] && f[k].en) bag.push(f[k].en); });
  });
  const s = bag.join(' ');

  if (typeof R18_VIEW_RULE !== 'undefined'){
    for (let i = 0; i < R18_VIEW_RULE.length; i++){
      R18_VIEW_RULE[i].re.lastIndex = 0;
      if (R18_VIEW_RULE[i].re.test(s)) return R18_VIEW_RULE[i].view;
    }
  }
  return '';
}

/* 位置网格：Anima 只认九宫格的九个绝对方位，不认 center-left 这类复合词。
   超过 3 人时用上下分层（upper/lower）+ 左右，避免同侧塞太多人 */
const GRID_POS = ['on the left', 'in the center', 'on the right',
  'in the upper left', 'in the lower left', 'in the upper right', 'in the lower right'];
/* 3 人以上先给三个主位，第 4 人起用上层/下层错开 */
function gridPosAt(i, total){
  if (total <= 3) return GRID_POS[Math.min(i, 2)];
  const order = ['on the left', 'on the right', 'in the center',
    'in the upper left', 'in the upper right', 'in the lower left', 'in the lower right'];
  return order[Math.min(i, order.length - 1)];
}
/* 排序权重：让「From left to right」总结与分段顺序一致 */
function gridRank(i, total){
  if (total <= 3) return i;
  /* 左 → 右 → 中 → 上左 → 上右 → 下左 → 下右 */
  const order = [0, 2, 1, 3, 4, 5, 6];
  return order[Math.min(i, order.length - 1)];
}

/* =========================================================
   角色名与角色卡在英文提示词里的表示
   ---------------------------------------------------------
   显示名（meta.name）是给中文正文用的，常写成「Robin 知更鸟」这种中英混排，
   直接塞进英文 tag 行会污染提示词。这里统一给出「英文 tag 名」。
   ========================================================= */

/* 从显示名里剥掉中文，得到可放进英文 tag 行的名字（"Robin 知更鸟" → "Robin"）。
   卡上显式写了 nameEn 就优先用它。纯中文名则原样返回（总比空着好）。 */
function cardNameEn(card){
  if (!card) return '';
  if (card.nameEn) return String(card.nameEn).trim();
  const raw = String(card.name || '').trim();
  if (!raw) return '';
  const ascii = raw
    .replace(/[\u2e80-\u9fff\u3000-\u303f\uff00-\uffef·]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return ascii || raw;
}

/* 提示词里用的英文角色名：优先 meta.nameEn（角色卡），
   其次 name 字段的英文侧（随机角色是 "random 1"），最后退回显示名 */
function charNameTag(c){
  if (!c) return '';
  if (c.meta && c.meta.nameEn) return c.meta.nameEn;
  const f = c.fields || {};
  if (f.name && f.name.en) return f.name.en;
  return (c.meta && c.meta.name) || '';
}

/* 人数/单人标签：多人场景由 ② 行统一给出，角色行里再各带一个会自相矛盾 */
const COUNT_TAG_RE = /^(\d+\s*(girl|girls|boy|boys|other)|1girl|1boy|solo|multiple girls|multiple boys)$/i;

/* 把基础提示词串拆成逐条 tag（并剔掉人数/单人标签） */
function tagListOf(str){
  return String(str || '').split(',')
    .map(s => s.trim())
    .filter(s => s && !COUNT_TAG_RE.test(s));
}

/* 单个角色在多人提示词里的 tag 列表：
   有 base（角色卡）→ 用 base 拆条；没有 → 核心特征 + 细节补全（随机角色）。
   对照单人分支：单人用 c.base 兜底，双人分支原来漏了这一步，
   角色卡的 fields 里只有 name/gender/base，coreFeatures/restFeatures 全取不到值，
   于是渲染出一行孤零零的「Robin 知更鸟:」。 */
/* 角色卡 base 拆条；全裸时优先用 core（不含服装），
   没有 core 的自建卡就从 base 里剥掉成套服饰串 ——
   否则「completely nude」会和卡上写死的白衬衫同时出现在提示词里。 */
function charBaseTags(c, ctx){
  if (!c || !c.base) return null;
  if (isNude(ctx)) return tagListOf(c.core ? c.core : stripCardOutfitTags(c, c.base));
  /* 换装场景（手动指定成套服饰 / 随机换装 / 衣着状态）：卡里只取外貌 core，
     服装由引擎另发。旧写法直接用 base——而 presetToCard 的 base = core + outfit
     含原设服装，换装时原衣与新衣 tag 并存，表现就是「换不了衣服」（2026-10-10）。 */
  const cm = clothMode(ctx);
  /* 「正常着衣」且未指定新服饰：保留卡上原设服装（正常着衣=穿好衣服，
     不是换衣服）；half/topless 才需要剥掉原设另行下发 */
  if (cm === 'state' && (outfitState(ctx) === 'normal' || outfitState(ctx) === 'torn')
      && !pickedOutfit(ctx) && ctx.outfitPick !== OUTFIT_RANDOM){
    return tagListOf(c.base);
  }
  if (cm === 'manual' || cm === 'random' || cm === 'state'){
    return tagListOf(c.core ? c.core : stripCardOutfitTags(c, c.base));
  }
  return tagListOf(c.base);
}

function charTagParts(c, ctx, n){
  const base = charBaseTags(c, ctx);
  if (base) return base;
  const core = coreFeatures(c, ctx, n);
  return core.concat(restFeatures(c, ctx, core));
}

/* 多人场景里给某个角色取少量辨识特征（角色卡走 base 前 n 条） */
function charFeatBrief(c, ctx, n){
  const k = n || 2;
  if (c.base) return tagListOf(c.base).slice(0, k);
  return coreFeatures(c, ctx, k);
}

/* 从角色身上取 1-2 个最具区分度的核心特征（发色优先，其次瞳色/服装）
   多人场景下每人只保留极少量特征，避免全局 tag 互相污染 */
function coreFeatures(c, ctx, n){
  const f = c.fields || {};
  const pick = [];
  if (f.hair && f.hair.en) pick.push(f.hair.en);
  if (pick.length < 2 && f.eyes && f.eyes.en) pick.push(f.eyes.en);
  if (pick.length < 2 && f.top && f.top.en) pick.push(f.top.en);
  if (pick.length < 2 && f.body && f.body.en) pick.push(f.body.en);
  return pick.slice(0, n || 2);
}

/* 把一个角色的完整外貌串拆出「核心特征」以外的剩余部分（细描） */
function restFeatures(c, ctx, core){
  const all = charPromptParts(c, ctx);
  const coreSet = new Set(core);
  return all.filter(x => x && !coreSet.has(x));
}

/* 行为英文短语：动作链的谓语部分 */
/* 勾触手时映射 tag 的触手化英文 token 集合——这些词在 SOLO_BLOCK /
   GROUP_BLOCK 过滤中豁免：触手本身就是"第二人"，三穴同插 / 深喉这类
   动作单人也成立（2026-10-10 轮次 Q） */
function tentacleMappedIds(ctx){
  const seen = new Set(); const out = [];
  [].concat(ctx.activeTags || [], ctx.tags || []).forEach(id => {
    if (!seen.has(id)){ seen.add(id); out.push(id); }
  });
  return out;
}
/* 非人种类（2026-10-10 轮次 R）：monster=触手、bestiality=兽交，可同时勾 */
function nonhumanKinds(ctx){
  const ids = tentacleMappedIds(ctx);
  return { monster: ids.indexOf('monster') >= 0, bestiality: ids.indexOf('bestiality') >= 0 };
}
function nonhumanOn(ctx){ const k = nonhumanKinds(ctx); return k.monster || k.bestiality; }
/* 映射 tag 的非人中文句池（按勾选的种类取，两类都勾则并入同一池） */
function nhMappedSentencePool(id, kinds){
  const out = [];
  if (kinds.monster && typeof NS_TAG_POOL_TENTACLE !== 'undefined' && NS_TAG_POOL_TENTACLE[id])
    out.push.apply(out, NS_TAG_POOL_TENTACLE[id]);
  if (kinds.bestiality && typeof NS_TAG_POOL_BEAST !== 'undefined' && NS_TAG_POOL_BEAST[id])
    out.push.apply(out, NS_TAG_POOL_BEAST[id]);
  return out;
}
/* 映射 tag 的非人英文 token（同上） */
function nhMappedEn(id, kinds){
  const out = [];
  if (kinds.monster && typeof TENTACLE_TAG_EN !== 'undefined' && TENTACLE_TAG_EN[id])
    TENTACLE_TAG_EN[id].split(',').map(x => x.trim()).filter(Boolean).forEach(t => out.push(t));
  if (kinds.bestiality && typeof BEAST_TAG_EN !== 'undefined' && BEAST_TAG_EN[id])
    BEAST_TAG_EN[id].split(',').map(x => x.trim()).filter(Boolean).forEach(t => out.push(t));
  return out;
}
/* 身体适配：token 级器官检查（轮次 W 审计发现）。
   全男场景无阴道，'tentacle in pussy' / 'animal cock in pussy' / 'cunnilingus'
   这类 token 写进去就是器官越界； NS_TAG_EN.monster / BEAST_TAG_EN / 动作自选
   条目里都带这类词，且事实闸（gagged 等）没有器官维度。
   触手 / 兽交语境的 cock / knotting 指兽与触手的器官，任何构成下都成立，不过滤。 */
function enTokenFitsBody(t, ctx){
  if (ctx && ctx._hasPussy === false && /pussy|vagina|cunnilingus/i.test(String(t))) return false;
  return true;
}
function nonhumanAllowSet(ctx){
  const allow = new Set();
  if (!nonhumanOn(ctx)) return allow;
  const kinds = nonhumanKinds(ctx);
  tentacleMappedIds(ctx).forEach(id => nhMappedEn(id, kinds).forEach(t => allow.add(t)));
  return allow;
}

function actPhraseOf(ctx, scene){
  const sf = scene.fields || {};
  const facts = factsOf(scene);
  const en = [];
  if (ctx.mode === 'nsfw'){
    /* 体位本身可能要求 ≥3 人（DP/TP/spitroast），2 人场景必须换掉，
       否则同一张画面里既写"2girls"又写"double penetration"就自相矛盾。 */
    if (sf.position && sf.position.en && !(ctx.actors < 3 && OVER2_BLOCK.test(sf.position.en))){
      en.push(sf.position.en);
    }
    /* NS_TAG_EN 的每个值是「逗号连接的一组 tag」，整串塞进去会绕过人数/单人过滤，
       所以先按逗号拆开再逐条推入。 */
    if (ctx.activeTags){
      tagsByFacts(ctx.activeTags, facts).forEach(id => {
        if (!NS_TAG_EN[id]) return;
        /* 选中的 tag 本身要求 ≥3 人时（dp 等），2 人场景直接跳过整组 */
        if (ctx.actors < 3 && OVER2_BLOCK.test(id)) return;
        /* 点击加权：★ → (tag:1.2)，★★ → (tag:1.5)，按逗号拆开逐条包 */
        const w = (ctx.tagW && ctx.tagW[id]) || 1;
        weightTokens(NS_TAG_EN[id], w).forEach(t => { if (enTokenFitsBody(t, ctx)) en.push(t); });
      });
    }
    /* 勾触手：插入 / 捆绑 / 口部类 tag 追加触手化英文组（默认触手完成），
       不经 tagsByFacts / OVER2_BLOCK 过滤——触手补位后单人与双人都成立 */
    if (nonhumanOn(ctx)){
      const kinds = nonhumanKinds(ctx);
      tentacleMappedIds(ctx).forEach(id => {
        nhMappedEn(id, kinds).forEach(t => { if (enTokenFitsBody(t, ctx)) en.push(t); });
      });
    }
    /* 多人默认化（轮次 Z）：男 ≥2 时映射 tag 补多人英文组（double blowjob / two cocks 系） */
    if (typeof MULTI_TAG_EN !== 'undefined'
      && (ctx._genders || []).filter(g => g === 'male').length >= 2){
      (ctx.activeTags || []).forEach(id => {
        const extra = MULTI_TAG_EN[id];
        if (!extra) return;
        extra.split(',').map(x => x.trim()).filter(Boolean).forEach(t => { if (enTokenFitsBody(t, ctx)) en.push(t); });
      });
    }
  } else {
    if (sf.action && sf.action.en) en.push(sf.action.en);
    else if (sf.action && sf.action.zh) en.push('relaxing');
  }
  /* 逐条过一遍物理状态：嘴里塞着东西时 tongue / mouth open 这类词不能留。
     全裸时还要把内容标签带来的服装词（latex / stockings / lingerie）剔掉。 */
  const out0 = poolByFacts(en, facts, 'en');
  const src = out0.length ? out0 : en;
  return isNude(ctx) ? nudeSafeEn(src) : src;
}

/* 单人场景必须剔除「需要另一个人」的动作/状态词，
   否则会出 "1girl, missionary, cowgirl" 这种自相矛盾的组合 */
const SOLO_BLOCK = /missionary|doggystyle|cowgirl|spread legs|legs up|group sex|gangbang|hetero|sex from behind|prone bone|spitroast|double penetration|triple penetration|69|fellatio|deepthroat|paizuri|handjob|footjob|buttjob|hairjob|pegging|facesitting|cunnilingus|spitroast|erection|penetration|creampie|facial|bukkake|riding on top|girl on top|spooning|thigh sex|sitting on lap|on another|other person|partner|boy\b|man\b|male|rape|molestation|semen|precum|standing sex|bent over|against wall|watersports|golden shower|urination|masturbation|frottage|intercrural|prostate|enema|spanking|spanked|public use|gangrape|multiple boys|multiple girls|harem|reverse harem|on back|all fours|lactation|breastfeeding/i;
function soloSafeActs(arr){
  return (arr || []).filter(x => x && !SOLO_BLOCK.test(String(x)));
}
/* 单人场景的 NSFW 基础状态词：
   基础池里 sex / erection / penetration / anal 这些都预设了第二个人，
   一律按 SOLO_BLOCK 正则整条剔除，而不是只做精确匹配。 */
function soloBaseTags(base){
  return (base || []).filter(x => x && !SOLO_BLOCK.test(String(x))
    && !/^(sex|nude|naked)$/i.test(String(x)));
}
/* 2 人场景的人数下限屏蔽：出现这些词说明把 3 人及以上的人数写坏了 */
const GROUP_BLOCK = /\b(threesome|foursome|group sex|gangbang|gang rape|orgy|multiple partners|multiple boys|multiple girls|spitroast|triple penetration|reverse harem|harem|public use)\b/i;
/* 2 人上限屏蔽：这些动作本身要求 ≥3 人（DP/TP 需要两三个插入方），
   2 人场景里选了它们会与画面人数矛盾，整条体位/动作都要换掉。 */
const OVER2_BLOCK = /\bdouble penetration|triple penetration|dp\b|spitroast|gangbang|group sex|orgy|threesome|foursome/i;
/* NS_TAG_POOL 里的专属动作池（paizuri / handjob 这些）在单人场景下写的是
   "对别人做"，所以整池换成自行完成的中性表述，避免"自己给自己乳交"这种矛盾。 */
const SOLO_TAG_SENT = {
  oral:        'fingering own mouth, licking own fingers',
  deepthroat:  'fingers pushed deep, throat working',
  swallow:     'licking fingers clean',
  paizuri:     'pressing own breasts together, nipples hard',
  handjob:     'hand working between own thighs',
  footjob:     'foot rubbing against own calf',
  anal:        'fingering own anus, rim pressed open',
  rimming:     'fingers circling own anus',
  dp:          'toy filling both holes at once',
  creampie:    'semen dripping out of own hole',
  facial:      'semen streaked across own face',
  bukkake:     'face coated and dripping',
  squirt:      'squirting hard, puddle spreading',
  masturb:     'masturbating, fingers buried deep',
  toy:         'sex toy vibrating inside',
  bondage:     'self-bound with rope, shibari',
  bdsm:        'clamps and rope on own body',
  humil:       'collar around own neck',
  public:      'doing it where anyone could walk in',
  voyeur:      'watching through a gap, peeping',
  orgy:        'toy used alongside both hands',
  roleplay:    'dressed up as someone else',
  fetish:      'latex clinging to skin',
  petplay:     'tail plug in, collar on',
  agegap:      'biting own lip, flushed',
  taboo:       'hiding the sound with a hand',
  noncon:      'rope marks on own wrists',
  sleep:       'half awake, eyes barely open',
  lactation:   'milk beading at the nipple',
  watersports: 'holding it until it bursts',
  /* 非人题材（轮次 J）：触手 / 兽本身就是"第二方"，单人场景写真插入，不再玩具化 */
  monster:     'tentacles coiling around limbs, one tip pressing against entrance',
  bestiality:  'animal mounting from behind, claws gripping hips',
  futa:        'toy strapped on, harness tight',
  femboy:      'crossdressed, skirt hiked up'
};
/* 单人的 tagact：只保留能在单人场景成立的池，并逐条过 SOLO_BLOCK */
function soloTagAct(ctx){
  const ids = Object.keys(NS_TAG_POOL).filter(id => actTags(ctx).includes(id));
  const out = [];
  ids.forEach(id => { if (SOLO_TAG_SENT[id]) out.push(SOLO_TAG_SENT[id]); });
  return out;
}

/* 单人中文动作池：NS_TAG_POOL 的中文池里，anal/deepthroat/paizuri 这些写的都是
   "对方在做"，单人场景必须整池替换，否则故事文本会自相矛盾。 */
const SOLO_TAG_SENT_ZH = {
  oral:        ['舌尖舔过自己的指节，把沾上的液体一并舔掉', '含住两根手指，一直吞到指根'],
  deepthroat:  ['手指压到最深处，喉咙被顶得发出闷响', '指尖抵着喉口，眼泪被逼出来'],
  swallow:     ['把手指含进嘴里，把上面的东西舔干净'],
  paizuri:     ['双手把乳房往中间推，乳头被自己蹭得发硬'],
  handjob:     ['手指夹着最敏感那一点来回捻，越捻越湿'],
  footjob:     ['脚背蹭着小腿，一路往上磨'],
  anal:        ['手指抵着后穴打圈，等它松开了才一点点探进去', '后穴被自己的手指撑开成一圈'],
  rimming:     ['指尖在后穴周围画圈，那里紧得一下一下地缩'],
  dp:          ['两根手指分别填进两处，前后一起搅动'],
  creampie:    ['手指抽出来时带出一股浊液，顺着掌心往下淌'],
  facial:      ['液体溅在脸上，睫毛都黏在一起'],
  bukkake:     ['脸上糊了薄薄一层，顺着下巴往下滴'],
  squirt:      ['水喷出来，掌心全湿，地上积了一小滩'],
  masturb:     ['手指埋进最深处，一下一下地按着里面那块'],
  toy:         ['器具开到最大档，抵着最里面震个不停'],
  bondage:     ['自己把自己绑起来，绳子勒进手腕', '绳结一道道缠上大腿，动一下都费劲'],
  bdsm:        ['乳夹咬住乳尖，坠着的重量一扯就是一颤', '夹子扣上后就没再拿下来，只能忍着'],
  humil:       ['项圈扣在脖子上，链子另一端握在自己手里'],
  public:      ['门没锁，随时可能有人推门进来'],
  voyeur:      ['从门缝里往外看，屏着呼吸不敢动'],
  orgy:        ['两只手同时动作，节奏全乱'],
  roleplay:    ['穿着这一身，假装是被谁叫来的'],
  fetish:      ['乳胶衣黏在皮肤上，脱的时候发出黏腻的声响'],
  petplay:     ['肛尾塞抵着后穴，尾巴随着动作一晃一晃'],
  agegap:      ['咬住下唇，脸红得不像话'],
  taboo:       ['用手捂住嘴，把声音都堵在喉咙里'],
  noncon:      ['手腕被自己绑出红痕，想挣脱却越挣越紧'],
  sleep:       ['半睡半醒，眼睛都没完全睁开'],
  lactation:   ['乳尖上渗出一滴乳白，顺着乳晕滑下去'],
  watersports: ['憋到极限，终于一股股泄出来，腿都在抖'],
  /* 非人题材（轮次 J）：单人场景触手 / 兽就是"第二方"，写真插入而非玩具 */
  monster:     ['触手缠上四肢，尖端一寸寸往里挤', '一条触手吸住乳尖，另一条绕住脚踝往两边拉'],
  bestiality:  ['被兽身从背后压住，那东西抵着入口往里拱', '兽跨上来一下下地顶，只能趴着承受'],
  futa:        ['绑带系在腰上，把器具固定在最合适的位置'],
  femboy:      ['裙子掀到腰上，里面什么都没穿'],
  /* 新增标签里一个人也成立的 10 项（其余需要第二人，单人场景不给中文句） */
  fisting:       ['手指一根根并进去，最后整只手都埋了进去'],
  huge_insert:   ['沿着边缘一点点往里推，撑得发涨'],
  clamps:        ['夹子扣在最上面，链子一晃就扯得发疼'],
  blindfold:     ['蒙上眼之后，剩下的感官反而更清楚了'],
  gag:           ['嘴上塞着东西，只能发出含混的音'],
  suspended:     ['被吊在半空，脚尖离地，晃一下就荡开'],
  wax:           ['蜡滴在皮肤上，一缩之后慢慢烫开'],
  electro:       ['贴片通上电，整个人一紧'],
  orgasm_denial: ['每到边缘就停下，只能自己慢慢退回去'],
  forced_orgasm: ['一次又一次地越过去，连喘气的时间都没有']
};
/* 单人中文动作池：NS_TAG_POOL 的中文池里，anal/deepthroat/paizuri 这些写的都是
   "对方在做"，单人场景必须整池替换，否则故事文本会自相矛盾。
   传 facts 时还会按事实闸门筛掉与当前身体状态冲突的标签。 */
function soloTagActsZh(ctx, facts){
  const kinds = nonhumanKinds(ctx);
  const nhOn = kinds.monster || kinds.bestiality;
  let ids = Object.keys(NS_TAG_POOL).filter(id => actTags(ctx).includes(id));
  if (facts && typeof tagsByFacts === 'function'){
    const kept = tagsByFacts(ids, facts);
    if (nhOn){
      /* 勾非人（触手 / 兽交）：被事实闸掉的映射 tag（三穴同插等）捞回来——
         非人补位后单人也成立；其余 tag 维持事实闸（gag 时的口部回避等） */
      const mapped = ids.filter(id => nhMappedSentencePool(id, kinds).length);
      ids = kept.slice();
      mapped.forEach(id => { if (ids.indexOf(id) < 0) ids.push(id); });
    } else {
      ids = kept;
    }
  }
  /* 勾非人：映射 tag 的句子整池换成非人版（默认由触手 / 兽完成），未映射的取原句 */
  if (nhOn){
    (ctx.tags || []).forEach(id => {
      if (nhMappedSentencePool(id, kinds).length && ids.indexOf(id) < 0) ids.push(id);
    });
    const out2 = []; let hit = false;
    ids.forEach(id => {
      const nh = nhMappedSentencePool(id, kinds);
      if (nh.length){ out2.push.apply(out2, nh); hit = true; }
      else if (SOLO_TAG_SENT_ZH[id]) out2.push.apply(out2, SOLO_TAG_SENT_ZH[id]);
    });
    if (hit) return out2;
  }
  const out = [];
  ids.forEach(id => { if (SOLO_TAG_SENT_ZH[id]) out.push.apply(out, SOLO_TAG_SENT_ZH[id]); });
  return out;
}

/* 单人场景的通用动作池：NS_ACTION 里剔掉一切需要第二个人才成立的句子。 */
function soloActPool(facts){
  let pool = NS_ACTION.filter(s => !SOLO_ACT_BLOCK.test(s));
  if (facts && typeof poolByFacts === 'function') pool = poolByFacts(pool, facts, 'zh');
  return pool.length ? pool : NS_ACTION.filter(s => !SOLO_ACT_BLOCK.test(s));
}

/* 动作链绑定：发起者 + 动作 + 接收者's + 身体部位
   Anima 规范：有直接身体互动的角色，必须写在同一句里，禁止拆成两段 */
function actionChain(ctx, A, B, scene, grp){
  /* 动作链是英文提示词的一部分，名字必须走英文 tag 名 */
  const an = charNameTag(A), bn = charNameTag(B);
  const fem = B.gender !== 'male';
  const chains = [];
  /* 嘴里塞着东西就不存在"含住"的动作链，降级到正面位 */
  const facts = factsOf(scene);
  if (facts.has('gagged') && grp === 'oral') grp = 'front';

  /* 女女（百合）：两个人身上都没有可插入的器官，
     原来那套「thrusting into / entering from the rear」写出来是错的。
     动作全部落到手指 / 口 / 磨蹭上。 */
  if (yuriScene(null, [A, B])){
    if (grp === 'oral'){
      chains.push(`${bn} is kneeling between ${an}'s thighs, tongue buried in ${an}'s pussy`);
      chains.push(`${an} is lying back, thighs squeezing ${bn}'s head, hips lifting off the bed`);
    } else if (grp === 'back'){
      chains.push(`${bn} is pressed against ${an}'s back, one hand slipping between ${an}'s legs`);
      chains.push(`${an} is leaning back into ${bn}, grinding her hips, both dripping`);
    } else if (grp === 'ride'){
      chains.push(`${an} is straddling ${bn}'s thigh, grinding down, faces close together`);
      chains.push(`${bn} is holding ${an}'s hips, guiding the rhythm, fingers curling inside ${an}`);
    } else {
      chains.push(`${bn} is between ${an}'s spread legs, hips grinding against ${an}'s pussy`);
      chains.push(`${an}'s fingers are buried in ${bn}, the two of them trembling together`);
    }
    return chains;
  }

  /* 接收者是 A、发起者是 B（NSFW 场景 A 为被插入方） */
  if (grp === 'oral'){
    chains.push(`${bn} is holding ${an}'s head and thrusting into ${an}'s mouth, ${an}'s throat bulging`);
  } else if (grp === 'back'){
    chains.push(`${bn} is gripping ${an}'s hips from behind, entering ${an}'s ${fem ? 'pussy' : 'body'} from the rear`);
    chains.push(`${an} is on all fours, ${bn}'s hands on ${an}'s waist`);
  } else if (grp === 'ride'){
    chains.push(`${an} is straddling ${bn}, sinking down onto ${bn}'s lap`);
    chains.push(`${bn} is lying beneath ${an}, hands on ${an}'s thighs`);
  } else {
    chains.push(`${bn} is pressing ${an} down, ${an}'s legs spread wide`);
    chains.push(`${bn} is thrusting into ${an}, ${an}'s back arching`);
  }
  return chains;
}

/* 三人及以上：每角色一段 [位置]: [角色名] with [特征], [姿态/动作], [状态] */
function charBlocks(ctx, chars, scene, grp){
  const blocks = [];
  const sf = scene.fields || {};
  const baseAct = sf.position && sf.position.en ? sf.position.en : '';

  chars.forEach((c, i) => {
    const pos = gridPosAt(i, chars.length);
    const feats = charFeatBrief(c, ctx, 2);
    const name = charNameTag(c);
    /* 位置 + 角色名 + with 特征绑定 */
    let line = `${pos.replace(/^./, m => m.toUpperCase())}, ${name}`;
    if (feats.length) line += ' with ' + feats.join(', ');
    blocks.push(line);
  });
  return blocks;
}

function buildPrompt(ctx, chars, scene){
  const sf = scene.fields || {};
  const n = chars.length;
  const useBase = chars.some(c => c.base);
  /* 当前场景的物理状态：英文提示词侧同样不能出现与之矛盾的动作词 */
  const facts = factsOf(scene);
  /* 手动指定的成套服饰：随机角色的衣服在 makeChar 里就已换成这一套（top 字段），
     角色卡（base）不含服装，所以这里给每段补一条 */
  let fit = pickedOutfit(ctx);
  /* 随机换装 / 衣着状态：多人路径也要由生成器给角色卡另发衣服。
     旧版以为「卡 base 不含服装」，实际 presetToCard 的 base = core + outfit，
     不发新衣时卡角色永远穿原设服装——随机换装因此失效（2026-10-10）。
     露胸：上身全裸，只发下装 + 鞋袜，不发成套（与状态自相矛盾）。 */
  const cmFit = clothMode(ctx);
  if (!fit && cmFit === 'random'){
    fit = PAIR(ANIME_OUTFIT, ANIME_OUTFIT_EN);
  } else if (!fit && cmFit === 'state'
      && (outfitState(ctx) === 'half' || outfitState(ctx) === 'topless')){
    /* topless：上身全裸只发下装+鞋袜；half：补发成套。
       normal 不进这里——上面 charBaseTags 已保留原设服装，不再另发 */
    fit = (outfitState(ctx) === 'topless')
      ? PAIR(ANIME_BOTTOM, ANIME_BOTTOM_EN)
      : PAIR(ANIME_OUTFIT, ANIME_OUTFIT_EN);
  }
  /* 衣着状态 tag（半脱 / 露胸 / 正常着衣）：角色卡 base 里不含状态词，补进共享行；
     纯随机角色的状态已由 makeChar 写进字段（ostate），不重复注入 */
  const stTags = outfitStateTags(ctx);

  /* ---------- NSFW 走 Anima 编译器式结构 ---------- */
  if (ctx.mode === 'nsfw'){

    /* ① 质量词前缀 + 画师风格紧随其后 */
    const head = modelHead(ctx).slice();
    const style = styleParts(ctx);
    const lines = [];
    lines.push(dedupeJoin(head.concat(style)));

    /* ② 角色名/出处行（占位名或用卡名）；同时给出人数与性别前缀 */
    const females = chars.filter(c => c.gender === 'female' || c.gender === 'futa').length;
    const males = chars.filter(c => c.gender === 'male').length;
    /* 女女（百合）：打上 yuri 标签，动作链与补充 tag 一并切到女女版本 */
    const isYuri = yuriScene(null, chars);
    const countSeg = [];
    if (n === 1){
      countSeg.push(females ? '1girl' : '1boy');
    } else {
      if (females) countSeg.push(females === 1 ? '1girl' : females + 'girls');
      if (males) countSeg.push(males === 1 ? '1boy' : males + 'boys');
      /* 群交人数认知强化：数字 tag 之外再补 multiple 标签，
         帮底模画够人数、减少把多人画成一个人（融合肢体的主要诱因之一） */
      if ((ctx.actors || 1) >= 3){
        if (females >= 2) countSeg.push('multiple girls');
        if (males >= 2) countSeg.push('multiple boys');
      }
      if (isYuri) countSeg.push('yuri, girls only');
    }
    /* 名字走英文 tag 名（角色卡是卡上的英文名，随机角色是 "random 1"），
       显示名里可能带中文，直接写进英文行会中英混排 */
    const names = chars.map(c => charNameTag(c)).filter(Boolean).join(', ');
    /* 匿名男性补全：单人勾了需男 tag 时画面里其实有"看不见脸的男人"，
       solo 前缀与 multiple boys / disembodied penis 矛盾，要摘掉 */
    const anon = (n === 1) ? anonMaleFor(ctx) : null;
    lines.push(dedupeJoin(countSeg.concat([n === 1 && !anon ? 'solo' : ''], [names])));

    /* ③ 环境/地点 + 全局共同动作（共享行，多人时开头写共同环境，
       避免模型把画面一分为二分别绘制） */
    const shared = [];
    if (sf.place && sf.place.en) shared.push(sf.place.en);
    if (sf.time && sf.time.en) shared.push(sf.time.en);
    /* 视角/构图（含自动补全） */
    const view = inferView(ctx, scene, chars);
    if (sf.camera && sf.camera.en) shared.push(sf.camera.en);
    if (sf.eye && sf.eye.en) shared.push(sf.eye.en);
    if (view) shared.push(view);
    /* 双方及以上的动作：2 人场景要剔掉"三人/群交/多人"这类人数不符的 tag
       （用户的 NSFW tag 池里含 threesome/group sex，直接落进 2 人提示词会自相矛盾） */
    let commonAct = actPhraseOf(ctx, scene);
    const tentAllow = nonhumanAllowSet(ctx);
    if (n === 2) commonAct = commonAct.filter(x => !GROUP_BLOCK.test(String(x)) || tentAllow.has(String(x).trim()));
    /* 女女：剔掉"勃起 / 阴茎 / 精液 / 乳交"这类必须有男性器官的 tag，
       再把 agegap / orgy 里的"older man / multiple boys"改指女性。
       勾了触手 / 兽交时非人 token 豁免——兽 / 触手就是"第二方"，
       百合 × 兽交 / 百合 × 触手是有意组合，animal cock 不是泄漏 */
    if (isYuri) commonAct = yuriTerms(commonAct.filter(x => !YURI_BLOCK_EN.test(String(x)) || tentAllow.has(String(x).trim())));
    if (n >= 2) shared.push(...(commonAct.length ? commonAct : [isYuri ? 'tribadism, girls only' : 'sex']));
    /* NSFW 基础状态词（单人去掉了 sex / erection 这类需要第二人的词） */
    let baseTags = (n === 1) ? soloBaseTags(NS_EN_BASE) : NS_EN_BASE.slice();
    if (n === 2) baseTags = baseTags.filter(x => !GROUP_BLOCK.test(String(x)));
    /* 衣着状态：只有「全裸」才留 completely nude 那一组；
       穿着衣服（默认 = 角色原设服装 / 手动服饰 / 随机换装）时，
       把 topless、breasts out 这类"露"字头剔掉 —— NSFW 并不等于一律露胸，
       留着它们会和正向的服装 tag（白衬衫、制服…）互相打架。 */
    /* 衣着状态 → NSFW 基础状态词过滤：
       - 全裸         : 全留（completely nude / nipples / pussy 都对）
       - 露胸         : 留胸裸露那一组（含 nipples），其余裸体系照剔
       - 半脱 / 正常着衣 / 默认 / 手动服饰 / 随机换装（= 穿着上装）
                      : 裸体系全剔 —— 含 NS_EN_BASE 里漏网的 nipples
                        （2026-10-09 轮次 M：穿衣服却写 nipples，模型照样把上装画没） */
    baseTags = baseTags.filter(x => {
      const t = String(x).trim();
      if (isNude(ctx)){
        /* 全裸：completely nude 已经涵盖，再写 topless / breasts out
           模型会画成"只脱了上衣"——老规则就是删掉它们 */
        return !/^(topless|breasts out)$/i.test(t);
      }
      if (BREAST_BARE_TAG_EN.test(t)) return breastsExposed(ctx);
      return !NUDE_ONLY_TAG_EN.test(t);
    });
    if (isYuri) baseTags = yuriTerms(baseTags.filter(x => !YURI_BLOCK_EN.test(String(x))));
    baseTags = poolByFacts(baseTags, facts, 'en');
    shared.push(...baseTags);
    /* 衣着状态：半脱 / 露胸 / 正常着衣的状态 tag 补进共享行（仅角色卡 base 场景需要；
       随机角色的状态词已在各自字段里） */
    if (useBase && stTags){
      const st = poolByFacts(stTags.slice(), facts, 'en');
      if (st.length) shared.push.apply(shared, st);
    }
    /* 一键题材包：选中的主题整组英文 tags 原文注入共享行。
       仍按在场人数与物理状态过滤：单人剔除"需要第二人"的 tag，
       2 人剔除"三人/群交"类，百合剔除"需要男性器官"类。 */
    if (ctx.themeTags && ctx.themeTags.length){
      let tt = ctx.themeTags.slice();
      if (n === 1) tt = soloSafeActs(tt);
      else if (n === 2) tt = tt.filter(x => !GROUP_BLOCK.test(String(x)));
      if (isYuri) tt = tt.filter(x => !YURI_BLOCK_EN.test(String(x)));
      tt = poolByFacts(tt, facts, 'en');
      /* 主题加权：按 ctx.themeTagW（tag 原文 → 权重）逐条包数值 */
      const tw = ctx.themeTagW || {};
      tt = tt.map(t => weightToken(t, tw[t] || 1));
      if (tt.length) shared.push.apply(shared, tt);
    }
    /* 动作自选（2026-10-10 轮次 S）：用户在法典动作库勾选的整组 tag。
       「点选必出」承诺：豁免 SOLO / GROUP / 百合过滤（与触手 / 兽交 token 同理），
       仅过事实闸（gag 占嘴时的口部回避等）与全裸清洗 */
    if (ctx.actPickTokens && ctx.actPickTokens.length){
      let ap = ctx.actPickTokens.filter(t => enTokenFitsBody(t, ctx));
      ap = poolByFacts(ap, facts, 'en');
      if (isNude(ctx)) ap = nudeSafeEn(ap);
      if (ap.length) shared.push(...ap);
    }
    /* 百合默认化（轮次 T）：女女场景勾口交 / 69 / 舔阴 / 骑脸时，
       补女女写法的英文组（NS_TAG_EN.oral 的 fellatio 系已被百合过滤剔掉） */
    if (isYuri && typeof YURI_TAG_EN !== 'undefined'){
      (ctx.activeTags || []).forEach(id => {
        const extra = YURI_TAG_EN[id];
        if (!extra) return;
        extra.split(',').map(x => x.trim()).filter(Boolean).forEach(t => shared.push(t));
      });
    }
    if (sf.fluid && sf.fluid.en){
      const fp = poolByFacts([sf.fluid.en], facts, 'en');
      shared.push.apply(shared, fp);
    }
    /* 器具描写（轮次 AC）：道具全 token（名称 + 使用过程）进共享行——
       之前道具 en 只存字段不进 prompt，双人/单人提示词里器具只剩动作池捎带的词 */
    if (sf.toy && sf.toy.en){
      String(sf.toy.en).split(',').map(x => x.trim()).filter(Boolean).forEach(t => shared.push(t));
    }
    /* 单人：动作放进共享行，但要剔除「需要另一个人」的动作 */
    if (n === 1){
      /* 勾触手：映射 tag 的触手化 token 不吃 SOLO_BLOCK（触手就是"第二人"，
         三穴同插 / 深喉 / 捆绑由触手完成时单人也成立），其余照旧剔除 */
      const soloAct = tentAllow.size
        ? commonAct.filter(x => !SOLO_BLOCK.test(String(x)) || tentAllow.has(String(x).trim()))
        : soloSafeActs(commonAct);
      shared.push(...poolByFacts(soloAct, facts, 'en'));
      /* 匿名男性补全（用户指定）：口交/群交这些多人 tag 由
         「没有身体的阴茎 / 看不见脸的男人」完成画面 */
      if (anon) shared.push.apply(shared, ANON_MALE_EN[anon]);
    }
    lines.push(dedupeJoin(shared));

    /* ④ 角色描述与动作 —— 按人数采取不同策略 */
    if (n === 1){
      /* 单人：外貌、动作与状态可融合在连贯的 Tag 列表中，不做位置声明 */
      const c = chars[0];
      const one = [];
      /* 角色卡：base 拆条后去掉 1girl/solo（人数前缀已由 ② 行给出）；
         全裸时改用 core / 剥掉服饰串，见 charBaseTags */
      const cb = charBaseTags(c, ctx);
      if (cb) one.push.apply(one, cb);
      else one.push.apply(one, poolByFacts(charPromptParts(c, ctx), facts, 'en'));
      /* 单人身体细节补全：用单人专属的 tagact，剔除"对别人做"的动作池 */
      one.push.apply(one, poolByFacts(soloTagAct(ctx), facts, 'en'));
      if (fit && fit.en) one.push(fit.en);
      /* 衣着状态 tag（半脱 / 露胸 / 破损 / 正常着衣）：随机角色走 fields.ostate，
         角色卡没有该字段，这里统一补上 */
      if (cmFit === 'state'){
        const stT1 = outfitStateTags(ctx);
        if (stT1) one.push.apply(one, stT1);
      }
      lines.push(dedupeJoin(one));
    } else if (n === 2){
      /* 双人：不强制网格坐标，空间关系由动作本身定义；
         动作链绑定必须写在同一句 */
      const grp = (sf.position && sf.position.grp) || 'front';
      const A = chars[0], B = chars[1];
      /* 先写各自的外观与姿态（含全身细描）。
         角色卡走 charTagParts（用 base 拆条），随机角色走核心特征 + 细节补全；
         每人行里不能再带 1girl/1boy/solo —— 人数前缀已由 ② 行给出。 */
      const aParts = poolByFacts(charTagParts(A, ctx, 3), facts, 'en');
      const bParts = poolByFacts(charTagParts(B, ctx, 3), facts, 'en');
      /* 手动指定成套服饰时每人穿上同一套（角色卡 base 里不含服装） */
      if (fit && fit.en){
        aParts.push(fit.en); bParts.push(fit.en);
      }
      /* 衣着状态 tag 与发衣解耦：破损 / 正常着衣保留原设（无新衣）时也要叠加 */
      if (cmFit === 'state'){
        const stT = outfitStateTags(ctx);
        if (stT){ aParts.push.apply(aParts, stT); bParts.push.apply(bParts, stT); }
      }
      lines.push(`${charNameTag(A)}: ` + dedupeJoin(aParts));
      lines.push(`${charNameTag(B)}: ` + dedupeJoin(bParts));
      /* 动作链：发起者 + 动作 + 接收者's + 身体部位，必须一句到底。
         女女场景由 actionChain 内部换成手指 / 口 / 磨蹭那一套。 */
      const chain = actionChain(ctx, A, B, scene, grp);
      lines.push(chain.join(', '));
      /* 百合：补一组女女专属 tag（磨蹭 / 指交 / 贴胸 / 接吻） */
      if (isYuri) lines.push(dedupeJoin(yuriPick(2)));
    } else {
      /* 三人及以上：每人独立一段，用 on the left/center/right + with 绑定特征，
         互动写在发起者段内 */
      const grp = (sf.position && sf.position.grp) || 'front';
      const blocks = charBlocks(ctx, chars, scene, grp);
      chars.forEach((c, i) => {
        const extra = [];
        /* 该角色的姿态与表情（不重复核心特征）。
           角色卡的 fields 里没有 hair/eyes/top/body，restFeatures 会返回空，
           这种情况下退回 base 拆条，否则角色卡在三人以上场景里会完全没有外貌。 */
        const feats = charFeatBrief(c, ctx, 2);
        const restAll = c.base
          ? charTagParts(c, ctx, 2).filter(t => feats.indexOf(t) < 0)
          : restFeatures(c, ctx, feats);
        const rest = poolByFacts(restAll, facts, 'en').slice(0, 4);
        if (rest.length) extra.push(...rest);
        /* 手动指定 / 随机换装 / 衣着状态：给每段发新衣（卡 base 里的原设服装已在
           charBaseTags 剥掉），衣着状态再叠加状态 tag */
        if (fit && fit.en){
          extra.push(fit.en);
        }
        if (cmFit === 'state'){
          const stT3 = outfitStateTags(ctx);
          if (stT3) extra.push.apply(extra, stT3);
        }
        if (i === 0){
          /* 第一个角色是被插入方：写被作用后的状态，不重复动作动词 */
          extra.push('body arched', 'mouth open', 'tears');
        } else if (i === 1){
          /* 第二个角色是发起者：写动作链（女女场景没有可插入的主体，换成手指） */
          extra.push(isYuri
            ? `${charNameTag(c)} is between ${charNameTag(chars[0])}'s legs, fingers buried in her pussy`
            : `${charNameTag(c)} is holding ${charNameTag(chars[0])}'s hips, thrusting into ${charNameTag(chars[0])}`);
        } else {
          extra.push('hands reaching toward the center');
        }
        lines.push(blocks[i] + ', ' + dedupeJoin(extra));
      });
      if (isYuri) lines.push(dedupeJoin(yuriPick(2)));
      /* 末尾 From left to right 总结（显著提高站位准确率）
         按 gridPosAt 的实际顺序排列，保证总结与上面分段一致 */
      const idxOrder = chars.map((c, i) => i)
        .sort((a, b) => gridRank(a, chars.length) - gridRank(b, chars.length));
      const order = idxOrder.map(i => charNameTag(chars[i]));
      const posDesc = (grp === 'back') ? 'positioned front to back' : 'interlocking in close proximity';
      if (chars.length <= 3){
        lines.push('From left to right: ' + order.join(', ') + ', ' + posDesc);
      } else {
        lines.push('From left to right, top to bottom: ' + order.join(', ') + ', ' + posDesc);
      }
    }

    /* ⑤ 光照氛围收束句（Anima：末尾始终保留光照氛围收束）
       MOOD_ATMOS 是中文池，这里改用英文氛围词，避免中英混排 */
    const mood = scene.fields.mood;
    const atmo = [];
    if (typeof R18_ATMO !== 'undefined' && R18_ATMO.length){
      for (let i = 0; i < 2; i++) atmo.push(R(R18_ATMO));
    }
    if (mood && mood.en) atmo.push(String(mood.en));
    if (atmo.length) lines.push(dedupeJoin(atmo));

    /* ⑥ 底模收尾标签（year / style / rating） */
    const tail = modelTail(ctx);
    if (tail.length) lines.push(dedupeJoin(tail));

    /* 分段用换行，Anima 模板就是总-分-总的多行结构 */
    return hoistCharLeads(stripCoveredChest(lines.filter(Boolean).join('\n'), ctx), chars);
  }

  /* ---------- SFW 保持原有扁平写法 ---------- */
  const parts = [];
  parts.push.apply(parts, modelHead(ctx));
  if (!useBase){
    const females = chars.filter(c => c.gender === 'female' || c.gender === 'futa').length;
    if (n === 1) parts.push(females ? '1girl' : '1boy');
    else {
      const males = chars.filter(c => c.gender === 'male').length;
      const seg = [];
      if (females) seg.push(females === 1 ? '1girl' : females + 'girls');
      if (males) seg.push(males === 1 ? '1boy' : males + 'boys');
      parts.push(seg.join(' '));
    }
  }
  chars.forEach(c => {
    if (c.base) parts.push(c.base);
    else parts.push.apply(parts, charPromptParts(c, ctx));
  });
  /* 手动指定成套服饰（角色卡 base 里不含服装；随机角色已写在 top 字段，去重后无副作用） */
  if (fit && fit.en) parts.push(fit.en);
  /* 衣着状态（正常着衣在清水下也生效；半脱 / 露胸清水下已回落 null） */
  if (useBase && stTags) parts.push.apply(parts, stTags);
  if (sf.place && sf.place.en) parts.push(sf.place.en);
  if (sf.time && sf.time.en) parts.push(sf.time.en);
  if (sf.camera && sf.camera.en) parts.push(sf.camera.en);
  if (sf.eye && sf.eye.en) parts.push(sf.eye.en);
  if (sf.action && sf.action.zh) parts.push('relaxing, casual atmosphere');
  parts.push.apply(parts, styleParts(ctx));
  parts.push.apply(parts, modelTail(ctx));
  return hoistCharLeads(stripCoveredChest(dedupeJoin(parts), ctx), chars);
}

function buildNegative(ctx){
  const M = modelCfg(ctx.model);
  const arr = M.neg ? M.neg.slice() : NEG_BASE.slice();
  if (ctx.mode === 'nsfw'){
    /* clothed / underwear / bra / panties 是用来"把衣服逼掉"的负面词，
       只有全裸时才该保留。默认（= 角色原设服装）、手动服饰、随机换装
       这三种穿着衣服的情况留着它们，会跟正向的服装 tag 直接打架。 */
    const nude = isNude(ctx);
    arr.push.apply(arr, NEG_NSFW_EXTRA.filter(x => nude || CLOTH_STRIP_NEG.indexOf(x) < 0));
    /* 上装穿着（默认 / 手动服饰 / 随机换装 / 半脱 / 正常着衣）再加一道保险：
       正向已经不再下发乳头 / 乳晕 / 乳沟描写，这里再把"裸露的胸"按负面词压住。
       露胸 / 全裸不加 —— 那是用户的本意。（2026-10-09 轮次 M）
       注意放在这里：自定义负面词必须留在末尾，用户一眼能看到自己填的。 */
    if (!breastsExposed(ctx)) arr.push('bare breasts', 'exposed breasts');
    /* 衣着状态的负面词封口：
       - 正常着衣 → 负面词封死裸体系，模型才不会自作主张扒衣服
       - 露胸     → 封死 bra（露胸却戴着胸罩自相矛盾）与完全全裸
       （半脱不封：衣服还在身上，只是被扒开） */
    const negState = outfitState(ctx);
    if (negState === 'normal') arr.push('nude', 'topless', 'completely nude', 'no bra', 'no panties', 'nipples', 'areolas');
    if (negState === 'topless') arr.push('bra', 'completely nude');
    /* 群交（≥3 人）最容易出的融合肢体 / 分身缺陷，定向压制（2026-10-10）。
       两人场景偶发但概率低，不为它加词——负面词越多对底模的指令稀释越重。 */
    if ((ctx.actors || 1) >= 3){
      arr.push('fused bodies', 'fused limbs', 'fused fingers', 'conjoined twins', 'merged bodies',
        'extra limbs', 'extra arms', 'extra legs', 'extra penises', 'twisted limbs',
        'clone', 'same face', 'disembodied limbs');
    }
  }
  /* 自定义常驻负面词：用户在输入框里自己加的，逐条拆开追加（支持中英逗号与换行）。
     必须排在最后 —— 引擎追加的都在它前面，用户一眼能看到自己填的内容。 */
  if (ctx.customNeg){
    String(ctx.customNeg).split(/[,，\n]/).forEach(t => { t = t.trim(); if (t) arr.push(t); });
  }
  /* 去重 */
  const seen = new Set();
  return arr.filter(x => {
    const k = x.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k); return true;
  }).join(', ');
}

/* =========================================================
   一次性生成整组
   ========================================================= */

/* 必须有阴茎才能成立的标签
   注：迁移重建时修掉了 'deephroat' 这个拼写错误（NSFW_TAGS 里的 id 是
   'deepthroat'），否则该项永远不会命中，"深喉"会被错误地留给无阴茎角色。 */
const NEEDS_PENIS_TAG = ['oral','deepthroat','swallow','paizuri','handjob','footjob',
  'creampie','facial','bukkake','futa','femboy','frottage',
  'buttjob','legjob','hairjob','milking',

  /* ↓ 工坊补充词库（data-nsfw-extend.js）里必须有阴茎才成立的 w_* 标签。
     2026-10-10 阶段一补：这批标签当初一个都没进闸门表，于是全部参与随机补全，
     女性单人场景被塞进 small penis humiliation / saliva on penis 之类，
     regress 换成真脚本名单后跑出 124 条「女性角色混入男性器官」。
     归类口径与复核脚本：.workbuddy/research/scan-w-gate.js */
  'w_fellatio','w_ejaculation','w_licking_penis','w_two_footed_footjob',
  'w_penis_grab','w_titfuck','w_irrumatio','w_afterfellatio',
  'w_two_handed_handjob','w_multiple_paizuri','w_after_paizuri','w_penis',
  'w_cum_in_pussy','w_testicles','w_cum_in_mouth','w_cum_in_ass',
  'w_internal_cumshot','w_projectile_cum','w_glans','w_semen',
  'w_cock_ring','w_penis_size_difference','w_leash_on_penis','w_small_penis_humiliation',
  'w_food_on_penis','w_penis_measuring','w_sock_on_penis','w_cum_on_tongue',
  'w_cum_in_throat','w_creampie_overflow','w_excessive_creampie','w_dripping_cum',
  'w_cum_inside','w_contains_sperm','w_cum_bucket','w_cum_in_panties',
  'w_cum_swap','w_ejaculating','w_ejaculating_while_penetrated','w_ejaculation_under_clothes',
  'w_group_ejaculation','w_imminent_bukkake','w_simulated_bukkake','w_swallowing_cum',
  'w_unwanted_creampie','w_vomiting_cum','w_saliva_on_penis'
];/* 必须有阴道才能成立的标签（单人男性角色要剔除） */
const NEEDS_PUSSY_TAG = ['creampie','squirt','paizuri','lactation','pregnant',
  'clit_pump','facesit','tribadism',

  /* ↓ 工坊补充词库（data-nsfw-extend.js）里必须有阴道才成立的 w_* 标签。
     2026-10-10 阶段一补：这批标签当初一个都没进闸门表，于是全部参与随机补全，
     女性单人场景被塞进 small penis humiliation / saliva on penis 之类，
     regress 换成真脚本名单后跑出 124 条「女性角色混入男性器官」。
     归类口径与复核脚本：.workbuddy/research/scan-w-gate.js */
  'w_vaginal','w_after_vaginal','w_imminent_vaginal','w_vaginal_penetration',
  'w_double_vaginal','w_cum_in_pussy','w_pussy_juice','w_clitoris',
  'w_large_clitoris','w_labia','w_large_labia','w_vagina',
  'w_clitoris_piercing','w_exposed_clitoris','w_long_labia','w_pussy_exposed',
  'w_pussy_peek','w_clitoris_pull','w_clitoris_tweak','w_pussy_juice_trail',
  'w_thick_pussy_juice','w_pussy_juice_in_mouth','w_pussy_juice_on_face','w_pussy_juice_on_fingers'
];

/* 必须有女性在场才能成立的标签（全男场景要剔除）。
   这些要么要用到乳房 / 阴道，要么本身就是"由女性主导"的题材。 */
const NEEDS_FEMALE_TAG = ['cunnilingus','breast_smother','clamps','femdom',
  'nipple_play','nipplefuck','breast_expansion'];

/* 必须有第二个人才成立的标签（单人场景要剔除） */
const NEEDS_PARTNER_TAG = ['frottage','dp','orgy','netorare','breast_smother','foot_worship','armpit',
  'deep_kiss','ear_lick','facesit','tribadism',

  /* ↓ 工坊补充词库（data-nsfw-extend.js）里必须有第二个人才成立的 w_* 标签。
     2026-10-10 阶段一补：这批标签当初一个都没进闸门表，于是全部参与随机补全，
     女性单人场景被塞进 small penis humiliation / saliva on penis 之类，
     regress 换成真脚本名单后跑出 124 条「女性角色混入男性器官」。
     归类口径与复核脚本：.workbuddy/research/scan-w-gate.js */
  'w_double_penetration','w_double_vaginal','w_ejaculating_while_penetrated','w_ffm_threesome',
  'w_foursome','w_gangbang','w_group_ejaculation','w_group_sex',
  'w_mmf_threesome','w_multiple_insertions','w_multiple_paizuri','w_multiple_penetration',
  'w_pegging','w_spitroast','w_threesome','w_triple_penetration'
];

/* ---------- 单人 × 需男 tag：匿名男性补全（用户指定） ----------
   单人场景显式勾了 口交/深喉/乳交/足交/群交 这类必须由对方完成的 tag 时，
   不再整条丢弃，画面由「看不见脸的男人 / 没有身体的阴茎」完成：
     单对方 → out of frame + disembodied penis + faceless male
     群交类 → multiple boys + boys only + gangbang + grey silhouette
   只对用户显式勾选生效；随机补全仍保持单人纯净（不触发匿名男）。
   触手 / 兽交（monster / bestiality）有自己的非人插入写法，不走本机制。 */
const ANON_MALE_TAGS = ['oral','deepthroat','swallow','paizuri','handjob','footjob',
  'creampie','facial','bukkake','dp','orgy','gloryhole',
  'buttjob','legjob','hairjob','milking'];
const ANON_MALE_MULTI_TAGS = ['orgy','dp','bukkake','gloryhole'];
const ANON_MALE_EN = {
  one:   ['out of frame', 'disembodied penis', 'faceless male'],
  multi: ['multiple boys', 'boys only', 'gangbang', 'grey silhouette', 'out of frame', 'disembodied penis']
};
/* 触发：单人 + 有女性 + 显式勾选（ctx.tags 是用户点的，不含随机补全）。
   返回 null / 'one'（单对方）/ 'multi'（群交类）。 */
function anonMaleFor(ctx){
  if (!ctx || (ctx.actors || 1) >= 2) return null;
  if (ctx._hasPussy === false) return null;
  const tags = actTags(ctx);
  if (tags.indexOf('monster') >= 0 || tags.indexOf('bestiality') >= 0) return null;
  const hit = ((ctx.tags && ctx.tags.length) ? ctx.tags : [])
    .filter(id => ANON_MALE_TAGS.indexOf(id) >= 0);
  if (!hit.length) return null;
  return hit.some(id => ANON_MALE_MULTI_TAGS.indexOf(id) >= 0) ? 'multi' : 'one';
}
/* 女女 / 无男场景里进不了画面的男性器官描写（法典条目过滤用） */
const MALE_ORGAN_RE = /阴茎|肉棒|精液|白浊|龟头|阴囊|睾丸|射精|射进|灌满|\b(?:penis|semen)\b/i;
/* 法典 en 侧的多人词（源站把一批多人群交条目误标成 g:'solo'，
   单人 / 单人匿名场景要按英文再挡一道） */
const SOLO_MULTI_EN_RE = /\b(?:gangbang|group sex|multiple boys|multiple girls|spitroast|double penetration|triple penetration|threesome|foursome|boys only|\d+\+?\s*boys)\b/i;

/* ---------- 标签 id 表启动自检 ----------
   上面四张表 + RANDOM_EXCLUDE_TAGS + pickActiveTags 的兜底池都是**硬编码 id**，
   NSFW_TAGS 里哪天改了 id（或再出现一次 'deephroat' 式手误），这些表就会
   **永远不命中且无任何报错**。首次 generateAll 时校验一遍，错了打 warn。 */
let TAG_ID_CHECKED = false;
function tagIdSelfCheck(){
  if (TAG_ID_CHECKED || typeof NSFW_TAGS === 'undefined' || !NSFW_TAGS.length) return;
  TAG_ID_CHECKED = true;
  const ids = new Set(NSFW_TAGS.map(t => t.id));
  const tables = {
    NEEDS_PENIS_TAG, NEEDS_PUSSY_TAG, NEEDS_FEMALE_TAG, NEEDS_PARTNER_TAG,
    RANDOM_EXCLUDE_TAGS: (typeof RANDOM_EXCLUDE_TAGS !== 'undefined') ? RANDOM_EXCLUDE_TAGS : [],
    SOLO_FALLBACK: ['masturb', 'toy', 'squirt', 'fetish']
  };
  Object.keys(tables).forEach(name => {
    (tables[name] || []).forEach(id => {
      if (!ids.has(id)) console.warn('[randgen] 启动自检：' + name + ' 里的 id「' + id + '」不在 NSFW_TAGS 中（拼写错误将永不命中）');
    });
  });
}

/* 中英平行数组按正则同时过滤，返回可交给 PAIR() 的一对数组 */
function filterPair(zhArr, enArr, re){
  const z = [], e = [];
  const n = Math.min(zhArr.length, enArr.length);
  for (let i = 0; i < n; i++){
    if (re.test(zhArr[i]) || re.test(enArr[i])) continue;
    z.push(zhArr[i]); e.push(enArr[i]);
  }
  return z.length ? { zh: z, en: e } : null;
}

/* 单人角色的体液池：把与身体不符的描写剔掉 */
function fluidPairFor(hasPenis, hasPussy, hasBreast){
  let p = { zh: NS_FLUID.slice(), en: NS_FLUID_EN.slice() };
  if (!hasPenis){
    const f = filterPair(p.zh, p.en, /semen|precum|glans|cum\b|ejaculat|精液|前列腺液|龟头|白浊/i);
    if (f) p = f;
  }
  if (!hasPussy){
    const f = filterPair(p.zh, p.en, /pussy|vagina|labia|clitoris|阴道|淫水|爱液/i);
    if (f) p = f;
  }
  if (!hasBreast){
    const f = filterPair(p.zh, p.en, /cleavage|breasts|乳沟/i);
    if (f) p = f;
  }
  return p;
}

/* 本次生效的标签：用户勾选则从中抽取，未勾选则从全池抽取，数量 2~4 */
/* 这几个标签会**改变画面的基本设定**（凭空长出触手 / 变成透视剖面），
   不适合被随机补全命中——普通场景里它们就是"画不出来"的来源。
   用户显式勾选时照常生效，只是不参与自动随机。 */
const RANDOM_EXCLUDE_TAGS = ['monster', 'xray',
  /* 第十八轮新增的 28 个标签一律不进随机补全：默认生成保持"常规"体验，
     想看这些内容请在选择器里显式勾选（勾选后走 ctx.tags，不受本表影响）。 */
  'cunnilingus', 'frottage', 'breast_smother', 'foot_worship',
  'fisting', 'huge_insert', 'clamps',
  'blindfold', 'gag', 'suspended', 'wax', 'electro', 'trampling',
  'orgasm_denial', 'forced_orgasm',
  'femdom', 'netorare', 'chikan', 'gloryhole', 'prostitution', 'time_stop', 'hypnosis',
  'armpit', 'tickling', 'inflation', 'mind_control', 'corruption', 'bestiality',
  /* 二期扩展（2026-10-09）：重口 / 特殊题材同样只走显式勾选 */
  'nipplefuck', 'enema', 'urethral', 'breast_expansion', 'navel_fuck', 'asphyx', 'clit_pump'];

function pickActiveTags(ctx, hasPenis, hasFemale){
  const all = NSFW_TAGS.map(t => t.id);
  /* 身体 / 人数可行性：无论是否手动勾选，前提不成立的 tag 都不能进结果
     （没有阴茎时不该出现乳交，单人场景不该出现双人玩法，
       没有阴道时不该出现 squirt / 泌乳 / 受孕 —— squirt 的 en 含 pussy 词） */
  const allowed = (id) =>
    (NEEDS_PENIS_TAG.indexOf(id) < 0 || hasPenis) &&
    (NEEDS_PUSSY_TAG.indexOf(id) < 0 || hasFemale) &&
    (hasFemale === false ? NEEDS_FEMALE_TAG.indexOf(id) < 0 : true) &&
    (ctx.actors < 2 ? NEEDS_PARTNER_TAG.indexOf(id) < 0 : true);
  const w = ctx.tagW || {};
  const picked = (ctx.tags && ctx.tags.length) ? ctx.tags.slice() : [];

  if (picked.length){
    /* 点击加权：用户点过的 tag 全部必出（旧版只随机抽 2~4 个，点过的经常被丢掉）；
       再补 0~2 个随机 tag 做搭配，保留一点意外性。
       例外（匿名男性补全）：单人显式勾了 口交/群交 这类需男 tag 时不丢弃，
       画面由 faceless male / disembodied penis 完成（见 ANON_MALE_TAGS）。 */
    const anon = anonMaleFor(ctx);
    const out = picked.filter(id => allowed(id) || (anon && ANON_MALE_TAGS.indexOf(id) >= 0));
    const rest = fyShuffle(all.filter(id =>
      picked.indexOf(id) < 0 && RANDOM_EXCLUDE_TAGS.indexOf(id) < 0 && allowed(id)));
    return out.concat(rest.slice(0, RN(0, 2)));
  }

  let pool = all.filter(id => RANDOM_EXCLUDE_TAGS.indexOf(id) < 0);
  pool = pool.filter(allowed);
  if (!pool.length) pool = ['masturb', 'toy', 'squirt', 'fetish'];
  const shuffled = fyShuffle(pool);
  const n = Math.min(shuffled.length, RN(2, 4));
  return shuffled.slice(0, n);
}

function actTags(ctx){
  return (ctx.activeTags && ctx.activeTags.length) ? ctx.activeTags : (ctx.tags || []);
}

/* ---------- 点击加权（★ / ★★）----------
   权重 2 → (tag:1.2)，权重 3 → (tag:1.5)。
   Anima / Illustrious / Animagine / Pony 等 SD 系底模都按数值语法识别
   注意力权重；旧版「末尾整行重复」对 Anima 不生效，已废弃。
   加权在 tag 注入点原地生效（见 buildPrompt / buildPresetPrompt）。 */
function weightToken(t, w){
  if (w === 2) return '(' + t + ':1.2)';
  if (w === 3) return '(' + t + ':1.5)';
  return t;
}
/* NS_TAG_EN 的值是「逗号连接的一组 tag」：加权要拆开逐条包 */
function weightTokens(str, w){
  return String(str).split(',').map(s => s.trim()).filter(Boolean).map(t => weightToken(t, w));
}

function generateAll(ctx){
  /* 标签 id 表自检（仅首轮实际执行一次） */
  tagIdSelfCheck();
  /* 播种：ctx.seed 为有效数字 → 确定性结果；否则用真随机播种（行为同旧版）。
     实际用的 seed 回写 ctx.__seed，调用方展示 / 复现用。 */
  const seedUsed = (typeof ctx.seed === 'number' && isFinite(ctx.seed))
    ? (ctx.seed >>> 0) : ((rnd0() * 4294967296) >>> 0);
  ctx.__seed = seedUsed;
  srand(seedUsed);
  /* 不指定角色卡时用「随机N」占位名（ctx.randName === false 才走虚构人名） */
  if (typeof ctx.randName === 'undefined') ctx.randName = true;
  const genders = planGenders(ctx);
  ctx._genders = genders;   /* 无脸男判断用（轮次 Y） */
  const hasPenis = genders.some(g => g === 'male' || g === 'futa');
  /* 现场是否存在阴道：全男场景为 false，体液 / 体位要据此换池 */
  ctx._hasPussy = genders.some(g => g !== 'male');
  ctx._hasPenis = hasPenis;
  /* 百合：全员无阴茎且不止一个人。体位 / 动作 / 动作链 / 台词都切女女版本 */
  ctx._yuri = (!hasPenis && ctx.actors >= 2);
  ctx.activeTags = pickActiveTags(ctx, hasPenis, ctx._hasPussy);
  const chars = [];
  for (let i = 0; i < ctx.actors; i++) chars.push(makeChar(ctx, i, genders[i]));

  /* 角色自身的身体条件同样是「物理状态」：胸是平的就不该抽到乳交，
     泌乳中就不该出现夹弄的动作。这些字段挂在角色卡上，先推成事实再进场景。 */
  const preFacts = new Set();
  chars.forEach(c => {
    ['breast', 'body', 'genital', 'butt', 'skin2'].forEach(k => {
      const f = c.fields[k];
      if (f) factsFromTextOf(f.zh || '', preFacts);
    });
  });
  factsClose(preFacts);
  /* 随机生成的身体条件与用户显式勾选的标签冲突时，以用户的显式选择为准：
     角色随机抽到「平胸」，但用户勾了「泌乳 / 乳交」，那就放弃"平胸"，
     而不是两句话都写进去（胸是平的却挤出奶，AI 也画不出来）。 */
  const tids = ctx.activeTags || [];
  if (tids.indexOf('paizuri') >= 0 || tids.indexOf('lactation') >= 0) preFacts.delete('flatChest');
  ctx.__preFacts = preFacts;

  /* makeScene 拿不到 chars，把第一位的实际性别放一份到 ctx 上，
     供单人场景的体位池筛选使用 */
  ctx._gender0 = genders[0];
  ctx._genders = genders.slice();   /* 梦神法典姿势按男女构成选组（轮次 K） */
  const scene = makeScene(ctx);
  /* 场景字段本身可能带来新的物理状态（体位就写着"被吊起来"），
     这里统一固化一次，故事与提示词两侧共用同一套约束 */
  const facts = factsOfCtx(ctx, scene);
  const story = buildStory(ctx, chars, scene);
  /* 匿名男性补全：solo 模板里写死的"一个人待着 / 没有别人"与
     "看不见脸的男人在场"自相矛盾，渲染完统一抹掉（轮次 K 用户指定） */
  const anonStory = anonMaleFor(ctx);
  const storyOut = anonStory
    ? story.replace(/没有别人，/g, '').replace(/一个人待着，/g, '')
    : story;
  const prompt = buildPrompt(ctx, chars, scene);
  const negative = buildNegative(ctx);
  return { chars, scene, story: storyOut, prompt, negative, tags: ctx.activeTags.slice(), mode: ctx.mode,
    facts: (typeof cfDescribe === 'function' ? cfDescribe(facts) : ''), ts: Date.now() };
}

/* =========================================================
   短篇（50~100 字）—— 情境子页用
   思路：反复试拼，取字数落在区间内的结果；取不到就取最接近的
   ========================================================= */

function shortDict(ctx, chars, scene){
  const A = chars[0] || chars[0];
  const B = chars[1] || A;
  const hasPenis = chars.some(c => c.gender === 'male' || c.gender === 'futa');
  const aIsMale = A.gender === 'male';
  const penChar = (B.fields && B.fields.penis) ? B : (chars.find(c => c.gender === 'male' || c.gender === 'futa') || B);
  const gf = (c, k) => (c.fields && c.fields[k] && c.fields[k].zh) ? c.fields[k].zh : '';

  const fixed = {
    A: A.meta.name,
    /* {look} = 人物卡的中文外貌备注，没有备注时展开为空串，模板里紧跟在 {A} 后面 */
    look: (A.card && A.card.note) ? '（' + A.card.note + '）' : '',
    B: (B === A) ? '另一个人' : B.meta.name,
    place: scene.fields.place ? scene.fields.place.zh : R(PLACE[ctx.world] || PLACE.modern),
    time: scene.fields.time ? scene.fields.time.zh : R(TIME_LIGHT),
    mood: scene.fields.mood ? scene.fields.mood.zh : R(MOOD_ATMOS)
  };
  const dyn = {};

  if (ctx.mode === 'sfw'){
    fixed.act = (scene.fields.action && scene.fields.action.zh) ? scene.fields.action.zh : R(SFW_ACTION);
    dyn.act = SFW_ACTION;
    dyn.end = SFS_END;
    return { fixed, dyn };
  }

  /* 有自定义身体描写时混进候选池，兼顾代入感与字数。
     随机池那部分同样要过物理状态（见 buildStory 的同名处理）。 */
  const facts = factsOf(scene).size ? factsOf(scene)
    : ((ctx && ctx.__facts instanceof Set) ? ctx.__facts : factsOfCtx(ctx, scene));
  const pussyPool = aIsMale ? poolByFacts(NS_MALE_RECEIVE, facts, 'zh')
    : (gf(A, 'genital') ? [gf(A, 'genital')].concat(SNS_PUSSY) : SNS_PUSSY.slice());
  const penisPool = hasPenis
    ? (gf(penChar, 'penis') ? [gf(penChar, 'penis')].concat(SNS_PENIS) : SNS_PENIS.slice())
    : poolByFacts(NS_NO_PENIS_TOOL, facts, 'zh');

  fixed.toy = gearNoun((scene.fields.toy && scene.fields.toy.zh) ? scene.fields.toy.zh : R(poolByFacts(NS_TOY, facts, 'zh')));
  /* 模板里写死的"只是自己动手"也要服从物理状态：手被绑着 / 睡着时不能这么说 */
  fixed.soloact = (facts.has('handsBound') || facts.has('restrained')) ? '只能绷着身体任它反应'
                 : facts.has('asleep') ? '半睡半醒地由着身体反应'
                 : '只是自己动手';
  dyn.pussy = pussyPool;
  dyn.penis = penisPool;
  /* 「开着最大档」「震个不停」这种话只有真正的器具才成立，
     道具字段可能是口球 / 胶带 / 绳子，直接引用会成病句 */
  dyn.toyDev = poolByFacts(TOY_DEVICE.length ? TOY_DEVICE : NS_TOY, facts, 'zh');
  /* 单人场景的短篇同样不能出现需要第二个人的句子 */
  const soloShort = chars.length < 2;
  const actShort = soloShort ? SNS_ACT.filter(s => !SOLO_ACT_BLOCK.test(s)) : SNS_ACT;
  dyn.act = pickActPool(poolByFacts(actShort.length ? actShort : SNS_ACT, facts, 'zh'), facts,
    (scene.fields.position && scene.fields.position.zh) || '');
  dyn.sound = poolForField('sound', soloShort ? SNS_SOUND.filter(s => !SOLO_ACT_BLOCK.test(s)) : SNS_SOUND, facts, 'zh');
  dyn.fluid = poolByFacts(soloShort ? NS_FLUID_SOLO : (hasPenis ? SNS_FLUID : NS_FLUID_F), facts, 'zh');
  dyn.end = SNS_END;
  dyn.dirty = poolForField('dirty', soloShort ? NS_DIRTY_SOLO : (hasPenis ? NS_DIRTY : NS_DIRTY_F), facts, 'zh');
  return { fixed, dyn };
}

function buildShortStory(ctx, chars, scene){
  let tpls = (ctx.mode === 'sfw') ? SFW_SHORT_TPL : NS_SHORT_TPL;
  /* 单人：不能出现"另一个人"；多人：也不能出现"一个人"——
     否则三人场景会写出「A 一个人…」这种和在场人数矛盾的句子。 */
  if (chars.length < 2){
    const solo = tpls.filter(t => t.indexOf('{B}') < 0);
    if (solo.length) tpls = solo;
  } else {
    const multi = tpls.filter(t => t.indexOf('一个人') < 0 && t.indexOf('{soloact}') < 0);
    if (multi.length) tpls = multi;
  }
  /* 模板骨架与当前物理状态冲突的（写死的身体状态句）先剔掉 */
  const facts = factsOrNull(scene, ctx);
  if (facts && facts.size){
    const ok = tpls.filter(t => tplSkeletonOk(t, facts));
    if (ok.length) tpls = ok;
  }
  let best = null, bestScore = Infinity;
  for (let i = 0; i < 60; i++){
    const tpl = R(tpls);
    const d = shortDict(ctx, chars, scene);
    const s = fillTpl(tpl, d.fixed, d.dyn).replace(/[\r\n]+/g, '');
    const L = s.replace(/\s/g, '').length;
    if (L >= 50 && L <= 100) return s;
    const score = (L < 50) ? (50 - L) : (L - 100);
    if (score < bestScore){ bestScore = score; best = s; }
  }
  /* 兜底：仍不足 50 字就补一句收尾 */
  if (best && best.replace(/\s/g, '').length < 50){
    const pool = (ctx.mode === 'sfw') ? SFS_END : SNS_END;
    best = best.replace(/[。]+$/, '') + '，' + R(pool) + '。';
  }
  return best || '';
}

/* 角色卡纯文本 */
function charToText(chars, scene, ctx){
  let s = '';
  chars.forEach((c, i) => {
    s += `【角色 ${i + 1}】${c.meta.name}\n`;
    for (const k in c.fields){
      const f = c.fields[k];
      s += `  ${f.label}：${f.zh}\n`;
    }
    s += '\n';
  });
  s += '【场景】\n';
  for (const k in scene.fields){
    const f = scene.fields[k];
    s += `  ${f.label}：${f.zh}\n`;
  }
  return s.trim();
}
