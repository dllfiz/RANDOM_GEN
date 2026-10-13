# 二次元图片生成器 · 工作副本

迁移到本机后已**完整恢复并重建**。纯前端零依赖，直接双击对应目录下的 `index.html` 即可运行，  
不需要装环境、不需要联网。

## 目录

| 路径                                | 说明                                                                     |
| --------------------------------- | ---------------------------------------------------------------------- |
| `index.html` + `assets/`          | **主项目 RANDOM GEN**：随机出角色 / 场景 / 提示词，可指定角色卡与成套服饰（中文小传与情境文本只随 TXT 导出，界面不显示） |
| `role-studio/`                    | **角色工坊 ROLE STUDIO**：角色库（92 预设 + 自建，双密度 + 搜索 + 来源筛选）/ 情境子页（50–100 字短篇） |
| `.workbuddy/research/`            | 数据来源与生成 / 校验 / 诊断脚本（见「验证方式」一节）                                         |
| `.workbuddy/memory/2026-10-08.md` | 完整开发记录（迁移重建 + 互斥消解）                                                    |

原备份仍在 `C:\Users\七十四\Desktop\randgen-迁移备份-20261008\`，可作回退。

## ⚠️ 迁移时踩的坑：备份少了三个文件

原备份目录声明「主项目 17 文件 / role-studio 13 文件」，实际只有 14 / 11。  
缺失的 `data-nsfw.js`、`data-r18.js`、`data-extra.js` 在本机**没有任何其它副本**  
（全盘搜过 C:、D:），缺了它们两个项目都跑不起来：

- `engine.js` 的 `mergeR18Pools()` / `mergeExtraPools()` 都有 `typeof` 守卫，不会崩，  
  但 `NS_POSITION / NS_ACTION / NS_ORGASM / NS_TAG_POOL` 全是 `undefined`，一生成就炸。
- 备份里那堆 `xxx (1).js` 重复件说明复制过程本身出过岔子。

**已按现有素材全部重建**，并补上了生成脚本，以后可以一条命令重来。

## 三个重建文件与对应生成脚本

| 重建文件                      | 生成方式                                   | 依赖                                                                                           |
| ------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------- |
| `assets/js/data-r18.js`   | `.workbuddy/research/extract.js`       | `r18_prompts.txt`（580 条流水线提示词）+ `nsfw_pairs.txt`（187 条 en→zh）+ `toolbox_tags.js`（5035 条 tag） |
| `assets/js/data-extra.js` | `.workbuddy/research/extract-extra.js` | `toolbox_tags.js` + 脚本内手工编写的东方背景 / 构图条目                                                      |
| `assets/js/data-nsfw.js`  | **手工重写**                               | 容量标尺取自 `data-en.js` 的英文平行数组                                                                  |

```bash
# 一条命令重建 data-r18.js 与 data-extra.js（需要 node）
node .workbuddy/research/extract.js
node .workbuddy/research/extract-extra.js
```

`data-r18.js` / `data-extra.js` 头部都标了「自动生成，勿手改」；`data-nsfw.js` 是手写文件，直接改。

外部参考资料在 `D:\下载1\`：`AI 绘画 Tag 工具箱V1.9.html`、`r18流水线_fixed1 (1).json`、`提示词工坊1.3.4\`。  
`.workbuddy/research/toolbox_tags.js` 与 `r18_prompts.txt` 就是从它们抽出来的中间产物。

## 怎么跑

直接用浏览器打开对应目录下的 `index.html` 就行。两个项目共用同一套数据 / 引擎文件，  
但 `app.js` 各自独立（主项目用 `state.artistPicks`，role-studio 用 `state.stArt`）。

## ⚠️ 加载顺序（很重要，两个项目都一样）

`index.html` 里的 script 标签顺序不能改：

```
data-common.js → data-sfw.js → data-nsfw.js → data-en.js → data-extra.js
→ data-library.js → data-r18.js → data-presets.js → data-conflict.js → engine.js → app.js
```

原因：`engine.js` 顶层的 `mergeExtraPools()` / `mergeR18Pools()` 依赖前面这些池已加载；  
`data-conflict.js` 里的事实规则被 `engine.js` 的场景生成直接调用，必须排在 `engine.js` 之前。  
顺序错了 `check-assets.js` 会直接报出来。

## 数据契约（改数据前先看这里）

1. **中英平行数组必须同序同改**，长度也要一致，否则 `PAIR()` 会取错。  
   当前受约束的配对（括号内为当前长度）：  
   `NS_BREAST(12)` `NS_GENITAL_F(12)` `NS_PENIS(9)` `NS_PENIS_DETAIL(9)` `NS_PUBIC_HAIR(8)`  
   `NS_BUTT(8)` `NS_SKIN(8)` `NS_FLUID(10)` `NS_TOY(28)` `NS_RESTRAINT(24)` `NS_GAG(13)`  
   `NS_BLIND(7)` `NS_FETISH(26)` `NS_FUTA(4)` `MOOD_ATMOS(18)` `ANIME_PLACE(347)` `CAMERA(111)`  
   例外：`NS_DIRTY`(34) 与 `NS_DIRTY_EN` **本就不等长、不参与 PAIR**（英文侧走 `NS_EN_BASE`）。  
   长度不匹配时 `regress.js` 第 1 节会直接标 ❌。
2. `NSFW_TAGS` / `NS_TAG_EN` / `NS_TAG_POOL` 三者的 id 必须一一对应，当前共 38 个。  
   新增标签要三处同时加，否则中文剧情句或英文提示词会缺一项。  
   `NS_TAG_POOL` 的每个键存的是**中文动作句**，往里塞名词（"口塞""分腿捆绑"）会被  
   `{act}` 当句子渲染出病句，`regress.js` 第 9 节会报「动作池混入名词」。
3. `data-r18.js` 里 `R18_TAG_ZH` + `R18_TAG_ZH_EXTRA` 是中文查表。合并进  
   `NS_POSITION / NS_ACTION / NS_ORGASM` 的都是中文池，缺译名会让提示词里混入裸英文。
4. **单人场景有专门的数据池**：`NS_FLUID_SOLO` / `NS_ORGASM_SOLO` / `NS_DIRTY_SOLO` /  
   `SOLO_ACT_BLOCK` / `SOLO_TAG_SENT`（英文，engine.js）/ `SOLO_TAG_SENT_ZH`（中文，engine.js）。  
   新增双人指向的句子时要留意别让单人场景抽到。
5. `NS_STORY_TPL` 的取用规则见 `data-nsfw.js` 里那段注释；单人模板（`solo` / `soloKink`）  
   **绝不能含 `{B}`**，否则会渲染出「另一个人」。
6. 模板占位符分三类：
   - **固定**（`{A}{B}{place}{time}{mood}{pos}{pussy}{penis}{breast}…`）一次替换；
   - **多变**（`{act}{fluid}{sound}{organ}{dirty}{psound}`）每次出现重新随机；
   - **受事实驱动**（`{soloact}{bstate}{astate}{gulp}`）由 `buildStory` / `shortDict`  
     按当前物理状态填值——**模板里任何写死身体状态的句子都要走这一类**，  
     否则模板本身会变成绕过互斥过滤的漏网路径（详见下一节）。  
     ⚠️ `{pussy}` `{breast}` `{fetish}` `{penis}` 展开出来是**带逗号的描写串**，  
     在模板里必须让它们独立成句（后面跟 `。`），不能直接接动词，否则读不通。
7. `localStorage` 键（两个项目共用，会导致状态互通）：  
   `randgen_history` / `randgen_fav` / `randgen_chars` / `randgen_unlock_nsfw`。

## 物理状态推演与互斥消解（`data-conflict.js`）

用户反馈的核心问题是「不要出现 AI 画不出来的组合」，典型例子是**口球 + 口交**。  
这不是加几条黑名单能解决的：随机抽池的老问题是「各抽各的」，口球、口交、台词三者互相独立。  
现在的做法是**先把身体的物理状态定下来，再拿它去筛后面所有池**。

**事实（fact）清单**（`CF_FACT_RULES`，中英各一条正则，同时用于"从文本推演"和"按状态过滤"）：  
`gagged` / `blindfolded` / `hooded` / `restrained` / `handsBound` / `legsBound` / `suspended` /  
`chastity` / `condom` / `flatChest` / `lactating` / `pierced` / `clothed` / `allCover` /  
`asleep` / `ahegao` / `nonhuman` / `public` / `xray` / `vore` / `virgin` / `pregnant`

**每个事实的禁用规则**（`CF_FACT_BLOCK`）：`zh` / `en` 是禁用正则，`tags` 是整键禁用的标签 id，  
`fields` 是需要换池的字段。

**抽取顺序**（`engine.js` 的 `makeScene()`，NSFW 分支）：

```
角色身体条件（平胸 / 泌乳…）
  → 道具（决定嘴 / 手 / 眼是否被占）+ 恋物服装
  → 推演事实
  → 体位（按身体条件 + 事实筛）
  → 动作细节（标签整键屏蔽 + 逐条过滤 + 挡掉"自带新状态并否定体位"的句子）
  → 回检体位（动作句带出的新状态若与体位冲突，重掷体位）
  → 构图 / 声音 / 台词 / 体液 / 高潮反应（一律在最终事实上抽）
