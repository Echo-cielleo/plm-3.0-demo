/* ==================================================================
   [24z4] 实验分析与总结 · AI 分析能力
   ------------------------------------------------------------------
   背景：设计环节的「问问 AI」已移除，AI 能力重建在**分析环节**——
   「AI 帮分析比帮设计有用」。

   2026-09-11 口径调整（院长/领导评审）：
     ① 入口从「实验分析与总结」**列表页**迁到**报告详情页**（exp:sum-detail）。
        分析范围 = **当前总结报告已选择的实验**，无需再手工勾选；
        左栏由「可勾选列表」改为「只读范围清单」。
     ② 智能分析报表新增**图表**（复用 20-js-core 的 chart() + 内联 ECharts）：
        · 图一 投料对比：配比构成堆叠柱（各组 × 原料用量）
        · 图二 工艺步骤：温度 — 累计时间阶梯折线（逐步工序）
        · 图三 结果对比：达标率归一化分组柱（统一到 % 便于跨指标同图比较）
        表格仍保留（图看趋势、表看精确值）。

   两个能力：
     A. 问问 AI（分析版）：报告内实验 + 自然语言提问 → 生成回答
        · 预置 2 条演示问答（问题与回答均按当前报告实验动态生成，编号真实）
        · 分析场景无表单可填，回答区**不提供**「一键采纳」
     B. 智能分析报表：图 + 表 + 结论段，「保存到文档」写入 我的文档 →「分析报表」

   设计约束（零侵入）：
     - 渲染入口只改 24z2 详情页操作区按钮与 24z3 周报下拉各一处；
       其余逻辑全部收敛在本分片。
     - 持久化沿用 23z1 / 22z3 模式：独立 localStorage 键 + 挂进 wzReset 链。
     - 弹窗样式复用 03-css-mod.css 的 .ai-question / .ai-answer / .ai-avatar
       / .ai-source / .ai-disclaimer；图标复用 24z3 保留的 aiSparkIcon()。
   ================================================================== */

/* ================= 数据：已保存的分析报表 ================= */
var ANALYSIS_REPORTS=[];          /* [{docId,name,sumId,expIds,createdAt}] */
var _AI_KEY='plm3_aireport_v1';   /* localStorage 键（含 schema 语义） */
var _AI_DOC_FOLDER='F-M4';        /* 我的文档 → 分析报表 */

/* 当前分析上下文（由详情页按钮注入） */
var _aiSum=null;                  /* 当前总结报告对象 */
var _aiIds=[];                    /* 分析范围 = 报告引用的实验编号 */
var _aiLastAnswer='';
var _aiReportDraft=null;          /* 当前生成的报表（待保存 / 丢弃） */
var _AI_CHARTS=['aiChartMat','aiChartStep','aiChartRes'];   /* 需 dispose 的图表容器 */

function _aiToday(){
  var d=demoNow();
  return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);
}

/* ---------- 持久化：仅存「用户新增」的报表，出厂 mock 不入库 ---------- */
function _aiPersistSave(){
  try{ localStorage.setItem(_AI_KEY,JSON.stringify(ANALYSIS_REPORTS)); }catch(e){}
}
/* 一键重置钩子：清缓存 + 从 DOCS 移除本功能写入的文档（由 wzReset 调用） */
function _aiReset(){
  try{ localStorage.removeItem(_AI_KEY); }catch(e){}
  ANALYSIS_REPORTS.length=0;
  if(typeof DOCS!=='undefined'){
    for(var i=DOCS.length-1;i>=0;i--){ if(DOCS[i]&&DOCS[i]._aiDoc)DOCS.splice(i,1); }
  }
  _aiSum=null; _aiIds=[]; _aiReportDraft=null; _aiLastAnswer='';
}
/* 启动恢复：把缓存中的报表重新挂回 DOCS / ANALYSIS_REPORTS。
   注意 DOCS 定义在 27-js-pages-b.js（本分片之后加载），
   因此恢复必须延后到 DOMContentLoaded，否则 DOCS 尚未定义。 */
function _aiRestoreToDocs(r){
  if(typeof DOCS==='undefined')return;
  if(DOCS.some(function(d){return d.id===r.docId;}))return;
  /* 注意：不能打 _extra 标记——seedDocFolders() 会清除所有 _extra 记录，
     刷新恢复时本条会被连带清掉，导致「我的文档」查不到报表。 */
  DOCS.push({id:r.docId,name:r.name,type:'分析报表',ver:'V1.0',owner:'王研究员',
    upd:(r.createdAt||'').split(' ')[0]||_aiToday(),status:'已发布',
    mfolder:_AI_DOC_FOLDER,_aiDoc:true});
}
/* 确保「我的文档 → 分析报表」文件夹存在（seedDocFolders 会重建，故做包装） */
function _aiEnsureFolder(){
  if(typeof DOC_FOLDERS==='undefined')return;
  if(DOC_FOLDERS.some(function(f){return f.id===_AI_DOC_FOLDER;}))return;
  DOC_FOLDERS.push({id:_AI_DOC_FOLDER,name:'分析报表',parent:'',scope:'mine',
    note:'AI 智能分析报表归档'});
}
document.addEventListener('DOMContentLoaded',function(){
  try{
    var a=JSON.parse(localStorage.getItem(_AI_KEY)||'[]');
    a.forEach(function(r){ _aiRestoreToDocs(r); ANALYSIS_REPORTS.push(r); });
  }catch(e){}
  if(typeof seedDocFolders==='function'){
    var _s=seedDocFolders;
    seedDocFolders=function(){ _s(); _aiEnsureFolder(); };
  }
  _aiEnsureFolder();
});

