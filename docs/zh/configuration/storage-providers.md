# 存储提供器配置

ChronoFrame 支持多种存储后端来保存您的照片和缩略图。本文档将详细介绍如何配置不同的存储提供器。

| 提供器                            | 支持 | 适用场景           | 成本         |
| --------------------------------- | :--: | ------------------ | ------------ |
| [**S3 兼容存储**](#s3-兼容存储)   |  ✅  | 生产环境，云存储   | 按使用量计费 |
| [**Cloudflare R2**](#cloudflare-r2) | ✅ | 远程照片存储 | 按使用量计费 |
| [**本地文件系统**](#本地文件系统) |  ✅  | 测试环境，离线部署 | 免费         |
| [**OpenList**](#openlist-存储)    |  ✅  | 个人云存储，NAS    | 免费         |

## S3 兼容存储

S3 兼容存储是最推荐的生产环境选项，支持所有主流云服务提供商。

### 基础配置

```bash
# 设置存储提供器为 S3
NUXT_STORAGE_PROVIDER=s3

# S3 基础配置
NUXT_PROVIDER_S3_ENDPOINT=https://your-s3-endpoint.com
NUXT_PROVIDER_S3_BUCKET=chronoframe-photos
NUXT_PROVIDER_S3_REGION=us-east-1
NUXT_PROVIDER_S3_ACCESS_KEY_ID=your-access-key-id
NUXT_PROVIDER_S3_SECRET_ACCESS_KEY=your-secret-access-key

# 可选配置
NUXT_PROVIDER_S3_PREFIX=photos/
NUXT_PROVIDER_S3_CDN_URL=https://cdn.example.com
NUXT_PROVIDER_S3_FORCE_PATH_STYLE=false
```

### 云服务商配置示例

#### AWS S3

```bash
NUXT_STORAGE_PROVIDER=s3
NUXT_PROVIDER_S3_ENDPOINT=https://s3.amazonaws.com
NUXT_PROVIDER_S3_BUCKET=my-chronoframe-bucket
NUXT_PROVIDER_S3_REGION=us-east-1
NUXT_PROVIDER_S3_ACCESS_KEY_ID=AKIA...
NUXT_PROVIDER_S3_SECRET_ACCESS_KEY=...
NUXT_PROVIDER_S3_CDN_URL=https://d1234567890.cloudfront.net
```

#### 阿里云 OSS

```bash
NUXT_STORAGE_PROVIDER=s3
NUXT_PROVIDER_S3_ENDPOINT=https://oss-cn-hangzhou.aliyuncs.com
NUXT_PROVIDER_S3_BUCKET=chronoframe-photos
NUXT_PROVIDER_S3_REGION=oss-cn-hangzhou
NUXT_PROVIDER_S3_ACCESS_KEY_ID=LTAI...
NUXT_PROVIDER_S3_SECRET_ACCESS_KEY=...
NUXT_PROVIDER_S3_CDN_URL=https://cdn.example.com
```

#### 腾讯云 COS

```bash
NUXT_STORAGE_PROVIDER=s3
NUXT_PROVIDER_S3_ENDPOINT=https://cos.ap-beijing.myqcloud.com
NUXT_PROVIDER_S3_BUCKET=chronoframe-1234567890
NUXT_PROVIDER_S3_REGION=ap-beijing
NUXT_PROVIDER_S3_ACCESS_KEY_ID=AKID...
NUXT_PROVIDER_S3_SECRET_ACCESS_KEY=...
```

#### MinIO 自托管

```bash
NUXT_STORAGE_PROVIDER=s3
NUXT_PROVIDER_S3_ENDPOINT=https://minio.example.com
NUXT_PROVIDER_S3_BUCKET=chronoframe
NUXT_PROVIDER_S3_REGION=us-east-1
NUXT_PROVIDER_S3_ACCESS_KEY_ID=minioadmin
NUXT_PROVIDER_S3_SECRET_ACCESS_KEY=minioadmin
# MinIO 需要启用路径样式访问
NUXT_PROVIDER_S3_FORCE_PATH_STYLE=true
```

### 存储桶配置

#### CORS 设置

推荐的 CORS 配置：

```json
[
  {
    "AllowedOrigins": ["https://your-domain.com"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

## Cloudflare R2

1. 在 Cloudflare 创建 R2 存储桶，再创建仅限该桶的 Object Read & Write API 令牌。保存 Access Key ID 和 Secret Access Key；这里不使用 Cloudflare 全局 API Key。
2. 在后台「设置 → 存储方案」新增 Cloudflare R2。填写账户 ID、存储桶、密钥和照片目录前缀；EU/US 专属地域桶需选择对应地域。
3. 先点「测试连接」，再保存方案。已有照片请在同一页面使用「存储空间迁移」：选择目标方案，先复制并校验，完成后再确认切换。该工具也支持在本地、S3、OpenList 与 R2 等已配置方案之间迁移。直接更改默认方案不会复制旧照片。源文件不会被删除；数据库、设置和账号仍保存在服务器数据目录。

迁移按数据库中照片引用的原图、缩略图和实况视频执行。迁移时请暂停上传与编辑；失败后可重新运行，内容相同的目标文件会复用，同名但内容不同的文件不会覆盖。任务状态保存在当前服务进程中，若服务重启，重新运行复制即可续行校验。

公开图片域名可留空：应用会经本站代理读取私有桶，浏览器上传也经本站转发，无需公开桶或配置 R2 CORS。若填写域名，必须先在 Cloudflare 将 HTTPS 自定义域名绑定到该桶，图片便可由公开域名直接访问；不要在这里填写 R2 S3 API 地址。

## 本地文件系统

本地存储将文件保存在服务器文件系统中。

```bash
# 设置存储提供器为本地
NUXT_STORAGE_PROVIDER=local

# 本地存储配置
NUXT_PROVIDER_LOCAL_PATH=/app/data/storage
NUXT_PROVIDER_LOCAL_BASE_URL=/storage
```

## OpenList 存储

OpenList 是一个开源的文件管理系统，提供对各种云存储服务的 API 访问。此提供程序允许您使用与 OpenList 兼容的服务作为照片存储后端。

| 环境变量                                   | 类型   | 必需 | 默认值           | 描述                    |
| ------------------------------------------ | ------ | ---- | ---------------- | ----------------------- |
| `NUXT_PROVIDER_OPENLIST_BASE_URL`          | string | 是   | -                | OpenList 服务的基础 URL |
| `NUXT_PROVIDER_OPENLIST_ROOT_PATH`         | string | 是   | -                | 根存储路径              |
| `NUXT_PROVIDER_OPENLIST_TOKEN`             | string | 必需 | -                | 认证令牌（认证时必需）  |
| `NUXT_PROVIDER_OPENLIST_ENDPOINT_UPLOAD`   | string | 可选 | `/api/fs/put`    | 上传端点                |
| `NUXT_PROVIDER_OPENLIST_ENDPOINT_DOWNLOAD` | string | 可选 | -                | 下载端点                |
| `NUXT_PROVIDER_OPENLIST_ENDPOINT_LIST`     | string | 可选 | -                | 列表端点                |
| `NUXT_PROVIDER_OPENLIST_ENDPOINT_DELETE`   | string | 可选 | `/api/fs/remove` | 删除端点                |
| `NUXT_PROVIDER_OPENLIST_ENDPOINT_META`     | string | 可选 | `/api/fs/get`    | 元数据端点              |
| `NUXT_PROVIDER_OPENLIST_PATH_FIELD`        | string | 可选 | `path`           | 路径字段名              |
| `NUXT_PROVIDER_OPENLIST_CDN_URL`           | string | 可选 | -                | CDN URL                 |

**认证：**

OpenList 提供程序需要令牌认证以确保安全访问：

```bash
NUXT_PROVIDER_OPENLIST_TOKEN=your-static-token
```

### 基础配置

```bash
# 设置存储提供器为 OpenList
NUXT_STORAGE_PROVIDER=openlist

# OpenList 基础配置
NUXT_PROVIDER_OPENLIST_BASE_URL=https://your-openlist-server.com
NUXT_PROVIDER_OPENLIST_ROOT_PATH=/chronoframe/photos

# 认证配置 - Token 认证
NUXT_PROVIDER_OPENLIST_TOKEN=your-api-token

# 可选配置
NUXT_PROVIDER_OPENLIST_ENDPOINT_UPLOAD=/api/fs/put
NUXT_PROVIDER_OPENLIST_ENDPOINT_DOWNLOAD=
NUXT_PROVIDER_OPENLIST_ENDPOINT_LIST=
NUXT_PROVIDER_OPENLIST_ENDPOINT_DELETE=/api/fs/remove
NUXT_PROVIDER_OPENLIST_ENDPOINT_META=/api/fs/get
NUXT_PROVIDER_OPENLIST_PATH_FIELD=path
NUXT_PROVIDER_OPENLIST_CDN_URL=
```

### 配置示例

#### OpenList（理论上Alist也可行）

```bash
NUXT_STORAGE_PROVIDER=openlist
NUXT_PROVIDER_OPENLIST_BASE_URL=https://openlist.example.com
NUXT_PROVIDER_OPENLIST_ROOT_PATH=/115pan/chronoframe
NUXT_PROVIDER_OPENLIST_TOKEN=your-static-token
```

## 常见问题

:::details `The AWS Access Key Id you provided does not exist in our records`
访问密钥错误，检查 `ACCESS_KEY_ID` 和 `SECRET_ACCESS_KEY` 是否正确。
:::

:::details `The specified bucket does not exist`
存储桶不存在，确认存储桶名称正确，且在指定区域存在
:::

:::details 可以上传但无法访问图片，控制台提示 `Access to fetch at '...' from origin '...' has been blocked by CORS policy`
存储桶 CORS 配置错误，参考 [CORS 设置](#CORS-设置) 进行配置。
:::
