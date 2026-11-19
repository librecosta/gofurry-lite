# GoFurry Lite — Maintenance

This branch serves the [original GoFurry maintenance page](https://github.com/gofurry/gofurry-nav-site/blob/main/ops/nginx/static/unavailable/index.html) through the existing `gofurry-lite` Worker.

## Local development

Run `pnpm install --frozen-lockfile` to install the pinned dependencies.

| Command | Behavior |
| --- | --- |
| `pnpm dev` | Start Vite with React hot reload. |
| `pnpm build` | Type-check, build the client, and pre-render the React page to `dist/index.html`. |
| `pnpm preview` | Serve the build through the local Worker to verify production routing and headers. Run the build first. |

Wrangler bundles the pre-rendered HTML into the Worker. The asset manifest excludes `index.html`, so every document request, including a direct request to `/index.html`, receives an HTML `503` with `Retry-After: 3600` and `Cache-Control: no-store`. JavaScript, CSS, and the original SVG (also used as the favicon) are served as Static Assets. `/healthz` returns `200`.

## Workers Builds

The existing GitHub integration deploys pushes to `maintenance` with these settings.

| Setting | Value |
| --- | --- |
| Production branch | `maintenance` |
| Build command | `pnpm run build` |
| Deploy command | `npx wrangler deploy` |
| Root directory | `/` |

After deployment, verify the maintenance page and headers on `go-furry.com` and via the existing `www.go-furry.com` redirect. Test a deep URL, a built asset, and `/healthz` as well as the home page.
