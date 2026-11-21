# GoFurry Lite V1 SEO 收尾验收

本次验收针对 `dev` 静态产物与 Wrangler 本地预览。目录保留了 225 个站点、261 款游戏、12 个历史分组、16 个游戏合集和 31 条历史更新。

## 索引与内容

| 项目 | 验收结果 |
| --- | --- |
| 页面和 Sitemap | 1,122 个中英文业务页面。950 个可索引 URL 全部进入 Sitemap，172 个受限详情全部排除。已删除条目、重定向和错误页均排除。 |
| Metadata | 两个首页、14 个栏目页、16 个分类页使用独立文案。详情采用真实名称和档案摘要。每页有一个 H1、自引用 Canonical、双向 `en` / `zh-CN` 和英文 `x-default`。OG 与 Twitter 使用 1200×630 的现有品牌图。 |
| 结构化数据 | 两个首页输出 `WebSite`。938 个分类、普通站点和游戏详情、合集、历史分组、更新详情页输出与实际导航一致的 `BreadcrumbList`。受限详情和错误页不输出 Schema。 |
| 中文游戏正文 | 应用 44 条独立覆盖后，缺失从 44 降到 0。43 条根据已有英文资料补译，游戏 317 复用了原来存放在英文栏的中文正文。原始快照、英文原文、ID 和分级保留。43 条受限正文只进入扩展详情投影。 |
| 双语正文 | 首页长文、About、Terms、Privacy 保留并通过静态 HTML 检查。历史更新 30 保留原活动地址文字，退出的活动链接已去掉点击行为。 |
| 辅助文件 | `robots.txt` 允许抓取并声明 Sitemap。新增 `llms.txt` 和 `/.well-known/security.txt`。构建与 Worker 打包检查拒绝发布缺失或过期的安全联系文件。 |

摘要检查涵盖过短、重复、标题对应、残留 HTML 与时效措辞。根据档案补充了游戏 124，区分了 146/183、258/259、297/298 的序章与正篇，并分别标明三个 e621 搜索工具的名称及来源。ChatFurry 与 Furbox 的摘要使用明确的档案表述。站点 175、187、188、198 只有简短且可靠的原始资料，保留现有概述。受限游戏 125、130、138 的简短档案摘要继续采用原文，页面 Metadata 仍采用统一占位。

Sitemap 不输出 `lastmod`，因为当前快照缺少可核实的页面级更新时间。论坛、游戏和站点描述中的功能用语并不等同于 Lite 对第三方可用性的实时保证。新旧迁移中，过去的中文根路径现已用作英文首页，同一地址不能同时接受中文旧入口的 301。当前保留 `/zh` 中文 Canonical 与双向 hreflang，历史入口的语言迁移仍可能给原中文收录带来重新评估。查询参数不会进入 Canonical。[Google Sitemap 指南](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap) · [Google 面包屑指南](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb)

## HTTP 与回归

`pnpm typecheck`、`pnpm lint`、`pnpm test`（4 项）、`pnpm build`、`pnpm test:browser --workers=1`（Edge Chromium，42 项）和 `pnpm check:worker` 均通过。构建检查逐页比对 HTML、内部链接、Metadata、Schema、Sitemap 和默认数据投影，并扫描 5,752 个文本产物。

本地 HTTP 普查覆盖 1,122 个业务地址的 200、561 个旧英文地址的 301、46 个已删除条目的双语 410。浏览器测试同时检查历史别名、未知路径 404、查询参数、www、四个辅助文件的 GET/HEAD 与 MIME、Sitemap XML 解析，以及受限详情和模拟公网预览的 `X-Robots-Tag: noindex`。语言切换、搜索筛选、合集、首页轮换、主题、移动导航、图片与视频也通过回归。

## 性能

以 Playwright/Chromium CDP 实测本地静态预览。桌面用 1365×768，移动端模拟 Pixel 7，CPU 降速 4 倍，网络设为 150ms RTT 和 1.6 Mbit/s 下载。每个页面用冷缓存观测 10 秒。阻塞时间按首次内容绘制后每个长任务超过 50ms 的部分求和。这里的实验室阻塞时间与真实用户 INP 是不同指标。[Web Vitals](https://web.dev/articles/vitals) · [Lighthouse TBT 说明](https://developer.chrome.com/docs/lighthouse/performance/lighthouse-total-blocking-time)

| 页面 | 桌面 LCP / CLS / 阻塞时间 | 移动 LCP / CLS / 阻塞时间 |
| --- | ---: | ---: |
| `/` | 516 / 0.00 / 0 | 1604 / 0.00 / 944 |
| `/zh` | 356 / 0.00 / 0 | 1660 / 0.00 / 3796 |
| `/categories/community` | 156 / 0.00 / 0 | 1440 / 0.00 / 114 |
| `/site/105` | 176 / 0.00 / 0 | 1576 / 0.00 / 94 |
| `/games` | 996 / 0.00 / 0 | 8424 / 0.00 / 366 |
| `/games/102` | 600 / 0.00 / 0 | 2620 / 0.01 / 111 |
| `/games/collections` | 760 / 0.00 / 0 | 6120 / 0.00 / 92 |
| `/about` | 116 / 0.00 / 0 | 1400 / 0.00 / 96 |

LCP 与阻塞时间以毫秒计。全部样本 CLS ≤ 0.01，桌面 LCP 最慢 996ms。移动端三条游戏路径未达到 2.5 秒参考目标，中文首页两次观测的阻塞时间分别为 3,858ms 和 3,796ms。

已提高首张合集封面和游戏详情主图的请求优先级，降低游戏目录列表封面的优先级。随机封面与 Steam CDN 加载存在波动，本次对比未证实性能指标稳定改善。首屏前 10 秒同源 JavaScript 实收 126–230 KiB，字体请求 1–25 个。首次渲染过程有 Steam 图像请求，全部样本在未交互时均未请求 Steam 视频文件或播放清单。[Fetch Priority 指南](https://web.dev/articles/fetch-priority)

## 上线前的站点所有者操作

- 发布到规范域名后，再以公网 GET/HEAD 验证两个语言根路径、Sitemap、robots、`llms.txt`、`security.txt`、www 重定向及受限详情响应头。若启用公网预览，同步验证预览响应的 `X-Robots-Tag: noindex`。
- 使用已有或新配置的所有权令牌验证 Google Search Console、Bing Webmaster Tools、Yandex Webmaster、百度搜索资源平台，并在各平台按实际支持范围提交 Sitemap。当前验收没有站长工具验证结果。
- GitHub 仓库与反馈入口在验收时均返回 200。新 GoFurry 官方入口在本次外部请求中返回 503，保留其指定 URL，待新站可用后复核。[新 GoFurry](https://gofurry.com)
- 在 `2027-05-21T00:00:00Z` 前确认安全联系邮箱并更新 `security.txt` 有效期。[RFC 9116](https://www.rfc-editor.org/rfc/rfc9116.html)