```

**替代池**（被占用状态下唯一合法的表述）：  
`CF_GAG_SOUND`（闷住的声音）/ `CF_GAG_DIRTY`（闷住的台词）/ `CF_BLIND_DIRTY` / `CF_BLIND_SOUND` /  
`CF_AHEGAO_DIRTY`（失神台词）/ `CF_BOUND_ACT`（被绑时能做的动作）/ `CF_SUSPENDED_ACT`（悬空时能做的动作）

**道具拆池**：口球 / 眼罩 / 绳索原本混在 `NS_TOY` 里，被独立抽中后会与用嘴、用手、  
主动体位的动作正面冲突。现已拆成 `NS_TOY`（器具）/ `NS_RESTRAINT`（束缚具）/  
`NS_GAG`（口部器具）/ `NS_BLIND`（感官剥夺）四条独立池，由 `pickGear()` 按权重抽取，  
抽中就立刻写进事实。用户勾了用嘴类标签就不抽口部器具，勾了用手类标签就跳过束缚具。

**模板写死的状态也要按事实改写**：`{bstate}` / `{astate}` / `{soloact}` / `{gulp}` 四个占位符  
就是为此存在的。注意必须**按事实分级**——只有真 `handsBound` 才能说"手腕被绑在头顶"，  
光有 `restrained` 只能说"被束着"，多说的那部分会绕过后面的所有过滤。

**随机补全的身体描写要服从用户勾选的标签**：角色随机抽到「平胸」，用户勾了「乳交 / 泌乳」时，  
`generateAll()` 会先把 `flatChest` 从预置事实里去掉，`makeChar()` 也会把平胸条目从胸部池里滤掉——  
否则会写出"一挤就是一道"配"平胸"这种 AI 画不出来的组合。

## 体位池净化与合理性闸门（第十二轮）

「被按成强暴」「被按成深喉」这类**病句**来自 `NS_POSITION` 里混进的非体位条目。  
池子由三处拼成（`data-nsfw.js` 手工条目 + `EX_NSFW_ACT` + `R18_ACT`），  
`engine.js` 里的 `sanitizePositionPool()` 会在两个合并 IIFE 之后统一清理：

| 类别                                              | 处理                                                                    |
| ----------------------------------------------- | --------------------------------------------------------------------- |
| 行为 / 情节名词（强暴 / 轮奸 / 深喉 / 乳交 / 潮吹 / 颜射 / 打屁股…）   | 从体位池删除；素材改由 `NS_TAG_POOL` 的完整动作句与 `mergeR18Pools` 第 2 步的 `SENT` 兜底句承载 |
| 环境 / 地点短语（泳池边 / 天台栏杆旁 / 电梯里站立…）                 | 改写成「在…」形式留在池里，`posKindOf()` 才会判成动作短语                                  |
| 中文位是裸英文（`vaginal` / `prone bone` / `creampie`…） | 由 `R18_TAG_ZH_EXTRA` 补齐中文；仍缺的直接删                                      |

**体位文本分两类**（`POS_PHRASE_MARK` / `posKindOf()`）：`'pos'` 姿势名词 → 「被按成跪姿后入」；  
`'act'` 动作短语 → 「被按住，抵在洗手台边」。`buildStory()` 读 `fields.position.kind`，  
`rerollSceneField()` 重掷时同步更新。动作短语若本身已是被动句（"被压着却自己挺起腰"）就不加前缀。

**四道闸门**（`engine.js`，都在动作池上生效）：

| 闸门    | 函数                             | 作用                                                              |
| ----- | ------------------------------ | --------------------------------------------------------------- |
| 非人题材  | `filterNonhuman()`             | 触手 / 怪物 / 产卵只在勾选 `monster` 时出现（`NS_ACTION` 的兜底句也会被闸掉）           |
| 人数    | `filterHeadcount()`            | 「被围在中间轮流使用」这类句至少 3 人才成立；整池都是群交句时退回通用池                           |
| 合计入口  | `guardActPool()`               | 上面两道合并调用，避免逐个 call site 漏掉                                      |
| 器具名词化 | `gearNoun()` + `GEAR_NOUN_FIX` | 模板里 `{toy}` 落在名词槽（「手边只有{toy}」「{toy}就摆在一旁」），因此只传短名；「道具」字段仍显示完整描述 |

**随机标签不做"改设定"**：`RANDOM_EXCLUDE_TAGS = ['monster', 'xray']` ——  
这两个会让画面凭空变成另一种类型，不参与自动随机补全，用户显式勾选时照常生效。

**短篇模板**：`{toyDev}`（`TOY_DEVICE`，18 条会震会动的器具）专供  
「开着最大档」这类句子；多人场景会排除含「一个人」的模板，单人场景排除含 `{B}` 的模板。

## 模板自述状态与单人场景闸门（第十三轮）

### 一、模板也会"断言身体状态"，必须并入场景事实

束缚系模板里写死过「{A}自己把绳子一道道缠上去。」「绳索勒进手腕，动一下都费劲。」  
以及占位符 `{posBind}`（无论事实如何都渲染成「被绑成…」「被束住，…」）。  
结果是正文写着"被绑成女上正骑"，而 `{dirty}` / `动作细节` 仍按"没束缚"抽取，  
冒出「我可以自己动」——同一篇里自相矛盾。

修法（`engine.js`）：

| 改动                      | 说明                                                             |
| ----------------------- | -------------------------------------------------------------- |
| `pickStoryTpl()` 提前     | 原在 `buildStory()` 末尾选模板，现在一开始就选好                               |
| `tplFactsOf(tpl, base)` | 由模板推演事实（骨架里的写死句 + 合并进场景事实，**不写回** `scene.__facts`）             |
| `facts` 局部工作集           | `{dirty}` / `{act}` / `{sound}` / `{fluid}` 全部按"场景事实 + 模板事实"过滤 |
| `{posBind}` 改为事实驱动      | 场景没有束缚元素就退化成 `posLead`（「被按成…」），不再凭空说"被绑"                       |
| `soloKink[0]` 改写        | 「自己把绳子…／绳索勒进手腕」换成 `{selfbind}` / `{bindnote}` 两个占位符，按事实二选一     |

原则：**模板里任何"断言状态"的句子都要做成占位符再按事实取值，不要写死。**  
写死的句子一定会绕过后面所有过滤。

### 二、单人场景不允许出现"需要第二个人"的句子

抽样发现单人场景 **27%** 会抽到「直接坐到脸上去」「低头含住，一路舔到根部」  
「拽着头发往后拉」「面对面侧躺」——一个人做不出来，也就是用户说的"AI 画不出来"。

| 闸门                          | 位置             | 覆盖                                                                                                       |
| --------------------------- | -------------- | -------------------------------------------------------------------------------------------------------- |
| `SOLO_ACT_BLOCK`（扩到 5 类）    | `data-nsfw.js` | ①对别人做的动作 ②对方身体部位（耳根 / 后颈 / 柱身 / 坐到脸…）③对方的动作与被动（让人 / 任人 / 被拉着 / 拽着头发…）④需要第三方在场（被拍下来）⑤有东西进入但无自指（顶入 / 方便进入） |
| `SOLO_POS_BLOCK`（新增）        | `data-nsfw.js` | 体位池专用：面对面 / 背抱 / 后入 / 剪刀式 / 坐到脸上 / 被从后面… 156 → **124** 条                                                 |
| `soloActPool(facts)`（新增）    | `engine.js`    | 单人通用动作池，119 → **62** 条                                                                                   |
| `NS_SOUND_SOLO`（新增）         | `data-nsfw.js` | 剔掉「贴着耳朵的耳语」这类需要有人在场的条目                                                                                   |
| `soloTagActsZh(ctx, facts)` | `engine.js`    | 单人整池换成 `SOLO_TAG_SENT_ZH`（含住自己手指 / 器具抵着…），并加事实闸门参数                                                       |


接进 `makeScene()` 的位置：**体位池**（`SOLO_POS_BLOCK`）、**动作细节字段**（改走 `soloTagActsZh`）、  
**声音 / 高潮 / 台词 / 体液字段**（改走 `NS_SOUND_SOLO` / `NS_ORGASM_SOLO` / `NS_DIRTY_SOLO` / `NS_FLUID_SOLO`）。  
短篇路径（`shortDict` / `buildShortStory`）同样接了一遍。

结果：单人「需要第二人」命中 **27.1% → 0**（5000 轮）。

## 角色卡与多人提示词（第十四轮 · 已落地）

第十四轮先只做了诊断，本轮把结论全部改完，并顺带修掉了两个真 bug。

### 一、双人提示词「角色名:」后面是空的（真 bug，已修）

**位置**：`engine.js` `buildPrompt()` 的 `n === 2` 分支  
**根因**：双人分支取的是 `coreFeatures(A,ctx,3).concat(restFeatures(...))`，  
两个函数都从 `c.fields.hair / eyes / top / body` 取值；而 `pseudoCharFromCard()` 只往  
`fields` 里塞了 `name / gender / base` 三个键 → 全 `undefined` → 空数组  
→ 渲染出一行孤零零的「Ganyu 甘雨: 」。  
单人分支有 `if (c.base) one.push(c.base)` 兜底，**双人分支漏了这一步**。

| 新增                         | 作用                                                                |
| -------------------------- | ----------------------------------------------------------------- |
| `charTagParts(c, ctx, n)`  | 有 `c.base`（角色卡）就按逗号拆条用 base；没有（随机角色）才走核心特征 + 细节补全                 |
| `tagListOf(str)`           | 拆条并剔掉 `1girl / 1boy / solo / 2girls…`——人数前缀已由 ② 行给出，角色行再各带一个会自相矛盾 |
| `charFeatBrief(c, ctx, n)` | 三人及以上场景每人只取少量特征：角色卡取 base 前 n 条，随机角色取 hair/eyes/top/body          |
| `charNameTag(c)`           | 提示词里的名字：`meta.nameEn` → `fields.name.en` → 显示名                    |
| `cardNameEn(card)`         | 从显示名剥出英文那半（`Robin 知更鸟` → `Robin`）；卡上写了 `nameEn` 优先                |

接入点：`buildPrompt()` 的 **n=1 / n=2 / n≥3 三条分支**、`charBlocks()`、`actionChain()`、  
末尾 `From left to right:` 总结句，全部改走上面几个函数。角色卡在三人场景里也从"只有名字"变成"带外貌"。

### 二、角色名中英混排（已修）

`c.meta.name` 是显示名（`Ganyu 甘雨`），原来被直接写进英文 tag 行与动作链。  
现在 `pseudoCharFromCard()` 补 `meta.nameEn`（两个项目同构），英文行一律用 `charNameTag()`；  
中文正文（`buildStory()` / `charToText()`）继续用显示名。随机角色原来是「随机1」写进英文行，  
现在取 `fields.name.en` 的 `random 1`。

### 三、角色卡外貌校订（8 张）

对照 danbooru / cosbooru 词条逐条核过，改掉的都是**发色 / 瞳色写错**这类硬伤：

| 卡                   | 改前                          | 改后                                                   |
| ------------------- | --------------------------- | ---------------------------------------------------- |
| `hsr_robin` 知更鸟     | 金色长发、蓝瞳、羽翼光环                | **浅蓝长发 + 盘发、绿瞳、头顶小翅膀 + 光环**、抹胸白紫双色裙、白色及肘手套、羽毛围巾、紫色高跟 |
| `hsr_firefly` 流萤    | 金色短发、波波头、绿瞳                 | **银灰长发带绿渐变、蓝粉异色瞳**、白长裙 + 绿色内衬、橙色领巾、黑发箍、黑过膝袜、黑短靴      |
| `hsr_ruanmei` 阮·梅   | 粉色长发、绿瞳、眼镜、旗袍               | **黑色长发 + 进气口发型、绿瞳**、蓝色中裙（含骨盆帘）、及肘手套、腿环、珍珠项链          |
| `hsr_silverwolf` 银狼 | 银灰**短发**、侧马尾、粉紫瞳            | **银灰长发带蓝色渐变**、钻头马尾、**灰瞳**、护目镜                        |
| `hsr_kafka` 卡芙卡     | 红瞳                          | **紫瞳**（萌娘百科：紫发粉瞳；danbooru：blank purple eyes）         |
| `hsr_bronya` 布洛妮娅   | 蓝瞳                          | **灰瞳** + 钻卷发                                         |
| `hsr_topaz` 托帕      | 橙色长发、绿瞳、西装                  | **灰白中长发带红挑染、蓝瞳**、黑连体衣 + 白无袖衬衫                        |
| `fate_nero` 尼禄      | core 里同时写了 `1boy, 1girl`、红瞳 | 去掉 `1boy`；**绿瞳** + 盘发 / 编发 / 呆毛                      |

`note` 字段同步改了（搜索与情境文本都会用到）。

### 四、自定义角色卡页面（主项目）

灯泡右边加了一个 `＋` 按钮（`#cardAddBtn`，`index.html`），点开是**新建 / 编辑角色卡**弹窗：

