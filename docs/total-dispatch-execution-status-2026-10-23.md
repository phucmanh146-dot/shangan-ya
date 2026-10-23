# 上岸鸭 C/队长执行版总调度｜真实作品私人定制闭环（2026-10-23 更新）

> 本文是执行状态更新，不替代既有《上岸鸭总调度｜真实作品驱动的私人定制测试与三人迭代》及全作品回归计划。所有结论只按当前可核对的 GitHub 记录填写；未实际执行的事项不得写成通过。

## 1. 本轮目标

验证上岸鸭是否能针对“这个人、这份真实作品、这个目标”生成可执行的专属提升动作，并跟进到真实 V2、独立复核和后续重排。

**唯一有效的核心链路：**

真实 V1 + 官方目标标准 → A 证据化 gap → B 专属微行动卡 → 非作者独立执行 → 真实 V2 → A/第三人按冻结标准复核 → B 只重排 FAIL/UNKNOWN → C 保存 trace、版本和回归记录。

优秀作品只用于提取方法，不复制内容、指标或版式。模拟样本只用于边界测试，必须标注 SYNTHETIC，不能代替真实成果。

## 2. 当前可核对进度

| 项目 | 当前状态 | 说明 |
|---|---|---|
| Issue #7 三人批注 | 已有 | A：真实作品证据诊断；B：私人定制行动卡和真人 V2；C：集成、版本保护和证据总验收 |
| 总调度文档 | 已有 | main 上已有 total-dispatch-real-personalized-agent-test-2026-10-23.md |
| 全作品回归计划 | 已有 | main 上已有 agent-real-work-samples-regression-plan-2026-10-23.md，列有样本、T01–T14 测试情境和证据分级 |
| PR #21 | Open，未合并 | 描述 198 项工程测试通过；真实浏览器/视觉验收和真人闭环仍待完成 |
| PR #22 | Open，未合并 | 描述 70 项工程测试通过；真实项目 V2 闭环仍待验收 |
| PR #25 | Open，未合并 | 描述 227 项工程测试通过，包含受控 Windows/Chrome 检查；不能等同真实模型或真人成果 |
| PR #35 | Open，未合并 | 描述 239 项 Python 测试和受控无头浏览器流程通过；记录 A 5/20、B 0/20、C 5/20 为流程证据覆盖，不是成员能力或竞赛分数 |
| 真实模型语义质量 | 待验证/可能阻塞 | 既有记录称尚未完成当前 runtime 的真实模型验证；必须保存当前输入、输出和 trace 后才可判定 |
| 真人 V2 + 独立复核 | 未取得完整证据 | 尚不能把工程测试通过当作私人定制创新通过 |
| 5–8 人试用/同任务对照 | 未取得结果 | 不能报告用户效果提升比例 |
| 生产部署 | 未确认 | 既有记录指出部署访问出现 403；需重新核验公开访问、真实测试账号和最终部署版本 |

**阶段判断：工程底座和受控测试已有进展；“按真实作品进行私人定制并推动真人完成 V2”的核心创新仍待真实模型、独立执行和独立复核验证。当前不能宣称已达到国赛获奖水平。**

## 3. 三人批注与交付门

### A｜真实作品、官方标准与证据诊断

**主责：** 真实作品登记、版本/hash、赛事年份/赛道、官方评分标准、材料可读覆盖率和差距诊断。

每条 gap 必须包含：
- 当前作品版本和精确原件 locator（页/段/表格/代码位置）；
- 当前原文证据与目标标准来源/位置；
- 参考作品原始位置、只提取的可迁移机制、适用条件；
- 事实/推断/未知、影响与补证动作。

**验收：** 首轮真实样本每个至少 3 条可回查 gap；随机抽查至少 10 条，另一成员能定位正确版本和原文。没有 locator、标准或证据时标 UNKNOWN/BLOCKED，不交给 B 生成生产行动卡。

批注链接：https://github.com/phucmanh146-dot/shangan-ya/issues/7#issuecomment-6366387827

### B｜私人定制行动卡、真人执行和 V2

**主责：** 只消费 A 已核验的 gap，生成按项目类型和执行人条件定制的微动作。

每张卡至少包含：
`input_version / target_locator / action / reason / expected_change / output / self_check / failure_next / capability_basis / source_refs`，并记录依赖、预计/实际耗时、求助次数和完成定义。

首步需在 1–5 分钟内启动并产生可检查的小产物。缺 grounded micro_steps 或 locator 时必须 BLOCKED/UNSCHEDULED，不得退回万能三步。至少两个不同类型真实项目要由未参与诊断/编卡的人盲执行并提交真实 V2；B 不得自评通过。

**验收：** 行动卡 + 独立执行日志 + V1/V2 + 实际耗时/卡点 + 独立复核 + 修复回归，缺一不可。

