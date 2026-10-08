# 上岸鸭团队上手指南

项目仓库：[phucmanh146-dot/shangan-ya](https://github.com/phucmanh146-dot/shangan-ya)  
项目负责人：`phucmanh146-dot`  
本次准备接入的队友：`brain898`

这份说明涵盖加入仓库、选择分支、启动已有模块、认领任务和提交 PR。邀请是否已发出、对方是否已接受，以仓库成员页面的实际状态为准。

## 1. 负责人邀请队友

1. 打开仓库的 **Settings → Collaborators / Manage access**。
2. 如 GitHub 要求重新验证身份，由账号本人完成邮箱、密码或双重验证。
3. 选择 **Add people**，搜索完整用户名 `brain898`，核对账号后添加。个人仓库的 Collaborator 具有写入协作能力；如果界面显示角色选择，选择 **Write**。
4. 队友用自己的 GitHub 账号接受邀请。邀请显示为 **Pending** 时，说明尚未完成加入。
5. 邀请接受后，再确认对方出现在协作者列表中。

**建立分支不会自动授予仓库写入权限。** 队友必须先接受邀请，才能向本仓库的分支推送提交。

## 2. 每条分支做什么

| 分支 | 使用者与作用 | PR 合入目标 |
| --- | --- | --- |
| `develop` | 全队共同开发与集成，作为新功能的起点 | 阶段验收后再提 PR 到 `main` |
| `feat/brain898` | 为 `brain898` 准备的首个开发分支 | `develop` |
| `docs/team-onboarding` | 本次介绍和协作文档 | `develop` |
| `codex/learning-navigator-agent` | 原有 Agent 开发，草稿 PR #1 的来源 | 原 PR 保持原状 |
| `main` | 当前默认分支，仍包含原部署包 | 发布整合后更新 |

`develop` 从已有 Agent 代码提交 `69e12b2f8b97bbcc894545cbd411150595076fbf` 建立。原 PR #1 没有因此被合并，其尚未完成的真实模型与搜索验收仍然需要继续完成。

当前“先提 PR、由负责人验收再合并”是团队流程约定。本次文档与分支设置没有配置强制分支保护规则。

## 3. 队友第一次把代码取到电脑

先安装 Git，并用自己的 GitHub 账号完成登录或推送认证。随后在准备存放项目的目录执行：

```bash
git clone https://github.com/phucmanh146-dot/shangan-ya.git
cd shangan-ya
git fetch origin
git switch --track origin/feat/brain898
```

如果本地已经有 `feat/brain898` 分支，直接执行：

```bash
git switch feat/brain898
```

以后每次开始工作，先确认并保存自己的改动，再同步共同开发分支：

```bash
git status
git fetch origin
git merge origin/develop
```

出现冲突时先核对冲突两侧的意图，解决后再提交。不要为了同步而丢弃自己或队友的工作。

首个功能合并后，后续每项功能从最新 `develop` 创建一个新分支，例如 `feat/brain898-source-check`。分支名说明这次要完成的功能，便于负责人查看。

## 4. 启动现有学习执行模块

代码位于 `learning-agent/`。先进入目录、建立独立环境并安装依赖。

Windows PowerShell：

```powershell
cd learning-agent
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe learning_agent_server.py --port 8901
```

macOS / Linux：

```bash
cd learning-agent
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python learning_agent_server.py --port 8901
```

浏览器打开 [本机页面](http://127.0.0.1:8901/learning-agent.html)。

按照 [模块 README](../learning-agent/README.md) 与 [配置示例](../learning-agent/.env.example) 配置模型和搜索服务。启动成功与真实 AI 功能通过验收是两件事，需要分别检查。

模型密钥保留在自己的本机配置中；提交前查看 `git diff --cached`，避免将密钥、数据库或个人截图加入仓库。新环境能否复现，需在本机实际验证；本次协作文档没有替队友完成安装。

## 5. 三人怎样分工

下面是模块分工方案。负责人承担整合；另外两块在了解队员的基础、意愿和时间后认领。`brain898` 目前只绑定开发分支，尚未被指定到某个业务模块。

| 角色 | 工作范围 | 第一份可验收成果 | 验收重点 |
| --- | --- | --- | --- |
| 队长 / `phucmanh146-dot` | 总体流程、执行与卡点反馈、模块衔接、PR 集成 | 明确输入输出协议，串起一个从目标到完成证据的演示流程 | 各模块能接上，状态变化可解释，失败能反馈 |
| 成员 A：项目诊断 | 理解已有作品、规则、参考案例，形成现状与差距 | 提交一份结构明确的“现状—差距—目标结果”，附证据和未确认项 | 要求有来源，判断有依据，不能凭空给完成度 |
| 成员 B：个性化任务与技能路线 | 理解成员能力、想法与可投入时间，匹配任务和必要学习 | 用两种不同成员情况，为同一项目缺口生成不同的任务与补齐路线 | 能解释为何分配，任务可执行，工作量符合时间 |

开始认领前，每个人补齐下面的信息：

- 我想负责哪部分？我认为它应该怎么做？
- 我已经完成了什么，有哪些可以查看的成果？
- 我现在会什么，哪些地方需要帮助？
- 我能投入哪些时间，每周大约多少小时？

由此确定人选、范围和截止时间。具体比赛、岗位名称和任务内容由项目材料决定。

### 任务卡必须说清楚

| 字段 | 要填写的内容 |
| --- | --- |
| 目标 | 这次解决哪个具体问题 |
| 输入 | 依赖哪些材料、代码、上游结果 |
| 交付物 | 要提交哪些文件或可查看成果 |
| 第一步 | 从哪里开始、具体做什么 |
| 技能补齐 | 为完成当前任务必须学什么、用什么材料 |
| 验收 | 怎样证明做成了，包括失败场景 |
| 时间与依赖 | 可投入时间、预计用时、前置条件和阻塞 |
| 证据 | PR、截图、运行结果或测试记录 |

## 6. 队友提交工作，负责人在哪里看

完成一个明确的小任务后：

```bash
git status
git add path/to/changed-file
git diff --cached
git commit -m "feat: 描述本次完成的功能"
git push -u origin feat/brain898
```

`path/to/changed-file` 替换为本次实际修改的文件；其他功能分支相应替换推送分支名。

在 GitHub 打开仓库 **Pull requests → New pull request**：

- **base：`develop`**，表示准备合入的共同开发分支。
- **compare：`feat/brain898`**，表示队友提交修改的来源分支。
- 填清楚要解决的问题、修改内容、验证结果与待讨论问题。
- 尚未完成时选择 **Create draft pull request**；完成后选择 **Ready for review**。

快捷入口：[创建队友分支到 develop 的 PR](https://github.com/phucmanh146-dot/shangan-ya/compare/develop...feat/brain898?expand=1)。刚建立的两个分支没有差异，需要先提交实际修改才能创建 PR。

负责人进入 [Pull requests 列表](https://github.com/phucmanh146-dot/shangan-ya/pulls)，即可看到队友提交的工作：

1. **Conversation** 看目标、讨论和验证记录。
2. **Files changed** 看修改了哪些文件，并在对应行留言。
3. 如配置了检查，在 **Checks** 看执行结果；没有配置检查时，需要查看手动验收证据。
4. 问题解决、成果验收后再合并到 `develop`。

队友发起 PR 后继续向同一分支提交，修改会自动进入这个 PR，不需要重复开一个。

## 7. 一次协作什么时候算完成

- 队友已经接受邀请，能推送到自己的分支。
- PR 的目标为 `develop`，范围与任务卡一致。
- 运行与验证结果可复现，实际结果和模拟结果有明确区分。
- 已知问题记录清楚，由负责人决定是否达到本次验收标准。
- 负责人合并后，其他成员通过 `git fetch origin` 与 `git merge origin/develop` 同步成果。

这一轮完成后再进入下一项任务。阶段发布时，另建 `develop → main` 的 PR，核对与原草稿 PR #1 的关系，避免把同一组修改重复处理。
