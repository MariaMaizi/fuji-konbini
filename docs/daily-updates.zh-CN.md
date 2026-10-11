# 文件怎么放、每天怎么更新

## 文件放哪里

| 内容 | 目录 |
| --- | --- |
| 网页交互、人物、店员面板 | `web/src/` |
| 网页首页与整体样式 | `web/index.html`、`web/app.js`、`web/style.css` |
| 当前网页使用的模型 | `web/models/` |
| 已接入的商品和店员图片 | `web/assets/` |
| 商品目录、项目定价、食品资料 | `web/data/` |
| 模型接口、会话逻辑与相关测试 | `server/` |
| 产品正交／多视图原图 | `design/product-orthographics/` |
| 项目介绍、截图、过程说明 | `docs/` |
| 可运行检查 | `scripts/`、`server/*.test.cjs`、`web/tests/` |

不要每天新建“最终版2、最终版3”或把整个项目压缩后反复上传。修改同一套文件，让 Git 保存版本差异。提交说明写真实变更，例如“完善冷食商品图片”“调整店员面板间距”“更新角色设计说明”。

Blender `.blend` 原工程、旧 GLB、其余参考图总包、临时渲染、日志、缓存和 API 密钥继续在本地保存。精选的产品正交原图单独放在 `design/product-orthographics/`，已接入网页的商品标签图片仍在 `web/assets/`。需要网页使用的新模型导出为 GLB 后，替换对应文件并核对加载关系。大型模型频繁更新会使 Git 历史变大，后续可单独规划 Git LFS 或资产存储。

## GitHub 仓库与中英文说明

项目仓库：[MariaMaizi/fuji-konbini](https://github.com/MariaMaizi/fuji-konbini)，按创作者选择设为私有，默认分支为 `main`。

仓库首页显示 `README.md` 的中文介绍，顶部 English 链接进入 `README.en.md`。两种语言分别维护，修改其中一份不会自动翻译另一份。

在 GitHub 网页上修改介绍：打开对应文件 → 点击铅笔图标 → 修改内容 → Preview 检查 → Commit changes，填写本次修改说明后提交。之后在本地继续工作前，先拉取这些线上修改，避免版本分叉。

## 日常提交流程

在维护中的仓库文件夹打开终端，先查看改动，再检查、提交、推送：

```sh
git status
git diff
npm run check
npm test
git add web/src/clerk-ui.css
git commit -m "Polish clerk panel spacing"
git push
```

上面的文件名和提交说明只是示例，改什么就添加什么。模型、图片和说明文档也可以提交；仅修改文字说明时不需要重新跑全部接口测试。先不要从原始建模工作区执行 `git add .`，那里混有历史文件。

本仓库由原网页工程整理而来，使用 `web/` 作为静态目录；原工程使用 `outputs/fuji-711-diorama/`。后端相对路径已经适配，所以不要直接拿原后端文件覆盖仓库而丢失这项路径调整。

原网页工程仍保留在本地。如果继续在原工程里建模或调整网页，先把实际变更同步到仓库，再检查、提交；README 等作品介绍则以仓库版本为准。不要同时在两个目录独立修改同一个功能。GitHub 网站上的修改也需要先拉取到本地仓库，再进行后续编辑。

## 怎样出现在 GitHub 贡献图

每天真实完成一小项改进，再提交并推送即可。单纯在电脑保存、运行网页或打开 GitHub 不等于 Git 提交。提交作者邮箱需要关联自己的 GitHub 账号；提交需进入仓库默认分支（或符合规则的 `gh-pages` 分支）。不要为了格子制造空改动或倒填历史日期。

私有仓库也可显示匿名贡献数量：在个人页的 Contribution settings 中开启显示私有贡献；这不会公开私有仓库内容。贡献图可能需要一段时间更新。

官方说明：[贡献计算规则](https://docs.github.com/en/account-and-profile/reference/profile-contributions-reference)、[私有贡献显示](https://docs.github.com/en/account-and-profile/concepts/contributions-on-your-profile)、[缺失贡献排查](https://docs.github.com/en/account-and-profile/how-tos/contribution-settings/troubleshooting-missing-contributions)。
