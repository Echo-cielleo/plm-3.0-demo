/* ==================================================================
   [24] DOE 实验模块
   列表 / 详情6Tab / 4步向导 / 结果录入 / 建模分析 / 最佳方案 / 配方记录
   ================================================================== */

/* ---------- 因子水平解析（数值/类别通用） ---------- */
function activeLevels(f){
  if(!f)return [];
  if(f.levels&&f.levels.length)return f.levels.slice();
  if(f.type==='numeric'){
    var lo=parseFloat(f.low),hi=parseFloat(f.high);
    if(isNaN(lo)||isNaN(hi))return [];
    return [lo,hi];
  }
  return [];
}

/* ---------- 计划表生成：笛卡尔积 + 中心点 + Fisher-Yates 随机化 ---------- */
function generatePlan(factors,centerPoints,randomize,seed){
  centerPoints=parseInt(centerPoints||0,10)||0;
  var lvls=factors.map(activeLevels);
  var combos=[[]];
  for(var i=0;i<lvls.length;i++){
    var next=[];
    combos.forEach(function(c){
      lvls[i].forEach(function(v){ next.push(c.concat([v])); });
    });
    combos=next;
  }
  var std=1;
  var plan=combos.map(function(c){
    var row={stdOrder:std++,runOrder:0,combo:c.slice(),center:false,res:{}};
    return row;
  });
  /* 中心点：数值取均值，类别取第一个水平 */
  if(centerPoints>0){
    var center=factors.map(function(f,i){
      var lv=lvls[i];
      if(f.type==='numeric')return (parseFloat(lv[0])+parseFloat(lv[lv.length-1]))/2;
      return lv[0];
    });
    for(var k=0;k<centerPoints;k++){
      plan.push({stdOrder:std++,runOrder:0,combo:center.slice(),center:true,res:{}});
    }
  }
  /* Fisher-Yates 打乱 */
  if(randomize!==false){
    var idx=plan.map(function(_,i){return i;});
    var seedN=seed?(hashStr(seed)%100000):(Date.now()%100000);
    var rng=makeRng(seedN+1);
    for(var j=idx.length-1;j>0;j--){
      var k2=Math.floor(rng()*(j+1));
      var t=idx[j]; idx[j]=idx[k2]; idx[k2]=t;
    }
    idx.forEach(function(oldIdx,newIdx){ plan[oldIdx].runOrder=newIdx+1; });
  }else{
    plan.forEach(function(r,i){ r.runOrder=r.stdOrder; });
  }
  plan.sort(function(a,b){return a.runOrder-b.runOrder;});
  return plan;
}

/* 复用现有 mulberry32 种子随机（保证演示数据可复现） */
function makeRng(seed){
  var s=(seed>>>0)||1;
  return function(){
    s=(s+0x6D2B79F5)|0;
    var t=Math.imul(s^s>>>15,1|s);
    t=t+Math.imul(t^t>>>7,61|t)^t;
    return((t^t>>>14)>>>0)/4294967296;
  };
}
function hashStr(str){
  var h=2166136261;
  for(var i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619); }
  return h>>>0;
}

/* ---------- ANOVA / 建模分析（基于 mulberry32 种子随机，演示级） ---------- */
function fmtP(p){ return p<0.0001?'<0.0001':p.toFixed(4); }
function signifStars(p){
  if(p<0.01)return '★★★';
  if(p<0.05)return '★★';
  if(p<0.1)return '★';
  return '';
}

function generateAnalysis(e,respName){
  respName=respName||(e.responses&&e.responses[0])||e.response;
  var rng=makeRng(hashStr(e.id+'|'+respName));
  var factors=e.factors;
  var effects=factors.map(function(f){
    var lv=activeLevels(f);
    var means=lv.map(function(_,j){
      return +(55+rng()*15+(j-(lv.length-1)/2)*8+rng()*4).toFixed(1);
    });
    return {name:f.name,unit:f.unit,levels:lv,means:means};
  });
  var best=effects.map(function(ef){
    var bi=0; ef.means.forEach(function(m,j){ if(m>ef.means[bi])bi=j; });
    var pred=ef.means[bi];
    return {name:ef.name,value:ef.levels[bi],predicted:pred,ci:[+(pred-3).toFixed(1),+(pred+3).toFixed(1)]};
  });
  var bestStr=best.map(function(b){return b.value+(b.unit?('('+b.unit+')'):'');}).join(' / ');
  var pVals=[0.0001,0.0021,0.034,0.12,0.41,0.55];
  var anova=[];
  var total=Math.max(1,e.plan.length);
  var ssTotal=0;
  factors.forEach(function(f,i){
    var df=activeLevels(f).length-1;
    var ss=+(40+rng()*200*(i===0?3:1)).toFixed(1);
    var ms=+(ss/Math.max(1,df)).toFixed(1);
    var p=pVals[i%pVals.length]||0.3;
    var coef=ss>150?'+'+(ss/40).toFixed(2):'—';
    anova.push({src:f.name,df:df,ss:ss,ms:ms,f:+(ms/5.5).toFixed(1),
                p:p,coef:coef,interaction:false,star:signifStars(p)});
    ssTotal+=ss;
  });
  /* 两两交互 */
  var interCoef={};
  factors.forEach(function(f,i){
    for(var j=i+1;j<factors.length;j++){
      var nm=f.name+'×'+factors[j].name;
      var ssI=+(10+rng()*40).toFixed(1);
      var dfI=Math.max(1,(activeLevels(f).length-1)*(activeLevels(factors[j]).length-1));
      var msI=+(ssI/dfI).toFixed(1);
      var pI=rng()*0.5;
      var coefI=ssI>30?'+'+(ssI/20).toFixed(2):'—';
      anova.push({src:nm,df:dfI,ss:ssI,ms:msI,f:+(msI/5.5).toFixed(1),
                  p:pI,coef:coefI,interaction:true,star:signifStars(pI)});
      interCoef[nm]=parseFloat(coefI.replace('+',''))||0;
      ssTotal+=ssI;
    }
  });
  var errorSS=+(40+rng()*60).toFixed(1);
  anova.push({src:'误差',df:13,ss:errorSS,ms:+(errorSS/13).toFixed(2),f:null,p:null,coef:'—',interaction:false,star:''});
  ssTotal+=errorSS;
  anova.push({src:'合计',df:20,ss:+ssTotal.toFixed(1),ms:null,f:null,p:null,coef:'—',interaction:false,star:''});
  anovaFull=anova;
  /* 模型汇总 */
  var r2=+(0.85+rng()*0.1).toFixed(3);
  var adj=+(r2-0.03).toFixed(3);
  var rmse=+(1.5+rng()*1.5).toFixed(2);
  var pred=Math.max(0.5,+(r2-0.05-rng()*0.04).toFixed(3));
  var pVal=Math.min.apply(null,anova.filter(function(a){return !a.interaction&&!isNaN(parseFloat(a.p));}).map(function(a){return a.p;}));
  /* 残差 */
  var residuals=[];
  for(var i=0;i<18;i++){
    residuals.push({pred:+(55+rng()*20).toFixed(1),res:+((rng()-0.5)*8).toFixed(2)});
  }
  var topFactor=anova[0];
  var cleanName=respName.replace(/\(.*\)/,'').trim()||respName;
  var bestYield=+(best.reduce(function(s,b){return s+b.predicted;},0)/best.length+15+rng()*5).toFixed(1);
  var concl=topFactor.src+' 对 '+respName+' 影响最显著（P='+fmtP(topFactor.p)+'），推荐最优工艺参数：'+bestStr+'，可获得最佳'+cleanName+'（预测值 '+bestYield+'%）。';
  /* Pareto */
  var pareto=effects.map(function(ef){
    var lo=Math.min.apply(null,ef.means),hi=Math.max.apply(null,ef.means);
    return {name:ef.name,val:+Math.abs(hi-lo).toFixed(1)};
  });
  factors.forEach(function(f,i){
    for(var j=i+1;j<factors.length;j++){
      var nm=f.name+'×'+factors[j].name;
      pareto.push({name:nm,val:+(Math.abs(interCoef[nm])*3+rng()*2).toFixed(1)});
    }
  });
  pareto.sort(function(a,b){return b.val-a.val;});
  var paretoCrit=+(pareto[0].val*0.4).toFixed(1);
  /* 正态概率 */
  var NPn=16,np=[];
  for(var k=0;k<NPn;k++){
    var theo=-3+6*k/(NPn-1);
    np.push({theo:theo,act:+(theo+(rng()-0.5)*0.9).toFixed(2)});
  }
  return {concl:concl,best:best,effects:effects,anova:anovaFull,
          model:{r2:r2,adj:adj,rmse:rmse,pred:pred,pVal:pVal},
          residuals:residuals,topFactor:topFactor,bestYield:bestYield,
          pareto:pareto,paretoCrit:paretoCrit,np:np,respName:respName};
}
var anovaFull=[];  /* 避免语法错误占位 */

/* ---------- 最佳方案推荐生成 ---------- */
function generateBest(a){
  var cands=[];
  var seedRng=makeRng(hashStr(a.bestYield+'|'+a.respName));
  for(var i=0;i<5;i++){
    var yieldV=+(a.bestYield-i*1.8-seedRng()*0.6).toFixed(1);
    var ciLo=+(yieldV-2.2).toFixed(1),ciHi=+(yieldV+2.2).toFixed(1);
    var sat=Math.max(8,Math.min(100,+((yieldV-70)/(a.bestYield-70)*92.5).toFixed(1)));
    var cond=a.best.map(function(b){
      var j=Math.floor(seedRng()*b.ci.length);
      var v=b.ci[j%b.ci.length];
      return {name:b.name,value:v,unit:b.unit};
    });
    cands.push({rank:i+1,yield:yieldV,ci:[ciLo,ciHi],sat:sat,cond:cond});
  }
  var contrib=[];
  var seen=[];
  a.effects.forEach(function(ef){
    var lo=Math.min.apply(null,ef.means),hi=Math.max.apply(null,ef.means);
    var pct=+(Math.abs(hi-lo)*0.7+seedRng()*4).toFixed(1);
    contrib.push({name:ef.name,val:pct});
    seen.push(pct);
  });
  var inter=+(seedRng()*5).toFixed(1);
  var totalUsed=contrib.reduce(function(s,x){return s+x.val;},0)+inter;
  var unexplained=Math.max(0,+(100-totalUsed).toFixed(1));
  contrib.push({name:'交互作用',val:inter});
  contrib.push({name:'未解释',val:unexplained});
  contrib.sort(function(x,y){return y.val-x.val;});
  return {cands:cands,contrib:contrib};
}

/* ==================================================================
   页面注册
   ================================================================== */

/* exp:list 已迁移至 src/24z1-js-exp-restructure.js（实验记录统一执行层） */

/* ==================================================================
   exp:detail · 实验详情 6 Tab
   ================================================================== */
var curDetailId='',curDetailTab='design';

regPage('exp:detail',{
  title:'实验详情',
  crumb:function(){
    var e=findExp(curDetailId);
    if(!e||!e.projectIds.length)return ['实验管理','实验详情'];
    var p=findProj(e.projectIds[0]);
    return ['项目管理',p?p.name:'',(p?'<a onclick="showPage(\'proj:detail\',{id:\''+p.id+'\'})">'+esc((p.stage||'')+'阶段')+'</a>':''),e.id];
  },
  render:function(params){
    curDetailId=params.id||experiments[0].id;
    curDetailTab=params.tab||'design';
    var e=findExp(curDetailId);
    if(e&&e.parentExecutionId){
      curDetailId=e.parentExecutionId;
      e=findExp(curDetailId);
    }
    if(!e){ $('pageHost').innerHTML=placeholder('🚧','实验不存在','未找到 '+esc(curDetailId)); return; }
    renderDetailTabs(e);
  }
});

function renderDetailTabs(e){
  if(e.source==='普通'){
    renderNormalDetail(e);
    return;
  }
  if(e.runs){
    renderDoeExecutionDetail(e);
    return;
  }
  var items=[
    {key:'design',label:'实验设计'},
    {key:'task',label:'任务分发'},
    {key:'exec',label:'执行记录'},
    {key:'entry',label:'结果录入'},
    {key:'summary',label:'总结报告'},
    {key:'recipe',label:'配方记录'}
  ];
  var active=curDetailTab;
  var proj=pHead(e);
  var _isDoeRec=(e.source==='DOE'&&e.schemeId);
  var h='';
  h+='<div class="page-hd"><div class="t">'+
     '<h1>'+esc(e.name)+(_isDoeRec?' <span class="tag tag-purple">运行'+pad2(e.runSeq)+'</span>':'')+
     ' <span class="muted" style="font-size:14px;font-weight:400">'+esc(e.id)+'</span></h1>'+
     '<div class="page-sub">'+
       (_isDoeRec?'<span class="tag tag-purple">DOE实验</span> 所属方案 '+esc(e.schemeId)+' ｜ ':'')+
       '类型 '+esc(e.type)+' ｜ 负责人 '+esc(e.owner||e.assignee||'—')+' ｜ 创建人 '+esc(e.creator)+' ｜ 创建时间 '+esc(e.createTime)+'</div>'+
     '</div>'+
     '<div class="page-acts">'+
       (_isDoeRec?'<button class="btn" onclick="showPage(\'exp:doe\')">所属 DOE 方案</button>':'')+
       (e.status==='待配置'
         ?'<button class="btn btn-primary" onclick="openWizardEdit(\''+e.id+'\')">继续配置设计</button>'
         :'<button class="btn" onclick="openEntry(\''+e.id+'\')">录入数据</button>')+
       (['已录入数据','已分析','已结案','已完成'].indexOf(e.status)>=0
         ?'<button class="btn btn-primary" onclick="startAnalysis(\''+e.id+'\')">查看分析报告</button>':'')+
     '</div></div>';

  h+=proj;
  h+='<div id="detailTabs"></div><div id="detailBody" style="padding-top:18px"></div>';
  $('pageHost').innerHTML=h;
  var host=document.getElementById('detailTabs');
  var t=tabs(items,active,function(k){
    curDetailTab=k;
    var tb=document.getElementById('detailBody');
    renderTabBody(tb,e,k);
    setCrumb('exp:detail');
  });
  host.appendChild(t);
  var tb=document.getElementById('detailBody');
  renderTabBody(tb,e,active);
}

