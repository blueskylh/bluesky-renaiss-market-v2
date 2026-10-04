const { pgTable, text, integer, doublePrecision, timestamp } = require('drizzle-orm/pg-core')

exports.collectibles = pgTable('collectibles', {
  token_id: text('token_id').primaryKey(),
  name: text('name').notNull().default(''),
  set_name: text('set_name').default(''),
  card_number: text('card_number').default(''),
  pokemon_name: text('pokemon_name'),
  owner_address: text('owner_address').default(''),
  ask_price_usdt: doublePrecision('ask_price_usdt').default(0),
  fmv_price_usd: doublePrecision('fmv_price_usd').default(0),
  front_image_url: text('front_image_url'),
  grade: text('grade').default(''),
  grading_company: text('grading_company').default(''),
  year: integer('year').default(0),
  language: text('language').default(''),
  serial: text('serial'),
  renaiss_url: text('renaiss_url'),
  status: text('status').notNull().default('listed'),
  source_updated_at: text('source_updated_at'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

exports.renaissosPrices = pgTable('renaissos_prices', {
  token_id: text('token_id').primaryKey(),
  index_id: text('index_id'),
  price_usd_cents: integer('price_usd_cents'),
  confidence: text('confidence'),
  index_href: text('index_href'),
  index_url: text('index_url'),
  last_sale_at: text('last_sale_at'),
  index_updated_at: text('index_updated_at'),
  observed_at: timestamp('observed_at', { withTimezone: true }).defaultNow(),
  status: text('status').notNull().default('pending'),
  match_method: text('match_method'),
  error_message: text('error_message'),
  raw_json: text('raw_json'),
})

exports.syncRuns = pgTable('sync_runs', {
  id: text('id').primaryKey(),
  status: text('status').notNull().default('running'),
  total_cards: integer('total_cards').default(0),
  updated_cards: integer('updated_cards').default(0),
  failed_cards: integer('failed_cards').default(0),
  started_at: text('started_at'),
  finished_at: text('finished_at'),
  error_message: text('error_message'),
})
