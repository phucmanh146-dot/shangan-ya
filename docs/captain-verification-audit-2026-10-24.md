# C/队长核验记录｜真实作品私人定制闭环（2026-10-24）

> 本记录只写本次工具实际核验到的 GitHub / 远程设备 / Vercel 状态。没有运行的测试不写成通过；远程设备离线时不推断本机代码状态。

## 1. 本次核验结果

| 项目 | 实际核验结果 | 判定 |
|---|---|---|
| PR #21 | Open、Draft、未合并；head `feat/task-unblocking-dispatch-20261016`，base `feat/general-agent-closed-loop-20261012` | 等待集成验收 |
| PR #22 | Open、Draft、未合并；head `feat/scientific-growth-runtime-20261017`，base `feat/general-agent-closed-loop-20261012` | 等待集成验收 |
| PR #25 | Open、Draft、未合并；head `feat/captain-runtime-20261018`，base `feat/general-agent-closed-loop-20261012` | 队长集成分支，等待验收 |
| PR #35 | Open、Draft、未合并；head `feat/intervention-evidence-20261023`，base `feat/captain-runtime-20261018` | 依赖 #25，不能独立当作主分支已具备 |
| head commit 状态检查 | #21/#22/#25/#35 的 combined status 查询均未返回状态检查记录 | `NOT_VERIFIED`，不能等同测试通过 |
| 远程设备 | phucmanh146@gmail.com 对应设备 Offline（最后在线约 54 小时前）；另一个已连接账户设备也 Offline（最后在线约 9 小时前） | 本机测试/截图核验 `BLOCKED` |
| Vercel | 已找到 shangan-ya 与 shangan-ya-api 项目；部署列表请求返回 403 scope 权限错误 | 生产部署状态 `BLOCKED`，不能宣称已部署或可用 |
| 真实模型 / 真人 V2 | 本次没有可核验的实时模型 trace、非作者执行日志、真实 V2 和独立复核记录 | `NOT_RUN / NOT_VERIFIED` |

PR 元数据入口：
- https://github.com/phucmanh146-dot/shangan-ya/pull/21
- https://github.com/phucmanh146-dot/shangan-ya/pull/22
- https://github.com/phucmanh146-dot/shangan-ya/pull/25
- https://github.com/phucmanh146-dot/shangan-ya/pull/35

## 2. C/队长本轮负责事项

### C1｜先恢复可验证环境（阻塞项）
1. 在 Desktop Commander 管理页重新让目标设备上线；不要重复安装已经安装过的程序。
2. 设备在线后，先只读核对仓库路径、当前分支、工作区改动、Python/Node 版本和最近提交；任何已有改动先备份，禁止覆盖队友工作。
3. 重新读取 PR head commit 的 CI 状态与日志；若仓库未配置 CI，明确写 `NO_STATUS_CHECKS`，再在实际运行环境执行对应测试。
4. 解决 Vercel scope 授权后，读取最近部署、环境、commit 和访问结果；403 解除前保持 `BLOCKED`。

### C2｜分支集成门
1. 先比较 #21 与 #22 是否有重复改动或冲突；不能直接把两个 PR 都合入同一基线而不审查。
2. 按依赖顺序检查 #21/#22 → #25 → #35；每一步记录 base/head SHA、文件差异、测试命令和结果。
3. 只有基线、冲突、回归和保护门都通过后，才提出合并建议；本记录本身不执行合并。
4. 必须重点验证：无 grounded micro_steps 不可执行；未提交真实 V2 不可完成；旧版本复核不能通过新版本；已完成/锁定任务不被重排覆盖。

### C3｜真实创新闭环
先选两个类型明显不同且材料可读取的真实作品，跑通：
`真实 V1 → A 有证据 gap → B 专属微动作 → 非作者独立执行 → 真实 V2 → A/第三人按冻结标准复核 → B 只重排 FAIL/UNKNOWN → C 保存 trace`。

必须保留原件版本/hash、官方目标标准、行动卡、执行人、开始耗时、实际耗时、求助次数、V1/V2 差异、独立复核和对应 commit。没有证据就标 `BLOCKED`、`NOT_RUN`、`FAIL` 或 `UNKNOWN`。

## 3. 三人任务分配与交付门

### A 同学｜真实作品诊断（先于 B）
- 冻结原件版本/hash、赛事年份/赛道和官方目标标准。
- 每个首轮真实样本至少提交 3 条可回查 gap；每条包含当前作品 locator、原文证据、标准来源/位置、参考原始 locator、可迁移方法、适用条件和补证动作。
- 证据不足必须 `UNKNOWN/BLOCKED`；另一成员随机抽查至少 10 条定位记录。
- 交付：样本登记、标准映射、gap 清单、失败案例和同输入复测证据。

### B 同学｜私人定制行动与真实 V2（依赖 A）
- 只消费 A 已核验的 gap；每张卡包含 input_version、target_locator、action、reason、expected_change、output、self_check、failure_next、capability_basis、source_refs。
- 不同项目类型必须产生不同动作；缺定位或微步骤时保持 `BLOCKED/UNSCHEDULED`，禁止万能三步回退。
- 至少两个不同类型真实作品由非作者照卡执行，记录耗时、求助和卡点，提交 V2；B 不得自评通过。
- 交付：行动卡、盲执行日志、V1/V2 差异、修复 commit 和回归结果。

### C/队长｜环境、集成、状态保护与独立总验收
- 先解除远程设备和部署核验阻塞，再进行本机/浏览器测试。
- 核验 PR 依赖和 CI，不覆盖队友修改；每个失败关联根因、修改文件/函数、commit 和同输入回归。
- 组织 A→B→真人→独立复核→局部重排闭环，检查恢复和版本保护。
- 核心链路通过后再组织 5–8 位同学做探索性同任务对照；固定判据并记录首步耗时、V2 盲评质量、独立执行率、求助次数、负担和成本。
- 交付：分支/PR/CI/部署核验表、真实 trace、V2 与独立复核证据、GO/REVISE/STOP 决策。

## 4. 当前结论

当前可确认的是 GitHub 上的 PR 状态和已有文档/工程测试报告；不能确认本机当前工作区、真实模型质量、生产部署可用性或真人闭环。创新主张应保持“待真实验证”，不得把工程测试、模拟样本或批注数量当作获奖能力证明。

下一步先解除 C1 的远程设备与部署权限阻塞，然后按 A → B → C 依赖执行。