const express = require('express')
const mongoose = require('mongoose')
const session = require('express-session')
const redis = require('redis')
const cors = require('cors')
const {
  MONGO_IP,
  MONGO_USER,
  MONGO_PASSWORD,
  MONGO_PROT,
  REDIS_URL,
  REDIS_PORT,
  SESSION_SECRET
} = require('./config/config')

let RedisStore = require('connect-redis')(session)
let redisClient = redis.createClient({
  host: REDIS_URL,
  port: REDIS_PORT
})

const postRouter = require('./routes/postRoutes')
const userRouter = require('./routes/userRoutes')

const app = express()

/**
 * 查看 docker network 找到 mongo ip
 * docker inspect <container name>
 * here is: docker inspect node-docker_mongo_1
 * 不建议直接使用 ip
 */
// mongoose.connect(
//   'mongodb://yangyong:mypassword@192.168.208.2:27017/?adminSource=admin'
// ).then(() => console.log('successfully connected to DB'))
// .catch((e) => console.log(e))

// 推荐直接使用 docker-compose.yml 中 service 容器名称或者实际容器名称（作为 DNS 域名），docker 容器间可通过内部 DNS 服务互相通信
// https://docs.docker.com/config/containers/container-networking/
const mongoURL = `mongodb://${MONGO_USER}:${MONGO_PASSWORD}@${MONGO_IP}:${MONGO_PROT}/?adminSource=admin`

const connectWithRetry = () => {
  mongoose
    .connect(mongoURL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false
    })
    .then(() => console.log('successfully connected to DB'))
    .catch((e) => {
      console.log(e)
      setTimeout(connectWithRetry, 5000)
    })
}

connectWithRetry()

// 配合 nginx 代理
app.enable('trust proxy')
app.use(cors({}))
app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: SESSION_SECRET,
    cookie: {
      secure: false,
      resave: false,
      saveUninitialized: false,
      httpOnly: true,
      maxAge: 30000
    }
  })
)

app.use(express.json())

app.get('/api/v1', (req, res) => {
  console.log('yeah it ran')
  res.send('<h2>Hi There！I am yang yong!!!</h2>')
})

// localhost:3000/api/v1/posts/
app.use('/api/v1/posts', postRouter)
app.use('/api/v1/users', userRouter)

const port = process.env.PORT || 3000

app.listen(port, () => console.log(`listen on port ${port}`))
