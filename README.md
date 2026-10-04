# Renaiss Market v2

比较 Renaiss 当前挂牌价与 Renaiss Index API 的 `priceUsdCents`，展示套利空间和 Index `confidence`。

## 价格定义

- Renaiss 挂牌价：`api.renaiss.xyz/v0/marketplace` 的 `askPriceInUSDT`，除以 `1e18`。
- Index 参考价：`api.renaissos.com/v1/graded/{cert}` 的 `priceUsdCents`，除以 `100`。
- 价差：`priceUsdCents / 100 - askPriceInUSDT`。
- ROI：价差除以挂牌价。

## 环境变量

服务端设置，不能提交到 Git：

```env
BACKEND_PORT=3001
SURF_API_KEY=
RENAISSOS_API_KEY=
RENAISSOS_API_SECRET=
```

API Secret 只存在于后端，前端不会获取或发送该字段。

## 运行

```bash
cd backend && bun install && bun run dev
cd frontend && bun install && bun run dev
```

SDK 会自动加载 `backend/routes/*.js` 为 `/api/{name}`：

- `GET /api/market/stats`
- `GET /api/market/collectibles`
- `GET /api/market/collectibles/:tokenId`
- `GET /api/market/sync-status`
- `GET /api/sync/status`
- `POST /api/sync`（需要 `Authorization: Bearer $SYNC_ADMIN_TOKEN`；未配置时关闭）

## 每日同步

根目录 `cron.json` 配置每日 UTC 03:00 运行 `cron/daily-sync.js`。同步具备分页、请求间隔、429/5xx 退避、同步锁、单卡失败隔离和 `sync_runs` 记录。同步只有在 Marketplace 分页完整结束时才会把本次快照之外的旧卡标记为 `unlisted`，避免接口故障或数量上限导致误下架。

手动同步接口默认关闭；如确实需要临时触发，在服务端设置 `SYNC_ADMIN_TOKEN`，然后使用：

```bash
curl -X POST https://your-domain/api/sync \\
  -H "Authorization: Bearer $SYNC_ADMIN_TOKEN"
```

如果证书号可用，优先调用 `/v1/graded/{cert}`；否则回退到 `/v1/search`，并要求卡号匹配后才写入 Index 价格。

## 安全

不要提交 API Key、API Secret、SSH 私钥或 `.env`。此前公开过的凭据应立即撤销并重新生成。
