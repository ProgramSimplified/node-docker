# Node-Docker

## no compose

1. docker build -t node-app-image .
2. docker run -v $(pwd):/app:ro -v /app/node_modules --env-file ./.env  -p 3000:4000 -d --name node-app  node-app-image
3. docker exec -it node-app bash

## compose

-d 后台执行，--build 会强制重新构建镜像
- dev：docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d [--build]

通过启动 docker 容器时，同时会启动两个 node-app 集群，配合 nginx 负载均衡.

> 你可能会问：`为什么启动两个 node 应用可以监听相同的 3000 端口？`
> 这是因为 docker 各个容器都是独立的子网 ip，你可以通过 `docker inspect node-docker_node-app_1` 或 `docker inspect node-docker_node-app_1` 查看 ip address

- dev：docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d --scale node-app=2

-V 会重新创建 volume ，而不是使用之前容器的 volume。
场景比如，此项目 node-app 中，volume 使用了 /app/node_modules，若安装了新的 node_modules 包，应该重新创建 volume，而不是使用之前本地缓存 volume。

- dev：docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d -V

- prod：docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

> 注意：-v 会删除所有 volume 数据，所以数据库数据会销毁
- kill dev: docker-compose -f docker-compose.yml -f docker-compose.dev.yml down -v
- kill prod: docker-compose -f docker-compose.yml -f docker-compose.prod.yml down