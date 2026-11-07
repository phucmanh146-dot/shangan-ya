# 麦麦搭子 · GitHub 发布与报名指南

## 先核验
1. 官方赛事入口：https://builderx.csdn.net/activity-site/m-code/pages
2. 官方细则：https://github.com/M-China/mcd-developer-innovation-challenge
3. 截止：2026-10-25 23:59 北京时间。仓库必须是项目**独立公开仓库**（不是其他仓库里的目录），且真实调用麦当劳 MCP 才符合要求。
4. 不得上传真实 Token、Cookie、敏感订单信息。此前在聊天中暴露的 Token 建议在官方控制台轮换。

## 发布步骤
1. GitHub 登录本人账号，新建 Public 仓库，建议仓库名 `maimai-buddy-1024`。
2. 将本目录的 README.md、index.html、MCP_INTEGRATION.md、mcp-config.example.json、mcp-client.mjs、CONTEST_DECLARATION.md、workbuddy.md、UPLOAD_GUIDE.md 放到**新仓库根目录**。
3. 官方的 CONTEST_DECLARATION.md 必须与官方版本字节一致，不得自行改写。
4. 在本机 WorkBuddy 的“连接器 → 配置 MCP”里填入麦当劳 MCP Token，保存后启用，并执行一次真实 MCP 工具调用；失败时记下 HTTP 状态码，不得伪称成功。
5. 在本机设置 `MCD_MCP_TOKEN` 环境变量，运行 `node mcp-client.mjs` 检查服务端初始化和真实工具名（不要将环境变量写在公共文件里）。
6. 真实完成并验证至少一个 MCP 推荐/优惠核验流程，然后将原型接入真实后端；根据实际测试结果更新 MCP_INTEGRATION.md。
7. WorkBuddy 专项奖励：从 WorkBuddy 导出真实项目开发对话，脱敏后替换占位版 workbuddy.md；不要伪造开发记录。
8. 官方活动仓库提交 Issue，标题为项目名称，正文使用无 Markdown 链接的格式：
```
〖参赛申请〗
项目名称：麦麦搭子·省着吃
项目地址：https://github.com/<owner>/maimai-buddy-1024
项目简介：通勤场景的麦当劳优惠推荐与搭子投票 Skill，使用麦当劳 MCP 实际能力核验价格。
```
9. 检查机器人是否回复“报名成功”。未回复或回复失败不算报名成功。

## 当前进度
已上传至旧仓库子目录作为可交互原型和 MCP 发现脚本；独立仓库、真实 MCP 联调、真实 WorkBuddy 记录及报名 Issue 均未完成。不得将演示投票与实际优惠计价混淆。
