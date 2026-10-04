const express = require('express')
const { runDailySync, getSyncState, getLastSync } = require('../lib/app')
const router = express.Router()

router.get('/status', async (_req, res) => {
  try { res.json({ active:getSyncState(), lastRun:await getLastSync() }) } catch (e) { res.status(500).json({ error:e.message }) }
})
router.post('/', async (_req, res) => {
  if (getSyncState()) return res.status(409).json({ error:'A daily sync is already running', active:getSyncState() })
  try { const result = await runDailySync(); res.status(result.success ? 200 : 500).json(result) } catch (e) { res.status(500).json({ error:e.message }) }
})
module.exports = router