/* ================= 报告上下文 ================= */
function aiSumById(id){
  return (typeof expSummaries!=='undefined'?expSummaries:[]).filter(function(s){return s.id===id;})[0]||null;
}
/* 报告引用的实验编号：expIds 与 items 双取并集（历史数据可能只有其一） */
function aiSumExpIds(sum){
  var ids=((sum&&sum.expIds)||[]).slice();
  ((sum&&sum.items)||[]).forEach(function(it){ if(it.expId&&ids.indexOf(it.expId)<0)ids.push(it.expId); });
  return ids;
}
function aiExpName(id){
  var e=(typeof findExp==='function')?findExp(id):null;
  return e&&e.name?e.name:id;
}
function aiExpOperator(id,it){
  var e=(typeof findExp==='function')?findExp(id):null;
  return (it&&it.basic&&it.basic.operator)||(e&&e.owner)||'—';
}
function aiExpDate(id){
  var e=(typeof findExp==='function')?findExp(id):null;
  if(!e)return '—';
  return ((e.analyzedAt||e.createTime||'')+'').split(' ')[0]||'—';
}

/* ---------- 数值解析小工具 ---------- */
function aiNum(v){
  if(v==null)return null;
  var n=parseFloat(String(v).replace(/[^\d.\-]/g,''));
  return isNaN(n)?null:n;
}
function aiParseStd(std){ return aiNum(std); }          /* '≥ 500 次' → 500 ; '平整无缩孔' → null */
function aiUnitOf(std){                                  /* '≥ 500 次' → '次' */
  if(std==null)return '';
  var t=String(std).replace(/[≥≤><≥≤]/g,'').replace(/[\d.\s]/g,'');
  return t||'';
}
function aiParseMin(t){                                  /* '30 min' / '3 h' → 分钟 */
  if(!t)return null;
  var m=String(t).match(/([\d.]+)\s*(h|hr|小时|min|分钟)/i);
  if(!m)return null;
  var v=parseFloat(m[1]); if(isNaN(v))return null;
  return Math.round(/^(h|hr|小时)/i.test(m[2])?v*60:v);
}
function aiParseTemp(t){
  if(t==null)return null;
  var m=String(t).match(/(-?[\d.]+)\s*(℃|°C|度)?/);
  return m?parseFloat(m[1]):null;
}
function aiHash(s){ var h=0; for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0; return Math.abs(h); }

/* 取某组实验的投料 / 过程 / 成品明细：优先取当前报告的 item，缺失时回退 */
function aiCtxData(sum,id){
  var it=null;
  ((sum&&sum.items)||[]).forEach(function(x){ if(x.expId===id)it=x; });
  if(it)return {expId:id,name:aiExpName(id),
    materials:it.materials||[],processTests:it.processTests||[],productTests:it.productTests||[],
    summary:it.summary||'',diff:it.diff||'',craftParams:it.craftParams||'',basic:it.basic||{}};
  var d=aiExpData(id);
  d.name=aiExpName(id); d.craftParams='';
  return d;
}
/* 没有报告明细时用示意数据兜底（保证任意实验都能出图/出表） */
function aiExpData(id){
  var hit=null;
  (typeof expSummaries!=='undefined'?expSummaries:[]).forEach(function(s){
    (s.items||[]).forEach(function(it){ if(it.expId===id)hit=it; });
  });
  if(hit)return {expId:id,materials:hit.materials||[],productTests:hit.productTests||[],
                 processTests:hit.processTests||[],summary:hit.summary||'',diff:hit.diff||'',basic:hit.basic||{}};
  return aiMockExpData(id);
}
function aiMockExpData(id){
  var e=(typeof findExp==='function')?findExp(id):null;
  var nm=e?e.name:'该组实验';
  return {
    expId:id,
    materials:[
      {name:'主体树脂（'+nm.slice(0,6)+'）',batch:'—',qty:'45.0',unit:'kg',order:1},
      {name:'去离子水',batch:'W-260901',qty:'38.0',unit:'kg',order:2},
      {name:'成膜助剂',batch:'BCS-2607',qty:'8.5',unit:'kg',order:3},
      {name:'有机硅手感剂 HF-5',batch:'HF5-2605',qty:'1.2',unit:'kg',order:4}
    ],
    processTests:[{time:'0.5 h',item:'粘度',value:'820',unit:'mPa·s'},
                  {time:'2.0 h',item:'细度',value:'12',unit:'μm'},
                  {time:'4.0 h',item:'pH',value:'7.8',unit:'—'}],
    productTests:[{item:'手感评分',std:'≥ 4.0',value:'4.2',result:'合格'},
                  {item:'耐干擦',std:'≥ 500 次',value:'580',result:'合格'},
                  {item:'成膜外观',std:'平整无缩孔',value:'平整',result:'合格'}],
    summary:nm+'：各项指标满足标准要求，可作为对比基准参与综合评价。',
    diff:'—',basic:{operator:e?(e.owner||'—'):'—',date:aiExpDate(id)}
  };
}

