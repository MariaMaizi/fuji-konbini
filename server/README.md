# Local clerk server

Run `npm start` from the repository root with Node.js 22 or newer. `PORT` defaults to 8011. The server binds to 127.0.0.1 and serves only `web/`.

For the current configuration, copy `.env.example` to `.env.bailian` in this directory. Fill `DASHSCOPE_API_KEY` privately. Keep `CLERK_PROVIDER=bailian`, `BAILIAN_MODEL=qwen3.6-plus` and `CLERK_REPLY_MODE=direct` to reproduce the current selected mode. Restart after changing mode. The blank `BAILIAN_FALLBACK_MODEL` leaves fallback switching disabled.

The environment takes precedence over values in the local file. File selection prefers `.env.bailian`, then `.env.zhipu`, then `.env`. The older OpenAI and Zhipu adapters remain in the source, but are not selected by the example configuration. Do not copy private credential files into `web/`.

`GET /api/clerk/status` reports configuration status. `POST /api/clerk` handles model requests; avoid using it in setup checks because it can consume provider quota. A blank-key installation supports scene exploration and browsing while reporting conversation as unconfigured.

`npm test` runs mock/offline tests. Direct mode presents model prose without the experimental structured planner's semantic filtering. See `../docs/project-status.md` for limitations.