- 字段：显示名 / 英文名（可选，留空自动从显示名提取）/ 作品 / 性别 / 基础提示词 / 中文备注
- `🎲 随机生成一套` 直接抽一版外貌提示词填进去（`genBasePrompt()`）
- 落盘 `localStorage.randgen_chars`（`LS_CHARS` 早就定义了却一直没用上，这轮接上）
- 角色选择器接进自建卡：来源筛选（全部 / 预设 / 自建）、行上带「预设 / 自建」徽章、自建卡带「改 / 删」按钮
- 字段结构与 `role-studio` 的 `loadMyCards()` / `addCard()` **完全同构**，JSON 可以互相搬运

改动文件：`index.html`（按钮 + 来源筛选 + 弹窗）、`assets/css/style.css`（追加约 20 行）、  
`assets/js/app.js`（`charLib` / `loadMyCards` / `saveCharLib` / `addCard` / `deleteCard` / `openCharModal` / `saveFromEditor`）。

### 五、顺手修掉的三个真 bug

1. **`pairByFacts()` 收到单条结果会把整串按字符拆开**（`engine.js`）。  
   它吃的是「中英平行数组对」`{zh: [...], en: [...]}`，而 `makeScene()` 与  
   `rerollSceneField()` 把 `PAIR()` 的**单条**结果 `{zh:'…', en:'…'}` 传了进去 →  
   `pair.zh[i]` 取到单个汉字 → `fluid` 字段变成字符数组 →  
   提示词里冒出 `sticky fluids...` 变成 `s,t,i,c,k,y, ,f,l,u,i,d,s`。  
   两处改成"先过滤平行池、再抽一条"，并在 `pairByFacts()` 里加了类型守卫。
2. **`fillTpl()` 单趟替换会漏掉后注入的 `{B}`**。  
   `{bstate}` 的兜底句本身写着 `{B}`（「被{B}从身后圈住」），而 `{B}` 比它先替换，  
   于是极少数 2 人场景正文里会留下裸的 `{B}`。现在 `fixed` 过两趟。
3. **`baseOfPreset()` 对自建卡返回空串**。  
   自建卡不拆 `core` / `outfit`（编辑器只让填一整条 `base`），而  
   `baseOfPreset()` 原来是 `[core, outfit].join(', ')` → 空串，  
   于是 `applyPickedCards()` 走 `buildPresetPrompt()` 时**整张卡的外貌全被吞掉**。  
   现在没有 core/outfit 就退回 `card.base`；同时 `info['服装']` 对这类卡显示  
   「已含在基础提示词里」而不是「无」。

### 六、验证结果（本轮）

- **角色卡 × 双人提示词 874 例：问题 0**（新增回归项：角色行非空 / 不带人数标签 / 英文行无中文）
- **角色卡 × 三人场景 14 例：问题 0**（每段都必须带外貌）
- **体液字段类型 / 提示词单字碎片 300 例：0**；重掷 60 次：0
- 互斥专项 13 项 / 合理性闸门 6 项 / 全组合 96 / 指定标签 18 / 预设卡 184：依旧全绿
- 短篇 180 例全部落 50~100；单人 3000 轮扫描 0 命中；结构性病句扫描 3000 轮 0 处
- `check-assets.js` 双页通过（两份 `engine.js` / `data-presets.js` 一致）
- `dom-init.js` 双项目 DOM 桩通过，65 个 id 无悬空引用
- **新增 `card-flow.js`：自建角色卡端到端流程 19 项全通过**  
  （新建 → 全角逗号规范化 → 落盘 → 自动选中 → 单人外貌没被吞 → 双人两行非空 →  
  编辑 → 删除 → 模拟刷新后仍在 → 英文名解析）

## 成套服饰进提示词 + 中文情境输出（第十五轮 · 已落地）

**用户报障**：「选了成套服饰，最后提示词里完全没有这件衣服」；「运行结果要有中文」。

### 一、成套服饰被吞掉（三条路径，全是真 bug）

`ctx.outfitPick` 以前只在 `buildPresetPrompt()` 里被读，而且判定写成
`const recloth = (ctx.recloth !== false) && !!card.core;`：

- **自建卡**（只有 `base`、没有 `core`）→ `recloth` 恒 `false` → 整段服装分支被跳过，
  `outfitPick` 连读都没读到；
- **多人场景**走 `buildPrompt()`，那里根本没有 `outfitPick` 这个词；
- **纯随机单人**也走 `buildPrompt()`，同样漏。

改法：新增 `pickedOutfit(ctx)`（中文名 → 英文 tag，成衣柜 / 成人成衣柜都查），三处接上：

| 位置 | 改动 |
|---|---|
| `makeChar()` | 有手动服饰就不再随机上装/下装，成套直接写进 `top`（否则「白衬衫 + 兔女郎装」两套叠穿） |
| `buildPresetPrompt()` | `addCloth = !!manual \|\| ctx.recloth !== false \|\| !card.outfit`，手动指定优先级最高 |
| `buildPrompt()` | n=1 / n=2 / n≥3 / 清水 四条分支各补一条 `fit.en` |

顺带修掉同源问题：**自建卡 + 关掉「随机换装」** 原来会渲染出一个没穿衣服的角色。

### 二、中文输出 ⚠️（第二十三轮已撤销，见该章）

