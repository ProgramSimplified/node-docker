# Node-Docker

## no compose

1. docker build -t node-app-image .
2. docker run -v $(pwd):/app:ro -v /app/node_modules --env-file ./.env  -p 3000:4000 -d --name node-app  node-app-image
3. docker exec -it node-app bash

## compose

-d 后台执行，--build 会强制重新构建镜像

```bash
$docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d [--build]
```

通过启动 docker 容器时，同时会启动两个 node-app 集群，配合 nginx 负载均衡.

> 你可能会问：`为什么启动两个 node 应用可以监听相同的 3000 端口？`
> 这是因为 docker 各个容器都是独立的子网 ip，你可以通过 `docker inspect node-docker_node-app_1` 或 `docker inspect node-docker_node-app_1` 查看 ip address

```bash
$docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d --scale node-app=2
```

-V 会重新创建 volume ，而不是使用之前容器的 volume。
场景比如，此项目 node-app 中，volume 使用了 /app/node_modules，若安装了新的 node_modules 包，应该重新创建 volume，而不是使用之前本地缓存 volume。

```bash
$docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d -V
```

### 销毁运行的容器

> 注意：-v 会删除所有 volume 数据，所以数据库数据会销毁

```bash
$docker-compose -f docker-compose.yml -f docker-compose.dev.yml down -v
```

## Production deploy

### 第一种方式

生产环境部署以及更新重启，都使用以下命令
> 为什么要 --build 强制重新构建镜像呢？由于生产中没有像本地开发一样使用 volume，它都是通过 Dockfile 中 COPY . ./ 将代码置入容器 WORKDIR 中，所以构建镜像，代码的更新才会生效

```bash
$docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

--build 指定仅需要重新构建的镜像，这样比较好

```bash
$docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build node-app
```

--no-deps 不对依赖的容器进行重启(up)，这是最好的方式 （node-app 依赖了 mongo）

```bash
$docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build --no-deps node-app
```

### 第二种方式

将本地镜像(node-app)，部署到 docker hub。

1. 将本地镜像(node-docker_node-app)通过 tag，克隆一份 (angusyang9/node-app 为 dockerhub 上建立的镜像名称)

```bash
$docker image tag node-docker_node-app angusyang9/node-app
```

```text
REPOSITORY             TAG             IMAGE ID       CREATED        SIZE
node-docker_node-app   latest          ec5db0e9e8ab   5 hours ago    907MB
angusyang9/node-app    latest          ec5db0e9e8ab   5 hours ago    907MB
```

2. 首次部署至 dockerhub

```bash
$docker push angusyang9/node-app
```

那么程序更新后...

3. 重新构建镜像

通过 build 则会构建 services 中所有含有 build 本地镜像的镜像（本项目中 node-app）,也可以用过 service name 特殊指定构建

```bash
$docker-compose -f docker-compose.yml -f docker-compose.prod.yml build [service name]
```

4. 发布镜像到 dockerhub

这会检测到 compose yml 刚刚构建的镜像，并且 push

```bash
$docker-compose -f docker-compose.yml -f docker-compose.prod.yml push [service name]
```

5. 生产服务器 pull 镜像

```bash
$docker-compose -f docker-compose.yml -f docker-compose.prod.yml pull [image name]
```

6. 重启容器

这仅会重启镜像或配置有变化的容器，所以我们的 node-app 就会重启

```bash
$docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

或者也可以加 --no-deps，仅重启我们的 node-app，并且不去检测依赖

```bash
$docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps node-app
```