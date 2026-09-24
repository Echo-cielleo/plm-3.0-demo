#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""阶段 5B：在真实构建页面验证人工审核、发布冻结、预览、Word 与持久化。"""
import pathlib
from playwright.sync_api import sync_playwright

URL = 'file://' + str(pathlib.Path('PLM3.0全系统演示原型.html').resolve())
CHROME = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
passed = failed = 0


def check(value, description):
    global passed, failed
    if value:
        passed += 1
        print('  ✔ ' + description)
    else:
        failed += 1
        print('  ✘ ' + description)


with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1600, 'height': 1000})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(URL, wait_until='load')

    print('=== 5A 原始评估与最终人工决定 ===')
    setup = page.evaluate('''() => {
      wzInitState();wz.project.market='EU';showPage('sds:wizard');wzGo(4);
      window._originalEvaluation=wz.evaluationSnapshot;
      window._originalJson=JSON.stringify(wz.evaluationSnapshot);
      return {steps:WZ_STEPS.length,pending:wz.classItems.filter(c=>c.status==='pending').length};
    }''')
    check(setup['steps'] == 6, '向导仍为六步')
    check(setup['pending'] > 0, '原草稿保留待人工处理的分类项')
    page.evaluate('adoptAllSug()')
    check(page.evaluate("() => wz.classItems.some(c=>c.status==='confirmed')"), '原采纳建议入口保留 confirmed 状态')
    manual = page.evaluate('''() => {
      var i=wz.classItems.findIndex(c=>c.id==='ed');adjClass(i);
      document.getElementById('adjRes').value='不分类（无需分类）';
      document.getElementById('adjCode').value='—';
      document.getElementById('adjNote').value='依据人工审核报告判定';
      adjSave(i);
      var c=wz.classItems[i];return {status:c.status,reason:c.note,time:c.noteAt};
    }''')
    check(manual['status'] == 'manual' and '审核报告' in manual['reason'], '原人工判定入口保存结果与理由')
    check(bool(manual['time']), '人工决定保存操作时间')
    check(page.evaluate('() => JSON.stringify(wz.evaluationSnapshot)===window._originalJson'), '采纳和改判没有修改原草稿评估快照')

    print('=== 发布前校验与草稿 Word ===')
    pre = page.evaluate('''() => {
      wz.project.euh=['EUH066'];wz.draftEdits[4]='第五章经人工审核确认。';
      window._capturedDownload=null;
      window.downloadFile=function(name,html,type){window._capturedDownload={name,html,type};};
      exportSdsWord();
      wz.submitted=true;
      var message='';try{sdsReleaseCreate({name:'EHS 负责人'});}catch(e){message=e.message;}
      return {name:window._capturedDownload.name,message,count:wz.releaseSnapshots.length,
        published:wz.published,preview:sdsDocPreviewHtml().includes('第五章经人工审核确认')};
    }''')
    check(pre['name'].endswith('_草案.doc'), '未发布 Word 文件名带草案标记')
    check(pre['preview'], '未发布预览读取当前草稿')
    check('待人工' in pre['message'] and pre['count'] == 0 and not pre['published'], 'pending 分类阻止发布且不留半成品')

    print('=== 创建不可变发布快照 ===')
    first = page.evaluate('''() => {
      wz.classItems.forEach(c=>{if(c.status==='pending'){
        c.status='manual';c.result='不分类（无需分类）';c.code='—';
        c.note='依据人工审核报告判定';c.noteAt=nowStr();
      }});
      transportAssessmentSave({status:'NOT_REGULATED',basis:'人工核对运输资料',assessedBy:'EHS 负责人'});
      window._draftBodyAtPublish=sdsDraftBodyHtml('published');
      var release=sdsReleaseCreate({name:'EHS 负责人'});
      window._firstRelease=release;
      window._firstReleaseJson=JSON.stringify(release);
      var decisions=release.review.classificationDecisions;
      return {schema:release.schemaVersion,status:release.status,id:release.id,
        version:release.documentVersion,publishedAt:release.publishedAt,reviewer:release.reviewer.name,
        sourceEvaluationId:release.sourceEvaluationId,evaluationId:release.evaluation.id,
        evaluationJson:JSON.stringify(release.evaluation),originalJson:window._originalJson,
        count:decisions.length,confirmed:decisions.find(d=>d.id==='carc'),
        manual:decisions.find(d=>d.id==='ed'),euh:release.review.euhSelections,
        labels:release.review.finalLabels,bodyEqual:release.document.bodyHtml===window._draftBodyAtPublish,
        bodyHasEdit:release.document.bodyHtml.includes('第五章经人工审核确认'),
        publishedText:release.document.bodyHtml.includes('状态：已发布') &&
          !release.document.bodyHtml.includes('状态：草案 Draft'),
        frozen:Object.isFrozen(release)&&Object.isFrozen(release.review.finalClassItems)&&
          Object.isFrozen(release.evaluation.results.lists),
        jsonSafe:!!JSON.stringify(release),active:wz.activeReleaseId,
        liveBody:sdsDocBodyHtml()===release.document.bodyHtml};
    }''')
    check(first['schema'] == 'sds-release-v1' and first['status'] == 'published' and bool(first['id']), '发布快照 schema、状态与 ID 正确')
    check(first['version'] == 'V1.0' and bool(first['publishedAt']) and first['reviewer'] == 'EHS 负责人', '版本、发布时间与原审批角色留存')
    check(first['sourceEvaluationId'] == first['evaluationId'] and first['evaluationJson'] == first['originalJson'], '完整保留系统原草稿评估及来源 ID')
    check(first['count'] == page.evaluate('() => wz.classItems.length'), '保存全部最终分类项目')
    check(first['confirmed']['decisionType'] == 'confirmed' and first['confirmed']['systemStatus'] == 'pending', '保存系统原状态与人工采纳状态')
    check(first['manual']['decisionType'] == 'manual' and first['manual']['systemResult'] != first['manual']['finalResult'], '保存系统原结果与人工最终结果')
    check('审核报告' in first['manual']['reason'] and bool(first['manual']['decidedAt']), '保存改判理由与决定时间')
    check('EUH066' in first['euh'] and isinstance(first['labels']['hCodes'], list) and isinstance(first['labels']['pCodes'], list), '保存 EUH 与现有标签推导结果')
    check(first['frozen'] and first['jsonSafe'], '发布快照可序列化并递归冻结')
    check(first['bodyEqual'] and first['bodyHasEdit'], '发布正文等于发布状态下的草稿生成结果且包含章节人工编辑')
    check(first['publishedText'], '正式正文第 16 章标示已发布')
    check(first['active'] == first['id'] and first['liveBody'], '活动发布 ID 与正式正文指向新快照')

    print('=== 法规升级、草稿变化与正式预览／Word ===')
    frozen = page.evaluate('''() => {
      var expected=window._firstRelease.document.bodyHtml;
      wz.formula[4].conc='9.9';wz.project.product='改动后的草稿产品';
      wz.classItems[0].result='改动后的人工分类';wz.project.euh.push('EUH071');
      wz.draftEdits[4]='改动后的章节内容';
      var names=['clpViDatasetResolve','clpActivePack','complianceGetMethod','listGetDataset',
        'sdsTemplateVersion','clpSubstanceProfile','draftText','legalTableHtml','labelParts'];
      var unchanged=[];
      names.forEach(name=>{
        var original=window[name];
        window[name]=function(){throw new Error('正式文档不应读取 '+name);};
        try{
          window._capturedDownload=null;exportSdsWord();
          unchanged.push(sdsDocBodyHtml()===expected &&
            sdsDocPreviewHtml().includes(expected) &&
            window._capturedDownload.html.includes(expected) &&
            window._capturedDownload.name.includes('_V1.0.doc') &&
            !window._capturedDownload.name.includes('_草案'));
        }catch(e){unchanged.push(false);}finally{window[name]=original;}
      });
      wz.view='deliver';wzGo(5);
      var preview=document.querySelector('.doc-page').innerHTML;
      wzExport('Word');
      return {checks:unchanged,preview:preview.includes('第五章经人工审核确认') &&
          !preview.includes('改动后的章节内容') && !preview.includes('改动后的草稿产品'),
        exportBody:window._capturedDownload.html.includes(expected),
        releaseUnchanged:JSON.stringify(window._firstRelease)===window._firstReleaseJson,
        draftChange:complianceEvaluationEnsure().id!==window._firstRelease.sourceEvaluationId};
    }''')
    check(all(frozen['checks']) and len(frozen['checks']) == 9, '数据、规则、方法、名单、标签、模板与组分来源升级均不被正式预览／Word 实时读取')
    check(frozen['preview'], '发布后草稿改动不改变正式预览页面')
    check(frozen['exportBody'], '发布后草稿改动不改变第 6 步 Word 导出')
    check(frozen['releaseUnchanged'], '法规与草稿变化后第一份发布快照仍完全不变')
    check(frozen['draftChange'], '发布后当前草稿评估仍可独立重算')

    print('=== 重复版本与第二次发布 ===')
    versions = page.evaluate('''() => {
      var duplicate='';try{sdsReleaseCreate({name:'EHS 负责人'});}catch(e){duplicate=e.message;}
      var before=JSON.stringify(window._firstRelease);
      wz.docVer='V1.1';wz.classItems.forEach(c=>{if(c.status==='pending'){
        c.status='manual';c.result='不分类（无需分类）';c.code='—';c.note='新版复核';c.noteAt=nowStr();
      }});
      transportAssessmentSave({status:'NOT_REGULATED',basis:'新版运输资料复核',assessedBy:'EHS 负责人'});
      var second=sdsReleaseCreate({name:'EHS 负责人'});
      return {duplicate,count:sdsReleaseList().length,firstSame:before===JSON.stringify(sdsReleaseGet(window._firstRelease.id)),
        secondId:second.id,active:wz.activeReleaseId,secondBody:second.document.bodyHtml,
        firstBody:window._firstRelease.document.bodyHtml};
    }''')
    check('版本 V1.0 已发布' in versions['duplicate'], '相同文档版本不能重复发布')
    check(versions['count'] == 2 and versions['secondId'] != first['id'] and versions['active'] == versions['secondId'], '不同版本新增记录并切换活动发布 ID')
    check(versions['firstSame'] and versions['secondBody'] != versions['firstBody'], '第二次发布不改写第一份记录或复制旧正文')

    print('=== 持久化、旧草稿与重置 ===')
    persisted = page.evaluate('''() => {
      wzSave();var saved=localStorage.getItem(PERSIST_KEY);
      wzInitState();var loaded=wzLoad();
      var record=sdsActiveRelease();
      return {saved:saved.includes('releaseSnapshots'),loaded,count:wz.releaseSnapshots.length,
        active:wz.activeReleaseId,frozen:Object.isFrozen(record)&&Object.isFrozen(record.document),
        preview:sdsDocBodyHtml()===record.document.bodyHtml};
    }''')
    check(persisted['saved'] and persisted['loaded'] and persisted['count'] == 2, '发布数组随现有 wz localStorage 保存与恢复')
    check(persisted['active'] == versions['secondId'] and persisted['frozen'], '恢复活动 ID 并重新递归冻结历史对象')
    check(persisted['preview'], '恢复后正式预览仍读取发布正文')
    legacy = page.evaluate('''() => {
      var old=JSON.parse(localStorage.getItem(PERSIST_KEY));
      delete old.w.releaseSnapshots;delete old.w.activeReleaseId;
      localStorage.setItem(PERSIST_KEY,JSON.stringify(old));
      var loaded=wzLoad();
      return {loaded,count:wz.releaseSnapshots.length,active:wz.activeReleaseId};
    }''')
    check(legacy['loaded'] and legacy['count'] == 0 and legacy['active'] == '', '旧草稿缺发布字段时自动补默认值')
    page.evaluate('wzReset()')
    check(page.evaluate('() => wz.releaseSnapshots.length===0 && wz.activeReleaseId===""'), '重置演示数据清空发布历史')

    print('=== 原审核流程与页面边界 ===')
    ui = page.evaluate('''() => {
      wzInitState();wz.project.market='EU';showPage('sds:wizard');wzGo(4);
      wz.classItems.forEach(c=>{if(c.status==='pending'){
        c.status='manual';c.result='不分类（无需分类）';c.code='—';c.note='人工复核';c.noteAt=nowStr();
      }});
      transportAssessmentSave({status:'NOT_REGULATED',basis:'人工核对运输资料',assessedBy:'EHS 负责人'});
      wz.submitted=true;wzGo(6);
      var old=sdsConfirm;sdsConfirm=function(title,body,callback){callback();};
      try{wzPublish();}finally{sdsConfirm=old;}
      var html=document.getElementById('wzBody').innerHTML;
      return {count:wz.releaseSnapshots.length,published:wz.published,
        card:!!document.getElementById('sdsReleaseInfo'),
        labels:['发布时间','审核人','快照 ID','CLP 数据','CLP 规则','SDS 模板','后续法规或模板升级'].every(x=>html.includes(x)),
        noExtra:!['历史版本中心','回滚按钮','电子签名','多级审批'].some(x=>html.includes(x)),
        steps:WZ_STEPS.length};
    }''')
    check(ui['count'] == 1 and ui['published'] and ui['card'], '原第 6 步批准按钮创建并展示快照')
    check(ui['labels'] and ui['steps'] == 6, '信息卡展示版本证据且仍为六步')
    check(ui['noExtra'], '没有新增历史中心、回滚或额外审批')
    check(not errors, '页面 JavaScript 错误为 0：' + str(errors[:2]))
    browser.close()

print('=== SDS 发布快照：通过 %d / 失败 %d ===' % (passed, failed))
if failed:
    raise SystemExit(1)
