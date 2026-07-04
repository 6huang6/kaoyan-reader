# Task Plan: 考研英语阅读辅助翻译工具

## Goal
构建一个浏览器端考研英语阅读翻译工具：拍照/粘贴文本 → OCR识别 → 逐句翻译+整段译文 → 考研词汇标注 → 三段式对照学习。Vercel 部署，任何人可用。

## Current Phase
Phase 1: Foundation

## Phases

### Phase 1: Foundation（基础搭建）
**产出**：可运行的空项目骨架，配置齐全
- [ ] Task 1: 项目脚手架 — package.json, vite.config.ts, tailwind.config.js, tsconfig.json, tsconfig.app.json, tsconfig.node.json, postcss.config.js, index.html, vercel.json, .env.example
  - **文件**：10 个配置文件
  - **验收**：`npm install && npm run dev` 能在本地启动空白 React 页面
- [ ] Task 2: 类型定义 + 考研词汇表 — src/types/index.ts, public/vocab.json
  - **文件**：src/types/index.ts, public/vocab.json
  - **验收**：类型文件编译无报错，vocab.json 包含 ~5500 考研词汇
- [ ] Task 3: Vercel Serverless Function — api/translate.ts
  - **文件**：api/translate.ts
  - **验收**：本地 `vercel dev` 后可 curl POST 到 /api/translate 获取翻译结果
- **Status:** pending

### Phase 2: 核心服务（Services）
**产出**：OCR、翻译、词汇三大服务模块，可独立调用
- [ ] Task 4: 词汇匹配服务 — src/services/vocab.ts
  - **文件**：src/services/vocab.ts
  - **验收**：`matchVocab("The notion captivated researchers")` 返回标注后的词列表
- [ ] Task 5: OCR 引擎封装 — src/services/ocr.ts
  - **文件**：src/services/ocr.ts
  - **验收**：传入英文图片 File，返回识别文本，有进度回调
- [ ] Task 6: 翻译服务 — src/services/translate.ts
  - **文件**：src/services/translate.ts
  - **验收**：`translateSentences(["Hello world.", "How are you?"])` 返回逐句译文 + 整段译文
- **Status:** pending

### Phase 3: Hooks + 基础组件
**产出**：可复用的 React Hook 和通用 UI 组件
- [ ] Task 7: useOcr Hook — src/hooks/useOcr.ts
  - **文件**：src/hooks/useOcr.ts
  - **验收**：`const { recognize, text, progress, error } = useOcr()` 可调用
- [ ] Task 8: 通用组件 — ProgressBar, ImageUploader, TextPaster
  - **文件**：src/components/ProgressBar.tsx, src/components/ImageUploader.tsx, src/components/TextPaster.tsx
  - **验收**：各组件可独立渲染，ImageUploader 支持拖拽+选择文件+拍照，TextPaster 支持粘贴文本
- **Status:** pending

### Phase 4: 结果展示组件
**产出**：三段式结果展示的各个面板组件
- [ ] Task 9: 原文展示组件 — OriginalText
  - **文件**：src/components/OriginalText.tsx
  - **验收**：渲染英文原文，考研词汇红色下划线，hover 显示释义 tooltip
- [ ] Task 10: 译文展示组件 — TranslationView
  - **文件**：src/components/TranslationView.tsx
  - **验收**：支持逐句对照/整段译文两种模式切换
- [ ] Task 11: 词汇面板组件 — VocabPanel
  - **文件**：src/components/VocabPanel.tsx
  - **验收**：grid 布局列出所有考研词汇+释义，可折叠/展开
- **Status:** pending

### Phase 5: 页面 + 应用入口
**产出**：完整可用的两个页面 + App 路由
- [ ] Task 12: 上传页 — UploadPage
  - **文件**：src/pages/UploadPage.tsx
  - **验收**：三步引导UI，集成 ImageUploader + TextPaster，点击后进入 OCR→翻译流程，跳转到结果页
- [ ] Task 13: 结果页 — ResultPage
  - **文件**：src/pages/ResultPage.tsx
  - **验收**：集成 OriginalText + TranslationView + VocabPanel，三段式布局，可返回上传页
- [ ] Task 14: App 入口 — App.tsx + main.tsx
  - **文件**：src/App.tsx, src/main.tsx
  - **验收**：页面间状态传递正常，整体流程跑通
- **Status:** pending

### Phase 6: 部署
**产出**：公网可访问的 URL
- [ ] Task 15: GitHub 仓库 + Vercel 部署
  - **验收**：`git push` → Vercel 自动部署 → 浏览器访问 HTTPS 域名 → 完整流程可用
- **Status:** pending

---

## Wave 并行计划

| Wave | Tasks | 并行性 |
|------|-------|--------|
| Wave 1 | Task 1, 2, 3 | 全部并行（不同文件） |
| Wave 2 | Task 4, 5, 6 | 全部并行（不同文件） |
| Wave 3 | Task 7, 8 | 全部并行（不同文件） |
| Wave 4 | Task 9, 10, 11 | 全部并行（不同文件） |
| Wave 5 | Task 12, 13 | 并行（不同文件），Task 14 串行（依赖 12,13） |
| Wave 6 | Task 15 | 串行（依赖全部） |

## Key Questions
1. 翻译 API 用哪个？Microsoft Translator 免费层是否需要信用卡？
2. Tesseract.js 在手机浏览器上的性能如何？
3. 词汇表 lemma 化做到什么程度（复数、过去式、比较级）？

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| React + Vite + Tailwind | 生态成熟，Vercel 原生适配 |
| Tesseract.js 浏览器端 OCR | 零成本，图片不上传保护隐私 |
| 翻译 API 代理到 Vercel Function | 保护 API Key，统一请求入口 |
| 三段式结果布局 | 信息层次清晰，适合精读 |
| 学术暖调配色 | 舒适耐看，适合长时间阅读 |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
|       |         |            |

## Notes
- 所有文件在 C:\Users\33583\Desktop\英语阅读 下
- 无需 git init（设计文档已在此目录），实现时按需初始化
- 依赖设计文档：docs/superpowers/specs/2026-07-04-kaoyan-english-reader-design.md
