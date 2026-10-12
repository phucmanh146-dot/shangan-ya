# 上岸鸭：通用竞赛科研任务推进Agent
更新：2026-10-12。当前方案依据用户明确的通用范围修订，下面新增数据与功能均待实现/验收；现有0.1接口不会因文档更新自动生效。

## 产品承诺与使用范围

用户带来：已有作品、目标、本人负责部分、对任务的理解、能力证据、可用工具和时间。系统输出：有依据差距、对应当前错误的具体学习与操作、实际成果复核、下一轮剩余任务。

使用范围设计包含学科竞赛、互联网黑客松、名企商赛、科研。每个项目按自身标准、交付物和实际条件处理。全国竞赛目录及学校A类认定、届次和赛道分别存储；历史84项目录按版本导入，不宣称已验证全部赛事。

产品内成员职责依据本人领的实际产物，例如数据分析、后端、访谈、复现。开发组A/B/队长负责实现诊断、行动与总控三个模块，不将开发标签强加给所有用户团队。

## 通用输入：本人到底负责什么

| 对象 | 最少要表达什么 | 信息未知时怎么处理 |
| --- | --- | --- |
| ProjectContext | 项目类型、主办/导师、届次/赛道、官方或导师条件、用户目标、硬截止、成果格式及来源版本 | 奖项目标保留，转为本轮可验收成果；缺规则不编权重 |
| MemberTaskBrief | 本人交付物、负责边界、决定范围、依赖、验收人、本人用自己的话解释目标/做法/判据 | 把影响下一步的职责或理解问题单列补问 |
| ArtifactSnapshot | 实际文件/代码/数据、ID、版本、SHA、可返回的原文位置 | 未能读取则保留警告，未支持格式明确返回 |
| CapabilityEvidence | 当前操作技能、自述、已有作品或试做、判据、错误、环境与核验范围 | 未验证先试做，不能自动转为不会或已会 |
| ResourceEvidence | 作者、课名、小节/片段、URL、日期、语言/先修/访问条件、对应错误、练习、复试标准 | 无具体定位不生成虚构视频分钟；不可访问给已核对替代 |
| WorkContext | 可用工具/账号、本人确认空档、占用、真实用时、当前卡点 | 不猜日程或凭据；可先完成不依赖未知项的准备 |

建议以上对象作为兼容扩展/配套证据，由现有project_id、member_id、artifact版本、gap、task等关联；不是已存在的新API。迁移需验证原0.1记录能保留。

## 指导逻辑与生成约束

1. 读取本项目标准和实际作品，核对本人理解和已领任务，输出理解差距、成果差距、能力未知、环境或外部依赖。
2. 查与当前操作相关的实际能力证据；不足时做最小试做，记录实际错误。
3. 已验证则制作；未知先试做；试做失败只补相关小节与练习，复试通过后回作品。
4. 每张行动卡包含材料版本/位置、动作、理由、预期变化、产物、自检、失败下一步、能力依据和来源。
5. 实际执行/求助绑定动作、项目及版本；用户或工具交新成果。
6. A打开真实新版逐条件Review；人工确认后更新Diagnosis，B只修改剩余/受影响项，队长预览/采用并保留历史。

资源选择依次检查当前错误与技能匹配、本人先修/工具/语言/时间、作者和来源、章节可访问、练习能否验证。不用“学Python”“看看视频”作为已完成推荐。不按同一字符串或博主热度直接决定所有人的学习路线。

同一数据任务：已能读CSV与清洗的人直接交真实清洗日志/统计口径；CSV读取未知的人先试做；读取已会但混淆缺失与0的人只补缺失值。教学路径不同，目标作品的判据保持一致。

## 首批可查作者与小节

作者来自当前Hello Agents官方共创导航及课程维护方；目录、链接与代码已核对，视频未取得全文字幕的不标成已观看。

