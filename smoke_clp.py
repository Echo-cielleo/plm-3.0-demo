# -*- coding: utf-8 -*-
"""[23z6] CLP 法规库统一页面专项自检
   覆盖：顶部主信息（含证据灯/CLP-REACH 分工说明）、5 Tab、各 Tab 筛选搜索、
   详情抽屉、Annex VI → 分类规则 → 标签字典的跳转链、模块版本信息条、
   PCN/UFI 占位说明、版本变更的示例标注、导入新版本静态向导（无「自动解析」表述）。"""
import os
from playwright.sync_api import sync_playwright

CHROME='/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
URL='file://'+os.path.abspath('PLM3.0全系统演示原型.html')
passed=failed=0
def ok(value,message):
    global passed,failed
    if value: passed+=1;print('  ✔ '+message)
    else: failed+=1;print('  ✘ '+message)

with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=CHROME,args=['--no-sandbox'])
    page=browser.new_context(viewport={'width':1680,'height':1000}).new_page()
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
    page.goto(URL,wait_until='load');page.wait_for_timeout(800)

    print('=== 菜单与入口 ===')
    law_m=next(x for x in page.evaluate("()=>MENU.find(x=>x.id==='comp').children") if x['id']=='law')
    ok(next(x for x in law_m['children'] if x['id']=='law:clp')['name']=='CLP 法规库','菜单项更名为「CLP 法规库」')
    page.evaluate("showPage('law:clp')");page.wait_for_timeout(400)
    ok(page.evaluate('curPage')=='law:clp','law:clp 可正常进入')

    print('\n=== 顶部主信息 ===')
    text=page.locator('#pageHost').inner_text()
    ok('CLP 法规库' in text and 'Regulation (EC) No 1272/2008' in text,'展示法规名称与编号')
    ok('欧盟' in text and '已发布' in text,'展示适用市场与当前状态')
    ok(page.locator('#pageHost .ev').count()>0 and '复审预警' in text,'顶部展示证据灯（复审预警）')
    ok('CLP 主版本' in text and '2024/2865 修订版' in text,'展示 CLP 主版本')
    ok('最近审核时间' in text and '最近更新时间' in text and '数据截止日期' in text,'展示审核/更新/数据截止日期')
    ok('质管-熊倩' in text and '附录 VI 随 ATP 发布导入' in text,'展示维护责任人与更新频率')
    for f in ['物质查询','混合物分类','标签生成','SDS编制']:
        ok(f in text,'影响功能包含「%s」'%f)
    ok('CLP 管分类与标签' in text and 'REACH 管注册、授权与限制' in text and '本页面仅涉及 CLP' in text,'CLP / REACH 分工定位说明完整')
    ok('C&L Inventory' in text and '独立菜单维护' in text and 'REACH 独立清单' in text,'标注 C&L Inventory 与 SVHC/XIV/XVII 不属本页')

    print('\n=== Tab 切换（顶部主信息保持不变） ===')
    tabs=page.locator('#clpTabs button')
    ok(tabs.count()==5,'共 5 个 Tab')
    for k,label in [('vi','Annex VI'),('rules','Annex I'),('labels','Annex III/IV/V'),('pcn','Annex VIII'),('chg','版本变更与影响')]:
        page.evaluate("(k)=>{var b=document.querySelectorAll('#clpTabs button');for(var x of b){if(x.getAttribute('data-key')===k)x.click();}}",k)
        page.wait_for_timeout(150)
        ok(page.evaluate('()=>_clpTab')==k,'切到 %s'%label)
    ok(page.locator('#pageHost .desc-list').count()>0 and '影响功能' in page.locator('#pageHost').inner_text(),'切 Tab 后顶部主信息仍在')
    page.evaluate("()=>clpLGoTab('vi')");page.wait_for_timeout(200)

    print('\n=== Tab1 Annex VI 物质统一分类 ===')
    ok(page.locator('#clpTable tbody tr').count()==5,'保留原有 5 条物质示例数据')
    head=page.locator('#clpTable thead').inner_text()
    for c in ['Index No','CAS 号','EC 号','危害分类','H 码','SCL','M 因子','ATE','生效版本','来源与条款位置']:
        ok(c in head,'列表含「%s」列'%c)
    strip=page.locator('.clp-strip').first.inner_text()
    ok('ATP 21' in strip and '数据截止日期' in strip and '官方法规清单（强制采用）' in strip,'模块信息条展示版本/截止日期/来源类型')
    page.fill('#clpViKw','50-00-0');page.wait_for_timeout(120)
    ok(page.locator('#clpTable tbody tr').count()==1 and '甲醛' in page.locator('#clpTable tbody').inner_text(),'支持按 CAS 搜索')
    page.evaluate("()=>clpLViDrawer('605-001-00-5')");page.wait_for_timeout(200)
    dw=page.locator('#clpDw').inner_text()
    ok('M=10' in dw and '口服 ATE = 100 mg/kg' in dw and 'C ≥ 0.2%' in dw,'详情抽屉展示 SCL / M 因子 / ATE')
    ok('官方法规清单（强制采用）' in dw,'详情标注来源类型：官方法规清单（强制采用）')
    ok('查看相关分类规则' in page.locator('#clpDw').inner_text(),'抽屉提供跳转分类规则入口')

    print('\n=== 跳转链：Annex VI → 分类规则 → 标签字典 ===')
    page.evaluate("()=>clpLViToRule('605-001-00-5')");page.wait_for_timeout(250)
    ok(page.evaluate('()=>_clpTab')=='rules','跳转到 Annex I 规则 Tab')
    ok('CR-001' in page.locator('#clpDw .modal-hd h3').inner_text(),'抽屉打开对应规则 CR-001')
    dw=page.locator('#clpDw').inner_text()
    ok('研发实现用' in dw,'抽屉标注「研发实现用」')
    ok('ATE_mix = 100 / Σ( Ci / ATEi )' in dw,'展示 ATE 计算公式')
    ok('原型阶段不做实际计算' in dw,'明确标注不做实际计算')
    ok('人工审核规则' in dw and '非系统自动解析' in dw,'标注人工审核来源')
    ok(page.locator('#clpTable tbody tr').count()==1,'规则列表按跳转过滤到目标规则')
    page.evaluate("()=>clpLRuleToLabel('CR-001')");page.wait_for_timeout(250)
    ok(page.evaluate('()=>_clpTab')=='labels','跳转到标签字典 Tab')
    ok('H301' in page.locator('#clpDw .modal-hd h3').inner_text(),'抽屉打开 H301 字典条目')
    ok('官方标签字典，按版本维护；不是企业自行分类结果' in page.locator('#clpDw').inner_text(),'字典抽屉带官方口径说明')
    page.evaluate("()=>clpLDrawerClose()")

    print('\n=== Tab2 分类规则列表 ===')
    page.evaluate("()=>{_clpF.rules={kw:'',tgt:'',st:''};clpLGoTab('rules');}");page.wait_for_timeout(200)
    ok(page.locator('#clpTable tbody tr').count()>=5,'规则 ≥5 条（含静态示例 ATE 规则）')
    head=page.locator('#clpTable thead').inner_text()
    for c in ['规则编号','规则名称','适用危害类别','适用对象','通用浓度限值','是否允许加和','依据条款','规则版本','审核状态','数据来源类型']:
        ok(c in head,'规则列表含「%s」列'%c)
    ok('否—逐案评估' in page.locator('#clpTable tbody').inner_text(),'逐案评估规则如实标注')
    page.select_option('#clpRuTgt','混合物');page.wait_for_timeout(120)
    ok(page.locator('#clpTable tbody tr').count()==3,'按适用对象（混合物）筛选出 3 条')

    print('\n=== Tab3 标签字典 ===')
    page.evaluate("()=>{_clpF.labels={kw:'',tp:''};clpLGoTab('labels');}");page.wait_for_timeout(200)
    body=page.locator('#clpTabBody').inner_text()
    ok('官方标签字典' in body,'页面标注官方标签字典口径')
    ok(page.evaluate("()=>CLP_LABELS.length")>=10 and page.locator('#clpTable tbody tr').count()>=8,'字典条目 ≥10 条（每页 8 条）')
    codes=page.evaluate("()=>CLP_LABELS.map(x=>x.code+' '+x.picto).join(' | ')")
    ok('EUH066' in codes and 'P301+P310' in codes and 'GHS06' in codes,'字典覆盖 H / EUH / P 码与 GHS 图标')
    page.select_option('#clpLbTp','EUH 码');page.wait_for_timeout(120)
    ok(page.locator('#clpTable tbody tr').count()==1,'按 EUH 码筛选 1 条')

    print('\n=== Tab4 Annex VIII PCN / UFI 占位 ===')
    page.evaluate("()=>clpLGoTab('pcn')");page.wait_for_timeout(200)
    body=page.locator('#clpTabBody').inner_text()
    ok('静态占位' in body and '不实现 PCN 文件生成或提交通报' in body,'明确静态占位口径')
    ok('有危害分类的混合物' in body and '成员国毒物中心' in body,'展示 PCN 适用范围与触发条件')
    ok('16 位唯一配方标识符' in body and '急救' in body,'UFI 说明（16 位标识符 + 急救定位）')
    ok('UFI 填写位' in body and '来源、生成与校验' in body,'标注与 SDS 模块的关联')

    print('\n=== Tab5 版本变更与影响（示例标注） ===')
    page.evaluate("()=>clpLGoTab('chg')");page.wait_for_timeout(200)
    body=page.locator('#clpTabBody').inner_text()
    ok('新增' in body and '修改' in body and '废止' in body,'覆盖新增 / 修改 / 废止三类变更')
    ok('示例数据' in body and '影响分析能力' in body,'显式标注配方 / SDS 数量为示例数据')
    ok('官方清单' in body,'影响物质数量标注官方清单来源')
    ok('查看影响范围' in body,'提供查看影响范围操作')
    page.get_by_role('button',name='查看影响范围').first.click();page.wait_for_timeout(150)
    ok('示例' in page.locator('#mBody').inner_text() and '影响物质' in page.locator('#mBody').inner_text(),'影响范围弹窗区分官方物质数与示例配方/SDS 数')
    page.evaluate('closeModal()')

    print('\n=== 导入新版本向导（静态演示） ===')
    page.evaluate("()=>clpLImport()");page.wait_for_timeout(200)
    steps=page.locator('#mBody .mini-step').all_text_contents()
    ok(all(any(s in x for s in ['登记来源文件','创建新版本','上传结构化数据','查看变更','审核发布']) for x in steps),'向导五步与口径一致：%s'%' / '.join(steps))
    page.evaluate("()=>clpLImpNext(2)");page.wait_for_timeout(120)
    page.fill('#ciVer','ATP 22')
    page.evaluate("()=>clpLImpNext(3)");page.wait_for_timeout(120)
    page.evaluate("()=>clpLImpPickDemo()");page.wait_for_timeout(100)
    page.evaluate("()=>clpLImpNext(4)");page.wait_for_timeout(120)
    mb=page.locator('#mBody').inner_text()
    ok('新增条目' in mb and '修改条目' in mb and '删除条目' in mb,'变更预览覆盖新增/修改/删除')
    ok('必须经人工逐条核对确认' in mb,'预览强调人工核对')
    page.evaluate("()=>clpLImpImpact()");page.wait_for_timeout(150)
    ok('示例数据' in page.locator('#mBody').inner_text(),'向导内影响范围同样标注示例')
    page.evaluate("closeModal()");page.wait_for_timeout(100)
    page.evaluate("()=>clpLImpNext(5)");page.wait_for_timeout(120)
    page.evaluate("()=>$('ciOk').checked=true")
    n0=page.evaluate("()=>CLP_CHANGES.length")
    page.evaluate("()=>clpLImpPublish()");page.wait_for_timeout(300)
    ok(page.evaluate("()=>CLP_CHANGES.length")==n0+1,'发布后变更记录 +1')
    ok(page.evaluate('()=>_clpTab')=='chg','发布后定位到版本变更 Tab')
    ok('ATP 22' in page.locator('#clpTable tbody tr').first.inner_text(),'新变更行含所填版本号')

    print('\n=== 表述红线 ===')
    alltxt=page.locator('#pageHost').inner_text()+page.locator('#clpDw').inner_text()
    ok('自动解析' not in alltxt and '系统解析' not in alltxt,'页面无「自动解析法规」类表述')

    print('\n=== 运行时 ===')
    ok(not errors,'CLP 法规库流程 JavaScript 错误为 0'+(('：'+errors[0]) if errors else ''))
    browser.close()

print('=== 结果：通过 %d / 失败 %d ==='%(passed,failed))
raise SystemExit(1 if failed else 0)
