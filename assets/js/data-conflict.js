/* =========================================================
   data-conflict.js —— 物理状态推演 · 互斥规则 · 冲突消解

   为什么要有这个文件：
     随机抽池的子问题是「各抽各的」，抽出来的东西彼此可能物理上
     不能共存——最典型的就是「口球 + 口交」：嘴里塞着东西还说得出
     台词、含得住、吞得下，AI 画不出来，文本读起来也自相矛盾。

   做法：
     ① 先推演「物理事实」（facts）：嘴被占了吗？手被绑了吗？眼被蒙了吗？
        身上穿的是全包衣还是全裸？当前是不是在公共场所？
     ② 再用事实去过滤后续所有词池：
        被占用 = 一切依赖该部位的动作 / 台词 / 声音 / 表情全部换池或剔除。
     ③ 最后一层兜底扫描：拼好的文本再核一遍明显的矛盾对。

   事实来源（越靠前越可靠）：
     1. 用户勾选或随机命中的内容标签（activeTags）
     2. 抽中的道具 / 束缚具 / 服饰
     3. 抽中的体位与动作文本
   ========================================================= */

/* =========================================================
   一、事实枚举
   gagged     嘴被占用（口球 / 口塞 / 胶带 / 布团 / 内裤塞口 / 枷锁）
   blindfolded 视线被遮（眼罩 / 蒙眼布 / 头套）
   hooded     头部被完全包住（胶衣头套 / 全包衣）
   restrained 四肢受限（捆绑 / 手铐 / 绳缚 / 悬吊 / 枷锁 / 分腿器）
   handsBound 双手受限（手腕捆绑 / 反绑 / 手铐 / 吊起）
   legsBound  双腿受限（分腿器 / 脚踝捆绑）
   suspended  被吊离地面（悬空捆绑 / 吊绳）
   chastity   下体上锁（贞操带 / 贞操内衣 / 护裆锁）
   condom     戴套
   flatChest  平胸 / 贫乳
   lactating  泌乳（与乳交冲突：一个在出奶一个在夹）
   pierced    穿环（乳环 / 阴蒂环 / 脐环）
   clothed    穿着衣服（着衣做爱 / 隔着衣服）
   allCover   全身覆盖（全包紧身衣 / 乳胶连体）
   asleep     睡眠 / 半睡半醒 / 昏迷
   ahegao     失神崩坏（说不出整句）
   nonhuman   非人（触手 / 怪物 / 兽）
   public     公共场所 / 会被看到
   xray       透视剖面
   vore       吞食 / 极端题材
   virgin     处女 / 破瓜
   pregnant   怀孕
   pierced_   保留位
   ========================================================= */

/* 事实识别规则：[事实id, 中文正则, 英文正则]
   同时用于「从文本推演事实」和「按事实过滤文本」两处 */
