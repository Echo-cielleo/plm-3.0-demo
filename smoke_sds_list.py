_CHROME_PATH = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
# -*- coding: utf-8 -*-
"""P0 · SDS 列表页改造专项自检（A1-A8 / A10）"""
from playwright.sync_api import sync_playwright
F="/Users/dowell/Desktop/code/workbuddy/PLM/PLM3.0全系统演示原型.html"
P,Fail=0,0
def ok(c,m):
    global P,Fail
    if c: P+=1; print("  ✅ "+m)
    else: Fail+=1; print("  ❌ "+m)

with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path=_CHROME_PATH, args=["--no-sandbox"]); pg=b.new_page(viewport={"width":1680,"height":1050})
    errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.on("console",lambda m:errs.append("console:"+m.text) if m.type=="error" else None)
    pg.goto("file://"+F); pg.wait_for_timeout(2200)

    print("\n=== A1 菜单结构：SDS 管理 → 默认落列表 ===")
    tree=pg.evaluate("""()=>{
      var out=[];
      (function walk(ns,d){ns.forEach(function(n){
        out.push({id:n.id,name:n.name,d:d,kids:(n.children||[]).length});
        if(n.children)walk(n.children,d+1);});})(MENU,0);
      return out;}""")
    sds=[t for t in tree if t['id']=='sds'][0]
    ok(sds['kids']==2,"侧栏 SDS 管理是父菜单（2 个子项）")
    ok(any(t['id']=='sds:list' for t in tree),"含子项 sds:list")
    ok(any(t['id']=='sds:wizard' for t in tree),"含子项 sds:wizard")
    # 点侧栏 SDS 文档列表
    pg.evaluate("showPage('sds:list')"); pg.wait_for_timeout(800)
    ok(pg.inner_text("h1").strip()=="SDS 文档列表","页面标题为「SDS 文档列表」")
    ok(pg.evaluate("!!document.querySelector('.page-acts .btn-primary')")
       and "新增 SDS 文档" in pg.inner_text(".page-acts"),"标题右侧有「＋ 新增 SDS 文档」按钮")
    pg.click(".page-acts .btn-primary"); pg.wait_for_timeout(900)
    ok(pg.evaluate("!!document.getElementById('wzSteps')"),"点击后进入 6 步生成向导")

    print("\n=== A2 证据状态灯（绿/黄/红） ===")
    pg.evaluate("showPage('sds:list')"); pg.wait_for_timeout(800)
    lamps=pg.evaluate("""()=>Array.from(document.querySelectorAll('#lpHost .ev')).map(function(e){
        return {cls:e.className,txt:e.textContent.trim(),tip:e.getAttribute('title')};})""")
    ok(len(lamps)>0,"列表渲染出证据状态灯（%d 个）"%len(lamps))
    lv=pg.evaluate("""()=>{var m={};SDS_ROWS.forEach(function(r){var l=sdsEv(r);m[l.lv]=(m[l.lv]||0)+1;});return m;}""")
    print("     灯分布：",lv)
    ok(lv.get('red',0)>0,"存在红灯（法规未跟进）")
    ok(lv.get('overdue',0)>0,"存在橙灯（超复审/pub/data_gap）")
    ok(lv.get('due',0)>0,"存在黄灯（临期 ≤30 天）")
    ok(lv.get('green',0)>0,"存在绿灯（正常）")
    ok(lv.get('none',0)>0,"存在熄灯档（已归档不参与评估）")
    ok(pg.evaluate("()=>SDS_ROWS.filter(function(r){return r.status==='已归档';}).every(function(r){return sdsEv(r).lv==='none';})"),
       "已归档文档一律熄灯")
    ok(pg.evaluate("()=>SDS_ROWS.every(function(r){var l=sdsEv(r);return l.lv!=='due'||(daysTo(r.reviewDue)>=0&&daysTo(r.reviewDue)<=30);})"),
       "临期档仅落在 0~30 天内")
    # 逐条验证判定逻辑
    chk=pg.evaluate("""()=>SDS_ROWS.map(function(r){
        var e=sdsEv(r),d=daysTo(r.reviewDue);
        var exp = r.status==='已归档' ? 'none'
                : r.lawVer!==r.lawLatest ? 'red'
                : (d<0||r.pubCnt>0||r.gapCnt>0) ? 'overdue'
                : (d<=30) ? 'due' : 'green';
        return {no:r.no,got:e.lv,exp:exp,tip:e.tip};
      }).filter(function(x){return x.got!==x.exp;})""")
    ok(len(chk)==0,"判定逻辑全部正确（红>橙>黄>绿>熄）"+((" 异常："+str(chk)) if chk else ""))

    print("\n=== A3 待改版状态 / A4 规则包徽标 ===")
    ok(pg.evaluate("()=>SDS_ROWS.some(function(r){return r.status==='待改版';})"),"数据含「待改版」状态")
    ok("待改版" in pg.inner_text("#lpHost"),"列表渲染出「待改版」状态标签")
    packs=pg.evaluate("""()=>Array.from(document.querySelectorAll('#lpHost tbody tr')).map(function(tr){
        return (tr.querySelectorAll('td')[4]||{}).textContent||'';}).join('|')""")
    ok("CLP ATP21" in packs,"规则包徽标含 CLP ATP21")
    ok("GB 30000" in packs,"规则包徽标含 GB 30000")

    print("\n=== A5 状态 + 规则包双筛选 ===")
    sels=pg.evaluate("()=>Array.from(document.querySelectorAll('#lpHost [data-flt]')).map(function(s){return s.getAttribute('data-flt');})")
    ok('status' in sels and 'rulePack' in sels,"两个下拉筛选齐全：%s"%sels)
    pg.select_option("[data-flt='rulePack']","GB 30000"); pg.wait_for_timeout(500)
    # 只取顶层数据行：排除展开行，以及展开区内嵌套的版本表行（内容以 ▸SDS- 开头）
    ok(pg.evaluate("""()=>{var rs=Array.from(document.querySelectorAll('#lpHost tbody tr')).filter(function(t){return !t.classList.contains('exp-row')&&t.textContent.indexOf('SDS-')===1;});return rs.length>0&&rs.every(function(tr){return tr.textContent.indexOf('GB 30000')>=0;});}"""),
       "按 GB 30000 筛选后结果全部命中")
    pg.select_option("[data-flt='rulePack']",""); pg.wait_for_timeout(400)

    print("\n=== A6 版本历史行内展开 ===")
    ok(pg.evaluate("()=>document.querySelectorAll('#lpHost td.exp-tog').length>0"),"行首有展开箭头")
    pg.click("#lpHost td.exp-tog"); pg.wait_for_timeout(400)
    ok(pg.evaluate("()=>{var r=document.getElementById('lpexp0');return r&&r.style.display!=='none';}"),"点击后展开版本历史区")
    ok(pg.evaluate("()=>{var r=document.getElementById('lpexp0');return r&&r.textContent.indexOf('版本历史')>=0;}"),"展开区含版本历史标题")
    ok(pg.evaluate("()=>{var r=document.getElementById('lpexp0');return r&&r.querySelectorAll('tbody tr').length>=1;}"),"展开区有版本记录行")
    pg.click("#lpHost td.exp-tog"); pg.wait_for_timeout(300)
    ok(pg.evaluate("()=>document.getElementById('lpexp0').style.display==='none'"),"再次点击可收起")

    print("\n=== A7 操作按状态区分 ===")
    acts=pg.evaluate("""()=>{var m={};SDS_ROWS.forEach(function(r){m[r.status]=sdsActs(r);});return m;}""")
    ok("提交审核" in acts.get('编制中','') and "编辑" in acts.get('编制中',''),"编制中 → 编辑 / 提交审核")
    ok("导出 PDF" in acts.get('已发布','') and "申请改版" in acts.get('已发布',''),"已发布 → 导出 PDF / Word / 申请改版")
    ok("开始改版" in acts.get('待改版',''),"待改版 → 开始改版")
    ok("导出" not in acts.get('已归档',''),"已归档 → 无导出按钮")
    ok("导出" not in acts.get('审核中',''),"审核中 → 无导出按钮")

    print("\n=== A8 导出解锁（仅已发布） ===")
    def toast_of(call):
        pg.evaluate("()=>{var w=document.getElementById('toastWrap');if(w)w.innerHTML='';}")
        pg.evaluate(call); pg.wait_for_timeout(350)
        return pg.evaluate("()=>{var t=document.querySelector('#toastWrap .toast');return t?t.textContent:'';}")
    r={'arcToast':toast_of("()=>sdsExport('SDS-2026-0081','PDF')"),
       'pubToast':toast_of("()=>sdsExport('SDS-2026-0158','PDF')")}
    ok("仅" in r['arcToast'] and "已发布" in r['arcToast'],"归档文档导出被拦截：%s"%r['arcToast'].strip()[:30])
    ok("已导出" in r['pubToast'],"已发布文档可导出：%s"%r['pubToast'].strip()[:30])

    print("\n=== A10 置顶 + 首页预警联动 ===")
    order=pg.evaluate("""()=>Array.from(document.querySelectorAll('#lpHost tbody tr'))
        .filter(function(t){return !t.classList.contains('exp-row')&&t.textContent.indexOf('SDS-')===1;})
        .map(function(tr){var e=tr.querySelector('.ev');return e?e.className.replace('ev ev-',''):'';}).filter(Boolean)""")
    print("     行顺序（灯）：",order)
    idx={'red':0,'overdue':1,'due':2,'green':3,'none':4}
    ok(all(idx.get(order[i],9)<=idx.get(order[i+1],9) for i in range(len(order)-1)),"红>橙>黄>绿>熄 排序正确")
    pg.evaluate("showPage('home')"); pg.wait_for_timeout(900)
    homeTxt=pg.inner_text("#pageHost")
    ok("需改版" in homeTxt and ("待复审" in homeTxt or "临期" in homeTxt),"首页出现 SDS 证据预警（三档分开统计）")
    btn=pg.evaluate("""()=>{var bs=Array.from(document.querySelectorAll('#pageHost button'));
        var b=bs.filter(function(x){return x.textContent.indexOf('前往处理')>=0;})[0];
        if(!b)return null; var i=bs.indexOf(b); return {onclick:b.getAttribute('onclick')};}""")
    ok(btn is not None,"预警卡有「前往处理」按钮")
    pg.evaluate("sdsFocus(SDS_ROWS.filter(function(r){return sdsEv(r).lv==='red';})[0].no)"); pg.wait_for_timeout(800)
    ok(pg.evaluate("()=>document.querySelectorAll('#lpHost tr.row-focus').length===1"),"跳转后对应行高亮（row-focus）")

    print("\nJS 错误：",errs)
    ok(len(errs)==0,"无 JS 错误")
    b.close()

print("\n"+"="*56)
print("断言通过 %d / %d"%(P,P+Fail))
print("="*56)


# --- 统一退出码：存在失败断言时返回非零，避免 run_smoke.sh 误判为通过 ---
if Fail:
    raise SystemExit(1)
