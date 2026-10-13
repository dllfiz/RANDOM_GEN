# RANDOM GEN · 本地提示词生成器

面向 **Stable Diffusion / ComfyUI** 的本地网页工具：随机与自选提示词、角色卡、多分辨率工作流、中文描述转提示词、可选大模型优化，以及 **Real-ESRGAN 图片放大工坊**。

> **重要说明**  
> SD / ComfyUI **不能**被本工具“直接遥控出图”到任意环境；本工具负责生成与整理提示词、组装工作流 JSON，并可通过本地代理把任务提交到**已在本机运行**的 ComfyUI。出图仍依赖你的底模、LoRA 与 ComfyUI 节点环境。

仓库地址：https://github.com/dllfiz/RANDOM_GEN

---

## 功能一览

| 模块 | 说明 |
|------|------|
| 提示词生成 | 角色 / 场景 / 构图 / 画风 / 体型 / 动作等词库组合，支持 NSFW 标签与权重 |
| 角色卡 | 预设与「自定义」分组；选卡可同步底模与角色 LoRA（可选手动关闭，仅用底模） |
| Comfy 对接 | 读取本机 ComfyUI 的 checkpoint / LoRA 列表；多模板勾选；批量入队 |
| 分辨率模板 | `comfy-templates/` 下竖屏 / 横屏 / 方图多种尺寸 JSON |
| 中文 → 提示词 | 规则转换 + 可选国内大模型润色；可上传参考图做视觉分析（图优先） |
| 图片放大 | `upscale.html`：2×～8×、批量、粘贴、进度条、历史、目录设定、预览与复制 |
| 角色工坊 | `role-studio/` 用于扩展角色与词库 |

---

## 环境要求

- **Node.js**（建议 18+，用于 `server.js` 本地服务）
- **ComfyUI**（本机已启动，默认 `http://127.0.0.1:8188`）
- 浏览器（推荐 Chrome / Edge）
- 放大功能需要 ComfyUI 具备 Upscale 相关节点，并在 `models/upscale_models/` 放置 Real-ESRGAN 权重（见下文）

---

## 快速开始

### 1. 获取代码

```bash
git clone https://github.com/dllfiz/RANDOM_GEN.git
cd RANDOM_GEN
```

或下载 ZIP 后解压到任意目录（路径尽量避免奇怪权限问题）。

### 2. 启动本工具

**Windows 推荐：**

1. 双击 **`启动生成器.bat`**
2. 终端出现「已启动」后，浏览器打开：  
   `http://localhost:8777/index.html`  
   （端口被占用时会自动 +1，以黑窗口提示为准）

**命令行：**

```bash
node server.js
# 或指定端口
node server.js 9000
```

> 不建议长期用「直接双击 `index.html`」的 `file://` 模式：无法调用本地 API、无法提交 Comfy、无法落盘存档增强。请始终用 bat / `node server.js`。

### 3. 启动 ComfyUI

先启动你的 ComfyUI，确认能打开 `http://127.0.0.1:8188`。  
在生成器右侧「生成 / Comfy」面板填写相同地址，点刷新模型列表。

### 4. 基本出图流程

1. 左侧选择角色、场景、体型等（或随机）
2. 点生成，右侧出现正/负提示词（可再编辑）
3. 选择工作流模板（可多选分辨率）
4. 可选：角色 LoRA 或「不使用角色 LoRA（仅底模）」
5. 设置种子、张数、编号前缀后 **提交到 ComfyUI**
6. 在 ComfyUI 队列中查看结果

更细的界面说明见项目内 **`tutorial.html`**（生成器右上角「说明」也会打开）。

---

## 页面入口

| 文件 | 用途 |
|------|------|
| `index.html` | 主生成器 |
| `upscale.html` | 图片放大工坊 |
| `tutorial.html` | 图文说明 / 教程页 |
| `role-studio/index.html` | 角色工坊 |
| `环境自检.html` | 环境检查辅助 |

---

## Comfy 模板

目录：`comfy-templates/`

- `base.json` / `simple.json`：基础工作流
- `竖屏-*.json`、`横屏-*.json`、`方图-*.json`：不同比例与分辨率

可在界面中多选模板，一次按多套尺寸入队。自定义工作流可按现有 JSON 结构仿写后放入同目录。

---