引擎本来就中英双份（`charToText()` 人物小传 + `res.story` 情境文本），
但第七轮删掉 `#charCard` / `#sceneCard` / `#storyCard` 之后，中文只跟着 TXT 导出走。

本轮一度在 `#promptCard` 下加回 `#storyCard`（`#storyOut` + `#btnCopyStory`）+
`renderStory(res)`。**这一步是误加** —— 第七轮用户明确要求删掉「情景文本」结果卡，
第二十三轮已按原要求把面板、`renderStory`、监听器全部移除。
中文内容照旧保留在引擎里，只随 TXT 导出带出。

### 三、验证

- 新增 `.workbuddy/research/fit-check.js`：**19 项全通过**（自建卡单人 / 自建卡+关换装 /
  预设卡换装 / 预设卡关换装+手动服饰 / 预设卡关换装保留原设 / 纯随机单人 60 / 双人 60 /
  三人 30 / 清水 40 / 未选服饰不误伤 / `pickedOutfit()` 边界）
- `card-flow.js` 扩到 25 项全通过（新增中文情境 3 项 + 单人/双人成套服饰 3 项）

---

## 角色卡的「添加」入口（第十六轮 · 已落地）

**用户报障**：角色卡只有顶栏一个 ＋，只能从零手写。`role-studio` 早就有的
「存入我的角色」，主项目没有对应入口 —— 而预设卡是只读的，
想改一个预设角色的外貌，根本无从下手。

### 一、主项目：三个添加入口

| 入口 | 位置 | 行为 |
|---|---|---|
| ＋（原有） | 顶栏夜灯旁 | 打开空白编辑器，从零新建 |
| **＋ 新建** | 角色选择器 → 来源筛选行的右侧 | 同上，不用先收起选择器 |
| **存** | 每张**预设卡**行末（hover 出现） | 复制一份进卡库：`name / nameEn / gender / ip / core / outfit / base / note` 全量搬过来，之后可随意改 |

- 新增 `saveToLib(it)`：按「显示名 + 基础提示词」**判重**，连点不会堆出一排一样的卡；
  存入后自动选中 + 切到「自建」筛选，立刻能看到结果。
- 自建库为空时的空状态直接给一个「＋ 新建角色卡」按钮，不再只有一句干巴巴的提示。
- 编辑弹窗底栏补了**「删除」**（只在编辑已有卡时出现），删卡不用退回列表去找行上的「删」。

### 二、role-studio：补上两处

- 编辑弹窗补 **「英文名」** 与 **「作品 / 出处」** 两个字段（第十四轮的遗留项），
  `openCardModal()` / `saveFromEditor()` / 「清空」全部同步。
- **紧凑视图**的预设卡行补「存入」（原来只有切到卡片视图才找得到）；
  `act === 'keep'` 也加了判重，两个项目行为一致。

### 三、验证

- `card-flow.js` 扩到 **36 项断言全通过**，新增 9 项：预设卡「存」进卡库 / 字段完整复制 /
  自动切筛选 / 自动选中 / 不污染只读预设库 / 重复「存」不堆卡 / 预设行只给「存」 /
  自建行只给「改·删」/ 空状态的「＋ 新建」入口。
- 全套复跑：`regress.js` 双项目 0 问题、`check-assets.js` 双页、`dom-init.js` 双项目
  （交叉校验 69 个 id，新增的 `#pickAddBtn` / `#edDelete` / `#edNameEn` / `#edIp` 全部命中）、
  `fit-check.js` 19 项、`lint-text.js` 6000 轮 0 处 —— 全绿。
- 两个页面 `<div>` / `<button>` 开闭标签数一致。

## 百合（女女）描写（第十七轮 · 已落地）

**用户需求**：「增加一些百合的描述」。

### 一、原来错在哪

女女场景（≥2 人、全员无阴茎）此前没有任何专属处理，实测 **400 例里 196 例**
英文动作链写的是：

```
random 2 is gripping random 1's hips from behind, entering random 1's pussy from the rear
random 2 is thrusting into random 1, random 1's back arching
```

两个女性角色之间**没有可插入的主体**，这句子在物理上不成立。同源问题还有三处：

| 位置 | 症状 |
|---|---|
| `makeScene()` 体液池 | 多人场景恒用 `NS_FLUID`，英文侧漏出 `semen` / `precum` |
| `makeScene()` 体位池 | 156 条里没有任何女女体位，只会抽到「狗爬式 / 俯卧后入」 |
| `buildPrompt()` 人数行 | 没有 `yuri` 标签，模型不知道这是女女场景 |
| `NS_TAG_EN.agegap` | `older man, younger girl` 直接落进两个女孩的提示词 |

中文侧只有 `NS_NO_PENIS_TOOL` 一个兜底（手指 / 按摩棒），没有成套的女女素材。

### 二、加了什么

**数据（`data-nsfw.js` / `data-en.js`）**

| 池 | 条数 | 内容 |
|---|---|---|
| `NS_YURI_POSITION` | 12 | 面对面贴着磨 / 侧卧交叠磨蹭 / 叠在一起磨 / 双人 69 互舔 / 跪在腿间埋首 / 坐在脸上 / 胸前相贴揉蹭 / 背靠背贴着磨 / 一条腿架在肩上 / 面对面跨坐 / 从背后环住 / 并排躺着手向下 |
| `NS_YURI_ACTION` | 24 | 手指 / 口 / 磨蹭为主的中文动作句（不含任何需要阴茎的写法） |
| `NS_YURI_TOOL` | 8 | 女女场景 `{penis}` 槽的替代（并起来的两根手指 / 舌尖 / 双头假屌的另一端…） |
| `NS_YURI_DIRTY` | 8 | 女女台词（换我来，你躺好 / 你这里，比我还热…，不含射精 / 吞咽） |
| `NS_YURI_TAG_EN` | 12 | 英文补充 tag（yuri, girls only / tribadism / scissoring / cunnilingus / facesitting…） |
| `NS_STORY_TPL.yuri` | 3 | 中文正文模板组（骨架里不写"插入 / 顶进去"） |

**引擎（`engine.js`）**

- `yuriScene(ctx, chars)`：人数 ≥ 2 且全员 `female`（`futa` 有阴茎，不算）——传角色按实际性别判，只传 ctx 读 `generateAll` 打的 `_yuri` 标。
- `generateAll()` 打标 `ctx._yuri`；`makeScene()` 的体位与 `rerollSceneField('position')` 走 `posPoolYuri()`；动作细节并入 `NS_YURI_ACTION` 并用 `YURI_BLOCK_ZH` 剔掉需要阴茎的句子；体液池改用 `fluidPairFor(false, true, true)`。
- `actionChain()` 女女分支：按 `grp` 给手指 / 口 / 磨蹭的动作链，不再出现 `thrusting into`。
- `buildPrompt()`：人数行追加 `yuri, girls only`；`commonAct` / `baseTags` 过 `YURI_BLOCK_EN`（剔 `erection / semen / precum / shaft / paizuri…`）+ `yuriTerms()`（`older man → older woman`、`multiple boys → multiple girls`）；n=2 与 n≥3 分支各补一组 `NS_YURI_TAG_EN`。
- `buildStory()`：`{penis}` 用 `NS_YURI_TOOL`、台词池并入 `NS_YURI_DIRTY`、动作池并入 `NS_YURI_ACTION`；`pickStoryTplPool()` 在 2 人女女时优先返回 `NS_STORY_TPL.yuri`。
- **`posPoolYuri()` 是加权的**：基础池被 `data-extra` / `data-r18` 扩到 156 条，12 条百合体位只放一份会被稀释到 7%；按重复份数加权后实测落到 **36~38%**。

**界面（`app.js`）**：选择器里选了 ≥2 张全女性卡时，提示行追加「（全是女性 → 自动走百合写法）」。

### 三、验证

新增 `.workbuddy/research/yuri-check.js`（第二个参数可指定项目，`role-studio` 同样通过）：

- 池子自检 6 项：条数 / 中英齐全 / `grp` 合法 / 池内不含需要阴茎的写法 / 模板骨架不写"插入"
- `yuriScene()` 判定 6 项：两女 ✓ 三女 ✓ 单人 ✗ 一女一男 ✗ 两女一男 ✗ 女+扶她 ✗
- 女女场景 400 例：① 全部带 yuri 标签 400/400 ② 动作链无插入式 0 命中 ③ 英文无器官词 0 命中 ④ 中文动作无器官词 0 命中 ⑤ 中文正文 0 命中 ⑥ 动作细节非空 ⑦ 百合体位占 36~38%
- 三人女女 120 例：yuri 标签 120/120、无 `thrusting into`、无器官词
- 反向校验：男女场景 120 例 **0 例**被误加 `yuri`、插入式动作链仍保留（115/120）；单人女性 120 例 **0 例**带 `yuri`

顺带说明：检查脚本最初把 `dust motes floating in a shaft of light`（一束光，氛围词）
误判成器官词 `shaft`，已用负向前瞻 `shaft(?! of light)` 放行——不是代码问题。

## 内容标签 38 → 66 项 + 分组显示（第十八轮 · 已落地）

### 一、先收掉上一轮的遗留：全男场景的体液

第十七轮结尾留了一句「2 男场景（无阴道）的英文体液池同样没剔干净」。实测确认：
**全男场景 300 例里 63 例**体液写的是「爱液把床单洇湿了一大片 / pussy juice soaking a
large patch of sheets」——现场根本没有那个器官。

