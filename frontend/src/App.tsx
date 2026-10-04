import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './lib/api'
import renaissLogo from './assets/renaiss-logo.jpg'
import blueskylhAvatar from './assets/blueskylh-avatar.png'

type Confidence = 'prime' | 'high' | 'medium' | 'low'
type SortKey = 'spreadUsd' | 'roiPct'
type SortOrder = 'asc' | 'desc'
type Language = 'zh-CN' | 'zh-TW' | 'en' | 'ja' | 'ko'
type Card = {
  token_id:string
  name:string
  set_name:string
  card_number:string
  serial?:string|null
  front_image_url?:string|null
  ask_price_usdt:number
  indexPriceUsd:number|null
  spreadUsd:number|null
  roiPct:number|null
  confidence:Confidence|null
  renaissUrl?:string|null
  indexUrl?:string|null
  last_sale_at?:string|null
  observed_at?:string|null
}
type Stats = { withAskPrice:number; totalValue:number; arbitrageValueUsd:number }

type Copy = {
  title:string
  register:string
  follow:string
  github:string
  refresh:string
  listedCards:string
  listedValue:string
  arbitrageValue:string
  arbitrageNote:string
  searchPlaceholder:string
  allConfidence:string
  onlyOpportunities:string
  sectionTitle:string
  spreadFormula:string
  lastSync:string
  card:string
  askPrice:string
  indexPrice:string
  spread:string
  roi:string
  sortAscending:string
  sortDescending:string
  confidence:string
  updated:string
  links:string
  loading:string
  empty:string
  page:string
  previous:string
  next:string
  unknownSerial:string
  renaissLink:string
  indexLink:string
  cron:string
  language:string
  marketLoadError:string
}

