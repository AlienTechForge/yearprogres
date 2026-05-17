# Docker 基本命令

本文檔包含年進度條專案的基本 Docker 命令。

## 構建 Docker 映像

```bash
# 在專案根目錄中構建映像
docker build -t yearprogress:latest .
```

## 登入 GHCR

```bash
# 使用 GitHub 帳號與具備 write:packages 權限的 token 登入
echo "$GHCR_TOKEN" | docker login ghcr.io -u Alien7666 --password-stdin
```

## 標記映像為 GHCR 格式

```bash
# 將本地映像標記為 GHCR 格式
docker tag yearprogress:latest ghcr.io/alientechforge/yearprogres:latest
```

## 上傳映像到 GHCR

```bash
# 推送標記的映像到 GHCR
docker push ghcr.io/alientechforge/yearprogres:latest
```

## 從 GHCR 拉取映像

```bash
# 拉取映像從 GHCR
docker pull ghcr.io/alientechforge/yearprogres:latest
```

## 使用Docker網路連接容器（推薦使用）

如果您的MySQL也是在Docker容器中運行，最好的方法是創建一個共用的Docker網路，來連接資料庫和應用程式。

```bash
# 1. 創建一個名為 MySql 的網路
docker network create MySql

# 2. 如果您的MySQL容器已存在，將它連接到新網路（假設容器名為 mysql）
docker network connect MySql mysql

# 3. 啟動應用程式容器，使用相同的網路並指定資料庫主機為容器名稱
docker run -d \
  -p 4001:3000 \
  --env-file .env.production.local \
  -e DB_HOST="mysql" \
  -e DB_PORT="3306" \
  --network=MySql \
  --restart=unless-stopped \
  --name yp-app \
  ghcr.io/alientechforge/yearprogres:latest
```

這種方法的優勢：

1. 可以將MySQL容器的端口只暴露給內部網路，提高安全性
2. 可以直接使用容器名稱進行連接，像在同一台機器上一樣
3. 適用不同的網路拓撲
4. 如果您的應用需要暴露特定的端口，仍然可以使用 -p 參數

需要注意的是，您需要確保 `.env.production.local` 內的 `DB_USER`、`DB_PASSWORD`
和 `DB_NAME` 與 MySQL 容器一致。不要把真實密碼寫進 repo。
