# CLP 物质数据单一事实源（阶段 3）

本原型把 Annex VI 演示子集、组分基础信息中的企业补充值分层保存。入口在 `src/23z6d-js-clp-substance-data.js`；`src/23z6-js-clp.js`、`src/23-js-sds.js`、`src/23y-js-law-query.js` 消费其 API。种子数值只承接原型既有演示基线，**未经过法规专业核验**；法律效力以 OJ 原文为准。

## 数据与版本

| 层 | 存储 | 写入入口 | 读取入口 |
|---|---|---|---|
| 官方统一分类 | `CLP_SUBSTANCE_STORE.officialDatasets` | Annex VI 导入向导发布 `clpViDatasetPublish()` | `clpViDatasetResolve(asOfDate)`、`clpViRecords()` |
| 企业补充 | `supplementalByCas` | 组分基础信息保存 `clpSupplementalUpsert()` | `clpSupplementalGet()` |
| 迁移期冲突取用 | `legacyResolutions` | 仅代码中登记已知基线差异 | `clpSubstanceProfile()` |

官方数据集包含版本、来源文件与日期、发布人与审核人、生效日期、数据截止日期及结构化物质记录。发布时深拷贝并冻结快照；同一版本不可重复发布。按 `effectiveFrom <= asOfDate` 取最新已发布数据集。未来版本发布后留在存储中，不提前覆盖当前投影；历史 ATP 22 仍可按旧日期读取。原型的导入向导仅产生**演示结构化草稿**，不解析真实 XLSX。

物质记录按 `Index No.` 保存 CAS / EC、分类与 H 码、EUH、象形图、信号词、SCL、分途径 ATE、急慢性 M 因子和 Notes。分类、SCL、ATE、M 因子均为结构化字段，计算不解析展示字符串。

## 统一画像与取用顺序

`clpSubstanceProfile(cas, asOfDate)` 返回 `officialRecords`、`supplemental`、`effective`、`provenance`、`conflicts` 和 `dataVersion`。计算引擎通过 `complianceBuildContext()` 直接读取画像，规则包与数据集使用同一 `asOfDate`。SDS 组分表、第 3 / 4 / 11 / 12 章通过 `clpParamOf()` 或分类结果读取画像；第 3 步的 CLP 汇集项通过 `clpCollectItems()` 生成。

1. 同一危害类别有官方统一分类时取官方分类；官方未列的类别可用企业补充分类，不能因为 Annex VI 没列就判为“不分类”。
2. 官方 SCL、ATE、M 因子有值时优先。官方缺值可用企业补充；两边不同则保留双方、字段来源与冲突状态。
3. 没有数据时保持 `null` 与 `unknown`；`na` 表示经评估不适用。兼容展示中出现的 0 不得作为未知数据的计算事实。
4. 多条官方记录在同一字段无法唯一归并时产生待核验冲突；相关方法不自动输出分类结论。

`provenance` 按字段键（例如 `classifications.Carc.|`、`specificLimits.Skin Sens.|1`、`ateValues.oral`、`mFactors.chronic`）标记 `sourceType / sourceVersion / sourceRef`，官方来源还含文件、日期与 Index No.。`conflicts` 保存官方值、补充值、当前取用值、取用来源和待专业核验状态。组分编辑器展示官方只读区、企业补充结构化编辑区和冲突提示；保存后刷新兼容投影。

唯一迁移期例外是甲醛 `50-00-0` 的 `mFactors.chronic`：Annex VI 演示值为 10，阶段二计算基线为 0。`legacyResolutions` 明示继续取旧值 0 以保持默认 SDS 输出，并列入 `clpDataConflictList()`。它只适用于 ATP 22 已知冲突；当该字段在组分库被重新维护时，例外删除，冲突转为待专业核验。本记录不构成法规裁决。

乙二醇单丁醚 `111-76-2` 在阶段二 SDS 汇集演示值中曾显示眼刺激 `2A`，而当前 Annex VI 演示快照为 `2`。旧 `2A` 只用于汇集展示，从未进入阶段二混合物计算；迁移后保留在补充层并记为待核验展示差异，不进入 `effective.classifications`，也不阻断既有计算。组分库显示双方来源与当前取用值，不据此做法规专业裁决。

## 页面与兼容层

`CLP_VI_ROWS`、`COMP_CLP`、`LAW_DETAIL.clp6` 仅是当前生效数据的兼容投影，不是维护对象。法规统一查询的非 CLP 行保留在 `LAW_QUERY_STATIC_ROWS`，CLP 行由 `clpLawQueryProjection()` 动态生成；当前演示查询行数由 18 增至 19，新增的是原先未单列的甲苯 Annex VI 命中。Annex VI Tab 可选择历史或待生效版本，表格、信息条和详情按所选快照显示。

SDS 第 3 步的实验、供应商、理化和非 CLP 名单演示数据仍可保留在 `COLLECT_MOCK`。CLP 分类、H 码、Annex VI 命中、SCL、ATE、M 因子由统一画像动态生成。已维护画像中未记录某类别、SCL 或适用 M 因子时明确显示该状态，不将其一律记成“待补充”；真正未知的 ATE 和未维护物质仍保留缺失状态。默认配方保持 5 项待补充，可由原「一键填充演示数据」补齐；若配方另有 CLP 缺值，按钮明确标示只补非 CLP，CLP 缺值指向法规库或组分库维护。`M-LIST`、REACH/OEL/运输法规取数及真实法规文件解析不在本阶段。

## 验证

修改 `src/` 后运行 `bash build.sh` 并提交生成的根目录 HTML。定向检查：`python3 smoke_clp_data_source.py`、`smoke_clp.py`、`smoke_compliance_engine.py`、`smoke_clp_lifecycle.py`、`smoke_mfactor.py`、`smoke_sds.py`、`smoke_law_split.py`。全量执行 `bash run_smoke.sh`。另运行 `check_names.py`、`check_pages.py`、`node --check` 并检查兼容投影无直接写入。

默认演示配方的分类项、标签候选和引擎中间量与阶段二产物逐字段对比，Diff 为 0。数据变更后的新结果需重新计算；已生成 SDS 保留生成时的规则包快照。下一阶段建议按既定排队顺序推进 `M-LIST` 名单匹配。
