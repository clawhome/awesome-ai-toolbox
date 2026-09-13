[English](#contributing) | **简体中文**

# 参与贡献

感谢你愿意帮忙。本清单收录的是「值得被更多人知道」的 AI 工具，判断标准尽量简单、可执行。

## 收录标准

一个工具要进这份清单，需要同时满足：

1. **可公开访问** —— 有稳定的官网，无需邀请码或内测资格即可了解和使用
2. **确为 AI 产品** —— 核心能力由模型驱动，而不是给传统产品加了个「AI」标签
3. **仍然可用** —— 链接可访问，服务在运营
4. **有可用形态** —— 提供免费额度、试用或明确标价，而非只有「联系我们」

以下情况不予收录：

- 纯资讯站、教程站、聚合导航站（我们自己就是导航站）
- 已停止运营、官网无法访问
- 只有 App 但无法验证、或来源不明的下载渠道
- 加密货币、博彩、成人内容等与清单定位无关的品类

## 提交方式

### 方式一：提 Issue（推荐，最快）

在 [Issues](../../issues/new) 里按下面的格式提交：

```markdown
**工具名称**：xxx
**官方网站**：https://xxx.com
**一句话说明**：它做什么、跟同类比差异在哪
**所属类目**：从 [`data/categories.json`](data/categories.json) 里选一个 id
**推荐理由**：为什么值得收录
```

### 方式二：提 Pull Request

1. 直接编辑 [`data/tools.json`](data/tools.json)，按现有条目的格式追加一项：

   ```json
   {
     "slug": "tool-slug",
     "name": { "zh": "中文名", "en": "English Name" },
     "desc": { "zh": "中文描述，一到两句，客观陈述", "en": "English description, one or two sentences" },
     "category": "text",
     "url": "https://example.com/",
     "tags": ["标签一", "标签二"],
     "visits": 0
   }
   ```

2. 要求：
   - `slug` 用工具名的小写连字符形式，且**全库唯一**
   - `category` 必须是 [`data/categories.json`](data/categories.json) 中存在的 id
   - `url` 使用**干净的官方地址**，不要带 `utm_source` 等追踪参数
   - 描述以陈述事实为准，避免「最好用」「第一」这类绝对化表述
3. 不要手工改 `README.md` 与 `README.en.md` —— 这两个文件由脚本生成，改了会在下次同步时被覆盖

## 关于自动同步

`data/tools.json` 由 [`scripts/sync.mjs`](scripts/sync.mjs) 每天从站点接口同步一次，同步时会**保留已有人工翻译的英文字段**。所以通过 PR 补充的英文描述不会被自动流程冲掉。

本地手动跑一遍：

```bash
SITE=https://topxai.cn node scripts/sync.mjs        # 同步数据
node scripts/build-readme.mjs                        # 重新生成 README
```

---

## Contributing

Thanks for helping out. Every entry should be an AI tool that more people ought to know about.

### Inclusion criteria

A tool qualifies when it:

1. **Is publicly accessible** — a stable website, no invite code or closed beta required
2. **Is genuinely AI-powered** — the core capability comes from a model, not a traditional product with an "AI" sticker
3. **Still works** — links resolve and the service is live
4. **Can actually be tried** — free tier, trial, or published pricing

Not accepted: news or tutorial sites, other directories, dead services, unverifiable downloads, or categories unrelated to this list.

### How to submit

Open an [Issue](../../issues/new) with the tool name, official URL, a one-line description, the category id, and why it belongs here. Or send a Pull Request editing [`data/tools.json`](data/tools.json) directly.

Please keep `url` free of tracking parameters, keep `slug` unique and lowercase, and use a `category` that already exists in [`data/categories.json`](data/categories.json).

Do **not** edit `README.md` or `README.en.md` by hand — both are generated from `data/` and will be overwritten on the next sync.

### Automated sync

`data/tools.json` is refreshed daily from the site API by [`scripts/sync.mjs`](scripts/sync.mjs). The sync **preserves existing English fields**, so translations you contribute through a PR survive every automated run.