/* ---------- 普通实验详情：主数据 + 实验设计 / 配方记录 ---------- */
var normalExpEdit={};
var NORMAL_EXP_TEMPLATES={
  blank:{name:'空白实验',processes:[],calculations:[],processTests:[],productTests:[]},
  polycondensation:{name:'缩聚反应模板',processes:[
    {name:'预混与升温',conditions:[{time:'30 min',speed:'180',temperature:'80',observation:'物料混合均匀，无明显分层'}],materials:[
      {category:'多元醇',name:'聚醚多元醇',formulaPct:'52.00',solidPct:'100',amount:'520',solidContent:'100',note:''},
      {category:'助剂',name:'抗氧剂 1010',formulaPct:'0.15',solidPct:'100',amount:'1.5',solidContent:'100',note:''}
    ]},
    {name:'缩聚反应',conditions:[{time:'3 h',speed:'220',temperature:'170',observation:'体系逐渐透明，黏度稳定上升'}],materials:[
      {category:'异氰酸酯',name:'异佛尔酮二异氰酸酯',formulaPct:'28.50',solidPct:'100',amount:'285',solidContent:'100',note:''},
      {category:'催化剂',name:'有机铋催化剂',formulaPct:'0.35',solidPct:'100',amount:'3.5',solidContent:'100',note:''}
    ]},
    {name:'封端与降温',conditions:[{time:'45 min',speed:'160',temperature:'85',observation:'封端完成，体系外观均一'}],materials:[
      {category:'封端剂',name:'1,4-丁二醇',formulaPct:'9.50',solidPct:'100',amount:'95',solidContent:'100',note:''}
    ]}
  ],calculations:[{name:'NCO/OH 摩尔比',type:'内置字段',value:'1.05'}],processTests:[{name:'外观',condition:'室温目测',target:'透明、无凝胶',result:'符合',note:''},{name:'原液 pH',condition:'25℃',target:'6.5–7.5',result:'7.1',note:''}],productTests:[{name:'外观',value:'乳白均一液体',note:''},{name:'10% pH',value:'7.0',note:''},{name:'固含量 / %',value:'39.8',note:''}]},
  ringOpening:{name:'开环反应模板',processes:[
    {name:'原料预处理',conditions:[{time:'40 min',speed:'120',temperature:'110',observation:'真空脱水，体系澄清'}],materials:[{category:'起始剂',name:'聚醚多元醇',formulaPct:'48.00',solidPct:'100',amount:'480',solidContent:'100',note:''}]},
    {name:'开环反应',conditions:[{time:'4 h',speed:'200',temperature:'135',observation:'滴加平稳，无异常放热'}],materials:[{category:'环状单体',name:'环氧丙烷',formulaPct:'46.00',solidPct:'100',amount:'460',solidContent:'100',note:''},{category:'催化剂',name:'氢氧化钾',formulaPct:'0.08',solidPct:'90',amount:'0.9',solidContent:'90',note:''}]},
    {name:'中和精制',conditions:[{time:'1 h',speed:'150',temperature:'75',observation:'过滤后清澈，无可见颗粒'}],materials:[{category:'中和剂',name:'磷酸',formulaPct:'0.12',solidPct:'85',amount:'1.4',solidContent:'85',note:''}]}
  ],calculations:[{name:'理论羟值',type:'代码计算',value:'56.1 mgKOH/g'}],processTests:[{name:'反应压力',condition:'135℃',target:'≤0.45 MPa',result:'0.38 MPa',note:''}],productTests:[{name:'羟值',value:'55.8 mgKOH/g',note:''},{name:'水分',value:'0.04%',note:''}]},
  aqueousPu:{name:'水性聚氨酯模板',processes:[
    {name:'预聚反应',conditions:[{time:'2.5 h',speed:'200',temperature:'82',observation:'体系均匀，黏度缓慢上升'}],materials:[{category:'多元醇',name:'聚醚多元醇',formulaPct:'38.65',solidPct:'100',amount:'386.5',solidContent:'100',note:''},{category:'异氰酸酯',name:'异佛尔酮二异氰酸酯',formulaPct:'21.00',solidPct:'100',amount:'210',solidContent:'100',note:''}]},
    {name:'扩链与中和',conditions:[{time:'1 h',speed:'240',temperature:'55',observation:'中和后体系保持透明'}],materials:[{category:'扩链剂',name:'1,4-丁二醇',formulaPct:'4.20',solidPct:'100',amount:'42',solidContent:'100',note:''},{category:'中和剂',name:'三乙胺',formulaPct:'2.10',solidPct:'100',amount:'21',solidContent:'100',note:''}]},
    {name:'乳化分散',conditions:[{time:'45 min',speed:'1200',temperature:'30',observation:'乳液细腻，蓝光明显'}],materials:[{category:'溶剂',name:'水',formulaPct:'34.05',solidPct:'0',amount:'340.5',solidContent:'0',note:''}]}
  ],calculations:[{name:'中和度',type:'内置字段',value:'95%'},{name:'理论固含量',type:'代码计算',value:'39.6%'}],processTests:[{name:'预聚体 NCO 含量',condition:'82℃反应结束',target:'3.2–3.6%',result:'3.4%',note:''},{name:'乳液粒径',condition:'稀释 100 倍',target:'≤120 nm',result:'98 nm',note:''}],productTests:[{name:'外观',value:'乳白色蓝光液体',note:''},{name:'10% pH',value:'7.2',note:''},{name:'固含量 / %',value:'39.5',note:''}]}
};