根因在 `makeScene()`：多人场景恒用 `NS_FLUID` / `NS_FLUID_EN`，只有百合场景
（`ctx._yuri`）才会走 `fluidPairFor()` 过滤，全男场景一条闸门都没有。

修法：新增 `NS_FLUID_M` / `NS_FLUID_M_EN`（汗水 / 润滑液 / 肠液 / 精液这一组，
不含爱液），`generateAll()` 里把现场性别记进 `ctx._hasPussy`，`makeScene()` 按
「单人 → 全男 → 百合 → 常规」四路选池。修完 **300 例归零**。

### 二、标签从 38 扩到 66，并分 7 组

命名统一对照 danbooru / E-Hentai 词条（`fellatio` / `anilingus` / `frottage` /
`femdom` / `netorare` / `chikan` / `glory hole` / `orgasm denial`…）。

| 组 | 数量 | 内容 |
|---|---|---|
| 基础玩法 | 11 | 原有：口交 / 深喉 / 吞精 / 乳交 / 手交 / 足交 / 肛交 / 舔肛 / 双穴 / 自慰 / 器具 |
| 体液与高潮 | 6 | 原有：内射 / 颜射 / 颜面淋洒 / 潮吹 / 放尿 / 泌乳 |
| 口与接触 | 5 | **新**：舔阴 / 腿间摩擦 / 埋胸窒息 / 舔足 / 腋下 |
| 插入与器具 | 4 | **新**：拳交 / 巨物插入 / 夹乳夹蒂 / 灌满膨胀 |
| 束缚与调教 | 12 | 原有 5 + **新**：蒙眼 / 口塞 / 悬吊 / 滴蜡 / 电击 / 踩踏 / 搔痒 |
| 高潮控制 | 3 | 原有：失神崩坏 + **新**：寸止 / 强制高潮 |
| 情境与关系 | 25 | 原有 15 + **新**：女支配 / 寝取 / 电车痴汉 / 公共洞 / 卖春 / 时间停止 / 催眠 / 精神控制 / 堕落调教 / 兽交 |

每个新标签都配齐三件套：`NSFW_TAGS`（中文名 + 分组）、`NS_TAG_EN`（英文 tag）、
`NS_TAG_POOL`（3 条中文动作句）。

### 三、三条新闸门（`engine.js`）

| 常量 | 作用 |
|---|---|
| `NEEDS_FEMALE_TAG` | 舔阴 / 埋胸 / 乳夹 / 女支配——全男场景一律剔除（原来只按"有没有阴茎"过滤，全男时等于没闸门） |
| `NEEDS_PARTNER_TAG` | 腿间摩擦 / 双穴 / 群交 / 寝取 / 埋胸 / 舔足 / 腋下——单人场景剔除 |
| `RANDOM_EXCLUDE_TAGS` | **28 个新标签全部不进随机补全**：不勾选时默认生成仍是原来的常规体验，勾选后才生效 |

配套：`gag` / `blindfold` / `suspended` 三个标签会推演出对应物理状态（口塞→不能再口交、
蒙眼→不能再写对视、悬吊→连带四肢受限），写在 `data-conflict.js` 的 `CF_TAG_FACTS`；
`cunnilingus` / `fisting` 分别补进 `MOUTH_TAGS` / `HAND_TAGS`；10 个能单人成立的标签
补了 `SOLO_TAG_SENT_ZH` 条目。

### 四、界面

- `buildChips()` 改成按 `NSFW_TAG_GROUPS` 分组渲染（组标题 + 一行 chips），
  两个项目各自实现同步改；样式加 `.chip-group / -head / -body`，容器高度 190 → 250px。
- 面板标题改成「内容标签（66 项 · 不选 = 常规随机）」，下面补一句说明。

### 五、验证

新增 `.workbuddy/research/tag-check.js`（支持第二参数指定项目），7 节全绿：

```
① 契约：66 项 / 28 个新增全注册 / EN & POOL 无缺项 / 每个标签都能落进已注册分组
② 28 个新标签勾选后：英文 tag 全部进得了提示词、全部出得了中文动作句
③ 全男 300 例：NEEDS_FEMALE_TAG 四项 0 次被选中
④ 单人 300 例：NEEDS_PARTNER_TAG 七项 0 次被选中
⑤ 随机 300 例：28 个新标签 0 次被随机抽中；RANDOM_EXCLUDE_TAGS 收全
⑥ 全男 300 例：体液 0 次出现爱液 / pussy juice
⑦ 女女 300 例：腿间摩擦（需阴茎）0 次被选中
```

`regress.js` 的标签契约同步到 66，并加「分组完整性 / 空分组 / 分组缺名」检查。

## 验证方式（可重复运行）

```bash
node .workbuddy/research/regress.js                       # 主项目 数据层全量回归（13 项互斥 + 6 项合理性闸门）
node .workbuddy/research/regress.js role-studio           # role-studio 数据层（同一套引擎，复验用）
MUTEX_N=60000 node .workbuddy/research/regress.js         # 互斥专项加大到 6 万轮
node .workbuddy/research/lint-text.js . 6000              # 大批量生成文本的"结构性病句"扫描
node .workbuddy/research/check-assets.js                  # 两个页面的资源完整性 + 脚本顺序 + 引擎冒烟
node .workbuddy/research/dom-init.js                      # 主项目 界面层（DOM 桩）
node .workbuddy/research/dom-init.js role-studio          # role-studio 界面层
node .workbuddy/research/card-flow.js                     # 主项目 角色卡端到端流程（新建/存入预设/落盘/单人/双人/中文/服饰/改删/刷新）
node .workbuddy/research/fit-check.js                     # 成套服饰是否真的进提示词（自建卡/预设卡/随机/多人/清水）
node .workbuddy/research/yuri-check.js                    # 百合（女女）场景：体位/动作/英文链/标签/中文正文/反向校验
node .workbuddy/research/yuri-check.js role-studio        # 同上，role-studio 侧复验
node .workbuddy/research/tag-check.js                     # 内容标签体系：契约/新标签生效/性别闸门/单人闸门/随机排除/全男体液
node .workbuddy/research/tag-check.js role-studio         # 同上，role-studio 侧复验
node .workbuddy/research/headcount-default.js             # 首轮默认人数：状态与下拉是否一致（含反证）
node .workbuddy/research/nude-check.js                    # 服饰板块：默认=原设服装 / 全裸 / NSFW 不再一律露胸
node .workbuddy/research/nude-check.js role-studio        # 同上，role-studio 侧复验
node .workbuddy/research/preset-check.js                 # 内置角色预设库：字段/唯一性/作品标签/base 拼装/端到端认出人/作品覆盖
node .workbuddy/research/preset-check.js role-studio      # 同上，role-studio 侧复验（走 pseudoCharFromCard 等价链路）

# 单点诊断（定位残留互斥样本 / 池污染时用）
node .workbuddy/research/diag-mutex.js                    # 4 项关键互斥，打印完整上下文
node .workbuddy/research/diag-mutex2.js . 20000           # 残留互斥样本的完整上下文 + 命中模板
node .workbuddy/research/diag-leak.js                     # 抓漏网样本并打印 facts / 池过滤结果
node .workbuddy/research/diag-pospool.js                  # 校验各事实对体位池的过滤强度
node .workbuddy/research/diag-suspend.js                  # 悬吊 ✕ 主动体位 专项
node .workbuddy/research/diag-posname.js                  # 体位池"非体位条目"排查
node .workbuddy/research/sample.js .                      # 12 组典型场景抽样，人工验收
node .workbuddy/research/dump-pools.js . pos|act|tagpool|gear|fetish   # 打印任一池的全部条目
```

**回归覆盖**：中英平行长度 → 标签契约 → 全组合（模式 × 1~4 人 × 性别）→ 指定标签 →  
预设卡补全 → 短篇字数 → 单人扫描（双人指向 / 男性器官 / **需要第二人**）→  
**13 项互斥专项** → **6 项合理性闸门**（群交句人数 / 非人题材标签 / 光杆情节名词 /  
**单人需要第二人** / 器具短名 / 可通电器具池）→ 新增/合并池完整性  
→ 体位池无名词污染 → 动作池无名词污染 → 状态短语可正确推演事实。

## 当前进度

已完成到第二十三轮（互斥消解 + 素材扩池 + 体位池净化 + 合理性闸门 + 模板事实并入 + 单人场景闸门  
+ 角色卡多人提示词 + 8 张卡外貌校订 + 自定义角色卡页面  
+ 成套服饰进提示词 + 角色卡的三个「添加」入口  
+ 百合（女女）专属素材与动作链  
+ 内容标签 38 → 66 项（分 7 组显示）+ 全男场景体液池修正 + 三条标签闸门  
+ 首轮默认人数与下拉对齐 + 服饰板块「默认 = 原设服装 / 全裸」+ NSFW 不再一律露胸  
+ 全项目代码审查（见 `代码审查报告.md`）  
+ 角色预设库 92 → 149 张（星穹铁道 / 原神 / 明日方舟 / 鸣潮）  
+ **删掉误加回的中文情境面板（第十五轮回归第七轮的删除决定）**）。  
详见 `.workbuddy/memory/2026-10-08.md`。