const CF_FACT_RULES = [
  ['gagged',      /口球|口塞|口枷|球塞|棍塞|塞口|布团|封口|封住嘴|封住口|封嘴|胶带封|胶带贴|塞住嘴|堵住嘴|堵着嘴|咬着布|咬着绳|用内裤塞|嘴里塞|捂住嘴|嘴被捂住|捂住口|捂着嘴/,
                  /\b(ballgag|ball gag|bitgag|ring gag|cleave gag|tapegag|tape gag|panty gag|gagged|gag)\b|mouth stuffed|mouth full|mouth covered|hand over mouth|pillory|tape sealing the mouth/i],
  ['blindfolded', /眼罩|蒙眼|蒙住眼|蒙上眼|遮住眼|黑布蒙|看不见东西|眼睛被蒙|蒙住眼睛|眼睛蒙住|蒙上眼睛|双目被蒙|眼前一片黑/,
                  /blindfold|eye covering|sightless|eyes blindfolded|eyes covered/i],
  ['hooded',      /头套|胶衣头套|套衣头套|罩住整个头|头罩/,
                  /hood\b|hooded|head covering/i],
  ['restrained',  /捆绑|绑住|缚|绳索|麻绳|绳子|手铐|铐住|枷锁|束带|拘束|吊起来|悬吊|被吊|分腿器|绳衣|捆住|捆起来|勒进|反剪|固定在|绑成|绑在(?:身后|头顶|床头|床上|椅|柱|架|凳|栏杆|地)/,
                  /bondage|shibari|rope|bound|bounded|restrain|handcuff|pillory|spreader bar|hogtie|frogtie|suspension|chained|caged|crotch rope|pinned behind|fixed in place/i],
  ['handsBound',  /手腕被绑|双手被绑|反绑|反剪|绑在身后|绑在头顶|手被绑|手腕被捆|捆住手|铐住|手铐|悬吊|吊起来|绑在椅|双手被压|手腕被按住|手腕被拉开|被拉到头顶/,
                  /bound wrists|hands bound|wrist bound|bound arms|arms behind back|arms bound|arms pinned|pinned behind the back|handcuff|suspension|hung from/i],
  ['legsBound',   /双腿被绑|脚踝被绑|分腿器|绑住脚踝|腿被分开绑|脚被绑|腿被分开固定|双腿被固定|腿被固定住|分开固定住/,
                  /bound ankles|ankles bound|legs bound|spreader bar|ankle restraint|legs spread and fixed|fixed in place/i],
  ['suspended',   /吊起来|悬吊|被吊|脚尖够不到|吊在半空|绳吊|吊着|离地/,
                  /suspension|suspended|hung|dangling|hoisted|feet off the ground/i],
  ['chastity',    /贞操|锁住不许碰|护裆锁|上锁|不许碰/,
                  /chastity|locked in a belt|locked\b/i],
  ['condom',      /戴套|安全套|避孕套|套上|戴了套|套子/,
                  /condom|wearing a condom/i],
  ['flatChest',   /平胸|贫乳|几乎没有胸|平坦的胸|小胸/,
                  /flat chest|small breasts|tiny breasts|small chest/i],
  ['lactating',   /涨奶|泌乳|奶水|出奶|喂奶|乳白.*渗|渗.*乳白/,
                  /lactating|lactation|breast milk|leaking milk|breast feeding/i],
  ['pierced',     /乳环|阴蒂环|脐环|穿环|阴核环|穿孔/,
                  /piercing|pierced|nipple ring|clit ring|navel piercing/i],
  ['clothed',     /还穿着|穿得整整齐齐|制服还没脱|衣服还在|着衣|隔着衣服|没脱|穿着衣|裙摆撩起来/,
                  /clothed|fully clothed|dressed|under clothes|through clothes/i],
  ['allCover',    /全包|连体衣|乳胶衣|紧身衣.*包|从头包到脚/,
                  /full body suit|latex suit|zentai|bodysuit covering/i],
  ['asleep',      /半睡半醒|迷迷糊糊|睡着了|熟睡|还没醒|装睡|昏过去/,
                  /sleeping|half awake|asleep|somnophilia|unconscious/i],
  ['ahegao',      /失神|阿嘿|翻了白眼|舌头收不回去|失了焦|脑子空了|彻底不成样子/,
                  /ahegao|mind break|empty eyes|drooling heavily/i],
  ['nonhuman',    /触手|触须|怪物|异形|兽交|非人|爬虫|藤蔓/,
                  /tentacle|monster|bestiality|beast|non-human|tentacles/i],
  ['public',      /公共场所|大庭广众|会被看见|随时可能有人|门外|人来人往|露出/,
                  /public use|exhibitionism|in public|caught|walk-in|voyeur/i],
  ['xray',        /透视剖面|剖视|剖面/,
                  /x-ray|cross-section|internal view/i],
  ['vore',        /吞食|吃人|整个吞/,
                  /vore|swallowed whole/i],
  ['virgin',      /处女|破瓜|第一次被|还没有开过|没被碰过/,
                  /virgin|defloration|first time/i],
  ['pregnant',    /怀孕|身孕|孕肚|小腹.*隆起|肚子里/,
                  /pregnant|impregnat|belly bulge/i]
];

/* =========================================================
   二、事实 → 禁用内容（互斥表）

   zh：中文文本里不该再出现的内容（正则）
   en：英文提示词里不该再出现的内容（正则）
   tags：整键禁用的内容标签 id（NS_TAG_POOL / NS_TAG_EN）
   fields：需要整体换池的字段
   ========================================================= */
