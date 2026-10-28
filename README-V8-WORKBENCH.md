# 上岸鸭 V8 工作台预览部署入口

本分支保留原项目目录 `v7-linked-task-ai/`，并增加仓库根目录部署入口，让 Railway 能从仓库根目录构建 V8 工作台。

- 根目录 Dockerfile 会构建原有工作台目录，不会重写现有生产服务。
- Railway health check: `/publichealth`
- 本机微信 OCR 仍需要 Windows 本机桥接；公网服务无法直接访问用户电脑微信进程。
- 当前改动尚需在预览部署中核验首页按钮、API、静态资源和登录流程。
