# -*- coding: utf-8 -*-
"""[领导评审 2026-09-10] 六项改动专项自检：
① 首页置顶行动区 ② 任务来源标签 ③ 推广并为项目第七阶段
④ 取消实验设计「问问 AI」 ⑤ 周报月报菜单删除 ⑥ 保证函管理占位页"""
import pathlib, sys
from playwright.sync_api import sync_playwright

_CHROME_PATH = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
F = str(pathlib.Path('PLM3.0全系统演示原型.html').resolve())
PASS, FAIL = [], []

def ok(cond, msg):
    (PASS if cond else FAIL).append(msg)
    print(("  [OK] " if cond else "  [FAIL] ") + msg)

with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=_CHROME_PATH, args=["--no-sandbox"])
    pg = b.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("file://" + F)
    pg.wait_for_timeout(1600)

    # ========== ① 首页置顶行动区 ==========
    print("\n== 1. 首页置顶行动区 ==")
    t = pg.inner_text("#pageHost")
    ok("接下来要做" in t, "行动区标题「接下来要做」存在")
    html = pg.evaluate("()=>document.querySelector('#pageHost').innerHTML")
    ok("homeActionArea" not in html and "primary-soft" in html, "行动区为浅蓝 accent 面板")
    # 行动区位于 KPI 之前
    idx_act = t.find("接下来要做")
    idx_kpi = t.find("进行中项目")
    ok(0 <= idx_act < idx_kpi, "行动区位于 KPI 卡上方")
    ok("我的待办" not in t, "原「我的待办」栏已并入行动区")
    ok("风险预警" in t, "预警栏保留")
    ok(TODOS_OK := pg.evaluate("()=>TODOS.length>=4 && TODOS.length<=6"),
       "行动区数据 %d 条（4~6）" % pg.evaluate("()=>TODOS.length"))

    # ========== ② 来源标签 ==========
    print("\n== 2. 任务来源：OA / 本系统 ==")
    n_oa = pg.evaluate("()=>TODOS.filter(t=>t.source==='OA 项目计划').length")
    n_sys = pg.evaluate("()=>TODOS.filter(t=>t.source==='本系统任务').length")
    ok(n_oa >= 2, "OA 项目计划来源 %d 条（≥2）" % n_oa)
    ok(n_sys >= 2, "本系统任务来源 %d 条（≥2）" % n_sys)
    ok(pg.evaluate("()=>TODOS.every(t=>t.source&&t.act&&t.go)"), "每条任务带来源/动作/直达目标")
    # 近 7 天且按截止日升序
    ok(pg.evaluate("()=>TODOS.every(t=>t.due<=daysFromNow(7))"), "全部截止日在 7 天内")
    dues = pg.evaluate("()=>TODOS.map(t=>t.due)")
    ok(dues == sorted(dues), "按截止日升序（%s）" % " → ".join(dues))
    ok("OA 项目计划" in t and "本系统任务" in t, "页面渲染两种来源标签")
    ok(pg.evaluate("()=>TODOS.some(t=>t.kind==='实验结果录入')&&TODOS.some(t=>t.kind==='SDS 审批')&&TODOS.some(t=>t.kind==='项目节点')&&TODOS.some(t=>t.kind==='数据补齐')"),
       "覆盖实验录入/SDS 审批/项目节点/数据补齐四类")

    # ========== ③ 推广阶段 ==========
    print("\n== 3. 推广并为项目第七阶段 ==")
    ok(pg.evaluate("()=>PROJECTS.every(p=>p.stageProgress.length===7&&p.stageProgress[6]==='推广')"),
       "全部项目阶段序列为 7 段，末段为推广")
    ok(pg.evaluate("()=>PROJECTS.find(p=>p.id==='PRJ-2026-005').stage==='推广'"),
       "PRJ-2026-005 已进入推广阶段")
    ok("推广" in pg.evaluate("()=>stageBar(PROJECTS[4])"), "首页阶段条渲染推广段")
    ok("交付 → 推广" in t, "首页阶段说明含「交付 → 推广」")
    # 项目详情：005 推广阶段表单
    pg.evaluate("()=>showPage('proj:detail',{id:'PRJ-2026-005'})")
    pg.wait_for_timeout(600)
    dt = pg.inner_text("#pageHost")
    ok("推广 阶段表单" in dt, "005 默认定位推广阶段表单")
    ok("目标客户" in dt and "推广渠道" in dt and "推进阶段" in dt, "推广表单含目标客户/渠道/推进阶段")
    ok("商务谈判" in dt, "推进阶段值为商务谈判（来自推广计划要素）")
    ok("产品试推广计划完成时间" in dt and "产品正式推广是否发起" in dt, "推广阶段 8 字段（1/2/3/7/8 为是/否）")
    # 001 详情阶段导航有推广
    pg.evaluate("()=>{curProjStage=-1;showPage('proj:detail',{id:'PRJ-2026-001'})}")
    pg.wait_for_timeout(600)
    dt1 = pg.inner_text("#pageHost")
    ok(dt1.count("推广") >= 1, "001 阶段导航含推广（未开始）")

    # ========== ④ 问问 AI 移除 ==========
    print("\n== 4. 实验设计取消「问问 AI」 ==")
    pg.evaluate("()=>openNewNormalExp()")
    pg.wait_for_timeout(400)
    mb = pg.inner_text(".modal-bd")
    ok("问问 AI" not in mb, "新建实验弹窗无问问 AI 入口")
    pg.evaluate("()=>closeModal()")
    ok(pg.evaluate("()=>typeof openExperimentAI==='undefined'"), "openExperimentAI 已清理")
    ok(pg.evaluate("()=>typeof adoptExperimentAI==='undefined'"), "adoptExperimentAI 已清理")
    ok(pg.evaluate("()=>typeof aiSparkIcon==='function'"), "aiSparkIcon 保留（后续复用）")
    # DOE 向导第 2 步
    pg.evaluate("()=>showPage('exp:doe')")
    pg.wait_for_timeout(600)
    wt = pg.inner_text("#pageHost")
    ok("问问 AI" not in wt, "DOE 向导无问问 AI 入口")
    pg.evaluate("()=>{if(!wizard.draft){wizard.draft={type:'全因子/部分因子设计',basic:{id:'',name:'',assignee:'李工',dueDate:daysFromNow(14),relatedExp:''},factors:defaultFactors('全因子/部分因子设计'),responses:[{name:'产率 %',goal:'max'}],centerPoints:3,randomize:true,projectIds:[]};}wizard.step=2;renderWizard();}")
    pg.wait_for_timeout(400)
    wt2 = pg.inner_text("#pageHost")
    ok("问问 AI" not in wt2, "DOE 因子配置步骤无问问 AI 入口")

    # ========== ⑤ 周报月报菜单删除 ==========
    print("\n== 5. 周报月报菜单删除 ==")
    menu_txt = pg.evaluate("()=>JSON.stringify(MENU)")
    nav_txt = pg.inner_text("#navScroll")
    ok("周报月报" not in nav_txt, "侧边栏无周报月报菜单")
    ok("产品推广计划" not in nav_txt, "侧边栏无产品推广计划菜单")
    ok(pg.evaluate("()=>MENU.some(m=>m.id==='doc')&&MENU.find(m=>m.id==='doc').children.length===2"),
       "文档管理只剩公共文档/我的文档 2 个子菜单")
    ok(pg.evaluate("()=>MENU.some(m=>m.id==='prod')&&MENU.find(m=>m.id==='prod').children.length===1"),
       "产品管理只剩产品基础信息")
    # 提交周报 → 我的文档 F-M1 可查
    pg.evaluate("()=>showPage('home')")
    pg.wait_for_timeout(400)
    pg.evaluate("()=>submitWeeklyReport(true)")
    pg.wait_for_timeout(500)
    pg.evaluate("()=>gotoWeeklyArchive()")
    pg.wait_for_timeout(500)
    wt = pg.inner_text("#lpHost")
    wk_rows = pg.evaluate("()=>docRowsInView().filter(r=>r.kind==='weekly').length")
    ok(wk_rows >= 1, "我的周报月报文件夹含 %d 条周报（含刚提交）" % wk_rows)
    ok("周报" in wt, "归档列表渲染周报条目")

    # ========== ⑥ 保证函管理占位页 ==========
    print("\n== 6. 保证函管理占位页 ==")
    ok("保证函管理" in nav_txt, "合规管理下出现保证函管理菜单")
    pg.evaluate("()=>showPage('comp:guarantee')")
    pg.wait_for_timeout(500)
    gt = pg.inner_text("#pageHost")
    ok("规划中" in gt, "占位页标注规划中")
    ok("外检记录" in gt and "法规库" in gt, "说明含数据来源（外检记录 + 法规库）")
    grs = pg.eval_on_selector_all("#pageHost tbody tr", "els=>els.length")
    ok(grs == 3, "示意表格 %d 条 mock" % grs)
    ok("GR-2026-" in gt, "示意台账含保证函编号")

    # ========== ⑦ 首页 Bento Grid 栅格 ==========
    print("\n== 7. 首页 Bento Grid 栅格 ==")
    pg.evaluate("()=>showPage('home')")
    pg.wait_for_timeout(600)
    boxes = pg.evaluate("""()=>[...document.querySelectorAll('.bento > *')].map(e=>{
      const r=e.getBoundingClientRect();
      return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),
              cls:e.className,t:(e.querySelector('h3')||e.querySelector('b')||e).textContent.trim()};
    })""")
    ok(len(boxes) == 6, "首页栅格含 %d 个区块" % len(boxes))
    xs = sorted(set(b["x"] for b in boxes))
    ok(len(xs) == 2, "两列栅格（列起点 %s）" % xs)
    act = [b for b in boxes if "b-act" in b["cls"]][0]
    alt = [b for b in boxes if "风险预警" in b["t"]][0]
    ok(act["y"] == alt["y"], "行动区与风险预警同处首屏同一层")
    ok(act["h"] == alt["h"] and act["y"] + act["h"] == alt["y"] + alt["h"],
       "首屏左右两卡等高、底边对齐（%dpx）" % act["h"])

    kpi = [b for b in boxes if "b-span2" in b["cls"] and "kpi-bar" in b["cls"]][0]
    ok(kpi["w"] > xs[1] - xs[0] and kpi["h"] < 140,
       "关键指标为通栏矮条（%dx%d）" % (kpi["w"], kpi["h"]))
    ok(pg.eval_on_selector_all(".kpi-box .stat-box", "els=>els.length") == 4, "关键指标横排四格")

    wk = [b for b in boxes if "本周周报" in b["t"]][0]
    rc = [b for b in boxes if "最近实验" in b["t"]][0]
    ok(wk["y"] + wk["h"] == rc["y"] + rc["h"], "第三行左右两卡底边对齐")

    half = xs[1] - xs[0] + 50
    narrow = [b for b in boxes if b["w"] <= half]
    wide = [b for b in boxes if b["w"] > half]
    ok(len(narrow) == 4 and len(wide) == 2, "6 区块 = 4 张半栏 + 2 张通栏，非全部通栏")
    ok(sum(1 for b in narrow if b["x"] == xs[0]) == 2 and sum(1 for b in narrow if b["x"] == xs[1]) == 2,
       "半栏卡片左右均衡（左 2 / 右 2）")
    ok(not pg.evaluate("()=>document.body.scrollWidth>window.innerWidth+2"), "无横向溢出")

    # 紧急项：置顶 + 整行浅红底，每条只留一个来源标签
    items = pg.evaluate("""()=>[...document.querySelectorAll('.act-item')].map(e=>({
      u:e.classList.contains('act-urgent'), bg:getComputedStyle(e).backgroundColor,
      bl:getComputedStyle(e).borderLeftWidth, tags:e.querySelectorAll('.tag').length}))""")
    ok(items[0]["u"] and items[1]["u"], "紧急任务排在最前（2 条置顶）")
    ok(all(i["u"] == (i["bg"] != "rgb(255, 255, 255)") for i in items), "紧急项整行浅红底、非紧急保持白底")
    ok(all(i["bl"] == "3px" for i in items if i["u"]), "紧急项左侧红条标识")
    ok(all(i["tags"] == 1 for i in items), "每条只保留 1 个标签（来源）")

    # 预警去大面积底色
    ok(pg.evaluate("""()=>[...document.querySelectorAll('.alerts-slim .notice')]
        .every(e=>getComputedStyle(e).backgroundColor==='rgb(255, 255, 255)')"""),
       "预警条目去底色，改为白底 + 左侧色条")
    ok(pg.eval_on_selector_all(".alerts-slim .notice .ni", "els=>els.length") == 4, "预警条目保留小图标")

    # 问候语随时段变化、副标题不再重复统计
    g = pg.inner_text(".page-hd h1")
    ok(g.startswith(("早上好", "上午好", "中午好", "下午好", "晚上好", "凌晨好")), "问候语按时段：%s" % g)
    ok("紧急待办" not in pg.inner_text(".page-sub"), "副标题不再重复紧急/预警计数")

    print("\n== 8. JS 错误 ==")
    ok(len(errs) == 0, "无 JS 运行时错误%s" % ("：" + errs[0] if errs else ""))
    b.close()

print("\n结果：%d/%d" % (len(PASS), len(PASS) + len(FAIL)))
if FAIL:
    print("有 %d 条失败" % len(FAIL))
    sys.exit(1)
print("ALL PASS")
