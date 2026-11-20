# GoFurry Lite

旧 GoFurry 网站导航、兽游资料和更新日志的双语静态站。

## 本地运行

需要 Node.js 24 和 pnpm 12.8.1。构建直接读取仓库中的公开快照。

```sh
pnpm install --frozen-lockfile
pnpm dev
```

使用 Cloudflare 本地运行时检查静态站和历史 HTTP 状态。

```sh
pnpm build
pnpm preview
```

通过 [本地 Worker](http://127.0.0.1:8787) 浏览。前端开发服务器默认使用 3000 端口。HTTP 历史兼容行为由 8787 上的 Worker 提供。

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm exec playwright install chromium
pnpm test:browser
pnpm check:worker
```

Windows 已安装 Microsoft Edge 时可用 `PLAYWRIGHT_CHANNEL=msedge` 指定浏览器。运行浏览器测试前先完成构建，并释放 8787 端口。

- [静态发布与迁移](docs/v1-static-publication.md)
- [主分类批准范围](docs/l1-c2-c-classification-approval.md)
- [历史来源与许可](docs/third-party-notices.md)