| 当前卡点／使用者 | 具体作者与课程 | 当次必须制作的产物 |
| --- | --- | --- |
| A不会把读取工具接诊断 | 范丽：ReAct Agent；[Hello Agents第4章4.2](https://github.com/datawhalechina/hello-agents/blob/main/docs/chapter4/%E7%AC%AC%E5%9B%9B%E7%AB%A0%20%E6%99%BA%E8%83%BD%E4%BD%93%E7%BB%8F%E5%85%B8%E8%8C%83%E5%BC%8F%E6%9E%84%E5%BB%BA.md) | read_artifact实际返回→有出处Diagnosis→原始调用记录 |
| B动作笼统／A复核无实证 | 范丽：P&S和Reflection；第4章4.3/4.4 | 可照做micro_steps；读真实新版逐条件Review |
| 混用项目目标/本人理解/能力 | 楚客（秦川楚客）：上下文工程讲解与实战，第9章 | ProjectContext、MemberTaskBrief、能力与未知的上下文包 |
| 队长状态和人工确认 | 高鸿飞：LangGraph跟练；[官方课程](https://academy.langchain.com/courses/intro-to-langgraph)Module 2 Lesson 1 State Schema、Module 3 Lesson 3 Editing State and Human Feedback | 确认前后状态、旧回调拒收、重启恢复 |
| 缺工程评测与错误归因 | [吴恩达Agentic AI](https://www.deeplearning.ai/courses/agentic-ai)Module 4 Evaluations、Error analysis and prioritizing next steps | 同条件结果表、失败原因、下一项修复 |
| 数据用户不会读取/缺失处理 | 莫烦：[从文件读取](https://mofanpy.com/tutorials/data-manipulation/pandas/read-save)、[异常数据处理](https://mofanpy.com/tutorials/data-manipulation/pandas/dirty-data)中的找到NaN/NaN影响 | 实际读取/缺失证据、cleaning-log及一致分母 |
| 商赛用户不会访谈 | [YC官方Startup School视频目录](https://www.ycombinator.com/blog/startup-school-videos)：Gustaf Alströmer的How To Talk To Users | 非诱导的具体行为问题、真实访谈证据及反例 |
| 科研用户不懂验证/泄漏 | [李沐等合讲CS329P](https://c.d2l.ai/stanford-cs329p/)第6讲Model Validation；数据问题参考第3讲Data III | 数据划分、指标口径、配置、日志与复现结果 |

[Hello Agents作者/视频导航](https://github.com/datawhalechina/hello-agents/blob/main/Extra-Chapter/Extra13-Hello-Agents%E8%A7%86%E9%A2%91%E8%AF%BE%E5%BD%95%E5%88%B6%E5%85%B1%E5%88%9B.md)提供范丽、高鸿飞、楚客等链接与制作人。[材料读取8.3](https://github.com/datawhalechina/hello-agents/blob/main/docs/chapter8/%E7%AC%AC%E5%85%AB%E7%AB%A0%20%E8%AE%B0%E5%BF%86%E4%B8%8E%E6%A3%80%E7%B4%A2.md)与[python-docx API](https://python-docx.readthedocs.io/en/latest/api/document.html)用于A的文件定位。视频页面访问失败时先用公开正文；未确认片段不编时间。

开发三人的技术学习与产品用户的领域学习分别选择。开发者不必为所有任务学营销或统计；产品也不向负责访谈的人一律推Agent框架课程。

## 7个工程与评测对照

| 原始项目 | 核对到的可查证据 | 用途与边界 |
| --- | --- | --- |
| [OpenHands SDK](https://github.com/OpenHands/software-agent-sdk) | 工具执行/序列化、作者生产工程与公开评测 | 代码成果要有补丁、运行与验收；本轮未安装 |
| [PaperQA2](https://github.com/Future-House/paper-qa) | README与工具代码的论文检索→证据→带引用回答 | 科研证据与引用，不能替代实验 |
| [DeerFlow](https://github.com/bytedance/deer-flow) | 目标状态、按需技能、记忆、沙箱和部署约定 | 多场景/持续任务方法；本轮未部署 |
| [Dify](https://github.com/langgenius/dify) | 工作流、工具、RAG、自部署和日志观测 | 应用管理对照；本队现有Python/SQLite可继续复用 |
| [Coco Server](https://github.com/infinilabs/coco-server) | 服务端代码、发布和部署说明，开发者有国内国赛获奖报道 | 实际材料连接；源码/获奖/本队效果分别核验 |
| [Anthropic Research工程资料](https://www.anthropic.com/engineering/multi-agent-research-system) | 作者生产研究循环、引用检查、评测与恢复 | 完整结果和可靠性；不照搬作者成绩 |
| [Open Deep Research](https://github.com/langchain-ai/open_deep_research) | 研究/评测与官方课程，2026-08-21已归档 | 方法/评测参考，接入要另查维护方案 |

本轮阅读上述公开证据，没有全部部署实测，也不声称穷尽全网。国内比赛获奖案例与国际工程项目分开，[同届获奖核验](team-province-award-readiness-2026-10-12.md)保留证据边界。

## 17项交付，按6包推进

沿用原编号，升级范围重新记录耗时；目前仍未完整验收，不把新文档算成功能上线。

| 顺序／执行包 | 所含卡号，唯一归属 | 完成门槛 |
| --- | --- | --- |
| 1 共同目标/本人任务/材料，3项 | C0上下文契约、C1实际存取、A1读取定位 | 真实标准与作品可读，本人职责/理解及未知清楚 |
| 2 理解/诊断/能力，3项 | A2有依据诊断、A3操作试做、C2实际服务轨迹 | 真实输出进入B；复核绑定随第四包补，仅计一次 |
| 3 个性化行动/课程/时间，3项 | B1细动作、B2具体资源及分流、B3实际排程 | 换能力证据产生不同路径，另一人照卡可制作 |
| 4 新版复核/剩余调整，4项 | A4内容复核、A5新诊断、B4剩余修订、C3确认流转 | 新版真实核验，受保护成果不覆盖，全部解决可结束 |
| 5 真例/迁移/恢复，3项 | J1首例、C4新回归、J2跨领域/格式/变化 | 非作者复验，跨项目/版本隔离，失败可恢复 |
| 6 效果/演示/赛事交付，1项 | J3固定对照、用户、材料及实际规则 | 全部尝试/失败/成本与评审可访问证据 |

A5项、B4项、队长5项、共同3项，总17。先让一个真实任务全链工作，再验证四类场景；未测到的类型保持未验证，不靠硬编码竞赛名或预写答案通过。

## 国赛论证与验证

内部20例计划可按四类×5组织，每类3开发/2保留，总12/8；不是官方奖项门槛。当前仅两套构造输入/人工参考，真实运行结果和5–8位目标用户试做待补。

比较通用规划、同工具/状态单Agent和当前A/B/总控，保持材料/模型/预算等条件尽量一致。评阅引用、任务理解、个性化/重复补课、行动执行、实际新成果、剩余保护及恢复；记录人工操作、等待、返工、费用与全部失败。构造回归和真实用户数据各自报告，人工参考不进入待测模型。

消融依次去掉试做证据、任务理解检查、复核后重排，观察实际结果和成本。跨四类的验证范围应可解释；不宣称支持所有84项赛事所有任务，逐步扩展规则/工具和案例。

[本届公开通知](https://ems.nwu.edu.cn/info/1047/11043.htm)说明通用赛道校赛→区域赛→全国总决赛、作品提交至2026-10-20；本队校内截止、正式赛道、指定平台及完整提交格式需核实。本队目前有工程基础，未证明国赛获奖就绪或收益比例。

当前[PR4](https://github.com/phucmanh146-dot/shangan-ya/pull/4)仍open/draft、未合并，固定候选30d21f9。[139项历史工程与浏览器/文本连接的范围](repository-summary-2026-10-12.md)不能替代新增A内容、个性化指导和真正成果闭环。

下一工作块：队长交通用上下文与文件入口；A交标准/作品读取和职责理解诊断；B交两种能力路径、具体资源条目及细动作生成。本人账号、环境与空档保留未知，按实际依赖验收。

[三人详细技术课程](team-agent-courses-2026-10-12.md) · [工程资料与失败场景](agent-production-readiness-2026-10-12.md)
