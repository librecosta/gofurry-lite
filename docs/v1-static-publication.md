# GoFurry Lite V1 静态发布

Next.js App Router 在构建时枚举中英文页面，生成完整 HTML、canonical、hreflang、Open Graph 和 Sitemap。Cloudflare Worker 从 `out/` 服务这些文件，在路由层执行历史兼容。站内检索使用四个静态索引，正文、列表和语言链接也可在禁用 JavaScript 时使用。

## 数据采取范围

| 同一封板快照 | 源记录 | 初始公开 |
| --- | ---: | ---: |
| 未软删站点 | 225 | 192 |
| 游戏 | 261 | 198 |
| 历史站点分组 | 12 | 12 |
| 游戏合集 | 16 | 16 |
| 历史公开更新日志 | 31 | 31 |
| 游戏标签定义 | 214 | 214 |
| 不重复的 WebP Logo | 218 | 173 |

`content/curation/publication.json` 是 V1 的独立公开范围。它按封板记录中的旧可见性生成。28 个旧成人站点、5 个分级冲突站点和 63 个带旧 adult 标签的游戏仅保留在本地源材料。游戏其他 198 条沿用旧普通目录的可见范围。受限条目缺少公开资格，Worker 返回 404，构建不生成对应详情、默认搜索记录或 Sitemap 项。旧站点的 22 条软删有独立证据，返回 410。未知 ID 返回 404。

140 个已批准主分类继续来自 L1-C2-C。没有新分类的旧普通站点仍能经搜索、历史分组或直达链接访问。站点候选外链没有明确的独立核准记录，初次导出保留空地址。游戏商店入口依据封板 Steam AppID 生成。封面和最多六张截图采用封板时已确认存在的 Steam CDN 资源。站点 Logo 缺失和媒体失败均使用本地回退。

合集采用旧站的人工成员与有效标签规则的并集，再减去排除项。导入在本地保存完整计算结果，公开快照只保留符合资格的成员。更新日志保留封板前、已发布且未软删的正文、摘要、版本和日期，旧库的无时区时间按上海时间解释。Markdown 经组件渲染，原始 HTML 和外链图片不会执行或嵌入。

## 路由

中文根目录为 `/`，英语为 `/en`。两种语言都提供 `/categories/:code`、`/site-groups`、`/site-groups/:id`、`/site/:id`、`/games`、`/games/:id`、`/games/collections`、`/games/collections/:code`、`/updates`、`/updates/:id`、`/about`、`/privacy` 和 `/terms`。

`/home`、`/nav`、`/sites`、`/sites/:id`、`/site/:id/:domain` 和 `/games/search` 只在目标属于公开路由时返回 301，保留语言和查询字符串。已退休的生态分析、抽奖及旧个人介绍路径返回 410。正常路由只通过资产绑定读取明确的 HTML 文件。www 上的等价路由指向裸域，尾斜杠收敛到页面 canonical。

## 重建封板快照

准备两个原始压缩包、Python 3.10+、Node.js 24 和 Docker，运行以下命令。路径指向本地已有备份。

```sh
python scripts/extract-legacy.py <full-backup.tar.zst> <bootstrap-v2.tar.zst>
python scripts/import-legacy.py .local/v1
pnpm build
```

提取器校验压缩包和参与导入的数据库成员，只为选定表导出 COPY 数据。PostgreSQL 镜像执行 `pg_restore` 工具时禁用网络并只读挂载。临时数据落在被 Git 忽略的 `.local/v1/`。正式构建不依赖备份文件、数据库或 Docker。

## Cloudflare 交接

`wrangler.jsonc` 的资产目录为 `out/`，Worker 名称为 `gofurry-lite`。本次交付推送 `dev`。上线仍由维护者确认，生产分支、路由、自定义域名与 DNS 维持现有配置。