const copy:Record<Language,Copy> = {
  'zh-CN': {
    title:'跨市场套利监控 v2', register:'立即注册 Renaiss', follow:'关注', github:'我的 GitHub', refresh:'刷新数据', listedCards:'已挂牌卡牌', listedValue:'挂牌总价值', arbitrageValue:'可套利总价值', arbitrageNote:'全市场正价差之和；未扣费用，非保证收益。', searchPlaceholder:'搜索名称、Token ID 或 Serial', allConfidence:'所有置信度', onlyOpportunities:'只看可套利卡牌', sectionTitle:'可套利卡牌', spreadFormula:'价差 = Renaiss Index 参考价 − Renaiss 当前挂牌价', lastSync:'最后同步', card:'卡牌', askPrice:'Renaiss 挂牌', indexPrice:'Index 参考价 (USD)', spread:'价差', roi:'ROI', sortAscending:'升序', sortDescending:'降序', confidence:'confidence', updated:'更新时间', links:'链接', loading:'加载中…', empty:'没有符合条件的卡牌。', page:'第 {page} 页', previous:'上一页', next:'下一页', unknownSerial:'未识别证书', renaissLink:'Renaiss', indexLink:'Index', cron:'每日 UTC 03:00 自动同步，部署平台 Cron 负责触发。', language:'语言', marketLoadError:'市场数据加载失败',
  },
  'zh-TW': {
    title:'跨市場套利監控 v2', register:'立即註冊 Renaiss', follow:'關注', github:'我的 GitHub', refresh:'重新整理', listedCards:'已掛牌卡牌', listedValue:'掛牌總價值', arbitrageValue:'可套利總價值', arbitrageNote:'全市場正價差總和；未扣費用，非保證收益。', searchPlaceholder:'搜尋名稱、Token ID 或 Serial', allConfidence:'所有信心等級', onlyOpportunities:'只看可套利卡牌', sectionTitle:'可套利卡牌', spreadFormula:'價差 = Renaiss Index 參考價 − Renaiss 當前掛牌價', lastSync:'最後同步', card:'卡牌', askPrice:'Renaiss 掛牌', indexPrice:'Index 參考價 (USD)', spread:'價差', roi:'ROI', sortAscending:'升冪', sortDescending:'降冪', confidence:'confidence', updated:'更新時間', links:'連結', loading:'載入中…', empty:'沒有符合條件的卡牌。', page:'第 {page} 頁', previous:'上一頁', next:'下一頁', unknownSerial:'未識別證書', renaissLink:'Renaiss', indexLink:'Index', cron:'每日 UTC 03:00 自動同步，由部署平台 Cron 觸發。', language:'語言', marketLoadError:'市場資料載入失敗',
  },
  en: {
    title:'Cross-Market Arbitrage Monitor v2', register:'Register on Renaiss', follow:'Follow', github:'My GitHub', refresh:'Refresh', listedCards:'Listed Cards', listedValue:'Listed Value', arbitrageValue:'Total Arbitrage Value', arbitrageNote:'Market-wide positive spreads; before fees, not guaranteed profit.', searchPlaceholder:'Search name, Token ID, or Serial', allConfidence:'All confidence', onlyOpportunities:'Only arbitrage cards', sectionTitle:'Arbitrage Cards', spreadFormula:'Spread = Renaiss Index reference price − Renaiss current ask', lastSync:'Last sync', card:'Card', askPrice:'Renaiss Ask', indexPrice:'Index Price (USD)', spread:'Spread', roi:'ROI', sortAscending:'Ascending', sortDescending:'Descending', confidence:'Confidence', updated:'Updated', links:'Links', loading:'Loading…', empty:'No cards match your filters.', page:'Page {page}', previous:'Previous', next:'Next', unknownSerial:'Unidentified cert', renaissLink:'Renaiss', indexLink:'Index', cron:'Automatic sync daily at 03:00 UTC, triggered by the deployment Cron.', language:'Language', marketLoadError:'Failed to load market data',
  },
  ja: {
    title:'クロスマーケット裁定監視 v2', register:'Renaiss に登録', follow:'フォロー', github:'GitHub', refresh:'更新', listedCards:'出品カード', listedValue:'出品総額', arbitrageValue:'裁定機会の総額', arbitrageNote:'市場全体の正の価格差の合計。手数料控除前、利益保証なし。', searchPlaceholder:'名前、Token ID、Serial を検索', allConfidence:'信頼度すべて', onlyOpportunities:'裁定可能なカードのみ', sectionTitle:'裁定可能なカード', spreadFormula:'価格差 = Renaiss Index 参考価格 − Renaiss 現在の出品価格', lastSync:'最終同期', card:'カード', askPrice:'Renaiss 出品価格', indexPrice:'Index 参考価格 (USD)', spread:'価格差', roi:'ROI', sortAscending:'昇順', sortDescending:'降順', confidence:'信頼度', updated:'更新日時', links:'リンク', loading:'読み込み中…', empty:'条件に一致するカードはありません。', page:'{page} ページ', previous:'前へ', next:'次へ', unknownSerial:'証明書番号なし', renaissLink:'Renaiss', indexLink:'Index', cron:'毎日 03:00 UTC に自動同期。デプロイ環境の Cron が実行します。', language:'言語', marketLoadError:'マーケットデータの読み込みに失敗しました',
  },
  ko: {
    title:'크로스 마켓 차익거래 모니터 v2', register:'Renaiss 가입', follow:'팔로우', github:'내 GitHub', refresh:'새로고침', listedCards:'상장 카드', listedValue:'상장 총액', arbitrageValue:'총 차익거래 가치', arbitrageNote:'전체 시장의 양수 가격 차이 합계. 수수료 차감 전이며 수익을 보장하지 않습니다.', searchPlaceholder:'이름, Token ID 또는 Serial 검색', allConfidence:'모든 신뢰도', onlyOpportunities:'차익거래 가능 카드만', sectionTitle:'차익거래 가능 카드', spreadFormula:'스프레드 = Renaiss Index 기준가 − Renaiss 현재 판매가', lastSync:'마지막 동기화', card:'카드', askPrice:'Renaiss 판매가', indexPrice:'Index 기준가 (USD)', spread:'스프레드', roi:'ROI', sortAscending:'오름차순', sortDescending:'내림차순', confidence:'신뢰도', updated:'업데이트', links:'링크', loading:'불러오는 중…', empty:'조건에 맞는 카드가 없습니다.', page:'{page}페이지', previous:'이전', next:'다음', unknownSerial:'인증서 번호 없음', renaissLink:'Renaiss', indexLink:'Index', cron:'매일 03:00 UTC 자동 동기화. 배포 플랫폼 Cron이 실행합니다.', language:'언어', marketLoadError:'시장 데이터를 불러오지 못했습니다',
  },
}

