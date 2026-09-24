/* [23z8c] SDS 发布快照：保留原始评估、最终人工决定和发布时的完整正文。 */
var SDS_RELEASE_SCHEMA='sds-release-v1';
var _sdsReleaseSerial=0;

function sdsReleaseFreezeStored(){
  if(!Array.isArray(wz.releaseSnapshots))wz.releaseSnapshots=[];
  if(typeof wz.activeReleaseId!=='string')wz.activeReleaseId='';
  wz.releaseSnapshots.forEach(complianceEvaluationFreeze);
}
function sdsReleaseList(){return (wz.releaseSnapshots||[]).slice();}
function sdsReleaseGet(id){return (wz.releaseSnapshots||[]).find(function(r){return r.id===id;})||null;}
function sdsActiveRelease(){return sdsReleaseGet(wz.activeReleaseId);}
function sdsReleaseBodyHtml(){
  var release=sdsActiveRelease();
  return release?release.document.bodyHtml:'';
}
function sdsReleaseReviewSnapshot(evaluation){
  var systemById={};
  evaluation.results.classification.items.forEach(function(item){systemById[item.id]=item;});
  var finalItems=complianceEvaluationCopy(wz.classItems),labels=labelParts();
  return {finalClassItems:finalItems,
    classificationDecisions:finalItems.map(function(final){
      var system=systemById[final.id];
      if(!system)throw new Error('分类项目 '+final.id+' 缺少原始系统建议，请重新评估。');
      return {id:final.id,name:final.name,systemResult:system.result,systemCode:system.code,
        systemStatus:system.status,finalResult:final.result,finalCode:final.code,
        finalStatus:final.status,decisionType:final.status==='confirmed'?'confirmed':
          final.status==='manual'?'manual':'automatic',
        changed:system.result!==final.result||system.code!==final.code||system.status!==final.status,
        reason:final.note||'',decidedAt:final.noteAt||evaluation.evaluatedAt};
    }),classAdjust:complianceEvaluationCopy(wz.classAdjust||{}),
    transportAssessment:complianceEvaluationCopy(wz.transportAssessment||transportAssessmentDefault()),
    euhSelections:complianceEvaluationCopy(euhList()),
    finalLabels:{hCodes:hCodesMix(),pCodes:labels.ps.slice(),pictograms:labels.pics.slice(),signalWord:labels.sig}};
}
function sdsReleaseCreate(reviewInfo){
  var version=(wz.docVer||'').trim();
  if(!version)throw new Error('请先填写 SDS 文档版本号。');
  if(sdsReleaseList().some(function(r){return r.documentVersion===version;}))
    throw new Error('版本 '+version+' 已发布，请修改文档版本号后再发布。');
  if(!wz.submitted)throw new Error('请先提交 SDS 草案审核。');
  var reviewer=(reviewInfo&&reviewInfo.name||'EHS 负责人').trim();
  if(!reviewer)throw new Error('当前审核人信息缺失，请核对审核流程。');
  var evaluation=complianceEvaluationEnsure();
  if(!evaluation||!evaluation.results||!evaluation.results.classification||
    !Array.isArray(evaluation.results.classification.items)||!evaluation.results.lists||
    !evaluation.versions)throw new Error('合规评估结果不完整，请重新评估后发布。');
  if(!Array.isArray(wz.classItems)||!wz.classItems.length)
    throw new Error('分类结论尚未生成，请先完成第 4 步。');
  if(wz.classItems.some(function(item){return item.status==='pending';}))
    throw new Error('仍有分类项目待人工判定或确认，请先完成第 4 步。');
  if(['NOT_ASSESSED','STALE'].indexOf(transportAssessmentStatus())>=0)
    throw new Error('第 14 章运输结论尚未确认，请先完成运输信息维护。');
  var body=sdsDraftBodyHtml('published');
  if(typeof body!=='string'||(body.match(/<section class="doc-sec-wrap">/g)||[]).length!==16)
    throw new Error('SDS 正文未完整生成，请检查 16 个章节后重试。');
  var publishedAt=nowStr(),id;
  do{id='REL-'+Date.now()+'-'+(++_sdsReleaseSerial);}while(sdsReleaseGet(id));
  var release=complianceEvaluationFreeze(complianceEvaluationCopy({
    schemaVersion:SDS_RELEASE_SCHEMA,id:id,status:'published',documentVersion:version,
    publishedAt:publishedAt,reviewer:{name:reviewer,reviewedAt:publishedAt},
    sourceEvaluationId:evaluation.id,evaluation:evaluation,
    review:sdsReleaseReviewSnapshot(evaluation),
    document:{productName:wz.project.product||'',market:wz.project.market||'',
      language:wz.project.lang||'',bodyHtml:body},
    meta:{createdFromDraftAt:wz.draftAt||'',inputFingerprint:evaluation.inputFingerprint,
      templateVersion:evaluation.versions.template,rulePackId:evaluation.versions.rules.clpRulePack}
  }));
  wz.releaseSnapshots.push(release);
  wz.activeReleaseId=id;
  wz.published=true;
  wz.publishedAt=publishedAt;
  return release;
}

/* wzLoad 在本分片装入前运行一次；恢复后的 JSON 对象在此重新冻结。 */
sdsReleaseFreezeStored();
