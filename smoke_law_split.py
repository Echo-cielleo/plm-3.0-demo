# -*- coding: utf-8 -*-
"""法规统一查询 / 分库维护专项回归，并确认基础数据菜单未被本次修改。"""
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
    page=browser.new_context(viewport={'width':1600,'height':1000}).new_page()
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
    page.goto(URL,wait_until='load');page.wait_for_timeout(800)

    print('=== 修改边界 ===')
    bd=page.evaluate("()=>MENU.find(x=>x.id==='bd').children.map(x=>({id:x.id,name:x.name,children:(x.children||[]).map(y=>y.id)}))")
    ok(bd==[
        {'id':'bd:mat','name':'原料管理','children':['bd:rawmat','bd:inv']},
        {'id':'bd:sup','name':'供应商管理','children':['bd:supplier','bd:sup-data']},
        {'id':'bd:cas','name':'组分与合规','children':['bd:comp','bd:comp-auto','bd:ghs']},
        {'id':'bd:techcat','name':'关键技术分类','children':[]},
        {'id':'bd:formula','name':'内置计算公式','children':[]},
        {'id':'bd:exptpl','name':'实验模板','children':[]},
        {'id':'bd:phys','name':'理化性质配置','children':['bd:phys-lib','bd:phys-tpl']}
    ],'基础数据菜单保持 Work Buddy 的最新结构（含 27z1/27z2 新增的理化性质配置）')

    comp=page.evaluate("()=>MENU.find(x=>x.id==='comp').children.map(x=>({id:x.id,name:x.name,children:(x.children||[]).map(y=>y.id)}))")
    law=next(x for x in comp if x['id']=='law')
    ok(next(x for x in comp if x['id']=='law:query')['name']=='法规统一查询','合规管理包含独立统一查询入口')
    ok(law['name']=='法规库维护','维护入口统一命名为法规库维护')
    ok(law['children']==['law:clp','law:reach','law:oel','law:trans','law:cn','law:zdhc'],'法规库维护含 6 个入口（CLP / REACH / OEL / 运输 / 国内危化品 / ZDHC）')
    sds_src=open('src/23-js-sds.js',encoding='utf-8').read()
    law_query_src=open('src/23y-js-law-query.js',encoding='utf-8').read()
    ok("regPage('law:zdhc'" not in sds_src and law_query_src.count("regLawMaintenance('law:zdhc'")==1,
       'ZDHC 仅由 23y 法规维护页注册一次（无旧 SDS 页面重复注册）')
    ext=next(x for x in comp if x['id']=='ext')
    ok(ext['name']=='外部参考数据' and ext['children']==['law:cl'],'C&L Inventory 移入「外部参考数据」独立分组')
    subst=next(x for x in comp if x['id']=='subst')
    ok(subst['name']=='受限物质管理' and subst['children']==['subst:list','law:rohs'],'受限物质管理改分组，RoHS 限用物质独立成页')

    print('\n=== 法规统一查询 ===')
    page.evaluate("showPage('law:query')");page.wait_for_timeout(250)
    text=page.locator('#pageHost').inner_text()
    ok('法规统一查询' in text,'页面标题为「法规统一查询」')
    ok(not page.locator('#np-law-query').is_visible(),'页面说明默认收起')
    page.locator('#nb-law-query').click();page.wait_for_timeout(180)
    note=page.locator('#np-law-query').inner_text()
    ok('统一查询、分库维护' in note and '名单列入仅表示' in note and '检索范围' in note,
       '说明面板交代查询与维护分工、名单列入含义与检索范围')
    total=page.evaluate('()=>lawQueryAllRows().length')
    ok(total==63,'全部命中记录 63 条（名单 43 + CLP 5 + C&L 3 + OEL 12）')
    ok(page.locator('#lqTabs button').count()==3 and
       [t.strip() for t in page.locator('#lqTabs button').all_text_contents()]==['GHS 分类','名录清单','OEL 限值'],
       '页签按查询维度分为 3 个，不再保留「全部」')
    ok(page.evaluate("()=>_lqTab")=='ghs' and '共 8 条命中记录' in page.locator('#lqCount').inner_text(),
       '默认进入 GHS 分类页签：8 条（CLP 5 + C&L 3）')
    ghsHead=page.locator('#lqTable thead').inner_text()
    ok(all(x in ghsHead for x in ['危险类别和项别','H 代码','象形图','警示词']),
       'GHS 页签列头含危险类别、H 代码、象形图、警示词')
    ok('列入情况' not in ghsHead,'GHS 页签不再出现名录维度的「列入情况」列')
    ok(page.locator('#lqTable tbody svg').count()>0,'GHS 页签用内联矢量图展示象形图，不引入外部图片')
    ok('H350' in page.locator('#lqTable').inner_text(),'GHS 页签展示 H 代码')
    page.locator('#lqTable tbody tr').first.get_by_role('button',name='查看').click();page.wait_for_timeout(150)
    ghsDetail=page.locator('#mBody').inner_text()
    ok('危险类别和项别' in ghsDetail and 'H 代码' in ghsDetail and '警示词' in ghsDetail,
       'GHS 命中详情补充标签要素：危险类别、H 代码、象形图、警示词')
    page.evaluate('closeModal()')
    page.click('#lqTabs button[data-key="list"]');page.wait_for_timeout(150)
    listHead=page.locator('#lqTable thead').inner_text()
    ok(all(x in listHead for x in ['名录名称','列入情况','条目号','阈值 / 用途原文']),
       '名录清单页签列头含名录名称、列入情况、条目号与原文摘要')
    ok('H 代码' not in listHead,'名录清单页签不再出现 GHS 维度的「H 代码」列')
    ok(page.evaluate('()=>lawQueryRows().length')==43,'名录清单页签 43 条（八个名单数据集）')
    ok(page.locator('#lqTable tbody tr').count()==20 and '共 43 条记录' in page.locator('#lqPager').inner_text(),
       '名录清单分页：首页 20 行，分页条显示全部 43 条')
    ok(page.locator('#lqPager .pg-btn').count()==5 and '第 1 / 3 页' in page.locator('#lqPager').inner_text(),
       '43 条按每页 20 条分为 3 页')
    page.evaluate('lawQueryPageGo(3)');page.wait_for_timeout(120)
    ok(page.locator('#lqTable tbody tr').count()==3 and '第 3 / 3 页' in page.locator('#lqPager').inner_text(),
       '末页只渲染剩余 3 条')
    page.evaluate('lawQueryPageGo(2)');page.wait_for_timeout(120)
    page.fill('#lqKw','苯');page.wait_for_timeout(150)
    ok(page.locator('#lqPager').inner_text().find('第 1 / ')>=0 or page.locator('#lqPager .pg-btn').count()==0,
       '改搜索词后回到第 1 页，不会停在上一页页码')
    page.fill('#lqKw','');page.wait_for_timeout(150)
    ok(page.locator('select#lqLaw').count()==0 and page.locator('select#lqSource').count()==0,
       '页签取代了原「法规类别」「法规来源」两个下拉')
    ok(page.evaluate("()=>{var a=$('lqKw'),b=$('lqTabs');return !!(a&&b)&&(a.compareDocumentPosition(b)&4)>0;}"),
       '搜索框位于页签上方，是全局检索入口而非结果内过滤')
    ok('CLP 附录 VI' in page.locator('#np-law-query').inner_text(),
       '说明面板标明检索覆盖的全部法规来源')
    ok(page.evaluate("()=>{var r=lawQueryAllRows().map(x=>lawEvidence(x,true).lv);return r.filter(x=>x==='green').length>0&&r.filter(x=>x==='due').length>0&&r.filter(x=>x==='red').length>0;}"),
       '全部命中记录同时包含绿、黄、红三色只读证据灯')
    ok(page.locator('#lqKpi').count()==0 and page.locator('#pageHost .kpi').count()==0,
       '查询页不再展示命中记录 / 命中物质 / 待复核 / 需改版统计卡')
    ok(page.locator('#lqTable').get_by_role('button',name='确认复审').count()==0 and page.locator('#lqTable').get_by_role('button',name='查看新版本 diff').count()==0,'查询页证据灯只读且无维护操作')
    page.click('#lqTabs button[data-key="oel"]');page.wait_for_timeout(150)
    oelHead=page.locator('#lqTable thead').inner_text()
    ok(all(x in oelHead for x in ['数据集（名录）','列入情况','长期 · 短期 · 上限','数据量']),
       'OEL 页签列头含数据集、列入情况、语义槽位与数据量')
    ok(page.evaluate('()=>lawQueryRows().length')==62 and page.locator('#lqTable tbody tr').count()==20,
       'OEL 页签按「物质 × 当前有效数据集」展开：62 行（31 个物质 × 欧盟 / 中国），首页 20 行')
    oelText=page.locator('#lqTable tbody').inner_text()
    ok('已列入' in oelText and '未列入' in oelText,'OEL 页签同时给出已列入与未列入两类结论')
    ok('长期 0.37' in oelText and '上限 0.5' in oelText,'OEL 限值按长期 / 短期 / 上限语义槽位展示')
    page.locator('#lqTable tbody tr').first.get_by_role('button',name='查看').click();page.wait_for_timeout(150)
    oelDetail=page.locator('#mBody').inner_text()
    ok('数据集数据量' in oelDetail and '列入情况' in oelDetail and '未列入' in oelDetail,
       'OEL 详情展示数据集列入情况、数据量，并说明未列入的含义')
    page.evaluate('closeModal()')
    page.evaluate('lawQueryClear()');page.wait_for_timeout(150)
    ok(page.evaluate("()=>_lqTab")=='ghs' and page.evaluate("()=>_lqPresetLawKey")=='',
       '清空条件后回到默认 GHS 分类页签，不残留外部带入的法规类别')
    page.fill('#lqKw','50-00-0');page.wait_for_timeout(150)
    ok(page.locator('#lqTable tbody tr').count()==2,'GHS 页签按 CAS 50-00-0 命中 2 条（CLP 统一分类 + C&L 企业申报）')
    summary=page.locator('#lqSubstance').inner_text()
    ok('物质基础信息' in summary and '甲醛' in summary and '50-00-0' in summary and
       '共命中 2 条记录' in summary and '覆盖 2 个法规来源' in summary,
       '同一 CAS 先展示物质身份与本维度命中汇总')
    ok('来自组分基础信息' in summary and 'SMILES' in summary and 'C=O' in summary and '分子量' in summary,
       '物质基础信息区读组分基础信息，展示 SMILES / 分子量等结构字段')
    ok('605-001-00-5' in summary,'CLP Index No. 从 Annex VI 单一事实源派生展示')
    page.click('#lqTabs button[data-key="list"]');page.wait_for_timeout(150)
    ok(page.evaluate("()=>$('lqKw').value")=='50-00-0' and page.locator('#lqTable tbody tr').count()==3 and
       '名录名称' in page.locator('#lqTable thead').inner_text(),
       '切到名录清单页签保留关键词，改按名单维度出结果（3 条）')
    page.click('#lqTabs button[data-key="oel"]');page.wait_for_timeout(150)
    ok(page.locator('#lqTable tbody tr').count()==2 and '数据集（名录）' in page.locator('#lqTable thead').inner_text(),
       'OEL 页签对同一物质给出欧盟 / 中国两个数据集的列入情况（2 条）')
    page.evaluate('lawQueryClear()');page.wait_for_timeout(120)
    page.fill('#lqKw','50-00-0');page.select_option('#lqType','统一分类');page.wait_for_timeout(120)
    page.locator('#lqTable tbody tr').first.get_by_role('button',name='查看').click();page.wait_for_timeout(120)
    ok(page.locator('#modal .modal-hd h3').inner_text().startswith('法规命中详情'),'统一查询结果可查看详情')
    ok('人工验证人' in page.locator('#mBody').inner_text(),'详情展示来源维护和验证信息')
    detail=page.locator('#mBody').inner_text()
    ok('复审到期' in detail and 'SCL（特定浓度限值）' in detail and 'M=10' in detail and '口服 ATE = 100 mg/kg' in detail,'甲醛 CLP 详情展示复审期、SCL、M 因子与 ATE')
    page.screenshot(path='/private/tmp/law-query-clp-detail.png',full_page=True)
    page.evaluate('closeModal()')
    page.locator('#lqTable tbody tr').first.get_by_role('button',name='来源库').click();page.wait_for_timeout(150)
    ok(page.evaluate('curPage')=='law:clp','查询结果可进入对应来源库维护页')

    print('\n=== 分库维护 ===')
    routes=[('law:cl','cl','C&L Inventory'),('law:cn','cn','国内危化品法规库'),('law:zdhc','zdhc','ZDHC MRSL')]
    for route,kind,title in routes:
        page.evaluate("r=>showPage(r)",route);page.wait_for_timeout(100)
        ok(title in page.locator('#pageHost').inner_text(),route+' 显示正确维护标题')
        ok(page.evaluate("k=>lawTypeFilter===k",kind),route+' 只加载所属法规库')
        count=page.locator('#lawTable tbody tr').count()
        ok(count>0,route+' 有可维护法规数据')
        expected=page.evaluate("k=>lawRows.filter(r=>r.listType===k).length",kind)
        ok(count==expected,route+' 不混入其他法规库数据')
        ok('复审周期' in page.locator('#lawReviewInfo').inner_text() and '上次复审时间' in page.locator('#lawReviewInfo').inner_text() and '下次建议复审时间' in page.locator('#lawReviewInfo').inner_text(),route+' 展示法规库复审信息卡片')
        ok(page.locator('#lawTable .ev').count()==count,route+' 每行展示证据灯')
        page.get_by_role('button',name='查看详情').first.click();page.wait_for_timeout(100)
        ok(page.evaluate('curPage')=='law:detail',route+' 的法规明细进入独立子页面')
        ok(page.locator('#pageHost .kpi').count()==0,route+' 明细子页面不展示统计卡片')
        ok(page.locator('#lawDetailKw').count()==1 and page.locator('#lawDetailField').count()==1 and page.locator('#lawDetailComplete').count()==1,route+' 明细子页面提供查询与筛选条件')
        ok(page.locator('#lawDetailTable tbody tr').count()>0,route+' 明细子页面展示数据列表')
        page.get_by_role('button',name='返回法规库').click();page.wait_for_timeout(80)
        ok(page.evaluate('curPage')==route,route+' 明细子页面可返回对应维护页')
    # 2026-09-18：law:clp 升级为 CLP 法规库统一页面（23z6），此处仅验边界，细节由 smoke_clp.py 覆盖
    page.evaluate("showPage('law:clp')");page.wait_for_timeout(200)
    clp_txt=page.locator('#pageHost').inner_text()
    ok('CLP 法规库' in clp_txt and page.locator('#clpTabs button').count()==5,'CLP 升级为统一页面（顶部主信息 + 5 Tab）')
    ok('法规统一查询' not in clp_txt and page.locator('#lawTable').count()==0,'CLP 页不再使用分库维护页旧结构')
    page.evaluate("showPage('law:cn')");page.wait_for_timeout(100)
    ok(page.locator('#lawTable .ev-red').count()>0 and page.get_by_role('button',name='查看新版本 diff').count()>0,'国内法规红灯行提供新版本 diff 操作')
    page.get_by_role('button',name='查看新版本 diff').first.click();page.wait_for_timeout(100)
    ok('当前引用版本' in page.locator('#mBody').inner_text() and '来源库最新版本' in page.locator('#mBody').inner_text(),'版本 diff 弹窗对比当前与最新版本')
    page.screenshot(path='/private/tmp/law-cn-version-diff.png',full_page=True)
    page.evaluate('closeModal()')
    # 2026-09-18：law:reach 升级为 REACH 法规库统一页面（23z7），此处仅验边界，细节由 smoke_reach.py 覆盖
    page.evaluate("showPage('law:reach')");page.wait_for_timeout(200)
    reach_txt=page.locator('#pageHost').inner_text()
    ok('REACH 法规库' in reach_txt and page.locator('#rchTabs button').count()==6,'law:reach 升级为统一页面（顶部主信息 + 6 Tab）')
    ok(page.locator('#lawTable').count()==0 and '法规统一查询' not in reach_txt,'REACH 页不再使用分库维护页旧结构')
    # 2026-09-18：law:rohs 由「受限物质管理 · RoHS 限用物质」接管（23z8），原隐藏旧页注册已删
    page.evaluate("showPage('law:rohs')");page.wait_for_timeout(200)
    rohs_txt=page.locator('#pageHost').inner_text()
    ok('RoHS 限用物质' in rohs_txt and page.locator('#rohsTable tbody tr').count()==10,'RoHS 限用物质页直接列全 10 条受限物质')
    page.evaluate("showPage('law:zdhc')");page.wait_for_timeout(100)
    page.get_by_role('button',name='＋ 新增法规清单').click();page.wait_for_timeout(100)
    ok('真实法规文件解析尚未接入' in page.locator('#mBody').inner_text() and '使用预置示例清单' in page.locator('#mBody').inner_text(),'维护页保留分库导入流程（真实文件解析已标注未接入）')
    page.evaluate('closeModal()')

    page.evaluate("showPage('law:query')");page.wait_for_timeout(120)
    page.screenshot(path='/private/tmp/law-unified-query.png',full_page=True)
    page.evaluate("showPage('law:cn')");page.wait_for_timeout(120)
    page.screenshot(path='/private/tmp/law-cn-maintenance.png',full_page=True)

    print('\n=== 运行时 ===')
    ok(not errors,'查询与分库维护流程 JavaScript 错误为 0'+(('：'+errors[0]) if errors else ''))
    browser.close()

print('=== 结果：通过 %d / 失败 %d ==='%(passed,failed))
raise SystemExit(1 if failed else 0)
