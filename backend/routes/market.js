const express = require('express')
const { getCollectibles, getStats, getLastSync, getOne } = require('../lib/app')
const router = express.Router()

router.get('/stats', async (_req, res) => {
  try { res.json(await getStats()) } catch (e) { res.status(500).json({ error: e.message }) }
})
router.get('/collectibles', async (req, res) => {
  try {
    const result = await getCollectibles({ limit:req.query.limit, offset:req.query.offset, search:req.query.search, confidence:req.query.confidence, onlyOpportunities:req.query.onlyOpportunities === 'true', status:req.query.status || 'listed', sortBy:req.query.sortBy, sortOrder:req.query.sortOrder })
    res.json({ collection: result.data, total: result.count })
  } catch (e) { res.status(500).json({ error: e.message }) }
})
router.get('/collectibles/:tokenId', async (req, res) => {
  try { const card = await getOne(req.params.tokenId); if (!card) return res.status(404).json({ error:'Not found' }); res.json(card) } catch (e) { res.status(500).json({ error:e.message }) }
})
router.get('/sync-status', async (_req, res) => {
  try { res.json(await getLastSync()) } catch (e) { res.status(500).json({ error:e.message }) }
})
module.exports = router