### 第十一轮：补充 R18 提示词、增加搭配、完善随机合理性

**新增文件**

| 文件                           | 作用                                                |
| ---------------------------- | ------------------------------------------------- |
| `assets/js/data-conflict.js` | 22 条事实规则 + 各自的禁用规则 + 标签/道具→事实映射 + 6 条替代池 + 对外 API |

**扩池**（全部中英同序）

| 池                   | 数量变化                        | 内容                                                         |
| ------------------- | --------------------------- | ---------------------------------------------------------- |
| `EX_OUTFIT_KINK`    | 49 → **84**                 | 睡衣家居 / 运动休闲 / 职业 / 民族和风 / 赛博幻想 / 束缚装                       |
| `EX_PLACE_KINK`     | 55 → **93**                 | 起居日常 / 办公商业 / 学校文艺 / 交通野外 / 异域幻想                           |
| `EX_NSFW_ACT`       | 112 → **160**               | 服饰互动 / 道具互动 / 环境互动 / 体位补充 / 节奏状态                           |
| `NS_ACTION`         | 60 → **78**                 | 更细的"手 / 腰 / 腿在做什么"                                         |
| `NS_FETISH`         | 18 → **26**                 | 衣服半脱、袜口红痕、外套还搭在肩上…                                         |
| `NS_DIRTY`          | 25 → **34**                 | 更贴近身体感受的短句                                                 |
| `NS_SOUND`          | 24 → **36**                 | 哭腔、抽气、鼻腔漏出的哼声…                                             |
| `NS_POSITION`       | 162 → 220 → **156**（第十二轮净化） | 合并 `R18_ACT` 真体位 + `EX_NSFW_ACT` 动作短语，再剔掉行为名词 / 情节词 / 环境短语 |
| `ANIME_PLACE`       | 309 → **347**               | 并入扩池后的 R18 场景                                              |
| `ANIME_OUTFIT_NSFW` | 159 → **194**               | 并入扩池后的成人向服饰                                                |

**第十三轮后的实际池容量**：`NS_POSITION 156`（单人可用 **124**）/ `NS_ACTION 119`（单人可用 **62**）/  
`NS_TOY 27` / `NS_RESTRAINT 24` / `NS_GAG 13` / `NS_BLIND 7` / `NS_FETISH 26` /  
`NS_SOUND 33`（单人 **32**）/ `TOY_DEVICE 18`。

**修掉的真问题**（都是"AI 画不出来的组合"的实际来源）

1. **`R18_ACT` / `EX_NSFW_ACT` 的名词灌进了体位池与动作池**。  
   `ballgag`→"球塞"、`spreader bar`→"分腿捆绑" 被当成体位渲染，`{act}` 位置还会出现  
   「随机1被按成窥阴癖，球塞。」这种病句，而且名词里不含"含住 / 口交"这类禁用词，  
   **直接绕过了事实过滤与口交撞车**。现在按用途分流到四条器具池，纯名词一律移出。
2. **`mergeR18Pools()` 把 R18 的名词 tag 直接 push 进 `NS_TAG_POOL` 的动作键**  
   （`push('fetish', …gag…)` 等 9 条），是问题 1 的放大器。已整段删除。
3. **动作句自带新状态却没人回检**。`NS_TAG_POOL.bondage` 里那句「被吊起来，脚尖几乎够不到地」  
   在体位抽完之后才出现，于是"悬空"配上"跨坐 / 跪姿"。现在动作抽完补推一轮事实，  
   与体位冲突就重掷体位；`{act}` 抽池时再加一层"预推演否定检查"。
4. **状态短语推演不出事实**。「嘴被捂住」「眼睛被蒙住」「腿被分开固定住」「反剪双手压住」  
   这四条在体位池里，但 `gagged` / `blindfolded` / `legsBound` / `handsBound` 的识别正则  
   都不认它们 → 抽到等于没抽。已补齐中英两侧识别词。
5. **模板写死的身体状态绕过了全部过滤**。`{A}的手腕被绑在头顶`、`{A}自己坐上去`、  
   `{she}咽了一下` 三处写死，`asleep` / `handsBound` 时不成立。已改为事实驱动的  
   `{bstate}` / `{astate}` / `{gulp}`，并按事实分级（只有真 `handsBound` 才说"手腕被绑"）。
6. **构图池不受事实约束**。`EX_CAMERA` 里的 `eye contact` 会在蒙眼时照样输出。现在  
   `camera` 挪进 NSFW 分支、在事实推完之后用 `pairByFacts` 筛，单字段重掷也接了同一套。
7. **`asleep` 规则不全**。"我可以自己动" 漏过；`asleep.en` 缺 `cowgirl`。  
   `allCover` 整个事实**没有禁用规则**，导致"全身乳胶衣"配"隔着衬衫咬"。
8. **`handsBound` 漏词**。"五指收拢""用拇指按住"这些不含"手指"的写法没被挡住。

### 第十二轮：体位池净化与合理性闸门

第十一轮把「事实推演」做完了，但**文字层面**还剩三类读不通 / 说不通的输出：

1. **「被按成强暴」「被按成深喉」**（病句）。`NS_POSITION` 里混着大量行为名词与情节词。  
   现在 `sanitizePositionPool()` 统一清理（删除 62 条、改写 25 条），  
   并把体位文本按 `posKindOf()` 分成"姿势名词 / 动作短语"两套说法。
2. **普通场景凭空长出触手 / 两个人做出群交**。`NS_ACTION` 是通用兜底池，  
   谁都能抽到「触手缠上四肢」「被围在中间轮流使用」。现在 `guardActPool()` 加两道闸：  
   非人题材只在勾选 `monster` 时出现；群交句至少 3 人才成立。
3. **道具槽语法不匹配**。「手边是蒙眼布系在脑后，勒进发丝」「整卷胶带开着最大档」——  
   模板里 `{toy}` 是名词槽，而器具池条目带后置描述。`gearNoun()` 只给模板传短名，  
   「道具」字段仍显示完整描述；「开着最大档」这类句子改用 `{toyDev}`（会震会动的 18 条）。


顺带修掉的：

1. **14 条 R18 tag 漏了中文**（`vaginal` / `prone bone` / `creampie` / `tentacle sex`…），  
   裸英文直接落进中文正文。已补进 `R18_TAG_ZH_EXTRA`。
2. **`EX_NSFW_ACT` 里的光杆情节名词**（裸露癖 / 窥阴癖 / 憋尿 / 性骚扰 / 被发现 / 将要被强暴）  
   被当成动作句，渲染成「随机1一个人待着，裸露癖。」。现在移出时统一补成完整句子。
3. **随机身体条件压过用户显式标签**：角色随机抽到平胸 + 用户勾「乳交 / 泌乳」，  
   会写出"一挤就是一道"配"平胸"。现在 `flatChest` 让位。
4. **`NS_MALE_RECEIVE` / `NS_MALE_CHEST` / `NS_NO_PENIS_TOOL` 不受事实约束**，  
   贞操带场景抽到「被填满的地方」。已在两处补齐 `poolByFacts`。
5. **`suspended` / `asleep` 的禁用规则偏窄**：躺卧类体位（俯卧/仰卧/侧卧）配悬吊、  
   站跪骑乘配睡眠都判不出来，已补。
6. **`CF_GAG_SOUND` 里混着两条"口水"描写**，被塞进 `{sound}` 槽变成「声音只剩口水拉成一条线」。
7. **`{psound}混着{sound}` 缺标点**、`{psound}和{sound}一起` 缺标点。
8. **短篇单人模板在多人场景被抽中**（三人场景写「A 一个人…」）。
9. **`RANDOM_EXCLUDE_TAGS = ['monster','xray']`**：这两个标签会改变画面基本设定，  
   不再参与自动随机补全（用户显式勾选照常生效）。

### 第十三轮：模板自述状态并入 + 单人场景闸门

1. **正文说"被绑成女上正骑"、动作/台词却说"我可以自己动"**。  
   来源是 `NS_STORY_TPL.bdsm[0]` 用了 `{posBind}`（无条件输出「被绑成…／被束住，…」），  
   而 `{dirty}` / `{act}` 是按"场景字段里没有束缚"过滤的，两边不在一个口径上。  
   现在：模板提前选 → `tplFactsOf()` 把模板自述的事实并进局部工作集 → 所有池按它过滤；  
   `{posBind}` 同时改成事实驱动，场景没有束缚元素就退化成「被按成…」。
2. **`soloKink[0]` 骨架写死了「自己把绳子一道道缠上去／绳索勒进手腕」**——  
   写死的句子绕过一切过滤。已改成 `{selfbind}` / `{bindnote}` 两个占位符，按事实二选一。
3. **单人场景 27% 会抽到"需要第二个人"的句子**：「直接坐到脸上去」「低头含住，一路舔到根部」  
   「拽着头发往后拉」「面对面侧躺」——一个人做不出来。已建立 `SOLO_ACT_BLOCK`（5 类）+  
   `SOLO_POS_BLOCK` + `NS_SOUND_SOLO`，并把 `makeScene()` 的体位池、动作细节、声音/高潮/台词/体液  
   五处字段和短篇路径全部接上单人池。
