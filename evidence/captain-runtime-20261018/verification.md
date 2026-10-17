# 队长运行机制工程核验记录

核验日期：2026年10月18日（本轮用户日期）。关联Issue #7。代码候选分支：feat/captain-runtime-20261018。

## 输入与范围

- 本轮读取Issue #7正文及全部16条评论。
- 本地读取用户上传《上岸鸭_新版PRD与总调度_20261017(3).html》及《上岸鸭_新版PRD_任务接续与状态调度_20261017(3).docx》，没有通过文件库重新读取附件。
- 代码基线：PR #22 5aa5c817a63cb422232c82b469d135ebe706c58b；集成PR #21 32f68654a6cd59a31f442e5fb3c9b008d84eab7e。
- 在隔离worktree修改，原有未提交工作保留。

## 已取得的工程结果

最终本地组合命令：python -m unittest discover -q。实际输出：

```text
Ran 222 tests in 6.883s
OK
```

JavaScript：node --check team.js、team-recovery.js、team-runtime.js通过。Python相关文件py_compile和git diff --check通过。

| 边界 | 实际证据 | 范围 |
| --- | --- | --- |
| 静态入口→服务 | GET team.html、team-recovery.js与team-runtime.js返回200 | 静态资源及脚本语法；没有冒充浏览器实际点击 |
| API→SQLite | 保存现场、记录尝试、显式会话确认，经HTTP可重新读取 | 受控材料字节与实际SQLite |
| 新会话→准确现场 | recover先返回未关联候选；confirm后读到同一checkpoint、action与原文 | 不开始任务、不改变项目版本 |
| 并发与隔离 | 旧版本confirm返回409；同名artifact另项目原文不混入；旧诊断焦点失效 | 确定性防护，不是多租户认证证明 |
| 工具与循环 | 实际SQLite保存failed/blocked记录；重复read在有限轮数内终止 | 受控工具故障与模型输出 |
| 重试与上下文 | 完整messages每次检查；第二次请求不重复全套原文；超限不调用模型 | 字符预算，不是token计费或模型质量 |
| 进程恢复 | 新Python进程读同一SQLite，找到原checkpoint与blocked状态 | 独立进程，不等于另一台电脑已复现 |
| 成果保护 | 提交准确V2仍pending_review，保留提交版本和原动作 | 不以按钮/找回动作自动验收 |

新增测试在test_captain_runtime.py，共17项。现有跨会话测试更新为“明确确认后才关联”；现有卡点测试使用行动卡的实际step_id，保留对伪造ID和旧版本的拒收测试。

## 未取得的验收

- 真实模型的模糊意图匹配、诊断准确性及失败后策略质量。
- 另一成员独立按卡完成真实V2、有效复核、人工确认与剩余计划采用。
- 保留集、同条件效果与真实用户试用。
- 实际浏览器交互：当前执行环境无可用浏览器内核。
- 用户电脑独立运行：初次远程命令确认Python/Git/Node路径可用；后续进程输出与Python版本请求未取得回执，未将其记成通过。
- main合并、公网部署及赛事提交。

工程夹具、HTTP检查与真实用户收益分别记账。上述未知项继续保留，不关闭Issue #7的真人闭环要求。
