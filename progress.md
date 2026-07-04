# Progress Log — 考研英语阅读辅助翻译工具

## Session 2026-07-04 最终状态

### 已完成
- ✅ 项目设计 + 架构规划
- ✅ React + Vite + Tailwind 搭建
- ✅ Google Lens OCR（动态 import，按需加载）
- ✅ 逐句翻译（跨行合并 + 缩写保护 + 段落检测）
- ✅ 考研词汇标注（5415 词大纲词表）
- ✅ 点击查词（中文释义 + 词性 + 常用释义）
- ✅ 三段式逐句对照 + 整段译文（段落分块）
- ✅ Lucide SVG 图标，学术暖调 UI
- ✅ 双模式 API：Vercel Function 代理 + 本地直连 fallback
- ✅ GitHub 仓库 + v1.0-stable 标签

### 待完成
- 🔲 Vercel 部署
- 🔲 OCR.space API Key 设置
- 🔲 清理不需要的组件文件（OriginalText, VocabPanel 旧版）

### 关键文件
| 文件 | 职责 |
|------|------|
| src/services/ocr.ts | OCR: Vercel(/api/ocr) → Google Lens fallback |
| src/services/translate.ts | 分句+翻译+查词 |
| api/translate.ts | Vercel Function: Google Translate 代理 |
| api/ocr.ts | Vercel Function: OCR.space 代理 |
| public/vocab.json | 考研词汇表（5415词） |

### Git
- 仓库: https://github.com/6huang6/kaoyan-reader
- 标签: v1.0-stable