/* ================= 左栏：分析范围（只读，来自当前报告） ================= */
function aiScopePanelHtml(sum){
  var ids=aiSumExpIds(sum);
  if(!ids.length)return '<div class="muted" style="padding:12px">该总结报告尚未选择实验，请先编辑报告添加实验。</div>';
  return '<div class="ai-pick">'+
    '<div class="ai-pick-hd"><b>分析范围</b><span class="muted">报告已选 <b>'+ids.length+'</b> 组</span></div>'+
    '<div class="ai-pick-list">'+
      ids.map(function(id,i){
        var it=null;
        ((sum&&sum.items)||[]).forEach(function(x){ if(x.expId===id)it=x; });
        return '<div class="ai-pick-item on ai-ro">'+
          '<div class="l1"><span class="no">#'+(i+1)+'</span><span class="mono">'+esc(id)+'</span></div>'+
          '<div class="l2">'+esc(aiExpName(id))+' · '+esc(aiExpOperator(id,it))+' · '+esc(aiExpDate(id))+'</div>'+
        '</div>';
      }).join('')+
    '</div>'+
    '<div class="ai-pick-ft"><span class="muted" style="font-size:11.5px">范围取自报告 '+esc(sum.id)+'，如需调整请先编辑报告</span></div>'+
  '</div>';
}

/* ================= A. 问问 AI（分析版） ================= */
/* 预置问答：问题与回答都按当前报告的实验动态生成，保证编号真实、结论对得上 */
function aiPresetQA(sum){
  var ids=aiSumExpIds(sum);
  if(!ids.length)return [];
  var list=ids.map(function(id){return aiCtxData(sum,id);});
  var q1,q2,a1,a2;
  if(list.length>=2){
    var A=list[0],B=list[1];
    q1='{A} 与 {B} 相比，关键指标差异在哪里？';
    a1=aiDiffAnswer(A,B);
  }else{
    q1='{A} 这组实验的关键指标与标准相比处于什么水平？';
    a1=aiSingleAnswer(list[0]);
  }
  q2='这几组实验里，哪一组最适合作为主推方案进入中试？';
  a2=aiBestAnswer(list);
  var fill=function(t){ return t.replace('{A}',ids[0]).replace('{B}',ids[1]||'—'); };
  return [{q:fill(q1),a:a1},{q:q2,a:a2}];
}
/* 两组逐项比对 */
function aiDiffAnswer(A,B){
  var items=[],map={};
  [A,B].forEach(function(d){
    (d.productTests||[]).forEach(function(t){
      if(items.indexOf(t.item)<0)items.push(t.item);
      map[d.expId+'|'+t.item]=t;
    });
  });
  if(!items.length)return '两组实验的成品检测数据尚未录入完整，建议先补齐检测结果再做逐项比对。';
  var seg=items.map(function(n){
    var a=map[A.expId+'|'+n],b=map[B.expId+'|'+n];
    var av=a?a.value:'—',bv=b?b.value:'—';
    var note='';
    var an=aiNum(av),bn=aiNum(bv);
    if(an!=null&&bn!=null&&bn!==0){
      var pct=Math.round((an-bn)/bn*1000)/10;
      note=pct>0?('，高于基准 '+pct+'%'):(pct<0?('，低于基准 '+Math.abs(pct)+'%'):'，与基准持平');
    }
    var res=a&&a.result?('（'+a.result+'）'):'';
    return '<b>'+esc(n)+'</b>：'+esc(A.expId)+' '+esc(av)+' / '+esc(B.expId)+' '+esc(bv)+note+res;
  });
  return '逐项比对如下（前者为 '+esc(A.expId)+'，后者为 '+esc(B.expId)+'）：'+seg.join('；')+'。'+
    '两组采用同一工艺路线，差异集中在受控变量（'+
    esc((A.diff||'—')+' vs '+(B.diff||'—'))+'），因此上述差值可归因于该变量的影响。'+
    '建议以达标率更接近或超出标准线的一组作为主推方向，另一组保留作为风险备选。';
}
function aiSingleAnswer(A){
  var rows=(A.productTests||[]).map(function(t){
    var v=aiNum(t.value),std=aiParseStd(t.std);
    var r=(v!=null&&std)?Math.round(v/std*1000)/10:null;
    return '<b>'+esc(t.item)+'</b>：实测 '+esc(t.value)+(t.std?(' / 标准 '+esc(t.std)):'')+
      (r!=null?(' → 达标率 '+r+'%'):'')+(t.result?('（'+esc(t.result)+'）'):'');
  });
  if(!rows.length)return '该组实验的成品检测数据尚未录入，建议先补齐检测结果。';
  return rows.join('；')+'。综合看，该组指标处于标准线以内，可继续累计批次数据以确认稳定性。';
}
/* 最优组判断：按达标率均值排序 */
function aiBestScore(d){
  var s=0,n=0;
  (d.productTests||[]).forEach(function(t){
    var v=aiNum(t.value),std=aiParseStd(t.std);
    if(v==null||!std)return;
    s+=v/std; n++;
  });
  return n?s/n:0;
}
function aiBestAnswer(list){
  var rank=list.map(function(d){return {id:d.expId,s:aiBestScore(d)};})
               .filter(function(x){return x.s>0;})
               .sort(function(a,b){return b.s-a.s;});
  if(!rank.length)return '当前所选实验的成品检测数据不足，无法给出排序建议，建议先补齐数值型检测项。';
  var best=rank[0];
  var rlist=rank.map(function(x){return esc(x.id)+' '+Math.round(x.s*1000)/10+'%';}).join('、');
  var worst=rank[rank.length-1];
  return '按各项指标相对标准的达标率排序：'+rlist+'（100% = 达到标准线）。'+
    '综合判断：<b>'+esc(best.id)+'</b> 达标率最高（'+Math.round(best.s*1000)/10+'%），建议作为主推方案进入中试；'+
    (rank.length>1?('其中 '+esc(worst.id)+' 相对标准余量最小，可作为风险备选继续跟踪批次稳定性。'):'')+
    '需要注意的是，达标率只反映与标准线的相对关系，绝对值差异仍需结合工艺窗口判断。';
}

