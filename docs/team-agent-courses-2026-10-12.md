# 上岸鸭三人Agent：任务对应课程导航

更新日期：2026年10月12日。面向A同学、B同学、队长的诊断—行动—执行—复核—调整流程。

每人按当前任务选择章节：先完成一个能运行、能检查的小交付，再进入下一项。课程提供方法；模块是否完成以代码、真实输入输出和成员执行记录判断。下方练习与验收由本队任务改编，不是课程原题，也不是赛事官方评分表。

**进入真实使用的新增资料：**[Agent从演示到真实应用：官方工程资料、当前代码缺口、三人交付与8个验收场景](agent-production-readiness-2026-10-12.md)。先完成实际文件读取、真实诊断和新成果复核，再用真实案例检验失败恢复与剩余调整。

## 三个人从这里开始

| 成员 | 第一份课程，直接点击 | 先学哪一部分 | 学完立刻交什么 |
| --- | --- | --- | --- |
| A：材料诊断与成果复核 | [Hello Agents 第八章：记忆与检索](https://github.com/datawhalechina/hello-agents/blob/main/docs/chapter8/%E7%AC%AC%E5%85%AB%E7%AB%A0%20%E8%AE%B0%E5%BF%86%E4%B8%8E%E6%A3%80%E7%B4%A2.md) | 文档处理、检索、来源元数据；再学第四章ReAct和Reflection | 一个真实文件的读取与原文位置；真实Diagnosis；随后实际新版的Review |
| B：具体行动与排程 | [Microsoft 第7课：Planning Design](https://github.com/microsoft/ai-agents-for-beginners/blob/main/07-planning-design/README.md) | Task Decomposition、Structured output、Iterative Planning | 一张能定位修改位置的细动作卡；一次只调整剩余任务的重排差异 |
| 你／队长：总控与集成 | [LangGraph 入门课程](https://academy.langchain.com/courses/intro-to-langgraph) | Module 2 State and Memory；Module 3 Human-in-the-Loop | 同项目服务交接、人工确认与状态保存；一次失败或重启后的恢复记录 |

## A同学：把人工模板变成真实诊断与复核

| 顺序／任务 | 课程链接与定位 | 本项目的练习 | 通过条件 |
| --- | --- | --- | --- |
| A1 读取与定位材料 | [第八章：记忆与检索](https://github.com/datawhalechina/hello-agents/blob/main/docs/chapter8/%E7%AC%AC%E5%85%AB%E7%AB%A0%20%E8%AE%B0%E5%BF%86%E4%B8%8E%E6%A3%80%E7%B4%A2.md)，优先阅读8.3，重点8.3.2与8.3.4的文档处理和检索部分 | 从队长登记的真实文件读取文本；保存材料ID、版本、SHA及段落/表格/行号位置；对同名新版保留旧版 | 引用能回到同一版本的原文；不可读的材料明确报错；DOCX位置采用段落或表格定位 |
| A2 用工具和真实模型生成诊断 | [第四章4.2：ReAct](https://github.com/datawhalechina/hello-agents/blob/main/docs/chapter4/%E7%AC%AC%E5%9B%9B%E7%AB%A0%20%E6%99%BA%E8%83%BD%E4%BD%93%E7%BB%8F%E5%85%B8%E8%8C%83%E5%BC%8F%E6%9E%84%E5%BB%BA.md)，重点4.2.2工具定义与实现 | 把读取、按需检索做成可调用工具；以实际返回内容生成有来源的差距 | 首例至少3条有依据差距，有现状、目标、理由、来源、位置；不足的信息保留未知；保存实际调用记录 |
| A3 最小试做判断能力 | [第四章：范式与习题](https://github.com/datawhalechina/hello-agents/blob/main/docs/chapter4/%E7%AC%AC%E5%9B%9B%E7%AB%A0%20%E6%99%BA%E8%83%BD%E4%BD%93%E7%BB%8F%E5%85%B8%E8%8C%83%E5%BC%8F%E6%9E%84%E5%BB%BA.md)，参考行动与反馈方法 | 为一项所需能力设计小试做，留下实际产物、判据、错误或通过结果，再交给B | 自述、未试做、通过、未通过能区分；通过者可以直接制作；失败者的补课指向当前错误 |
| A4/A5 新成果复核与诊断更新 | [第四章4.4：Reflection](https://github.com/datawhalechina/hello-agents/blob/main/docs/chapter4/%E7%AC%AC%E5%9B%9B%E7%AB%A0%20%E6%99%BA%E8%83%BD%E4%BD%93%E7%BB%8F%E5%85%B8%E8%8C%83%E5%BC%8F%E6%9E%84%E5%BB%BA.md) | 读取执行成员制作的新版本，逐条对照任务验收，返回已解决、剩余、未知；人工确认后更新Diagnosis | 未修改好的内容不通过，错版本拒收；新诊断可追到有效复核和实际新版；旧证据保留 |

第一工作块：先用5分钟挑一个实际文件，最多20分钟读相关段落，随后动手读取并定位一处原文。这里的分钟数是建议工作块，不是课程时长或开发完成承诺。

## B同学：让另一位成员能照卡完成修改

| 顺序／任务 | 课程链接与定位 | 本项目的练习 | 通过条件 |
| --- | --- | --- | --- |
| B1 拆具体动作 | [第四章4.3：Plan-and-Solve](https://github.com/datawhalechina/hello-agents/blob/main/docs/chapter4/%E7%AC%AC%E5%9B%9B%E7%AB%A0%20%E6%99%BA%E8%83%BD%E4%BD%93%E7%BB%8F%E5%85%B8%E8%8C%83%E5%BC%8F%E6%9E%84%E5%BB%BA.md)；[Microsoft Planning：Task Decomposition、Structured output](https://github.com/microsoft/ai-agents-for-beginners/blob/main/07-planning-design/README.md) | 在已有action_planner上，为真实gap生成micro_steps：材料版本、位置、动作、理由、变化、产物、自检、失败下一步和能力依据 | 卡片明确改哪里、怎么做、交什么；字段通过当前契约校验；另一成员留下实际修改产物 |
| B2 按能力补学习 | [第四章4.3及章末习题](https://github.com/datawhalechina/hello-agents/blob/main/docs/chapter4/%E7%AC%AC%E5%9B%9B%E7%AB%A0%20%E6%99%BA%E8%83%BD%E4%BD%93%E7%BB%8F%E5%85%B8%E8%8C%83%E5%BC%8F%E6%9E%84%E5%BB%BA.md)，参考分层拆解 | 把同一动作拆成“能力已验证→制作；未知→试做；试做失败→相关学习、小练习、复试”三种路径 | 课程对应当前动作和练习产物；不把看课计为作品完成；已验证能力不用重复学习 |
| B3 真实空档与依赖 | [Microsoft Planning](https://github.com/microsoft/ai-agents-for-beginners/blob/main/07-planning-design/README.md)，任务顺序、工具及约束 | 将细卡接入现有容量/依赖/多人排程模块；用本人确认空档运行；记录实际和剩余用时 | 无超容量和依赖冲突；排不下显示分钟缺口；硬截止、完成记录及锁定安排受到保护 |
| B4 反馈后局部重排 | [Microsoft Planning：Iterative Planning](https://github.com/microsoft/ai-agents-for-beginners/blob/main/07-planning-design/README.md) | 消费A的有效Review和下一版Diagnosis，已关闭问题不重做，剩余项生成新动作；保护冲突有处理记录 | 旧成果、证据、累计用时、task_id和锁定记录不丢；另一成员能执行下一轮 |

第一工作块：先对照现有p1-contract的micro_steps字段，再把一条gap改成具体卡片。A真实诊断未齐时可准备生成与校验代码，真实内容验收等A输出。

## 你／队长：接线、确认与恢复

| 顺序／任务 | 课程链接与定位 | 本项目的练习 | 通过条件 |
| --- | --- | --- | --- |
| C0/C1 材料与共同上下文 | [第八章：记忆与检索](https://github.com/datawhalechina/hello-agents/blob/main/docs/chapter8/%E7%AC%AC%E5%85%AB%E7%AB%A0%20%E8%AE%B0%E5%BF%86%E4%B8%8E%E6%A3%80%E7%B4%A2.md)，文档内容与元数据 | 登记首例文件、目标和未知；材料ID/版本绑定到实际保存对象；供A读取 | 按ID和版本能取回实际文件；不存在、跨项目和错误版本拒收；同名新文件不覆盖旧版 |
| C2 共享状态与服务接线 | [LangGraph Module 2：State and Memory](https://academy.langchain.com/courses/intro-to-langgraph) | 按现有Python+SQLite结构接A研究、B规则与A复核函数；记录输入输出和运行版本 | 同项目A→B无需手工搬JSON；服务失败不标完成；日志能定位输入和输出 |
| C3 人工确认与闭环转换 | [LangGraph Module 3：UX and Human-in-the-Loop](https://academy.langchain.com/courses/intro-to-langgraph)；[公开Interrupts文档](https://docs.langchain.com/oss/python/langgraph/interrupts) | 区分收到Review、人工批准、新Diagnosis、剩余计划预览、采用五个事件 | 未批准的Review不直接标完成；过期回调拒收；重试幂等，受保护成果保留 |
| C4 失败与重启恢复 | [公开Interrupts文档](https://docs.langchain.com/oss/python/langgraph/interrupts)，恢复、状态与幂等 | 在实际接线后复现文件读取失败、A/B失败、旧版本、锁定、临时占用和重启 | 失败后有可解释状态并能继续；另一成员能按记录复验 |
| J3 观测与效果评测 | [Hugging Face：Observability and Evaluation](https://huggingface.co/learn/agents-course/en/bonus-unit2/monitoring-and-evaluating-agents-notebook)；[Hello Agents 第十二章：性能评估](https://github.com/datawhalechina/hello-agents/blob/main/docs/chapter12/%E7%AC%AC%E5%8D%81%E4%BA%8C%E7%AB%A0%20%E6%99%BA%E8%83%BD%E4%BD%93%E6%80%A7%E8%83%BD%E8%AF%84%E4%BC%B0.md) | 保存工具调用、耗时、错误、输入输出和任务结果；做同条件对照、独立评阅与真实试做 | 工程检查、真实内容和用户效果各有证据；失败、成本与分母记录完整 |

课程中的框架用于学习状态、反馈和恢复的方法，项目实施沿用现有Python、SQLite和实际模块。模型与检索复用已验证配置；课程样例涉及其他服务时按实际需要适配。

## 视频入口与访问条件

| 视频／代码入口 | 对应谁 | 观看或读取范围 |
| --- | --- | --- |
| [Hello Agents作者共创视频导航](https://github.com/datawhalechina/hello-agents/blob/main/Extra-Chapter/Extra13-Hello-Agents%E8%A7%86%E9%A2%91%E8%AF%BE%E5%BD%95%E5%88%B6%E5%85%B1%E5%88%9B.md) | A、B及队长按当前任务选 | 第四章ReAct、P&S/Reflection；第六章LangGraph；第八章记忆。目录能读，具体视频可能需要平台登录；未取得字幕的没有计为完整观看 |
| [LangGraph官方视频课程](https://academy.langchain.com/courses/intro-to-langgraph) | 队长 | Module 2状态、Module 3断点和人工反馈；课程目录公开，按学院账号入口观看；打不开视频时先用公开文档 |
| [Microsoft第7课正文](https://github.com/microsoft/ai-agents-for-beginners/blob/main/07-planning-design/README.md)，[官方Planning视频](https://www.youtube.com/watch?v=kPfJ2BrBCMY) | B | 任务拆解、结构化结果和迭代规划；原样例涉及Microsoft服务配置，采用现有项目模型适配 |
| [LangChain Academy配套代码](https://github.com/langchain-ai/langchain-academy) | 队长 | 仅选对应模块的状态、反馈与恢复示例 |
| [Hello Agents中文在线阅读](https://hello-agents.datawhale.cc/) | 三人 | 各自先读上面指定章节；[GitHub总目录](https://github.com/datawhalechina/hello-agents)可作为备用 |

本导航已核对章节与官方入口，没有取得字幕的视频不标为已观看。课程学习完成情况由成员记录；学完课程仍需提交本项目实际代码和运行结果。

## 一次60分钟工作块怎么用

若当天确有60分钟：5分钟选任务和输入→最多20分钟相关补课→25分钟动手制作→10分钟检查并记录。能完成对应独立试做时，把补课时间用于实现。时间不足缩小本块产物，保留剩余任务。

共同提交时记录：本次任务、课程具体段落、实际操作、产物路径或PR、如何验收、剩余卡点。A交读取/Diagnosis，B交动作卡与日程，队长交接线与运行记录。

## 本项目依据

- [共同交接契约p1-contract](https://github.com/phucmanh146-dot/shangan-ya/blob/30d21f98f5329fea550d281b79140a85299b834d/docs/p1-contract.md)
- [当前仓库与联调验证范围](https://github.com/phucmanh146-dot/shangan-ya/blob/30d21f98f5329fea550d281b79140a85299b834d/docs/repository-summary-2026-10-12.md)
- [B与队长联调候选PR4](https://github.com/phucmanh146-dot/shangan-ya/pull/4)

职责以A、B、队长标识；本人GitHub账号、空档、正式DDL另行核实。链接和学习建议不会改变尚未完成模块的状态。
