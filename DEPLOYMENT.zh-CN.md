# LumaAtlas 部署与运维

本文档适用于单机 Docker Compose 部署。生产环境必须使用 HTTPS，Passkey 只能在 HTTPS 或浏览器认可的本机安全环境中工作。

## 1. 准备环境

- Docker Engine 24+ 与 Docker Compose v2
- 一个指向服务器的域名
- 至少 2 GB 内存；处理 RAW、HEIC 或超大图片时建议 4 GB 以上
- 持久化目录 `./data`，其中包含 SQLite 数据库、日志、本地图片和备份

Linux 首次部署时创建数据目录，并让容器内 UID `10001` 可写：

```bash
mkdir -p data
sudo chown -R 10001:10001 data
```

Windows Docker Desktop 使用当前目录挂载即可。

## 2. 配置

```bash
cp .env.example .env
```

至少设置：

```dotenv
CFRAME_ADMIN_EMAIL=you@example.com
CFRAME_ADMIN_NAME=Your Name
CFRAME_ADMIN_PASSWORD=请使用强密码

NUXT_PUBLIC_SITE_URL=https://photos.example.com
NUXT_SESSION_PASSWORD=至少32位且长期保持不变的随机字符串

NUXT_STORAGE_PROVIDER=local
NUXT_PROVIDER_LOCAL_PATH=./data/storage
NUXT_PROVIDER_LOCAL_BASE_URL=/storage
```

可用以下命令生成会话密钥：

```bash
openssl rand -base64 48
```

`NUXT_SESSION_PASSWORD` 同时用于会话签名和 TOTP 密钥加密。不要随意轮换；丢失后，所有设备会退出，已经配置的 TOTP 也需要重新设置。

## 3. 启动

```bash
docker compose build --pull
docker compose up -d
docker compose ps
```

健康检查：

```bash
curl http://127.0.0.1:3000/api/health
```

返回 `status: ok` 且 Compose 状态为 `healthy` 后，再配置反向代理。

Compose 默认绑定 `127.0.0.1`。需要从局域网直接访问时，在 `.env` 中设置 `LUMAATLAS_BIND=0.0.0.0`，并同时配置防火墙。

## 4. HTTPS 反向代理

以 Caddy 为例：

```caddyfile
photos.example.com {
  reverse_proxy 127.0.0.1:3000
  encode zstd gzip
}
```

代理必须保留 `Host`、`X-Forwarded-For` 和 `X-Forwarded-Proto`。如果外部域名与容器看到的地址不同，务必正确填写 `NUXT_PUBLIC_SITE_URL`，否则 Passkey 的 RP ID 或 Origin 校验会失败。

不要把 3000 端口直接暴露到公网。

## 5. 备份

后台“备份与恢复”可以创建应用级备份。升级前还应制作整个数据目录的离线副本：

```bash
docker compose stop lumaatlas
tar -czf "lumaatlas-data-$(date +%Y%m%d-%H%M%S).tar.gz" data
docker compose start lumaatlas
```

使用 S3 或 OpenList 时，`data` 目录仍包含数据库和配置；远端原图需按存储提供商的方式另行备份。

建议定期验证备份，而不只是生成备份：在独立目录恢复副本，启动后检查登录、照片数量、相册、地图和随机原图。

## 6. 升级

1. 阅读提交记录和迁移说明。
2. 按上一节停止服务并备份 `data`。
3. 拉取代码并重建镜像。
4. 启动后等待健康检查，再检查日志。

```bash
git pull --ff-only
docker compose build --pull
docker compose up -d
docker compose ps
docker compose logs --tail=200 lumaatlas
```

数据库迁移在启动时自动执行。不要在多个容器副本之间共享同一 SQLite 文件。

## 7. 回滚

代码可以回退，但数据库迁移通常不可直接向后执行。可靠回滚必须同时恢复升级前的数据目录：

```bash
docker compose down
mv data "data.failed-$(date +%Y%m%d-%H%M%S)"
tar -xzf lumaatlas-data-YYYYMMDD-HHMMSS.tar.gz
git checkout <升级前的提交或标签>
docker compose build
docker compose up -d
```

确认服务恢复后再处理 `data.failed-*`。不要把新版本数据库直接交给旧版本程序运行。

## 8. 日常检查

- `/api/health`：容器与数据库存活状态
- 后台“存储设置”：提供者连接和最新对象只读探测
- 后台“系统设置”：清理过期分享和旧队列任务
- 后台“安全与登录”：撤销陌生会话，维护 Passkey、TOTP 和恢复码
- `docker compose logs lumaatlas`：启动、迁移、存储与图片处理日志

出现问题时，先保留 `data` 副本，再进行清理或重建。