function cloneObj(o){return JSON.parse(JSON.stringify(o));}
function normalDate(e){
  if(e.experimentDate)return e.experimentDate;
  if(typeof expDate==='function')return expDate(e)==='—'?(e.createTime||'').split(' ')[0]:expDate(e);
  return (e.createTime||'').split(' ')[0]||'—';
}
function ensureNormalDetail(e){
  if(e.normalDetail)return e.normalDetail;
  var key=e.templateKey||(/WPU|乳液/.test(e.name)?'aqueousPu':(/开环/.test(e.name)?'ringOpening':'polycondensation'));
  var base=cloneObj(NORMAL_EXP_TEMPLATES[key]||NORMAL_EXP_TEMPLATES.blank);
  e.templateKey=key;
  e.experimentDate=normalDate(e);
  e.purpose=e.purpose||('验证'+e.name.replace(/实验|验证/g,'')+'的工艺可行性与关键性能。');
  e.keyTechnology=e.keyTechnology||base.processes.map(function(p){return p.name;}).join('、')||'—';
  e.experimentVariable=e.experimentVariable||(e.responses||[]).join('、')||'—';
  e.normalDetail={processes:base.processes,calculations:base.calculations,processTests:base.processTests,productTests:base.productTests,conclusion:e.status==='已完成'||e.status==='已分析'?'实验过程稳定，检测结果达到预期目标，可进入后续验证。':'',attachments:[{name:e.id+'_实验原始记录.xlsx',size:'248 KB'}]};
  syncNormalRecipe(e);
  return e.normalDetail;
}
function normalProjectText(e){return e.projectIds.length?e.projectIds.map(function(id){var p=findProj(id);return p?p.name:id;}).join('、'):'—';}
function normalField(label,value,wide){return '<div class="exp-info-item'+(wide?' wide':'')+'"><div class="exp-info-label">'+esc(label)+'</div><div class="exp-info-value">'+esc(value||'—')+'</div></div>';}
function normalInfoCard(e,editing){
  var d=ensureNormalDetail(e);
  if(!editing)return '<div class="card exp-info-card"><div class="card-hd"><h3>实验信息</h3><span class="sub">普通实验主数据</span></div><div class="card-b"><div class="exp-info-grid">'+
    normalField('实验编号',e.id)+normalField('关联项目',normalProjectText(e))+normalField('实验日期',e.experimentDate)+normalField('实验员',e.owner||e.assignee)+
    normalField('实验类型',e.type)+normalField('实验目的',e.purpose,true)+normalField('关键技术',e.keyTechnology,true)+normalField('实验变量',e.experimentVariable,true)+'</div></div></div>';
  var projects=PROJECTS.map(function(p){return '<option value="'+esc(p.id)+'"'+(e.projectIds[0]===p.id?' selected':'')+'>'+esc(p.name)+'</option>';}).join('');
  var owners=USERS.map(function(u){return '<option value="'+esc(u.id)+'"'+((e.owner||e.assignee)===u.id?' selected':'')+'>'+esc(u.name)+'</option>';}).join('');
  return '<div class="card exp-info-card"><div class="card-hd"><h3>实验信息</h3><span class="tag tag-blue">编辑中</span></div><div class="card-b"><div class="form-grid">'+
    '<div class="field"><label>实验编号</label><input class="ctrl" value="'+esc(e.id)+'" disabled></div><div class="field"><label>关联项目</label><select class="ctrl" id="nedProject"><option value="">不关联项目</option>'+projects+'</select></div>'+
    '<div class="field"><label>实验日期</label><input class="ctrl" id="nedDate" type="date" value="'+esc(e.experimentDate)+'"></div><div class="field"><label>实验员</label><select class="ctrl" id="nedOwner">'+owners+'</select></div>'+
    '<div class="field"><label>实验类型</label><input class="ctrl" id="nedType" value="'+esc(e.type)+'"></div><div class="field"><label>实验目的</label><input class="ctrl" id="nedPurpose" value="'+esc(e.purpose)+'"></div>'+
    '<div class="field span2"><label>关键技术</label><input class="ctrl" id="nedTech" value="'+esc(e.keyTechnology)+'"></div><div class="field span2"><label>实验变量</label><input class="ctrl" id="nedVariable" value="'+esc(e.experimentVariable)+'"></div>'+
    '</div></div></div>';
}
function normalActionButtons(e,editing){
  return '<div class="page-acts">'+
    '<button class="btn" onclick="copyNormalExp(\''+e.id+'\')">复制</button>'+
    (editing?'<button class="btn btn-primary" onclick="saveNormalExpEdit(\''+e.id+'\')">保存</button><button class="btn" onclick="cancelNormalExpEdit(\''+e.id+'\')">取消</button>':'<button class="btn" onclick="editNormalExp(\''+e.id+'\')">编辑</button>')+
    '<button class="btn danger-outline" onclick="deleteNormalExp(\''+e.id+'\')">删除</button>'+
    '<button class="btn" onclick="exportNormalExp(\''+e.id+'\')">导出</button>'+
    '<button class="btn" onclick="showPage(\'exp:list\')">返回</button></div>';
}
function renderNormalDetail(e){
  ensureNormalDetail(e);
  var editing=!!normalExpEdit[e.id];
  var active=curDetailTab==='recipe'?'recipe':'design';
  var items=[{key:'design',label:'实验设计'},{key:'recipe',label:'配方记录'}];
  var h='<div class="page-hd"><div class="t"><h1>'+esc(e.name)+' <span class="tag tag-blue">普通实验</span></h1><div class="page-sub">'+esc(e.id)+' ｜ '+esc(e.status)+' ｜ 创建人 '+esc(e.creator)+' ｜ 创建时间 '+esc(e.createTime)+'</div></div>'+normalActionButtons(e,editing)+'</div>';
  h+=normalInfoCard(e,editing)+'<div id="detailTabs"></div><div id="detailBody"></div>';
  $('pageHost').innerHTML=h;
  document.getElementById('detailTabs').appendChild(tabs(items,active,function(k){curDetailTab=k;renderNormalTab(e,k);setCrumb('exp:detail');}));
  renderNormalTab(e,active);
}
function renderNormalTab(e,key){
  var tb=document.getElementById('detailBody');
  tb.innerHTML=key==='recipe'?tabNormalRecipe(e):tabNormalDesign(e,!!normalExpEdit[e.id]);
}
function normalSectionNav(){
  return '<aside class="exp-section-nav"><div class="exp-section-cap">实验设计</div>'+[
    ['process','实验工序'],['calculation','数据计算'],['process-test','过程测试'],['product-test','成品检测'],['conclusion','结论'],['attachment','附件']
  ].map(function(x,i){return '<button class="exp-section-link'+(i===0?' on':'')+'" data-exp-nav="'+x[0]+'" onclick="scrollNormalSection(\''+x[0]+'\',this)">'+x[1]+'</button>';}).join('')+'</aside>';
}
function scrollNormalSection(id,btn){
  $$('.exp-section-link').forEach(function(x){x.classList.remove('on');}); if(btn)btn.classList.add('on');
  var el=document.getElementById('exp-section-'+id); if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
}
function sectionHead(id,title,count,editing,addFn){return '<div class="exp-subsection-hd"><div><h3>'+title+'</h3>'+(count!==null?'<span>共 '+count+' 个</span>':'')+'</div>'+(editing&&addFn?'<button class="btn btn-sm" onclick="'+addFn+'">新增</button>':'')+'</div>';}
function rowOps(kind,index,sub){return '<td class="op"><button class="btn-link" onclick="openNormalItem(\''+kind+'\','+index+','+(sub===undefined?'null':sub)+')">编辑</button><button class="btn-link danger" onclick="removeNormalItem(\''+kind+'\','+index+','+(sub===undefined?'null':sub)+')">删除</button></td>';}
function tabNormalDesign(e,editing){
  var d=ensureNormalDetail(e);
  var h='<div class="normal-design-layout">'+normalSectionNav()+'<div class="normal-design-content">';
  h+='<section class="card exp-design-section" id="exp-section-process">'+sectionHead('process','实验工序',d.processes.length,editing,'addNormalProcess()')+'<div class="card-b">';
  if(!d.processes.length)h+='<div class="empty compact-empty">暂无实验工序'+(editing?'，可点击“新增”创建工序':'')+'</div>';
  d.processes.forEach(function(p,pi){
    h+='<div class="exp-process"><div class="exp-process-title"><b>'+esc(p.name)+'</b>'+(editing?'<span><button class="btn-link" onclick="renameNormalProcess('+pi+')">编辑工序</button><button class="btn-link danger" onclick="removeNormalProcess('+pi+')">删除</button></span>':'')+'</div><div class="exp-process-grid"><div><div class="exp-table-title">操作条件及现象'+(editing?'<button class="btn btn-sm" onclick="openNormalItem(\'condition\','+pi+',null)">新增</button>':'')+'</div><div class="tbl-wrap"><table class="tbl tbl-sm"><thead><tr><th>时间</th><th>转速(rpm)</th><th>温度(℃)</th><th>操作及现象</th>'+(editing?'<th>操作</th>':'')+'</tr></thead><tbody>'+(p.conditions.length?p.conditions.map(function(r,ri){return '<tr><td>'+esc(r.time)+'</td><td>'+esc(r.speed)+'</td><td>'+esc(r.temperature)+'</td><td>'+esc(r.observation)+'</td>'+(editing?rowOps('condition',pi,ri):'')+'</tr>';}).join(''):'<tr><td colspan="'+(editing?5:4)+'" class="muted ctr">暂无数据</td></tr>')+'</tbody></table></div></div>';
    h+='<div><div class="exp-table-title">原料'+(editing?'<button class="btn btn-sm" onclick="openNormalItem(\'material\','+pi+',null)">新增</button>':'')+'</div><div class="tbl-wrap"><table class="tbl tbl-sm"><thead><tr><th>原料分类</th><th>原料</th><th>配方百分比(%)</th><th>固体份占比(%)</th><th>添加量(g)</th><th>原料固含量(%)</th>'+(editing?'<th>操作</th>':'')+'</tr></thead><tbody>'+(p.materials.length?p.materials.map(function(r,ri){return '<tr><td>'+esc(r.category)+'</td><td>'+matLink(r.name)+'</td><td>'+esc(r.formulaPct)+'</td><td>'+esc(r.solidPct)+'</td><td>'+esc(r.amount)+'</td><td>'+esc(r.solidContent)+'</td>'+(editing?rowOps('material',pi,ri):'')+'</tr>';}).join(''):'<tr><td colspan="'+(editing?7:6)+'" class="muted ctr">暂无数据</td></tr>')+'</tbody></table></div></div></div></div>';
  });
  h+='</div></section>';
  h+='<section class="card exp-design-section" id="exp-section-calculation">'+sectionHead('calculation','数据计算',d.calculations.length,editing,'openNormalItem(\'calculation\',null,null)')+'<div class="card-b tight">'+simpleNormalTable('calculation',d.calculations,['数据项','数据类型','数据值'],['name','type','value'],editing)+'</div></section>';
  h+='<section class="card exp-design-section" id="exp-section-process-test">'+sectionHead('process-test','过程测试',d.processTests.length,editing,'openNormalItem(\'processTest\',null,null)')+'<div class="card-b tight">'+simpleNormalTable('processTest',d.processTests,['测试项','测试条件','目标性能','测试结果','备注'],['name','condition','target','result','note'],editing)+'</div></section>';
  h+='<section class="card exp-design-section" id="exp-section-product-test">'+sectionHead('product-test','成品检测',d.productTests.length,editing,'openNormalItem(\'productTest\',null,null)')+'<div class="card-b tight">'+simpleNormalTable('productTest',d.productTests,['检测项','检测值','备注'],['name','value','note'],editing)+'</div></section>';
  h+='<section class="card exp-design-section" id="exp-section-conclusion">'+sectionHead('conclusion','结论',null,false,'')+'<div class="card-b">'+(editing?'<textarea class="ctrl exp-conclusion-input" id="nedConclusion" placeholder="请输入本次实验结论">'+esc(d.conclusion)+'</textarea>':'<div class="exp-conclusion-text">'+esc(d.conclusion||'暂未填写实验结论')+'</div>')+'</div></section>';
  h+='<section class="card exp-design-section" id="exp-section-attachment">'+sectionHead('attachment','附件',d.attachments.length,false,'')+'<div class="card-b"><div class="exp-upload-list">'+d.attachments.map(function(a){return '<div class="exp-file"><span>'+esc(a.name)+'</span><small>'+esc(a.size||'')+'</small></div>';}).join('')+(editing?'<label class="exp-upload-btn">上传附件<input type="file" onchange="addNormalAttachment(this)" hidden></label>':'')+'</div></div></section>';
  return h+'</div></div>';
}
function simpleNormalTable(kind,rows,heads,keys,editing){
  return '<div class="tbl-wrap"><table class="tbl"><thead><tr>'+heads.map(function(x){return '<th>'+x+'</th>';}).join('')+(editing?'<th>操作</th>':'')+'</tr></thead><tbody>'+(rows.length?rows.map(function(r,i){return '<tr>'+keys.map(function(k){return '<td>'+esc(r[k]||'—')+'</td>';}).join('')+(editing?rowOps(kind,i):'')+'</tr>';}).join(''):'<tr><td colspan="'+(heads.length+(editing?1:0))+'" class="muted ctr">暂无数据</td></tr>')+'</tbody></table></div>';
}
function syncNormalRecipe(e){
  if(!e||e.source==='DOE'||!e.normalDetail)return;
  var grouped={};
  e.normalDetail.processes.forEach(function(p,pi){p.materials.forEach(function(r){var key=r.name||('原料'+pi);if(!grouped[key])grouped[key]={code:'M-'+String(Object.keys(grouped).length+1).padStart(3,'0'),name:key,cas:'—',pct:0,amount:0,processes:[]};var g=grouped[key];g.pct+=parseFloat(r.formulaPct)||0;g.amount+=parseFloat(r.amount)||0;if(g.processes.indexOf(p.name)<0)g.processes.push(p.name);});});
  EXP_RECIPE[e.id]={code:'EXP-'+e.id.replace('EXP-',''),ver:'实验快照',product:e.name,rows:Object.keys(grouped).map(function(k){var g=grouped[k];return {code:g.code,name:g.name,cas:g.cas,pct:g.pct.toFixed(2),amount:g.amount.toFixed(1),process:g.processes.join('、')};})};
}
function tabNormalRecipe(e){
  ensureNormalDetail(e);syncNormalRecipe(e);var rec=expRecipeOf(e.id);
  return '<div class="card"><div class="card-hd"><h3>配方记录 <span class="sub">由各实验工序的实际投料自动汇总 · 只读快照</span></h3></div><div class="card-b"><div class="notice notice-info"><i class="ni">i</i><div>此处不单独维护。修改“实验设计 / 实验工序”中的原料后，配方记录会自动重新汇总。</div></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>原料</th><th>添加工序</th><th class="num">配方百分比(%)</th><th class="num">实际添加量(g)</th></tr></thead><tbody>'+rec.rows.map(function(r){return '<tr><td>'+matLink(r.name)+'</td><td>'+esc(r.process||'—')+'</td><td class="num">'+esc(r.pct)+'</td><td class="num">'+esc(r.amount||'—')+'</td></tr>';}).join('')+'</tbody></table></div></div></div>';
}
function editNormalExp(id){
  var e=findExp(id);if(!e)return;ensureNormalDetail(e);
  normalExpEdit[id]={projectIds:e.projectIds.slice(),experimentDate:e.experimentDate,owner:e.owner,type:e.type,purpose:e.purpose,keyTechnology:e.keyTechnology,experimentVariable:e.experimentVariable,normalDetail:cloneObj(e.normalDetail)};
  renderNormalDetail(e);
}
function saveNormalExpEdit(id){
  var e=findExp(id);if(!e)return;
  e.projectIds=$('nedProject')&&$('nedProject').value?[$('nedProject').value]:[];
  e.experimentDate=$('nedDate').value;e.owner=$('nedOwner').value;e.type=$('nedType').value.trim();
  e.purpose=$('nedPurpose').value.trim();e.keyTechnology=$('nedTech').value.trim();e.experimentVariable=$('nedVariable').value.trim();
  if($('nedConclusion'))e.normalDetail.conclusion=$('nedConclusion').value.trim();
  syncNormalRecipe(e);delete normalExpEdit[id];toast('实验详情已保存','ok');renderNormalDetail(e);
}
function cancelNormalExpEdit(id){
  var e=findExp(id),old=normalExpEdit[id];if(!e||!old)return;
  e.projectIds=old.projectIds;e.experimentDate=old.experimentDate;e.owner=old.owner;e.type=old.type;e.purpose=old.purpose;e.keyTechnology=old.keyTechnology;e.experimentVariable=old.experimentVariable;e.normalDetail=old.normalDetail;
  syncNormalRecipe(e);delete normalExpEdit[id];renderNormalDetail(e);
}
function copyNormalExp(id){
  var src=findExp(id);if(!src)return;ensureNormalDetail(src);
  var e=cloneObj(src),nid='EXP-2026-'+String(Math.floor(Math.random()*9000)+1000);
  e.id=nid;e.name=src.name+'（复制）';e.status='待执行';e.createTime=nowStr();e.creator='王研究员';e.analyzedAt='';e.normalDetail.attachments=[];
  experiments.unshift(e);syncNormalRecipe(e);toast('已复制为 '+nid,'ok');showPage('exp:detail',{id:nid});
}
function deleteNormalExp(id){
  var e=findExp(id);if(!e)return;
  confirmBox('删除普通实验','确定删除 <b>'+esc(e.name)+'</b>（'+esc(id)+'）？此操作不可撤销。',function(){experiments=experiments.filter(function(x){return x.id!==id;});delete EXP_RECIPE[id];toast('已删除 '+id,'ok');showPage('exp:list');},{danger:true,okText:'删除'});
}
function exportNormalExp(id){
  var e=findExp(id);if(!e)return;ensureNormalDetail(e);syncNormalRecipe(e);
  var lines=['实验编号,'+e.id,'实验名称,'+e.name,'关联项目,'+normalProjectText(e),'实验日期,'+e.experimentDate,'实验员,'+(e.owner||''),'实验类型,'+e.type,'实验目的,'+e.purpose,'关键技术,'+e.keyTechnology,'实验变量,'+e.experimentVariable,'','实验工序'];
  e.normalDetail.processes.forEach(function(p){lines.push(p.name);p.materials.forEach(function(r){lines.push(['原料',r.name,r.amount+'g',r.formulaPct+'%'].join(','));});});
  lines.push('','结论,'+(e.normalDetail.conclusion||''));downloadFile(e.id+'_实验详情.csv','\ufeff'+lines.join('\n'),'text/csv;charset=utf-8');toast('已导出实验详情','ok');
}
function addNormalProcess(){
  openModal({title:'新增实验工序',body:'<div class="field"><label class="req">工序名称</label><input class="ctrl" id="nipName" placeholder="例如：缩聚反应"></div>',footer:'<button class="btn" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="saveNormalProcess()">确定</button>'});
}
function saveNormalProcess(){var n=($('nipName').value||'').trim();if(!n){toast('请输入工序名称','warn');return;}var e=findExp(curDetailId);ensureNormalDetail(e).processes.push({name:n,conditions:[],materials:[]});closeModal();renderNormalDetail(e);}
function renameNormalProcess(pi){var e=findExp(curDetailId),p=ensureNormalDetail(e).processes[pi];openModal({title:'编辑实验工序',body:'<div class="field"><label>工序名称</label><input class="ctrl" id="nipName" value="'+esc(p.name)+'"></div>',footer:'<button class="btn" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="saveNormalProcessName('+pi+')">确定</button>'});}
function saveNormalProcessName(pi){var e=findExp(curDetailId),p=ensureNormalDetail(e).processes[pi],n=($('nipName').value||'').trim();if(!n){toast('请输入工序名称','warn');return;}p.name=n;closeModal();syncNormalRecipe(e);renderNormalDetail(e);}
function removeNormalProcess(pi){var e=findExp(curDetailId);ensureNormalDetail(e).processes.splice(pi,1);syncNormalRecipe(e);renderNormalDetail(e);}
function normalInput(id,label,value,wide){return '<div class="field'+(wide?' span2':'')+'"><label>'+label+'</label><input class="ctrl" id="'+id+'" value="'+esc(value||'')+'"></div>';}
function openNormalItem(kind,index,sub){
  var e=findExp(curDetailId),d=ensureNormalDetail(e),row={},title='',body='';
  if(kind==='condition'){row=sub===null?{}:d.processes[index].conditions[sub];title=(sub===null?'新增':'编辑')+'操作条件及现象';body='<div class="form-grid">'+normalInput('niTime','时间',row.time)+normalInput('niSpeed','转速(rpm)',row.speed)+normalInput('niTemp','温度(℃)',row.temperature)+normalInput('niObs','操作及现象',row.observation,true)+'</div>';}
  if(kind==='material'){row=sub===null?{}:d.processes[index].materials[sub];title=(sub===null?'新增':'编辑')+'原料';body='<div class="form-grid">'+normalInput('niCat','分类',row.category)+normalInput('niMat','原料',row.name)+normalInput('niAmount','添加量(g)',row.amount)+normalInput('niSolid','原料固含量(%)',row.solidContent)+normalInput('niMolecular','分子量',row.molecularWeight)+normalInput('niTg','均聚物 Tg(K)',row.homopolymerTg)+normalInput('niCost','成本单价(元/g)',row.unitCost)+normalInput('niVoc','VOC',row.voc)+normalInput('niFunctionality','官能度',row.functionality)+normalInput('niFluorine','含氟量(%)',row.fluorine)+normalInput('niHydroxyl','羟值(mgKOH/g)',row.hydroxyl)+normalInput('niNco','NCO 含量(%)',row.nco)+normalInput('niVinyl','乙烯基含量(%)',row.vinyl)+normalInput('niCarboxyl','羧基数',row.carboxyl)+normalInput('niPct','配方百分比(%)',row.formulaPct)+normalInput('niSolidPct','固体份占比(%)',row.solidPct)+normalInput('niNote','备注',row.note)+normalInput('niTags','标签',row.tags)+'</div>';}
  if(kind==='calculation'){row=index===null?{}:d.calculations[index];title=(index===null?'新增':'编辑')+'数据计算项';body=normalInput('niName','数据项',row.name)+'<div class="field"><label>数据类型</label><div class="radio-row"><label><input type="radio" name="niCalcType" value="手动输入"'+(!row.type||row.type==='手动输入'?' checked':'')+'> 手动输入</label><label><input type="radio" name="niCalcType" value="内置字段"'+(row.type==='内置字段'?' checked':'')+'> 内置字段</label><label><input type="radio" name="niCalcType" value="代码计算"'+(row.type==='代码计算'?' checked':'')+'> 代码计算</label></div></div>'+normalInput('niValue','数据值',row.value);}
  if(kind==='processTest'){row=index===null?{}:d.processTests[index];title=(index===null?'新增':'编辑')+'测试项';body=normalInput('niName','测试项',row.name)+normalInput('niCondition','测试条件',row.condition)+normalInput('niTarget','目标性能',row.target)+normalInput('niResult','测试结果',row.result)+normalInput('niNote','备注',row.note);}
  if(kind==='productTest'){row=index===null?{}:d.productTests[index];title=(index===null?'新增':'编辑')+'成品检测项';body=normalInput('niName','检测项',row.name)+normalInput('niValue','检测值',row.value)+normalInput('niNote','备注',row.note);}
  openModal({title:title,width:kind==='material'?760:520,body:body,footer:'<label class="modal-continue"><input type="checkbox" id="niContinue"> 继续添加下一条</label><button class="btn" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="saveNormalItem(\''+kind+'\','+(index===null?'null':index)+','+(sub===null||sub===undefined?'null':sub)+')">确定</button>'});
}
function inputVal(id){return $(id)?$(id).value.trim():'';}
function saveNormalItem(kind,index,sub){
  var e=findExp(curDetailId),d=ensureNormalDetail(e),row;
  var keepAdding=!!($('niContinue')&&$('niContinue').checked);
  if(kind==='condition')row={time:inputVal('niTime'),speed:inputVal('niSpeed'),temperature:inputVal('niTemp'),observation:inputVal('niObs')};
  if(kind==='material')row={category:inputVal('niCat'),name:inputVal('niMat'),amount:inputVal('niAmount'),solidContent:inputVal('niSolid'),molecularWeight:inputVal('niMolecular'),homopolymerTg:inputVal('niTg'),unitCost:inputVal('niCost'),voc:inputVal('niVoc'),functionality:inputVal('niFunctionality'),fluorine:inputVal('niFluorine'),hydroxyl:inputVal('niHydroxyl'),nco:inputVal('niNco'),vinyl:inputVal('niVinyl'),carboxyl:inputVal('niCarboxyl'),formulaPct:inputVal('niPct'),solidPct:inputVal('niSolidPct'),note:inputVal('niNote'),tags:inputVal('niTags')};
  if(kind==='calculation')row={name:inputVal('niName'),type:(document.querySelector('[name="niCalcType"]:checked')||{}).value||'手动输入',value:inputVal('niValue')};
  if(kind==='processTest')row={name:inputVal('niName'),condition:inputVal('niCondition'),target:inputVal('niTarget'),result:inputVal('niResult'),note:inputVal('niNote')};
  if(kind==='productTest')row={name:inputVal('niName'),value:inputVal('niValue'),note:inputVal('niNote')};
  if(!row.name&&kind!=='condition'){toast('名称不能为空','warn');return;}
  var list=kind==='condition'?d.processes[index].conditions:kind==='material'?d.processes[index].materials:kind==='calculation'?d.calculations:kind==='processTest'?d.processTests:d.productTests;
  var ri=(kind==='condition'||kind==='material')?sub:index;if(ri===null)list.push(row);else list[ri]=row;
  syncNormalRecipe(e);closeModal();renderNormalDetail(e);
  if(keepAdding)openNormalItem(kind,(kind==='condition'||kind==='material')?index:null,null);
}
function removeNormalItem(kind,index,sub){
  var e=findExp(curDetailId),d=ensureNormalDetail(e),list,ri;
  if(kind==='condition'){list=d.processes[index].conditions;ri=sub;}else if(kind==='material'){list=d.processes[index].materials;ri=sub;}else{list=kind==='calculation'?d.calculations:kind==='processTest'?d.processTests:d.productTests;ri=index;}
  list.splice(ri,1);syncNormalRecipe(e);renderNormalDetail(e);
}
function addNormalAttachment(input){var e=findExp(curDetailId);if(input.files&&input.files[0]){var f=input.files[0];ensureNormalDetail(e).attachments.push({name:f.name,size:Math.max(1,Math.round(f.size/1024))+' KB'});toast('附件已添加','ok');renderNormalDetail(e);}}