function openSumAI(sumId){
  var sum=aiSumById(sumId);
  if(!sum){ toast('未找到总结报告 '+sumId,'warn'); return; }
  _aiSum=sum;
  _aiIds=aiSumExpIds(sum);
  if(!_aiIds.length){ toast('该报告尚未选择实验，请先编辑报告添加实验','warn'); return; }
  var presets=aiPresetQA(sum);
  var body='<div class="ai-two">'+
      aiScopePanelHtml(sum)+
      '<div class="ai-main">'+
        '<div id="aiScopeTip" class="ai-scope">'+aiScopeTipHtml(sum)+'</div>'+
        (presets.length?'<div class="ai-question"><span>预置演示问题（点击直接分析）</span>'+
          presets.map(function(p,i){
            return '<div class="ai-preset" onclick="aiAskPreset('+i+')">'+esc(p.q)+'</div>';
          }).join('')+'</div>':'')+
        '<div class="flex" style="gap:8px">'+
          '<input class="input" id="aiQuestion" placeholder="输入你的问题，例如：这几组实验的综合表现如何排序？">'+
          '<button class="btn btn-primary" onclick="aiAsk()">'+aiSparkIcon()+' 提问</button>'+
        '</div>'+
        '<div id="aiAnswerBox" class="ai-answer-box"></div>'+
      '</div>'+
    '</div>';
  _aiPresetQA=presets;
  openModal({title:'问问 AI · 实验分析（'+sum.id+'）',width:1040,body:body,
    footer:'<div class="muted" style="font-size:12px">分析结论来自所选实验的投料、过程与成品数据，仅供参考</div>'+
           '<div class="spacer"></div><button class="btn" onclick="aiCloseModal()">关闭</button>'});
}
var _aiPresetQA=[];
function aiScopeTipHtml(sum){
  if(!_aiIds.length)return '<span class="muted">该报告尚未选择实验</span>';
  return '分析范围：<b>'+_aiIds.length+'</b> 组 · '+_aiIds.map(esc).join('、')+
    ' <span class="muted">（来自报告 '+esc(sum?sum.id:'')+'）</span>';
}
function aiAskPreset(i){
  var p=_aiPresetQA[i]; if(!p)return;
  var q=$('aiQuestion'); if(q)q.value=p.q;
  aiRenderAnswer(p.q,p.a);
}
function aiAsk(){
  var q=($('aiQuestion')&&$('aiQuestion').value||'').trim();
  if(!q){toast('请输入问题','warn');return;}
  if(!_aiIds.length){toast('请先选择总结报告','warn');return;}
  /* 用户自由提问：给出基于当前范围的结构化回答（原型演示，不做真实推理） */
  var a='针对本报告引用的 <b>'+_aiIds.length+'</b> 组实验（'+_aiIds.map(esc).join('、')+'），系统给出以下分析：'+
    '<b>① 投料维度</b>：各组主体树脂与溶剂配比基本一致，差异集中在受控变量，具备横向可比性；'+
    '<b>② 步骤维度</b>：同一工艺路线下各工序温度与停留时间差异见报表「工艺步骤」图；'+
    '<b>③ 结果维度</b>：'+aiBestAnswer(_aiIds.map(function(id){return aiCtxData(_aiSum,id);}))+
    '如需更聚焦的结论，可改用上方预置问题，或补充具体指标名称。';
  aiRenderAnswer(q,a,true);
}
function aiRenderAnswer(q,a,isFree){
  _aiLastAnswer=a;
  var box=$('aiAnswerBox'); if(!box)return;
  box.innerHTML='<div class="ai-question" style="margin-top:14px"><span>问题</span><b>'+esc(q)+'</b></div>'+
    '<div class="ai-answer"><div class="ai-avatar">AI</div><div><p>'+a+'</p>'+
      '<p class="ai-source">数据来源：'+_aiIds.map(esc).join('、')+
      (_aiSum?' · 总结报告 '+esc(_aiSum.id):'')+'</p></div></div>'+
    '<div class="ai-disclaimer">建议来自所选实验的历史数据，仅供参考；分析场景不支持一键采纳。</div>';
}
/* 关闭弹窗：顺手释放图表实例，避免残留 */
function aiCloseModal(){
  if(typeof _charts!=='undefined'){
    _AI_CHARTS.forEach(function(k){
      try{ if(_charts[k]){ _charts[k].dispose(); delete _charts[k]; } }catch(e){}
    });
  }
  closeModal();
}

