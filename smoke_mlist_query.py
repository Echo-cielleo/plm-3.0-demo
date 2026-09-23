# -*- coding: utf-8 -*-
"""阶段 4B-1：构建产物中的名单适配、查询投影和页面回归。"""
import os
from playwright.sync_api import sync_playwright

CHROME = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
URL = 'file://' + os.path.abspath('PLM3.0全系统演示原型.html')
passed = failed = 0


def ok(value, message):
    global passed, failed
    if value:
        passed += 1
        print('  ✔ ' + message)
    else:
        failed += 1
        print('  ✘ ' + message)


with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1600, 'height': 1000})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(URL, wait_until='load')

    print('=== 数据集注册与来源 ===')
    keys = page.evaluate("() => listGetDatasets().map(x=>x.key)")
    ok(len(keys) == 8 and len(keys) == len(set(keys)), '八个名单数据集登记且 key 唯一')
    for key in ['reach-svhc', 'reach-xiv', 'reach-xvii', 'eu-rohs-annex-ii', 'zdhc-mrsl', 'cn-danger']:
        ok(key in keys and page.evaluate("(key)=>listDatasetAvailable(key,clpSystemToday())", key),
           key + ' 已登记并可用')
    for key in ['cn-prohibited-import-export', 'cn-toxic-chemicals']:
        ok(page.evaluate("""(key)=>{
          var d=listGetDataset(key),r=complianceExecuteMethod('M-LIST',{asOfDate:clpSystemToday(),
            datasetKeys:[key],components:[{cas:'50-00-0'}]});
          return d && d.available===false && d.entries.length===0 && !!d.unavailableReason &&
            !listDatasetAvailable(key,clpSystemToday()) && r.status==='BLOCKED' &&
            r.entryResults[0].assessmentStatus==='DATASET_UNAVAILABLE' &&
            r.entryResults[0].unavailableReason===d.unavailableReason;
        }""", key), key + ' 仅有不可用元数据，不会产生未列入结论')
    ok(not any(x in keys for x in ['cl-inventory','oel']), 'C&L Inventory 和 OEL 均不属于 M-LIST')
    ok(page.evaluate("""() => listGetDataset('reach-xiv').entries.length===REACH_XIV.length &&
      listGetDataset('reach-xiv').version===REACH_MODULES.xiv.ver &&
      listGetDataset('reach-xiv').source===REACH_MODULES.xiv.src"""),
       'Annex XIV 条目数、版本和来源来自现有 REACH 模块')
    ok(page.evaluate("""() => {var a=listGetDataset('reach-xiv').entries[0],b=REACH_XIV[0];
      return a.identity.casNumbers[0]===b.ids.split(' / ')[0] &&
        a.originalText.latestApplicationDate===b.apply &&
        a.originalText.sunsetDate===b.sunset &&
        a.originalText.use===b.use && a.originalText.status===b.status;}"""),
       'Annex XIV 保留身份、申请日期、日落日期、用途及原始状态')
    ok(page.evaluate("""() => listGetDataset('eu-rohs-annex-ii').entries.length===ROHS_ITEMS.length &&
      listGetDataset('eu-rohs-annex-ii').version===ROHS_VER &&
      listGetDataset('eu-rohs-annex-ii').source===ROHS_SRC"""),
       'RoHS 条目数、版本和来源来自现有模块')
    ok(page.evaluate("""() => {var a=listGetDataset('eu-rohs-annex-ii').entries[0],b=ROHS_ITEMS[0];
      return a.originalText.threshold===b.limit && a.originalText.use===b.app &&
        a.originalText.englishName===b.en && a.originalText.limitNote===ROHS_LIMIT_NOTE;}"""),
       'RoHS 限值、用途、英文名和计量说明保持原文')
    ok(page.evaluate("() => listGetDataset('eu-rohs-annex-ii').entries.filter(x=>!x.identity.casNumbers.length).length===2"),
       'PBB / PBDE 两个物质组无单一 CAS / EC')
    ok(page.evaluate("""() => listGetDataset('zdhc-mrsl').entries.length===LAW_DETAIL['zdhc-mrsl'].rows.length &&
      listGetDataset('cn-danger').entries.length===LAW_DETAIL['cn-danger'].rows.length"""),
       'ZDHC 与国内目录条目数来自当前 LAW_DETAIL')
    ok(page.evaluate("""() => {var d=LAW_DETAIL['cn-danger'],e=listGetDataset('cn-danger').entries[0];
      return e.entryCode===d.rows[0][0] && e.name===d.rows[0][1] &&
        e.identity.casNumbers[0]===d.rows[0][2] && e.originalText.notes===d.rows[0][4];}"""),
       '国内目录保留序号、品名、CAS 和含量备注')
    ok(page.evaluate("() => listGetDatasets().filter(x=>x.available!==false).every(d=>d.entries.every(e=>e.mode==='listed-only'&&e.conditions.length===0))"),
       '所有真实适配器仅做列入，不从复杂文字推导条件')
    ok(page.evaluate("""() => {
      var n=REACH_XIV.length;REACH_XIV.push(Object.assign({},REACH_XIV[0],{no:'测试临时条目'}));
      try{return listReachXivEntries().length===n+1;}finally{REACH_XIV.pop();}
    }"""""), 'REACH 原始数组变化后重新执行适配器可跟随')
    ok(page.evaluate("""() => {
      var n=ROHS_ITEMS.length;ROHS_ITEMS.push(Object.assign({},ROHS_ITEMS[0],{en:'Temporary test row',cas:'999-11-1'}));
      try{return listRohsEntries().length===n+1;}finally{ROHS_ITEMS.pop();}
    }"""""), 'RoHS 原始数组变化后重新执行适配器可跟随')
    ok(page.evaluate("""() => {
      var d=LAW_DETAIL['zdhc-mrsl'],before=LAW_DETAIL['zdhc-mrsl'];
      LAW_DETAIL['zdhc-mrsl']={cols:['名称','CAS'],rows:[['测试物质','999-22-2']]};
      try{var e=listZdhcEntries()[0];return e.name==='测试物质' &&
        e.identity.casNumbers[0]==='999-22-2' && e.originalText.threshold==='' &&
        e.originalText.use==='' && e.originalText.notes==='';}
      finally{LAW_DETAIL['zdhc-mrsl']=before;}
    }"""""), '明细列按列名适配，缺少可选列时留空且不崩溃')

    print('=== 查询投影 ===')
    counts = page.evaluate("""() => {
      var rows=listLawQueryProjection(clpSystemToday()),out={};
      rows.forEach(r=>out[r.lawKey]=(out[r.lawKey]||0)+1);return out;
    }""""")
    ok(counts == {'svhc': 8, 'xiv': 6, 'xvii': 8, 'rohs2': 10, 'zdhc-mrsl': 4, 'cn-danger': 3},
       '六库动态行数与来源一致：' + str(counts))
    ok(page.evaluate("""() => listLawQueryProjection(clpSystemToday()).length===39 &&
      lawQueryAllRows().length===47 && LAW_QUERY_REFERENCE_ROWS.length===3"""),
       '动态 39 行 + CLP 5 行 + C&L 3 行，共 47 行')
    ok(page.evaluate("""() => {var r=listLawQueryProjection(clpSystemToday());return r.every(x=>x.isListProjection&&
      x.id&&x.entryCode&&x.version&&x.source&&x.maintenanceRoute&&
      !['TRIGGERED','NOT_TRIGGERED'].includes(x.result));}"""),
       '动态行含所需结构，结果只表述名单列入')
    ok(page.evaluate("""() => {var r=listLawQueryProjection(clpSystemToday());return r.length===new Set(r.map(x=>x.id)).size &&
      lawQueryAllRows().length===new Set(lawQueryAllRows().map(x=>x.id)).size;}"""),
       '动态投影和全查询均无重复 ID')
    ok(page.evaluate("""() => {
      var d=listGetDataset('eu-rohs-annex-ii'),before=listLawQueryProjection(clpSystemToday()).filter(x=>x.lawKey==='rohs2').map(x=>x.id).sort().join();
      d.entries.reverse();try{return before===listLawQueryProjection(clpSystemToday()).filter(x=>x.lawKey==='rohs2').map(x=>x.id).sort().join();}
      finally{d.entries.reverse();}
    }"""""), '投影 ID 由数据集 key、版本、条目 ID 稳定生成')
    ok(page.evaluate("""() => {var r=listLawQueryProjection(clpSystemToday()).find(x=>x.lawKey==='xiv'&&x.cas==='117-81-7');
      return r.ec==='204-211-0' && r.version===REACH_MODULES.xiv.ver && r.maintenanceRoute==='law:reach';}"""),
       'Annex XIV 的 CAS、EC、版本和维护路由正确')
    ok(page.evaluate("""() => {var r=listLawQueryProjection(clpSystemToday()).find(x=>x.lawKey==='rohs2'&&x.cas==='7439-92-1');
      return r.ec==='231-100-4' && r.thresholdText===ROHS_ITEMS[0].limit && r.maintenanceRoute==='law:rohs';}"""),
       'RoHS 的 CAS、EC、限值原文与路由正确')
    ok(page.evaluate("() => listLawQueryProjection(clpSystemToday()).filter(x=>x.lawKey==='rohs2'&&x.cas==='—').length===2"),
       '无 CAS 的 RoHS 物质组保留在查询投影')
    ok(page.evaluate("() => listLawQueryProjection(clpSystemToday()).every(x=>!['cn-prohibited-import-export','cn-toxic-chemicals'].includes(x.lawKey))"),
       '两个不可用数据集不产生普通查询行')
    ok(page.evaluate("""() => LAW_QUERY_REFERENCE_ROWS.every(x=>x.lawKey==='cl-inventory') &&
      LAW_QUERY_REFERENCE_ROWS.map(x=>x.id).join()==='Q004,Q008,Q010'"""),
       '参考数组只保留 C&L Inventory，旧手工名单事实均已清除')
    ok(page.evaluate("""() => lawQueryAllRows().filter(x=>x.sourceType==='clp').length===clpViRecords().length &&
      lawQueryAllRows().filter(x=>x.lawKey==='cl-inventory').length===3"""),
       'CLP 动态查询与 C&L 参考查询继续存在')
    ok(page.evaluate("""() => {var r=complianceExecuteMethod('M-LIST',{asOfDate:clpSystemToday(),
      datasetKeys:['eu-rohs-annex-ii'],components:[{name:'多溴联苯'}]});
      return r.status==='NO_MATCH' && r.entryResults.length===0;}"""),
       '没有 CAS / EC 的物质组不会通过名称自动匹配配方')

    print('=== 查询页面 ===')
    page.evaluate("showPage('law:query')")
    ok(page.locator('#lqTable tbody tr').count() == 47, '统一查询页正常展示 47 行')
    notice = page.locator('#pageHost').inner_text()
    ok('名单列入仅表示' in notice and '不等同于当前产品已经触发限制' in notice,
       '页面一次性说明列入与触发的区别')
    ok(page.locator('#lqLaw option').count() == 9 and page.locator('#lqSource option').count() == 7,
       '法规类别及来源筛选包含 RoHS')
    for key, expected in [('svhc',8),('xiv',6),('xvii',8),('rohs2',10),('zdhc-mrsl',4),('cn-danger',3)]:
        page.select_option('#lqLaw', key)
        ok(page.locator('#lqTable tbody tr').count() == expected, key + ' 筛选行数正确')
    page.select_option('#lqLaw','')
    page.fill('#lqKw','50-00-0')
    ok(page.locator('#lqTable tbody tr').count() == 5, '甲醛 CAS 查询命中五个有真实身份的来源')
    page.fill('#lqKw','多溴联苯')
    ok(page.locator('#lqTable tbody tr').count() == 1 and '多溴联苯' in page.locator('#lqTable').inner_text(),
       '无 CAS 的物质组可按名称搜索')
    page.fill('#lqKw','80-09-1')
    ok(page.locator('#lqTable tbody tr').count() == 1, 'SVHC 的 CAS 查询正常')
    page.fill('#lqKw','铅（Pb）')
    ok(page.locator('#lqTable tbody tr').count() == 1, 'RoHS 的名称查询正常')
    page.evaluate("lawQueryClear()")
    page.select_option('#lqLaw','xvii')
    page.fill('#lqKw','50-00-0')
    page.locator('#lqTable tbody tr').first.get_by_role('button',name='查看').click()
    detail = page.locator('#mBody').inner_text()
    ok(all(x in detail for x in ['条目编号','Entry 77','名单列入状态','阈值原文','75 mg/kg','用途原文','消费品',
                               '豁免原文','工业用途','摘要','数据版本','来源']),
       '详情保留条目号、阈值、用途、豁免、摘要、版本及来源')
    ok('本页展示的是名单列入事实，不是具体产品的最终限制判断。' in detail,
       '详情底部说明不是产品最终限制判断')
    ok('TRIGGERED' not in detail and 'NOT_TRIGGERED' not in detail,
       '详情不暴露产品级条件状态')
    page.evaluate("closeModal();lawQueryClear()")
    page.select_option('#lqLaw','rohs2')
    page.locator('#lqTable tbody tr').first.get_by_role('button',name='来源库').click()
    ok(page.evaluate('curPage')=='law:rohs', 'RoHS 行的来源库按钮进入 RoHS 维护页')
    page.evaluate("showPage('law:query')")
    page.select_option('#lqLaw','cn-danger')
    page.locator('#lqTable tbody tr').first.get_by_role('button',name='来源库').click()
    ok(page.evaluate('curPage')=='law:cn', '国内目录行的来源库按钮进入国内法规维护页')
    page.evaluate("showPage('law:query')")
    page.select_option('#lqLaw','cl-inventory')
    ok(page.locator('#lqTable tbody tr').count()==3, 'C&L Inventory 查询仍正常')
    page.select_option('#lqLaw','clp6')
    ok(page.locator('#lqTable tbody tr').count()==5, 'CLP 动态查询仍正常')
    ok(not errors, '页面 JavaScript 错误为 0')
    browser.close()

print(f'=== M-LIST 查询：通过 {passed} / 失败 {failed} ===')
if failed:
    raise SystemExit(1)
