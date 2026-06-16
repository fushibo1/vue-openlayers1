# Netlify 自动发布

这个项目已经配置 Netlify 自动发布。

## 第一次设置

1. 打开 Netlify。
2. 选择 `Add new site -> Import an existing project`。
3. 选择 GitHub，并选择仓库：

```text
fushibo1/vue-openlayers1
```

4. Netlify 会读取仓库根目录的 `netlify.toml`。
5. 确认构建配置：

```text
Base directory: worldcup-prediction-site
Build command: npm run build
Publish directory: worldcup-prediction-site/dist
Node version: 22
```

6. 点击部署。

部署成功后会得到一个：

```text
https://xxxx.netlify.app
```

## 以后更新

以后不需要手工上传文件。

1. 更新 Markdown 素材。
2. 本地运行：

```powershell
python .\scripts\import_content.py
```

3. 提交并推送到 GitHub。
4. Netlify 自动重新构建并发布。

## 注意

Netlify 服务器不能读取你电脑桌面上的原始 Markdown 文件。  
所以每次更新素材后，要先在本地运行导入脚本，把新内容写入 `data/content.js`，再推送。