/* ---------- DOE 实验详情：整套执行方案 + 批量结果录入 ---------- */
var doeOpenRuns={};
function doeRunDone(e,run){return e.responses.every(function(rn){var v=run.entered&&run.entered[0]?run.entered[0][rn]:'';return v!==''&&v!==null&&v!==undefined;});}
function doeExecStat(e){var done=e.runs.filter(function(r){return doeRunDone(e,r);}).length;return {done:done,total:e.runs.length,pct:e.runs.length?Math.round(done/e.runs.length*100):0};}
function doeRunFactorText(e,run){return e.factors.map(function(f,i){return f.name+' '+run.plan[0].combo[i]+(f.unit||'');}).join('；');}
function doeInfoCard(e){
  return '<div class="card exp-info-card"><div class="card-hd"><h3>实验信息</h3><span class="sub">DOE 实验主数据</span></div><div class="card-b"><div class="exp-info-grid">'+
    normalField('实验编号',e.id)+normalField('关联项目',normalProjectText(e))+normalField('实验日期',e.experimentDate)+normalField('实验员',e.owner||'—')+
    normalField('实验类型','DOE 实验')+normalField('实验目的',e.purpose,true)+normalField('关键技术',e.keyTechnology,true)+normalField('实验变量',e.experimentVariable,true)+'</div></div></div>';
}
function doeSourceCard(e){
  var s=findScheme(e.schemeId),st=doeExecStat(e);
  return '<div class="doe-source-strip"><div><span>DOE 方案</span><b>'+esc(e.schemeId)+'</b><small>'+esc(s?s.name:e.name)+'</small></div><div><span>设计类型</span><b>'+esc(s?s.type:e.type)+'</b></div><div><span>试验组数</span><b>'+st.total+' 组</b></div><div><span>执行进度</span><b>'+st.done+' / '+st.total+'</b><div class="pbar"><div class="pf" style="width:'+st.pct+'%"></div></div></div></div>';
}
function renderDoeExecutionDetail(e){
  var mapped={design:'plan',recipe:'plan',task:'plan',exec:'plan',entry:'entry',summary:'entry'};
  var active=mapped[curDetailTab]||curDetailTab;if(active!=='plan'&&active!=='entry')active='plan';curDetailTab=active;
  var h='<div class="page-hd"><div class="t"><h1>'+esc(e.name)+' <span class="tag tag-purple">DOE实验</span></h1><div class="page-sub">'+esc(e.id)+' ｜ '+esc(e.status)+' ｜ 创建人 '+esc(e.creator)+' ｜ 创建时间 '+esc(e.createTime)+'</div></div>'+doeActionButtons(e)+'</div>';
  h+=doeInfoCard(e)+doeSourceCard(e)+'<div id="detailTabs"></div><div id="detailBody"></div>';
  $('pageHost').innerHTML=h;
  document.getElementById('detailTabs').appendChild(tabs([{key:'plan',label:'执行方案'},{key:'entry',label:'结果录入'}],active,function(k){curDetailTab=k;renderDoeExecutionTab(e,k);setCrumb('exp:detail');}));
  renderDoeExecutionTab(e,active);
}
function doeActionButtons(e){return '<div class="page-acts"><button class="btn" onclick="copyDoeExecution(\''+e.id+'\')">复制</button><button class="btn" onclick="editDoeExecution(\''+e.id+'\')">编辑</button><button class="btn danger-outline" onclick="deleteDoeExecution(\''+e.id+'\')">删除</button><button class="btn" onclick="exportDoeExecution(\''+e.id+'\')">导出</button><button class="btn" onclick="showPage(\'exp:list\')">返回</button></div>';}
function renderDoeExecutionTab(e,key){var tb=$('detailBody');tb.innerHTML=key==='entry'?tabDoeBatchEntry(e):tabDoeExecutionPlan(e);}
function tabDoeExecutionPlan(e){
  var st=doeExecStat(e),allOpen=e.runs.every(function(r){return !!doeOpenRuns[e.id+':'+r.runSeq];});
  var h='<div class="card"><div class="card-hd"><h3>执行方案 <span class="sub">设计快照已锁定 · 共 '+st.total+' 组试验</span></h3><div class="acts"><button class="btn btn-sm" onclick="toggleAllDoeRuns(\''+e.id+'\','+(!allOpen)+')">'+(allOpen?'收起全部':'展开全部')+'</button></div></div>'+
    '<div class="card-b"><div class="notice notice-warn"><i class="ni">!</i><div>因素设定值、实验工序和计划投料量来自 DOE 方案下发时的设计快照，实验员不能在此修改。</div></div>'+
    '<div class="doe-process-line">'+e.executionProcesses.map(function(p,i){return '<div><b>'+(i+1)+'. '+esc(p.name)+'</b><span>'+esc(p.requirement)+'</span></div>';}).join('')+'</div></div>';
  h+='<div class="tbl-wrap"><table class="tbl doe-run-table"><thead><tr><th style="width:90px">试验序号</th><th>因素组合</th><th style="width:120px">计划投料</th><th style="width:100px">状态</th><th style="width:90px">操作</th></tr></thead><tbody>';
  e.runs.forEach(function(run){var open=!!doeOpenRuns[e.id+':'+run.runSeq],done=doeRunDone(e,run);h+='<tr><td><b>第 '+run.runSeq+' 组</b>'+(run.plan[0].center?'<span class="tag tag-orange doe-center-tag">中心点</span>':'')+'</td><td>'+esc(doeRunFactorText(e,run))+'</td><td>'+run.plannedMaterials.length+' 种 / '+run.plannedMaterials.reduce(function(s,m){return s+(parseFloat(m.amount)||0);},0).toFixed(1)+' g</td><td><span class="tag '+(done?'tag-green':'tag-grey')+' tag-dot">'+(done?'已完成':'待录入')+'</span></td><td><button class="btn-link" onclick="toggleDoeRun(\''+e.id+'\','+run.runSeq+')">'+(open?'收起':'查看方案')+'</button></td></tr>';
    if(open)h+='<tr class="doe-run-detail-row"><td colspan="5">'+doeRunPlanDetail(e,run)+'</td></tr>';
  });
  return h+'</tbody></table></div></div>';
}
function doeRunPlanDetail(e,run){return '<div class="doe-run-detail"><div><h4>本组因素设定</h4><div class="doe-factor-cards">'+e.factors.map(function(f,i){return '<div><span>'+esc(f.name)+'</span><b>'+esc(run.plan[0].combo[i])+(f.unit?'<small>'+esc(f.unit)+'</small>':'')+'</b></div>';}).join('')+'</div></div><div><h4>计划投料</h4><div class="tbl-wrap"><table class="tbl tbl-sm"><thead><tr><th>原料</th><th>配方百分比(%)</th><th>计划添加量(g)</th><th>添加要求</th></tr></thead><tbody>'+run.plannedMaterials.map(function(m){return '<tr><td>'+matLink(m.name)+'</td><td>'+esc(m.pct)+'</td><td><b>'+esc(m.amount)+'</b></td><td>'+esc(m.process)+'</td></tr>';}).join('')+'</tbody></table></div></div></div>';}
function toggleDoeRun(id,seq){doeOpenRuns[id+':'+seq]=!doeOpenRuns[id+':'+seq];renderDoeExecutionDetail(findExp(id));}
function toggleAllDoeRuns(id,open){var e=findExp(id);e.runs.forEach(function(r){doeOpenRuns[id+':'+r.runSeq]=open;});renderDoeExecutionDetail(e);}
function tabDoeBatchEntry(e){
  var st=doeExecStat(e),h='<div class="card"><div class="card-hd"><h3>批量结果录入 <span class="sub">'+st.done+' / '+st.total+' 组已完整</span></h3><div class="acts"><button class="btn" onclick="downloadDoeEntryTemplate(\''+e.id+'\')">下载录入模板</button><button class="btn" onclick="openDoePaste(\''+e.id+'\')">粘贴表格数据</button><button class="btn" onclick="fillDoeBatchDemo(\''+e.id+'\')">填入示例数据</button><button class="btn" onclick="saveDoeDraft(\''+e.id+'\')">暂存</button><button class="btn btn-primary" onclick="submitDoeBatch(\''+e.id+'\')">提交全部结果</button></div></div>'+
    '<div class="card-b"><div class="doe-entry-progress"><span>录入进度</span><div class="pbar ok"><div class="pf" style="width:'+st.pct+'%"></div></div><b>'+st.pct+'%</b></div><div class="notice notice-info"><i class="ni">i</i><div>因素组合和计划投料只读。可直接连续录入响应变量，也可以从 Excel 复制后批量粘贴；单组异常请点击“完善记录”。</div></div></div>'+
    '<div class="tbl-wrap"><table class="tbl doe-entry-table"><thead><tr><th>试验序号</th><th>因素组合（只读）</th>'+e.responses.map(function(r){return '<th>'+esc(r)+'</th>';}).join('')+'<th>实际日期</th><th>异常说明</th><th>状态</th><th>操作</th></tr></thead><tbody>';
  e.runs.forEach(function(run){var done=doeRunDone(e,run);h+='<tr'+(run.plan[0].center?' class="center-row"':'')+'><td><b>第 '+run.runSeq+' 组</b></td><td class="doe-factor-cell">'+esc(doeRunFactorText(e,run))+'</td>'+e.responses.map(function(rn){var v=run.entered[0][rn];return '<td><input class="entry-input'+(v!==''?' filled':'')+'" value="'+esc(v)+'" oninput="updateDoeBatchValue(\''+e.id+'\','+run.runSeq+',\''+rn+'\',this.value)"></td>';}).join('')+'<td><input class="ctrl doe-date-input" type="date" value="'+esc(run.actualDate||'')+'" onchange="updateDoeRunField(\''+e.id+'\','+run.runSeq+',\'actualDate\',this.value)"></td><td><input class="ctrl doe-note-input" value="'+esc(run.exception||'')+'" placeholder="无" onchange="updateDoeRunField(\''+e.id+'\','+run.runSeq+',\'exception\',this.value)"></td><td><span class="tag '+(done?'tag-green':'tag-grey')+'">'+(done?'已完成':'待录入')+'</span></td><td><button class="btn-link" onclick="openDoeRunRecord(\''+e.id+'\','+run.runSeq+')">完善记录</button></td></tr>';});
  return h+'</tbody></table></div></div>';
}
function doeRunOf(e,seq){return e.runs.find(function(r){return r.runSeq===seq;});}
function updateDoeBatchValue(id,seq,rn,value){var e=findExp(id),run=doeRunOf(e,seq);run.entered[0][rn]=value;run.status=doeRunDone(e,run)?'已完成':'执行中';}
function updateDoeRunField(id,seq,key,value){var e=findExp(id),run=doeRunOf(e,seq);run[key]=value;}
function saveDoeDraft(id){var e=findExp(id);toast('已暂存 '+doeExecStat(e).done+' / '+e.runs.length+' 组结果','ok');renderDoeExecutionDetail(e);}
function fillDoeBatchDemo(id){var e=findExp(id);e.runs.forEach(function(run,i){e.responses.forEach(function(rn,j){run.entered[0][rn]=(70+(i*3+j*7)%24).toFixed(1);});run.actualDate=todayStr();run.status='已完成';run.actualMaterials.forEach(function(m,mi){m.amount=run.plannedMaterials[mi].amount;});});toast('已填入 '+e.runs.length+' 组示例结果','ok');renderDoeExecutionDetail(e);}
function submitDoeBatch(id){var e=findExp(id),st=doeExecStat(e);if(st.done<st.total){toast('还有 '+(st.total-st.done)+' 组响应结果未填写完整','warn');return;}e.status='已完成';var s=findScheme(e.schemeId);if(s)s.status='已完成';toast('全部 '+st.total+' 组结果已提交，可进入 DOE 分析','ok');renderDoeExecutionDetail(e);}
function openDoePaste(id){var e=findExp(id);openModal({title:'粘贴表格数据',width:660,body:'<div class="notice notice-info"><i class="ni">i</i><div>从 Excel 复制响应变量区域，每行对应一个试验组，每列对应一个响应变量。当前共 '+e.runs.length+' 行 × '+e.responses.length+' 列。</div></div><div class="field"><label>表格数据</label><textarea class="ctrl doe-paste" id="doePaste" placeholder="例如：\n82.1\t12.5\n79.8\t12.9"></textarea></div>',footer:'<button class="btn" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="applyDoePaste(\''+id+'\')">应用数据</button>'});}
function applyDoePaste(id){var e=findExp(id),lines=inputVal('doePaste').split(/\n/).filter(function(x){return x.trim();});lines.forEach(function(line,i){if(!e.runs[i])return;var vals=line.split(/\t|,/);e.responses.forEach(function(rn,j){if(vals[j]!==undefined)e.runs[i].entered[0][rn]=vals[j].trim();});e.runs[i].status=doeRunDone(e,e.runs[i])?'已完成':'执行中';});closeModal();toast('已应用 '+Math.min(lines.length,e.runs.length)+' 行数据','ok');renderDoeExecutionDetail(e);}
function openDoeRunRecord(id,seq){
  var e=findExp(id),run=doeRunOf(e,seq),rows=run.plannedMaterials.map(function(m,i){var a=run.actualMaterials[i]||{};return '<tr><td>'+esc(m.name)+'</td><td>'+esc(m.amount)+'</td><td><input class="entry-input" data-doe-actual="'+i+'" value="'+esc(a.amount||'')+'"></td></tr>';}).join('');
  openModal({title:'第 '+seq+' 组 · 完善执行记录',width:760,body:'<div class="field"><label>因素组合</label><input class="ctrl" value="'+esc(doeRunFactorText(e,run))+'" disabled></div><div class="field"><label>实际投料</label><div class="tbl-wrap"><table class="tbl tbl-sm"><thead><tr><th>原料</th><th>计划添加量(g)</th><th>实际添加量(g)</th></tr></thead><tbody>'+rows+'</tbody></table></div></div><div class="field"><label>实际工艺与异常说明</label><textarea class="ctrl" id="doeRunException">'+esc(run.exception||'')+'</textarea></div><div class="field"><label>附件</label><input class="ctrl" id="doeRunFile" type="file"></div>',footer:'<button class="btn" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="saveDoeRunRecord(\''+id+'\','+seq+')">保存</button>'});
}
function saveDoeRunRecord(id,seq){var e=findExp(id),run=doeRunOf(e,seq);$$('[data-doe-actual]').forEach(function(inp){var i=+inp.getAttribute('data-doe-actual');run.actualMaterials[i].amount=inp.value;});run.exception=inputVal('doeRunException');var f=$('doeRunFile');if(f&&f.files&&f.files[0])run.attachments.push({name:f.files[0].name});closeModal();toast('第 '+seq+' 组执行记录已保存','ok');renderDoeExecutionDetail(e);}
function downloadDoeEntryTemplate(id){var e=findExp(id),head=['试验序号'].concat(e.factors.map(function(f){return f.name;})).concat(e.responses),rows=[head];e.runs.forEach(function(run){rows.push([run.runSeq].concat(run.plan[0].combo).concat(e.responses.map(function(){return '';})));});downloadFile(e.id+'_批量录入模板.csv','\ufeff'+rows.map(function(r){return r.join(',');}).join('\n'),'text/csv;charset=utf-8');toast('已下载批量录入模板','ok');}
function exportDoeExecution(id){var e=findExp(id);downloadDoeEntryTemplate(id);}
function editDoeExecution(id){var e=findExp(id),opts=USERS.map(function(u){return '<option value="'+esc(u.id)+'"'+(e.owner===u.id?' selected':'')+'>'+esc(u.name)+'</option>';}).join('');openModal({title:'编辑 DOE 实验主数据',body:'<div class="notice notice-warn"><i class="ni">!</i><div>只能调整实验员和计划完成时间，DOE 设计参数保持锁定。</div></div><div class="field"><label>实验员</label><select class="ctrl" id="doeEditOwner">'+opts+'</select></div><div class="field"><label>计划完成时间</label><input class="ctrl" id="doeEditDue" type="date" value="'+esc(e.dueDate||'')+'"></div>',footer:'<button class="btn" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="saveDoeExecutionEdit(\''+id+'\')">保存</button>'});}
function saveDoeExecutionEdit(id){var e=findExp(id);e.owner=$('doeEditOwner').value;e.dueDate=$('doeEditDue').value;e.runs.forEach(function(r){r.owner=e.owner;r.dueDate=e.dueDate;});closeModal();toast('DOE 实验主数据已更新','ok');renderDoeExecutionDetail(e);}
function copyDoeExecution(id){var e=findExp(id);toast('DOE 执行实验不能单独复制，已前往所属方案；请复制方案后重新下发','info');showPage('exp:doe');}
function deleteDoeExecution(id){var e=findExp(id);confirmBox('删除 DOE 实验','确定删除执行实验 <b>'+esc(e.name)+'</b>？DOE 设计方案不会被删除。',function(){experiments=experiments.filter(function(x){return x.id!==id;});doeRuns=doeRuns.filter(function(r){return r.parentExecutionId!==id;});var s=findScheme(e.schemeId);if(s&&s.status!=='草稿')s.status='待下发';toast('DOE 实验已删除','ok');showPage('exp:list');},{danger:true,okText:'删除'});}

function pHead(e){
  var h='<div class="card"><div class="card-hd" style="background:#fafafa">'+
       '<h3 style="font-size:13.5px">所属项目</h3><span class="sub">多对多关联，支持同时挂在多个项目下</span></h3></div>'+
       '<div class="card-b"><div class="proj-tags">';
  if(!e.projectIds.length)h+='<span class="muted">未挂项目 · 可点击下方按钮关联</span>';
  e.projectIds.forEach(function(pid){
    var p=findProj(pid);
    h+='<span class="proj-tag"><span class="ptx" onclick="showPage(\'proj:detail\',{id:\''+pid+'\'})">'+esc(p?p.name:pid)+'</span>'+
       '<span class="px" title="解除关联" onclick="detachExpProject(\''+e.id+'\',\''+pid+'\')">×</span></span>';
  });
  h+='<span class="proj-add" onclick="openAddProject(\''+e.id+'\')">＋ 关联项目</span></div></div></div>';
  return h;
}

/* 实验侧解除项目关联（轻量：直接移除并重绘，项目侧移除走确认框） */
function detachExpProject(eid,pid){
  var e=findExp(eid); if(!e)return;
  var p=findProj(pid);
  removeExpProject(eid,pid);
  toast('已解除与「'+(p?p.name:pid)+'」的关联','ok');
  if(curPage==='exp:detail')renderDetailTabs(e);
  else if(curPage==='exp:list'&&typeof renderExpRows==='function')renderExpRows();
}
function openAddProject(eid){
  var e=findExp(eid); if(!e)return;
  var opts=PROJECTS.map(function(p){
    return '<label style="display:flex;align-items:center;gap:8px;padding:6px 0"><input type="checkbox" value="'+esc(p.id)+'"'+(e.projectIds.indexOf(p.id)>=0?' checked':'')+' data-pid>'+
           esc(p.name)+'</label>';
  }).join('');
  openModal({
    title:'关联项目',
    body:'<div style="margin-bottom:10px;font-size:13px;color:var(--muted)">勾选要关联的项目（可多选），保存后会立即生效并出现在列表与项目详情中</div>'+opts,
    footer:'<button class="btn" onclick="closeModal()">取消</button>'+
           '<button class="btn btn-primary" onclick="saveAddProject(\''+eid+'\')">保存</button>'
  });
}
function saveAddProject(eid){
  var picks=$$('[data-pid]').filter(function(c){return c.checked;}).map(function(c){return c.value;});
  var e=findExp(eid);
  if(e)e.projectIds=picks;
  closeModal();
  toast('已更新关联项目','ok');
  if(curPage==='exp:detail'){
    var cur=$(document.querySelector('#detailTabs .tabs button.on')||document.createElement('div'));
    renderDetailTabs(e);
  }
  if(curPage==='exp:list')renderExpRows();
}

