# Fuji Konbini · Guided Demo / 交互演示

by MariaMaizi

这是用于快速体验的静态演示，与仓库 `web/` + `server/` 的真实模型 Agent 分开。8个预设场景支持中日英；晴天野餐有三轮连续追问：用餐时间与活动 → 水果及冷藏条件 → 替换酸奶并解释营养取舍。保留商品卡、Find/A*、Add/Basket。没有实时模型调用、长期记忆或自动推荐排序。

The static guided demo is separate from the live-model application. Eight prepared scenarios support Chinese, Japanese and English; the picnic flow demonstrates meal timing, cold-storage needs and a fruit-to-yogurt trade-off. Cards, Find/A* and Basket stay interactive. No live model calls, persistent memory or recommendation ranking.

## Run locally / 本地运行

```sh
npm run build:demo
python -m http.server 8021 --bind 127.0.0.1 --directory dist
```

Open http://127.0.0.1:8021/ . The second command requires Python; any static HTTP server can serve `dist/`. Do not open index.html as a file URL. No API keys are needed. `npm start` runs the separate original application on port8011.

`build:demo` copies `web/` to ignored `dist/` and applies `demo/overrides/`. It reuses existing unmodified GLBs instead of duplicating deployment texture optimizations and file chunks. `demo/manifest.json` records overlay hashes and provenance; hosting-specific source identity is not included.

## Video / 视频

[113-second picnic walkthrough](overrides/demo/fuji-konbini-picnic-demo.mp4), bilingual captions, Bossa Antigua music, continuous by MariaMaizi watermark and seekable MP4. [Transcript](overrides/demo/picnic-session.json). This records actual prepared webpage interactions, not a live model conversation. The player has native controls plus a seek bar and no chapter shortcuts.

## Data boundary / 数据边界

The four food records are project_virtual values per purchase unit. Code totals 182 kcal/5 g protein → 266/6 with fruit → 298/10 with yogurt, with a +32 kcal/+4 g swap delta. These are comparisons of simulated project choices, not verified package numbers, personal calorie requirements, satiety guarantees or allergy advice. Example11:30/14:30 times are explicit scenario inputs, not automatic schedule tracking.

General storage guidance: [FDA](https://www.fda.gov/food/buy-store-serve-safe-food/handling-food-safely-while-eating-outdoors). Dairy background: [USDA MyPlate](https://www.myplate.gov/web/eat-healthy/dairy). These sources do not validate product-specific simulated values.

## Credits / 署名

Experience by MariaMaizi. Music: Bossa Antigua by Kevin MacLeod, incompetech.com, [CC BY4.0](https://creativecommons.org/licenses/by/4.0/); video excerpt edited for level and fades. Background playback respects browser autoplay restrictions and an explicit off choice.
