const crypto = require('node:crypto')
const { dbQuery } = require('@surf-ai/sdk/db')

const RENAISS_BASE = (process.env.RENAISS_API_BASE_URL || 'https://api.renaiss.xyz').replace(/\/$/, '')
const INDEX_API_BASE = (process.env.RENAISSOS_API_BASE_URL || 'https://api.renaissos.com').replace(/\/$/, '')
const INDEX_SITE_BASE = (process.env.RENAISSOS_SITE_BASE_URL || 'https://index.renaissos.com').replace(/\/$/, '')
const intervalRenaiss = Math.max(0, Number(process.env.RENAISS_MIN_INTERVAL_MS || 150))
const intervalIndex = Math.max(0, Number(process.env.RENAISSOS_MIN_INTERVAL_MS || 250))
const maxRetries = Math.max(1, Number(process.env.RENAISSOS_MAX_RETRIES || 3))

let nextRenaissRequest = 0
let nextIndexRequest = 0
let activeRun = null
// The Surf DB proxy is rate-limited (~400 req/min); keep sync writes well below that
// so dashboard reads still work while a sync is running.
const intervalDb = Math.max(0, Number(process.env.DB_WRITE_INTERVAL_MS || 200))
let nextDbWrite = 0
async function dbWrite(sql, params) {
  const wait = nextDbWrite - Date.now()
  nextDbWrite = Math.max(Date.now(), nextDbWrite) + intervalDb
  if (wait > 0) await sleep(wait)
  return dbQuery(sql, params)
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)) }
async function gate(kind) {
  const interval = kind === 'index' ? intervalIndex : intervalRenaiss
  const wait = (kind === 'index' ? nextIndexRequest : nextRenaissRequest) - Date.now()
  if (wait > 0) await sleep(wait)
  if (kind === 'index') nextIndexRequest = Date.now() + interval
  else nextRenaissRequest = Date.now() + interval
}

function indexHeaders() {
  // Credentials are optional: the public Index API answers without them,
  // but keys (if configured) give higher rate limits.
  if (!process.env.RENAISSOS_API_KEY || !process.env.RENAISSOS_API_SECRET) return {}
  return {
    'X-Api-Key': process.env.RENAISSOS_API_KEY,
    'X-Api-Secret': process.env.RENAISSOS_API_SECRET,
  }
}

async function getJson(url, kind, headers = {}) {
  let lastError
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    await gate(kind)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30_000)
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'renaiss-market-v2/1.0', ...headers },
        signal: controller.signal,
      })
      if (response.ok) return await response.json()
      const body = await response.text().catch(() => '')
      lastError = new Error(`HTTP ${response.status}: ${body.slice(0, 180)}`)
      const retryable = response.status === 429 || response.status >= 500
      if (!retryable || attempt === maxRetries - 1) throw lastError
      const retryAfter = Number(response.headers.get('retry-after') || 0)
      // Anonymous Index quota resets daily (Retry-After can be ~20h) — don't hang the sync.
      if (retryAfter > 60) throw new Error(`HTTP ${response.status}: quota exhausted, retry after ${retryAfter}s (configure RENAISSOS_API_KEY/SECRET)`)
      await sleep(retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** attempt)
    } catch (error) {
      lastError = error
      const retryable = error.name === 'AbortError' || (/HTTP (429|5\d\d)/.test(error.message) && !/quota exhausted/.test(error.message))
      if (!retryable || attempt === maxRetries - 1) throw error
      await sleep(1000 * 2 ** attempt)
    } finally {
      clearTimeout(timeout)
    }
  }
  throw lastError || new Error('request failed')
}

function parseAmount(value, divisor) {
  const n = Number(value)
  return Number.isFinite(n) ? n / divisor : 0
}

function compact(value) { return String(value || '').trim().replace(/\s+/g, '') }
function normal(value) { return String(value || '').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '') }

