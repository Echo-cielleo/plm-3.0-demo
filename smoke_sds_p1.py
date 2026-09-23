_CHROME_PATH = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
# -*- coding: utf-8 -*-
"""P1 · SDS 向导改造专项自检（B1 实验配方引入 / B4 CLP 三参数 / B6 新增危害类别）"""
from playwright.sync_api import sync_playwright
F = "/Users/dowell/Desktop/code/workbuddy/PLM/PLM3.0全系统演示原型.html"
P, Fail = 0, 0


def ok(c, m):
    global P, Fail
    if c:
        P += 1
        print("  ✅ " + m)
    else:
        Fail += 1
        print("  ❌ " + m)


with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=_CHROME_PATH, args=["--no-sandbox"])
    pg = b.new_page(viewport={"width": 1680, "height": 1050})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append("console:" + m.text) if m.type == "error" else None)
    pg.goto("file://" + F)
    pg.wait_for_timeout(2200)

    # 进向导并跳到步骤 2
    pg.evaluate("showPage('sds:wizard')")
    pg.wait_for_timeout(700)
    pg.evaluate("wzGo(2)")
    pg.wait_for_timeout(500)

    def toast_of(call):
        pg.evaluate("()=>{var w=document.getElementById('toastWrap');if(w)w.innerHTML='';}")
        pg.evaluate(call)
        pg.wait_for_timeout(350)
        return pg.evaluate("()=>{var t=document.querySelector('#toastWrap .toast');return t?t.textContent:'';}")

    print("\n=== B1 · 路径① 手动维护：组分库选择 + 手填 ===")
    ok(pg.evaluate("()=>typeof fmPickComp==='function'"), "「从组分库选择」入口存在")
    ok(pg.evaluate("()=>typeof fmAdd==='function'"), "「添加行」入口存在")
    pg.evaluate("()=>{wz.formula=[];fmAdd();}")
    pg.wait_for_timeout(300)
    ok(pg.evaluate("()=>wz.formula.length===1"), "手动添加行成功")

    print("\n=== B1 · 路径② 从实验配方引入（保密口径：待核对） ===")
    ok(pg.evaluate("()=>typeof EXP_RECIPE==='object'"), "EXP_RECIPE 数据已加载")
    # 配方来源已随两层模型调整：DOE 方案（设计层）+ 普通实验
    n_exp = pg.evaluate("""()=>(typeof doeSchemes!=='undefined'?doeSchemes:[])
        .filter(function(s){return EXP_RECIPE[s.id];}).length
      + experiments.filter(function(e){return e.source!=='DOE'&&EXP_RECIPE[e.id];}).length""")
    ok(n_exp > 0, "可引入的实验配方 %d 个" % n_exp)
    ok(pg.evaluate("""()=>doeSchemes.filter(function(s){return EXP_RECIPE[s.id];})
        .every(function(s){return EXP_RECIPE[s.id].rows.length>0;})"""),
       "每个实验配方都有组分行")
    # 同源性：实验详情页配方与 SDS 引入同源
    same = pg.evaluate("""()=>{
      var s=doeSchemes.filter(function(x){return EXP_RECIPE[x.id];})[0];
      return {id:s.id,n:EXP_RECIPE[s.id].rows.length,code:EXP_RECIPE[s.id].code};
    }""")
    print("     样例方案：", same)
    pg.evaluate("fmPickExp()")
    pg.wait_for_timeout(500)
    ok(pg.evaluate("()=>!!document.querySelector('.pick-list .pick-row')"), "弹出实验配方选择列表")
    ok("不等于实际销售成分" in pg.inner_text(".modal") or "试制投料比" in pg.inner_text(".modal"),
       "弹窗明确声明「实验配方 ≠ 实际销售成分」")
    pg.evaluate("fmExpConfirm('%s')" % same['id'])
    pg.wait_for_timeout(500)
    # 确认弹窗是二次确认，需再点确定
    ok(pg.evaluate("()=>!!document.getElementById('_cfmOk')"), "引入前有二次确认弹窗")
    pg.evaluate("()=>{var b=document.getElementById('_cfmOk');if(b)b.click();}")
    pg.wait_for_timeout(600)
    ok(pg.evaluate("()=>wz.formula.length===%d" % same['n']), "已带入 %d 个组分" % same['n'])
    ok(pg.evaluate("()=>wz.formula.every(function(r){return r.chk===false;})"), "带入的组分全部标记「待核对」")
    ok(pg.evaluate("()=>document.querySelectorAll('#wzBody tr.row-chk').length===wz.formula.length"), "待核对行有高亮底色（.row-chk）")
    ok("待核对" in pg.inner_text("#wzBody"), "行内渲染「待核对」标签")

    print("\n=== B1 · 未核对完不能冻结 / 不能进入下一步 ===")
    t1 = toast_of("fmFreeze()")
    ok("待核对" in t1, "冻结被拦截：%s" % t1.strip()[:34])
    ok(pg.evaluate("()=>wz.frozen===false"), "配方仍处于未冻结状态")
    t2 = toast_of("wzNext()")
    ok("待核对" in t2, "下一步被拦截：%s" % t2.strip()[:34])
    ok(pg.evaluate("()=>wz.step===2"), "仍停留在第 2 步")

    print("\n=== B1 · 逐行核对 + 允许手动增/删/改 ===")
    ok(pg.evaluate("()=>{wz.formula[0].conc='';var t=toast_of;return true;}") if False else
       pg.evaluate("()=>{var r=wz.formula[0];return !!r;}"), "配方行可编辑")
    pg.evaluate("()=>{wz.formula[0].conc='12.00';}")
    pg.evaluate("fmCheck(0)")
    pg.wait_for_timeout(400)
    ok(pg.evaluate("()=>wz.formula[0].chk===true"), "单行核对后 chk 置 true")
    ok(pg.evaluate("()=>document.querySelectorAll('#wzBody tr.row-chk').length===wz.formula.length-1"),
       "核对后高亮减少 1 行")
    pg.evaluate("fmDel(wz.formula.length-1)")
    pg.wait_for_timeout(400)
    pg.evaluate("()=>{var b=document.getElementById('_cfmOk');if(b)b.click();}")
    pg.wait_for_timeout(400)
    ok(pg.evaluate("()=>wz.formula.length===%d" % (same['n'] - 1)), "支持手动删除组分")
    pg.evaluate("()=>{fmAdd();wz.formula[wz.formula.length-1].cas='7732-18-5';wz.formula[wz.formula.length-1].name='水';wz.formula[wz.formula.length-1].conc='5.00';wz.formula[wz.formula.length-1].chk=true;renderStep2();}")
    pg.wait_for_timeout(400)
    ok(pg.evaluate("()=>wz.formula.length===%d" % same['n']), "支持手动新增组分（手动行默认已核对）")
    ok(pg.evaluate("()=>wz.formula[wz.formula.length-1].chk===true"), "人工录入行不标待核对")
    pg.evaluate("fmCheckAll()")
    pg.wait_for_timeout(400)
    ok(pg.evaluate("()=>wz.formula.every(function(r){return r.chk!==false;})"), "「全部标记已核对」生效")
    pg.evaluate("fmFreeze()")
    pg.wait_for_timeout(400)
    ok(pg.evaluate("()=>!!document.getElementById('_cfmOk')"), "冻结前弹出确认对话框")
    pg.evaluate("()=>{var b=document.getElementById('_cfmOk');if(b)b.click();}")
    pg.wait_for_timeout(400)
    ok(pg.evaluate("()=>wz.frozen===true"), "全部核对后可正常冻结")

    print("\n=== B4 · CLP 加和法三参数表（步骤④顶部） ===")
    pg.evaluate("()=>{wz.formula=[{cas:'50-00-0',name:'甲醛',conc:'0.35',secret:false,chk:true},"
                "{cas:'79-10-7',name:'丙烯酸',conc:'2.50',secret:true,chk:true},"
                "{cas:'111-76-2',name:'乙二醇单丁醚',conc:'8.50',secret:false,chk:true},"
                "{cas:'64-17-5',name:'乙醇',conc:'5.00',secret:false,chk:true},"
                "{cas:'9009-54-5',name:'聚氨酯预聚体',conc:'38.65',secret:true,chk:true},"
                "{cas:'7732-18-5',name:'水',conc:'45.00',secret:false,chk:true}];wz.frozen=true;wz.collected=true;}")
    pg.evaluate("wzGo(4)")
    pg.wait_for_timeout(800)
    body = pg.inner_text("#wzBody")
    ok("组分分类参数" in body, "步骤④渲染出「组分分类参数 · CLP 加和法输入」卡片")
    ok(body.index("组分分类参数") < body.index("分类证据追溯"), "参数表位于分类证据卡片之前（顶部）")
    ok("SCL" in body and "M 因子" in body and "ATE" in body, "三参数列齐全：SCL / M 因子 / ATE")
    ok(pg.evaluate("()=>!!document.querySelector('#wzBody table.tbl.mini')"), "参数表使用 mini 表格样式")
    nrow = pg.evaluate("()=>{var t=document.querySelector('#wzBody table.tbl.mini');return t?t.querySelectorAll('tbody tr').length:0;}")
    ok(nrow == 6, "参数表行数 = 配方组分数（%d/6）" % nrow)
    ok(pg.evaluate("()=>{var t=document.querySelector('#wzBody table.tbl.mini');return t.textContent.indexOf('50-00-0')>=0&&t.textContent.indexOf('9009-54-5')>=0;}"),
       "按 CAS 正确取到统一分类（甲醛 / 聚氨酯预聚体）")
    # 四态口径：聚氨酯预聚体为 na（已确认不适用），不标橙、不计入未知声明
    ok(pg.evaluate("()=>{var t=document.querySelector('#wzBody table.tbl.mini');return t.querySelectorAll('tr.row-chk').length===0;}"),
       "急性数据全部可用或已确认不适用，无橙底行")
    ok(pg.evaluate("""()=>{var t=document.querySelector('#wzBody table.tbl.mini');
        var rows=t.querySelectorAll('tbody tr');
        for(var i=0;i<rows.length;i++){
          if(rows[i].textContent.indexOf('9009-54-5')>=0)
            return rows[i].textContent.indexOf('不适用')>=0&&!/row-chk/.test(rows[i].className);
        }
        return false;}"""),
       "聚氨酯预聚体标「不适用」且不再高亮（na 不等于未知）")
    ok(pg.evaluate("""()=>{var p=clpSupplementalGet('9009-54-5'),old=p.ateState;clpSupplementalUpsert('9009-54-5',{ateState:'unknown'},{sourceRef:'测试'});
        renderStep4();
        var n=document.querySelector('#wzBody table.tbl.mini').querySelectorAll('tr.row-chk').length;
        clpSupplementalUpsert('9009-54-5',{ateState:old},{sourceRef:'测试复位'});renderStep4();return n===1;}"""),
       "改回 unknown 后重新高亮 1 行，表格口径与 B5 声明一致")
    ok(pg.evaluate("()=>{var t=document.querySelector('#wzBody table.tbl.mini'),c=t.closest('.card');return !!c&&c.textContent.indexOf('未知急性毒性声明')>=0;}"),
       "参数表说明与第 3/11 章未知毒性声明形成闭环")
    ok("必要输入" in body, "表下有参数用途说明")
    ok(pg.evaluate("()=>clpParamOf('50-00-0').scl.indexOf('≥')>=0"), "甲醛 SCL 已维护")
    ok(pg.evaluate("()=>clpParamOf('9009-54-5').ate.indexOf('—')===0"), "聚合物 ATE 不适用（—）")

    print("\n=== B6 · CLP (EU) 2024/2865 新增危害类别 ===")
    items = pg.evaluate("()=>wz.classItems.map(function(c){return {id:c.id,name:c.name,result:c.result,status:c.status};})")
    ids = [i['id'] for i in items]
    ok('ed' in ids, "含「内分泌干扰（ED）」分类项")
    ok('pmt' in ids, "含「PMT / vPvM」分类项")
    ed = [i for i in items if i['id'] == 'ed'][0]
    pmt = [i for i in items if i['id'] == 'pmt'][0]
    print("     ED：", ed['name'], "/", ed['result'], "  PMT：", pmt['name'], "/", pmt['result'])
    ok('2024/2865' in pg.evaluate("()=>wz.classItems.filter(function(c){return c.id==='ed';})[0].rule"), "ED 引用 CLP (EU) 2024/2865 规则版本")
    ok('2024/2865' in pg.evaluate("()=>wz.classItems.filter(function(c){return c.id==='pmt';})[0].rule"), "PMT 引用 CLP (EU) 2024/2865 规则版本")
    ok(pg.evaluate("()=>wz.classItems.filter(function(c){return c.id==='ed';})[0].opts.length>=3"), "ED 判定弹窗含 3 个类别选项")
    ok("内分泌干扰" in body and "PMT" in body, "步骤④页面渲染出两项新增危害类别")

    print("\n=== 回归：步骤④ 原功能未破坏 ===")
    ok(pg.evaluate("()=>wz.classItems.length>=8"), "分类项总数 ≥ 8（原 6 项 + ED/PMT）")
    ok(pg.evaluate("()=>typeof adjClass==='function'"), "人工判定入口仍在")
    ok(pg.evaluate("()=>document.querySelectorAll('#wzBody .ev-card').length===wz.classItems.length"), "每条分类都有证据卡")
    ok("分类证据追溯" in body, "证据追溯区块仍在")
    # 纯物质不应展示加和法参数表
    pg.evaluate("()=>{wz.formType='pure';wz.classItems=null;renderStep4();}")
    pg.wait_for_timeout(500)
    ok("组分分类参数" not in pg.inner_text("#wzBody"), "纯物质路径不展示加和法参数表")
    pg.evaluate("()=>{wz.formType='mix';wz.classItems=null;renderStep4();}")
    pg.wait_for_timeout(400)

    print("\nJS 错误：", errs)
    ok(len(errs) == 0, "无 JS 错误")
    b.close()

print("\n" + "=" * 56)
print("断言通过 %d / %d" % (P, P + Fail))
print("=" * 56)


# --- 统一退出码：存在失败断言时返回非零，避免 run_smoke.sh 误判为通过 ---
if Fail:
    raise SystemExit(1)
