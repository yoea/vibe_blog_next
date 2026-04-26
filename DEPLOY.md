# 部署指南

## 前置要求

- Node.js >= 20.x（推荐 LTS）
- PM2（进程守护）
- Nginx（反向代理 + HTTPS，已配置好）

## 快速部署

项目根目录已提供 `deploy.sh` 一键部署脚本：

```bash
# 给执行权限（首次）
chmod +x deploy.sh

# 执行部署
./deploy.sh
```

### 脚本执行流程

1. 进入项目目录
2. `git stash` 暂存本地变更（如有），`git pull` 拉取最新代码
3. `npm install` 安装依赖
4. `npm run build` 构建
5. `pm2 restart vibe-blog` 重启服务
6. 健康检查：访问 `https://blog.ewing.top` 确认 HTTP 200

如果任意步骤失败，脚本会终止并输出错误信息。

## 手动部署

```bash
# 1. 进入项目目录
cd /home/ewing/craft/vibe_blog_demo

# 2. 拉取代码（处理本地冲突）
git stash --include-untracked
git pull

# 3. 安装依赖
npm install

# 4. 构建
npm run build

# 5. 重启
pm2 restart vibe-blog

# 6. 验证
curl -s -o /dev/null -w "%{http_code}" https://blog.ewing.top
# 返回 200 即部署成功
```

## 环境变量

部署前确认 `.env.local` 存在且配置正确。该文件在 `.gitignore` 中，不会随代码拉取更新。

## 回滚

如果部署后发现问题，使用 Git 回滚到上一个稳定版本：

```bash
git revert HEAD --no-edit
npm run build
pm2 restart vibe-blog
```