function parseCardName(name) {
  const raw = String(name || '')
  const numberMatch = raw.match(/#([^\s]+)/)
  const cardNumber = numberMatch ? numberMatch[1].replace(/[^0-9A-Za-z./-]/g, '') : ''
  const before = numberMatch ? raw.slice(0, numberMatch.index) : raw
  const after = numberMatch ? raw.slice(numberMatch.index + numberMatch[0].length).trim() : ''
  const company = raw.match(/\b(PSA|CGC|BGS|SGC|TAG)\b/i)
  const grade = raw.match(/\b(?:PSA|CGC|BGS|SGC|TAG)\s+([0-9]+(?:\.[0-9]+)?)/i)
  const year = raw.match(/\b(19|20)\d{2}\b/)
  const language = /\bJapanese\b/i.test(raw) ? 'Japanese' : /\bEnglish\b/i.test(raw) ? 'English' : /\bChinese\b/i.test(raw) ? 'Chinese' : /\bKorean\b/i.test(raw) ? 'Korean' : ''
  const setName = before.replace(/^.*?\b(?:Pokemon|Pokémon)\s+/i, '').replace(/\b(PSA|CGC|BGS|SGC|TAG)\s+[0-9]+(?:\.[0-9]+)?/i, '').replace(/\b(19|20)\d{2}\b/, '').trim()
  return {
    cardNumber,
    pokemonName: after,
    setName,
    gradingCompany: company ? company[1].toUpperCase() : '',
    grade: grade ? grade[1] : '',
    year: year ? Number(year[0]) : 0,
    language,
  }
}

function certFrom(card) {
  const values = [card.frontImageUrl, card.name]
  for (const value of values) {
    const match = String(value || '').match(/\b(PSA|CGC|BGS|SGC|TAG)[A-Z0-9-]{5,}\b/i)
    if (match) return compact(match[0]).toUpperCase()
  }
  return ''
}

function collectible(raw) {
  const parsed = parseCardName(raw.name)
  const cert = certFrom(raw)
  return {
    tokenId: String(raw.tokenId),
    name: raw.name || '',
    setName: raw.setName || parsed.setName,
    cardNumber: raw.cardNumber || parsed.cardNumber,
    pokemonName: raw.pokemonName || parsed.pokemonName,
    ownerAddress: raw.ownerAddress || '',
    askPrice: parseAmount(raw.askPriceInUSDT, 1e18),
    fmv: parseAmount(raw.fmvPriceInUSD, 100),
    frontImageUrl: raw.frontImageUrl || null,
    grade: raw.grade || parsed.grade,
    gradingCompany: raw.gradingCompany || parsed.gradingCompany,
    year: Number(raw.year || parsed.year || 0),
    language: raw.language || parsed.language,
    serial: cert || null,
    renaissUrl: `https://www.renaiss.xyz/card/${encodeURIComponent(String(raw.tokenId))}`,
    sourceUpdatedAt: raw.fmvUpdatedAt || null,
  }
}

async function fetchMarketplace() {
  const size = Math.min(Math.max(Number(process.env.RENAISS_PAGE_SIZE || 100), 1), 100)
  const max = Math.max(Number(process.env.RENAISS_MAX_CARDS || 5000), 1)
  const result = []
  let complete = false
  for (let offset = 0; result.length < max;) {
    const payload = await getJson(`${RENAISS_BASE}/v0/marketplace?limit=${Math.min(size, max - result.length)}&offset=${offset}&listedOnly=true`, 'renaiss')
    const page = Array.isArray(payload.collection) ? payload.collection : []
    if (!page.length) {
      complete = true
      break
    }
    result.push(...page)
    offset += page.length
    if (!payload.pagination?.hasMore) {
      complete = true
      break
    }
  }
  return { cards: result.slice(0, max).map(collectible), complete }
}

function indexUrl(href) {
  if (!href) return null
  try { return new URL(href, `${INDEX_SITE_BASE}/`).toString() } catch { return null }
}

function normalizeIndex(payload, method) {
  if (!payload || payload.found === false) return { status: 'not_found', matchMethod: method, rawJson: JSON.stringify(payload || {}) }
  const item = payload.item || payload.card || payload
  if (!item || item.priceUsdCents == null) return { status: 'not_found', matchMethod: method, rawJson: JSON.stringify(payload || {}) }
  return {
    status: 'matched',
    matchMethod: method,
    indexId: item.id || null,
    priceUsdCents: Number(item.priceUsdCents),
    confidence: item.confidence || null,
    indexHref: item.href || item.pageUrl || null,
    indexUrl: indexUrl(item.href || item.pageUrl),
    lastSaleAt: item.lastSaleAt || null,
    indexUpdatedAt: item.updatedAt || null,
    rawJson: JSON.stringify(payload),
  }
}

function gradeNumber(value) {
  const match = String(value || '').match(/(?:^|\s)(\d+(?:\.\d+)?)(?:\s|$)/)
  return match ? Number(match[1]) : null
}

function chooseSearch(results, card) {
  let best = null
  for (const item of Array.isArray(results) ? results : []) {
    let score = 0
    if (card.cardNumber && normal(item.cardNumber) === normal(card.cardNumber)) score += 100
    if (card.pokemonName && normal(item.name).includes(normal(card.pokemonName))) score += 45
    if (card.language && normal(item.language) === normal(card.language)) score += 20

    // A fallback search must not turn a PSA/CGC/BGS card into another grade.
    // The live data exposed this failure mode for a CGC 8.5 card matching a PSA 10 result.
    if (card.gradingCompany) {
      if (normal(item.company) !== normal(card.gradingCompany)) continue
      score += 25
    }
    if (card.grade) {
      const itemGrade = gradeNumber(item.grade)
      if (itemGrade == null || itemGrade !== Number(card.grade)) continue
      score += 25
    }

    if (item.priceUsdCents != null) score += 5
    if (!best || score > best.score) best = { item, score }
  }
  return best && best.score >= 100 ? best.item : null
}

function identityMatches(item, card) {
  if (!item) return false
  if (card.cardNumber && normal(item.cardNumber) !== normal(card.cardNumber)) return false
  if (card.gradingCompany && normal(item.company) !== normal(card.gradingCompany)) return false
  if (card.grade && gradeNumber(item.grade) !== Number(card.grade)) return false
  return true
}

async function lookupIndex(card) {
  if (card.serial) {
    const payload = await getJson(`${INDEX_API_BASE}/v1/graded/${encodeURIComponent(card.serial)}`, 'index', indexHeaders())
    const item = payload?.item || payload?.card || null
    const result = identityMatches(item, card)
      ? normalizeIndex(payload, 'cert')
      : { status:'not_found', matchMethod:'cert', errorMessage:'Index identity did not match the Renaiss card', rawJson:JSON.stringify(payload) }
    if (result.status === 'matched') return result
  }
  const query = [card.pokemonName, card.cardNumber && `#${card.cardNumber}`, card.setName].filter(Boolean).join(' ').slice(0, 80)
  if (!query) return { status: 'not_found', matchMethod: 'none', errorMessage: 'No card identity' }
  const search = await getJson(`${INDEX_API_BASE}/v1/search?q=${encodeURIComponent(query)}&game=pokemon&limit=12`, 'index', indexHeaders())
  const match = chooseSearch(search.results, card)
  return match ? normalizeIndex(match, card.serial ? 'cert_then_search' : 'search') : {
    status: 'not_found', matchMethod: card.serial ? 'cert_then_search' : 'search', errorMessage: 'No confident match', rawJson: JSON.stringify(search),
  }
}

const COLS = `c.token_id,c.name,c.set_name,c.card_number,c.pokemon_name,c.owner_address,c.ask_price_usdt,c.fmv_price_usd,c.front_image_url,c.grade,c.grading_company,c.year,c.language,c.serial,c.renaiss_url,c.status,c.source_updated_at,c.created_at,c.updated_at`
const JOINED = `${COLS},p.index_id,p.price_usd_cents,p.confidence,p.index_href,p.index_url,p.last_sale_at,p.index_updated_at,p.observed_at,p.status AS index_status,p.match_method,p.error_message`
const JOIN = 'LEFT JOIN renaissos_prices p ON c.token_id=p.token_id'

function mapRow(row) {
  const indexPrice = row.price_usd_cents == null ? null : Number(row.price_usd_cents) / 100
  const ask = Number(row.ask_price_usdt || 0)
  const spread = indexPrice == null ? null : indexPrice - ask
  return {
    ...row, tokenId: row.token_id, askPriceInUSDT: ask, priceUsdCents: row.price_usd_cents == null ? null : Number(row.price_usd_cents), indexPriceUsd: indexPrice,
    spreadUsd: spread, roiPct: indexPrice != null && ask > 0 ? spread / ask * 100 : null, discountPct: indexPrice ? spread / indexPrice * 100 : null,
    renaissUrl: row.renaiss_url, indexUrl: row.index_url, indexStatus: row.index_status || null,
  }
}

async function getCollectibles(options = {}) {
  const where = [], params = []
  let i = 1
  const status = options.status || 'listed'
  if (status !== 'all') { where.push(`c.status=$${i++}`); params.push(status) }
  if (options.search) { where.push(`(c.name ILIKE $${i} OR c.token_id ILIKE $${i} OR c.serial ILIKE $${i})`); params.push(`%${options.search}%`); i += 1 }
  if (options.confidence) { where.push(`p.confidence=$${i++}`); params.push(options.confidence) }
  if (options.onlyOpportunities) where.push('p.price_usd_cents IS NOT NULL AND c.ask_price_usdt < p.price_usd_cents/100.0')
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const count = await dbQuery(`SELECT COUNT(*)::int AS count FROM collectibles c ${JOIN} ${clause}`, params)
  const limit = Math.min(Math.max(Number(options.limit) || 100, 1), 1000)
  const offset = Math.max(Number(options.offset) || 0, 0)
  const rows = await dbQuery(`SELECT ${JOINED} FROM collectibles c ${JOIN} ${clause} ORDER BY CASE WHEN p.price_usd_cents IS NULL THEN -999999 ELSE (p.price_usd_cents/100.0-c.ask_price_usdt)/NULLIF(c.ask_price_usdt,0) END DESC,c.updated_at DESC LIMIT $${i++} OFFSET $${i++}`, [...params, limit, offset])
  return { data: rows.rows.map(mapRow), count: Number(count.rows?.[0]?.count || 0) }
}

async function getStats() {
  const result = await dbQuery(`SELECT COUNT(*) FILTER(WHERE c.status='listed')::int total,COUNT(*) FILTER(WHERE c.status='listed' AND c.ask_price_usdt>0)::int with_ask,COALESCE(SUM(c.ask_price_usdt) FILTER(WHERE c.status='listed'),0) total_value,COUNT(*) FILTER(WHERE c.status='listed' AND p.price_usd_cents IS NOT NULL)::int with_index,COUNT(*) FILTER(WHERE c.status='listed' AND p.price_usd_cents IS NOT NULL AND c.ask_price_usdt<p.price_usd_cents/100.0)::int opportunities FROM collectibles c LEFT JOIN renaissos_prices p ON c.token_id=p.token_id`)
  const r = result.rows?.[0] || {}
  return { total: Number(r.total || 0), withAskPrice: Number(r.with_ask || 0), totalValue: Number(r.total_value || 0), withIndexPrice: Number(r.with_index || 0), opportunities: Number(r.opportunities || 0) }
}

async function getLastSync() { const result = await dbQuery('SELECT * FROM sync_runs ORDER BY started_at DESC LIMIT 1'); return result.rows?.[0] || null }
async function getOne(tokenId) { const result = await dbQuery(`SELECT ${JOINED} FROM collectibles c ${JOIN} WHERE c.token_id=$1`, [tokenId]); return result.rows?.[0] ? mapRow(result.rows[0]) : null }

async function upsertCard(card) {
  await dbWrite(`INSERT INTO collectibles(token_id,name,set_name,card_number,pokemon_name,owner_address,ask_price_usdt,fmv_price_usd,front_image_url,grade,grading_company,year,language,serial,renaiss_url,status,source_updated_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'listed',$16,NOW()) ON CONFLICT(token_id) DO UPDATE SET name=EXCLUDED.name,set_name=EXCLUDED.set_name,card_number=EXCLUDED.card_number,pokemon_name=EXCLUDED.pokemon_name,owner_address=EXCLUDED.owner_address,ask_price_usdt=EXCLUDED.ask_price_usdt,fmv_price_usd=EXCLUDED.fmv_price_usd,front_image_url=EXCLUDED.front_image_url,grade=EXCLUDED.grade,grading_company=EXCLUDED.grading_company,year=EXCLUDED.year,language=EXCLUDED.language,serial=EXCLUDED.serial,renaiss_url=EXCLUDED.renaiss_url,status='listed',source_updated_at=EXCLUDED.source_updated_at,updated_at=NOW()`, [card.tokenId,card.name,card.setName,card.cardNumber,card.pokemonName,card.ownerAddress,card.askPrice,card.fmv,card.frontImageUrl,card.grade,card.gradingCompany,card.year,card.language,card.serial,card.renaissUrl,card.sourceUpdatedAt])
}

async function upsertPrice(tokenId, data) {
  await dbWrite(`INSERT INTO renaissos_prices(token_id,index_id,price_usd_cents,confidence,index_href,index_url,last_sale_at,index_updated_at,observed_at,status,match_method,error_message,raw_json) VALUES($1,$2,$3,$4,$5,$6,$7,$8,NOW(),$9,$10,$11,$12) ON CONFLICT(token_id) DO UPDATE SET index_id=EXCLUDED.index_id,price_usd_cents=EXCLUDED.price_usd_cents,confidence=EXCLUDED.confidence,index_href=EXCLUDED.index_href,index_url=EXCLUDED.index_url,last_sale_at=EXCLUDED.last_sale_at,index_updated_at=EXCLUDED.index_updated_at,observed_at=NOW(),status=EXCLUDED.status,match_method=EXCLUDED.match_method,error_message=EXCLUDED.error_message,raw_json=EXCLUDED.raw_json`, [tokenId,data.indexId||null,data.priceUsdCents==null?null:data.priceUsdCents,data.confidence||null,data.indexHref||null,data.indexUrl||null,data.lastSaleAt||null,data.indexUpdatedAt||null,data.status||'not_found',data.matchMethod||null,data.errorMessage||null,data.rawJson||null])
}

async function markMissingAsUnlisted(tokenIds) {
  if (!tokenIds.length) return
  await dbQuery(
    `UPDATE collectibles SET status='unlisted', updated_at=NOW()
     WHERE status='listed' AND NOT (token_id = ANY($1::text[]))`,
    [tokenIds],
  )
}

// Older deployments created `collectibles` with a NOT NULL `id` column (no default).
// Give it a default so v2 upserts (keyed by token_id) work without touching existing rows.
let legacyChecked = false
async function ensureLegacyCompat() {
  if (legacyChecked) return
  await dbQuery(`DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='collectibles' AND column_name='id') THEN
      ALTER TABLE collectibles ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
    END IF;
  END $$`)
  legacyChecked = true
}

async function runDailySync() {
  if (activeRun) return { ...activeRun, alreadyRunning: true }
  await ensureLegacyCompat()
  const id = crypto.randomUUID(), started = new Date().toISOString()
  activeRun = { runId:id,status:'running',startedAt:started,totalCards:0,updatedCards:0,failedCards:0 }
  try {
    await dbQuery('INSERT INTO sync_runs(id,status,started_at) VALUES($1,$2,$3)', [id,'running',started])
    const snapshot = await fetchMarketplace()
    const cards = snapshot.cards
    const errors = []
    let updated = 0, failed = 0

    for (const card of cards) {
      activeRun.totalCards += 1
      try {
        await upsertCard(card)
        const result = await lookupIndex(card)
        await upsertPrice(card.tokenId, result)
        if (result.status === 'matched') updated += 1
      } catch (error) {
        failed += 1
        const message = error instanceof Error ? error.message : String(error)
        if (errors.length < 20) errors.push({ tokenId: card.tokenId, error: message })
        await upsertPrice(card.tokenId, { status:'failed', matchMethod:card.serial?'cert':'search', errorMessage:message }).catch(() => {})
      }
      activeRun.updatedCards = updated
      activeRun.failedCards = failed
    }

    // Only mark missing cards when the Marketplace pagination completed normally.
    // This prevents a transient API failure or the 5000-card cap from hiding data.
    if (snapshot.complete && cards.length > 0) {
      await markMissingAsUnlisted(cards.map(card => card.tokenId))
    }

    const status = failed && !updated ? 'failed' : failed ? 'partial' : 'success'
    const finished = new Date().toISOString()
    await dbQuery('UPDATE sync_runs SET status=$2,total_cards=$3,updated_cards=$4,failed_cards=$5,finished_at=$6,error_message=$7 WHERE id=$1', [id,status,cards.length,updated,failed,finished,errors.length?JSON.stringify(errors):null])
    return { success:status !== 'failed',runId:id,status,startedAt:started,finishedAt:finished,totalCards:cards.length,updatedCards:updated,failedCards:failed,errors }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const finished = new Date().toISOString()
    await dbQuery('UPDATE sync_runs SET status=$2,total_cards=$3,updated_cards=$4,failed_cards=$5,finished_at=$6,error_message=$7 WHERE id=$1', [id,'failed',activeRun.totalCards,activeRun.updatedCards,activeRun.failedCards,finished,message]).catch(() => {})
    return { success:false,runId:id,status:'failed',error:message }
  } finally {
    activeRun = null
  }
}

module.exports = { getCollectibles, getStats, getLastSync, getOne, runDailySync, getSyncState: () => activeRun, chooseSearch, identityMatches }