/* ================= B. 智能分析报表（图表 + 表格 + 结论） ================= */
/* ---------- 工艺步骤数据 ---------- */
function aiExpProcesses(id){
  if(typeof experiments==='undefined')return null;
  var e=experiments.filter(function(x){return x.id===id;})[0];
  if(!e)return null;
  var d=(typeof ensureNormalDetail==='function')?ensureNormalDetail(e):e.normalDetail;
  return (d&&d.processes&&d.processes.length)?d.processes:null;
}
function aiStepsOf(ps){
  return (ps||[]).map(function(p){
    var c=(p.conditions||[])[0]||{};
    return {name:p.name,time:c.time||'—',min:aiParseMin(c.time),
            temp:aiParseTemp(c.temperature),obs:c.observation||''};
  });
}
var AI_DEF_STEPS=[
  {name:'预混与升温',time:'30 min',min:30,temp:80,obs:'物料混合均匀'},
  {name:'反应阶段',time:'3 h',min:180,temp:170,obs:'体系稳定、黏度上升'},
  {name:'降温与出料',time:'45 min',min:45,temp:85,obs:'出料正常'}
];
/* 工序骨架：优先取报告内第一组有真实工序记录的实验；
   无真实工序的组（如 DOE 运行记录不含工序）沿同一骨架推演温度，并标记 approx */
function aiStepsFor(sum,ids){
  var sk=null;
  for(var i=0;i<ids.length&&!sk;i++){
    var ps=aiExpProcesses(ids[i]);
    if(ps&&ps.length)sk=aiStepsOf(ps);
  }
  sk=sk||AI_DEF_STEPS;
  return ids.map(function(id){
    var ps=aiExpProcesses(id);
    var real=!!(ps&&ps.length);
    var base=real?aiStepsOf(ps):null;
    var steps=sk.map(function(ref,i){
      var s=(base&&base[i])?base[i]:ref;
      var t=(s.temp==null)?ref.temp:s.temp;
      if(!real&&t!=null)t=Math.round((t+(aiHash(id+':'+i)%13-6))*10)/10;   /* 确定性微差，便于对比 */
      return {name:s.name||ref.name,time:s.time||ref.time,
              min:(s.min==null?ref.min:s.min),temp:t,obs:s.obs||ref.obs||''};
    });
    return {expId:id,steps:steps,approx:!real};
  });
}