const languageOptions:[Language,string][] = [
  ['zh-CN','简体中文'], ['zh-TW','繁體中文'], ['en','English'], ['ja','日本語'], ['ko','한국어'],
]
const locales:Record<Language,string> = { 'zh-CN':'zh-CN', 'zh-TW':'zh-TW', en:'en-US', ja:'ja-JP', ko:'ko-KR' }
const confidenceLabels:Record<Language,Record<Confidence,string>> = {
  'zh-CN':{prime:'极高',high:'高',medium:'中',low:'低'},
  'zh-TW':{prime:'極高',high:'高',medium:'中',low:'低'},
  en:{prime:'Prime',high:'High',medium:'Medium',low:'Low'},
  ja:{prime:'最高',high:'高',medium:'中',low:'低'},
  ko:{prime:'최상',high:'높음',medium:'보통',low:'낮음'},
}

const detectLanguage = ():Language => {
  if(typeof window === 'undefined') return 'zh-CN'
  const saved = window.localStorage.getItem('renaiss-language') as Language | null
  if(saved && copy[saved]) return saved
  const browser = navigator.language.toLowerCase()
  if(browser.startsWith('zh-tw') || browser.startsWith('zh-hk') || browser.startsWith('zh-mo')) return 'zh-TW'
  if(browser.startsWith('zh')) return 'zh-CN'
  if(browser.startsWith('ja')) return 'ja'
  if(browser.startsWith('ko')) return 'ko'
  return 'en'
}

const money = (n:number|null|undefined, language:Language) => n == null || !Number.isFinite(n) ? '—' : `$${n.toLocaleString(locales[language],{minimumFractionDigits:2,maximumFractionDigits:2})}`
const percent = (n:number|null|undefined) => n == null || !Number.isFinite(n) ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
const time = (s:string|null|undefined, language:Language) => s ? new Date(s).toLocaleString(locales[language]) : '—'
const badge:Record<string,string> = { prime:'bg-emerald-400/15 text-emerald-300', high:'bg-blue-400/15 text-blue-300', medium:'bg-amber-400/15 text-amber-300', low:'bg-red-400/15 text-red-300' }

