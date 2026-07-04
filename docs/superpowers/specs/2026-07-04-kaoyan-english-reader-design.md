# 考研英语阅读辅助翻译工具 — 设计文档

> 日期：2026-07-04 | 状态：已确认

## 一、项目概述

**目标**：考研备考者拍下英语阅读文章 → 自动 OCR + 逐句翻译 + 考研词汇标注 → 三段式对照学习。

**核心价值**：省去手动查词、逐句翻译的时间，同时通过词汇标注强化考研词汇记忆。

**使用方式**：打开浏览器 → 拍照/粘贴文本 → 自动识别翻译 → 对照学习。无需注册登录。

---

## 二、功能范围

### MVP（本次实现）

| 功能 | 描述 |
|------|------|
| 图片上传 | 拖拽、选择文件、拍照三种方式 |
| 文本粘贴 | 直接粘贴英文阅读文本，跳过 OCR |
| OCR 识别 | Tesseract.js 浏览器端识别英文 |
| 逐句翻译 | 按句拆分，逐句翻译，句句对照 |
| 整段翻译 | 生成连贯的整段译文（与逐句共存，tab 切换） |
| 考研词汇标注 | 匹配大纲词表，红色下划线标记，面板展示释义 |
| 点击查词 | 点击原文中任意单词，弹窗显示中文释义（大纲词优先本地词表，非大纲词调 Free Dictionary API） |
| 三段式结果页 | 原文（上）+ 译文（中）+ 词汇面板（下，可折叠） |
| 公网部署 | Vercel 部署，HTTPS 域名，任何人可用 |

### 不做（v2 再考虑）

- 用户系统/历史记录
- PDF 上传
- 图片预处理（裁剪/旋转）
- 多语言支持
- 单词本/收藏功能

---

## 三、架构设计

```
用户浏览器                              Vercel 云端
┌──────────────────┐              ┌─────────────────────┐
│  UploadPage      │              │  静态资源托管         │
│  (引导式上传)     │              │  HTML/CSS/JS/WASM   │
│                  │              │  考研词汇表 JSON      │
├──────────────────┤              ├─────────────────────┤
│  OcrEngine        │              │  /api/translate      │
│  (Tesseract.js)   │              │  Serverless Function │
│                  │              │  → Microsoft Translator│
├──────────────────┤              └─────────────────────┘
│  TranslateService │
│  (分句+翻译+标注) │
├──────────────────┤
│  ResultPage       │
│  (三段式对照)     │
└──────────────────┘
```

### 技术选型

| 层 | 选型 | 理由 |
|---|---|---|
| 框架 | React 18 + Vite | HMR 快，Vercel 原生适配 |
| 样式 | Tailwind CSS 3 | 快速开发，响应式方便 |
| OCR | Tesseract.js v5 | 浏览器 Worker 线程运行，零成本 |
| 翻译 | Microsoft Translator API | 200万字符/月免费，稳定 |
| 后端 | Vercel Serverless Function | 零运维，100K次/月免费 |
| 部署 | Vercel | 自动 HTTPS + 全球 CDN + GitHub 自动部署 |

### 数据流

```
图片/文本输入
  │
  ├── 图片 → Tesseract.js OCR (浏览器 Worker) → 英文文本
  │
  └── 文本 → 直接使用
  │
  ↓
前端分句（按 .!? 拆分）
  │
  ↓
逐句 POST /api/translate → Microsoft Translator → 中文译文
  │
  ↓
逐词匹配考研词表 → 标注 isVocab + meaning
  │
  ↓
渲染三段式结果页
```

---

## 四、模块设计

### 1. UploadPage — 上传页

- 三步引导说明（拍照 → 识别 → 对照学习）
- 拖拽区 + 拍照按钮 + 选择文件按钮
- **文本粘贴区**：textarea，用户可直接粘贴英文阅读文本
- 图片预览确认（OCR 前让用户看一眼图片是否清晰）

### 2. OcrEngine — OCR 模块