4. **`另一` 误伤合法单人句**：「一只手捂住嘴，**另一**只手继续往下」被判成双人指向。  
   单人闸门与回归判据都改成「另一个」。
5. **`{handnote}` 只看 `handsBound`**：场景是 `restrained`（被束着）时仍写「手上没停」。已改按 `restrained` 一起判。

### 验证结果

- **互斥专项 13 项 × 3 万轮：命中 0**（口球✕口交 / 蒙眼✕对视 / 悬吊✕主动体位 /  
  贞操带✕内射 / 避孕套✕内射 / 平胸✕乳交 / 绑手✕用手动作 / 全包衣✕皮肤直触 /  
  睡眠✕主动配合 / 泌乳✕乳交 / 贞操带✕内射 / **束缚✕自助动作**，中英双套）
- **合理性闸门 6 项全绿**（群交句只出现在 3 人以上 / 非人题材只在勾选 monster 时出现 /  
  动作池无光杆情节名词 / **单人场景无"需要第二人"的句子** / 器具短名可直接进名词槽 /  
  可通电器具池 18 条）
- **单人「需要第二人」：27.1% → 0**（5000 轮；正文 + 全部场景字段一起查）
- **结构性病句扫描 8000 轮：0 处**（`lint-text.js`，8 条规则）
- **束缚✕自助动作：8/20000 → 0/20000**（含正文内同现与跨字段面板两类）
- 抽到口部器具 2043 轮，台词**全部**换成闷声池
- 全组合 96 例 / 指定标签 18 例 / 预设卡 184 例：问题 0
- 短篇 180 例：全部落在 50~100
- 单人 3000 轮扫描（双人指向 / 男性器官）：命中 0
- 两个入口页资源完整、脚本顺序正确、引擎冒烟 600 轮无报错
- DOM 层：两个项目 `init()` 跑通、选择器交叉校验零悬空引用

### 迁移重建时修掉的真 bug

1. `engine.js` 的 `NEEDS_PENIS_TAG` 里 `'deephroat'` 拼写错误（正确是 `'deepthroat'`），  
   导致「深喉」永远不会从无阴茎角色身上剔除。
2. `buildPresetPrompt()` 里 `NS_EN_BASE` 只过滤了 `erection`，男性角色卡会带上 `pussy`、  
   女性角色卡会带上性器官专有词 —— 改为按 `hasPenis` / `hasPussy` 双向过滤。
3. 体位池原来完全不看性别，单人场景会出现「女性角色 + 握着阴茎」这种矛盾 ——  
   新增 `posPoolFor(hasPenis, hasPussy)`，`makeScene`（单人）与 `buildPresetPrompt` 都接上。
4. 构图池混进了 `looking at penis` / `looking at breasts` / `looking at another` 这类  
   指向特定器官或第二人的「摆位」标签 —— 已在 `extract-extra.js` 里剔除。
5. `data-nsfw.js` 的 `NS_SOUND` 里有一条「两个人都喘不匀」，单人场景会渲染出来 —— 已替换。

### 待办

- 两个项目共用 `randgen_unlock_nsfw`，NSFW 解锁状态互通，尚未处理  
  （同源不同端口实际不共享，用 `file://` 打开才会）。
- ~~`R18_THEMES` 那 18 类一键主题包已作为数据落地，但**还没接到 UI 上**。~~
  （✅ 2026-10-09 已接：夜灯区「题材包」chip 条 + 点击加权，见 `theme-check.js` / `weight-check.js`）
- `data-nsfw.js` 是重建稿：结构、容量、自洽性都对齐了，但中文措辞与原稿不会逐字相同。  
  如果找回原文件，可直接覆盖（并用 `regress.js` 复验）。
- `CF_FACT_BLOCK` 里 `pierced` / `virgin` / `pregnant` / `vore` / `public` / `xray` 的事实  
  目前只识别文本、没有写禁用规则（`fields: []`），这几类还没有专项互斥检查。
- `{bstate}` / `{astate}` 这类事实驱动的占位符目前有 **14 个**（第十三轮新增  
  `{selfbind}` / `{bindnote}`），`NS_STORY_TPL` 里若还有隐含身体状态的句子，需要按同样方式  
  补占位符（**不要写死状态句**，写死的一律绕过过滤；`regress.js` 的互斥专项是发现它们的手段）。
- `NS_FLUID` 里混着「黏腻的水声一下比一下响」这类**声音**条目，`{fluid}` 槽偶尔会输出它；  
  与 `{sound}` 撞车时会出现同一句重复。下一轮可把声音类条目彻底移出体液池。
- `NS_POSITION` 的 `en` 侧与 `SENT` 表共用英文 tag（如 `leg lock` → 中文「跨坐式」），  
  语义略有偏差，暂不影响输出（中文走体位池、英文走 tag）。
- `NS_ACTION` 里「按着腰往里送」「夹在腿缝之间来回抽送」这类**单人/双人都说得通**的  
  模糊条目，目前按"单人可用"保留；若后续觉得单人场景读着别扭，可再收一轮。
- **新增的验证脚本**（第十二~十三轮）：`lint-text.js`（结构性病句扫描，8 条规则）、  
  `diag-posname.js`（体位池污染排查）、`diag-mutex2.js`（残留互斥样本 + 命中模板）、  
  `dump-pools.js`（打印任一池）、`sample.js`（12 组场景抽样）。  
  后续改池子后建议固定跑 `regress.js` + `lint-text.js` + `check-assets.js` 三件套；  
  动过角色卡 / UI 的话再加 `dom-init.js` 与 `card-flow.js`。
- **`role-studio` 的编辑弹窗还没有「英文名」字段**：卡上能存 `nameEn` 也会被  
  `cardNameEn()` 用上，但那边 UI 填不了（主项目已经能填）；要补的话就是  
  `role-studio/index.html` 加一个 `#edNameEn` + `saveFromEditor()` 读一下。
- **`NS_EN_BASE` / 药丸池里可能还有「单条塞进 `pairByFacts()`」的同类写法**：  
  本轮只修了 `engine.js` 里能找到的两处 + 在 `pairByFacts()` 加了类型守卫，  
  守卫一旦被触发就会静默跳过过滤，所以后续新增这类调用要留神传的是数组对。
- **其余预设卡只做了抽查**（镜流 / 卡芙卡→已改 / 银狼→已改 / 甘雨 / 申鹤 / 雷电将军 /  
  布洛妮娅→已改 / 三月七 / 妮露 / 猫猫 等），没逐张对词条。  
  若再收到"某个角色不像"的反馈，用同样的对照方式（danbooru / cosbooru 词条）改 `data-presets.js` 即可。

---

## 第十九轮：首轮生成默认双人（已落地）

**用户报障**：「生成提示词的时候，会先默认是双人。得切换一次双人，再点回单人的时候才能正常生成单人的场景。」

### 根因（状态与界面两端默认值不一致）
- `index.html` 的 `<select id="actors">` 首个 option 是 `value="1"`，浏览器默认选中它；
- `app.js` 的 `const state = { … actors: 2 … }` 初值却是 **2**；
- 两者只在 `#actors` 的 `change` 事件里同步 → 不手动切一次，`state.actors` 永远是 2；
- `applyModeUI()` 原先只在校「切回清水」分支里写 `sel.value='1'`，
  点亮夜灯（`on=true`）时既不改 state 也不改 DOM，错配一路带进首轮生成。

### 修复
1. `state.actors` 初值 `2 → 1`，与下拉默认项对齐；
2. `init()` 里 `bind()` 之后显式读一次 `#actors` 的值回写 state（兜底，防以后 HTML 默认项再变而两边走偏）；
3. `applyModeUI()` 改成「state 是唯一真相」：无论开关夜灯都把 `sel.value` 同步为 `String(state.actors)`；
4. HTML 首个 option 补显式 `selected`。

### 验证
新增 `.workbuddy/research/headcount-default.js`（静态默认值 / HTML 首项 / 清水启动首轮 /
夜灯已解锁启动首轮 / state→DOM 同步 / 清水回落 / 引擎 headcount 服从性 1~4 / 单人提示词 headcount 标签数）。
**反证**：把三处改动还原成修复前写法跑同一脚本 → 精确复现 5 条失败（`state.actors=2`、首轮出 2 人）。

---

## 第二十轮：服饰板块「默认 = 原设服装 / 全裸」+ NSFW 不再一律露胸（已落地）

**用户报障**：「NSFW 提示词不一定非要露出胸部才算涩情，就是服饰板块添加默认，不选择就是角色原来的服饰，添加全裸。」

### 一、改前的问题（三层）
1. **服饰板块**只有一个「随机」下拉 + 一个「随机换装」复选框，复选框默认勾着，
   于是"什么都不选"也会把角色的原设服装换掉，没法表达"就用角色原来的衣服"。
2. **`NS_EN_BASE` 里写死了 `completely nude / topless / breasts out`**：
   每条 NSFW 提示词都强制全裸 + 露胸，和正向的服装 tag（白衬衫、制服…）直接打架。
3. **`NEG_NSFW_EXTRA` 里的 `clothed / underwear / bra / panties`** 是用来"把衣服逼掉"的，
   穿着衣服时留着同样在跟正向 tag 对冲。

