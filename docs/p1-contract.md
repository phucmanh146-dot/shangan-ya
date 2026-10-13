# P1 三人交接约定 v0.1

这是依据协作手册整理的**待接入接口约定**。现有代码未自动采用这些新字段；第一轮由队长组织 A/B 共同确认，再编写兼容现有数据的适配层。

## 1. 共用上下文

| 字段 | 含义 |
| --- | --- |
| `schema_version` | 数据格式版本；本草案为 `0.1` |
| `mode` | `demo` 或 `live`；标记生成方式，不能仅靠此字段声称真实调用通过 |
| `project_id` | 项目唯一标识 |
| `member_id` | 成员标识，不以邮箱当作公共标识 |
| `artifact_id` / `artifact_version` | 材料与版本 |
| `deadline` / `timezone` | 带时区的截止日期；按用户所在地确认 |

## 2. A 交给 B：Diagnosis

包含 `diagnosis_version`、`requirements`、`sources`、`artifact_status`、`member_profiles`、`gaps`、`resource_candidates`、`unknowns`。

每个 gap 至少有 `gap_id`、`current_evidence`、`target_result`、`gap_type`、`related_member_ids`、`required_capabilities`、`source_refs`、`priority_reason` 和 `verification_status`。

来源区分官方要求、用户材料、参考案例和 Agent 建议。未知不能被空字符串悄悄覆盖；缺少来源的结论写明待核验。

## 3. B 交给队长：Plan

包含 `plan_version`、`based_on_diagnosis_version`、`tasks`、`learning_paths`、`time_blocks`、`dependencies`、`unscheduled` 和 `assumptions`。

每个 task 至少有 `task_id`、`gap_ids`、`owner_ids`、`steps`、`deliverable`、`acceptance_criteria`、`estimate_minutes_range`、`depends_on`、`deadline`、`source_refs` 和 `status`。

状态为 `candidate → scheduled → in_progress → pending_review → completed`；`blocked` 表示卡住。验收失败返回修改意见并回到进行中或卡住，不直接写成 completed。队长需要映射现有代码的旧字段与状态，迁移时保留已有进度。

## 4. 队长反馈给 A/B：Feedback

包含 `task_id`、新产物版本、`actual_minutes`、`blocker`、`unexpected_event`、`availability_change` 和 `expected_plan_version`。

A 复核新证据与相关差距；B 重算受影响安排，返回前后差异和原因。队长展示、由用户选择采用后保存。版本冲突应要求刷新；完成任务与锁定安排不得被重排覆盖。

## 5. 第一轮只需验证这个例子

以下是**人工构造的 Demo 片段，不是已实现接口响应，也不是正式比赛要求**。

```json
{
  "mode": "demo",
  "project_id": "example-project",
  "diagnosis_version": 1,
  "gap": {
    "gap_id": "gap-1",
    "current_evidence": "本示例输入里没有操作说明",
    "target_result": "首次使用者能按步骤跑通一次流程",
    "verification_status": "demo_fixture"
  },
  "plan": {
    "plan_version": 1,
    "based_on_diagnosis_version": 1,
    "task_id": "task-1",
    "gap_ids": ["gap-1"],
    "owner_ids": ["member-captain"],
    "first_step": "打开现有页面，记下从输入到出现结果的第一个操作",
    "deliverable": "一份操作说明和一次试用记录",
    "acceptance_criteria": ["另一位成员照说明跑通并记录卡点"],
    "estimate_minutes_range": [20, 40],
    "status": "candidate"
  }
}
```

上例为理解交接关系而缩短，省略的正式字段按前文补齐。示例估时是待校准假设，不能当作所有成员的固定能力标准。

## 6. 三方共同验收

1. A 的 gap_id 到 B 的 task 再到执行记录保持一致。
2. 修改诊断版本后，旧计划能被识别并提示更新。
3. 同一组任务，30 分钟与 90 分钟的安排不同且无冲突。
4. 前置任务未完成、来源未核实、模型失败均显示相应状态。
5. 成果验收改变差距状态，并保留所用证据版本。
6. Demo 只验证数据传递；Live 另以真实模型与搜索记录验收。

## 7. 精细指导扩展（设计提案，尚未接入运行时）

对应 [三人开发任务 v2](team-tasks-v2.md)。保留 v0.1 现有字段兼容性，不宣称现有接口已校验以下字段。
- A 补充 artifact_versions、change_impacts、reference_breakdown、capability_evidence；gap 补充 current_locator、target_locator、reason、applicability、verification_method。
- B 在 task 中新增可选 micro_steps：step_id、input_version、target_locator、action、reason、expected_change、output、self_check、failure_next、capability_basis。上层 task 的依赖、DDL 与交付标准继续保留。
- Feedback 补充成果版本/定位、用户自己的解释、检查证据与仍存缺口；A 给复核结论，B 给局部指导更新，队长保存确认状态。
- 上述定位适配不同成果类型，不能写死为 PPT；未知明确标记，不能由模型虚构定位。接入时先增加兼容读取和契约测试，再启用要求这些字段的新流程。
