import { useCallback, useEffect, useState } from 'react'
import { api } from './lib/api'

type Confidence = 'prime' | 'high' | 'medium' | 'low'
type Card = { token_id:string; name:string; set_name:string; card_number:string; serial?:string|null; front_image_url?:string|null; ask_price_usdt:number; priceUsdCents:number|null; indexPriceUsd:number|null; spreadUsd:number|null; roiPct:number|null; confidence:Confidence|null; renaissUrl?:string|null; indexUrl?:string|null; last_sale_at?:string|null; observed_at?:string|null }
type Stats = { withAskPrice:number; totalValue:number; withIndexPrice:number; opportunities:number }

const money = (n:number|null|undefined) => n == null || !Number.isFinite(n) ? '—' : `$${n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const percent = (n:number|null|undefined) => n == null || !Number.isFinite(n) ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
const time = (s:string|null|undefined) => s ? new Date(s).toLocaleString() : '—'
const badge:Record<string,string> = { prime:'bg-emerald-400/15 text-emerald-300', high:'bg-blue-400/15 text-blue-300', medium:'bg-amber-400/15 text-amber-300', low:'bg-red-400/15 text-red-300' }

export default function App() {
  const [cards,setCards] = useState<Card[]>([])
  const [stats,setStats] = useState<Stats|null>(null)
  const [lastSync,setLastSync] = useState<any>(null)
  const [loading,setLoading] = useState(true)
  const [syncing,setSyncing] = useState(false)
  const [error,setError] = useState('')
  const [search,setSearch] = useState('')
  const [confidence,setConfidence] = useState('')
  const [onlyOpp,setOnlyOpp] = useState(true)
  const [page,setPage] = useState(0)
  const limit = 100

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const q = new URLSearchParams({limit:String(limit),offset:String(page*limit)})
      if(search.trim()) q.set('search',search.trim())
      if(confidence) q.set('confidence',confidence)
      if(onlyOpp) q.set('onlyOpportunities','true')
      const [a,b,c] = await Promise.all([fetch(api(`market/collectibles?${q}`)),fetch(api('market/stats')),fetch(api('market/sync-status'))])
      if(!a.ok) throw new Error('市场数据加载失败')
      setCards((await a.json()).collection || [])
      if(b.ok) setStats(await b.json())
      if(c.ok) setLastSync(await c.json())
    } catch(e) { setError(e instanceof Error ? e.message : '加载失败') } finally { setLoading(false) }
  },[page,search,confidence,onlyOpp])
  useEffect(()=>{ void load() },[load])

  async function sync() {
    setSyncing(true); setError('')
    try { const r=await fetch(api('sync'),{method:'POST'}); const d=await r.json(); if(!r.ok) throw new Error(d.error || '同步失败'); await load() }
    catch(e) { setError(e instanceof Error ? e.message : '同步失败') }
    finally { setSyncing(false) }
  }

  return <main className="min-h-screen bg-[#0b0e14] text-slate-100"><div className="mx-auto max-w-[1600px] px-5 py-8 lg:px-8">
    <header className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><div className="mb-2 text-sm font-bold uppercase tracking-[.18em] text-pink-400">Renaiss Market v2</div><h1 className="text-3xl font-black md:text-4xl">跨市场套利监控</h1><p className="mt-2 text-sm text-slate-400">Renaiss 当前挂牌价 vs Renaiss Index <code>priceUsdCents</code>，保留 Index confidence 置信度。</p></div><div className="flex gap-3"><a href="https://index.renaissos.com" target="_blank" rel="noreferrer" className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-400">打开 Index ↗</a><button onClick={()=>void sync()} disabled={syncing} className="rounded-lg bg-pink-500 px-4 py-2 text-sm font-bold hover:bg-pink-400 disabled:opacity-50">{syncing?'同步中…':'立即同步'}</button></div></header>
    <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[['已挂牌卡牌',stats?.withAskPrice||0],['挂牌总价值',money(stats?.totalValue)],['已有 Index 价格',stats?.withIndexPrice||0],['套利候选',stats?.opportunities||0]].map(([a,b])=><div key={String(a)} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"><div className="text-xs uppercase tracking-widest text-slate-500">{a}</div><div className="mt-2 text-2xl font-black">{typeof b==='number'?b.toLocaleString():b}</div></div>)}</section>
    <section className="mb-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-4"><div className="flex flex-col gap-3 lg:flex-row"><input value={search} onChange={e=>{setPage(0);setSearch(e.target.value)}} placeholder="搜索名称、Token ID 或 Serial" className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-pink-400"/><select value={confidence} onChange={e=>{setPage(0);setConfidence(e.target.value)}} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"><option value="">所有置信度</option><option value="prime">Prime</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyOpp} onChange={e=>{setPage(0);setOnlyOpp(e.target.checked)}} className="accent-pink-500"/>只看套利候选</label><button onClick={()=>void load()} className="rounded-lg border border-slate-700 px-4 py-2 text-sm">刷新</button></div>{error&&<div className="mt-3 rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">{error}</div>}</section>
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70"><div className="flex justify-between border-b border-slate-800 px-5 py-4"><div><h2 className="font-bold">套利候选</h2><p className="mt-1 text-xs text-slate-500">价差 = Renaiss Index 参考价 − Renaiss 当前挂牌价</p></div><div className="text-xs text-slate-500">最后同步：{time(lastSync?.finished_at)}</div></div>{loading?<div className="p-10 text-center text-slate-500">加载中…</div>:cards.length===0?<div className="p-10 text-center text-slate-500">没有符合条件的卡牌。</div>:<div className="overflow-x-auto"><table className="min-w-[1080px] w-full text-left text-sm"><thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">卡牌</th><th className="px-3 py-3">Renaiss 挂牌</th><th className="px-3 py-3">Index priceUsdCents</th><th className="px-3 py-3">价差 / ROI</th><th className="px-3 py-3">confidence</th><th className="px-3 py-3">更新时间</th><th className="px-5 py-3">链接</th></tr></thead><tbody className="divide-y divide-slate-800/80">{cards.map(card=><tr key={card.token_id} className="hover:bg-slate-800/35"><td className="px-5 py-4"><div className="flex min-w-[310px] items-center gap-3">{card.front_image_url?<img src={card.front_image_url} alt="" className="h-14 w-10 rounded object-cover"/>:<div className="h-14 w-10 rounded bg-slate-800"/>}<div className="min-w-0"><div className="truncate font-semibold" title={card.name}>{card.name}</div><div className="mt-1 text-xs text-slate-500">{card.set_name||'—'} · #{card.card_number||'—'} · {card.serial||'未识别证书'}</div></div></div></td><td className="px-3 py-4 font-mono">{money(card.ask_price_usdt)}</td><td className="px-3 py-4"><div className="font-mono font-semibold text-emerald-300">{money(card.indexPriceUsd)}</div><div className="mt-1 text-xs text-slate-500">{card.priceUsdCents==null?'无价格':`${card.priceUsdCents} cents`}</div></td><td className="px-3 py-4"><div className="font-mono font-bold text-emerald-300">{money(card.spreadUsd)}</div><div className="mt-1 text-xs text-emerald-400">{percent(card.roiPct)} ROI</div></td><td className="px-3 py-4">{card.confidence?<span className={`rounded-full px-2.5 py-1 text-xs font-bold ${badge[card.confidence]||'bg-slate-800 text-slate-300'}`}>{card.confidence}</span>:'—'}</td><td className="px-3 py-4 text-xs text-slate-500">{time(card.last_sale_at||card.observed_at)}</td><td className="px-5 py-4"><div className="flex gap-2 whitespace-nowrap">{card.renaissUrl&&<a href={card.renaissUrl} target="_blank" rel="noreferrer" className="rounded border border-slate-700 px-2 py-1 text-xs hover:border-pink-400">Renaiss ↗</a>}{card.indexUrl&&<a href={card.indexUrl} target="_blank" rel="noreferrer" className="rounded border border-slate-700 px-2 py-1 text-xs hover:border-cyan-400">Index ↗</a>}</div></td></tr>)}</tbody></table></div>}<div className="flex justify-between border-t border-slate-800 px-5 py-3"><span className="text-xs text-slate-500">第 {page+1} 页</span><div className="flex gap-2"><button disabled={!page} onClick={()=>setPage(p=>Math.max(0,p-1))} className="rounded border border-slate-700 px-3 py-1 text-xs disabled:opacity-40">上一页</button><button disabled={cards.length<limit} onClick={()=>setPage(p=>p+1)} className="rounded border border-slate-700 px-3 py-1 text-xs disabled:opacity-40">下一页</button></div></div></section>
    <footer className="mt-5 flex justify-between text-xs text-slate-600"><span>每日 UTC 03:00 自动同步，部署平台 Cron 负责触发。</span><span>priceUsdCents ÷ 100 = USD</span></footer>
  </div></main>
}
