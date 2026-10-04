const express = require('express')
const { runDailySync, getSyncState, getLastSync } = require('../lib/app')
const router = express.Router()

function requireSyncToken(req, res, next) {
  const expected = process.env.SYNC_ADMIN_TOKEN
  if (!expected) return res.status(503).json({ error: 'Manual sync is disabled; use the deployment Cron' })
  const supplied = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!supplied || supplied !== expected) return res.status(401).json({ error: 'Unauthorized' })
  next()
}

router.get('/status', async (_req, res) => {
  try { res.json({ active:getSyncState(), lastRun:await getLastSync() }) } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', requireSyncToken, async (_req, res) => {
  if (getSyncState()) return res.status(409).json({ error:'A daily sync is already running', active:getSyncState() })
  try { const result = await runDailySync(); res.status(result.success ? 200 : 500).json(result) } catch (e) { res.status(500).json({ error:e.message }) }
})

module.exports = router
