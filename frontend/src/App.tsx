import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './lib/api'
import renaissLogo from './assets/renaiss-logo.jpg'
import blueskylhAvatar from './assets/blueskylh-avatar.png'

type Confidence = 'prime' | 'high' | 'medium' | 'low'
type SortKey = 'spreadUsd'
type SortOrder = 'asc' | 'desc'
type Language = 'zh-CN' | 'zh-TW' | 'en' | 'ja' | 'ko'
type Card = {
  token_id:string
  name:string
  set_name:string
  card_number:string
  language?:string|null
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
type Stats = { withAskPrice:number; totalValue:number; withIndexPrice:number; arbitrageValueUsd:number }

type Copy = {
  title:string
  guideTitle:string
  guideIntro:string
  guideStep1:string
  guideStep2:string
  guideStep3:string
  guideNote:string
  register:string
  follow:string
  github:string
  serialTool:string
  refresh:string
  listedCards:string
  listedValue:string
  indexPrices:string
  indexCoverage:string
  arbitrageValue:string
  sortLabel:string
  clearFilters:string
  close:string
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
  matchQuality:string
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
    title:'Renaiss 卡牌套利助手', guideTitle:'第一次使用？看这 3 步', guideIntro:'这个工具会比较 Renaiss 当前挂牌价与 Index 参考价，帮你找出可能的低价机会。', guideStep1:'看价差：绿色价差越大，代表参考价高于挂牌价。', guideStep2:'看卡牌：点击图片查看大图，确认卡牌、评级和编号。', guideStep3:'去核实：打开 Renaiss 和 Index 页面，再决定是否行动。', guideNote:'Index 是参考价格，不代表保证成交价或最终利润。', register:'立即注册 Renaiss', follow:'关注', github:'我的 GitHub', serialTool:'Renaiss 在售连号工具', refresh:'刷新数据', listedCards:'市场挂牌数', listedValue:'当前挂牌总额', indexPrices:'有参考价的卡牌', indexCoverage:'覆盖率', arbitrageValue:'理论价差总额', sortLabel:'排序', clearFilters:'清除筛选', close:'关闭', searchPlaceholder:'搜索名称、Token ID 或 Serial', allConfidence:'匹配质量：全部', onlyOpportunities:'只看低价机会', sectionTitle:'可能的低价机会', spreadFormula:'怎么读：绿色价差 = Index 参考价 − Renaiss 挂牌价。先看价差，再打开链接核实。', lastSync:'最后同步', card:'卡牌', askPrice:'Renaiss 当前挂牌', indexPrice:'Index 参考价 (USD)', spread:'价差', roi:'ROI', sortAscending:'升序', sortDescending:'降序', confidence:'confidence', matchQuality:'匹配质量', updated:'更新时间', links:'链接', loading:'加载中…', empty:'没有符合条件的卡牌。', page:'第 {page} 页', previous:'上一页', next:'下一页', unknownSerial:'未识别证书', renaissLink:'Renaiss', indexLink:'Index', cron:'每日 UTC 03:00 自动同步，部署平台 Cron 负责触发。', language:'语言', marketLoadError:'市场数据加载失败',
  },
  'zh-TW': {
    title:'Renaiss 卡牌套利助手', guideTitle:'第一次使用？看這 3 步', guideIntro:'這個工具會比較 Renaiss 當前掛牌價與 Index 參考價，幫你找出可能的低價機會。', guideStep1:'看價差：綠色價差越大，代表參考價高於掛牌價。', guideStep2:'看卡牌：點擊圖片查看大圖，確認卡牌、評級和編號。', guideStep3:'去核實：打開 Renaiss 和 Index 頁面，再決定是否行動。', guideNote:'Index 是參考價格，不代表保證成交價或最終利潤。', register:'立即註冊 Renaiss', follow:'關注', github:'我的 GitHub', serialTool:'Renaiss 在售連號工具', refresh:'重新整理', listedCards:'市場掛牌數', listedValue:'當前掛牌總額', indexPrices:'有參考價的卡牌', indexCoverage:'覆蓋率', arbitrageValue:'理論價差總額', sortLabel:'排序', clearFilters:'清除篩選', close:'關閉', searchPlaceholder:'搜尋名稱、Token ID 或 Serial', allConfidence:'匹配品質：全部', onlyOpportunities:'只看低價機會', sectionTitle:'可能的低價機會', spreadFormula:'怎麼看：綠色價差 = Index 參考價 − Renaiss 掛牌價。先看價差，再打開連結核實。', lastSync:'最後同步', card:'卡牌', askPrice:'Renaiss 當前掛牌', indexPrice:'Index 參考價 (USD)', spread:'價差', roi:'ROI', sortAscending:'升冪', sortDescending:'降冪', confidence:'confidence', matchQuality:'匹配品質', updated:'更新時間', links:'連結', loading:'載入中…', empty:'沒有符合條件的卡牌。', page:'第 {page} 頁', previous:'上一頁', next:'下一頁', unknownSerial:'未識別證書', renaissLink:'Renaiss', indexLink:'Index', cron:'每日 UTC 03:00 自動同步，由部署平台 Cron 觸發。', language:'語言', marketLoadError:'市場資料載入失敗',
  },
  en: {
    title:'Renaiss Card Opportunity Finder', guideTitle:'New here? Start in 3 steps', guideIntro:'Compare the current Renaiss ask with the Index reference price to find potential price opportunities.', guideStep1:'Read the spread: a larger green spread means the reference price is above the ask.', guideStep2:'Inspect the card: click the image to confirm the card, grade, and number.', guideStep3:'Verify before acting: open both Renaiss and Index, then decide.', guideNote:'Index is a reference price, not a guaranteed sale price or profit.', register:'Register on Renaiss', follow:'Follow', github:'My GitHub', serialTool:'Renaiss Serial Tool', refresh:'Refresh', listedCards:'Market Listings', listedValue:'Current Ask Total', indexPrices:'Cards with Reference Price', indexCoverage:'Coverage', arbitrageValue:'Total Price Gap', sortLabel:'Sort', clearFilters:'Clear filters', close:'Close', searchPlaceholder:'Search name, Token ID, or Serial', allConfidence:'Match quality: All', onlyOpportunities:'Only price opportunities', sectionTitle:'Potential Price Opportunities', spreadFormula:'How to read: green spread = Index reference price − Renaiss ask. Check the spread, then verify both links.', lastSync:'Last sync', card:'Card', askPrice:'Renaiss Current Ask', indexPrice:'Index Reference Price (USD)', spread:'Spread', roi:'ROI', sortAscending:'Ascending', sortDescending:'Descending', confidence:'Confidence', matchQuality:'Match quality', updated:'Updated', links:'Links', loading:'Loading…', empty:'No cards match your filters.', page:'Page {page}', previous:'Previous', next:'Next', unknownSerial:'Unidentified cert', renaissLink:'Renaiss', indexLink:'Index', cron:'Automatic sync daily at 03:00 UTC, triggered by the deployment Cron.', language:'Language', marketLoadError:'Failed to load market data',
  },
  ja: {
    title:'Renaiss カード価格機会ファインダー', guideTitle:'初めての方へ：3ステップ', guideIntro:'Renaiss の現在の出品価格と Index の参考価格を比べ、価格差のあるカードを見つけます。', guideStep1:'価格差を見る：緑の価格差が大きいほど、参考価格が出品価格を上回っています。', guideStep2:'カードを確認：画像をクリックしてカード、グレード、番号を確認します。', guideStep3:'確認して判断：Renaiss と Index の両方を開いてから判断します。', guideNote:'Index は参考価格であり、成約価格や利益を保証するものではありません。', register:'Renaiss に登録', follow:'フォロー', github:'GitHub', serialTool:'Renaiss 連番ツール', refresh:'更新', listedCards:'市場の出品数', listedValue:'現在の出品総額', indexPrices:'参考価格あり', indexCoverage:'カバレッジ', arbitrageValue:'理論価格差合計', sortLabel:'並べ替え', clearFilters:'フィルターを解除', close:'閉じる', searchPlaceholder:'名前、Token ID、Serial を検索', allConfidence:'一致品質：すべて', onlyOpportunities:'価格機会のみ', sectionTitle:'価格機会の候補', spreadFormula:'見方：緑の価格差 = Index 参考価格 − Renaiss 出品価格。価格差を確認し、両方のリンクを開いてください。', lastSync:'最終同期', card:'カード', askPrice:'Renaiss 現在の出品', indexPrice:'Index 参考価格 (USD)', spread:'価格差', roi:'ROI', sortAscending:'昇順', sortDescending:'降順', confidence:'信頼度', matchQuality:'一致品質', updated:'更新日時', links:'リンク', loading:'読み込み中…', empty:'条件に一致するカードはありません。', page:'{page} ページ', previous:'前へ', next:'次へ', unknownSerial:'証明書番号なし', renaissLink:'Renaiss', indexLink:'Index', cron:'毎日 03:00 UTC に自動同期。デプロイ環境の Cron が実行します。', language:'言語', marketLoadError:'マーケットデータの読み込みに失敗しました',
  },
  ko: {
    title:'Renaiss 카드 가격 기회 찾기', guideTitle:'처음이라면? 3단계로 시작하세요', guideIntro:'Renaiss 현재 판매가와 Index 기준가를 비교해 가격 차이가 있는 카드를 찾습니다.', guideStep1:'가격 차이 보기: 초록색 차이가 클수록 기준가가 판매가보다 높습니다.', guideStep2:'카드 확인하기: 이미지를 클릭해 카드, 등급, 번호를 확인하세요.', guideStep3:'확인 후 판단하기: Renaiss와 Index를 모두 열어 확인한 뒤 결정하세요.', guideNote:'Index는 참고 가격이며 실제 판매가나 수익을 보장하지 않습니다.', register:'Renaiss 가입', follow:'팔로우', github:'내 GitHub', serialTool:'Renaiss 연번 도구', refresh:'새로고침', listedCards:'시장 판매 카드', listedValue:'현재 판매 총액', indexPrices:'기준가가 있는 카드', indexCoverage:'커버리지', arbitrageValue:'이론 가격 차이 합계', sortLabel:'정렬', clearFilters:'필터 지우기', close:'닫기', searchPlaceholder:'이름, Token ID 또는 Serial 검색', allConfidence:'일치 품질: 전체', onlyOpportunities:'가격 기회만 보기', sectionTitle:'가격 기회 후보', spreadFormula:'보는 법: 초록색 차이 = Index 기준가 − Renaiss 판매가. 차이를 확인한 뒤 두 링크를 모두 확인하세요.', lastSync:'마지막 동기화', card:'카드', askPrice:'Renaiss 현재 판매가', indexPrice:'Index 기준가 (USD)', spread:'가격 차이', roi:'ROI', sortAscending:'오름차순', sortDescending:'내림차순', confidence:'신뢰도', matchQuality:'일치 품질', updated:'업데이트', links:'링크', loading:'불러오는 중…', empty:'조건에 맞는 카드가 없습니다.', page:'{page}페이지', previous:'이전', next:'다음', unknownSerial:'인증서 번호 없음', renaissLink:'Renaiss', indexLink:'Index', cron:'매일 03:00 UTC 자동 동기화. 배포 플랫폼 Cron이 실행합니다.', language:'언어', marketLoadError:'시장 데이터를 불러오지 못했습니다',
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
const time = (s:string|null|undefined, language:Language) => s ? new Date(s).toLocaleString(locales[language]) : '—'
const badge:Record<string,string> = { prime:'bg-emerald-400/15 text-emerald-300', high:'bg-blue-400/15 text-blue-300', medium:'bg-amber-400/15 text-amber-300', low:'bg-red-400/15 text-red-300' }

export default function App() {
  const [language,setLanguage] = useState<Language>('zh-CN')
  const [cards,setCards] = useState<Card[]>([])
  const [totalResults,setTotalResults] = useState(0)
  const [stats,setStats] = useState<Stats|null>(null)
  const [lastSync,setLastSync] = useState<any>(null)
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState('')
  const [search,setSearch] = useState('')
  const [confidence,setConfidence] = useState('')
  const [onlyOpp,setOnlyOpp] = useState(true)
  const [page,setPage] = useState(0)
  const [sort,setSort] = useState<{key:SortKey;order:SortOrder}>({key:'spreadUsd',order:'desc'})
  const [imageModal,setImageModal] = useState<{src:string;alt:string}|null>(null)
  const requestController = useRef<AbortController|null>(null)
  const limit = 20
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
      const [a,b,c] = await Promise.all([
        fetch(api(`market/collectibles?${q}`),{signal}),
        fetch(api('market/stats'),{signal}),
        fetch(api('market/sync-status'),{signal}),
      ])
      if(!a.ok) throw new Error(t.marketLoadError)
      const [collection,nextStats,nextSync] = await Promise.all([a.json(),b.ok?b.json():null,c.ok?c.json():null])
      if(signal.aborted) return
      setCards(collection.collection || [])
      setTotalResults(Number(collection.total || 0))
      setStats(nextStats)
      setLastSync(nextSync)
    } catch(e) {
      if(!signal.aborted) setError(e instanceof Error ? e.message : t.marketLoadError)
    } finally {
      if(!signal.aborted) setLoading(false)
    }
  },[page,search,confidence,onlyOpp,t.marketLoadError,sort.key,sort.order])

  useEffect(()=>{
    void load()
    return ()=>requestController.current?.abort()
  },[load])

  useEffect(() => {
    if(!imageModal) return
    const onKeyDown = (event:KeyboardEvent) => { if(event.key === 'Escape') setImageModal(null) }
    window.addEventListener('keydown',onKeyDown)
    return () => window.removeEventListener('keydown',onKeyDown)
  },[imageModal])

  const clearFilters = () => {
    setSearch('')
    setConfidence('')
    setOnlyOpp(true)
    setPage(0)
    setSort({key:'spreadUsd',order:'desc'})
  }

  const setSortValue = (value:string) => {
    const [key,order] = value.split(':') as [SortKey,SortOrder]
    setPage(0)
    setSort({key,order})
  }

  const statsItems:[string,string|number][] = [
    [t.listedCards,stats?.withAskPrice||0],
    [t.listedValue,money(stats?.totalValue,language)],
    [t.indexPrices,stats?.withIndexPrice||0],
    [t.arbitrageValue,money(stats?.arbitrageValueUsd,language)],
  ]

  return <main className="min-h-screen bg-[#0b0e14] text-slate-100">
    <div className="mx-auto max-w-[1500px] px-5 py-7 lg:px-8 lg:py-9">
      <header className="relative mb-8 overflow-hidden rounded-[28px] border border-fuchsia-400/15 bg-[radial-gradient(circle_at_78%_0%,rgba(217,70,239,.16),transparent_38%),linear-gradient(120deg,rgba(24,20,39,.98),rgba(20,15,29,.98))] px-6 py-6 shadow-2xl shadow-fuchsia-950/20 lg:px-8">
        <div className="absolute -right-24 -top-32 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 xl:flex-row xl:items-center">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white shadow-[0_0_30px_rgba(236,72,153,.2)]"><img src={renaissLogo} alt="Renaiss logo" className="h-full w-full object-cover"/></div>
            <div>
              <div className="mb-1 text-sm font-bold uppercase tracking-[.18em] text-pink-400">Renaiss Market v2</div>
              <h1 className="text-3xl font-black tracking-tight md:text-4xl">{t.title}</h1>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
                <span className="rounded-full border border-slate-700/80 bg-slate-950/40 px-3 py-1.5">{t.lastSync}：{time(lastSync?.finished_at,language)}</span>
              </div>
            </div>
          </div>
          <div className="relative flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="language-select">{t.language}</label>
            <select id="language-select" value={language} onChange={e=>setLanguage(e.target.value as Language)} className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-300 outline-none transition hover:border-slate-400 focus:border-pink-400">{languageOptions.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
            <a href="https://www.renaiss.xyz/ref/blueskyone" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-pink-500/20 transition hover:-translate-y-0.5 hover:from-pink-400 hover:to-fuchsia-400"><img src={renaissLogo} alt="" className="h-5 w-5 rounded bg-white object-cover"/>{t.register} ↗</a>
            <a href="https://x.com/blueskylh1" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-sky-400/35 bg-sky-400/10 px-3.5 py-2.5 text-sm font-semibold text-sky-100 transition hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-400/20"><img src={blueskylhAvatar} alt="blueskylh1 avatar" className="h-6 w-6 rounded-full object-cover ring-1 ring-sky-300/50"/><span><span className="block text-[10px] uppercase tracking-wider text-sky-300">{t.follow}</span><span className="block leading-none">@blueskylh1 ↗</span></span></a>
            <a href="https://github.com/blueskylh/bluesky-renaiss-market-v2" target="_blank" rel="noreferrer" className="rounded-xl border border-slate-700 bg-slate-950/30 px-4 py-2.5 text-sm text-slate-300 transition hover:-translate-y-0.5 hover:border-slate-400">{t.github} ↗</a>
            <a href="https://renaiss-tool-689931.napa.de5.net/" target="_blank" rel="noreferrer" className="rounded-xl border border-emerald-400/35 bg-emerald-400/10 px-4 py-2.5 text-sm font-semibold text-emerald-100 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-400/20">{t.serialTool} ↗</a>
          </div>
        </div>
      </header>

      <section className="mb-6 rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/[0.06] p-5 shadow-lg shadow-fuchsia-950/10">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between"><div><h2 className="text-base font-bold text-fuchsia-100">{t.guideTitle}</h2><p className="mt-1 max-w-4xl text-sm leading-6 text-slate-300">{t.guideIntro}</p></div><span className="text-xs leading-5 text-slate-500 lg:max-w-xs lg:text-right">{t.guideNote}</span></div>
        <div className="mt-4 grid gap-3 md:grid-cols-3"><div className="rounded-xl border border-slate-700/70 bg-slate-950/35 p-3 text-sm leading-5 text-slate-300"><span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-pink-500/20 text-xs font-black text-pink-200">1</span>{t.guideStep1}</div><div className="rounded-xl border border-slate-700/70 bg-slate-950/35 p-3 text-sm leading-5 text-slate-300"><span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-pink-500/20 text-xs font-black text-pink-200">2</span>{t.guideStep2}</div><div className="rounded-xl border border-slate-700/70 bg-slate-950/35 p-3 text-sm leading-5 text-slate-300"><span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-pink-500/20 text-xs font-black text-pink-200">3</span>{t.guideStep3}</div></div>
      </section>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statsItems.map(([label,value])=><div key={String(label)} className="rounded-2xl border border-slate-800 bg-slate-900/75 p-5 shadow-lg shadow-black/10"><div className="text-xs uppercase tracking-widest text-slate-500">{label}</div><div className="mt-2 text-2xl font-black">{typeof value==='number'?value.toLocaleString(locales[language]):value}</div>{label===t.indexPrices&&<div className="mt-2 text-xs text-slate-500">{t.indexCoverage}：{stats?.withAskPrice?`${((stats.withIndexPrice/stats.withAskPrice)*100).toFixed(1)}%`:'—'}</div>}</div>)}
      </section>

      <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-black/10">
        <div className="flex flex-col gap-3 xl:flex-row">
          <input value={search} onChange={e=>{setPage(0);setSearch(e.target.value)}} placeholder={t.searchPlaceholder} className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm outline-none transition focus:border-pink-400"/>
          <select value={confidence} aria-label={t.allConfidence} onChange={e=>{setPage(0);setConfidence(e.target.value)}} className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-3 text-sm"><option value="">{t.allConfidence}</option>{(['prime','high','medium','low'] as Confidence[]).map(item=><option key={item} value={item}>{confidenceLabels[language][item]}</option>)}</select>
          <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-400"><span>{t.sortLabel}</span><select value={`${sort.key}:${sort.order}`} aria-label={t.sortLabel} onChange={e=>setSortValue(e.target.value)} className="bg-transparent text-slate-200 outline-none"><option value="spreadUsd:desc">{t.spread} ↓</option><option value="spreadUsd:asc">{t.spread} ↑</option></select></label>
          <label className="flex items-center gap-2 rounded-xl border border-transparent px-1 text-sm whitespace-nowrap"><input type="checkbox" checked={onlyOpp} onChange={e=>{setPage(0);setOnlyOpp(e.target.checked)}} className="h-4 w-4 accent-pink-500"/>{t.onlyOpportunities}</label>
          <button onClick={clearFilters} className="rounded-xl border border-slate-700 px-4 py-3 text-sm transition hover:border-slate-400">{t.clearFilters}</button><button onClick={()=>void load()} className="rounded-xl border border-slate-700 px-4 py-3 text-sm transition hover:border-pink-400">{t.refresh}</button>
        </div>
        {error&&<div className="mt-3 rounded-xl bg-red-950/50 px-4 py-3 text-sm text-red-300">{error}</div>}
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 px-1">
          <div><div className="flex items-center gap-2"><span className="text-xl text-fuchsia-400">ϟ</span><h2 className="text-xl font-black">{t.sectionTitle}</h2><span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-xs font-bold text-emerald-300">{totalResults}</span></div><p className="mt-1 text-sm text-slate-500">{t.spreadFormula}</p></div>
          <div className="text-xs text-slate-500">{t.page.replace('{page}',String(page+1))}</div>
        </div>
        {loading?<div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-16 text-center text-slate-500">{t.loading}</div>:cards.length===0?<div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-16 text-center text-slate-500">{t.empty}</div>:<div className="grid gap-5 xl:grid-cols-2">{cards.map((card,index)=>{
          const positive = (card.spreadUsd ?? 0) >= 0
          return <article key={card.token_id} className="group/card rounded-3xl border border-slate-800 bg-[linear-gradient(135deg,rgba(19,24,40,.98),rgba(14,17,27,.98))] p-5 shadow-xl shadow-black/15 transition duration-200 hover:-translate-y-0.5 hover:border-fuchsia-400/35 hover:shadow-fuchsia-950/20">
            <div className="mb-5 flex items-start justify-between gap-3"><div className="flex items-center gap-2"><span className="text-xs font-mono text-slate-600">#{page*limit+index+1}</span><span className="text-lg text-fuchsia-400">ϟ</span><span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-2.5 py-1 text-xs font-bold text-fuchsia-200">{t.sectionTitle}</span></div><div className="flex flex-wrap justify-end gap-2"><span className={`rounded-full px-3 py-1 text-xs font-black ${positive?'bg-emerald-400/15 text-emerald-300':'bg-red-400/15 text-red-300'}`}>{t.spread} {money(card.spreadUsd,language)}</span></div></div>
            <div className="flex flex-col gap-5 sm:flex-row">
              <div className="flex shrink-0 justify-center sm:w-44 sm:items-start"><div className="relative flex h-64 w-44 items-center justify-center overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950/70 p-2 shadow-inner shadow-black/50">{card.front_image_url?<button type="button" onClick={()=>setImageModal({src:card.front_image_url!,alt:card.name})} className="group/image h-full w-full cursor-zoom-in rounded-xl focus-visible:outline-2 focus-visible:outline-pink-400"><img src={card.front_image_url} alt={card.name} className="h-full w-full rounded-xl object-contain transition-transform duration-200 group-hover/image:scale-[1.04]"/></button>:<div className="h-full w-full rounded-xl bg-slate-800"/>}<span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-slate-950/80 px-2 py-1 text-[10px] text-slate-400">⌕</span></div></div>
              <div className="min-w-0 flex-1"><h3 className="text-lg font-bold leading-snug text-slate-100" title={card.name}>{card.name}</h3><p className="mt-2 text-sm text-slate-400">{card.set_name||'—'} · #{card.card_number||'—'}</p><p className="mt-1 truncate text-xs font-mono text-slate-500">{card.serial||t.unknownSerial}</p><div className="mt-3 flex flex-wrap gap-2">{card.confidence&&<span className={`rounded-full px-2.5 py-1 text-xs font-bold ${badge[card.confidence]||'bg-slate-800 text-slate-300'}`}>{t.matchQuality}：{confidenceLabels[language][card.confidence]}</span>}<span className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-400">{card.language||'—'}</span></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl border border-slate-800 bg-slate-950/45 p-3"><div className="text-xs text-slate-500">{t.askPrice}</div><div className="mt-1 font-mono text-lg font-bold text-slate-100">{money(card.ask_price_usdt,language)}</div></div><div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-3"><div className="text-xs text-slate-500">{t.indexPrice}</div><div className="mt-1 font-mono text-lg font-bold text-emerald-300">{money(card.indexPriceUsd,language)}</div></div></div><div className="mt-4 flex flex-wrap gap-2"><div className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-400">{t.updated}：{time(card.last_sale_at||card.observed_at,language)}</div></div><div className="mt-5 flex flex-wrap gap-2"><a href={card.renaissUrl||'#'} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold transition hover:border-pink-400">{t.renaissLink} ↗</a>{card.indexUrl&&<a href={card.indexUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold transition hover:border-cyan-400">{t.indexLink} ↗</a>}</div></div>
            </div>
          </article>
        })}</div>}
        <div className="mt-5 flex justify-end gap-2"><button disabled={!page} onClick={()=>setPage(p=>Math.max(0,p-1))} className="rounded-xl border border-slate-700 px-4 py-2 text-sm disabled:opacity-40">{t.previous}</button><button disabled={cards.length<limit} onClick={()=>setPage(p=>p+1)} className="rounded-xl border border-slate-700 px-4 py-2 text-sm disabled:opacity-40">{t.next}</button></div>
      </section>

      <footer className="mt-7 flex justify-between text-xs text-slate-600"><span>{t.cron}</span></footer>
      {imageModal&&<div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={imageModal.alt} onClick={()=>setImageModal(null)}><div className="relative max-h-[92vh] max-w-[92vw] rounded-3xl border border-pink-400/40 bg-slate-950/95 p-3 shadow-2xl shadow-fuchsia-950/40" onClick={event=>event.stopPropagation()}><button type="button" onClick={()=>setImageModal(null)} aria-label={t.close} className="absolute -right-3 -top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-slate-600 bg-slate-900 text-xl text-slate-200 shadow-lg transition hover:border-pink-400 hover:text-white">×</button><img src={imageModal.src} alt={imageModal.alt} className="max-h-[82vh] max-w-[86vw] rounded-2xl object-contain"/><div className="mt-3 max-w-[86vw] truncate px-1 text-center text-sm text-slate-300">{imageModal.alt}</div></div></div>}
    </div>
  </main>
}
