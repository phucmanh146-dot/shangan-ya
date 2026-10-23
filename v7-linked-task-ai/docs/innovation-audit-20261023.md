# 上岸鸭创新性验证与三人批注（2026-10-23）
状态：进行中；不是完整真人闭环验收。
代码位置：D:\shanganya-full-public-20261017\agent_runtime.py。
材料：已读取 D:\上岸鸭竞品拆解与过程干预方案（含大模型技术分析）-3.docx；尚未确认与用户上传的 -3(10).docx 相同。湘秀未来作品尚未定位。

## 实测结果
- 已验证（接口层）：create_task → checkpoint → recover；V1、第3段、验收标准和下一步跨 s1/s2 保留。
- 已验证（接口层）：get_task(taskId, otherAccount) 返回 None。
- 失败：complete_task 在无作品V2、无复核结果时仍返回 completed。完成证据门缺失；不能把任务完成等同作品达标。
- 部分验证：有 nextStep/attempts/自定义 state 存储，但本轮字段由测试者写入，未证明Agent能从真实作品自动生成有效行动卡。
- 未验证：真人5分钟内开始、真实材料定位准确性、状态驱动干预、真人执行内循环、V1到V2外循环、资料不足拒答及替代路径、三角色交接和5到8人试用。
- Vercel：项目 shangan-ya / shangan-ya-api 已找到；详情403，团队访问受限。
- GitHub：phucmanh146-dot/shangan-ya 主分支为部署zip，不能证明与本机代码一致。
测试使用临时SQLite数据库，无Mock模型调用；不读取业务账号记录。

## A 诊断与复核批注
创新性应落在可核验的证据链。每条诊断绑定真实作品文件指纹、版本、页段/位置、原文和判据；资料不足标未知并给求助路径。先对湘秀未来真实V1生成诊断，再由另一成员核对位置。验收：能从诊断回到原材料；V2逐条输出通过/未通过/未知，缺少证据不得判通过。

## B 行动与排程批注
当前能保存位置与下一动作，但还未证明卡片可照做。将每张卡绑定A的诊断、文件版本、编辑位置、5分钟首动作、可提交小产物和验收标准。由另一位成员实际照卡执行并计时；疲惫时缩小动作，卡住时记录尝试并换策略，最多两轮后求助。验收：真人首动作时间及作品差异均有记录，不能用生成卡片耗时代替启动耗时。

## C 总调度批注
优先修复完成证据门：调用complete_task不得绕过V2、复核与人工确认；checkpoint(status=completed)也需同一门。存档包括文件/版本/位置、已尝试、下一步、返回条件和承诺。关闭进程后恢复，再交V2复核，只重排未通过项。验收：无证据完成被拒绝；真实闭环各阶段留记录；试用数据区分真人、工程测试和模型评测，禁止包装Mock为效果。

## 复现
使用同目录 audit_innovation_20261023.py（待保存）；运行 python docs/audit_innovation_20261023.py。
本轮原命令：python -c 导入agent_runtime；a.DB_PATH设为临时目录/audit.sqlite3；创建audit账号任务；checkpoint写入V1/第3段/acceptance；跨会话recover；get_task检查other账号；直接complete_task。
原输出：checkpoint_cross_session passed=true；account_isolation passed=true；completion_evidence_gate passed=false actual=completed。

## 第二轮实测补充
使用真实竞品方案 -3.docx（尚未确认与 -3(10) 相同），SHA256=316ff612ad17384fc6234eb10aa3232853e4287a92af0d007620c7370cfd08ee。提取正文18271字，source_workflow.prepare分5段；拼接与原文一致，各段start/end对应原文字串，空材料被拒绝。此验证只覆盖提取文本，无图片/OCR与诊断质量结论。
复现：python docs/audit_real_source_20261023.py。原始结果保存 docs/real-source-audit-20261023.json；全文提取保存 docs/competitor-source-extracted-20261023.txt。
config_snapshot仅检查布尔状态：base=false、model=false；实际run_agent返回“尚未配置可用模型，不能启动 Agent 循环”。未读取或输出密钥。
在D:/data、D:/code、D:/shanganya-private、D:/shangan-ya-ai-backend及Documents/Codex搜索湘字文件未命中；不是全盘材料不存在的证明。湘秀未来真实作品和真人试用仍未验证。

## 版本核对纠正
GitHub PR21仍open未合并，固定提交32f68654a6cd59a31f442e5fb3c9b008d84eab7e；PR22仍open未合并，提交5aa5c817a63cb422232c82b469d135ebe706c58b。方案指向learning-agent，与本机agent_runtime.py并非同一实现。此前完成证据门失败只适用于本机agent_runtime.py，不能外推PR21/22。PR21 team_revision.advance源码包含实际成果approve、提交版本一致和证据引用校验；仅源码检查，不算真人运行通过。已取得42个Python源码文件固定快照。独立unittest复跑遇到SQLite无法打开和临时目录权限错误，结果55 tests/errors=12，不作为功能失败或通过证据。

## PR21固定提交工程复跑
提交32f68654a6cd59a31f442e5fb3c9b008d84eab7e，测试模块test_action_planner、test_team、test_handoff、test_team_rescue、test_recovery。补齐team.html/team-recovery.js，使用python -X utf8，TEMP/TMP/SHANGAN_AGENT_DATA指向隔离工作区后，61项非HTTP测试通过，4.457秒。3项HTTP测试明确排除：套接字访问WinError10013。未修改业务代码。
测试覆盖执行状态、版本/成员/判据冲突、失败复核阻止批准、收件不自动完成、现场恢复和SQLite持久化；测试内诊断/worker使用控制夹具，因此仅为工程验证，不是湘秀未来真实作品或模型效果验证。不宣称原PR全部198项复跑通过。

## 真实DOCX在PR21解析器复测
固定提交的artifact_store.parse实际读取同一SHA256竞品文档，得到641个文本定位单元，首项paragraph:2，末项paragraph:225；包含表格单元格定位。已验证文字解析，不证明诊断或真人启动效果。限制：不分析图片、音频、DOCX分页或版式。

## 湘秀未来真实V1已定位并确认
用户确认使用 D:\上半年参加的创赛\湘匠织秀——自己——无结果\湘秀未来(1).pptx。原件28016919字节，SHA256 feb270de2ebe478966c635a4452b5f49dac82f6658fd54d4a0f1da7e1b703155。实测原件解析被展开10MB限制拒绝，上传接口另有2MB限制。未修改原文件、未放宽安全限制。
替代路径：按实际幻灯片顺序提取16页8443字，标明slide/paragraph；仅文本，不含图片/版式。调用PR21真实create→import_file→read，SQLite落盘303个定位单元，读取哈希一致。隔离项目ID 653d2f176e8e4e91a133fcb50a311ba4。尚无模型诊断、真人执行或V2复核。
三人批注补充：A需核验文字以外的图片与版式证据，不能把提取文本当完整PPT；B首动作先处理大文件可导入路径并说明降级范围；C应将原件受限/文本替代记为部分验证，不能将替代导入视作完整闭环成功。