const CF_FACT_BLOCK = {
  /* 嘴被占用：一切用嘴的、要说话的、含得住的都不成立 */
  gagged: {
    zh: /口交|含住|含进|含入|吮|吸吮|舔|深喉|舌面|舌尖|舌根|咽下|吞下|吞进|亲吻|接吻|吻|张着嘴|张嘴|叫出声|喊出来|求饶|呻吟|台词|说出口|念出|含含糊糊地说|整根吞/,
    en: /fellatio|blowjob|oral\b|irrumatio|deepthroat|cunnilingus|anilingus|rimming|tongue|kiss|swallow|gokkun|mouth open|moan|speak|lick|suck/i,
    tags: ['oral', 'deepthroat', 'swallow', 'rimming', 'facial', 'bukkake'],
    fields: ['dirty', 'sound'],
    note: '口球 / 口塞 / 胶带封口'
  },
  /* 蒙眼：写不了对视，也写不了"看见" */
  blindfolded: {
    zh: /对视|目光|盯着看|看着对方|看进眼睛|眼里|眼神|四目|视线相撞|看了一眼/,
    en: /eye contact|looking at viewer|looking at each other|gazing into|eye to eye/i,
    tags: ['voyeur'],
    fields: [],
    note: '眼罩 / 蒙眼'
  },
  /* 头部被包住：脸和头发都不该再被描述 */
  hooded: {
    zh: /脸上糊着|睫毛|眼神|表情|嘴角|脸颊|头发|发丝|咬着下唇/,
    en: /face|expression|hair|eyes|lips/i,
    tags: ['facial', 'bukkake'],
    fields: ['expr'],
    note: '头套 / 全包头'
  },
  /* 双手被绑：用手完成的事都做不了 */
  handsBound: {
    zh: /手指|五指|用手|用指|拇指|指尖|指腹|自慰|手交|自己动手|手上|手里|掌心|指节|指缝|手掌|抓|握|撑|扶|托|抬起手|抬手|摸索|抚摸/,
    en: /handjob|fingering|masturbat|fingers|fingertip|thumb|palm|gripping|grab|hand working|hand support/i,
    tags: ['handjob', 'masturb', 'toy'],
    fields: [],
    note: '手腕被绑 / 反绑'
  },
  /* 四肢受限：自主动作受限 */
  restrained: {
    zh: /自己动手|自己坐上去|自己动|自己来|自己挺|自己扭|自己骑|主动|自己把|伸手|走过去|跪下来/,
    en: /self-|on top|riding|straddling|actively|moving on their own/i,
    tags: [],
    fields: [],
    note: '捆绑 / 拘束'
  },
  /* 被吊起来：双脚离地，主动发力类体位全废，躺卧类（需要床面）与"被人抱起来"也不成立 */
  suspended: {
    zh: /骑|跨坐|坐上去|蹲|跪|趴|撑|站|腿并拢|张开腿|脚踩|踩|支撑|重量压在|俯卧|仰卧|侧卧|平躺|躺在床上|压着|抱起来|被抱着|在怀里/,
    en: /cowgirl|riding|straddling|sitting on|kneeling|squatting|standing|on all fours|spread legs|footjob|legs apart|lying|prone|on the back|on the side|carried|held up in the arms/i,
    tags: ['footjob', 'paizuri', 'handjob', 'masturb'],
    fields: [],
    note: '悬空捆绑 / 吊起'
  },
  /* 下体上锁：进不去也射不进，更骑不上去 */
  chastity: {
    zh: /插进去|进入|被填满|撑开|灌在最里面|内射|被顶|抽送|进入身体|被插入|穴口被|塞进|坐下去|交合|含进去|被撑开|骑|跨坐|女上|坐在.{0,3}腿上/,
    en: /penetrat|insertion|inserted|filled|creampie|cum inside|stuffed|thrust|sinking down onto|joined together|cowgirl|riding|straddling/i,
    tags: ['creampie', 'anal', 'dp', 'toy', 'defloration'],
    fields: [],
    note: '贞操带 / 上锁'
  },
  /* 戴套：写不了内射 */
  condom: {
    zh: /内射|灌在最里面|灌满|射在里面|射进|直接射在里|里面.*白浊|中出/,
    en: /creampie|cum inside|creampied|filled with cum|breeding|insemination/i,
    tags: ['creampie'],
    fields: [],
    note: '避孕套'
  },
  /* 平胸 / 贫乳：乳交、乳沟、泌乳都不成立 */
  flatChest: {
    zh: /乳沟|夹着.*乳房|用.*乳房.*夹|乳交|乳白|奶水|泌乳|深深的乳沟|双手把乳房往中间推|乳房.*裹住|乳尖上渗出/,
    en: /paizuri|cleavage|breast milk|lactat|breasts around|breasts squeezed/i,
    tags: ['paizuri', 'lactation'],
    fields: ['breast'],
    note: '平胸 / 贫乳'
  },
  /* 泌乳：与乳交的动作逻辑相冲（一个在出奶，一个在夹弄） */
  lactating: {
    zh: /乳交|用.*乳房.*夹|双手把乳房往中间推/,
    en: /paizuri|breasts around penis/i,
    tags: ['paizuri'],
    fields: [],
    note: '泌乳'
  },
  /* 着衣：不该出现全裸描写 */
  clothed: {
    zh: /一丝不挂|全裸|赤裸|什么都没穿|光着身子/,
    en: /completely nude|naked|fully nude|undressed/i,
    tags: [],
    fields: [],
    note: '着衣做爱'
  },
  /* 全身被包住：没有一处裸露皮肤，也就穿不了别的衣服 */
  allCover: {
    zh: /隔着衬衫|隔着衣|衬衫|裙子|校服|水手服|半脱|褪到|内衣裙|蕾丝|袜口|连裤袜/,
    en: /shirt|skirt|sailor uniform|school uniform|lingerie|panties|pantyhose|stockings|through the clothes/i,
    tags: [],
    fields: [],
    note: '全包紧身衣 / 乳胶衣'
  },
  /* 睡眠：不能主动索要、主动动作，也不可能站着跪着骑乘（人要撑得住自己） */
  asleep: {
    zh: /自己动手|主动|自己把|自己动|自己来|自己挺|自己|主动挺|主动迎|索要|求着|自己坐上去|按着.*自己动|配合着|迎合|站立|站着|跪着|跪姿|蹲|骑乘|跨坐|女上|撑着/,
    en: /actively|self-|begging|on top|riding|straddling|cowgirl|moving on their own|standing|kneeling|squatting|on all fours/i,
    tags: ['masturb', 'handjob', 'footjob', 'paizuri'],
    fields: [],
    note: '睡眠 / 半睡半醒'
  },
  /* 失神崩坏：说不出完整句子 */
  ahegao: {
    zh: /清楚地|完整地说了|一句完整|条理清楚|神志清明/,
    en: /clearly speaking|coherent/i,
    tags: [],
    fields: [],
    note: '失神崩坏'
  },
  /* 非人：人类体位池不该混进来 */
  nonhuman: {
    zh: /双手把|手掌|手指|跨坐|骑乘|跪姿|主动/,
    en: /cowgirl|missionary|doggystyle|riding|handjob|handjob|fingers/i,
    tags: ['handjob', 'footjob', 'paizuri', 'petplay'],
    fields: [],
    note: '触手 / 怪物'
  },
  /* 公共场所：私密场所的描写不合逻辑 */
  public: {
    zh: /锁好门|不会有人|独自一人|安静的房间里|插上门|窗帘拉紧/,
    en: /private room|locked door|empty room/i,
    tags: [],
    fields: ['place'],
    note: '公共场所 / 露出'
  },
  /* 透视剖面：主提示词里不能再叠遮挡构图 */
  xray: {
    zh: /挡住|遮挡|看不见里面|被裙子盖住/,
    en: /obscured|hidden|covered up/i,
    tags: [],
    fields: [],
    note: '透视剖面'
  },
  /* 破瓜：与"久经沙场"的描写相冲 */
  virgin: {
    zh: /熟练|经验丰富|轻车熟路|早已习惯|不是第一次/,
    en: /experienced|skillful|used to it/i,
    tags: [],
    fields: [],
    note: '处女 / 破瓜'
  },
  /* 怀孕：大幅动作与压迫小腹要收敛 */
  pregnant: {
    zh: /压在小腹上|整个人压上去|小腹一紧|跳上去|猛地/,
    en: /lying on the belly|pressing down hard/i,
    tags: [],
    fields: [],
    note: '怀孕'
  }
};