## 角色与词库（常见修改位置）

| 需求 | 文件 |
|------|------|
| 体型自选档位 / 随机身材中文 | `assets/js/data-common.js` |
| 身材英文 tag | `assets/js/data-en.js` |
| 预设角色卡 | `assets/js/data-presets.js`（工坊侧亦有对应文件） |
| 生成逻辑 | `assets/js/engine.js`、`assets/js/app.js` |

自定义角色分组可置顶；选卡后会优先匹配推荐底模与角色 LoRA，也可在下拉里改为「仅底模」。

---

## 中文提示词与大模型

- 右侧「中文提示词」：自然语言 → Danbooru 风格 tag，可二次编辑再提交
- 可选接入兼容 OpenAI 协议的国内 API（如 DeepSeek 等），密钥保存在本地 **`config/llm.json`**（**请勿提交真实密钥到公开仓库**）
- 支持上传参考图：有图时以图像分析为主，中文作辅助

示例 `config/llm.json` 结构：

```json
{
  "base_url": "https://api.deepseek.com",
  "api_key": "",
  "model": "deepseek-chat",
  "enabled": false
}
```

---

## 图片放大工坊

打开：`http://localhost:8777/upscale.html`

- 多选 / 拖拽 / **Ctrl+V** 粘贴，批量放大
- 倍率 2× / 4× / 6× / 8×（2× 在仅有 x4 模型时会用 x4 后再缩放到 2×）
- 进度条、停止当前 / 停止全部
- 历史记录：默认删除**只删记录**；**Shift + 删除** 才删本地文件
- 输出目录可在说明区折叠项中设定，写入 `config/upscale.json`，目录不存在会自动创建
- 生成器勾选自动放大时：若放大页已打开则**跨标签接力**，不重复开页

### 放大模型

放到项目与 ComfyUI 的：

```text
models/upscale_models/
```

| 文件 | 说明 |
|------|------|
| [RealESRGAN_x2plus.pth](https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.1/RealESRGAN_x2plus.pth) | 2× 相关 |
| [RealESRGAN_x4plus.pth](https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth) | 4× 主用 |

页内可「检测模型 / 下载缺失模型」。ComfyUI 需能加载同名 `upscale_models`。

---

## 配置与隐私（上传 Git 前请注意）

建议加入 `.gitignore`，避免泄露与撑爆仓库：

```gitignore
config/llm.json
config/upscale-history.json
存档/
upscale-output/
models/upscale_models/*.pth
*.part
node_modules/
```

- API Key、个人存档、生成大图、权重文件请留在本机
- 角色与 NSFW 词库若公开仓库，请自行评估合规与版权

---

## 目录结构（简）

```text
RANDOM_GEN/
├── index.html          # 主界面
├── upscale.html        # 放大工坊
├── tutorial.html       # 说明页
├── server.js           # 本地服务与 Comfy / LLM / 放大 API
├── 启动生成器.bat
├── assets/js/          # 词库、引擎、界面逻辑
├── comfy-templates/    # 工作流模板
├── config/             # 本地配置（密钥勿提交）
├── models/upscale_models/
├── role-studio/        # 角色工坊
└── 存档/               # 本地存档
```

---

## 常见问题

**启动后浏览器无法访问**  
看黑窗口是否仍在运行、端口是否被占用；以窗口打印的地址为准刷新。

**提交 Comfy 不画图**  
确认 ComfyUI 已开、地址正确、模板节点与本机插件一致（如手部 Detailer 等）；查看 Comfy 控制台报错。

**角色 LoRA 不生效 / 想只要底模**  
在「角色 LoRA」选 **不使用角色 LoRA（仅底模）**。

**放大失败**  
确认模型已在 ComfyUI 的 `upscale_models` 且页内检测为就绪；4× 通常最稳。

**复制图片失败**  
请使用 `http://localhost` 打开（非 file://），并在预览中对**图片本身**右键或点「复制到剪贴板」。

---

## 许可与致谢

- 本仓库工具代码由作者维护，使用方式以本 README 为准。
- Real-ESRGAN 模型来自 [xinntao/Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN)。
- ComfyUI、各底模与 LoRA 版权归原作者；角色设定请遵守原作者规范。

---

## 反馈

Issue：https://github.com/dllfiz/RANDOM_GEN/issues

祝出图顺利。
