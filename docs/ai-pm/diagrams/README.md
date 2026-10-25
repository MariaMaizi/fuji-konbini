# 架构图维护 / Maintaining the architecture diagrams

中英文项目首页使用仓库内的 SVG 图片，避免首页架构图依赖 Mermaid 动态渲染。本目录的 `.mmd` 文件保留同一流程的 Mermaid 版本，方便编辑或导入图表工具。

修改首页图表时，编辑 [`scripts/generate-architecture-diagrams.cjs`](../../../scripts/generate-architecture-diagrams.cjs) 中的双语文案、节点或连线，然后在仓库根目录运行：

```sh
node scripts/generate-architecture-diagrams.cjs
```

此命令同步生成两张 SVG 和两个 `.mmd` 文件，不调用模型或外部服务。检查两版文字、箭头和 README 图片链接后一起提交；仅修改 `.mmd` 不会自动更新首页图片。

The READMEs embed local SVGs. To update both images and their Mermaid sources together, edit the generator and run the command above. It uses no external packages or services and does not change the Agent runtime.
