_CHROME_PATH = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
# -*- coding: utf-8 -*-
"""G5（第12章生态毒性）+ G6（第15章动态名单/CSA）+ G10（第14章运输）专项自检
覆盖：edit / dv 双视图渲染、生态毒性表（混合物级 + 按组分）、运输概览表（含 ADN）、
      法规表（EU/CN）、CSA 勾选框、名单快照、未知水生毒性声明、0 JS 错误。"""
from playwright.sync_api import sync_playwright

F = "/Users/dowell/Desktop/code/workbuddy/PLM/PLM3.0全系统演示原型.html"
fails = []
def ok(cond, msg):
    print(("✔ " if cond else "❌ ") + msg)
    if not cond: fails.append(msg)

with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=_CHROME_PATH, args=["--no-sandbox"])
    pg = b.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto("file://" + F); pg.wait_for_timeout(1500)
    pg.evaluate("showPage('sds:wizard')"); pg.wait_for_timeout(400)
    pg.evaluate("()=>{wz.project.market='EU';}"); pg.wait_for_timeout(200)
    pg.evaluate("wzGo(5)"); pg.wait_for_timeout(900)

    print("\n=== edit 编制视图：第12/14/15 章表格 ===")
    # 第12章 生态毒性
    ok(pg.evaluate("()=>document.querySelectorAll('#acc11 table.tbl').length>=1"),
       "第12章有生态毒性表")
    ok(pg.evaluate("()=>document.getElementById('sec11')?true:false") or
       pg.evaluate("()=>!!document.querySelector('#acc11')"), "第12章 acc 区块存在")
    body12 = pg.evaluate("()=>document.querySelector('#acc11')?.textContent||''")
    ok('水生危害分类' in body12, "第12章表含「水生危害分类」列")
    ok('PBT' in body12, "第12章含 PBT/vPvB 评估")
    ok('Not available' in body12, "第12章未测得项标 Not available")

    # 第14章 运输
    body14 = pg.evaluate("()=>document.querySelector('#acc13')?.textContent||''")
    ok('运输分类尚未评估' in body14 and '非危险货物' not in body14,
       "第14章默认提示未评估，不预设非危险货物")
    pg.evaluate("() => {transportAssessmentSave({status:'NOT_REGULATED',basis:'人工核对',assessedBy:'EHS'});renderStep5();}")
    body14 = pg.evaluate("()=>document.querySelector('#acc13')?.textContent||''")
    ok('ADN' in body14, "人工结论第14章含 ADN（内河）")
    ok('IMDG' in body14 and 'IATA' in body14 and 'ADR' in body14,
       "人工结论第14章含 ADR/RID/ADN/IMDG/IATA 多模式")
    ok('不受管制 / Not regulated' in body14 and '经人工确认' not in body14,
       "非危险货物显示「不受管制」，单元格不带内部确认痕迹")
    ok('人工确认：' in body14, "编制视图保留内部留痕（确认人 / 判断依据）")

    # ---- G10 第14章真实排版：行 = 14.1~14.7，列 = 运输方式 ----
    print("\n=== G10 第14章表格结构（行=14.x / 列=运输方式）===")
    t14 = pg.evaluate("""()=>{
      var t=document.querySelector('#acc13 table.tbl'); if(!t) return null;
      var ths=Array.from(t.querySelectorAll('thead th')).map(x=>x.textContent.trim());
      var rows=Array.from(t.querySelectorAll('tbody tr')).map(tr=>
        Array.from(tr.children).map(td=>td.textContent.trim()));
      return {ths:ths, rows:rows};
    }""")
    ok(t14 is not None, "第14章渲染为表格（非逐模式卡片）")
    ok(t14 and len(t14['rows']) == 7, "表格 7 行（14.1~14.7）")
    ok(t14 and len(t14['ths']) == 5, "表格 5 列（项目 + 4 种运输方式）")
    ok(t14 and '陆运 ADR / RID' in t14['ths'] and '内河运输 ADN' in t14['ths']
       and '海运 IMDG' in t14['ths'] and '空运 ICAO / IATA' in t14['ths'],
       "列头为陆运/内河/海运/空运四列")
    labels = [r[0].split('\n')[0][:4] for r in (t14['rows'] if t14 else [])]
    ok(all(('14.' + str(i)) in ' '.join(labels) for i in range(1, 8)),
       "行标签 14.1~14.7 齐全")
    ok(t14 and t14['rows'][6][0].find('14.7') >= 0, "末行为 14.7 散装海运（IMO）")
    # 14.7 按 IMO 定义仅限海运列；非危险货物时海运列仍给出确认结论
    ok(t14 and t14['rows'][6][1] == 'N/A' and t14['rows'][6][2] == 'N/A'
       and t14['rows'][6][4] == 'N/A'
       and t14['rows'][6][3] == '不受管制 / Not regulated',
       "14.7 只落在海运列，其余三列恒为 N/A")

    # 危险货物 + 仅选 IMDG：非适用列标 Not applicable，14.7 仅 IMDG 列有值
    pg.evaluate("""() => {transportAssessmentSave({status:'REGULATED',unNumber:'UN3082',
      properShippingName:'ENVIRONMENTALLY HAZARDOUS SUBSTANCE, LIQUID, N.O.S.',
      hazardClass:'9',packingGroup:'III',
      bulkTransport:'按 IMO 第 17 章，散装不适用',specialPrecautions:'远离热源',
      basis:'MSDS 第14章 + 货代确认',assessedBy:'EHS',
      applicableModes:['IMDG']});renderStep5();}""")
    t14r = pg.evaluate("""()=>{
      var t=document.querySelector('#acc13 table.tbl'); if(!t) return null;
      return Array.from(t.querySelectorAll('tbody tr')).map(tr=>
        Array.from(tr.children).map(td=>td.textContent.trim()));
    }""")
    ok(t14r and t14r[0][1] == 'Not applicable' and t14r[0][2] == 'Not applicable'
       and t14r[0][4] == 'Not applicable',
       "未选中的陆运/内河/空运列标 Not applicable")
    ok(t14r and t14r[0][3] == 'UN3082', "海运 IMDG 列显示 UN 编号")
    ok(t14r and t14r[6][1] == 'N/A' and t14r[6][2] == 'N/A' and t14r[6][4] == 'N/A',
       "14.7 仅在 IMDG 列生效，其余列标 N/A")
    ok(t14r and '按 IMO 第 17 章' in t14r[6][3], "14.7 IMDG 列展示散装海运结论")

    # 「适用运输方式」对非危险货物同样生效：只出结论的是勾中的方式
    pg.evaluate("""() => {transportAssessmentSave({status:'NOT_REGULATED',basis:'人工核对',
      assessedBy:'EHS',applicableModes:['ADR','IMDG']});renderStep5();}""")
    t14n = pg.evaluate("""()=>{
      var t=document.querySelector('#acc13 table.tbl'); if(!t) return null;
      return Array.from(t.querySelectorAll('tbody tr')).map(tr=>
        Array.from(tr.children).map(td=>td.textContent.trim()));
    }""")
    ok(t14n and t14n[0][1] == '不受管制 / Not regulated'
       and t14n[0][3] == '不受管制 / Not regulated',
       "非危险货物 + 勾公路/海运：这两列出结论")
    ok(t14n and t14n[0][2] == 'Not applicable' and t14n[0][4] == 'Not applicable',
       "非危险货物下未勾的内河/空运列标 Not applicable（不再无条件铺满四列）")
    # 一个都不勾时兜底为全部方式
    pg.evaluate("""() => {transportAssessmentSave({status:'NOT_REGULATED',basis:'人工核对',
      assessedBy:'EHS',applicableModes:[]});renderStep5();}""")
    t14a = pg.evaluate("""()=>{
      var t=document.querySelector('#acc13 table.tbl'); if(!t) return null;
      return Array.from(t.querySelectorAll('tbody tr')).map(tr=>
        Array.from(tr.children).map(td=>td.textContent.trim()));
    }""")
    ok(t14a and t14a[0][1:].count('不受管制 / Not regulated') == 4,
       "非危险货物且未指定方式时，四列兜底全部出结论")

    # 表格下方的「适用运输方式」说明行
    pg.evaluate("""() => {transportAssessmentSave({status:'NOT_REGULATED',basis:'人工核对',
      assessedBy:'EHS',applicableModes:['RID','IMDG']});renderStep5();}""")
    body14m = pg.evaluate("()=>document.querySelector('#acc13')?.textContent||''")
    ok('适用运输方式：铁路（RID）、海运（IMDG）' in body14m,
       "表格下方明确列出勾选的适用运输方式")
    ok('未勾选的方式不适用' in body14m, "说明行解释未勾选方式标 Not applicable")
    pg.evaluate("""() => {transportAssessmentSave({status:'NOT_REGULATED',basis:'人工核对',
      assessedBy:'EHS',applicableModes:[]});renderStep5();}""")
    ok('未逐一指定，按全部运输方式出具结论' in pg.evaluate("()=>document.querySelector('#acc13')?.textContent||''"),
       "未指定方式时说明行显示兜底口径")
    pg.evaluate("""() => {transportAssessmentSave({status:'NOT_REGULATED',basis:'人工核对',
      assessedBy:'EHS',applicableModes:['ADR','IMDG']});renderStep5();}""")
    # 弹窗里的 14.7 说明与列映射说明
    pg.evaluate("transportAssessmentOpen()"); pg.wait_for_timeout(400)
    mtxt = pg.evaluate("()=>document.querySelector('.modal')?.textContent||''")
    ok('14.7 由「结论」统控' in mtxt, "弹窗说明 14.7 受「结论」统控")
    ok('公路（ADR）与铁路（RID）共同对应表格「陆运 ADR / RID」一列' in mtxt,
       "弹窗说明勾选项与表格列的映射关系")
    pg.evaluate("closeModal()"); pg.wait_for_timeout(200)

    # 维护弹窗新增 14.7 字段
    pg.evaluate("""() => {transportAssessmentSave({status:'REGULATED',unNumber:'UN3082',
      properShippingName:'ENVIRONMENTALLY HAZARDOUS SUBSTANCE, LIQUID, N.O.S.',
      hazardClass:'9',packingGroup:'III',
      bulkTransport:'按 IMO 第 17 章，散装不适用',specialPrecautions:'远离热源',
      basis:'MSDS 第14章 + 货代确认',assessedBy:'EHS',
      applicableModes:['IMDG']});renderStep5();}""")
    pg.evaluate("transportAssessmentOpen()"); pg.wait_for_timeout(400)
    mbody = pg.evaluate("()=>document.querySelector('.modal')?.textContent||''")
    ok('散装海运（14.7 IMO）' in mbody, "维护运输结论弹窗含「散装海运（14.7 IMO）」输入框")
    ok(pg.evaluate("()=>!!document.getElementById('taBulk')"), "弹窗存在 taBulk 输入控件")

    # ---- 14.5 海洋污染物：系统带出 + 可人工覆盖 ----
    print("\n=== G10 14.5 环境危害由第 12 章带出 ===")
    ok(pg.evaluate("()=>{var i=document.getElementById('taMarine');return !!i&&i.style.display==='none';}"),
       "未勾选「人工覆盖」时 14.5 手填框默认隐藏")
    ok(pg.evaluate("()=>!!document.getElementById('taMarineOvr')"), "弹窗有「人工覆盖」开关")
    mzone = pg.evaluate("""()=>{
      var ls=Array.from(document.querySelectorAll('.modal .field label'))
        .filter(x=>x.textContent.indexOf('海洋污染物')>=0)[0];
      return ls?ls.parentNode.textContent:'';
    }""")
    ok('待人工判定' in mzone, "演示配方下 14.5 显示「待人工判定」（上游未定论不给是/否）")
    ok('第 12 章' in mzone and '可勾选人工覆盖' in mzone,
       "14.5 标明来源为第 12 章，并提示可人工覆盖")
    # 勾选覆盖后手填框出现
    pg.evaluate("()=>{document.getElementById('taMarineOvr').checked=true;transportAssessmentToggleMarine();}")
    ok(pg.evaluate("()=>document.getElementById('taMarine').style.display!=='none'"),
       "勾选「人工覆盖」后手填框显示")
    # 上游给出 Chronic 2 时，系统带出应判为「是」
    pg.evaluate("""()=>{(wz.classItems||[]).forEach(function(x){if(x.id==='aqua'){
      x.status='done';x.result='Aquatic Chronic 2';x.code='H411';}});}""")
    pg.evaluate("closeModal()"); pg.wait_for_timeout(150)
    pg.evaluate("transportAssessmentOpen()"); pg.wait_for_timeout(400)
    mzone2 = pg.evaluate("""()=>{
      var ls=Array.from(document.querySelectorAll('.modal .field label'))
        .filter(x=>x.textContent.indexOf('海洋污染物')>=0)[0];
      return ls?ls.parentNode.textContent:'';
    }""")
    ok('是 · Aquatic Chronic 2' in mzone2, "第 12 章为 Chronic 2 时 14.5 自动判为海洋污染物（是）")
    ok('IMDG Code 2.10.2' in mzone2 and '系统带出' in mzone2,
       "带出结论标注「系统带出」并给出 IMDG Code 2.10.2 判定口径")
    pg.evaluate("""()=>{(wz.classItems||[]).forEach(function(x){if(x.id==='aqua'){
      x.status='done';x.result='Aquatic Chronic 3';x.code='H412';}});}""")
    pg.evaluate("closeModal()"); pg.wait_for_timeout(150)
    pg.evaluate("transportAssessmentOpen()"); pg.wait_for_timeout(400)
    mzone3 = pg.evaluate("""()=>{
      var ls=Array.from(document.querySelectorAll('.modal .field label'))
        .filter(x=>x.textContent.indexOf('海洋污染物')>=0)[0];
      return ls?ls.parentNode.textContent:'';
    }""")
    ok('否 · Aquatic Chronic 3' in mzone3, "第 12 章为 Chronic 3 时 14.5 判为否（不误判为海洋污染物）")
    # 人工覆盖值进表格，并标注来源
    pg.evaluate("""() => {transportAssessmentSave({status:'REGULATED',unNumber:'UN3082',
      properShippingName:'ENVIRONMENTALLY HAZARDOUS SUBSTANCE, LIQUID, N.O.S.',
      hazardClass:'9',marinePollutant:'是 · Aquatic Chronic 2（H411）',
      basis:'MSDS 第14章 + 货代确认',assessedBy:'EHS',
      applicableModes:['IMDG']});renderStep5();}""")
    t14m = pg.evaluate("""()=>{
      var t=document.querySelector('#acc13 table.tbl'); if(!t) return null;
      return Array.from(t.querySelectorAll('tbody tr')).map(tr=>
        Array.from(tr.children).map(td=>td.textContent.trim()));
    }""")
    ok(t14m and '是 · Aquatic Chronic 2（H411）（人工覆盖）' in t14m[4][3],
       "人工覆盖值进 14.5 单元格并标注「人工覆盖」")
    # 不覆盖时回到系统带出结论
    pg.evaluate("""() => {transportAssessmentSave({status:'REGULATED',unNumber:'UN3082',
      properShippingName:'ENVIRONMENTALLY HAZARDOUS SUBSTANCE, LIQUID, N.O.S.',
      hazardClass:'9',basis:'MSDS 第14章 + 货代确认',assessedBy:'EHS',
      applicableModes:['IMDG']});renderStep5();}""")
    t14m2 = pg.evaluate("""()=>{
      var t=document.querySelector('#acc13 table.tbl'); if(!t) return null;
      return Array.from(t.querySelectorAll('tbody tr')).map(tr=>
        Array.from(tr.children).map(td=>td.textContent.trim()));
    }""")
    ok(t14m2 and t14m2[4][3] == '否 · Aquatic Chronic 3',
       "未覆盖时 14.5 单元格回到系统带出结论")
    # 还原演示数据
    pg.evaluate("""()=>{(wz.classItems||[]).forEach(function(x){if(x.id==='aqua'){
      x.status='pending';x.result='—';x.code='待人工判断';}});}""")

    # ---- 第 12 章：待人工判定项的判定入口引导 ----
    print("\n=== G10 第12章待人工判定引导 ===")
    pg.evaluate("""()=>{(wz.classItems||[]).forEach(function(x){if(x.id==='aqua'){
      x.status='pending';x.result='—';x.code='待人工判断';}});renderStep5();}""")
    pg.wait_for_timeout(300)
    b12 = pg.evaluate("()=>document.querySelector('#acc11')?.textContent||''")
    ok('去第 4 步完成人工判定' in b12, "第12章给出「去第 4 步完成人工判定」入口")
    ok('判定入口在第 4 步分类评估' in b12, "说明判定入口在第 4 步，本章无入口")
    ok(pg.evaluate("""()=>{
      var h=document.querySelector('#acc11 .acc-hd'); return h?h.textContent:'';
    }""").find('含待人工判定项') >= 0, "第12章标题显示「含待人工判定项」标记")
    # 判定完成后标记与引导都消失
    pg.evaluate("""()=>{(wz.classItems||[]).forEach(function(x){if(x.id==='aqua'){
      x.status='confirmed';x.result='Aquatic Chronic 3';x.code='H412';}});renderStep5();}""")
    pg.wait_for_timeout(300)
    ok('去第 4 步完成人工判定' not in pg.evaluate("()=>document.querySelector('#acc11')?.textContent||''"),
       "判定完成后第12章引导消失")
    ok(pg.evaluate("()=>document.querySelector('#acc11 .acc-hd').textContent")
       .find('含待人工判定项') < 0, "判定完成后标题标记消失")
    # 交付视图与导出不放操作入口
    d12g = pg.evaluate("()=>ecotoxTableHtml(true)")
    ok('去第 4 步完成人工判定' not in d12g, "导出第12章不带人工判定引导按钮")
    pg.evaluate("setWzView('deliver')"); pg.wait_for_timeout(800)
    ok('去第 4 步完成人工判定' not in pg.evaluate("()=>document.querySelector('.doc-page')?.textContent||''"),
       "交付预览第12章不带人工判定引导按钮")
    pg.evaluate("setWzView('edit')"); pg.wait_for_timeout(500)
    pg.evaluate("""()=>{(wz.classItems||[]).forEach(function(x){if(x.id==='aqua'){
      x.status='pending';x.result='—';x.code='待人工判断';}});renderStep5();}""")

    # ---- 第 11 章：毒理端点待人工判定的同类引导 ----
    print("\n=== G10 第11章待人工判定引导 ===")
    pend11 = pg.evaluate("()=>secPendingToxEndpoints().map(function(e){return e[1];})")
    ok(len(pend11) >= 1, "演示数据第11章存在待人工判定的毒理端点：" + ",".join(pend11))
    b11 = pg.evaluate("()=>document.querySelector('#acc10')?.textContent||''")
    ok('去第 4 步完成人工判定（%d 项）' % len(pend11) in b11,
       "第11章给出「去第 4 步完成人工判定（N 项）」入口")
    ok('致癌性' in b11, "引导条列出待判定的具体端点名称")
    ok(pg.evaluate("()=>document.querySelector('#acc10 .acc-hd').textContent")
       .find('含待人工判定项') >= 0, "第11章标题显示「含待人工判定项」标记")
    # 全部判定完成后，引导与标题标记都应消失
    pg.evaluate("""()=>{var ids=secPendingToxEndpoints().map(function(e){return e[1];});
      (wz.classItems||[]).forEach(function(x){
        if(ids.indexOf(x.id)>=0){x.status='confirmed';x.result='不分类';x.code='—';}});
      renderStep5();}""")
    pg.wait_for_timeout(300)
    ok(pg.evaluate("()=>secPendingToxEndpoints().length") == 0, "已把第11章待判定端点全部判定完")
    ok('去第 4 步完成人工判定' not in pg.evaluate("()=>document.querySelector('#acc10')?.textContent||''"),
       "判定完成后第11章引导消失")
    ok(pg.evaluate("()=>document.querySelector('#acc10 .acc-hd').textContent")
       .find('含待人工判定项') < 0, "判定完成后第11章标题标记消失")
    # 交付/导出不放操作入口（用仍有 pending 的状态验证）
    pg.evaluate("""()=>{(wz.classItems||[]).forEach(function(x){
      if(x.id==='carc'){x.status='pending';x.result='—';x.code='待人工判断';}});renderStep5();}""")
    ok('去第 4 步完成人工判定' not in pg.evaluate("()=>toxTableHtml(true)"),
       "导出第11章不带人工判定引导按钮")
    pg.evaluate("setWzView('deliver')"); pg.wait_for_timeout(800)
    ok('去第 4 步完成人工判定' not in pg.evaluate("()=>document.querySelector('.doc-page')?.textContent||''"),
       "交付预览第11章不带人工判定引导按钮")
    pg.evaluate("setWzView('edit')"); pg.wait_for_timeout(400)

    # ---- 编辑视图：第 14 章标题上的「待人工维护」标记 ----
    print("\n=== G10 编辑视图第14章待维护标记 ===")
    pg.evaluate("()=>{wz.transportAssessment=transportAssessmentDefault();renderStep5();}")
    pg.wait_for_timeout(300)
    ok(pg.evaluate("""()=>{
      var h=document.querySelector('#acc13 .acc-hd'); return h?h.textContent:'';
    }""").find('待人工维护') >= 0, "未维护时第14章标题显示红色「待人工维护」")
    ok(pg.evaluate("""()=>{
      var h=document.querySelector('#acc13 .acc-hd'); return h?h.textContent:'';
    }""").find('系统自动生成') < 0, "第14章标题不再显示「系统自动生成」")
    pg.evaluate("""() => {transportAssessmentSave({status:'NOT_REGULATED',basis:'人工核对',
      assessedBy:'EHS'});renderStep5();}""")
    ok(pg.evaluate("()=>document.querySelector('#acc13 .acc-hd').textContent")
       .find('待人工维护') < 0, "维护完成后标记消失")
    pg.evaluate("""() => {transportAssessmentSave({status:'NOT_REGULATED',basis:'人工核对',
      assessedBy:'EHS',applicableModes:['ADR','IMDG']});renderStep5();}""")

    # ---- 必填星号随「结论」联动 ----
    print("\n=== G10 维护弹窗必填星号 ===")
    STAR_JS = """()=>{
      var out={};
      ['UN 编号','正确运输名称','危险类别','包装组','海洋污染物','散装海运',
       '确认人','适用运输方式','判断依据或来源说明','特殊注意事项'].forEach(function(t){
        var l=Array.from(document.querySelectorAll('.modal .field label'))
                  .filter(function(x){return x.textContent.indexOf(t)>=0;})[0];
        if(!l){out[t]='MISSING';return;}
        var s=l.querySelector('.ta-req');
        out[t]= s ? (s.style.display!=='none') : false;
      });
      return out;
    }"""
    def stars():
        return pg.evaluate(STAR_JS)

    pg.evaluate("()=>{document.getElementById('taStatus').value='NOT_ASSESSED';transportAssessmentSyncRequired();}")
    m = stars()
    ok(not any(v is True for v in m.values()), "选「尚未评估」时无任何必填星号")

    pg.evaluate("()=>{document.getElementById('taStatus').value='NOT_REGULATED';transportAssessmentSyncRequired();}")
    m = stars()
    ok(m['判断依据或来源说明'] is True and m['确认人'] is True,
       "选「非危险货物」时判断依据、确认人带星")
    ok(m['UN 编号'] is False and m['正确运输名称'] is False
       and m['危险类别'] is False and m['适用运输方式'] is False,
       "选「非危险货物」时 UN 编号等不带星")
    ok(m['包装组'] is False and m['海洋污染物'] is False
       and m['散装海运'] is False and m['特殊注意事项'] is False,
       "非必填项（包装组/海洋污染物/散装海运/特殊注意事项）恒不带星")

    pg.evaluate("()=>{document.getElementById('taStatus').value='REGULATED';transportAssessmentSyncRequired();}")
    m = stars()
    ok(m['UN 编号'] is True and m['正确运输名称'] is True and m['危险类别'] is True
       and m['适用运输方式'] is True and m['判断依据或来源说明'] is True and m['确认人'] is True,
       "选「危险货物」时 UN 编号/运输名称/危险类别/适用方式/依据/确认人带星")
    ok(m['包装组'] is False and m['散装海运'] is False,
       "危险货物下包装组、散装海运仍非必填")
    ok('带 * 为必填' in pg.evaluate("()=>document.querySelector('.modal .modal-ft')?.textContent||''"),
       "弹窗底部有「带 * 为必填」说明")

    pg.evaluate("closeModal()"); pg.wait_for_timeout(200)

    # 非危险货物时散装海运字段清空
    pg.evaluate("""() => {transportAssessmentSave({status:'NOT_REGULATED',basis:'人工核对',
      assessedBy:'EHS'});renderStep5();}""")
    ok(pg.evaluate("()=>(wz.transportAssessment.bulkTransport||'')===''"),
       "非危险货物时清空散装海运（14.7）结论")

    # 第15章 动态名单/CSA
    body15 = pg.evaluate("()=>document.querySelector('#acc14')?.textContent||''")
    ok('REACH Annex XVII' in body15, "第15章含 REACH Annex XVII")
    ok('SVHC' in body15, "第15章含 SVHC 候选清单")
    ok('化学安全评估' in body15 or 'CSA' in body15, "第15章含 CSA 勾选区")
    ok('法规或清单' in body15 and '版本' in body15 and 'Entry 77' in body15,
       "第15章从评估快照展示名单条目和版本")
    ok('本混合物组分均未列入 REACH Annex XIV' not in body15,
       "第15章不再以手写 CAS 表作 Annex XIV 全库未列入判断")

    print("\n=== dv 交付文档流：表格同样渲染 ===")
    pg.evaluate("setWzView('deliver')"); pg.wait_for_timeout(700)
    d12 = pg.evaluate("()=>document.querySelector('.doc-page')?.textContent||''")
    ok('水生危害分类' in d12, "dv 文档流第12章有生态毒性表")
    ok('ADN' in d12, "dv 文档流第14章有运输表（含 ADN）")
    ok('经人工确认' not in d12, "交付文档第14章不含「经人工确认」字样")
    ok('人工确认：' not in d12 and '判断依据：' not in d12 and '本原型' not in d12,
       "交付文档第14章不带内部留痕（确认人 / 判断依据 / 原型说明）")
    ok('不受管制 / Not regulated' in d12, "交付文档非危险货物写法为「不受管制 / Not regulated」")
    # 导出（正式文件）同样按交付口径，不带内部留痕
    d14exp = pg.evaluate("()=>transportTableHtml(true)")
    ok('人工确认：' not in d14exp and '判断依据：' not in d14exp and '本原型' not in d14exp,
       "导出用正式口径：第14章不带内部留痕")
    ok('不受管制 / Not regulated' in d14exp, "导出第14章非危险货物写法为「不受管制 / Not regulated」")
    pg.evaluate("()=>{wz.view='edit';}")   # 临时切回编制态验证无参调用
    d14int = pg.evaluate("()=>transportTableHtml()")
    ok('人工确认：' in d14int, "编制口径（无参调用）仍保留确认人 / 判断依据留痕")
    pg.evaluate("()=>{wz.view='deliver';}")
    ok('法规名单列入情况' in d12 and 'Entry 77' in d12,
       "dv 文档流第15章包含快照名单条目")
    ok('CSA' in d12 or '化学安全评估' in d12, "dv 文档流第15章有 CSA")
    pg.evaluate("setWzView('edit')"); pg.wait_for_timeout(500)

    print("\n=== 市场联动（法规表随目标市场过滤）===")
    pg.evaluate("()=>{wz.project.market='EU';wzGo(5);}"); pg.wait_for_timeout(700)
    b15 = pg.evaluate("()=>document.getElementById('acc14')?.textContent||''")
    ok('15.1 欧盟法规' in b15, "EU 市场下第15章显示欧盟法规表")
    ok('15.1 中国法规' not in b15, "EU 市场下不混入中国法规表")
    pg.evaluate("()=>{wz.project.market='CN';wzGo(5);}"); pg.wait_for_timeout(700)
    b15c = pg.evaluate("()=>document.getElementById('acc14')?.textContent||''")
    ok('15.1 中国法规' in b15c, "CN 市场下第15章显示中国法规表")
    ok('15.1 欧盟法规' not in b15c, "CN 市场下不混入欧盟法规表")
    ok('本期未建立可执行数据集' not in b15c and '未形成自动判断' not in b15c,
       "CN 市场下四个国内名单均已检查，不再标记待建")

    print("\n=== 无 JS 错误 ===")
    ok(len(errs) == 0, "运行期 0 JS 错误" + ("" if not errs else " -> "+str(errs[:2])))

    b.close()

print("\n失败项：%d" % len(fails))
if fails:
    for f in fails: print("  - " + f)
    raise SystemExit(1)
print("全部通过 ✅")
