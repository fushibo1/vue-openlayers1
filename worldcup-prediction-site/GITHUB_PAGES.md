# GitHub Pages 自动发布

这个项目已经配置 GitHub Actions 自动发布。

## 第一次设置

1. 在 GitHub 新建一个仓库。
2. 把本地项目推送到这个仓库。
3. 打开仓库 `Settings -> Pages`。
4. `Source` 选择 `GitHub Actions`。
5. 等待 `Actions` 里的 `Deploy World Cup Prediction Site` 跑完。

发布成功后，GitHub 会给出一个地址，通常是：

```text
https://你的用户名.github.io/仓库名/
```

## 以后更新内容

1. 更新原始 Markdown 素材。
2. 本地运行：

```powershell
python .\scripts\import_content.py
powershell -ExecutionPolicy Bypass -File .\scripts\build.ps1
```

3. 提交并推送到 GitHub。
4. GitHub Pages 自动重新发布。

## 注意

线上构建不会读取你桌面的原始 Markdown 文件，因为 GitHub 服务器访问不到你的电脑。  
所以每次更新 Markdown 后，必须先在本地运行 `import_content.py`，把最新内容生成到 `data/content.js`，再推送。
