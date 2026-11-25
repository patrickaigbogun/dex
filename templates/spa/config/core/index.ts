import router from './router'
import server from './server'
import api from './api'
import build from './build'

export default {
  ...build,
  ...server,
  ...router,
  ...api,
  router,
  server,
  api,
  build,
}