批注链接：https://github.com/phucmanh146-dot/shangan-ya/issues/7#issuecomment-6366377382

### C｜队长：集成、恢复、版本保护和总验收

**主责：** 维护唯一可信进度，保证 A 的证据、B 的行动、真人产物、独立复核和剩余项重排连通。

本轮执行顺序：
1. 核对 PR #21/#22/#25/#35、实际运行分支、CI、模型配置、部署版本；先备份，不覆盖队友修改。
2. 核验真实 V2 未提交、A 未按当前版本复核、必要人工确认缺失时，系统不能标 completed。
3. 验证旧版本回调、跨项目串线、缺 micro_steps 仍可执行、两轮无产物仍重复原策略、已完成/锁定任务被重排覆盖等边界。
4. 组织真实链路：V1 → A gap → B 行动卡 → 非作者执行 → V2 → A 独立复核 → B 只重排 FAIL/UNKNOWN → C 保存 trace。
5. 每次失败关联根因、修改文件/函数、commit、修复前后同输入结果和回归结果。
6. 核心链路通过后，再组织 5–8 位同学做探索性同任务对照，记录首步耗时、恢复耗时、产物质量、独立执行率、求助次数、用户负担和成本。
7. 最后给出 GO / REVISE / STOP，并为每项结论附证据。

**验收：** 真实模型 trace、真实 V2、独立复核和状态保护证据齐全，才可将该条标记 HUMAN_LOOP_PASS。

批注链接：https://github.com/phucmanh146-dot/shangan-ya/issues/7#issuecomment-6366378980

## 4. 这轮最先做什么

| 顺序 | 负责人 | 下一步 | 完成证据 |
|---|---|---|---|
| P0-1 | C | 检查当前仓库分支/PR/CI/模型配置/部署；记录实际状态并备份 | 状态表、commit/CI 链接、模型与部署检查记录 |
| P0-2 | A | 选择原件可读取、官方目标明确的真实作品，冻结版本与验收判据 | 样本登记、标准来源、每个样本至少 3 条 grounded gap |
| P0-3 | B | 依据已核验 gap，为两类不同真实作品生成不同微动作卡 | 行动卡字段齐全；缺证样本正确 blocked |
| P0-4 | B + C | 由非作者独立执行，产出 V2 并记录用时/卡点 | 盲执行日志、真实 V2 路径、V1/V2 差异 |
| P0-5 | A + C | 按冻结原标准逐项复核；B 只重排未通过项 | PASS/FAIL/UNKNOWN、复核证据、replan diff |
| P1-1 | 全员 | 完成失败修复与同输入回归，再做 5–8 人探索性对照 | trace、commit、回归结果、原始试用数据 |

## 5. 统一状态，不允许混算

- `ENGINEERING_PASS`：工程/单元测试通过。
- `SIMULATED_PASS`：仅模拟样本通过。
- `LIVE_MODEL_PASS`：真实模型和真实工具调用通过，保存可复现 trace。
- `REAL_ARTIFACT_PASS`：真实作品的证据诊断符合冻结判据。
- `HUMAN_LOOP_PASS`：非作者执行真实 V2，另一人独立复核通过。
- `BLOCKED`：模型、原件、官方标准或权限缺失，需说明解除动作。
- `NOT_RUN`：尚未执行；`FAIL`：未达到判据；`UNKNOWN`：证据不足。

这些状态不能互相替代。测试数量不能简单跨 PR 相加；工程夹具通过不等于模型效果或真人效果。

## 6. 每次执行的必填记录

```text
case_id / sample_type(R or S) / project_id
input_artifact / version / hash / official_target_source
frozen_acceptance_criteria / branch / commit / runtime / model_provider
agent_input / raw_output / tool_trace
expected_vs_actual / PASS-FAIL-UNKNOWN-BLOCKED-NOT_RUN
failure_root_cause / changed_file_function / commit
same_input_before_after / regression_result
executor / start_latency / elapsed_time / help_count
V1_path / V2_path / reviewer / criterion_results
next_owner / next_action / due_date
```

## 7. 本轮结论

创新方向值得验证，但不能靠“有功能”“有批注”“测试数量多”证明成立。最重要的下一步不是再堆功能，而是完成两种真实作品的私人定制行动卡与至少一条完整真人闭环；若本机远程设备不可用，C 的本机测试必须标 BLOCKED，不能声称已经运行。

相关入口：
- Issue #7：https://github.com/phucmanh146-dot/shangan-ya/issues/7
- 全作品回归计划：https://github.com/phucmanh146-dot/shangan-ya/blob/main/docs/agent-real-work-samples-regression-plan-2026-10-23.md
- 原总调度：https://github.com/phucmanh146-dot/shangan-ya/blob/main/docs/total-dispatch-real-personalized-agent-test-2026-10-23.md
