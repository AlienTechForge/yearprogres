FROM node:24-alpine AS base

# 安裝依賴
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# 構建應用
FROM base AS builder
WORKDIR /app
ARG NEXT_PUBLIC_URL=https://yearprogres.azndev.com
ENV NEXT_PUBLIC_URL=$NEXT_PUBLIC_URL
ENV DB_HOST=mysql
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 生產環境
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ARG NEXT_PUBLIC_URL=https://yearprogres.azndev.com
ENV NEXT_PUBLIC_URL=$NEXT_PUBLIC_URL
ENV DB_HOST=mysql
ENV DB_PORT=3306

# 創建非root用戶
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

# 複製必要文件
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((res) => process.exit(res.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