/* =========================================================
   三、内容标签 → 事实（用户勾选或随机命中时推演）
   ========================================================= */
const CF_TAG_FACTS = {
  oral:        ['gagged_never'],        /* 反向标记：与 gagged 互斥，见 CF_MUTEX */
  deepthroat:  [],
  swallow:     [],
  paizuri:     [],
  handjob:     [],
  footjob:     [],
  anal:        [],
  rimming:     [],
  dp:          [],
  creampie:    [],
  facial:      [],
  bukkake:     [],
  squirt:      [],
  masturb:     [],
  toy:         ['restrained_possible'],
  bondage:     ['restrained', 'handsBound'],
  bdsm:        ['restrained'],
  humil:       [],
  public:      ['public'],
  voyeur:      [],
  orgy:        [],
  roleplay:    ['clothed'],
  fetish:      ['clothed'],
  petplay:     ['restrained'],
  agegap:      [],
  taboo:       [],
  noncon:      ['restrained', 'handsBound'],
  sleep:       ['asleep'],
  lactation:   ['lactating'],
  watersports: [],
  monster:     ['nonhuman'],
  futa:        [],
  femboy:      ['clothed'],
  pregnant:    ['pregnant'],
  spanking:    ['restrained'],
  mindbreak:   ['ahegao'],
  xray:        ['xray'],
  defloration: ['virgin'],
  /* 新增标签里会改变物理状态的三项：口塞 → 不能再口交/说台词；
     蒙眼 → 不能再写对视；悬吊 → 连带四肢受限（与道具池的推演一致）*/
  gag:           ['gagged'],
  blindfold:     ['blindfolded'],
  suspended:     ['suspended', 'restrained', 'handsBound', 'legsBound'],
  cunnilingus:   ['gagged_never'],
  bestiality:    ['nonhuman']
};