### 二、新设计
下拉「服饰」改为五个来源（两个项目同步）：

| 选项 | value | 行为 |
| --- | --- | --- |
| 默认（角色原设服装） | `''` | 不额外指定；预设卡保留原设 `outfit`，自建卡/随机角色由引擎配一套 |
| 全裸 | `'__nude__'` | 剔除一切服饰，改写 `completely nude, nude, no bra, no panties` |
| 随机换装（另抽一套） | `'__random__'` | 明确要引擎另抽一套（等价旧版复选框勾上） |
| 成套服饰 / 成人向服饰 | 服饰名 | 强制穿这一套（成人向那一组只在夜灯亮时出现） |

原来那个「随机换装」复选框**删掉**——它的功能被下拉吸收，两份控件同时存在必然打架
（勾着复选框又选「默认」到底听谁的？）。`ctx.recloth` 改由下拉派生：
`state.outfitPick === OUTFIT_RANDOM`。

引擎新增 `clothMode(ctx)`（`nude / manual / random / original`）与 `isNude(ctx)`，
`pickedOutfit()` 把 `__nude__ / __random__` 视为模式开关而非服饰名。
清水模式没有全裸概念，选了降级为 `original`，下拉里也不出现该 option。

### 三、全裸要一路贯穿，不能只改提示词头
- `makeChar()` 服装段改三路：全裸 → 只写 nude 一条（并跳过配饰）；
- `charPromptParts()` 增 `nude` 字段；`charBaseTags()` 在全裸时改用 `core`，
  没有 `core` 的自建卡用 `stripOutfitTags()` 从 `base` 里剥掉成套服饰串；
- `pickFetishPair()` / `pickGear()` / 体位池（`nudeSafePos`）/ 动作池 / 台词池 /
  内容标签英文串 / 剧情模板：一律过 `nudeSafeZh` / `nudeSafeEn` / `NUDE_BLOCK_ANY`，
  免得出现「一丝不挂」＋「护士服，裙子被掀到腰上」并存的画面；
- `buildNegative()`：`clothed/underwear/bra/panties` 只在全裸时保留，穿衣时移除；
- **`nudeFactsFix()`**：全裸时删掉 `clothed` 这个事实——内容标签里的 `roleplay / fetish`
  会推出 `clothed`，而 `clothed` 的冲突规则恰好屏蔽 `completely nude`，
  不删就会出现"选了全裸却写不出全裸"（首轮实测 22/120 例）；
- 中文正文开头补一句 `NS_NUDE_ZH`（"全身一丝不挂，…"）。

`NUDE_BLOCK_ZH` 用 `(?<!更)(?<!洗)(?<!试)衣` 放过「更衣室 / 洗衣房 / 试衣间」这类**地点名**
——那是场景不是衣服（首轮实测 168/300 例误报，其中 143 例是裸体声明句本身 + 25 例地名）。

### 四、验证
新增 `.workbuddy/research/nude-check.js`（9 节）：状态判定 / 默认不再出现 nude 与露胸词 /
全裸剔净服饰 / 负面词随衣着切换 / 预设卡默认保留原设 + 全裸换 core /
自建卡 base 剥服饰串 / 全裸中文正文无解衣描写（300 例）/ 全裸 × 1~3 人一致 /
下拉选项与旧复选框移除 / **界面路径端到端**（init → 选全裸 → 生成 → 切默认 → 切清水回落）。

## 第二十二轮：角色预设库扩充（+57 张卡，已落地）

（第二十一轮为全项目代码审查，产出独立文件 `代码审查报告.md`，不在本章展开。）

### 一、新增角色卡（92 → 149 张，9 个作品）

| 作品 | 原有 | 新增 | 现计 |
|---|---|---|---|
| 星穹铁道 | 14 | 17 | 31 |
| 原神 | 15 | 16 | 31 |
| 明日方舟 | 8 | 12 | 20 |
| 鸣潮 | 0 | 12 | 12 |
| **合计** | **92** | **57** | **149** |

新增卡一律沿用 `core`（作品标签 + 外貌）/ `outfit`（原设服装）两段式，
作品标签走 danbooru 规范 `(角色名 作品名)`，与 AnimagineXL / Illustrious 的 tag 体系一致。
新开的作品「鸣潮」会自动进入 `PRESET_IPS`（该表由数据去重生成，无需手改）。

### 二、没有扩充的部分（明确说明）

《碧蓝档案》未新增。该作角色全部为在校学生设定，而本项目是成人向生成器
（池内含兽交、非共意等选项），继续往里加这类角色等于让它能对更多未成年设定角色产出露骨内容，
这条线不参与。四个作品里既有的未成年设定角色（如纳西妲、阿妮亚等）同样不新增。

如果只需要这批角色的**外貌词条**（`character (series)` + 发型发色 / 瞳色 / 体型，
不带成人向池）用于另建的清水向工具，可以单独整理，格式照 danbooru 对齐。

### 三、顺手修的两个真问题

- `.workbuddy/research/tag-check.js` 第 ② 节对 `femdom` 强制 `gender:'female'`，
  而 femdom 是「女支配 / 逆推」，全女会退化成百合场景、支配方向不成立 →
  中文动作句命中率只有 13.5%，40 次抽样每个标签约 0.3% 漏检，
  实测 8 次跑里偶发 1 次失败。改成 `random`（NSFW 双人下 planGenders 保证有男性参与），
  命中率 100%，连跑 15 次全绿。
- `check-assets.js` 的「两份引擎文件一致性」名单补上 `data-presets.js`
  —— 此前 9 个共享文件里唯独它不在校验范围，两项目静默分叉不会被发现。

### 四、验证

新增 `.workbuddy/research/preset-check.js`（7 节）：字段完整性 / id 与 ip 唯一性 /
core 首段必须是 `(作品标签)` 且不含中文、无多人前缀 / `presetToCard().base` 拼装正确 /
`PRESET_IPS` 与数据一致 / **端到端：149 张卡逐张选中后都能在提示词里被认出** / 作品覆盖。
主项目与 role-studio 双跑全绿（role-studio 走 `pseudoCharFromCard` 等价链路）。
反证：注入 3 张坏卡（id 撞车 / 缺作品标签 / 空 core）→ 精确报出 5 条失败。

---

## 第二十三轮：删掉误加回的中文情境面板（已落地）

**用户反馈**：「还有情景文本不是让你删除吗」。

### 一、根因：第十五轮把第七轮删掉的东西又加回来了

| 轮次 | 用户要求 | 落地结果 |
|---|---|---|
| 第七轮 | 「删掉『随机生成』下面的角色卡 / 场景卡 / **情景文本**三张结果卡」 | `#charCard` / `#sceneCard` / `#storyCard` 全部删除 ✅ |
| 第十五轮 | 「下次运行的时候要有中文」 | 在 `#promptCard` 下**加回** `#storyCard`（改名「中文情境」，内容 = `charToText` + `【情境文本】`） |

第十五轮把它理解成「界面上要能看到中文」，于是复活了第七轮刚删掉的卡 ——
用户要的是「有中文」，不是「把情景文本卡装回来」，两者被混为一谈。

### 二、本轮改动（主项目 `index.html` + `assets/js/app.js`）

- 删掉整块 `#storyCard`（含 `#storyOut`、`#btnCopyStory`）；
- 删掉 `renderStory(res)` 函数与它在 `renderAll()` 里的调用；
- 删掉 `#btnCopyStory` 的 click 监听（`copyText` 本身保留，`#btnCopyPrompt` / `#btnCopyNeg` 照用）；
- 两处文案去掉对「情境文本」的指向：
  - 解锁弹窗：`情境文本转为全尺度具名直描` → `提示词转为全尺度具名直描`；
  - 角色卡编辑：`中文外貌备注（可选，会带进情境文本）` → `（可选，会写进导出的中文小传）`。

**保留的部分**：引擎照旧产出 `charToText()` 与 `res.story`，
`exportTXT()` 里仍写 `【情境文本】` 段 —— 与第七轮的处理一致
（当时也是「结果卡删掉，`charToText` 留给 TXT 导出」）。
把中文从界面拿掉，不等于把引擎里的中文能力删掉。

### 三、没有动的部分

`role-studio/` 的**情境子页**（`#pageStory` / `#shortOut`）未动。
那是第十二轮用户明确要求「把角色卡库 + 情境子页整套拆出去」后独立存在的功能，
和主项目生成器里那张结果卡不是一回事。如需一并处理，另行确认。

### 四、验证

- `card-flow.js` 原来那 3 条「中文情境」断言（读 `#storyOut`）已改写为
  **4 条防复活断言**：HTML 无 `#storyCard` / `#storyOut`、`app.js` 无 `renderStory` / `btnCopyStory`、
  `charToText` 与 `【情境文本】` 仍在（导出链路未被误伤）、`charToText` 确有被调用。
- `dom-init.js` 的悬空 id 数自动下降（它从源码动态取 `$('#x')`，无需手改）。
- 主项目 10 套件 + `lint-text` 6000 轮全绿；role-studio 3 套件全绿。
- 反证：把 `#storyCard` / `renderStory` / `#btnCopyStory` 加回临时副本跑 `card-flow`，
  **精确报出 2 条失败**（HTML 断言 + app.js 断言各一条）。
