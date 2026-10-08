# 上岸鸭 · 联网学习导航 Agent

这是给现有上岸鸭增加的 Python 后端与学习导航页面。它围绕“迷茫 → 查资料 → 小任务 → 验收 → 卡点救援 / 突发重排”工作，模型通过受约束的 JSON 工具协议决定继续搜索、读取来源或生成路线。

## 启动

需要 Python 3.10+。联网和任务功能使用标准库。字幕 MP4 另需 Pillow、包含 libx264 的 FFmpeg 和中文字体。

```bash
python -m pip install -r requirements.txt
python learning_agent_server.py --port 8901
```

打开 http://127.0.0.1:8901/learning-agent.html 。在“AI 连接”中配置已有服务，或用后端环境变量 `FOCUS_AI_BASE_URL`、`FOCUS_AI_MODEL`、`FOCUS_AI_API_KEY`。支持 Chat Completions 兼容协议、Responses 和 Anthropic，模型需能遵循 JSON 输出；分析图片另需模型支持视觉输入。不要把密钥提交到 Git。

在原 V9 目录中安装时，将新文件放到该目录，运行 `python install_local.py` 或双击 `启动学习导航Agent.cmd`。安装器备份原首页，仅插入入口脚本，在本机 8901 启动新进程；原来的 8879 服务和工作台任务数据保留。已有 `local_integrations.py` / `v9_server.py` 时沿用原后端的模型连接。独立使用无需这些私有集成文件。

## 能做什么

- 从目标、基础、每天可用分钟和截止日期出发，真实检索公开网页，读取可访问正文。每次运行保留搜索、阅读、模型规划、保存的事件记录。
- 预置用户指定的 [Agent 中文学习路线](https://github.com/WenyuChiou/awesome-agentic-ai-zh) 与 [Hello Agents](https://github.com/datawhalechina/hello-agents) 作为资料入口，实时读取，不把资源清单声称为已安装模型。
- 模型按需调用 `search` / `read`，最多七轮且最多四轮工具动作。生成的任务必须有工时估计、前置依赖、成果、验收标准、第一步和有效来源编号，失败可修正两次。
- SQLite 保存路线、运行记录、版本；刷新或重启可恢复已保存路线。服务重启时尚未完成的请求会标记中断，不伪装完成。
- 插入临时任务、设置没空日期、改变每日容量，先预览再采用。确定性排程保证每日容量不超限和依赖顺序，已完成任务保持原记录。容量不足时返回明确冲突，不保证所有约束都有可行解。
- 截图或本地视频在浏览器转换成最多六张 JPEG 采样帧，再交给配置的视觉模型。视频音轨不分析，快速瞬间可能漏采；原视频及图片原始内容不进入 SQLite。
- 后端用 Pillow + FFmpeg 生成真实 H.264 MP4 字幕讲解。内容来自本次步骤，是可跟做的字幕视频，不是自动操作录屏，也不包含语音配音。

工作台与导航路线目前分别保存；导航任务在本页验收，不会自动把原工作台的其他任务标成完成。

## 参赛依据与产品取舍

当届官网：<https://www.ai-race.com.cn/>。官网是动态页面，读取器只提取官网同源公开脚本中的章程文本，不执行页面脚本。日期和报名要求仍应核对报名系统最新通知。此实现没有编造评分权重或承诺获奖。

设计参考来自 **2025 年获奖案例**，不是 2026 年尚未产生的获奖结果：

1. [Coco AI 全国一等奖（团队公开介绍）](https://infinilabs.cn/blog/2025/coco-ai-won-first-prize-at-the-2025-AI-innovation-competition/)：资料聚合、统一搜索、模型调用工具。上岸鸭对应“目标相关资料 → 正文读取 → 来源可追溯”。
2. [北京理工大学获奖报道](https://smen.bit.edu.cn/zhxw/8256cd984e014a369d1973691b85baaa.htm)：将具体领域分析连到可用成果。上岸鸭对应“路线 → 可交付的小任务 → 验收记录 → 重排反馈”。
3. [2026 第二届赛事通知（电子科技大学）](https://www.mba.uestc.edu.cn/info/1013/8471.htm)：用于区分当届比赛与历届案例。

## 接口

| 接口 | 用途 |
| --- | --- |
| `GET /api/agent/health` | 后端与模型配置状态（配置不等于本轮调用已成功） |
| `POST /api/agent/run` | 提交目标，立即返回 runId，后台联网 / 规划 |
| `GET /api/agent/run?id=…` | 运行状态和真实事件 |
| `GET /api/agent/state` | 保存的路线与最近运行 |
| `POST /api/agent/replan` | 预览重排；`apply:true` 保存，校验版本 |
| `POST /api/agent/complete` | 校验前置任务并保存完成证据 |
| `POST /api/agent/undo` | 恢复上一版本，产生新版本记录 |
| `POST /api/agent/tutorial` | 生成 / 获取对应路线版本的 MP4 |

默认只监听 127.0.0.1，校验 Host / Origin；只抓公开 HTTP(S) 地址，拒绝内网 IP 和非法跳转。模型工具不会执行网页指令、任意 Python、终端命令或自动发送消息。生成视频的命令参数固定，用户文字只渲染为图像。

不是面向互联网的多用户服务：公开部署前还需要用户身份认证、数据隔离、作业队列和对象存储。不要直接把本地服务绑定公网。Vercel 云端部署应另外适配持久化和后台任务，不能直接复制 SQLite / FFmpeg 服务并宣称可用。

## 验证

```bash
python -m unittest -v test_agent.py
```

覆盖容量、依赖顺序、截止冲突、已完成进度、循环依赖、来源引用、图片输入、乐观锁、预览不写入与撤销。工具循环协议测试明确使用模拟网络和模型，不能替代真实联网 / 模型调用验证。实际环境验收记录见 `VERIFICATION.md`。

原始后端资料读取与模型适配模块取自用户自己的 V9 项目，本次新增的编排、排程、持久化、视频与页面为独立模块。运行数据在 `.learning-agent/`，不提交 Git。