function renderTabBody(tb,e,key){
  if(key==='design'){ tb.innerHTML=tabDesign(e); return; }
  if(key==='task'){ tb.innerHTML=tabTask(e); return; }
  if(key==='exec'){ tb.innerHTML=tabExec(e); return; }
  if(key==='entry'){ tb.innerHTML=tabEntry(e); return; }
  if(key==='summary'){ tb.innerHTML=tabSummary(e); return; }
  if(key==='recipe'){ tb.innerHTML=tabRecipe(e); return; }
}

function tabDesign(e){
  if(e.status==='待配置'){
    return '<div class="empty"><span class="ei">📋</span>该实验尚未完成设计配置<br><br>'+
           '<button class="btn btn-primary" onclick="openWizardEdit(\''+e.id+'\')">开始配置设计</button></div>';
  }
  var isDoe=(e.source==='DOE'&&e.schemeId);
  var h='<div class="card"><div class="card-hd"><h3>实验设计'+(isDoe?'（只读）':'')+'</h3><span class="sub">'+esc(e.type)+' · '+e.factors.length+' 因子 · '+e.centerPoints+' 中心点</span></h3></div>';
  if(isDoe){
    var _ds=findScheme(e.schemeId);
    h+='<div class="card-b"><div class="notice notice-warn" style="margin:0"><i class="ni">!</i><div>'+
       '本记录是 DOE 方案 <b>'+esc(e.schemeId)+'</b>（'+esc(_ds?_ds.name:'')+'）下发的第 <b>'+pad2(e.runSeq)+'</b> 组运行，'+
       '设计参数由方案统一锁定，<b>不允许单独修改</b>。如需调整请先复制方案或撤回下发。'+
       '<div style="margin-top:6px"><button class="btn" onclick="showPage(\'exp:doe\')">前往 DOE 方案</button></div></div></div>';
  }
  h+='<div class="card-b"><div class="desc">';
  e.factors.forEach(function(f){
    h+='<div class="di"><div class="dl">'+esc(f.name)+(f.unit?' ('+esc(f.unit)+')':'')+'</div>'+
       '<div class="dv">'+esc((f.levels||activeLevels(f)).join(' / '))+'</div></div>';
  });
  h+='</div><div class="divider"></div>';
  h+='<div class="flex"><span class="muted">响应变量：</span><span>'+e.responses.map(function(r){return '<span class="tag tag-blue">'+esc(r)+'</span>';}).join(' ')+'</span></div>';
  h+='<div class="flex mt"><span class="muted">实验次数：</span><span class="b" style="font-size:18px;color:var(--primary)">'+e.plan.length+'</span></div>';
  h+='<div class="mt-lg">'+(isDoe
        ? '<button class="btn" disabled title="DOE 运行记录的设计参数由方案锁定" style="opacity:.5;cursor:not-allowed">编辑设计（已锁定）</button>'
        : '<button class="btn" onclick="openWizardEdit(\''+e.id+'\')">编辑设计</button>')+
     ' <button class="btn" onclick="exportPlanCSV(\''+e.id+'\')">导出计划 CSV</button></div>';
  h+='</div></div>';
  return h;
}

function tabTask(e){
  var tasks=[
    {task:'试剂/原料准备',owner:e.assignee||'李工',due:e.dueDate||'2026-09-10',status:'已完成'},
    {task:'设备预约与校准',owner:'李工',due:e.dueDate||'2026-09-10',status:'已完成'},
    {task:'按计划表执行 '+e.plan.length+' 组实验',owner:e.assignee||'李工',due:e.dueDate||'2026-09-25',status:e.status==='待配置'?'未开始':(e.status==='待执行'?'进行中':'已完成')},
    {task:'数据录入与初步整理',owner:e.creator||'王研究员',due:e.dueDate||'2026-09-28',status:e.status==='已录入数据'||e.status==='已分析'||e.status==='已结案'?'已完成':'未开始'},
    {task:'建模分析与报告',owner:e.creator||'王研究员',due:e.dueDate||'2026-09-30',status:e.status==='已分析'||e.status==='已结案'?'已完成':'未开始'}
  ];
  var tag={已完成:'tag-green',进行中:'tag-blue',未开始:'tag-grey'};
  var h='<div class="card"><div class="card-b tight"><div class="tbl-wrap"><table class="tbl">'+
       '<thead><tr><th>任务</th><th>执行人</th><th>截止时间</th><th>状态</th></tr></thead><tbody>'+
       tasks.map(function(t){
         return '<tr><td><b>'+esc(t.task)+'</b></td><td>'+esc(t.owner)+'</td><td>'+esc(t.due)+'</td>'+
                '<td><span class="tag '+tag[t.status]+' tag-dot">'+esc(t.status)+'</span></td></tr>';
       }).join('')+
       '</tbody></table></div></div></div>';
  return h;
}

function tabExec(e){
  if(e.status==='待配置'||e.status==='待执行'){
    return '<div class="empty"><span class="ei">🕐</span>实验尚未开始执行<br><br><span class="muted">执行记录会在实验员按计划表开始第一组实验后自动生成</span></div>';
  }
  var h='<div class="card"><div class="card-b"><div class="tl">';
  var events=[
    {t:'计划下发',d:e.createTime,s:'ok'},
    {t:'开始第一组实验',d:e.createTime.split(' ')[0]+' 09:12',s:'ok'},
    {t:'取样检测（Run 5）',d:e.createTime.split(' ')[0]+' 14:30',s:'ok'},
    {t:'取样检测（Run 12）',d:e.createTime.split(' ')[0]+' 16:45',s:'ok'},
    {t:'数据录入完成',d:e.createTime.split(' ')[0]+' 18:20',s:'ok'}
  ];
  events.forEach(function(ev){
    h+='<div class="tl-item '+ev.s+'"><div class="tt">'+esc(ev.t)+'</div><div class="td">'+esc(ev.d)+'</div></div>';
  });
  h+='</div></div></div>';
  return h;
}

function tabEntry(e){
  return renderEntryHTML(e);
}

function tabSummary(e){
  if(e.status==='待配置'||e.status==='待执行'){
    return '<div class="empty"><span class="ei">📄</span>实验尚未完成，无总结报告<br><br><span class="muted">完成数据录入与分析后将自动生成总结报告</span></div>';
  }
  var h='<div class="card"><div class="card-hd"><h3>实验总结报告 · '+esc(e.id)+'</h3>'+
       '<div class="acts"><button class="btn" onclick="toast(\'已导出为 PDF（演示）\')">📄 导出</button></div></div>';
  h+='<div class="card-b"><h4 style="margin-bottom:10px">一、实验目的</h4>'+
     '<p>针对 '+esc((e.projectIds.length?findProj(e.projectIds[0]).name:'当前项目'))+' ，通过 '+esc(e.type)+' 方法，研究 '+e.factors.map(function(f){return esc(f.name);}).join('、')+
     ' 对 '+e.responses.map(esc).join('、')+' 的影响规律，识别关键因子并推荐最佳工艺参数。</p>'+
     '<h4 style="margin:18px 0 10px">二、研究内容</h4>'+
     '<p>按 DOE 设计共完成 '+e.plan.length+' 组实验（其中 '+e.centerPoints+' 组中心点），对响应变量进行 ANOVA 分析，并基于模型预测最优工艺参数。</p>'+
     '<h4 style="margin:18px 0 10px">三、结果与分析</h4>'+
     '<p>温度为最显著影响因子（P&lt;0.01），催化剂次之；建议在最佳工艺条件下进行 3 次验证实验以确认模型预测。</p>'+
     '<h4 style="margin:18px 0 10px">四、结论与建议</h4>'+
     '<p>采用推荐的最佳工艺参数，预计'+esc(e.responses[0])+'可达到预期目标。建议后续开展中试放大验证。</p>'+
     '</div></div>';
  return h;
}

function tabRecipe(e){
  /* 配方记录（权限脱敏演示）—— 数据源统一走 expRecipeOf()，与 SDS 步骤②「从实验配方引入」同源 */
  var rec=expRecipeOf(e.id);
  var hasPerm=window._recipePerm===undefined?true:window._recipePerm;
  var h='<div class="card"><div class="card-hd">'+
       '<h3>配方记录 <span class="sub">'+esc(rec.code)+' · '+esc(rec.ver)+' · '+esc(rec.product)+'</span></h3>'+
       '<div class="acts"><div class="perm-switch">'+
         '<button class="'+(hasPerm?'on':'')+'" onclick="setRecipePerm(true)">有权限</button>'+
         '<button class="'+(!hasPerm?'on':'')+'" onclick="setRecipePerm(false)">无权限</button>'+
       '</div></div></div>';
  h+='<div class="card-b"><div class="notice notice-warn mb"><i class="ni">!</i><div>无权限时，真实名称与含量按规则脱敏显示（成分身份不可隐藏）</div></div>'+
     '<div class="tbl-wrap"><table class="tbl">'+
     '<thead><tr><th>组分代码</th><th>真实名称</th><th>CAS 号</th><th style="text-align:right">含量 %</th></tr></thead><tbody>'+
     rec.rows.map(function(r){
       return '<tr><td><b>'+esc(r.code)+'</b></td>'+
         '<td>'+(hasPerm?matLink(r.name):'<span class="sens-val masked">原料-'+esc(r.code)+'</span>')+'</td>'+
         '<td class="mono"><a class="mat-link" href="javascript:void(0)" onclick="compOpen(\''+esc(r.cas)+'\')">'+esc(r.cas)+'</a></td>'+
         '<td class="num">'+(hasPerm?r.pct:'<span class="sens-val masked">**</span>')+'</td>'+
       '</tr>';
     }).join('')+
     '</tbody></table></div></div></div>';
  return h;
}
function setRecipePerm(v){ window._recipePerm=v; if(curPage==='exp:detail')renderTabBody(document.getElementById('detailBody'),findExp(curDetailId),curDetailTab); }

