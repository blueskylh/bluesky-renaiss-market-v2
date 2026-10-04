const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const envPath = path.join(process.cwd(), '.env')
if (fs.existsSync(envPath)) for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) { const t=line.trim(); if (!t || t.startsWith('#')) continue; const i=t.indexOf('='); if(i>0 && !process.env[t.slice(0,i)]) process.env[t.slice(0,i)]=t.slice(i+1) }
const required = ['BACKEND_PORT','SURF_API_KEY','RENAISSOS_API_KEY','RENAISSOS_API_SECRET']
const missing = required.filter(k => !process.env[k])
if (missing.length) { console.error(`Missing required env vars: ${missing.join(', ')}`); process.exit(1) }
try { execFileSync(process.argv[2], process.argv.slice(3), { stdio:'inherit', env:process.env }) } catch (e) { process.exit(e.status || 1) }
