# 紫微斗数 · 开源排盘引擎

基于**倪海夏《天纪》**教学体系的紫微斗数排盘系统，包含完整排盘算法、四化系统、格局知识库、古籍原文数据、OpenAI 兼容 AI 解读接口，以及 **51.8 万条命盘样本数据**。

线上体验：[wdyziweidoushu666.com](https://wdyziweidoushu666.com)

---

## 51.8 万命盘样本数据

> **下载位置：本仓库右侧 [Releases](https://github.com/Renhuai123/ziwei-doushu/releases/tag/v3.0-samples) 页面**

我们开源了一套完整的紫微斗数命盘样本数据集，覆盖 **51.8 万种排盘组合**（年 60 × 月 12 × 日 30 × 时 12 × 性别 2），每条样本包含完整的命盘结构和基于倪海夏体系的解读文本。

### 数据规格

| 项目 | 说明 |
|------|------|
| 样本数量 | **518,400 条** |
| 总大小 | 5.5 GB（分 3 卷压缩） |
| 体系 | 倪海夏《天纪》正统（纯飞星派已下线） |
| 内容 | 命盘 JSON + 13 主题解读文本（命格总览、财运、事业、感情、健康等） |
| 验证 | 男女命差异化 100%、健康含子午流注 100%、女命含妇科保养 100% |
| 口径 | 与线上 [wdyziweidoushu666.com](https://wdyziweidoushu666.com) 完全一致 |

### 下载方式

前往 [Releases](https://github.com/Renhuai123/ziwei-doushu/releases/tag/v3.0-samples) 下载以下文件：

```
ziwei-samples-v3-part1.zip.001  (1.9 GB)
ziwei-samples-v3-part2.zip.002  (1.9 GB)
ziwei-samples-v3-part3.zip.003  (1.8 GB)
SHA256SUMS.txt                  (校验文件)
```

下载后合并解压：

```bash
# macOS / Linux
cat ziwei-samples-v3-part*.zip.* > combined.zip
unzip combined.zip

# Windows (PowerShell)
Get-Content ziwei-samples-v3-part*.zip.* -Encoding Byte -ReadCount 0 | Set-Content combined.zip -Encoding Byte
Expand-Archive combined.zip
```

### 用途

- 微调小模型的训练语料（51.8 万 input-output 配对）
- AI 对话的 RAG 检索源
- 修改 `patterns.ts` 后做 A/B 基线对比
- 紫微斗数研究与数据分析

---

## 开源内容

### 排盘算法（`lib/ziwei/`）

| 文件 | 说明 |
|------|------|
| `algorithm.ts` | 完整排盘流程：安命宫、定五行局、安十四主星、安辅星、排大限流年 |
| `constants.ts` | 天干地支、十四主星、辅星常量 |
| `sihua.ts` | 四化飞星系统（禄权科忌），含各天干四化对照表 |
| `patterns.ts` | **1100+ 行格局知识库**：紫府同宫、日月并明、七杀朝斗等经典格局判定规则 |
| `heming-knowledge.ts` | 合盘方法论：倪师体系下双盘比对逻辑 |
| `types.ts` | TypeScript 类型定义 |
| `cities.ts` | 中国城市经纬度，用于真太阳时校正 |
| `famous.ts` | 历史名人命盘示例数据 |

### 古籍原文（`lib/classics/`）

- **骨髓赋**（`gusuifu.ts`）— 紫微斗数核心歌诀
- **紫微斗数全集**（`quanji.ts`）— 清代古本
- **紫微斗数全书**（`quanshu.ts`）— 陈希夷传本

### 前端界面（`app/` + `components/`）

完整的 Next.js 15 前端，包含：

- 排盘工作台（命盘方格、宫位详情、星曜面板）
- AI 命盘解读面板（OpenAI 兼容协议，支持流式输出、核心摘要、主题/宫位/星曜/四化焦点、深度展开和追问）
- 合盘分析页
- 古籍阅读器（全文搜索）
- 命理百科（14 主星 + 12 宫位知识页）
- 亮色/暗色主题切换
- 移动端适配

### SEO 知识图谱（`lib/seo/`）

14 主星 × 12 宫位的结构化知识数据，可用于内容生成或知识库构建。

---

## 未包含的部分

以下属于平台运营层，不在开源范围内：

- **私有运营 prompt**：线上产品使用的调教细节、运营策略和安全策略
- **私有后端 API**：`/api/heming` 等合盘深度分析与运营服务接口
- **用户系统**：登录、短信验证、会员、支付
- **服务端安全**：签名校验、防刷、水印
- **部署配置**：Vercel/Nginx/Docker/数据库

开源版保留本地排盘 API：`/api/generate`。它只负责把出生信息转换为命盘结构，便于前端排盘工作台独立运行。

开源版也提供 OpenAI 兼容的流式 AI 解读接口：`/api/interpret`。配置 `OPENAI_API_KEY`、`OPENAI_BASE_URL` 和 `OPENAI_MODEL` 后，排盘页的 AI 解读面板即可调用兼容 `/v1/chat/completions` 的模型服务。

---

## 快速开始

```bash
# 克隆
git clone https://github.com/Renhuai123/ziwei-doushu.git
cd ziwei-doushu

# 安装依赖
npm install

# 配置环境变量（仅 AI 解读需要）
cp .env.example .env.local
# 如果只使用本地排盘工作台，可以跳过 AI API Key

# 启动开发服务器
npm run dev
```

> 注意：开源版包含 `/api/generate` 本地排盘接口和 OpenAI 兼容的 `/api/interpret` 流式解读接口。未配置 AI API Key 时，排盘算法、排盘接口和前端命盘工作台仍可独立运行。

---

## 技术栈

- **框架**：Next.js 15（App Router）
- **语言**：TypeScript
- **样式**：Tailwind CSS + CSS Variables 设计系统
- **排盘**：基于 [iztro](https://github.com/SylarLong/iztro) + lunar-javascript
- **动画**：Framer Motion

---

## 项目理念

紫微斗数是中国传统命理学的瑰宝，倪海夏老师在《天纪》中系统梳理了正宗的紫微斗数体系。我们希望通过技术手段让更多人接触和学习这门学问。

开源排盘算法和知识库，是因为我们相信：**算法是公开的传统智慧，不应该被锁在围墙里**。真正的价值在于解读的深度、用户体验的打磨、以及持续运营的积累。

想自己搭？代码都在这里，拿去用。嫌麻烦？来 [wdyziweidoushu666.com](https://wdyziweidoushu666.com) 直接用。

---

## 协议

MIT License

---

## 联系

- 线上平台：[wdyziweidoushu666.com](https://wdyziweidoushu666.com)
- Issues：欢迎提 Bug 和建议