- 封装 Tesseract.js，运行在 Web Worker
- `recognize(file: File): Promise<string>`
- 进度回调：`onProgress(percent: number)`
- 错误处理：模糊图片提示"请重新拍摄，确保文字清晰"

### 3. TranslateService — 翻译 & 分词

- `splitSentences(text: string): string[]` — 按 .!? 分句
- `translateSentences(sentences: string[]): Promise<{sentence: string, zh: string}[]>`
- `annotateVocab(sentences: string[], vocabMap: Map<string, string>): AnnotatedText`
- 输出数据结构：

```ts
interface ResultData {
  sentences: {
    en: string;
    zh: string;
    words: {
      text: string;       // 原词
      isVocab: boolean;   // 是否考研词汇
      meaning?: string;   // 中文释义（仅 isVocab 时）
    }[];
  }[];
  paragraphZh: string;  // 整段连贯译文
}
```

### 4. ResultPage — 结果页

- **原文区**（上）：英文原文，考研词汇红色下划线，hover/click 显示释义 tooltip
- **译文区**（中）：中文译文
- **词汇面板**（下）：可折叠，列出所有考研词汇 + 释义，grid 布局
- Tab 切换：逐句对照 | 整段译文
- 操作按钮：返回首页、处理新文章

### 5. /api/translate — Vercel Function

```
POST /api/translate
Body: { text: string }
Response: { zh: string }
```

- 单文件，~30 行
- API Key 存在环境变量 `MS_TRANSLATOR_KEY`
- 限流：单 IP 每秒最多 10 次

---

## 五、视觉设计

**风格**：学术暖调

| 属性 | 值 |
|------|-----|
| 背景色 | `#fef9f0` (米白) |
| 主文字色 | `#2c3e50` (深蓝灰) |
| 点缀色 | `#e67e22` (暖橙) |
| 考研词汇下划线 | `#e74c3c` (红) |
| 卡片背景 | `#ffffff` |
| 边框 | `#e8d5b7` / `#f0dbb8` |
| 字体 | 系统默认（英文优先 Inter/Georgia，中文优先系统中文字体） |

---

## 六、考研词汇表

- 来源：考研英语大纲词汇（红宝书/新东方版本），约 5500 词
- 格式：`{ "word": "notion", "meaning": "n. 概念，观念" }`
- 存储：静态 JSON 文件，部署时随静态资源一起分发
- 匹配逻辑：忽略大小写，lemma 化（处理复数、过去式等基本变形）

---

## 七、非功能需求

- **性能**：OCR 识别 < 10s（取决于图片大小），翻译 < 3s
- **响应式**：手机端（拍照场景）和桌面端（粘贴文本）均可用
- **错误处理**：OCR 失败/翻译超时/网络断开均给出中文提示
- **隐私**：图片不上传服务器，OCR 完全在浏览器本地执行

---

## 八、部署方案

1. 代码推送到 GitHub 仓库
2. Vercel 关联仓库，自动部署
3. 获得 `https://kaoyan-reader.vercel.app` 域名
4. 后续 `git push` 自动触发部署

---

## 九、文件结构（预估）

```
kaoyan-reader/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── vercel.json
├── public/
│   └── vocab.json              # 考研词汇表
├── api/
│   └── translate.ts            # Vercel Serverless Function
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── pages/
│   │   ├── UploadPage.tsx      # 上传页
│   │   └── ResultPage.tsx      # 结果页
│   ├── services/
│   │   ├── ocr.ts              # OCR 引擎封装
│   │   ├── translate.ts        # 翻译服务
│   │   └── vocab.ts            # 词汇匹配
│   ├── components/
│   │   ├── ImageUploader.tsx   # 图片上传组件
│   │   ├── TextPaster.tsx      # 文本粘贴组件
│   │   ├── OriginalText.tsx    # 原文展示
│   │   ├── TranslationView.tsx # 译文展示
│   │   ├── VocabPanel.tsx      # 词汇面板
│   │   └── ProgressBar.tsx     # 进度条
│   ├── hooks/
│   │   └── useOcr.ts           # OCR hook
│   └── types/
│       └── index.ts            # 类型定义
└── .env.example                # 环境变量示例
```
