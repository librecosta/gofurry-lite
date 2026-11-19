# GoFurry Lite — Maintenance

This branch temporarily serves the **original** GoFurry outage/maintenance HTML from [gofurry-nav-site](https://github.com/gofurry/gofurry-nav-site/blob/main/ops/nginx/static/unavailable/index.html).

- `public/index.html`: unchanged original maintenance page; self-contained HTML, styles and SVG.
- `src/index.js`: Cloudflare Worker that returns **503 Service Unavailable** and `Retry-After: 3600` for all pages (except `/healthz`), without redirecting or falsely serving 200.
- `wrangler.jsonc`: Worker + static assets configuration.

## Deployment

Connect [librecosta/gofurry-lite](https://github.com/librecosta/gofurry-lite) to **Workers Builds**. Set **Production branch = maintenance**, **Build command = (none)**, **Deploy command = npx wrangler deploy**. Publish to a preview URL first, then connect `go-furry.com` and `www.go-furry.com` as Worker domains (or matching Workers routes).

When `main` is ready, change the production branch to `main` and deploy. The `maintenance` branch remains available for incident rollback.

## Build trigger

Production deployments are triggered by new commits on the `maintenance` branch. A failed initial build of the GitHub default `main` branch must not be retried; it would attempt to deploy a branch with no Worker source files. After a successful maintenance build, attach the two custom domains and validate `503` plus `Retry-After` on both.
