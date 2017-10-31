module.exports = function(server) {
  // var router = server.loopback.Router()
  // router.get('/', server.loopback.status())
  // server.use(router)
  server.engine('html', require('ejs').renderFile)
  server.set('view engine', 'html')
  let extraIncludes = ''
  let viewRelDir = '../../client/dist'
  server.use(require('connect-history-api-fallback')())
  if (process.env.NODE_ENV === 'dev') {
    viewRelDir = '../../client'
    extraIncludes = '<script type="text/javascript" src="/app.js"></script>'
    const webpack = require('webpack')
    const webpackDevMiddleware = require('webpack-dev-middleware')
    const config = require('../../client/build/webpack.dev.conf')
    const compiler = webpack(config)
    const hotMiddleware = require('webpack-hot-middleware')(compiler, {
      log: false,
      heartbeat: 2000
    })
    server.use(hotMiddleware)
    server.use(
      webpackDevMiddleware(compiler, {
        publicPath: config.output.publicPath,
        hot: true
      })
    )
  }
  server.set('views', require('path').join(__dirname, viewRelDir))
  server.get(/^\/(index\.html)?$/, (req, res) => {
    res.render('index.html', {
      ApiUrlPrefix: req.app.get('restApiRoot'),
      ExtraIncludes: extraIncludes,
      ApiExplorerUrlPrefix:
        req.app.get('loopback-component-explorer') &&
        req.app.get('loopback-component-explorer').mountPath
    })
  })
}
