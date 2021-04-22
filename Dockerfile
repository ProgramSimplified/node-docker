FROM node:15
WORKDIR /app
COPY package.json .

# ARG 表明为构建镜像时传入的参数
ARG NODE_ENV
# 生产环境不需要安装 dev dependency，例如 nodemon, 只会在 dev 用到。
RUN if [ "$NODE_ENV" = "development" ]; \
        then npm install; \
        else npm install --only=production; \
        fi

COPY . ./

# 未指明 ARG 则为运行容器是传入的参数
EXPOSE $PORT
CMD ["node", "index.js"]
