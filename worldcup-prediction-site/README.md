# 世界杯专题预测移动端网站

这是一个可构建的移动端专题网站，用于展示世界杯比赛预测内容。原始 Markdown 素材保持只读，网站通过脚本导入内容并生成 `data/content.js`，再构建到 `dist/` 发布。

## 内容导入

```powershell
python .\scripts\import_content.py
```

默认读取：

`C:\Users\86188\Desktop\世界杯\2028世界杯\2026世界杯专题预测`

## 本地预览

```powershell
npm run dev
```

然后访问：

`http://127.0.0.1:5174`

如果本机还没有安装 Node.js，可以在当前 Codex 环境里使用：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1
```

## 构建

```powershell
npm run build
```

构建结果会输出到：

`dist`

如果本机还没有安装 Node.js，可以在当前 Codex 环境里使用：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build.ps1
```

## 预览构建结果

```powershell
npm run preview
```

然后访问：

`http://127.0.0.1:4173`

## 发布

这个项目不依赖数据库。推荐部署到 GitHub Pages，推送代码后自动发布，不需要手工上传 zip。

构建命令：

```powershell
npm run build
```

输出目录：

```text
dist
```

## GitHub Pages 自动发布

仓库根目录已经包含 GitHub Actions 工作流：

`../.github/workflows/deploy-github-pages.yml`

第一次发布时，在 GitHub 仓库的 `Settings -> Pages` 中把 `Source` 设置为 `GitHub Actions`。  
之后每次推送代码，GitHub 会自动运行 `npm run build` 并发布 `dist`。

详细步骤见：

`GITHUB_PAGES.md`
