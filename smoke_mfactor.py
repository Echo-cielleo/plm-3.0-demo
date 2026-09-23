_CHROME_PATH = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
# -*- coding: utf-8 -*-
"""M 因子专项自检：数据层打通 + 拆值 + 推导器 + SDS 只读引用 + 四态口径"""
from playwright.sync_api import sync_playwright
F = "/Users/dowell/Desktop/code/workbuddy/PLM/PLM3.0全系统演示原型.html"
P, Fail = 0, 0


def ok(c, m):
    global P, Fail
    if c:
        P += 1; print("  ✅ " + m)
    else:
        Fail += 1; print("  ❌ " + m)


with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=_CHROME_PATH, args=["--no-sandbox"])
    pg = b.new_page(viewport={"width": 1680, "height": 1050})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append("console:" + m.text) if m.type == "error" else None)
    pg.goto("file://" + F); pg.wait_for_timeout(2200)

    print("\n=== 一、数据层：COMP_CLP 取代硬编码 CLP_PARAM ===")
    ok(pg.evaluate("()=>typeof COMP_CLP==='object'&&typeof CLP_PARAM==='undefined'"),
       "COMP_CLP 已就位，旧的 CLP_PARAM 已移除")
    ok(pg.evaluate("()=>Object.keys(COMP_CLP).length===9"), "兼容投影包含 8 个企业补充组分和 1 个仅有官方记录的组分")
    ok(pg.evaluate("()=>!!COMP_CLP['13463-41-7']&&!!COMP_CLP['8001-54-5']"),
       "两个含 M 因子的演示组分已入库")

    print("\n=== 二、数据矛盾已修：甲醛不该有 M 因子 ===")
    ok(pg.evaluate("()=>COMP_CLP['50-00-0'].mM===0&&COMP_CLP['50-00-0'].mC===0"),
       "甲醛 M 因子归零（其分类不含 Aquatic Acute 1 / Chronic 1）")
    ok(pg.evaluate("()=>clpParamOf('50-00-0').m==='—'"), "甲醛 M 因子展示为「—」")
    ok(pg.evaluate("()=>clpParamOf('13463-41-7').m==='急性 100 / 慢性 100'"),
       "吡硫翁锌 M 因子展示为「急性 100 / 慢性 100」")
    ok(pg.evaluate("()=>clpParamOf('13463-41-7').mSrcTxt==='企业自测数据换算'"),
       "M 因子带来源，不再是无出处的裸值")

    print("\n=== 三、ATE 展示串与数值自洽 ===")
    ok(pg.evaluate("""()=>{
        return ['50-00-0','79-10-7','111-76-2','13463-41-7','8001-54-5'].every(function(c){
          var p=COMP_CLP[c];return p.ate===ateTxt(p);});}"""),
       "纯数值组分的 ate 展示串 == ateTxt(数值)")
    ok(pg.evaluate("()=>ateTxt({ateO:100,ateD:300,ateI:3})==='经口 100 mg/kg｜经皮 300 mg/kg｜吸入 3 mg/L'"),
       "ateTxt 格式正确（千分位窄空格）")
    ok(pg.evaluate("()=>fmtNum(10470)==='10 470'&&fmtNum(90000)==='90 000'"), "千分位格式化正确")

    print("\n=== 四、M 因子换算：边界值 ===")
    cases = [("mAcute(2)", 2, 0), ("mAcute(1)", 1, 1), ("mAcute(0.5)", 0.5, 1),
             ("mAcute(0.05)", 0.05, 10), ("mAcute(0.005)", 0.005, 100), ("mAcute(0.0005)", 0.0005, 1000)]
    for name, arg, exp in cases:
        ok(pg.evaluate("()=>mAcute(%r)===%r" % (arg, exp)), "%s = %s" % (name, exp))
    ccases = [("mChronic(0.5)", 0.5, 0), ("mChronic(0.1)", 0.1, 1), ("mChronic(0.05)", 0.05, 1),
              ("mChronic(0.005)", 0.005, 10), ("mChronic(0.0005)", 0.0005, 100)]
    for name, arg, exp in ccases:
        ok(pg.evaluate("()=>mChronic(%r)===%r" % (arg, exp)), "%s = %s" % (name, exp))
    ok(pg.evaluate("()=>mAcute('')===0&&mChronic('abc')===0"), "非法输入返回 0 而不是 NaN")

    # ============ 组分库编辑弹窗 ============
    print("\n=== 五、推导器：组分库编辑弹窗 ===")
    pg.evaluate("showPage('bd:comp')"); pg.wait_for_timeout(800)
    ok(pg.evaluate("""()=>{var h=document.getElementById('dbTable');
        return h.textContent.indexOf('M 因子')>=0&&h.textContent.indexOf('急性毒性数据')>=0;}"""),
       "组分库列表新增「M 因子」「急性毒性数据」两列")
    ok(pg.evaluate("""()=>{var h=document.getElementById('dbTable').textContent;
        return h.indexOf('急性 100 / 慢性 100')>=0;}"""),
       "列表直接显示吡硫翁锌的 M 因子")
    ok(pg.evaluate("""()=>{
        dbPageGo(2);   /* 每页 8 条，未维护的物质在第 2 页 */
        var n=document.querySelectorAll('#dbTable .tag.red').length;
        var txt=document.getElementById('dbTable').textContent.indexOf('未维护')>=0;
        dbPageGo(1);
        return n>0&&txt;}"""),
       "未补录分类参数的组分显示红色「未维护」标签")

    pg.evaluate("""()=>{var r=DB_CFG.component.rows.filter(function(x){return x.cas==='13463-41-7';})[0];
        dbEdit(r._id);}""")
    pg.wait_for_timeout(700)
    ok(pg.evaluate("()=>document.getElementById('mask').className==='on'"), "编辑弹窗已打开")
    ok(pg.evaluate("()=>!!document.getElementById('compClpBox')"), "弹窗内含分类参数分区")
    ok(pg.evaluate("()=>document.body.textContent.indexOf('唯一维护入口')>=0"),
       "标注了这是唯一维护入口")
    for fid in ['clp_uni', 'clp_scl', 'clp_lc50', 'clp_noec', 'clp_mM', 'clp_mC',
                'clp_mSrc', 'clp_ateO', 'clp_ateD', 'clp_ateI', 'clp_ateState', 'clp_aqState']:
        ok(pg.evaluate("()=>!!document.getElementById('%s')" % fid), "控件 %s 存在" % fid)

    # 空值点计算 → 警告
    pg.evaluate("""()=>{document.getElementById('clp_lc50').value='';
        document.getElementById('clp_noec').value='';compClpCalc();}""")
    pg.wait_for_timeout(300)
    ok(pg.evaluate("()=>document.getElementById('clpMsg').style.display!=='none'"),
       "未填实测值时给出提示")
    ok(pg.evaluate("()=>document.getElementById('clpMsg').textContent.indexOf('请先填写')>=0"),
       "提示文案正确")

    # 填实测值 → 计算 → 回填
    pg.evaluate("""()=>{document.getElementById('clp_lc50').value='0.005';
        document.getElementById('clp_noec').value='0.0005';compClpCalc();}""")
    pg.wait_for_timeout(400)
    ok(pg.evaluate("()=>document.getElementById('clp_mM').value==='100'"),
       "L(E)C50 = 0.005 → 急性 M = 100 已回填")
    ok(pg.evaluate("()=>document.getElementById('clp_mC').value==='100'"),
       "NOEC = 0.0005 → 慢性 M = 100 已回填")
    ok(pg.evaluate("()=>document.getElementById('clpMsg').textContent.indexOf('M = 100')>=0"),
       "计算过程可见（不是黑箱）")

    # 换个值验证动态性
    pg.evaluate("""()=>{document.getElementById('clp_lc50').value='0.05';compClpCalc();}""")
    pg.wait_for_timeout(300)
    ok(pg.evaluate("()=>document.getElementById('clp_mM').value==='10'"),
       "改成 0.05 后急性 M 变 10，换算确实是活的")

    # 保存回写
    pg.evaluate("""()=>{document.getElementById('clp_lc50').value='0.0026';
        document.getElementById('clp_noec').value='0.0008';compClpCalc();
        var r=DB_CFG.component.rows.filter(function(x){return x.cas==='13463-41-7';})[0];
        dbSave(r._id);}""")
    pg.wait_for_timeout(600)
    ok(pg.evaluate("()=>document.getElementById('mask').className!=='on'"), "保存后弹窗关闭")
    ok(pg.evaluate("()=>COMP_CLP['13463-41-7'].mM===100&&COMP_CLP['13463-41-7'].mC===100"),
       "M 因子已写回 COMP_CLP")
    ok(pg.evaluate("()=>COMP_CLP['13463-41-7'].ate===ateTxt(COMP_CLP['13463-41-7'])"),
       "保存时 ate 展示串由数值重新派生，不会与数值脱节")

    # 改状态为 na，验证四态可维护
    print("\n=== 六、四态可在组分库维护 ===")
    pg.evaluate("""()=>{var r=DB_CFG.component.rows.filter(function(x){return x.cas==='9009-54-5';})[0];
        dbEdit(r._id);}""")
    pg.wait_for_timeout(700)
    ok(pg.evaluate("()=>document.getElementById('clp_ateState').value==='na'"),
       "聚氨酯预聚体当前状态为 na（不适用）")
    ok(pg.evaluate("""()=>{var s=document.getElementById('clp_ateState');
        return [].slice.call(s.options).map(function(o){return o.value;}).join()==='known,unknown,na';}"""),
       "状态下拉只有三态（unmaintained 由系统判定，不允许手选）")

    print("\n=== 六之二、查看详情也能看到分类参数 ===")
    pg.evaluate("closeModal()"); pg.wait_for_timeout(300)
    pg.evaluate("""()=>{var r=DB_CFG.component.rows.filter(function(x){return x.cas==='13463-41-7';})[0];
        dbView(r._id);}""")
    pg.wait_for_timeout(600)
    ok(pg.evaluate("()=>document.body.textContent.indexOf('分类参数 · CLP 加和法输入')>=0"),
       "查看详情含分类参数分区")
    ok(pg.evaluate("()=>document.body.textContent.indexOf('急性 100 / 慢性 100')>=0"),
       "详情里显示 M 因子数值")
    ok(pg.evaluate("()=>document.body.textContent.indexOf('企业自测数据换算')>=0"),
       "详情里显示 M 因子来源")

    # ============ SDS 侧只读 ============
    print("\n=== 七、SDS 侧只读引用 + 缺值引导补录 ===")
    pg.evaluate("closeModal()"); pg.wait_for_timeout(300)
    pg.evaluate("showPage('sds:wizard')"); pg.wait_for_timeout(700)
    pg.evaluate("wzGo(1)"); pg.wait_for_timeout(500)
    pg.evaluate("()=>{wz.project.product='水性聚氨酯涂饰树脂 WPU-320';}")
    pg.evaluate("pickMarket('EU')"); pg.wait_for_timeout(500)
    pg.evaluate("wzGo(4)"); pg.wait_for_timeout(800)
    ok(pg.evaluate("""()=>{var t=document.querySelector('#wzBody table.tbl.mini');
        return t.querySelectorAll('input,select,textarea').length===0;}"""),
       "参数表内无任何可编辑控件（只读引用，不能就地手填）")
    ok(pg.evaluate("""()=>{var t=document.querySelector('#wzBody table.tbl.mini');
        return t.textContent.indexOf('企业自测数据换算')>=0||t.textContent.indexOf('不适用')>=0;}"""),
       "M 因子来源 / ATE 状态在表里可见")

    ok(pg.evaluate("""()=>{
        var old=JSON.parse(JSON.stringify(wz.formula));
        wz.formula.push({cas:'108-88-3',name:'甲苯',conc:'1.00',secret:false});
        renderStep4();
        var t=document.querySelector('#wzBody table.tbl.mini');
        var has=t.innerHTML.indexOf('gotoCompFill')>=0&&t.textContent.indexOf('去补录')>=0
              &&t.textContent.indexOf('数据未知')>=0&&t.textContent.indexOf('Flam. Liq.')>=0;
        wz.formula=old;renderStep4();return has;}"""),
       "仅有官方分类的 CAS 保留分类并提示 ATE 数据未知和去补录")

    pg.evaluate("gotoCompFill('108-88-3')"); pg.wait_for_timeout(800)
    ok(pg.evaluate("()=>{var k=document.getElementById('dbKw');return !!k&&k.value==='108-88-3';}"),
       "跳转后搜索框已定位到该 CAS")
    pg.wait_for_timeout(800)
    ok(pg.evaluate("()=>!!document.getElementById('compClpBox')"),
       "并自动打开该物质的编辑弹窗，直接进入补录")

    print("\n=== 八、回归 ===")
    pg.evaluate("closeModal()"); pg.wait_for_timeout(300)
    pg.evaluate("showPage('sds:wizard')"); pg.wait_for_timeout(600)
    ok(pg.evaluate("()=>typeof clpParamOf('50-00-0').ateKnown==='boolean'"),
       "ateKnown 保留为派生属性，向下兼容")
    ok(pg.evaluate("()=>clpParamOf('不存在的CAS').ateState==='unmaintained'"),
       "未知 CAS 兜底为 unmaintained")
    ok(pg.evaluate("()=>TOX_STATE.known.unk===false&&TOX_STATE.unknown.unk===true&&TOX_STATE.na.unk===false"),
       "四态的「是否计入未知声明」配置正确")

    print("\nJS 错误：", errs)
    ok(len(errs) == 0, "无 JS 错误")

    print("\n" + "=" * 56)
    print("断言通过 %d / %d" % (P, P + Fail))
    print("=" * 56)


# --- 统一退出码：存在失败断言时返回非零，避免 run_smoke.sh 误判为通过 ---
if Fail:
    raise SystemExit(1)
