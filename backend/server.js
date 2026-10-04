const path = require('node:path')
const { createServer } = require('@surf-ai/sdk/server')

createServer({
  routesDir: path.join(__dirname, 'routes'),
  cronDir: path.join(__dirname, '..'),
}).start()
