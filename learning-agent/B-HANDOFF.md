# B 行动与排程：首轮可运行交付

启动：`python learning_agent_server.py --port 8901`，访问 `http://127.0.0.1:8901/planner.html`。
载入演示 → 生成任务卡 → 勾选任务 → 编辑可用时段 → 预览排程 → 导出 JSON。
页面草案不持久化，刷新前导出；正式采纳、撤销、版本保存属于队长模块。

接口：
- POST `/api/agent/planner/generate`：`{diagnosis, context:{deadline}}`
- POST `/api/agent/planner/replan`：`{diagnosis, plan, settings, expected_plan_version}`
- Python 调用 `action_planner.generate(diagnosis, context)` 可作为队长 `PLANNER` 的适配函数；尚未合并或端到端接线。

已覆盖：B1 有来源及验收条件才生成任务；B2 已验证能力跳过学习，未验证走学习→练习→作品；B3 估时范围与依赖循环检查；B4 截止、容量缺口及调整选项；B5 用户选任务再排；B6 临时占用、锁定冲突、保留未受影响安排和版本检查。

输入扩展：gap.acceptance_criteria 必填；gap.estimate_minutes_range、steps、depends_on_gap_ids 可选。成员 verified_capabilities 是已验证能力名称列表，不能把自述直接放进去。默认估时只是显式假设。

局限：当前为确定性规则草案，没有真实模型/搜索调用；不是 B 全部验收完成。共同负责人任务尚不支持联合排程；不自动缩减产物范围；学习步骤仍需结合 A 的具体资料细化；实际用时通过 remaining_minutes 人工修正，尚无统计校准模型；前置未验收保持阻塞，尚不做跨里程碑预测排程。页面为 JSON 导入与勾选式首版，暂无计划包导入及编辑任务卡 UI。

`b_capacity.py` 复用队长工作区现有周期排程计算器，独立命名避免覆盖队长文件；后续联调应收敛为共享模块。

验证：`python -m unittest test_action_planner test_agent`（36 项通过）；`node --check planner.js`。新增测试涵盖 30/90 分钟容量差异、来源缺失、技能路径、前置阻塞、临时占用、锁定冲突、版本冲突、循环依赖及完成状态保护。浏览器交互尚未验收。
