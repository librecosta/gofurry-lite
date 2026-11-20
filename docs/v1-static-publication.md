
# GoFurry Lite V1 静态发布

Next.js App Router 在构建时枚举中英文页面并生成完整 HTML、canonical、hreflang、Open Graph、Twitter Card 和 Sitemap。静态路由层读取 `out/` 中的明确文件映射，执行历史重定向和状态码兼容。

## 封板快照

| 内容 | 完整目录 | 默认 SFW |
| --- | ---: | ---: |
| 未软删站点 | 225 | 197 |
| 游戏 | 261 | 203 |
| 历史站点分组 | 12 | 12 |
| 游戏合集 | 16 | 16 |
| 有效合集成员关系 | 524 | 按有效分级过滤 |
| 历史公开更新日志 | 31 | 31 |
| 游戏标签定义 | 214 | 按当前目录标签筛选 |

公开范围、分级、分类和外链分别由 `content/curation/` 中的文件控制。140 条 L1-C2-C 主分类保留，其余 85 条来自 L1-C2-A／B 的建议或本轮维护者裁决。补充分类保持空数组。原始网站分级和游戏成人标签保留在目录源文件，`content-ratings.json` 定义本轮十条显式分级裁决。五条覆写为 SFW 的游戏保留旧标签证据，公开展示和搜索采用覆写后的分级。

合集成员取人工成员与有效标签规则的并集，再减去排除项。更新日志保留在封板时已经发布且未软删的正文、摘要、版本和日期。无时区时间用上海时间解释。Markdown 由组件渲染，内嵌原始 HTML 跳过。

## 两种展示模式

SFW 模式的目录、相关条目和搜索索引在构建时单独生成。Header 保存当前浏览器的展示偏好，启用 NSFW 后加载扩展目录和索引。成人历史详情保留原 URL，默认展示模式提示，返回 200 和 `noindex`，并从 Sitemap 排除。展示偏好独立于语言和主题，只控制界面展示。独立详情数据是可访问的静态资源。

外链恢复以封板生效的主目标与其域名归属为基础，同时核对精简包和当前 HTTPS 证据。经额外确认的现行地址及依据记录在 `site-link-review.json`。不能确认的站点仍保留详情。游戏商店入口取自封板 Steam AppID，封面和截图采用封板已存在的 Steam CDN 资源。恢复 202 个去重站点 Logo，为 206 个站点提供实际图片，其余使用统一回退。

## 路由

英语使用根目录 `/`，简体中文使用 `/zh`。两种语言都提供 `/categories/:code`、`/site-groups`、`/site-groups/:id`、`/site/:id`、`/games`、`/games/:id`、`/games/collections`、`/games/collections/:code`、`/updates`、`/updates/:id`、`/about`、`/privacy` 和 `/terms`。这些路径在中文版统一带有 `/zh` 前缀。

旧英文入口 `/en` 和 `/en/*` 返回 301 到对应的无前缀路径，保留查询字符串。已知的历史入口和带历史域名后缀的站点路由返回 301，保留语言和查询字符串。已退休路径、22 条明确软删站点和游戏 355 在规范路径返回 410。未知 ID 在规范路径返回 404。www 与尾斜杠的有效站点路由收敛到 canonical。

## 重建封板快照

准备两个原始压缩包、Python 3.10+、Node.js 24 和 Docker。路径指向本地已有备份。

```sh
python scripts/extract-legacy.py <full-backup.tar.zst> <bootstrap-v2.tar.zst>
python scripts/import-legacy.py .local/v1
pnpm build
```

提取器校验压缩包和数据库成员摘要，通过隔离的 `pg_restore` 只读提取所需 COPY 表。临时数据落在 Git 忽略的 `.local/v1/`。正式构建仅使用已整理的目录快照与裁决配置。