/* =========================================================
   四、道具 / 服饰 → 事实
   ========================================================= */
const CF_ITEM_FACTS = {
  /* 道具（data-nsfw.js 的 NS_TOY / NS_RESTRAINT / NS_GAG / NS_BLIND） */
  '口球':                    ['gagged'],
  '带孔口球':                ['gagged'],
  '塞口布团':                ['gagged'],
  '皮带口枷':                ['gagged'],
  '环形口枷':                ['gagged'],
  '胶带封口':                ['gagged'],
  '眼罩':                    ['blindfolded'],
  '厚布蒙眼':                ['blindfolded'],
  '皮质头套':                ['hooded', 'blindfolded'],
  '耳塞':                    [],
  '手铐':                    ['restrained', 'handsBound'],
  '分腿器':                  ['restrained', 'legsBound'],
  '吊绳':                    ['restrained', 'handsBound', 'suspended'],
  '贞操带':                  ['chastity'],
  /* 服饰（data-common.js 的 ANIME_OUTFIT_NSFW） */
  '束缚装口球':              ['gagged', 'restrained'],
  '贞操内衣':                ['chastity'],
  '护裆贞操带':              ['chastity'],
  '胶衣头套':                ['hooded'],
  '套衣头套':                ['hooded'],
  '全包紧身衣':              ['allCover'],
  '乳胶紧身衣':              ['allCover'],
  '乳胶连身袜':              ['allCover'],
  '长手套紧身衣':            ['allCover', 'handsBound'],
  '单臂束缚装':              ['restrained'],
  '皮革束带':                ['restrained'],
  '束带':                    ['restrained'],
  '胸束带开裆':              ['restrained'],
  '束带兜裆':                ['restrained'],
  '臂套':                    ['restrained', 'handsBound'],
  '腕带':                    ['restrained', 'handsBound'],
  '绑腿':                    ['restrained', 'legsBound'],
  '腰封':                    ['clothed'],
  '开裆连体衣':              ['clothed'],
  '绳索束衣':                ['restrained', 'handsBound'],
  '网袜':                    ['clothed'],
  '丝袜':                    ['clothed'],
  '长筒袜':                  ['clothed'],
  '过膝袜':                  ['clothed'],
  '乳贴阴贴':                [],
  '只穿衬衫':                ['clothed'],
  '真空围裙':                ['clothed'],
  '敞开和服':                ['clothed']
};

