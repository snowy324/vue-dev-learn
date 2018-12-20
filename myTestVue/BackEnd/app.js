const path = require("path")
const Koa = require('koa')
const static = require('koa-static')
const app = new Koa()

const staticPath = '../FrontEnd/'

app.use(static(
  path.join( __dirname,  staticPath)
))

app.use(async ctx => {
    ctx.body = "hello world"
})

app.listen(3000)

console.log('Server is running at prot 3000 now!')