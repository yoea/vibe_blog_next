#!/usr/bin/env node
const http = require('http')
const fs = require('fs')
const path = require('path')

const port = parseInt(process.env.PORT, 10) || 8083
const html = fs.readFileSync(
  path.join(__dirname, '..', 'public', 'maintenance.html'),
  'utf-8'
)

const server = http.createServer((_req, res) => {
  res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(html)
})

server.listen(port, () => {
  process.title = 'maintenance-server'
  console.log(`[maintenance] 维护页已启动 (port ${port})`)
})