/* =========================================================
   五、替代池 —— 被占用状态下的合法表述
   （放这里而不是 data-nsfw.js，是为了让"冲突规则"和"替代方案"挨着改）
   ========================================================= */

/* 嘴里塞着东西时的声音（{sound} 槽专用，必须是"声音"而不是"口水"） */
const CF_GAG_SOUND = [
  '被堵住的呜咽，只剩鼻腔里的气声','闷在喉咙里的声音，一个完整的字都吐不出来',
  '被堵着发出的闷响，混着吸不上气的抽噎','想喊却被堵回去，只能拼命摇头',
  '鼻息又急又乱，每一下都带着哭腔','被塞得满满当当，只能发出唔唔的闷响',
  '喉咙里滚出一串含混的音节','含糊的鼻音一声接一声，连不成句子'
];

/* 嘴里塞着东西时的"台词"：用动作代替语言 */
const CF_GAG_DIRTY = [
  '（想说话，出口只剩一串含混的鼻音）','（拼命摇头，眼泪先掉了下来）',
  '（用眼神求饶，喉咙里发出唔唔的声音）','（被堵着，只能一下下地点头）',
  '（眼泪汪汪地摇着头，什么都说不出）','（被顶得发出闷哼，一个字都成不了句）'
];

/* 蒙眼时的台词：靠触觉与猜测 */
const CF_BLIND_DIRTY = [
  '（什么都看不见，只能凭感觉猜下一下会落在哪里）','（眼前一片黑，其他感觉被放大了好几倍）',
  '（被蒙着眼，光靠自己根本不知道会被怎样）','（不知道是谁的手，只能绷紧了等）'
];

/* 蒙眼时的声音 */
const CF_BLIND_SOUND = [
  '看不见，只能屏着呼吸等下一手','眼前全黑，一点动静都被放得极大',
  '被蒙着眼，连喘息都变得没有底气','只能用耳朵判断动静从哪个方向来'
];

/* 双手被绑时的动作替代（改用身体其他部位或被动描写） */
const CF_BOUND_ACT = [
  '手腕被缚在身后，只能靠腰自己动','手被固定住，只能用身体去蹭',
  '想伸手却动不了，只能把腰送上去','被绑着，全身的重量都压在身下',
  '挣了两下没挣开，反而把绳结勒得更紧','只能被动地承受，连扶一下都做不到'
];

/* 悬吊状态下的动作替代 */
const CF_SUSPENDED_ACT = [
  '整个人悬在半空，只能随着节奏晃','脚尖离地，全身的重量都吊在绳子上',
  '被吊着，连躲都躲不开','悬空着被摆成想要的姿势，一点力都借不上'
];

/* 失神 / 崩坏状态下的台词 */
const CF_AHEGAO_DIRTY = [
  '（已经说不出完整的句子，只会随着节奏出声）','（舌头收不回去，眼睛完全失了焦）',
  '（脑子一片空白，只剩下身体在本能地反应）','（嘴巴张着，却拼不出一个完整的词）'
];

/* =========================================================
   六、对外 API
   ========================================================= */

/* 从任意文本推演事实，追加进 set */
function cfFactsFrom(text, into){
  const s = String(text || '');
  if (!s) return into;
  for (let i = 0; i < CF_FACT_RULES.length; i++){
    const r = CF_FACT_RULES[i];
    if (r[1].test(s) || r[2].test(s)) into.add(r[0]);
  }
  return into;
}

