_CHROME_PATH = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
# -*- coding: utf-8 -*-
"""基础数据 · 原料打通 专项自检
覆盖：物料补录与打通、批次档案、供应商双向联动、原料详情页 6 区块、
      投料表 / 配方表可跳转、溯源与影响范围、回归。"""
from playwright.sync_api import sync_playwright

F = "/Users/dowell/Desktop/code/workbuddy/PLM/PLM3.0全系统演示原型.html"
PASS = 0; FAIL = 0
def ok(c, m):
    global PASS, FAIL
    if c: PASS += 1; print("  ✔", m)
    else: FAIL += 1; print("  ❌", m)

with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=_CHROME_PATH, args=["--no-sandbox"])
    pg = b.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("file://" + F); pg.wait_for_timeout(1500)

    print("=== 一、数据层：物料补录与打通 ===")
    ok(pg.evaluate("()=>matRows().length===31"),
       "物料主数据 18 → 31 条（补录 11 种 + 新增替代料 BIT/无醛固色剂）实际：%s"
       % pg.evaluate("()=>matRows().length"))
    ok(pg.evaluate("()=>MAT_EXTRA.length===12"), "MAT_EXTRA 定义 12 条补录物料")
    ok(pg.evaluate("()=>MAT_EXTRA.every(function(r){return !!matByCode(r.code);})"),
       "12 条补录物料全部已注入物料主数据")
    ok(pg.evaluate("()=>matRows().every(function(r){return !!r._sup;})"),
       "每个物料都带出主供应商（厂内自制物料标「厂内自制」）")
    ok(pg.evaluate("()=>matRows().every(function(r){return !!r._id;})"),
       "补录物料已补 _id，批量选择/编辑/删除可用")

    print("\n=== 一·补 投料表与配方不再断链 ===")
    unlinked = pg.evaluate("""()=>{var miss=[];expSummaries.forEach(function(s){
        (s.items||[]).forEach(function(it){(it.materials||[]).forEach(function(x){
          if(!x.mat)miss.push(x.name);});});});return miss;}""")
    ok(len(unlinked) == 0, "对比总结投料表每一行都能解析到物料编码（缺失：%s）" % (unlinked or "无"))
    n_mat = pg.evaluate("""()=>{var n=0;Object.keys(EXP_RECIPE).forEach(function(k){
        (EXP_RECIPE[k].rows||[]).forEach(function(r){if(r.mat)n++;});});return n;}""")
    ok(n_mat > 0, "实验配方行按 CAS 反查补上物料编码（命中 %d 行）" % n_mat)
    ok(pg.evaluate("()=>matCas(matByCode('MAT-00128'))==='9009-54-5'"),
       "纯物质物料的自身 CAS 由单一组分反推（MAT-00128 → 9009-54-5）")
    ok(pg.evaluate("()=>matCas(matByCode('MAT-00521'))===''"),
       "混合物物料不硬塞自身 CAS（MAT-00521 甲醛水溶液 → 空）")

    print("\n=== 二、批次档案 ===")
    ok(pg.evaluate("()=>MAT_BATCH.length>=24"), "批次档案 ≥24 条（覆盖投料表全部裸批次号）实际：%s"
       % pg.evaluate("()=>MAT_BATCH.length"))
    ok(pg.evaluate("()=>MAT_BATCH.every(function(b){return !!matByCode(b.mat);})"),
       "每个批次都挂在真实存在的物料上")
    ok(pg.evaluate("()=>MAT_BATCH.every(function(b){return !b.sup||!!supByCode(b.sup);})"),
       "每个批次的供应商编码都能在供应商主数据里找到")
    used = pg.evaluate("""()=>{var miss=[];expSummaries.forEach(function(s){
        (s.items||[]).forEach(function(it){(it.materials||[]).forEach(function(x){
          if(x.batch&&!matBatch(x.batch))miss.push(x.batch);});});});return miss;}""")
    ok(len(used) == 0, "投料表出现的批次号在批次档案中都有记录（缺失：%s）" % (used or "无"))
    ok(pg.evaluate("()=>MAT_BATCH.filter(function(b){return b.status!=='合格';}).length>=4"),
       "存在非合格批次用于演示预警（待检 / 不合格）")

    print("\n=== 三、供应商 ↔ 物料 双向联动 ===")
    ok(pg.evaluate("()=>Object.keys(MAT_SUP).every(function(k){return !!matByCode(k);})"),
       "MAT_SUP 的键都是真实物料编码")
    ok(pg.evaluate("()=>Object.keys(MAT_SUP).every(function(k){return MAT_SUP[k].every(function(x){return !!supByCode(x.sup);});})"),
       "MAT_SUP 的供应商编码都是真实供应商")
    ok(pg.evaluate("()=>Object.keys(MAT_SUP).every(function(k){return MAT_SUP[k].filter(function(x){return x.main;}).length===1;})"),
       "每个在册物料有且仅有 1 个主供应商")
    ok(pg.evaluate("()=>matSupCount('SUP-2026-001')===3"),
       "万华化学供应 3 种物料（实际：%s）" % pg.evaluate("()=>matSupCount('SUP-2026-001')"))

    print("\n=== 四、原料信息列表页 ===")
    pg.evaluate("()=>showPage('bd:rawmat')"); pg.wait_for_timeout(400)
    head = pg.eval_on_selector_all("#dbTable thead th", "els=>els.map(e=>e.textContent.trim())")
    ok("主供应商" in head, "物料列表新增「主供应商」列（表头：%s）" % head)
    n_detail = pg.eval_on_selector_all("#dbTable tbody button", "els=>els.filter(e=>e.textContent.trim()==='详情').length")
    ok(n_detail > 0, "物料行出现「详情」按钮（%d 个）" % n_detail)
    # 供应商侧筛选
    pg.evaluate("()=>matBySup('SUP-2026-001')"); pg.wait_for_timeout(400)
    cnt = pg.eval_on_selector_all("#dbTable tbody tr", "els=>els.length")
    ok(cnt == 3, "点供应商「3 种 ›」跳原料页后自动筛出 3 行（实际 %d 行）" % cnt)
    ok(pg.evaluate("()=>curPage==='bd:rawmat'"), "跳转后当前页为 bd:rawmat")
    pg.evaluate("()=>dbClearFilter()"); pg.wait_for_timeout(300)

    print("\n=== 五、原料详情页 ===")
    pg.evaluate("()=>matOpen('MAT-00127')"); pg.wait_for_timeout(500)
    ok(pg.evaluate("()=>curPage==='bd:rawmat-detail'"), "matOpen 能打开原料详情页")
    txt = pg.inner_text("#pageHost")
    ok("MAT-00127" in txt, "详情页显示物料编码")
    for sec in ["基本信息", "组分构成（供应商披露）", "供应商与货号", "批次测试记录", "实测数据来源", "溯源与影响范围"]:
        ok(sec in txt, "详情页含区块「%s」" % sec)
    # 外购物料 → 组分披露标题；自产物料（去离子水）→ 精确配方标题
    ok("组分构成（供应商披露）" in txt, "外购物料区块标题为「组分构成（供应商披露）」")
    pg.evaluate("()=>matOpen('MAT-00901')"); pg.wait_for_timeout(400)
    ok("配方组成（BOM）" in pg.inner_text("#pageHost"), "自产物料（去离子水）区块标题为「配方组成（BOM）」")
    pg.evaluate("()=>matOpen('MAT-00127')"); pg.wait_for_timeout(400)
    txt = pg.inner_text("#pageHost")
    n_bom = pg.eval_on_selector_all("#pageHost table", "els=>els.length")
    ok(n_bom >= 5, "详情页渲染出 ≥5 张表格（实际 %d）" % n_bom)
    # BOM
    ok(pg.evaluate("()=>{var t=matByCode('MAT-00127');return t.recipe.length===4 && !t.recipe.some(x=>['丙烯酸','甲醛','乙醇','乙二醇单丁醚'].includes(x.name)) && t.recipe.every(x=>x.range);}"),
       "MAT-00127 改为树脂自身披露（4 项、均带范围、且不再含实验配方组分 丙烯酸/甲醛/乙醇）")
    ok("保密" in txt, "BOM 表显示保密标记")
    # 一物一供（2026-09-10）：每物料仅一条供应商数据
    ok("SUP-2026-001" in txt and "SUP-2026-007" not in txt,
       "MAT-00127 一物一供（仅主供万华，进口代采已移除）")
    ok("主供" in txt, "供应商表标出「主供」")
    # 批次
    ok("WPU-D-2608B" in txt and "WPU-I-2608A" in txt,
       "批次记录含投料表用过的国产 / 进口两个批次号")
    # 溯源
    tr = pg.evaluate("()=>{var t=matTrace('MAT-00127');return {r:t.recipes.length,s:t.sums.length,u:t.usedBy.length};}")
    ok(tr["r"] > 0, "溯源：引用该物料的实验配方 %d 套" % tr["r"])
    ok(tr["s"] > 0, "溯源：实际投料过的对比总结 %d 份" % tr["s"])
    ok("溯源与影响范围" in txt, "详情页含「溯源与影响范围」区块")
    ok(pg.eval_on_selector_all("#pageHost .kpi", "els=>els.length") == 4, "溯源区 4 个指标卡")

    print("\n=== 五·补 风险提示 ===")
    pg.evaluate("()=>matOpen('MAT-00521')"); pg.wait_for_timeout(400)
    w = pg.inner_text("#pageHost")
    ok("风险提示" in w, "停用物料 MAT-00521 顶部出现风险提示")
    ok("停用" in w, "风险提示点明物料/供应商停用状态")
    # 2026-09-10：替代三字段（挂被替代的旧料）
    ok("降级替代" in w and "MAT-00904" in w and "2026-07-10" in w,
       "停用物料显示替代类型（降级替代）/ 替代料（MAT-00904）/ 停用时间（2026-07-10）")

    print("\n=== 五·补A 批次测试记录录入（2026-09-10 新增） ===")
    pg.evaluate("()=>matOpen('MAT-00127')"); pg.wait_for_timeout(400)
    txt = pg.inner_text("#pageHost")
    ok("测试项目" in txt and "测试结果" in txt and "备注" in txt,
       "批次测试表含 测试日期/测试项目/测试结果/备注 列")
    ok(pg.eval_on_selector_all("#pageHost .card-hd button",
       "els=>els.some(e=>e.textContent.indexOf('新增检测结果')>=0)"),
       "卡片头部存在「新增检测结果」按钮")
    ok(pg.evaluate("()=>MAT_BATCH.filter(function(b){return b.status==='不合格';}).every(function(b){return (b.note||'').length>=5;})"),
       "所有不合格批次均带备注说明（数据层校验）")
    pg.evaluate("()=>matOpen('MAT-00635')"); pg.wait_for_timeout(400)
    ok("浓度 22%" in pg.inner_text("#pageHost"),
       "氨水详情页显示不合格批次备注（浓度 22%）")
    pg.evaluate("()=>matOpen('MAT-00127')"); pg.wait_for_timeout(400)
    # 打开 modal
    pg.eval_on_selector("#pageHost .card-hd button", "e=>e.click()"); pg.wait_for_timeout(300)
    ok(pg.evaluate("()=>document.querySelector('#mask').className.indexOf('on')>=0"),
       "点击按钮弹出录入 modal")
    # 不合格 + 备注为空 → 拒绝保存
    pg.evaluate("()=>{document.querySelector('#mt_no').value='WPU-D-2609D';"
                "document.querySelector('#mt_testDate').value='2026-09-10';"
                "document.querySelector('#mt_result').value='不合格';"
                "document.querySelector('#mt_note').value='';}")
    pg.evaluate("()=>matTestSave('MAT-00127')"); pg.wait_for_timeout(300)
    ok(pg.evaluate("()=>document.querySelector('#mask').className.indexOf('on')>=0"),
       "不合格且备注为空 → 拒绝保存（modal 保持打开）")
    # 补备注后保存成功
    pg.evaluate("()=>{document.querySelector('#mt_note').value='粘度超标，整批退回供应商';}")
    pg.evaluate("()=>matTestSave('MAT-00127')"); pg.wait_for_timeout(500)
    ok(pg.evaluate("()=>curPage==='bd:rawmat-detail'"), "保存成功后回显详情页")
    txt = pg.inner_text("#pageHost")
    ok("WPU-D-2609D" in txt and "粘度超标" in txt,
       "新批次测试结果已入表（含不合格备注）")
    ok(pg.evaluate("()=>MAT_BATCH.filter(function(b){return b.no==='WPU-D-2609D';}).length===1"),
       "新批次记录仅一条（一批次一次检测）")

    print("\n=== 六、跨模块跳转链路 ===")
    pg.evaluate("()=>showPage('exp:sum-detail',{id:'SUM-2026-0006'})"); pg.wait_for_timeout(600)
    links = pg.eval_on_selector_all("#pageHost .mat-link", "els=>els.map(e=>e.textContent.trim())")
    ok(len(links) > 0, "对比总结投料表的物料名渲染为可点击链接（%d 个）" % len(links))
    ok(pg.eval_on_selector_all("#pageHost .mat-batch", "els=>els.length") > 0,
       "投料表批次号带悬停溯源标记")
    pg.eval_on_selector("#pageHost .mat-link", "e=>e.click()"); pg.wait_for_timeout(500)
    ok(pg.evaluate("()=>curPage==='bd:rawmat-detail'"),
       "点投料表物料名 → 跳到原料详情（当前：%s）" % pg.evaluate("()=>curPage"))
    # 普通实验配方表 CAS → 组分档案；DOE 运行已并入父级执行实验，不再单列配方 Tab
    pg.evaluate("()=>showPage('exp:detail',{id:'EXP-2026-0418'})"); pg.wait_for_timeout(600)
    clicked = pg.evaluate("""()=>{var btns=document.querySelectorAll('#detailTabs button');
        for(var i=0;i<btns.length;i++){if((btns[i].textContent||'').indexOf('配方')>=0){btns[i].click();return true;}}
        return false;}""")
    pg.wait_for_timeout(500)
    n_links = pg.eval_on_selector_all("#detailBody .mat-link", "els=>els.length")
    ok(clicked and n_links > 0, "实验详情切到配方记录 Tab，%d 个组分 / CAS 链接可点" % n_links)
    if clicked and n_links > 0:
        pg.eval_on_selector("#detailBody .mat-link", "e=>e.click()"); pg.wait_for_timeout(500)
        ok(pg.evaluate("()=>curPage==='bd:rawmat-detail'||curPage==='bd:comp'"),
           "点配方表链接 → 跳到对应档案页（当前：%s）" % pg.evaluate("()=>curPage"))
    # 供应商页 → 原料页
    pg.evaluate("()=>showPage('bd:supplier')"); pg.wait_for_timeout(500)
    ok(pg.eval_on_selector_all("#pageHost .mat-link", "els=>els.length") > 0,
       "供应商页「供应物料」列为可点击链接")
    pg.eval_on_selector("#pageHost .mat-link", "e=>e.click()"); pg.wait_for_timeout(500)
    ok(pg.evaluate("()=>curPage==='bd:rawmat'"), "点供应物料 → 跳原料信息页（当前：%s）" % pg.evaluate("()=>curPage"))

    print("\n=== 七、回归 ===")
    for pid in ["bd:rawmat", "bd:comp", "bd:supplier", "bd:sup-data", "bd:ghs", "exp:sum", "exp:doe", "sds:list"]:
        pg.evaluate("()=>showPage('%s')" % pid); pg.wait_for_timeout(300)
        ok(pg.eval_on_selector_all("#pageHost", "els=>els.length>0&&els[0].textContent.length>50"),
           "页面 %s 渲染正常" % pid)
    ok(len(errs) == 0, "全流程 0 JS 错误（实际 %d：%s）" % (len(errs), errs[:3]))

    print("\n" + ("=" * 46))
    print("结果：%d / %d" % (PASS, PASS + FAIL))
    print("ALL PASS" if FAIL == 0 else "有 %d 条失败" % FAIL)
    b.close()


# --- 统一退出码：存在失败断言时返回非零，避免 run_smoke.sh 误判为通过 ---
if FAIL:
    raise SystemExit(1)