export default function App() {
  const [language,setLanguage] = useState<Language>('zh-CN')
  const [cards,setCards] = useState<Card[]>([])
  const [stats,setStats] = useState<Stats|null>(null)
  const [lastSync,setLastSync] = useState<any>(null)
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState('')
  const [search,setSearch] = useState('')
  const [confidence,setConfidence] = useState('')
  const [onlyOpp,setOnlyOpp] = useState(true)
  const [page,setPage] = useState(0)
  const [sort,setSort] = useState<{key:SortKey;order:SortOrder}>({key:'roiPct',order:'desc'})
  const requestController = useRef<AbortController|null>(null)
  const limit = 100
  const t = copy[language]

  useEffect(() => { setLanguage(detectLanguage()) }, [])
  useEffect(() => { if(typeof window !== 'undefined') window.localStorage.setItem('renaiss-language', language) }, [language])

  const load = useCallback(async () => {
    requestController.current?.abort()
    const controller = new AbortController()
    requestController.current = controller
    const { signal } = controller
    setLoading(true); setError('')
    try {
      const q = new URLSearchParams({limit:String(limit),offset:String(page*limit),sortBy:sort.key,sortOrder:sort.order})
      if(search.trim()) q.set('search',search.trim())
      if(confidence) q.set('confidence',confidence)
      if(onlyOpp) q.set('onlyOpportunities','true')
      const [a,b,c] = await Promise.all([fetch(api(`market/collectibles?${q}`),{signal}),fetch(api('market/stats'),{signal}),fetch(api('market/sync-status'),{signal})])
      if(!a.ok) throw new Error(t.marketLoadError)
      const [collection,nextStats,nextSync] = await Promise.all([a.json(),b.ok?b.json():null,c.ok?c.json():null])
      if(signal.aborted) return
      setCards(collection.collection || [])
      setStats(nextStats)
      setLastSync(nextSync)
    } catch(e) { if(!signal.aborted) setError(e instanceof Error ? e.message : t.marketLoadError) } finally { if(!signal.aborted) setLoading(false) }
  },[page,search,confidence,onlyOpp,t.marketLoadError,sort.key,sort.order])
  useEffect(()=>{ void load(); return ()=>requestController.current?.abort() },[load])

  const toggleSort = (key:SortKey) => {
    setPage(0)
    setSort(current=>({key,order:current.key===key && current.order==='desc'?'asc':'desc'}))
  }
  const sortHeading = (key:SortKey,label:string) => (
    <th scope="col" className="px-3 py-3" aria-sort={sort.key===key?(sort.order==='asc'?'ascending':'descending'):'none'}>
      <button type="button" onClick={()=>toggleSort(key)} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded text-left hover:text-pink-300 focus-visible:outline-2 focus-visible:outline-pink-400" aria-label={`${label}: ${sort.key===key && sort.order==='desc'?t.sortAscending:t.sortDescending}`}>
        {label}<span aria-hidden="true" className={sort.key===key?'text-pink-400':'text-slate-500'}>{sort.key===key?(sort.order==='asc'?'↑':'↓'):'↕'}</span>
      </button>
    </th>
  )

  const statsItems:[string,string|number][] = [
    [t.listedCards,stats?.withAskPrice||0],
    [t.listedValue,money(stats?.totalValue,language)],
    [t.arbitrageValue,money(stats?.arbitrageValueUsd,language)],
  ]

  return <main className="min-h-screen bg-[#0b0e14] text-slate-100"><div className="mx-auto max-w-[1600px] px-5 py-8 lg:px-8">
    <header className="mb-8 flex flex-col justify-between gap-6 xl:flex-row xl:items-end"><div className="flex items-start gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white shadow-[0_0_30px_rgba(236,72,153,.18)]"><img src={renaissLogo} alt="Renaiss logo" className="h-full w-full object-cover"/></div><div><div className="mb-2 text-sm font-bold uppercase tracking-[.18em] text-pink-400">Renaiss Market v2</div><h1 className="text-3xl font-black md:text-4xl">{t.title}</h1></div></div><div className="flex flex-wrap items-center gap-2"><label className="sr-only" htmlFor="language-select">{t.language}</label><select id="language-select" value={language} onChange={e=>setLanguage(e.target.value as Language)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-300 outline-none transition hover:border-slate-400 focus:border-pink-400">{languageOptions.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><a href="https://www.renaiss.xyz/ref/blueskyone" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-pink-500/20 transition hover:-translate-y-0.5 hover:from-pink-400 hover:to-fuchsia-400"><img src={renaissLogo} alt="" className="h-5 w-5 rounded bg-white object-cover"/>{t.register} ↗</a><a href="https://x.com/blueskylh1" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-sky-400/35 bg-sky-400/10 px-3.5 py-2.5 text-sm font-semibold text-sky-100 transition hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-400/20"><img src={blueskylhAvatar} alt="blueskylh1 avatar" className="h-6 w-6 rounded-full object-cover ring-1 ring-sky-300/50"/><span><span className="block text-[10px] uppercase tracking-wider text-sky-300">{t.follow}</span><span className="block leading-none">@blueskylh1 ↗</span></span></a><a href="https://github.com/blueskylh/bluesky-renaiss-market-v2" target="_blank" rel="noreferrer" className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-300 transition hover:-translate-y-0.5 hover:border-slate-400">{t.github} ↗</a><button onClick={()=>void load()} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-200 transition hover:-translate-y-0.5 hover:border-pink-400 hover:text-white">{t.refresh}</button></div></header>
    <section className="mb-6 grid gap-3 md:grid-cols-3">{statsItems.map(([label,value])=><div key={String(label)} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"><div className="text-xs uppercase tracking-widest text-slate-500">{label}</div><div className="mt-2 text-2xl font-black">{typeof value==='number'?value.toLocaleString(locales[language]):value}</div>{label===t.arbitrageValue&&<p className="mt-2 text-xs text-slate-400">{t.arbitrageNote}</p>}</div>)}</section>
    <section className="mb-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-4"><div className="flex flex-col gap-3 lg:flex-row"><input value={search} onChange={e=>{setPage(0);setSearch(e.target.value)}} placeholder={t.searchPlaceholder} className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-pink-400"/><select value={confidence} aria-label={t.allConfidence} onChange={e=>{setPage(0);setConfidence(e.target.value)}} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"><option value="">{t.allConfidence}</option>{(['prime','high','medium','low'] as Confidence[]).map(item=><option key={item} value={item}>{confidenceLabels[language][item]}</option>)}</select><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyOpp} onChange={e=>{setPage(0);setOnlyOpp(e.target.checked)}} className="accent-pink-500"/>{t.onlyOpportunities}</label><button onClick={()=>void load()} className="rounded-lg border border-slate-700 px-4 py-2 text-sm">{t.refresh}</button></div>{error&&<div className="mt-3 rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">{error}</div>}</section>
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70"><div className="flex justify-between border-b border-slate-800 px-5 py-4"><div><h2 className="font-bold">{t.sectionTitle}</h2><p className="mt-1 text-xs text-slate-500">{t.spreadFormula}</p></div><div className="text-xs text-slate-500">{t.lastSync}：{time(lastSync?.finished_at,language)}</div></div>{loading?<div className="p-10 text-center text-slate-500">{t.loading}</div>:cards.length===0?<div className="p-10 text-center text-slate-500">{t.empty}</div>:<div className="overflow-x-auto"><table className="min-w-[1200px] w-full text-left text-sm"><thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">{t.card}</th><th className="px-3 py-3">{t.askPrice}</th><th className="px-3 py-3">{t.indexPrice}</th>{sortHeading('spreadUsd',t.spread)}{sortHeading('roiPct',t.roi)}<th className="px-3 py-3">{t.confidence}</th><th className="px-3 py-3">{t.updated}</th><th className="px-5 py-3">{t.links}</th></tr></thead><tbody className="divide-y divide-slate-800/80">{cards.map(card=><tr key={card.token_id} className="hover:bg-slate-800/35"><td className="px-5 py-4"><div className="flex min-w-[310px] items-center gap-3">{card.front_image_url?<img src={card.front_image_url} alt="" className="h-14 w-10 rounded object-cover"/>:<div className="h-14 w-10 rounded bg-slate-800"/>}<div className="min-w-0"><div className="truncate font-semibold" title={card.name}>{card.name}</div><div className="mt-1 text-xs text-slate-500">{card.set_name||'—'} · #{card.card_number||'—'} · {card.serial||t.unknownSerial}</div></div></div></td><td className="px-3 py-4 font-mono">{money(card.ask_price_usdt,language)}</td><td className="px-3 py-4"><div className="font-mono font-semibold text-emerald-300">{money(card.indexPriceUsd,language)}</div></td><td className={`px-3 py-4 font-mono font-bold ${(card.spreadUsd??0)<0?'text-red-300':'text-emerald-300'}`}>{money(card.spreadUsd,language)}</td><td className={`px-3 py-4 font-mono ${(card.roiPct??0)<0?'text-red-300':'text-emerald-400'}`}>{percent(card.roiPct)}</td><td className="px-3 py-4">{card.confidence?<span className={`rounded-full px-2.5 py-1 text-xs font-bold ${badge[card.confidence]||'bg-slate-800 text-slate-300'}`}>{confidenceLabels[language][card.confidence]}</span>:'—'}</td><td className="px-3 py-4 text-xs text-slate-500">{time(card.last_sale_at||card.observed_at,language)}</td><td className="px-5 py-4"><div className="flex gap-2 whitespace-nowrap">{card.renaissUrl&&<a href={card.renaissUrl} target="_blank" rel="noreferrer" className="rounded border border-slate-700 px-2 py-1 text-xs hover:border-pink-400">{t.renaissLink} ↗</a>}{card.indexUrl&&<a href={card.indexUrl} target="_blank" rel="noreferrer" className="rounded border border-slate-700 px-2 py-1 text-xs hover:border-cyan-400">{t.indexLink} ↗</a>}</div></td></tr>)}</tbody></table></div>}<div className="flex justify-between border-t border-slate-800 px-5 py-3"><span className="text-xs text-slate-500">{t.page.replace('{page}',String(page+1))}</span><div className="flex gap-2"><button disabled={!page} onClick={()=>setPage(p=>Math.max(0,p-1))} className="rounded border border-slate-700 px-3 py-1 text-xs disabled:opacity-40">{t.previous}</button><button disabled={cards.length<limit} onClick={()=>setPage(p=>p+1)} className="rounded border border-slate-700 px-3 py-1 text-xs disabled:opacity-40">{t.next}</button></div></div></section>
    <footer className="mt-5 flex justify-between text-xs text-slate-600"><span>{t.cron}</span></footer>
  </div></main>
}
