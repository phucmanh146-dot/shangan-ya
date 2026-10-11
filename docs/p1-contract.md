# P1 三人交接约定 v0.1

这是依据协作手册整理的交接约定。队长已实现独立总控接收层、版本保存与成果验收，见 [队长交付与 API](captain-delivery.md)。原学习路线未自动迁移到新格式；A/B 的真实模块仍待连接。

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

## 7. 精细指导扩展：队长接收层已支持，真实生成仍待 A/B

2026-10-11 队长分支开始校验、保存并展示以下可选字段。旧 v0.1 数据仍可使用；没有 `micro_steps` 的任务会显示“待 B 补充精细指导”。字段齐全只代表格式与引用关系合格，不代表定位、数据或建议已经核实。

### A 的材料与差距

| 字段 | 格式与约束 |
| --- | --- |
| `Diagnosis.artifact_versions` | 可选列表；每项含非空 `artifact_id`、正整数 `artifact_version`、非空 `title`；同一材料同一版本不能重复 |
| `gap.current_artifact` | 可选对象 `{artifact_id, artifact_version}`；必须在上述材料列表中登记 |
| `gap.current_locator` / `target_locator` | 可选非空文字，例如文档章节、表格行列、代码文件与函数；缺少位置时省略并在 unknowns 说明，不能虚构 |
| `gap.reason` / `applicability` / `verification_method` | 可选非空文字，分别解释差距原因、参考适用条件和核验方法 |

总控没有读取这些材料文件，因此材料列表是 A 的声明，不是自动验真。实际文件版本、页码、数据口径及引用内容由 A 核实。

### B 的细步骤

`task.micro_steps` 是可选的非空对象列表；一旦提供，每项必须包含：

| 字段 | 内容 |
| --- | --- |
| `step_id` | 本任务内唯一的非空标识 |
| `input_version` | 对象 `{artifact_id, artifact_version}`，必须引用 A 已登记的材料版本 |
| `target_locator` | 具体操作位置，非空文字 |
| `action` / `reason` | 做什么、为什么这样做，非空文字 |
| `expected_change` / `output` | 做完有什么变化、留下什么产物，非空文字 |
| `self_check` / `failure_next` | 怎样自检、卡住后怎样推进，非空文字 |
| `capability_basis` | 操作所需能力与成员现有证据；未知需写明待确认，不能假定成员已具备 |
| `source_refs` | 可选的非空来源 ID 列表，必须存在于 Diagnosis.sources；省略时页面展示任务的来源 |

`steps`、`acceptance_criteria`、依赖、DDL 等原字段继续保留。材料名加版本能定位引用对象；总控尚不能证明 B 的动作真实可执行、估时准确或参考方法适合本任务。

### 人工逐项验收

精细任务的 `POST /feedback` 在 `action=approve` 时必须附 `criterion_results`，顺序和数量与该任务 `acceptance_criteria` 一致：

```json
{
  "criterion_results": [
    {"criterion": "对应的验收条件原文", "passed": true, "evidence": "实际看到的成果位置、数字或验证记录"}
  ]
}
```

每项必须有非空证据和布尔通过状态；任一未通过就不能写成 completed，使用 reject 退回修改。记录与已提交成果版本一起保存。旧任务的旧 API 调用仍兼容；新版页面统一引导逐项核对。成员选择仍是本机记录，不是身份认证；这里不是 A 的自动成果复核。

`change_impacts`、`reference_breakdown`、`capability_evidence` 等更完整的研究输出及差距自动关闭，仍需 A/B 的实现和共同联调，本次不声称已接通。
