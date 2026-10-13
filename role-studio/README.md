# ROLE STUDIO · 角色卡与情境工坊

纯前端、零依赖的本地工具。打开 `index.html` 即可用，不需要服务器、不需要联网、不上传任何数据。

## 做什么

- **角色库**：92 张内置二次元角色卡（星穹铁道 / 原神 / 蔚蓝档案 / 明日方舟 / Fate / 赛马娘 / 东方 / 其他），
  加上你自己新建的卡，合成一个库统一搜索、筛选、浏览。
- **随机补全**：点任一角色 → 按当前底模生成一条完整绘图提示词（角色本体固定，服装 / 动作 / 表情 / 背景 / 光线 / 构图随机）。
- **情境子页**：选 1–4 个角色，生成 50–100 字的情境短篇。

## 主要功能

| 功能 | 说明 |
|---|---|
| 来源筛选 | 全部 / 内置预设 / 我的角色，带实时计数 |
| 双密度视图 | 紧凑列表（扫得快）/ 卡片网格（看得细） |
| 搜索 | 空格分词做 AND，命中角色名 / 作品 / 外貌标签 / 备注；搜中文备注能桥到英文角色 |
| 性别筛选 | ♀ / ♂ 开关 |
| 底模预设 | Animagine XL 3.x（默认）/ Illustrious 光辉 / Pony Diffusion V6，各自的画质词与负面词写法 |
| 成套服饰 | 40 套可选（兔女郎 / 汉服 / JK / 泳装 / 女仆 / 巫女 / 婚纱 …），不选则随机 |
| 夜灯 | 顶栏灯泡开关成人内容，首次点亮需一次性确认 |
| 持久化 | "我的角色"存在浏览器 localStorage，导出 JSON 可备份 / 搬运 |

## 卡片结构

```js
{
  id, src,          // src: 'preset' | 'mine'
  name, ip,         // 显示名、来源作品
  gender,           // female | male | futa
  core, outfit,     // 预设卡：识别核心（不含服装）+ 原设服装
  base,             // 完整基础提示词（只含外貌，可直接复用）
  note, ts          // 中文外貌备注、时间戳
}
```

`base` 只写人物外貌 —— 角色来源、性别、发型发色、瞳色、身材、服装、配饰、身体特征。
场景、动作、画风、画质词由生成器自动拼在后面。

## 文件结构

```
index.html                  两页：角色库 / 情境子页
assets/css/style.css        浅色主题；body.mode-nsfw 切换强调色为酒红
assets/js/data-common.js    通用词库（外貌 / 服装 / 场所 / 光线 / 构图 / 底模预设）
assets/js/data-sfw.js       清水向词库
assets/js/data-nsfw.js      全尺度词库 + 内容标签 + 情境模板
assets/js/data-en.js        与中文词库索引一一对应的英文平行数组
assets/js/data-presets.js   92 张内置角色卡 + presetToCard()
assets/js/engine.js         随机引擎与拼装器
assets/js/app.js            界面与交互
```

## 与「RANDOM GEN 生成器」的关系

这是从生成器项目拆出来的独立项目。两边共用同一套词库与引擎，
`data-presets.js` 的卡结构与两边一致，导出的 JSON 可以互换。

生成器（另一个项目）负责：随机生成角色 / 场景 / 情境文本 / 提示词，并在生成时**指定角色卡**。
本项目负责：管理角色卡库 + 专门写情境短篇，有完整的情境设定（世界观 / 画风 / 标签）与子页 UI。

两侧 localStorage 键独立，互不影响：
- 本项目：`randgen_chars`、`randgen_unlock_nsfw`
- 生成器：`randgen_history`、`randgen_fav`、`randgen_unlock_nsfw`

## 本地打开

直接双击 `index.html`。
若浏览器限制本地文件读取，可在本目录起一个静态服务：

```bash
python -m http.server 8778 --bind 127.0.0.1
```

然后访问 http://127.0.0.1:8778/

## 修改时的注意事项

1. `data-en.js` 各数组长度必须与 `data-common.js` / `data-nsfw.js` 对应数组**完全一致**，`PAIR()` 按索引同时取中英。
2. 模板占位符分两类：**固定**（`{A}{B}{place}{penis}{pussy}{breast}`…）一次替换；
   **多变**（`{act}{fluid}{sound}{organ}{dirty}{psound}`）每次出现重新随机。
3. `NS_POSITION` 每项带 `grp`（front/back/ride/oral），按组选模板，避免体位与动作矛盾。
4. 任何含 `{B}` 的模板在单人场景都会渲染成「另一个人」，单人池必须独立。
5. 短篇必须用独立短句池（`SNS_*` / `SFS_END`），常规池单条 15–30 字，直接拼必然超 100 字。
6. 写正则过滤词时用 `\b`，否则 "amuse**semen**t"、"nude stockings" 会误命中。
