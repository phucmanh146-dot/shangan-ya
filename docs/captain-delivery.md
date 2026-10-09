# 队长交付：关系、边界与总控接口

## 历史依据

本轮依据 2026-10-09 用户上传的历史长截图，以及已合并的 [PR #2](https://github.com/phucmanh146-dot/shangan-ya/pull/2)、`docs/team-onboarding.md` 和 `docs/p1-contract.md`。历史搜索服务本轮未返回可用结果；不据此补写不存在的队友身份。

我们是共同开发 Agent 的三人协作团队。用户本人是队长，GitHub 为 `phucmanh146-dot`。项目沿用原设计者的 PRD、参考上岸鸭思路继续开发；PRD 原作者未核实，不改写为队长独立创作。参考图中的 `brain898` 和参考团队与我们的成员关系无关。两位队友仍使用职责 A/B，真实账号及认领对应关系未确认。

| 成员 | 回答的问题 | 对外交付 | 分支 |
| --- | --- | --- | --- |
| A：诊断研究 | 现在缺什么，依据是什么 | 诊断、来源、差距、成员能力、未知项 | feature/diagnosis-research-agent |
| B：行动排程 | 先做什么，何时做，如何补能力 | 任务、步骤、学习路径、估时、依赖、日程 | feature/action-planner-agent |
| 你：队长总控 | 如何接起来，保存、反馈与验收 | 公共页面、接口、版本、执行与成果记录 | feature/orchestrator-agent |

工作关系：A 的诊断交给 B，B 的计划交给总控供用户选择；执行证据回流给 A 复核、B 调整。代码通过 PR 汇入 `p1/integration`。你自己的 PR 也需队友审查，联调完成后再发到 main。

## 本轮已经实现

- `team.html` 总控入口，原学习页面有导航链接。
- 接收、校验并持久保存 Diagnosis；未知项原样保留。
- 接收 Plan，检查 gap、成员、来源、版本、循环依赖和时段冲突。
- 计划先预览，再由用户采用，显示变动任务和时段前后对照。
- 任务开始、卡点、临时安排、提交成果、退回、验收通过、锁定。
- 提交成果进入 pending_review，保存产物版本与实际用时；通过验收才进入 completed。
- SQLite 事务和乐观版本检查，冲突返回 HTTP 409；旧诊断对应的计划标为过期。
- 新计划不得替换已开始/已完成/待验收/锁定任务或删除锁定时段。
- 反馈及每个项目版本均保存；原学习路线数据库记录不改写。

这是总控接收层和执行闭环，不是 A/B 智能算法的替代实现。原学习与图片视频求助仍在原页面；总控卡点记录与视觉结果还需人工关联，不声称已自动回流。

## 运行

在 `learning-agent` 执行 `python learning_agent_server.py --port 8920`，打开 `http://127.0.0.1:8920/team.html`。

创建 Demo 项目 → 运行 A→B Demo → 查看诊断和预览 → 采用 → 开始任务 → 提交成果 → 待验收 → 成员填写意见通过/退回 → 刷新检查。

Demo 是人工构造的完整交接样例；没有真实模型、联网搜索或智能排程。真实项目不能调用 Demo。

## A/B 如何接入

公共前缀 `/api/agent/team`，请求 Content-Type 为 application/json，同源本机调用。

| 接口 | 内容 |
| --- | --- |
| GET 空路径 / `?id=项目ID` | 项目列表 / 详情与版本日志 |
| POST /create | goal、mode（demo/live） |
| POST /diagnosis | project_id、expected_version、diagnosis |
| POST /propose | project_id、expected_version、plan、reason |
| POST /apply | project_id、expected_version、proposal_id |
| POST /feedback | project_id、expected_version、expected_plan_version、task_id、action、note 与对应证据字段 |

每次写入以返回的 version 作为下次 expected_version。计划内容用 plan_version；执行反馈以项目 version 防并发覆盖，不改变 B 的计划版本。

`team_orchestrator.run_handoff(data, researcher, planner)` 为服务端 Python 接口：researcher 接收项目快照，返回 Diagnosis；总控校验保存，再把诊断和项目快照传给 planner，返回 Plan 进入预览。B 失败时 A 的诊断仍保留，可以修复 B 后单独提交计划。Demo 已实际使用该调用链。

A/B 的真实模块尚未交付并连接，因此 HTTP 界面提供 JSON 交付入口，不声称已经自动调用真实 A/B。live 是数据用途标识，live_verified 固定为 false，不能由客户端输入改成已验收。

具体字段补充：sources 每项用 source_id、kind（official/user_material/reference/suggestion）、title；成员用 member_id；task 增加 title；steps、acceptance_criteria 为文字列表；time_blocks 用 task_id、member_id、start/end（带时区 ISO 时间）、可选 locked。顶层 dependencies 保留 B 原始说明，实际校验以 tasks[].depends_on 为准。

成员选择是本机验收记录，尚无多人身份认证/权限隔离。不要把本机端口开放公网。本轮不主动对外发布或合并 main。

## 验证与剩余联调

执行 `python -m unittest -q test_agent.py test_team.py`：36 项通过（原有 27 项、新增 9 项）。覆盖真实本机 HTTP、SQLite、并发写入、无来源/循环/时段冲突、待验收/退回、版本冲突、计划过期与 Demo/Live 区分。

待队友交付后的联调项：真实诊断与搜索证据、30/90 分钟真实排程差异、原学习路线状态迁移、视觉求助与任务关联、A 复核后的差距关闭。这些尚不能标为三人完整 Agent 已完成。

在用户 Windows 电脑 Python 3.13 上复验 9 项总控测试通过；使用本机 Chrome 的 9 项浏览器检查通过（创建、自动示例交接、预览与采用、执行、待验收、刷新恢复、证据验收、API 状态、移动端不溢出），页面脚本错误为 0。Windows 复验发现 SQLite 连接未显式释放，已修复并复验通过。截图保存在本机 test-output/team-desktop.png。