/* ---------- 图表 option ---------- */
function aiChartMatOption(list){
  var names=[],map={},units={};
  list.forEach(function(d){
    (d.materials||[]).forEach(function(m){
      if(names.indexOf(m.name)<0)names.push(m.name);
      var k=d.expId+'|'+m.name;
      map[k]=(map[k]||0)+(aiNum(m.qty)||0);
      units[m.name]=m.unit||units[m.name]||'';
    });
  });
  var cats=list.map(function(d){return d.expId;});
  return {
    tooltip:{trigger:'axis',axisPointer:{type:'shadow'},
      formatter:function(ps){
        var out='<b>'+esc(ps[0].axisValue)+'</b>';
        var tot=0;
        ps.forEach(function(p){ tot+=p.value||0; });
        ps.forEach(function(p){
          if(!p.value)return;
          out+='<br/>'+p.marker+esc(p.seriesName)+'：'+p.value+
               ' '+(units[p.seriesName]||'')+'（'+Math.round(p.value/tot*1000)/10+'%）';
        });
        return out+'<br/>合计：'+Math.round(tot*10)/10;
      }},
    legend:{type:'scroll',bottom:0,itemWidth:12,itemHeight:8,textStyle:{fontSize:11}},
    grid:{left:56,right:16,top:14,bottom:52},
    xAxis:{type:'category',data:cats,axisLabel:{fontSize:11,interval:0}},
    yAxis:{type:'value',name:'用量',nameTextStyle:{fontSize:11},axisLabel:{fontSize:11}},
    series:names.map(function(n){
      return {name:n,type:'bar',stack:'tot',barMaxWidth:56,
        emphasis:{focus:'series'},
        data:list.map(function(d){
          var m=(d.materials||[]).filter(function(x){return x.name===n;})[0];
          return m?(aiNum(m.qty)||0):0;
        })};
    })
  };
}
function aiChartStepOption(sum,ids){
  var all=aiStepsFor(sum,ids);
  return {
    tooltip:{trigger:'axis',
      formatter:function(ps){
        var out='累计时间 '+ps[0].axisValue+' min';
        ps.forEach(function(p){
          var nm=(p.data&&p.data.name)?(' · '+p.data.name):'';
          out+='<br/>'+p.marker+esc(p.seriesName)+'：'+p.value[1]+' ℃'+esc(nm);
        });
        return out;
      }},
    legend:{type:'scroll',bottom:2,itemWidth:12,itemHeight:8,textStyle:{fontSize:11}},
    grid:{left:56,right:24,top:14,bottom:62},
    xAxis:{type:'value',name:'累计时间 (min)',nameLocation:'middle',nameGap:28,
      nameTextStyle:{fontSize:11},axisLabel:{fontSize:11},min:0},
    yAxis:{type:'value',name:'温度 (℃)',nameTextStyle:{fontSize:11},axisLabel:{fontSize:11},
      scale:true},
    series:all.map(function(g){
      var cum=0,t0=(g.steps.length&&g.steps[0].temp!=null)?g.steps[0].temp:30;
      var pts=[[0,t0]];
      g.steps.forEach(function(s){
        cum+=(s.min||0);
        pts.push({value:[cum,s.temp==null?t0:s.temp],name:s.name+'（'+s.time+'）'});
      });
      return {name:g.expId,type:'line',step:'end',symbol:'circle',symbolSize:6,
        lineStyle:{width:2},data:pts};
    })
  };
}
/* 结果对比：统一换算为「达标率 %」，使不同量纲的指标可同图比较 */
function aiResItems(list){
  var items=[];
  list.forEach(function(d){
    (d.productTests||[]).forEach(function(t){
      var v=aiNum(t.value),std=aiParseStd(t.std);
      if(v==null||!std||items.indexOf(t.item)>=0)return;
      items.push(t.item);
    });
  });
  return items;
}
function aiChartResOption(list){
  var items=aiResItems(list);
  if(!items.length)return null;
  var series=list.map(function(d){
    return {name:d.expId,type:'bar',barMaxWidth:46,
      data:items.map(function(n){
        var t=(d.productTests||[]).filter(function(x){return x.item===n;})[0];
        var v=t?aiNum(t.value):null, std=t?aiParseStd(t.std):null;
        return {value:(v==null||!std)?null:Math.round(v/std*1000)/10,raw:v,std:std,item:n};
      })};
  });
  series[0].markLine={silent:true,symbol:'none',tooltip:{show:false},
    lineStyle:{type:'dashed',color:'#8c8c8c',width:1},
    label:{formatter:'标准线 100%',position:'insideEndTop',fontSize:11,color:'#8c8c8c'},
    data:[{yAxis:100}]};
  return {
    tooltip:{trigger:'axis',axisPointer:{type:'shadow'},
      formatter:function(ps){
        var out='<b>'+esc(ps[0].axisValue)+'</b>';
        ps.forEach(function(p){
          var d=p.data||{};
          out+='<br/>'+p.marker+esc(p.seriesName)+'：'+(d.raw==null?'—':d.raw)+
               ' / 标准 '+(d.std==null?'—':d.std)+' → 达标率 '+p.value+'%';
        });
        return out;
      }},
    legend:{type:'scroll',bottom:0,itemWidth:12,itemHeight:8,textStyle:{fontSize:11}},
    grid:{left:56,right:24,top:14,bottom:52},
    xAxis:{type:'category',data:items,axisLabel:{fontSize:11,interval:0}},
    yAxis:{type:'value',name:'达标率 %',nameTextStyle:{fontSize:11},axisLabel:{fontSize:11,
      formatter:'{value}%'}},
    series:series
  };
}

/* 步骤一致性自动结论：同工艺路线下各工序温度极差与停留时间是否一致 */
function aiStepNote(steps){
  if(!steps||!steps.length)return '';
  var n=steps[0].steps.length, temps=[], same=true;
  for(var i=0;i<n;i++){
    var vals=[],mins=[];
    steps.forEach(function(g){
      var s=g.steps[i]||{};
      if(s.temp!=null)vals.push(s.temp);
      mins.push(s.min==null?-1:s.min);
    });
    if(Math.max.apply(null,mins)!==Math.min.apply(null,mins))same=false;
    if(vals.length>1){
      var mx=Math.max.apply(null,vals),mn=Math.min.apply(null,vals);
      temps.push(steps[0].steps[i].name+' 极差 '+(Math.round((mx-mn)*10)/10)+' ℃');
    }
  }
  var head='结论：'+steps.length+' 组实验工艺步骤结构一致'+(same?'（各工序停留时间完全相同）':'（个别工序停留时间存在差异）');
  return head+(temps.length?('，温度差异为 '+temps.join('、')+'。'):'。');
}

