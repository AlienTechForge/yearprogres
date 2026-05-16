# Year Progress（年度進度）

一個簡單直觀的網頁應用程式，用於顯示當年已經過去的時間百分比及剩餘時間，並可建立自訂進度條追蹤特定事件倒數。

![截圖](countdown.gif)

## 功能列表

- **年度進度百分比顯示**：以進度條顯示當年過去的百分比
- **即時倒數計時器**：顯示本年度剩餘的月、日、時、分、秒
- **自定義進度條**：建立專屬的進度條來追蹤個人事件或期限
- **可分享連結**：生成可分享的永久連結，方便分享自定義進度條
- **自動時區調整**：根據用戶的瀏覽器時區自動計算正確的時間
- **新年倒數**：當年末倒數到10秒內時顯示倒數計時
- **煙火效果**：當倒數計時結束時會自動顯示煙火慶祝動畫
- **回應式設計**：適用於各種螢幕尺寸的裝置

## 技術架構

- Next.js：React框架
- TypeScript：開發語言
- Luxon：時間處理函式庫
- Tailwind CSS：樣式設計
- MySQL：資料庫儲存自定義進度條
- Docker：容器化部署

## 本地開發

```bash
# 安裝相依套件
npm install

# 建立本機環境變數
cp .env.example .env.local

# 啟動開發環境
npm run dev

# 建立生產版本
npm run build

# 啟動生產版本
npm start
```

## Docker 部署

```bash
# 建立 Docker 映像
docker build -t yearprogress:latest .

# 執行容器（需要 MySQL 資料庫）
docker run -d \
  -p 4001:3000 \
  -e DB_HOST="mysql" \
  -e DB_PORT="3306" \
  -e DB_USER="YourUser" \
  -e DB_PASSWORD="YourPassword" \
  -e DB_NAME="YourDatabase" \
  --network=MySql \
  --name yp-app ghcr.io/alientechforge/yearprogres:latest
```

詳細的部署指南可參考 `docker_commands.md` 文件。

## CI/CD

GitHub Actions workflow 位於 `.github/workflows/ci-cd.yml`，會在 PR 執行 lint、type-check、build，`master` 分支推送時建立 GHCR 映像。若部署設定齊全，workflow 會接著透過 SSH 部署；若部署設定缺少必要值，會跳過部署但保留已推送的 GHCR 映像。

映像位置：

```text
ghcr.io/alientechforge/yearprogres:latest
ghcr.io/alientechforge/yearprogres:<commit-sha>
```

需要設定的 GitHub Secrets：

- `DEPLOY_HOST`
- `DEPLOY_PORT`（未設定時使用 22）
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`

`DEPLOY_HOST`、`DEPLOY_PORT`、`DEPLOY_USER`、`DB_USER`、`DB_NAME` 可放在 org variables 或 secrets；`DEPLOY_SSH_KEY` 和 `DB_PASSWORD` 必須放在 secrets。推送與部署拉取 GHCR image 都使用 GitHub Actions 內建的 `GITHUB_TOKEN`，不需要 Docker Hub secrets，也不需要額外 GHCR token。部署容器會使用 `DB_HOST=mysql`；本機 `.env.example` 預設使用 `DB_HOST=192.168.0.10`。

## 線上版本

可以透過以下網址訪問線上版本：[https://yearprogres.azndev.com](https://yearprogres.azndev.com)
