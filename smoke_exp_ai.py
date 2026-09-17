_CHROME_PATH = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
# -*- coding: utf-8 -*-
"""[24z4 → 24z5] 实验分析 AI 专项自检
   入口在「实验分析与总结」详情页（exp:sum-detail）；
   24z5 起交互改为两步选择（① 勾选实验 ② 勾选分析参数），问答与报表两个入口共用；
   报表入口一键生成 = AI 结论（只围绕所选参数）+ 投料 / 工艺步骤 / 结果三段图表与表格。
   注：回答容器沿用 24z4 的 #aiAnswerBox，底部按钮改为「保存到文档 / 关闭」。"""
import pathlib, sys
from playwright.sync_api import sync_playwright

F = str(pathlib.Path('PLM3.0全系统演示原型.html').resolve())
SUM = 'SUM-2026-0006'
PASS, FAIL = [], []

def ok(cond, msg):
    (PASS if cond else FAIL).append(msg)
    print(("  [OK] " if cond else "  [FAIL] ") + msg)

with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=_CHROME_PATH, args=["--no-sandbox"])
    pg = b.new_page(viewport={'width': 1440, 'height': 1000})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("file://" + F)
    pg.wait_for_timeout(1600)

    print("\n== 1. 入口位置：列表页无、详情页有 ==")
    pg.evaluate("()=>showPage('exp:sum')")
    pg.wait_for_timeout(700)
    lbtns = pg.eval_on_selector_all(".page-acts button", "els=>els.map(e=>e.innerText.trim())")
    ok(not any("问问 AI" in t for t in lbtns), "列表页操作区已无 AI 按钮（%s）" % " / ".join(lbtns))
    pg.evaluate("()=>showPage('exp:sum-detail',{id:'%s'})" % SUM)
    pg.wait_for_timeout(700)
    dbtns = pg.eval_on_selector_all(".page-acts button", "els=>els.map(e=>e.innerText.trim())")
    ok(any("问问 AI" in t for t in dbtns), "详情页操作区出现「问问 AI」（%s）" % " / ".join(dbtns))
    ok(any("智能分析报表" in t for t in dbtns), "详情页操作区出现「生成智能分析报表」")

    print("\n== 2. 问问 AI（分析版）：两步选择 ==")
    pg.evaluate("()=>openSumAI('%s')" % SUM)
    pg.wait_for_timeout(700)
    title = pg.eval_on_selector(".modal-hd h3", "e=>e.innerText")
    ok(SUM in title, "弹窗标题带报告号：%s" % title)
    # 步骤 ① 选择实验
    steps = pg.eval_on_selector_all(".an-step", "els=>els.map(e=>e.innerText.replace(/\\s+/g,' ').trim())")
    ok(len(steps) == 2, "左栏为两步选择（① 实验 ② 参数）")
    ok("选择参与分析的实验" in steps[0] and "选择分析参数" in steps[1],
       "两步标题正确：%s" % " | ".join(steps))
    items = pg.eval_on_selector_all(".an-pick .ai-pick-item", "els=>els.map(e=>e.innerText.replace(/\\s+/g,' ').trim())")
    ok(len(items) == 3, "第 1 步列出报告引用的 3 组实验")
    ok(pg.eval_on_selector_all(".an-pick .ai-pick-item input[type=checkbox]", "els=>els.length") == 3,
       "实验条目可勾选（升级自原只读展示）")
    ok(all(("EXP-" in t or "DOE-" in t) for t in items), "每条含实验编号")
    nms = pg.eval_on_selector_all(".an-pick .ai-pick-item .an-pick-nm", "els=>els.map(e=>e.innerText.trim())")
    ok(len(nms) == 3 and all(nms), "每条含实验名称：%s" % " / ".join(nms))
    # 步骤 ② 选择参数
    groups = pg.eval_on_selector_all(".an-pg-t", "els=>els.map(e=>e.innerText)")
    ok(len(groups) >= 1 and all(g in ['工序参数', '配比', '过程检测', '成品检测'] for g in groups),
       "第 2 步参数按来源分组：%s" % "、".join(groups))
    n_par = pg.eval_on_selector_all(".an-p input[type=checkbox]", "els=>els.length")
    ok(n_par > 0, "参数可多选（可选 %d 个）" % n_par)
    ok(pg.evaluate("()=>_anaSelKeys.length>0"), "默认已预选参数（%d 个）" % pg.evaluate("()=>_anaSelKeys.length"))

    ids = pg.evaluate("()=>_aiIds.slice()")
    ok(ids == ['EXP-2026-0418', 'DOE-2026-0158-R03', 'DOE-2026-0158-R07'],
       "分析范围 = 报告 expIds（%s）" % "、".join(ids))

    presets = pg.eval_on_selector_all(".ai-preset", "els=>els.map(e=>e.innerText)")
    ok(len(presets) == 2, "预置演示问答 %d 条" % len(presets))
    labels = pg.evaluate("()=>anaSelParams().map(p=>p.label)")
    ok(any(l in presets[0] for l in labels),
       "预置问题围绕所选参数生成（%s）" % presets[0][:50])
    ok("主推方案" in presets[1], "第二条预置问题指向最优组判断")

    pg.eval_on_selector_all(".ai-preset", "els=>els[0].click()")
    pg.wait_for_timeout(400)
    ans = pg.inner_text("#aiAnswerBox")
    ok(len(ans) > 80, "点击预置问题即生成回答（%d 字）" % len(ans))
    ok("EXP-2026-0418" in ans and "DOE-2026-0158-R03" in ans, "回答引用本报告真实实验编号")
    ok(pg.eval_on_selector_all("#aiAnswerBox .ai-avatar", "els=>els.length") == 1, "回答区含 AI 头像")
    ok(SUM in ans, "回答标注数据来源为报告 %s" % SUM)
    btntexts = pg.eval_on_selector_all(".modal-ft button, .modal-bd button", "els=>els.map(e=>e.innerText.trim())")
    ok(not any("一键采纳" in t for t in btntexts), "分析场景无「一键采纳」按钮（%s）" % " / ".join(btntexts))
    ok("仅供参考" in ans, "回答带免责说明")
    ok("未做全量数据分析" in ans, "回答声明只基于所选参数、不做全量分析")
    pg.eval_on_selector_all(".ai-preset", "els=>els[1].click()")
    pg.wait_for_timeout(400)
    a2 = pg.inner_text("#aiAnswerBox")
    ok("综合表现排序" in a2 and "主推方案" in a2, "第二条预置问答给出综合排序与推荐主推方案")
    pg.evaluate("()=>anaCloseModal()")
    pg.wait_for_timeout(300)

    print("\n== 3. 智能分析报表：两步选择 + 一键生成 ==")
    pg.evaluate("()=>openSumReport('%s')" % SUM)
    pg.wait_for_timeout(600)
    ok(pg.eval_on_selector(".modal-hd h3", "e=>e.innerText").find("智能分析报表") >= 0,
       "打开报表弹窗：%s" % pg.eval_on_selector(".modal-hd h3", "e=>e.innerText"))
    modes = pg.eval_on_selector_all(".an-mode-i", "els=>els.map(e=>e.innerText.replace(/\\s+/g,' ').trim())")
    ok(len(modes) == 2, "报表入口可切分析方式：%s" % " | ".join(modes))
    ok("AI" in modes[0] and "统计工具" in modes[1], "两种方式为「交给 AI 分析」/「手动选择统计工具」")
    ft = pg.inner_text(".modal-ft")
    ok("保存到文档" in ft and "关闭" in ft, "底部含「保存到文档」与「关闭」")
    ok("不做全量分析" in ft, "底部署明分析范围口径")
    pg.evaluate("()=>anaGen()")
    pg.wait_for_timeout(1200)
    txt = pg.inner_text("#aiAnswerBox")
    ok(all(k in txt for k in ["投料对比", "工艺步骤", "结果数据对比", "综合结论"]),
       "报表含投料 / 工艺步骤 / 结果 / 结论四段")
    ok(pg.eval_on_selector_all("#aiAnswerBox table", "els=>els.length") == 3, "三张对比表（投料 / 步骤 / 结果）")
    charts = pg.eval_on_selector_all(".rpt-chart canvas", "els=>els.length")
    ok(charts == 3, "三张图表已渲染（canvas × %d）" % charts)
    sizes = pg.evaluate("()=>['aiChartMat','aiChartStep','aiChartRes'].map(id=>{var e=document.getElementById(id);"
                        "return e?Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height):'缺失';})")
    ok(all(s != '缺失' for s in sizes), "图表容器尺寸：%s" % " / ".join(sizes))
    ok(pg.evaluate("()=>['aiChartMat','aiChartStep','aiChartRes'].every(function(k){return !!_charts[k];})"),
       "三个 ECharts 实例已注册（aiChartMat / aiChartStep / aiChartRes）")
    print("== 3.1 图表数据 ==")
    ok(pg.evaluate("()=>aiChartMatOption(aiCtxList()).series.length") >= 4,
       "投料图 %d 个原料系列" % pg.evaluate("()=>aiChartMatOption(aiCtxList()).series.length"))
    ok(pg.evaluate("()=>aiChartStepOption(_aiSum,_aiIds).series.length") == 3, "步骤图 3 条工艺曲线（每组一条）")
    ok(pg.evaluate("()=>aiChartResOption(aiCtxList()).series[0].markLine.data[0].yAxis") == 100,
       "结果图带 100% 标准线")
    ok(pg.evaluate("()=>aiResItems(aiCtxList()).length") >= 2,
       "结果图取到 %d 个可量化指标" % pg.evaluate("()=>aiResItems(aiCtxList()).length"))
    ok(pg.evaluate("()=>{var s=aiStepsFor(_aiSum,_aiIds);return s[0].steps.length>=3;}"), "工艺步骤 ≥3 步")
    ok("极差" in pg.inner_text(".rpt-note"), "图下给出步骤一致性自动结论")
    print("== 3.2 保存到文档 ==")
    n0 = pg.evaluate("()=>ANALYSIS_REPORTS.length")
    pg.evaluate("()=>anaSaveDoc()")
    pg.wait_for_timeout(700)
    ok(pg.evaluate("()=>ANALYSIS_REPORTS.length") == n0 + 1, "保存后报表数 +1（%d）" % (n0 + 1))
    ok(pg.evaluate("()=>ANALYSIS_REPORTS[ANALYSIS_REPORTS.length-1].sumId") == SUM,
       "报表记录带来源报告号 %s" % SUM)
    ok(SUM in pg.evaluate("()=>ANALYSIS_REPORTS[ANALYSIS_REPORTS.length-1].name"),
       "报表名含报告号：%s" % pg.evaluate("()=>ANALYSIS_REPORTS[ANALYSIS_REPORTS.length-1].name"))
    ok(pg.evaluate("()=>DOC_FOLDERS.some(f=>f.id==='F-M4'&&f.scope==='mine')"),
       "「分析报表」文件夹已建在我的文档下")
    n_doc = pg.evaluate("()=>docRowsOfScope('mine').filter(r=>r.folder==='F-M4').length")
    ok(n_doc >= 1, "我的文档 · 分析报表文件夹含 %d 份报表" % n_doc)
    ok(pg.evaluate("()=>Object.keys(_charts).length") == 0, "保存关闭后图表实例已释放")

    print("\n== 4. 周报联动：引用分析报表 ==")
    pg.evaluate("()=>showPage('home')")
    pg.wait_for_timeout(600)
    opts = pg.eval_on_selector_all("#wkRefReport option", "els=>els.map(e=>e.innerText)")
    ok(any("智能分析报表" in o for o in opts), "周报卡片下拉出现已保存报表（%d 项）" % len(opts))
    rid = pg.evaluate("()=>ANALYSIS_REPORTS[0].docId")
    pg.select_option("#wkRefReport", rid)
    pg.wait_for_timeout(300)
    ok(pg.evaluate("()=>weeklyDraft.refReport") == rid, "选择后写入周报草稿")
    pg.evaluate("()=>openWeeklyReport()")
    pg.wait_for_timeout(500)
    ok("引用分析报表" in pg.inner_text(".modal-bd"), "周报正文含「引用分析报表」段")
    ok(pg.inner_text(".modal-bd").find("已附") > 0, "周报正文展示已附报表名")
    pg.evaluate("()=>{saveWeeklyDraft();closeModal();}")
    pg.wait_for_timeout(300)

    print("\n== 5. 持久化与一键重置 ==")
    pg.reload()
    pg.wait_for_timeout(1600)
    ok(pg.evaluate("()=>ANALYSIS_REPORTS.length") >= 1, "刷新后报表仍在（持久化生效）")
    ok(pg.evaluate("()=>docRowsOfScope('mine').filter(r=>r.folder==='F-M4').length") >= 1,
       "刷新后我的文档仍能查到报表")
    pg.evaluate("()=>wzReset()")
    pg.wait_for_timeout(600)
    ok(pg.evaluate("()=>ANALYSIS_REPORTS.length") == 0, "一键重置清空新增报表")

    print("\n== 6. JS 错误 ==")
    ok(len(errs) == 0, "无 JS 运行时错误%s" % ("：" + errs[0] if errs else ""))
    b.close()

print("\n结果：%d/%d" % (len(PASS), len(PASS) + len(FAIL)))
if FAIL:
    print("有 %d 条失败" % len(FAIL))
    sys.exit(1)
print("ALL PASS")
