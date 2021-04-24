# Node-Docker

[YouTube](https://www.youtube.com/watch?app=desktop&v=jotpVtFwYBk)

## No Compose

1. docker build -t node-app-image .
2. docker run -v $(pwd):/app:ro -v /app/node_modules --env-file ./.env  -p 3000:4000 -d --name node-app  node-app-image
3. docker exec -it node-app bash

## Docker Compose

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

### 生产部署

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

4. 发布镜像到 docker hub

依据 service name 找到对应镜像，然后 push

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

### 第三种方式

**[watch tower](https://github.com/containrrr/watchtower)** 容器更新的另一种手段。

watch tower 会监听镜像的更新，发现后自动进行 pull 镜像，并重启容器

生产服务器执行：

```bash
$docker run -d --name watchtower -e WATCHTOWER_TRACE=true -e WATCHTOWER_DEBUG=true -e WATCHTOWER_POLL_INTERVAL=50 -v /va
r/run/docker.sock:/var/run/docker.sock containrrr/watchtower <will be listen container name>
```

你可以更新下镜像尝试，在此之前，打开 watch tower 的日志

-f | --follow

```bash
$docker logs watchtower -f
```

## Docker 服务集群

docker stack 可认为是单机上的负载均衡部署； 可认为是多节点（多服务器）集群部署 docker swarm 的特例。

Stack 依赖 Swarm 模式，应用 Stack 必须开启 Swarm 模式

### docker compose 与 docker stack 对比：

① 使用方式雷同：都使用yml 容器编排定义文件

```bash
$ docker-compose -f docker-compose up

$ docker stack deploy -c docker-compose.yml <stack name>
```

② 作用大体相同： 两机制都能操纵 compose.yml 文件中定义的 services、volumes 、networks资源。

> 另外由于docker swarm内置，所以可不需要安装 docker-compose 工具

但是为什么会引入新的 docker stack 容器编排技术呢？ docker-compose 与 docker stack 除了语法，还有什么不同？

举例如下：

① docker stack 不支持 compose 文件中的“build”指令， 相比之下 docker-compose 可现场创建镜像，更适合**迭代开发、测试和 快速验证原型**

② docker-compose 不支持 compose 版本3中 deploy 配置节(定义适用于生产部署的配置)， **这个 deploy 配置节专属于 docker stack**.

> docker stack 强化了 service 的概念：服务可理解为发布到生产环境时某组容器的预期状态

docker stack 不支持版本 2 规范编写的 compose.yml 文件，必须使用最新的 V3 版本。docker-compose 工具依然可以处理版本2，3（如上所述，会忽略掉不再适用于该工具的某些指令）。

可以渐渐理解两者差异的趋势：

- docker-compose 更像是被定义为单机容器编排工具；

- docker stack 被定义为适用于生产环境的编排工具，强化了（ 复制集、 容器重启策略（滚动平滑重启）、回滚策略、服务更新策略 ）等生产特性。

为什么 docker 公司要强化 docker stack， 因为 docker stack 是进阶 docker swarm 的必经之路，

docker stack 可认为是单机上的负载均衡部署； 可认为是多节点（多服务）集群部署 docker swarm 的特例。

> 画外音： 希望开发者上手 docker stack 用于生产部署，自然过渡到 docker swarm， 不然我跟 kubernetes 怎么竞争？

所以：

如果你仅需要一个能操作多个容器的工具，依旧可以使用 docker-compose 工具。

因为 docker stack 几乎能做 docker-compose 所有的事情（生产部署 docker stack 表现还更好），如果你打算使用 docker swarm 集群编排，可尝试迁移到 docker stack。

通过三种方式对比下图，可以发现，从体系结构上来讲，Stack 位于 Docker 应用层级的最顶端。Stack 基于服务进行构建，而服务又基于容器。

![img](https://raw.githubusercontent.com/ProgramSimplified/node-docker/master/images/docker-stack.jpg)

### stack 演示步骤

通过以下命令可以查看 docker swarm 情况

```bash
$docker info
```

1. 开启 swarm 模式

```bash
$docker swarm init
```

2. 部署 stack

```bash
$docker stack deploy -c docker-compose.yml -c docker-compose.prod.yml <stack name>
```

- 查看当前有哪些 stack 堆栈 `docker stack ls`
- 查看 stack 所有服务 `docker stack services <stack name>`
- 查看 stack 所有容器 `docker stack ps <stack name>`

3. 更新 stack

待应用镜像构建并上传至 docker hub 后

```bash
$docker-compose -f docker-compose.yml -f docker-compose.prod.yml build [service name]
```
```bash
$docker-compose -f docker-compose.yml -f docker-compose.prod.yml push [service name]
```

在生产服务器更新 stack，与步骤 2 相同

```bash
$docker stack deploy -c docker-compose.yml -c docker-compose.prod.yml <stack name>
```

通过 `docker stack ps <stack name>`，可以看到两个容器一组平滑重启来更新，时间间隔 15s（配置在 docker-compose.prod.yml）

![img](https://raw.githubusercontent.com/ProgramSimplified/node-docker/master/images/stack-ps.png)

4. 删除 stack

```bash
$docker stack rm myapp
```

stack 参考：https://www.cnblogs.com/JulianHuang/p/11599170.html