function exportPlanCSV(id){
  var e=findExp(id); if(!e)return;
  var head=['运行序','标准序'];
  e.factors.forEach(function(f){head.push(f.name+(f.unit?'('+f.unit+')':''));});
  if(e.center)head.push('中心点');
  e.responses.forEach(function(r){head.push(r);});
  var rows=[head];
  e.plan.forEach(function(r){
    var line=[r.runOrder,r.stdOrder];
    r.combo.forEach(function(v){line.push(v);});
    if(e.center)line.push(r.center?'是':'');
    e.responses.forEach(function(rn){line.push(r.res&&r.res[rn]!==undefined?r.res[rn]:'');});
    rows.push(line);
  });
  var csv=rows.map(function(r){return r.map(function(c){return /[",\n]/.test(c)?('"'+c.replace(/"/g,'""')+'"'):c;}).join(',');}).join('\n');
  downloadFile(e.id+'_实验计划.csv',csv,'text/csv;charset=utf-8');
  toast('已导出 '+e.id+' 实验计划 CSV','ok');
}

/* ==================================================================
   exp:wizard · DOE 设计向导 4 步
   ================================================================== */
var wizard={mode:'new',editId:'',step:1,draft:null,target:'scheme',projectId:''};

regPage('exp:wizard',{
  title:'DOE 设计向导',
  crumb:['实验管理','DOE 实验设计','设计向导'],
  render:function(params){
    wizard.mode=(params&&params.mode)||'new';
    wizard.editId=(params&&params.id)||'';
    wizard.projectId=(params&&params.projectId)||'';
    /* target：scheme=编辑 DOE 方案（默认）；exp=兼容旧的单条实验记录 */
    wizard.target=(params&&params.target)||((wizard.mode==='edit'&&!findScheme(wizard.editId))?'exp':'scheme');
    wizard.draft=null;
    if(wizard.mode==='edit'&&wizard.editId){
      var src=(wizard.target==='exp')?findExp(wizard.editId):(findScheme(wizard.editId)||findExp(wizard.editId));
      if(src){
        wizard.draft=JSON.parse(JSON.stringify({
          type:src.type,
          basic:{id:src.id,name:src.name,assignee:src.assignee||src.owner||'',dueDate:src.dueDate||'',relatedExp:src.relatedExp||''},
          factors:JSON.parse(JSON.stringify(src.factors||defaultFactors(src.type))),
          responses:(src.responses||[]).slice(),
          centerPoints:src.centerPoints,randomize:src.randomize,
          projectIds:(src.projectIds||[]).slice()
        }));
      }
    }
    if(!wizard.draft){
      wizard.draft={type:'全因子/部分因子设计',basic:{id:'',name:'',assignee:'李工',dueDate:daysFromNow(14),relatedExp:''},
        factors:defaultFactors('全因子/部分因子设计'),
        responses:[{name:'产率 %',goal:'max'},{name:'成本 元/kg',goal:'min'}],
        centerPoints:3,randomize:true,projectIds:wizard.projectId?[wizard.projectId]:[]};
    }
    wizard.step=1;
    renderWizard();
  }
});

function renderWizard(){
  var h='';
  h+='<div class="page-hd"><div class="t"><h1>DOE 设计向导</h1>'+
     '<div class="page-sub">通过 4 步引导完成 '+esc(wizard.draft.type)+' 的试验设计，并生成试验矩阵；'+
     '方案需回到「DOE 实验设计」页<b>确认下发</b>后，才会生成正式实验记录</div></div></div>';
  /* 步骤条 */
  var steps=[
    {k:1,t:'① 选择实验设计类型'},
    {k:2,t:'② 配置因子与水平'},
    {k:3,t:'③ 生成试验矩阵'},
    {k:4,t:'④ 确认并生成计划'}
  ];
  h+='<div class="steps">';
  steps.forEach(function(s,i){
    var cls='';
    if(wizard.step===s.k)cls='on';
    else if(wizard.step>s.k)cls='done';
    h+='<div class="step '+cls+'" onclick="jumpStep('+s.k+')" '+(cls==='done'?'style="cursor:pointer"':'')+'>'+
       '<div class="sd">'+(cls==='done'?'✓':s.k)+'</div>'+
       '<div class="stx"><div class="t">'+esc(s.t)+'</div></div></div>'+
       (i<steps.length-1?'<div class="sline"></div>':'');
  });
  h+='</div>';
  if(wizard.step===1)h+=step1HTML();
  else if(wizard.step===2)h+=step2HTML();
  else if(wizard.step===3)h+=step3HTML();
  else if(wizard.step===4)h+=step4HTML();
  $('pageHost').innerHTML=h;
}

function jumpStep(s){
  if(s<wizard.step)wizard.step=s;
  else if(s>wizard.step){
    if(!validateStep(wizard.step))return;
    wizard.step=s;
  }
  renderWizard();
}
function validateStep(s){
  if(s===2){
    if(!wizard.draft.factors.length){toast('请至少添加 1 个因子','warn');return false;}
    for(var i=0;i<wizard.draft.factors.length;i++){
      var f=wizard.draft.factors[i];
      if(!f.name){toast('第 '+(i+1)+' 个因子未填写名称','warn');return false;}
      if(f.type==='numeric'&&(!f.low||!f.high)){toast('因子 '+f.name+' 的数值范围未填写完整','warn');return false;}
      if(f.type==='categorical'&&(!f.levels||f.levels.length<1)){toast('因子 '+f.name+' 的水平数 ≥ 1','warn');return false;}
    }
    if(!wizard.draft.responses.length){toast('请至少添加 1 个响应变量','warn');return false;}
  }
  if(s===3){
    if(!validateNumericSum()){toast('实验名称不能为空','warn');return false;}
  }
  return true;
}
function validateNumericSum(){
  return !!wizard.draft.basic.name;
}

function stepNavBtn(cur){
  var isLast=cur===4;
  return '<div class="flex mt-lg"><div class="spacer"></div>'+
    '<button class="btn" onclick="wizard.step='+(cur-1)+';renderWizard()"'+(cur===1?' style="display:none"':'')+'>上一步</button>'+
    '<button class="btn btn-primary" onclick="wizard.step='+(cur+1)+';renderWizard()"'+(isLast?' style="display:none"':'')+'>下一步</button>'+
    '</div>';
}

function step1HTML(){
  var h='<div class="card"><div class="card-b">';
  h+='<div class="notice notice-info mb"><i class="ni">ℹ</i><div><b>第一版仅支持全因子设计</b>，其他类型在列表中可见（历史/外部系统导入数据），向导会在后续版本支持</div></div>';
  h+='<div class="card-grid g2">';
  TYPE_DEFS.forEach(function(t){
    var isOn=wizard.draft.type===t.key;
    h+='<div class="card" style="cursor:pointer" onclick="selectType(\''+esc(t.key)+'\')">'+
       '<div class="card-b" style="border:2px solid '+(isOn?'var(--primary)':'var(--line)')+';border-radius:var(--radius);background:'+(isOn?'var(--primary-soft)':'#fff')+'">'+
       '<div style="font-size:24px;margin-bottom:6px">'+t.ico+'</div>'+
       '<h3 style="font-size:15px;margin-bottom:4px">'+esc(t.key)+(t.ready?'':' <span class="tag tag-grey">后续版本</span>')+'</h3>'+
       '<div class="muted" style="font-size:12.5px;line-height:1.7">'+
         '<div>场景：'+esc(t.scene)+'</div><div>解决：'+esc(t.solve)+'</div></div>'+
       '</div></div>';
  });
  h+='</div></div></div>';
  h+=stepNavBtn(1);
  return h;
}
function selectType(k){
  if(k!=='全因子/部分因子设计'){
    toast('该设计类型将在后续版本支持，本次演示使用全因子设计','info');
    return;
  }
  wizard.draft.type=k;
  wizard.draft.factors=defaultFactors(k);
  renderWizard();
}

function step2HTML(){
  var h='';
  h+='<div class="card"><div class="card-hd"><h3>① 因子配置</h3><span class="sub">数值型填 low/high，类别型填多个水平</span></h3></div>';
  h+='<div class="card-b"><div class="tbl-wrap"><table class="tbl fac-tbl">'+
     '<thead><tr><th>因子名称</th><th>类型</th><th>取值/水平</th><th>说明</th><th style="width:1%">操作</th></tr></thead><tbody>';
  wizard.draft.factors.forEach(function(f,idx){
    h+=factorRowHTML(f,idx);
  });
  h+='</tbody></table><div class="mt"><button class="btn" onclick="addFactor()">＋ 添加因子</button></div>';
  /* 次数预览 */
  var counts=wizard.draft.factors.map(activeLevels).map(function(l){return l.length;});
  var valid=counts.every(function(c){return c>=1;});
  var cp=parseInt(wizard.draft.centerPoints,10)||0;
  if(!valid)h+='<div class="plan-note mt"><span style="color:var(--warning)">⚠️ 请完善每个因子的取值/水平（数值型需填写低值与高值，类别型至少 1 个水平）</span></div>';
  else{
    var prod=counts.reduce(function(a,b){return a*b;},1);
    var total=prod+cp;
    var expr=counts.join('×');
    h+='<div class="plan-note mt"><b>预计实验次数：'+total+' 次</b>（<span class="mono">'+expr+'</span> + '+cp+' 中心点），'+
       (wizard.draft.type==='全因子/部分因子设计'?'完整全因子设计，可评估所有主效应及交互作用。':'按当前因子估算实验规模（规划中设计，实际规模以算法为准）。')+'</div>';
  }
  h+='</div></div>';

  /* ② 响应变量 */
  h+='<div class="card"><div class="card-hd"><h3>② 响应变量</h3><span class="sub">每个响应变量都会单独建模分析</span></h3></div>';
  h+='<div class="card-b"><div class="resp-grid">';
  wizard.draft.responses.forEach(function(r,i){
    h+='<div class="resp-card"><div class="rc-hd"><div class="rn">'+
       '<input class="input" value="'+esc(r.name)+'" oninput="wizard.draft.responses['+i+'].name=this.value;updateResp();"></div>'+
       (wizard.draft.responses.length>1?'<span class="rc-del" onclick="delResp('+i+')">×</span>':'')+
       '</div>'+
       '<div class="field" style="margin-bottom:0"><label>目标方向</label>'+
       '<select class="ctrl" onchange="wizard.draft.responses['+i+'].goal=this.value">'+
         '<option value="max"'+(r.goal==='max'?' selected':'')+'>最大化</option>'+
         '<option value="min"'+(r.goal==='min'?' selected':'')+'>最小化</option>'+
         '<option value="target"'+(r.goal==='target'?' selected':'')+'>目标值</option>'+
       '</select></div></div>';
  });
  h+='<button class="btn mt" onclick="addResp()">＋ 添加响应变量</button>';
  h+='</div></div>';

  /* ③ 附加选项 */
  h+='<div class="card"><div class="card-hd"><h3>③ 附加选项</h3></h3></div>';
  h+='<div class="card-b"><div class="field-row">'+
     '<div class="field"><label>中心点数量</label><select class="ctrl" id="cpSel" onchange="wizard.draft.centerPoints=parseInt(this.value,10);updatePlanCount()">'+
       [0,1,2,3,4,5].map(function(n){return '<option value="'+n+'"'+(wizard.draft.centerPoints===n?' selected':'')+'>'+n+'</option>';}).join('')+
     '</select></div>'+
     '<div class="field"><label style="display:flex;align-items:center;gap:6px;cursor:pointer">'+
       '<input type="checkbox" id="rdChk"'+(wizard.draft.randomize?' checked':'')+' onchange="wizard.draft.randomize=this.checked"> 随机化运行顺序</label></div>'+
     '</div></div></div>';

  h+=stepNavBtn(2);
  return h;
}
function factorRowHTML(f,i){
  var sel=function(v){return f.type===v?' selected':''};
  var valCell='';
  if(f.type==='numeric'){
    valCell='<div class="val-cell">'+
      '<input class="input" value="'+esc(f.low||'')+'" placeholder="低值" oninput="wizard.draft.factors['+i+'].low=this.value;wizard.draft.factors['+i+'].levels=[this.value, wizard.draft.factors['+i+'].high];updatePlanCount()">'+
      '<span style="color:var(--muted)">~</span>'+
      '<input class="input" value="'+esc(f.high||'')+'" placeholder="高值" oninput="wizard.draft.factors['+i+'].high=this.value;wizard.draft.factors['+i+'].levels=[wizard.draft.factors['+i+'].low, this.value];updatePlanCount()">'+
      '<span class="unit">'+esc(f.unit||'')+'</span></div>';
  }else{
    var levels=f.levels||[f.level1,f.level2,f.level3].filter(Boolean);
    valCell='<div class="val-cell">'+
      levels.map(function(v,vi){
        return '<input class="input" value="'+esc(v)+'" placeholder="水平 '+(vi+1)+'" oninput="wizard.draft.factors['+i+'].levels['+vi+']=this.value;updatePlanCount()">';
      }).join('<span style="color:var(--muted)">,</span>')+
      '<button class="btn btn-sm" onclick="addLevel('+i+')">＋</button>'+
      (levels.length>1?'<button class="btn btn-sm" onclick="delLevel('+i+')">－</button>':'')+
      '</div>';
  }
  return '<tr>'+
    '<td><input class="input" value="'+esc(f.name)+'" oninput="wizard.draft.factors['+i+'].name=this.value"></td>'+
    '<td><select class="ctrl" onchange="changeFType('+i+',this.value)">'+
      '<option value="numeric"'+sel('numeric')+'>数值</option>'+
      '<option value="categorical"'+sel('categorical')+'>类别</option>'+
    '</select></td>'+
    '<td>'+valCell+'</td>'+
    '<td><input class="input" value="'+esc(f.desc||'')+'" oninput="wizard.draft.factors['+i+'].desc=this.value"></td>'+
    '<td><button class="btn-link danger" onclick="delFactor('+i+')">删除</button></td>'+
  '</tr>';
}
function addFactor(){
  wizard.draft.factors.push({name:'新因子',type:'numeric',unit:'',low:'',high:'',levels:['',''],desc:''});
  renderWizard();
}
function delFactor(i){
  wizard.draft.factors.splice(i,1); renderWizard();
}
function changeFType(i,v){
  var f=wizard.draft.factors[i]; f.type=v;
  if(v==='numeric'){ f.low=f.levels&&f.levels[0]||''; f.high=f.levels&&f.levels[1]||''; f.levels=[f.low,f.high]; }
  else{ f.levels=f.levels&&f.levels.length?f.levels:['水平1','水平2']; }
  renderWizard();
}
function addLevel(i){ wizard.draft.factors[i].levels=wizard.draft.factors[i].levels.concat(['']); renderWizard(); }
function delLevel(i){ wizard.draft.factors[i].levels.pop(); renderWizard(); }
function addResp(){ wizard.draft.responses.push({name:'响应 '+(wizard.draft.responses.length+1),goal:'max'}); renderWizard(); }
function delResp(i){ wizard.draft.responses.splice(i,1); renderWizard(); }
function updateResp(){/* 仅 re-render 名引用即可 */}

function updatePlanCount(){
  /* 简单触发步骤②预览框刷新：整张表重绘太重，只更新计数框 */
  var counts=wizard.draft.factors.map(activeLevels).map(function(l){return l.length;});
  var valid=counts.every(function(c){return c>=1;});
  var cp=parseInt(wizard.draft.centerPoints,10)||0;
  if(!valid)return;
  var prod=counts.reduce(function(a,b){return a*b;},1);
  var total=prod+cp;
  var expr=counts.join('×');
  var planNote=document.querySelector('.plan-note');
  if(planNote)planNote.innerHTML='<b>预计实验次数：'+total+' 次</b>（<span class="mono">'+expr+'</span> + '+cp+' 中心点）';
}

function step3HTML(){
  var plan=generatePlan(wizard.draft.factors,wizard.draft.centerPoints,wizard.draft.randomize,(wizard.draft.basic.id||'w'));
  var h='';
  /* 1) 顶部说明 banner：独占一行 */
  h+='<div class="card"><div class="card-b">'+
     '<div class="notice notice-info" style="margin:0"><i class="ni">ℹ</i><div>系统已根据因子配置<b>穷举生成全因子组合</b>，并追加 '+wizard.draft.centerPoints+' 个中心点（<span style="color:#ad6800;background:#fff7e6;padding:0 4px;border-radius:2px">浅黄行</span>），运行序号已'+(wizard.draft.randomize?'随机化':'按标准序')+'。</div></div>'+
     '</div></div>';
  /* 2) 4 个统计指标：独占一行，并列展示 */
  h+='<div class="card"><div class="card-b"><div class="card-grid g4">'+
     '<div class="stat-box"><div class="v">'+wizard.draft.factors.length+'</div><div class="l">因子数</div></div>'+
     '<div class="stat-box primary"><div class="v">'+plan.filter(function(r){return !r.center;}).length+'</div><div class="l">析因实验</div></div>'+
     '<div class="stat-box warn"><div class="v">'+plan.filter(function(r){return r.center;}).length+'</div><div class="l">中心点</div></div>'+
     '<div class="stat-box ok"><div class="v">'+plan.length+'</div><div class="l">实验总次数</div></div>'+
     '</div></div></div>';
  /* 3) 实验计划表：独占一行，不受上方并列布局影响 */
  h+='<div class="card" style="margin:0"><div class="card-hd"><h3>实验计划表</h3><span class="sub">表格可滚动，浅黄行为中心点</span></h3></div>';
  h+='<div class="card-b tight"><div class="plan-tbl"><table class="tbl">'+
     '<thead><tr><th>运行序</th><th>标准序</th>'+wizard.draft.factors.map(function(f){return '<th>'+esc(f.name)+(f.unit?' ('+esc(f.unit)+')':'')+'</th>';}).join('')+
     (wizard.draft.centerPoints?'<th>中心点</th>':'')+'</tr></thead><tbody>';
  plan.forEach(function(r){
    h+='<tr class="'+(r.center?'center-row':'')+'">'+
      '<td>'+r.runOrder+'</td>'+
      '<td class="muted">'+r.stdOrder+'</td>'+
      r.combo.map(function(v){return '<td>'+esc(v)+'</td>';}).join('')+
      (wizard.draft.centerPoints?'<td>'+(r.center?'<span class="tag tag-orange">中心点</span>':'')+'</td>':'')+
    '</tr>';
  });
  h+='</tbody></table></div></div></div>';
  h+='<div class="flex mt">';
  h+='<button class="btn" onclick="exportDraftPlan()">📥 导出实验计划</button>';
  h+='<div class="spacer"></div>';
  h+='<button class="btn" onclick="wizard.step=2;renderWizard()">上一步</button>';
  h+='<button class="btn btn-primary" onclick="wizard.step=4;renderWizard()">下一步</button>';
  h+='</div>';
  h+='</div></div>';
  wizard._plan=plan;
  return h;
}
function exportDraftPlan(){
  var plan=wizard._plan||[];
  var head=['运行序','标准序'].concat(wizard.draft.factors.map(function(f){return f.name;}));
  if(wizard.draft.centerPoints)head.push('中心点');
  var rows=[head];
  plan.forEach(function(r){
    var line=[r.runOrder,r.stdOrder].concat(r.combo.map(function(v){return v;}));
    if(wizard.draft.centerPoints)line.push(r.center?'是':'');
    rows.push(line);
  });
  var csv=rows.map(function(r){return r.map(function(c){return /[",\n]/.test(c)?('"'+c.replace(/"/g,'""')+'"'):c;}).join(',');}).join('\n');
  downloadFile('DOE实验计划.csv',csv,'text/csv;charset=utf-8');
  toast('已导出实验计划 CSV','ok');
}

function step4HTML(){
  var e=(wizard.target==='exp')?findExp(wizard.editId):findScheme(wizard.editId);
  var h='<div class="card"><div class="card-b">';
  h+='<div class="card-grid g4 mb">'+
     '<div class="metric-card"><div class="mv">'+esc(wizard.draft.type)+'</div><div class="ml">设计类型</div></div>'+
     '<div class="metric-card"><div class="mv">'+wizard.draft.factors.length+'</div><div class="ml">因子数</div></div>'+
     '<div class="metric-card"><div class="mv">'+(wizard._plan?wizard._plan.length:'?')+'</div><div class="ml">实验总次数</div></div>'+
     '<div class="metric-card hl"><div class="mv">'+(wizard._plan?wizard._plan.filter(function(r){return r.center;}).length:'?')+'</div><div class="ml">中心点</div></div>'+
     '</div>';
  h+='<div class="fold open"><div class="fold-hd"><div class="ft">基础信息</div></div><div class="fold-bd"><div class="field-row">'+
     '<div class="field"><label>实验编号</label><input class="input" value="'+esc(wizard.draft.basic.id)+'" oninput="wizard.draft.basic.id=this.value"'+(e?' readonly':'')+'></div>'+
     '<div class="field"><label>实验名称 *</label><input class="input" value="'+esc(wizard.draft.basic.name)+'" oninput="wizard.draft.basic.name=this.value"></div>'+
     '<div class="field"><label>指派实验员</label><select class="ctrl" onchange="wizard.draft.basic.assignee=this.value">'+
       USERS.map(function(u){return '<option value="'+esc(u.id)+'"'+(wizard.draft.basic.assignee===u.id?' selected':'')+'>'+esc(u.name)+'（'+esc(u.role)+'）</option>';}).join('')+
     '</select></div>'+
     '<div class="field"><label>计划完成日期</label><input class="input" type="date" value="'+esc(wizard.draft.basic.dueDate)+'" oninput="wizard.draft.basic.dueDate=this.value"></div>'+
     '<div class="field" style="grid-column:span 2"><label>所属项目 <span class="muted">（下发前必选）</span></label><div class="proj-tags">'+
       wzProjTags()+
       '<span class="proj-add" onclick="wzOpenProj()">＋ 选择项目</span></div></div>'+
     '<div class="field" style="grid-column:span 2"><label>响应变量</label><div>'+wizard.draft.responses.map(function(r){return '<span class="tag tag-blue">'+esc(r.name)+' <span class="muted">·</span> '+({max:'最大化',min:'最小化',target:'目标值'}[r.goal])+'</span>';}).join(' ')+'</div></div>'+
     '</div></div></div>';

  h+='<div class="fold open"><div class="fold-hd"><div class="ft">因子与水平</div></div><div class="fold-bd"><div class="tbl-wrap"><table class="tbl">'+
     '<thead><tr><th>因子</th><th>类型</th><th>水平</th><th>说明</th></tr></thead><tbody>'+
     wizard.draft.factors.map(function(f){
       return '<tr><td><b>'+esc(f.name)+'</b></td><td>'+esc(f.type==='numeric'?'数值':'类别')+'</td>'+
              '<td class="mono">'+(f.levels||activeLevels(f)).join(' / ')+(f.unit?' '+esc(f.unit):'')+'</td>'+
              '<td>'+esc(f.desc||'—')+'</td></tr>';
     }).join('')+
     '</tbody></table></div></div></div>';

  h+='<div class="flex mt-lg">';
  h+='<div class="spacer"></div>';
  h+='<button class="btn" onclick="wizard.step=3;renderWizard()">上一步</button>';
  h+='<button class="btn btn-primary" onclick="confirmDispatch()">✓ 生成实验计划</button>';
  h+='</div>';
  h+='</div></div>';
  return h;
}
/* 向导内「所属项目」标签区 */
function wzProjTags(){
  var ids=wizard.draft.projectIds||[];
  if(!ids.length)return '<span class="muted">未挂项目</span>';
  return ids.map(function(pid){
    var p=findProj(pid);
    return '<span class="proj-tag"><span class="ptx">'+esc(p?p.name:pid)+'</span>'+
           '<span class="px" onclick="wzToggleProj(\''+esc(pid)+'\')">×</span></span>';
  }).join('');
}
/* 向导内选择所属项目 */
function wzToggleProj(pid){
  wizard.draft.projectIds=(wizard.draft.projectIds||[]).filter(function(x){return x!==pid;});
  renderWizard();
}
function wzOpenProj(){
  var cur=wizard.draft.projectIds||[];
  var opts=PROJECTS.map(function(p){
    return '<label style="display:flex;align-items:center;gap:8px;padding:6px 0">'+
      '<input type="checkbox" value="'+esc(p.id)+'"'+(cur.indexOf(p.id)>=0?' checked':'')+' data-wzpid> '+esc(p.name)+'</label>';
  }).join('');
  openModal({title:'选择所属项目',width:480,body:opts,
    footer:'<button class="btn" onclick="closeModal()">取消</button>'+
           '<button class="btn btn-primary" onclick="wzSaveProj()">保存</button>'});
}
function wzSaveProj(){
  wizard.draft.projectIds=$$('[data-wzpid]').filter(function(c){return c.checked;}).map(function(c){return c.value;});
  closeModal(); renderWizard();
}
function confirmDispatch(){
  if(!wizard.draft.basic.name){toast('实验名称必填','warn');return;}
  if(wizard.target!=='exp'&&!(wizard.draft.projectIds||[]).length){
    toast('请先选择所属项目，下发后才能归属到项目','warn');
    return;
  }
  if(!wizard.draft.basic.id){
    var nid='DOE-2026-'+String(Math.floor(Math.random()*9000)+1000);
    wizard.draft.basic.id=nid;
  }
  var base={
    id:wizard.draft.basic.id,
    name:wizard.draft.basic.name,
    type:wizard.draft.type,
    factors:JSON.parse(JSON.stringify(wizard.draft.factors)),
    responses:wizard.draft.responses.map(function(r){return r.name;}),
    centerPoints:parseInt(wizard.draft.centerPoints,10)||0,
    randomize:wizard.draft.randomize,
    projectIds:(wizard.draft.projectIds||[]).slice(),
    assignee:wizard.draft.basic.assignee,
    dueDate:wizard.draft.basic.dueDate,
    creator:'王研究员',createTime:nowStr(),
    relatedExp:wizard.draft.basic.relatedExp||null
  };
  /* 兼容旧模式：编辑单条实验记录 */
  if(wizard.target==='exp'){
    var eo=Object.assign({},base,{status:'待执行',owner:base.assignee});
    eo.plan=generatePlan(eo.factors,eo.centerPoints,eo.randomize,eo.id);
    eo.entered=eo.plan.map(function(){var o={};eo.responses.forEach(function(rn){o[rn]='';});return o;});
    var eidx=experiments.findIndex(function(x){return x.id===wizard.editId;});
    if(wizard.mode==='edit'&&eidx>=0)experiments[eidx]=Object.assign(experiments[eidx],eo);
    else experiments.unshift(eo);
    toast('实验计划已生成，等待实验员执行','ok');
    showPage('exp:list');
    return;
  }
  /* 新模式：写入 DOE 方案（设计层），状态「待下发」，需再次确认才生成实验记录 */
  var so=Object.assign({},base,{
    source:'DOE',owner:base.assignee,status:'待下发',analyzedAt:'',
    dispatchTime:''
  });
  so.plan=generatePlan(so.factors,so.centerPoints,so.randomize,so.id);
  var sidx=doeSchemes.findIndex(function(x){return x.id===wizard.editId;});
  if(wizard.mode==='edit'&&sidx>=0){
    so.status=doeSchemes[sidx].status==='草稿'?'待下发':doeSchemes[sidx].status;
    so.analyzedAt=doeSchemes[sidx].analyzedAt||'';
    doeSchemes[sidx]=so;
    toast('方案已更新：'+so.plan.length+' 组运行','ok');
  }else{
    doeSchemes.unshift(so);
    toast('已生成实验计划：'+so.name+'（'+so.plan.length+' 组，待下发）','ok');
  }
  showPage('exp:doe');
}

/* ==================================================================
   exp:report · 分析报告（普通实验 / DOE 方案 共用）
   注意：本页不是菜单首页。菜单入口为 exp:analysis（先选分析对象），
        选择对象后才跳转到本页查看报告内容。
   ================================================================== */
var curAnalysisId='',curAnalysisResp='',curReportKind='exp';

regPage('exp:report',{
  title:'分析报告',
  crumb:['实验管理','实验分析','分析报告'],
  render:function(params){
    params=params||{};
    curReportKind=params.kind||'exp';
    var t=analysisTargetById(curReportKind,params.id||curAnalysisId);
    /* 演示友好：未指定对象或对象不存在时，回退到第一个数据完整的分析对象 */
    if(!t){
      var ready=(typeof analysisTargets==='function'?analysisTargets():[]).filter(analysisDataReady);
      if(ready.length){ t=ready[0]; curReportKind=t.kind; }
    }
    if(!t){$('pageHost').innerHTML=placeholder('🚧','暂无可分析对象','请在「实验分析」中选择分析对象，并先完成数据录入');return;}
    if(!analysisDataReady(t)){
      $('pageHost').innerHTML='<div class="empty"><span class="ei">📊</span>实验数据未完成，暂不能生成分析报告<br><br>'+
        '<button class="btn btn-primary" onclick="backToAnalysisList()">← 返回分析对象列表</button></div>';
      return;
    }
    curAnalysisId=t.id; curReportKind=t.kind;
    var e=analysisViewObj(t);
    if(!e.responses||!e.responses.length)e.responses=['收率 %'];
    if(!curAnalysisResp||e.responses.indexOf(curAnalysisResp)<0)curAnalysisResp=e.responses[0];
    /* 注：curAnalysisActiveTerms 不能被覆盖为数组/字符串，它始终是 {eid:{resp:[]}} */
    curAnalysisActiveTerms=curAnalysisActiveTerms||{};
    window._curReportObj=e;
    renderAnalysis(e,curAnalysisResp);
  }
});
function backToAnalysisList(){ showPage('exp:analysis'); }
var curAnalysisActiveTerms={};

function renderAnalysis(e,respName){
  var a=generateAnalysis(e,respName);
  /* 默认勾选所有有意义的项 */
  if(!curAnalysisActiveTerms[e.id])curAnalysisActiveTerms[e.id]={};
  if(!curAnalysisActiveTerms[e.id][respName]){
    curAnalysisActiveTerms[e.id][respName]=a.anova.filter(function(x){return x.src!=='误差'&&x.src!=='合计';}).map(function(x){return x.src;});
  }
  var act=curAnalysisActiveTerms[e.id][respName];

  var isDoe=(e.source==='DOE')||!!e.schemeId;
  var h='';
  h+='<div class="page-hd"><div class="t"><h1>'+(isDoe?'DOE 方案分析报告':'实验分析报告')+' · '+esc(e.id)+'</h1>'+
     '<div class="page-sub">'+esc(e.name)+' · '+(isDoe?'<span class="tag tag-purple">DOE分析</span> ':'<span class="tag tag-grey">普通实验</span> ')+
     '响应变量 <b style="color:var(--primary)">'+esc(respName)+'</b> · '+e.responses.length+' 个响应可切换</div>'+
     '</div>'+
     '<div class="page-acts">'+
       '<button class="btn" onclick="backToAnalysisList()">← 分析对象列表</button>'+
       (isDoe?'<button class="btn" onclick="showPage(\'exp:doe\')">所属 DOE 方案</button>':
              '<button class="btn" onclick="showPage(\'exp:detail\',{id:\''+e.id+'\'})">实验详情</button>')+
       '<button class="btn btn-primary" onclick="showPage(\'exp:best\',{id:\''+e.id+'\'})">查看最佳方案 →</button>'+
     '</div></div>';
  /* DOE 方案：提示数据来自各运行记录的汇总 */
  if(isDoe){
    var _s=findScheme(e.schemeId||e.id);
    var _st=_s?schemeDataStat(_s.id):{done:0,total:e.plan.length,pct:0};
    h+='<div class="notice notice-info mb"><i class="ni">ℹ</i><div>本报告的试验数据来自「'+
        esc((_s&&_s.name)||'')+'（'+esc(e.id)+'）」下发后 <b>'+_st.total+'</b> 条运行记录的录入结果汇总，'+
        '已录入 <b>'+_st.done+'</b> 条（'+_st.pct+'%）。各组运行可在「实验列表」中查看。</div></div>';
  }
  /* 响应变量 Tab */
  h+='<div id="respTabs" style="margin-bottom:18px"></div>';
  /* 一句话结论 */
  h+='<div class="card"><div class="card-b"><div style="display:flex;gap:14px;align-items:flex-start">'+
     '<div style="font-size:24px">💡</div><div style="flex:1;font-size:14px;line-height:1.85">'+a.concl+'</div></div></div></div>';
  /* 模型汇总 */
  h+='<div class="card-grid g4 mb">'+
     '<div class="metric-card"><div class="mv">'+a.model.r2.toFixed(3)+'</div><div class="ml">R²</div></div>'+
     '<div class="metric-card"><div class="mv">'+a.model.adj.toFixed(3)+'</div><div class="ml">调整 R²</div></div>'+
     '<div class="metric-card hl"><div class="mv">'+a.model.pred.toFixed(3)+'</div><div class="ml">预测 R²</div></div>'+
     '<div class="metric-card"><div class="mv">'+a.model.rmse.toFixed(2)+'</div><div class="ml">残差标准差</div></div></div>';
  /* 实验设计 + 结果明细表 */
  h+='<div class="card"><div class="card-hd"><h3>实验设计与结果明细</h3><span class="sub">'+e.plan.length+' 组 · '+respName+' 实测值</span></h3></div>';
  h+='<div class="card-b tight"><div class="tbl-wrap"><table class="tbl tbl-sm">'+
     '<thead><tr><th>运行序</th><th>中心点</th>'+e.factors.map(function(f){return '<th>'+esc(f.name)+'</th>';}).join('')+'<th>'+esc(respName)+'</th></tr></thead><tbody>';
  e.plan.forEach(function(r){
    var ev=r.res?r.res[respName]:'';
    h+='<tr'+(r.center?' class="center-row"':'')+'><td>'+r.runOrder+'</td>'+(r.center?'<td>✓</td>':'<td class="muted">—</td>')+
       r.combo.map(function(v){return '<td>'+esc(v)+'</td>';}).join('')+
       '<td><b>'+(ev!==''?ev:'<span class="muted">—</span>')+'</b></td></tr>';
  });
  h+='</tbody></table></div></div></div>';

  /* ANOVA */
  h+='<div class="card"><div class="card-hd"><h3>ANOVA 方差分析</h3><span class="sub">P&lt;0.05 行标红，含主效应与两两交互</span></h3></div>';
  h+='<div class="card-b tight"><div class="tbl-wrap"><table class="tbl anova">'+
     '<thead><tr><th>来源</th><th>自由度</th><th>平方和</th><th>均方</th><th>F 值</th><th>P 值</th><th>影响系数</th><th>显著性</th></tr></thead><tbody>';
  a.anova.forEach(function(x){
    if((x.src==='误差'||x.src==='合计')&&x.src!=='合计')return;
    if(x.src==='合计'){
      h+='<tr class="term-total"><td><b>合计</b></td><td>'+x.df+'</td><td>'+x.ss+'</td><td>—</td><td>—</td><td>—</td><td>—</td><td></td></tr>';
      return;
    }
    var off=act.indexOf(x.src)<0;
    var sig=x.p<0.05;
    h+='<tr data-term="'+esc(x.src)+'" class="'+(off?'term-off':'')+'">'+
      '<td>'+(x.interaction?'<span class="muted">'+esc(x.src)+'</span>':'<b>'+esc(x.src)+'</b>')+'</td>'+
      '<td>'+x.df+'</td><td>'+x.ss+'</td><td>'+x.ms+'</td>'+
      '<td>'+(x.f===null?'—':x.f.toFixed(1))+'</td>'+
      '<td'+(sig?' class="sig"':'')+'>'+(x.p===null?'—':fmtP(x.p))+'</td>'+
      '<td>'+x.coef+'</td>'+
      '<td><span class="stars">'+x.star+'</span></td></tr>';
  });
  h+='</tbody></table></div></div></div>';

  /* 模型项勾选 */
  h+='<div class="card"><div class="card-hd"><h3>模型项选择</h3><span class="sub">取消勾选后点击「二次分析」按勾选项重拟合</span></h3></div>';
  h+='<div class="card-b"><div class="term-chk" id="termChk">';
  a.anova.filter(function(x){return x.src!=='误差'&&x.src!=='合计';}).forEach(function(x){
    var on=act.indexOf(x.src)>=0;
    h+='<label class="'+(on?'':'off')+'" data-term="'+esc(x.src)+'">'+
       '<input type="checkbox"'+(on?' checked':'')+' data-term="'+esc(x.src)+'"> '+esc(x.src)+'</label>';
  });
  h+='</div><div class="mt"><button class="btn" onclick="reexcludeTerms()">🔁 二次分析（按勾选项重拟合）</button></div></div></div>';

  /* 4 图 */
  h+='<div class="chart-grid">';
  h+='<div class="chart-box"><div class="ct">主效应图</div><div class="cs">每个因子水平均值随水平变化</div><div id="chEff" class="chart-canvas"></div></div>';
  h+='<div class="chart-box"><div class="ct">Pareto 图</div><div class="cs">标准化效应降序，红色虚线为显著临界</div><div id="chPareto" class="chart-canvas"></div></div>';
  h+='<div class="chart-box"><div class="ct">残差 vs 预测值</div><div class="cs">检查方差齐性</div><div id="chRes" class="chart-canvas"></div></div>';
  h+='<div class="chart-box"><div class="ct">残差正态概率图</div><div class="cs">检查残差正态性</div><div id="chNorm" class="chart-canvas"></div></div>';
  h+='</div>';

  /* 底部按钮 */
  h+='<div class="flex mt-lg"><div class="spacer"></div>'+
     '<button class="btn" onclick="toast(\'已基于最优方案生成验证实验计划（演示）\')">🧪 生成验证实验计划</button>'+
     '<button class="btn btn-primary" onclick="showPage(\'exp:best\',{id:\''+e.id+'\'})">🏆 查看最佳方案推荐</button></div>';

  $('pageHost').innerHTML=h;
  /* 响应变量 Tabs */
  var respEl=document.getElementById('respTabs');
  var rt=tabs(e.responses.map(function(r){return {key:r,label:r};}),respName,function(k){
    curAnalysisResp=k;
    renderAnalysis(e,k);
  });
  respEl.appendChild(rt);
  /* 勾选 */
  $$('#termChk input').forEach(function(cb){
    cb.addEventListener('change',function(){
      var lab=this.closest('label'); if(this.checked)lab.classList.remove('off'); else lab.classList.add('off');
    });
  });
  /* 图表 */
  drawAnalysisCharts(a);
  window._curAnalysis=a;
}
function reexcludeTerms(){
  var e=window._curReportObj||findExp(curAnalysisId);
  if(!e){toast('请先选择分析对象','warn');return;}
  curAnalysisActiveTerms[e.id][curAnalysisResp]=$$('#termChk input').filter(function(c){return c.checked;}).map(function(c){return c.getAttribute('data-term');});
  var off=curAnalysisActiveTerms[e.id][curAnalysisResp].length;
  toast('已剔除 '+(a_anova_len()-(off+2))+' 项，正在重拟合…','info');
  renderAnalysis(e,curAnalysisResp);
}
function a_anova_len(){return window._curAnalysis?window._curAnalysis.anova.length:0;}

function drawAnalysisCharts(a){
  /* 主效应 */
  var series=a.effects.map(function(ef){
    return {name:ef.name,type:'line',data:ef.means,symbolSize:9,
            lineStyle:{width:2.5},itemStyle:{color:ef.name==='温度'?'#1677ff':(ef.name==='催化剂'?'#52c41a':'#fa8c16')}};
  });
  chart('chEff',{
    tooltip:{trigger:'axis'},
    legend:{top:0,data:series.map(function(s){return s.name;})},
    grid:{left:50,right:20,top:40,bottom:30},
    xAxis:{type:'category',data:a.effects[0].levels.map(function(v){return v;}),name:a.effects[0].unit||''},
    yAxis:{type:'value',name:'均值'},
    series:series
  });
  /* Pareto */
  var paretoSorted=a.pareto.slice().sort(function(x,y){return y.val-x.val;});
  chart('chPareto',{
    tooltip:{trigger:'axis'},
    grid:{left:60,right:30,top:20,bottom:30},
    xAxis:{type:'value',name:'标准化效应'},
    yAxis:{type:'category',data:paretoSorted.map(function(p){return p.name;}),inverse:true},
    series:[{
      type:'bar',data:paretoSorted.map(function(p){
        return {value:p.val,itemStyle:{color:p.val>a.paretoCrit?'#ff4d4f':'#1677ff'}};
      }),
      markLine:{silent:true,data:[{xAxis:a.paretoCrit,lineStyle:{color:'#ff4d4f',type:'dashed'}}],label:{formatter:'临界 '+a.paretoCrit}}
    }]
  });
  /* 残差 vs 预测值 */
  chart('chRes',{
    tooltip:{trigger:'item',formatter:function(p){return '预测 '+p.value[0].toFixed(1)+'<br/>残差 '+p.value[1].toFixed(2);}},
    grid:{left:50,right:20,top:30,bottom:30},
    xAxis:{type:'value',name:'预测值'},
    yAxis:{type:'value',name:'残差'},
    series:[{type:'scatter',data:a.residuals.map(function(r){return [r.pred,r.res];}),
             symbolSize:9,itemStyle:{color:'#1677ff',opacity:.7},
             markLine:{silent:true,data:[{yAxis:0,lineStyle:{color:'#999',type:'dashed'}}]}}]
  });
  /* 正态概率 */
  var lo=Math.min.apply(null,a.np.map(function(p){return p.act;}));
  var hi=Math.max.apply(null,a.np.map(function(p){return p.act;}));
  chart('chNorm',{
    tooltip:{trigger:'item'},
    grid:{left:50,right:20,top:20,bottom:30},
    xAxis:{type:'value',name:'理论分位数',min:-3.2,max:3.2},
    yAxis:{type:'value',name:'实际残差',min:lo-.3,max:hi+.3},
    series:[{type:'scatter',data:a.np.map(function(p){return [p.theo,p.act];}),
             symbolSize:8,itemStyle:{color:'#1677ff',opacity:.7},
             markLine:{silent:true,data:[[{coord:[lo,lo]},{coord:[hi,hi]}]],lineStyle:{color:'#999',type:'dashed'}}}]
  });
}

/* ==================================================================
   exp:best · 最佳方案推荐
   ================================================================== */
regPage('exp:best',{
  title:'最佳方案推荐',
  crumb:['实验管理','实验分析','最佳方案'],
  render:function(params){
    var id=(params&&params.id)||curAnalysisId;
    /* 报告页（普通实验 / DOE 方案）统一视图对象优先，回落 findExp / findScheme */
    var e=window._curReportObj;
    if(!e||e.id!==id){
      e=findExp(id);
      if(!e){
        var _st=analysisTargetById(findScheme(id)?'doe':'exp',id);
        if(_st)e=analysisViewObj(_st);
      }
    }
    if(!e){
      /* 演示友好：未指定对象时回退到第一个数据完整的分析对象 */
      var _all=(typeof analysisTargets==='function'?analysisTargets():[]).filter(analysisDataReady);
      if(_all.length){ curAnalysisId=_all[0].id; curReportKind=_all[0].kind; e=analysisViewObj(_all[0]); }
    }
    if(!e){$('pageHost').innerHTML=placeholder('🚧','未选择分析对象','请从「实验分析」中选择对象并查看报告');return;}
    /* 沿用报告页当前响应变量的模型结果，保证「报告 → 最佳方案」上下文一致 */
    var a=window._curAnalysis||generateAnalysis(e,e.responses[0]);
    if(a.respName&&e.responses.indexOf(a.respName)<0)a=generateAnalysis(e,e.responses[0]);
    var b=generateBest(a);

    var h='';
    h+='<div class="page-hd"><div class="t"><h1>最佳方案推荐 · '+esc(e.id)+'</h1>'+
       '<div class="page-sub">基于 '+esc(a.respName)+' 的 ANOVA 模型预测最优工艺条件</div></div>'+
       '<div class="page-acts"><button class="btn" onclick="showPage(\'exp:report\',{id:\''+esc(curAnalysisId)+'\',kind:\''+esc(curReportKind)+'\'})">← 返回分析</button></div></div>';
    /* 最佳方案大卡 */
    var best=b.cands[0];
    h+='<div class="best-hero">'+
       '<div class="bh-t">★ 推荐最佳工艺条件</div>'+
       '<div class="best-cond">'+b.cands[0].cond.map(function(c){
         return '<div class="bc"><div class="l">'+esc(c.name)+'</div><div class="v">'+esc(c.value)+(c.unit?' '+esc(c.unit):'')+'</div></div>';
       }).join('')+'</div>'+
       '<div class="best-pred"><div>预计 <span style="color:var(--muted)">'+esc(a.respName)+'</span></div>'+
       '<div class="bp">'+best.yield.toFixed(1)+'</div>'+
       '<div class="bci">95% 置信区间 '+best.ci[0]+' ~ '+best.ci[1]+'</div></div>'+
       '<div class="sat-row"><div class="sl">综合满意度</div><div class="pbar ok"><div class="pf" style="width:'+best.sat+'%"></div></div><div class="sv">'+best.sat+'%</div></div>'+
       '</div>';
    /* 因子贡献度 */
    h+='<div class="card"><div class="card-hd"><h3>因子贡献度</h3><span class="sub">标准化效应分解</span></h3></div>';
    h+='<div class="card-b"><div id="chContrib" class="chart-canvas" style="height:280px"></div></div></div>';
    /* Top 5 方案对比 */
    h+='<div class="card"><div class="card-hd"><h3>Top 5 可行方案对比</h3><span class="sub">按预测响应值降序</span></h3></div>';
    h+='<div class="card-b tight"><div class="tbl-wrap"><table class="tbl cand-tbl"><thead><tr>'+
       '<th>排名</th>'+a.best.map(function(b){return '<th>'+esc(b.name)+'</th>';}).join('')+
       '<th>预测 '+esc(a.respName)+'</th><th>95% 置信区间</th><th>满意度</th></tr></thead><tbody>';
    b.cands.forEach(function(c){
      h+='<tr'+(c.rank===1?' class="top"':'')+'>'+
        '<td class="ctr"><span class="rank">'+(c.rank<=3?['🥇','🥈','🥉'][c.rank-1]:c.rank)+'</span></td>'+
        c.cond.map(function(cc){return '<td><b>'+esc(cc.value)+'</b>'+(cc.unit?' '+esc(cc.unit):'')+'</td>';}).join('')+
        '<td><b style="color:var(--primary);font-size:15px">'+c.yield.toFixed(1)+'</b></td>'+
        '<td class="muted">'+c.ci[0]+' ~ '+c.ci[1]+'</td>'+
        '<td style="min-width:130px"><div class="flex" style="gap:8px"><div class="pbar ok" style="width:80px"><div class="pf" style="width:'+c.sat+'%"></div></div><span style="font-weight:500">'+c.sat.toFixed(1)+'%</span></div></td>'+
        '</tr>';
    });
    h+='</tbody></table></div></div></div>';
    /* 约束 */
    h+='<div class="fold" id="consFold"><div class="fold-hd"><div class="ft">约束条件（重新计算）</div><i class="arw">›</i></div>'+
       '<div class="fold-bd"><div class="field-row">'+
         '<div class="field"><label>产率最低要求</label><input class="input" type="number" id="consYield" value="'+(best.yield-3).toFixed(1)+'"></div>'+
         '<div class="field"><label>温度范围 (°C)</label><input class="input" id="consT" value="80~120"></div>'+
         '<div class="field"><label>催化剂</label><div><label><input type="checkbox" checked> A</label> <label><input type="checkbox" checked> B</label> <label><input type="checkbox" checked> C</label></div></div>'+
         '<div class="field"><label>压力范围 (MPa)</label><input class="input" id="consP" value="1~5"></div>'+
       '</div><div class="mt"><button class="btn" onclick="toast(\'已按约束重新筛选（演示）\')">🔁 重新计算</button></div></div></div>';
    /* 建议 */
    h+='<div class="card"><div class="card-hd"><h3>📋 操作建议</h3></h3></div><div class="card-b">'+
       '<ul style="line-height:2;font-size:13.5px;list-style:disc;padding-left:20px">'+
         '<li>建议按上述最佳条件安排 <b>3 次重复验证实验</b>，确认模型预测的稳定性</li>'+
         '<li>温度是最显著因子，验证实验中应重点控制温度精度（建议 ±1°C）</li>'+
         '<li>确认催化剂 C 的成本与供应稳定性，必要时准备备选方案</li>'+
         '<li>在批量生产中，先小试 5~10 批，统计实际产率与置信区间对比</li>'+
       '</ul>'+
       '</div></div>';

    $('pageHost').innerHTML=h;
    /* 折叠 */
    var f=document.getElementById('consFold');
    f.querySelector('.fold-hd').onclick=function(){ f.classList.toggle('open'); };
    /* 贡献度图 */
    chart('chContrib',{
      tooltip:{trigger:'axis'},
      grid:{left:80,right:40,top:20,bottom:30},
      xAxis:{type:'value',name:'贡献度 %',max:100},
      yAxis:{type:'category',data:b.contrib.map(function(x){return x.name;}),inverse:true},
      series:[{type:'bar',data:b.contrib.map(function(x){
        return {value:x.val,itemStyle:{color:x.name==='未解释'?'#d9d9d9':(x.name==='交互作用'?'#722ed1':'#1677ff')}};
      }),label:{show:true,position:'right',formatter:'{c}%'}}]
    });
  }
});

/* ==================================================================
   exp:detail · 结果录入 Tab
   ================================================================== */
function renderEntryHTML(e){
  var entered=e.entered||e.plan.map(function(){var o={};e.responses.forEach(function(r){o[r]='';});return o;});
  var filled=entered.filter(function(x){return e.responses.every(function(r){return x[r]!==''&&x[r]!==null;});}).length;
  var pct=Math.round(filled/e.plan.length*100);
  var h='<div class="card"><div class="card-b">';
  h+='<div class="flex flex-wrap mb" style="gap:24px">'+
     '<div><span class="muted">实验类型：</span><b>'+esc(e.type)+'</b></div>'+
     '<div><span class="muted">响应变量：</span><b>'+e.responses.map(esc).join('、')+'</b></div>'+
     '<div><span class="muted">指派实验员：</span><b>'+esc(e.assignee||'—')+'</b></div>'+
     '<div><span class="muted">计划完成：</span><b>'+esc(e.dueDate||'—')+'</b></div>'+
     '</div>';
  h+='<div class="flex" style="gap:16px;align-items:center;margin-bottom:14px">'+
     '<span class="muted">录入进度：</span>'+
     '<div class="pbar ok" style="flex:1;max-width:380px;height:10px"><div class="pf" style="width:'+pct+'%"></div></div>'+
     '<b style="color:var(--success)">'+filled+' / '+e.plan.length+'</b>'+
     '</div>';
  h+='<div class="flex" style="gap:8px;margin-bottom:14px">'+
     '<button class="btn" onclick="importEntryExcel()">📥 导入 Excel 数据</button>'+
     '<button class="btn" onclick="fillDemoResults()">🎯 填入模拟数据</button>'+
     '<div class="spacer"></div>'+
     '<button class="btn btn-primary" onclick="submitEntry()">📊 开始分析</button>'+
     '</div>';
  h+='<div class="card" style="margin:0"><div class="card-b tight"><div class="plan-tbl"><table class="tbl">'+
     '<thead><tr><th>运行序</th><th>标准序</th><th>中心点</th>'+e.factors.map(function(f){return '<th>'+esc(f.name)+'</th>';}).join('')+
     e.responses.map(function(r){return '<th>'+esc(r)+'</th>';}).join('')+
     '</tr></thead><tbody>';
  e.plan.forEach(function(r,ri){
    h+='<tr'+(r.center?' class="center-row"':'')+'>'+
      '<td>'+r.runOrder+'</td>'+
      '<td class="muted">'+r.stdOrder+'</td>'+
      (r.center?'<td><span class="tag tag-orange">是</span></td>':'<td class="muted">—</td>')+
      r.combo.map(function(v){return '<td>'+esc(v)+'</td>';}).join('');
    e.responses.forEach(function(rn){
      var v=entered[ri][rn]!==undefined?entered[ri][rn]:'';
      var filled=v!==''&&v!==null;
      h+='<td><input class="entry-input'+(filled?' filled':'')+'" type="number" step="0.1" value="'+(filled?esc(v):'')+'" oninput="updateEntry(\''+e.id+'\','+ri+',\''+rn+'\',this.value)"></td>';
    });
    h+='</tr>';
  });
  h+='</tbody></table></div></div></div>';
  h+='</div></div>';
  return h;
}
function updateEntry(eid,ri,rn,v){
  var e=findExp(eid); if(!e)return;
  e.entered[ri][rn]=v;
  var filled=e.entered.filter(function(x){return e.responses.every(function(r){return x[r]!==''&&x[r]!==null;});}).length;
  var pct=Math.round(filled/e.plan.length*100);
  var pbar=document.querySelector('.pbar .pf');
  if(pbar)pbar.style.width=pct+'%';
  var cnt=document.querySelectorAll('.flex b[style*="--success"]')[0];
  if(cnt)cnt.textContent=filled+' / '+e.plan.length;
  var inp=event.target;
  if(v!=='')inp.classList.add('filled'); else inp.classList.remove('filled');
}
function fillDemoResults(){
  var e=findExp(curDetailId); if(!e)return;
  var rng=makeRng(hashStr(e.id+':demo'));
  e.entered=e.plan.map(function(r){
    var o={};
    e.responses.forEach(function(rn){
      var base=60+rng()*30;
      if(r.center)base=82;
      o[rn]=base.toFixed(1);
    });
    return o;
  });
  toast('已填入模拟数据','ok');
  renderTabBody(document.getElementById('detailBody'),e,'entry');
}
function importEntryExcel(){
  openModal({title:'导入 Excel 数据',width:480,
    body:'<div class="notice notice-info"><i class="ni">ℹ</i><div>演示环境未开放 Excel 解析，<b>正式版支持上传文件并自动匹配 CAS/响应变量</b></div></div>'+
         '<div class="field"><label>选择文件（占位）</label><input class="input" type="file" disabled></div>',
    footer:'<button class="btn" onclick="closeModal()">关闭</button>'});
}
function submitEntry(){
  var e=findExp(curDetailId); if(!e)return;
  var empty=e.entered.findIndex(function(x){return e.responses.some(function(r){return x[r]===''||x[r]===null;});});
  if(empty>=0){toast('第 '+(empty+1)+' 行还有响应变量未填写','warn');return;}
  e.status='已完成';
  /* DOE 运行记录：单组数据不单独出报告，回到所属方案统一分析 */
  if(e.source==='DOE'&&e.schemeId&&findScheme(e.schemeId)){
    var s=findScheme(e.schemeId);
    toast('本组数据已提交（运行 '+pad2(e.runSeq)+'）','ok');
    setTimeout(function(){
      var st=schemeDataStat(s.id);
      if(st.done===st.total){
        toast('方案 '+s.id+' 全部 '+st.total+' 组已录入，满足分析条件','ok');
        showPage('exp:report',{id:s.id,kind:'doe'});
      }else{
        toast('还需 '+(st.total-st.done)+' 组录入后才能统一分析','info');
        showPage('exp:doe');
      }
    },260);
    return;
  }
  toast('已提交，可开始分析…','ok');
  setTimeout(function(){ showPage('exp:analysis'); },260);
}