/* ---------- 报表 HTML ---------- */
function aiReportHtml(sum,ids){
  var list=ids.map(function(id){return aiCtxData(sum,id);});
  /* 表一：投料对比（行=原料，列=组） */
  var matNames=[],matMap={},matUnit={};
  list.forEach(function(d){
    (d.materials||[]).forEach(function(m){
      if(matNames.indexOf(m.name)<0)matNames.push(m.name);
      matMap[d.expId+'|'+m.name]=m;
      matUnit[m.name]=m.unit||matUnit[m.name]||'';
    });
  });
  var matRows=matNames.map(function(n){
    return '<tr><td>'+esc(n)+'</td>'+list.map(function(d){
      var m=matMap[d.expId+'|'+n];
      return '<td class="num">'+(m?esc(m.qty)+' <span class="muted">'+esc(m.unit||'')+'</span>':'<span class="muted">—</span>')+'</td>';
    }).join('')+'</tr>';
  }).join('');
  /* 表二：工艺步骤（行=工序，列=组） */
  var steps=aiStepsFor(sum,ids);
  var stepRows=(steps[0]?steps[0].steps:[]).map(function(ref,i){
    return '<tr><td>#'+(i+1)+' '+esc(ref.name)+'</td>'+steps.map(function(g){
      var s=g.steps[i]||{};
      return '<td>'+(s.temp==null?'—':esc(s.temp)+' ℃')+
             ' <span class="muted">/ '+esc(s.time||'—')+'</span></td>';
    }).join('')+'</tr>';
  }).join('');
  /* 表三：结果明细（行=检测项，列=组） */
  var itNames=[],itMap={};
  list.forEach(function(d){
    (d.productTests||[]).forEach(function(t){
      if(itNames.indexOf(t.item)<0)itNames.push(t.item);
      itMap[d.expId+'|'+t.item]=t;
    });
  });
  var resRows=itNames.map(function(n){
    return '<tr><td>'+esc(n)+'</td>'+list.map(function(d){
      var t=itMap[d.expId+'|'+n];
      if(!t)return '<td class="num"><span class="muted">—</span></td>';
      var cls=t.result==='合格'?'tag-green':(t.result==='不合格'?'tag-red':'tag-grey');
      return '<td class="num">'+esc(t.value)+' <span class="tag '+cls+'">'+esc(t.result)+'</span></td>';
    }).join('')+'</tr>';
  }).join('');
  var head=list.map(function(d){
    return '<th>'+esc(d.expId)+'<div class="muted" style="font-weight:400">'+esc(d.basic.operator||'—')+'</div></th>';
  }).join('');
  var anyApprox=steps.some(function(g){return g.approx;});
  var hasRes=!!aiResItems(list).length;

  return '<div class="rpt-wrap">'+
    '<div class="rpt-hd"><div><b>智能分析报表</b>'+
      '<span class="muted">生成时间 '+esc(nowStr())+' · 报告 '+esc(sum.id)+' · 引用 '+list.length+' 组实验</span></div>'+
      '<span class="tag tag-blue">AI 生成</span></div>'+
    '<h4 class="rpt-t">一、投料对比（配比构成）</h4>'+
    '<div class="rpt-chart" id="aiChartMat" style="height:250px"></div>'+
    '<div class="tbl-wrap"><table class="tbl tbl-sm">'+
      '<thead><tr><th style="width:200px">原料</th>'+head+'</tr></thead>'+
      '<tbody>'+(matRows||'<tr><td colspan="9" class="muted center">— 无数据 —</td></tr>')+'</tbody></table></div>'+
    '<h4 class="rpt-t">二、工艺步骤（温度 — 累计时间）</h4>'+
    '<div class="rpt-chart" id="aiChartStep" style="height:250px"></div>'+
    '<div class="tbl-wrap"><table class="tbl tbl-sm">'+
      '<thead><tr><th style="width:200px">工序（温度 / 停留时间）</th>'+head+'</tr></thead>'+
      '<tbody>'+(stepRows||'<tr><td colspan="9" class="muted center">— 无数据 —</td></tr>')+'</tbody></table></div>'+
    '<div class="rpt-note">'+aiStepNote(steps)+
      (anyApprox?'<br/>说明：标记为推演的组（DOE 运行记录不含独立工序）按本报告工艺路线补齐步骤参数，仅用于对比展示。':'')+
    '</div>'+
    '<h4 class="rpt-t">三、结果数据对比（达标率 / 关键指标）</h4>'+
    (hasRes?'<div class="rpt-chart" id="aiChartRes" style="height:250px"></div>':'')+
    '<div class="tbl-wrap"><table class="tbl tbl-sm">'+
      '<thead><tr><th style="width:200px">检测项</th>'+head+'</tr></thead>'+
      '<tbody>'+(resRows||'<tr><td colspan="9" class="muted center">— 无数据 —</td></tr>')+'</tbody></table></div>'+
    '<h4 class="rpt-t">四、综合结论</h4>'+
    '<div class="notice notice-info"><i class="ni">i</i><div>'+aiConclusion(list)+'</div></div>'+
  '</div>';
}
function aiConclusion(list){
  if(!list.length)return '—';
  var ids=list.map(function(d){return esc(d.expId);});
  var best=null;
  list.forEach(function(d){
    var s=aiBestScore(d);
    if(s>0&&(!best||s>best.s))best={id:d.expId,s:s};
  });
  var matDiff=list.length>1;
  return '本次共分析 <b>'+list.length+'</b> 组实验（'+ids.join('、')+'），均采用同一工艺路线，具备横向可比性。'+
    '投料方面，各组主体树脂与溶剂配比保持一致，差异集中在受控变量'+
    (matDiff?'，配比构成见图一':'')+'；'+
    '工艺步骤方面，各工序温度与停留时间见图二；'+
    '结果方面，各项判定指标均满足标准要求'+
    (best?('，其中 <b>'+esc(best.id)+'</b> 相对标准线的达标率最高（'+Math.round(best.s*1000)/10+'%）'):'')+'。'+
    '综合判断：推荐该组作为主推方案进入中试，其余组作为风险备选继续跟踪批次稳定性。';
}
function openSumReport(sumId){
  var sum=aiSumById(sumId);
  if(!sum){ toast('未找到总结报告 '+sumId,'warn'); return; }
  _aiSum=sum;
  _aiIds=aiSumExpIds(sum);
  if(_aiIds.length<2){ toast('对比分析需报告中至少有 2 组实验','warn'); return; }
  if(_aiIds.length>8){ toast('对比分析一次最多支持 8 组实验','warn'); return; }
  _aiReportDraft=null;
  var body='<div class="ai-two">'+
      aiScopePanelHtml(sum)+
      '<div class="ai-main">'+
        '<div id="aiScopeTip" class="ai-scope">'+aiScopeTipHtml(sum)+'</div>'+
        '<div id="aiReportBox"><div class="muted" style="padding:14px 0">点击下方「生成报表」，将按本报告引用的实验输出投料、工艺步骤与结果对比图表。</div></div>'+
      '</div>'+
    '</div>';
  openModal({title:'智能分析报表（'+sum.id+'）',width:1040,body:body,
    footer:'<div class="muted" style="font-size:12px">报表按本报告引用的实验数据自动汇总生成</div>'+
           '<div class="spacer"></div>'+
           '<button class="btn" onclick="aiGenReport()">'+aiSparkIcon()+' 生成报表</button>'+
           '<button class="btn" onclick="aiCloseModal()">丢弃</button>'+
           '<button class="btn btn-primary" onclick="aiSaveReport()">保存到文档</button>'});
}
function aiGenReport(){
  if(!_aiSum){toast('未选择总结报告','warn');return;}
  if(_aiIds.length<2){toast('对比分析需报告中至少有 2 组实验','warn');return;}
  if(_aiIds.length>8){toast('对比分析一次最多支持 8 组实验','warn');return;}
  _aiReportDraft={sumId:_aiSum.id,expIds:_aiIds.slice(),createdAt:nowStr()};
  var box=$('aiReportBox'); if(!box)return;
  box.innerHTML=aiReportHtml(_aiSum,_aiIds);
  /* 图表需在 DOM 落地后再初始化 */
  setTimeout(function(){ aiRenderCharts(); },30);
  toast('已生成分析报表','ok');
}
/* 当前分析范围的上下文数据列表（图表 / 表格 / 冒烟自检共用） */
function aiCtxList(){ return _aiIds.map(function(id){return aiCtxData(_aiSum,id);}); }
function aiRenderCharts(){
  var list=aiCtxList();
  if($('aiChartMat')) chart('aiChartMat',aiChartMatOption(list));
  if($('aiChartStep')) chart('aiChartStep',aiChartStepOption(_aiSum,_aiIds));
  if($('aiChartRes')){
    var op=aiChartResOption(list);
    if(op)chart('aiChartRes',op);
  }
}
function aiSaveReport(){
  if(!_aiReportDraft){toast('请先生成报表','warn');return;}
  var ids=_aiReportDraft.expIds;
  if(ids.length<2){toast('对比分析需报告中至少有 2 组实验','warn');return;}
  _aiEnsureFolder();
  /* 生成不重复的文档编号 */
  var docId='';
  do{ docId='DOC-2026-'+String(Math.floor(Math.random()*9000)+1000); }
  while(typeof DOCS!=='undefined'&&DOCS.some(function(d){return d.id===docId;}));
  var sumId=_aiReportDraft.sumId||'';
  var name='智能分析报表 · '+sumId+' · '+_aiToday();
  if(typeof DOCS!=='undefined'){
    DOCS.push({id:docId,name:name,type:'分析报表',ver:'V1.0',owner:'王研究员',
      upd:_aiToday(),status:'已发布',mfolder:_AI_DOC_FOLDER,_aiDoc:true});
  }
  var rec={docId:docId,name:name,sumId:sumId,expIds:ids,createdAt:nowStr()};
  ANALYSIS_REPORTS.push(rec);
  _aiPersistSave();
  _aiReportDraft=null;
  aiCloseModal();
  toast('已保存，可在我的文档查看','ok');
}

/* ================= C. 周报联动：引用分析报表 ================= */
function aiReportOptions(cur){
  if(!ANALYSIS_REPORTS.length)return '<option value="">引用分析报表（暂无已保存报表）</option>';
  return '<option value="">引用分析报表（可选）</option>'+
    ANALYSIS_REPORTS.map(function(r){
      return '<option value="'+esc(r.docId)+'"'+(cur===r.docId?' selected':'')+'>'+
             esc(r.name)+'</option>';
    }).join('');
}
function aiSetWeeklyRef(sel){
  if(typeof weeklyDraft!=='undefined')weeklyDraft.refReport=sel.value;
}
function aiWeeklyRefName(){
  if(typeof weeklyDraft==='undefined'||!weeklyDraft.refReport)return '';
  var r=ANALYSIS_REPORTS.filter(function(x){return x.docId===weeklyDraft.refReport;})[0];
  return r?r.name:'';
}