/* 从一个内容标签推演事实 */
function cfFactsFromTag(id, into){
  const f = CF_TAG_FACTS[id];
  if (f) f.forEach(x => { if (x.indexOf('_') < 0) into.add(x); });
  return into;
}

/* 从道具 / 服饰名推演事实（按包含关系匹配） */
function cfFactsFromItem(name, into){
  const s = String(name || '').toLowerCase();
  if (!s) return into;
  for (const k in CF_ITEM_FACTS){
    if (s.indexOf(k.toLowerCase()) >= 0) CF_ITEM_FACTS[k].forEach(x => into.add(x));
  }
  return into;
}

/* 综合推演：标签 + 若干文本 + 道具服饰名 */
function cfFacts(tags, texts, items){
  const set = new Set();
  (tags || []).forEach(id => cfFactsFromTag(id, set));
  (texts || []).forEach(t => cfFactsFrom(t, set));
  (items || []).forEach(t => cfFactsFromItem(t, set));
  /* 悬吊一定同时是"手被绑" */
  if (set.has('suspended')){ set.add('restrained'); set.add('handsBound'); set.add('legsBound'); }
  if (set.has('hooded')) set.add('blindfolded');
  return set;
}

/* 某个事实在指定语言下的禁用正则（没有就返回 null） */
function cfBlockRe(fact, lang){
  const r = CF_FACT_BLOCK[fact];
  if (!r) return null;
  return (lang === 'en') ? r.en : r.zh;
}

/* 用事实过滤一个字符串池。若整池被筛空，退回原池（宁可保留也不要空字段） */
function cfCleanPool(pool, facts, lang){
  if (!pool || !pool.length) return pool || [];
  const re = [];
  facts.forEach(f => { const r = cfBlockRe(f, lang); if (r) re.push(r); });
  if (!re.length) return pool.slice();
  const out = pool.filter(s => !re.some(r => r.test(String(s))));
  return out.length ? out : pool.slice();
}

/* 用事实过滤「标签 id 列表」（整键禁用） */
function cfCleanTagIds(ids, facts){
  const banned = new Set();
  facts.forEach(f => {
    const r = CF_FACT_BLOCK[f];
    if (r && r.tags) r.tags.forEach(t => banned.add(t));
  });
  if (!banned.size) return (ids || []).slice();
  const out = (ids || []).filter(id => !banned.has(id));
  return out.length ? out : (ids || []).slice();
}

/* 事实是否要求换掉某个字段的池 */
function cfFieldReplaced(fact, field){
  const r = CF_FACT_BLOCK[fact];
  return !!(r && r.fields && r.fields.indexOf(field) >= 0);
}
function cfFieldNeedsOverride(facts, field){
  let need = false;
  facts.forEach(f => { if (cfFieldReplaced(f, field)) need = true; });
  return need;
}

/* 派生池：按事实给出「该字段该用哪个池」
   优先返回被占用状态下的替代池，其次是过滤后的常规池 */
function cfPoolFor(field, base, facts, lang){
  switch (field){
    case 'sound': {
      if (facts.has('gagged')) return CF_GAG_SOUND.slice();
      if (facts.has('blindfolded')) return cfCleanPool(base, facts, lang);
      return cfCleanPool(base, facts, lang);
    }
    case 'dirty': {
      const out = [];
      if (facts.has('gagged')) out.push.apply(out, CF_GAG_DIRTY);
      if (facts.has('blindfolded')) out.push.apply(out, CF_BLIND_DIRTY);
      if (facts.has('ahegao')) out.push.apply(out, CF_AHEGAO_DIRTY);
      if (out.length) return out;
      return cfCleanPool(base, facts, lang);
    }
    case 'act': {
      const out = cfCleanPool(base, facts, lang);
      if (facts.has('suspended')) return out.concat(CF_SUSPENDED_ACT);
      if (facts.has('handsBound') || facts.has('restrained')) return out.concat(CF_BOUND_ACT);
      return out;
    }
    default:
      return cfCleanPool(base, facts, lang);
  }
}

/* 事实摘要（调试 / 回归用） */
function cfDescribe(facts){
  return Array.from(facts).sort().join('+') || '—';
}
