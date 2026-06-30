# 澳门新六合彩开奖统计表

这个版本已经改成适合部署到 Cloudflare Pages + D1 的共享数据版。

## 现在的效果

- 前端页面仍然是静态页面，部署后可直接通过域名访问
- 数据优先走 Cloudflare Pages Functions + D1
- 手机、电脑、平板访问同一个域名时，共用同一份开奖记录和统计项目
- 首次访问 API 时，会自动把 2026 年第 001 期到第 171 期官方数据导入数据库
- 如果直接双击本地 `index.html` 打开，页面会自动退回本地模式，继续使用 `localStorage`

## 目录说明

- `index.html`：页面入口
- `styles.css`：样式
- `app.js`：前端逻辑
- `official-records-2026.js`：本地模式下的 2026 官方数据
- `picker/`：独立的“挑码助手”原型页与测试文件，先单独验证后再合并
- `functions/`：Cloudflare Pages Functions 接口
- `schema.sql`：D1 表结构
- `wrangler.toml`：Cloudflare 部署配置

## 部署到 Cloudflare Pages

1. 把这个项目放到一个 Git 仓库里，然后推到 GitHub
2. 在 Cloudflare 控制台进入 `Workers & Pages`
3. 新建 `Pages` 项目，并连接你的 GitHub 仓库
4. Build 设置：
   - Framework preset：`None`
   - Build command：留空
   - Build output directory：`.`
5. 首次创建后，在项目设置里绑定 D1 数据库

## 创建 D1 数据库

1. 在 Cloudflare 控制台进入 `D1`
2. 新建数据库，建议名称用 `macau-lottery-stats`
3. 记下数据库的 `database_id`
4. 把 `wrangler.toml` 里的

```toml
database_id = "PLEASE_REPLACE_WITH_YOUR_D1_DATABASE_ID"
```

改成真实的 `database_id`

## 在 Pages 项目绑定 D1

你需要在 Pages 项目里添加一个 D1 绑定：

- Binding name：`DB`
- D1 database：选择刚创建的数据库

## 绑定你的域名 `cfwk.kdns.fr`

1. 在 Pages 项目里打开 `Custom domains`
2. 添加 `cfwk.kdns.fr`
3. 按 Cloudflare 提示完成 DNS 绑定
4. 生效后，用 `https://cfwk.kdns.fr/` 就能直接打开

## 重要说明

- 当前版本已经支持简单密码保护
- 只有输入正确密码后，才可以访问页面和编辑数据

## 配置站点密码保护

你需要在 Cloudflare Pages 项目的环境变量里新增下面两个变量：

- `SITE_PASSWORD`
  - 你自己设定的访问密码
- `AUTH_SECRET`
  - 用来签名登录 cookie 的密钥
  - 建议使用一段足够长的随机字符串，例如 32 位以上

可选变量：

- `AUTH_MAX_AGE_DAYS`
  - 登录保持天数
  - 不填时默认 `30`

### Cloudflare Pages 环境变量设置位置

1. 打开你的 Pages 项目
2. 进入 `Settings`
3. 打开 `Environment variables`
4. 新增：
   - `SITE_PASSWORD`
   - `AUTH_SECRET`
5. 保存后重新部署

## 登录保护现在的效果

- 打开主页时，如果未登录，会自动跳到 `/login/`
- 登录成功后会跳回原来的页面
- `api` 接口也会一起校验密码
- 顶部有“退出登录”按钮

## 线上排查

如果页面没有显示“退出登录”，或者手机和电脑数据不同步，说明页面大概率没有进入云端模式。

这时可以登录后直接打开：

- `/api/health`

例如：

- `https://cfwk.kdns.fr/api/health`

正常时会返回：

```json
{"ok":true,"authConfigured":true,"databaseBinding":true}
```

## 建议

`AUTH_SECRET` 不要设置成和 `SITE_PASSWORD` 一样。

后面还可以继续加白名单、Cloudflare Access，或者更细一点的编辑权限控制。
