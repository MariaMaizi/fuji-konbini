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

## 仓库正式上传后的日常流程

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

目前这一份是待审阅副本。原网页工程仍是当前工作来源；在完成首次上传并明确迁移前，不要同时在两个目录各自修改。之后如果继续在旧工程修改，需要先同步实际变更到仓库，再检查、提交。

## 怎样出现在 GitHub 贡献图

每天真实完成一小项改进，再提交并推送即可。单纯在电脑保存、运行网页或打开 GitHub 不等于 Git 提交。提交作者邮箱需要关联自己的 GitHub 账号；提交需进入仓库默认分支（或符合规则的 `gh-pages` 分支）。不要为了格子制造空改动或倒填历史日期。

私有仓库也可显示匿名贡献数量：在个人页的 Contribution settings 中开启显示私有贡献；这不会公开私有仓库内容。贡献图可能需要一段时间更新。

官方说明：[贡献计算规则](https://docs.github.com/en/account-and-profile/reference/profile-contributions-reference)、[私有贡献显示](https://docs.github.com/en/account-and-profile/concepts/contributions-on-your-profile)、[缺失贡献排查](https://docs.github.com/en/account-and-profile/how-tos/contribution-settings/troubleshooting-missing-contributions)。
