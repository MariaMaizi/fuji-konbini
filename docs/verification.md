# Snapshot verification — 2026-10-11

Verified locally with Node.js 24.19.0 on Windows after changing the distribution paths from `outputs/fuji-711-diorama` to `web/`.

| Check | Result |
| --- | --- |
| Existing backend tests plus two browser-code regression scripts | 203 passed, 0 failed |
| Unique catalog entries and normalized names present in bundled GLBs | 603 / 603 |
| Catalog images and page/model/data dependencies | All referenced files present |
| GLB external buffer/image dependencies | None; resources embedded |
| Static files requested through the packaged HTTP server | 352 / 352 returned HTTP 200 |
| Root page | HTTP 200 |
| Four private/server URL checks | HTTP 404 |
| Server status with blank credentials | Unconfigured, direct mode |
| External model calls in this packaging verification | 0 |
| Matches for known local provider keys or common credential patterns | 0 |

The HTTP checks ran on a temporary ephemeral port and the test server was closed afterward. The original working application was not restarted or reconfigured. The source-copy audit verified copied runtime data and assets against the original files; only server-relative paths and the stale catalog image-count assertion were adapted.

Gallery addition: 30 of 30 product reference originals were visually selected from modeling reference folders, opened successfully, and matched their copied SHA-256 checksums. Category gallery links and image links were checked locally. This addition did not change runtime files or rerun model calls.

No new browser visual acceptance or real-model response evaluation was performed during packaging. Existing screenshots are labeled as current project captures; test success is not a claim that the conversational model is always accurate.

Upload preparation included the latest 48 Instant Meals images and the current single-column clerk-card layout. The final synchronized snapshot passed 203 offline tests, static checks, source-drift checks and credential scanning before commit. No live model calls were made.
