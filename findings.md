# Findings — 考研英语阅读辅助翻译工具

## 考研词汇表来源

### 待调研
- [ ] 寻找公开可用的考研英语大纲词汇表（JSON 格式或可转换格式）
- [ ] 确认词表完整度（目标 ~5500 词）
- [ ] 确认词汇释义格式（词性+中文释义）

### 备选方案
1. GitHub 搜索 "kaoyan vocabulary json" 或 "考研词汇"
2. 网上公开的 Anki 考研词库（可导出转换）
3. 手动整理（最后手段）

---

## 翻译 API 选型

### Microsoft Translator
- 免费额度：2M 字符/月
- 需要 Azure 账号（可能需要信用卡验证）
- 稳定可靠

### Google Translate (非官方)
- npm: `@vitalets/google-translate-api`
- 完全免费，无需注册
- 可能不稳定，有频率限制

### 结论
优先尝试 Google Translate 非官方接口（零门槛），如不稳定则改用 Microsoft Translator。

---

## Tesseract.js

### 已知信息
- v5 支持 Web Worker，不阻塞主线程
- 英文识别精度高（eng.traineddata ~12MB）
- 首次加载需下载语言包（CDN 或本地托管）
- 手机端可能较慢（取决于图片大小和 CPU）

### 优化方向
- 语言包放在 public/ 目录随应用部署，避免 CDN 延迟
- 限制输入图片尺寸（前端缩放至 2000px 宽以内）

---

## Vercel 部署

### 免费额度
- 带宽：100 GB/月
- Serverless Function：100K 次调用/月
- 构建：6000 分钟/月

### 配置
- `vercel.json` 配置 `functions.api/translate` 的 runtime 为 `nodejs20.x`
- 环境变量在 Vercel Dashboard 设置
