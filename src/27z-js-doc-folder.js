/* ==================================================================
   [27z] 文档管理增强
   1) 公共文档 / 我的文档：两级文件夹（面包屑 + 文件夹卡片 + 文档表）
   2) 周报月报：归档列表（类型/提交人/状态/月份 四维筛选 + 分页）
   3) mock 数据扩充：DOCS +20、周报月报 +40，便于演示数据量增长后的筛选价值
   约定：本分片在 27 / 24z3 之后加载，regPage 覆盖同名页面注册。
   ================================================================== */

/* ---------------- 文件夹（两级：大类 → 子类） ---------------- */
var DOC_FOLDERS_SEED=[
  {id:'F-P1',name:'合规文档',parent:'',scope:'public',note:'法规符合性与化学品安全相关正式文件'},
  {id:'F-P11',name:'SDS 文档',parent:'F-P1',scope:'public',note:''},
  {id:'F-P12',name:'REACH / SVHC',parent:'F-P1',scope:'public',note:''},
  {id:'F-P13',name:'ZDHC 声明',parent:'F-P1',scope:'public',note:''},
  {id:'F-P2',name:'技术文档',parent:'',scope:'public',note:'研发技术方案、评估与预研资料'},
  {id:'F-P21',name:'中试与小试方案',parent:'F-P2',scope:'public',note:''},
  {id:'F-P22',name:'评估报告',parent:'F-P2',scope:'public',note:''},
  {id:'F-P23',name:'预研报告',parent:'F-P2',scope:'public',note:''},
  {id:'F-P3',name:'项目文档',parent:'',scope:'public',note:'项目立项与阶段评审归档'},
  {id:'F-P31',name:'立项材料',parent:'F-P3',scope:'public',note:''},
  {id:'F-P32',name:'阶段评审',parent:'F-P3',scope:'public',note:''},
  {id:'F-P4',name:'作业指导',parent:'',scope:'public',note:'检测与操作标准 SOP'},
  {id:'F-P41',name:'测试方法 SOP',parent:'F-P4',scope:'public',note:''},

  {id:'F-M1',name:'我的周报月报',parent:'',scope:'mine',note:'本人提交的工作报告归档'},
  {id:'F-M11',name:'周报',parent:'F-M1',scope:'mine',note:''},
  {id:'F-M12',name:'月报',parent:'F-M1',scope:'mine',note:''},
  {id:'F-M2',name:'我的技术文档',parent:'',scope:'mine',note:''},
  {id:'F-M21',name:'中试与方案',parent:'F-M2',scope:'mine',note:''},
  {id:'F-M22',name:'评审记录',parent:'F-M2',scope:'mine',note:''},
  {id:'F-M3',name:'草稿箱',parent:'',scope:'mine',note:'尚未提交的在编文档'}
];
var DOC_FOLDERS=[];

/* ---------------- 文档扩充数据 ---------------- */
var DOCS_EXTRA_SEED=[
  {id:'DOC-2026-0145',name:'WPU-320 中试放大工艺参数确认',type:'技术文档',ver:'V1.0',owner:'王研究员',upd:'2026-09-04',status:'已发布',pfolder:'F-P21',mfolder:'F-M21'},
  {id:'DOC-2026-0144',name:'WPU-320 中试批次稳定性跟踪表',type:'技术文档',ver:'V1.2',owner:'王研究员',upd:'2026-09-02',status:'已发布',pfolder:'F-P21',mfolder:'F-M21'},
  {id:'DOC-2026-0141',name:'生物基加脂剂 BIO-30 合成路线验证',type:'技术文档',ver:'V1.1',owner:'王研究员',upd:'2026-08-30',status:'已发布',pfolder:'F-P21',mfolder:'F-M21'},
  {id:'DOC-2026-0137',name:'手感剂 HF-5 替代方案经济性评估',type:'技术文档',ver:'V1.0',owner:'李工',upd:'2026-08-27',status:'已发布',pfolder:'F-P22'},
  {id:'DOC-2026-0134',name:'交联剂 XL-3 稳定性加速试验评估',type:'技术文档',ver:'V1.2',owner:'陈工',upd:'2026-08-24',status:'已发布',pfolder:'F-P22'},
  {id:'DOC-2026-0130',name:'水性封底树脂 SB-11 应用可行性预研',type:'技术文档',ver:'V0.6',owner:'李工',upd:'2026-08-19',status:'草稿',pfolder:'F-P23'},
  {id:'DOC-2026-0126',name:'WPU-320 涂饰配方优化试验小结',type:'技术文档',ver:'V0.7',owner:'王研究员',upd:'2026-08-15',status:'草稿',pfolder:'F-P21',mfolder:'F-M3'},
  {id:'DOC-2026-0125',name:'无溶剂合成革树脂 NS-10 小试总结',type:'技术文档',ver:'V0.8',owner:'李工',upd:'2026-08-14',status:'草稿',pfolder:'F-P23'},
  {id:'DOC-2026-0122',name:'REACH SVHC 第 31 批更新核查记录',type:'合规文档',ver:'V1.0',owner:'陈工',upd:'2026-08-12',status:'已发布',pfolder:'F-P12'},
  {id:'DOC-2026-0118',name:'Annex XVII 限制物质清单比对表',type:'合规文档',ver:'V1.3',owner:'陈工',upd:'2026-08-06',status:'已发布',pfolder:'F-P12'},
  {id:'DOC-2026-0115',name:'ZDHC MRSL 供应商符合性收集表',type:'合规文档',ver:'V1.0',owner:'陈工',upd:'2026-08-02',status:'已发布',pfolder:'F-P13'},
  {id:'DOC-2026-0111',name:'ZDHC Level 3 认证自检清单',type:'合规文档',ver:'V1.2',owner:'陈工',upd:'2026-07-28',status:'已归档',pfolder:'F-P13'},
  {id:'DOC-2026-0108',name:'PRJ-2026-007 立项建议书',type:'项目文档',ver:'V1.0',owner:'陈工',upd:'2026-07-24',status:'已发布',pfolder:'F-P31'},
  {id:'DOC-2026-0105',name:'PRJ-2026-006 立项建议书',type:'项目文档',ver:'V1.0',owner:'李工',upd:'2026-07-20',status:'已发布',pfolder:'F-P31'},
  {id:'DOC-2026-0101',name:'PRJ-2026-001 阶段评审记录 · 小试',type:'项目文档',ver:'V1.0',owner:'王研究员',upd:'2026-07-16',status:'已发布',pfolder:'F-P32',mfolder:'F-M22'},
  {id:'DOC-2026-0097',name:'PRJ-2026-003 阶段评审记录 · 立项',type:'项目文档',ver:'V1.0',owner:'李工',upd:'2026-07-10',status:'已归档',pfolder:'F-P32'},
  {id:'DOC-2026-0093',name:'耐干湿擦牢度测试作业指导',type:'作业指导',ver:'V2.1',owner:'李工',upd:'2026-07-04',status:'已发布',pfolder:'F-P41'},
  {id:'DOC-2026-0089',name:'涂饰层附着力检测方法 SOP',type:'作业指导',ver:'V1.4',owner:'李工',upd:'2026-06-27',status:'已发布',pfolder:'F-P41'},
  {id:'DOC-2026-0084',name:'游离甲醛含量测定（乙酰丙酮法）SOP',type:'作业指导',ver:'V2.0',owner:'陈工',upd:'2026-06-20',status:'已发布',pfolder:'F-P41'},
  {id:'DOC-2026-0079',name:'PRJ-2026-002 中试阶段风险评估',type:'项目文档',ver:'V1.0',owner:'王研究员',upd:'2026-06-15',status:'草稿',pfolder:'F-P32',mfolder:'F-M3'}
];
/* 既有 12 份文档的文件夹归属（公共 / 我的） */
var DOC_PFOLDER_MAP={
  'DOC-2026-0142':'F-P11','DOC-2026-0138':'F-P21','DOC-2026-0131':'F-P22','DOC-2026-0127':'F-P13',
  'DOC-2026-0119':'F-P21','DOC-2026-0112':'F-P41','DOC-2026-0104':'F-P23','DOC-2026-0096':'F-P12',
  'DOC-2026-0088':'F-P31','DOC-2026-0075':'F-P22','DOC-2026-0063':'F-P22','DOC-2026-0051':'F-P41'
};
var DOC_MFOLDER_MAP={
  'DOC-2026-0138':'F-M21','DOC-2026-0131':'F-M22'
};

/* ---------------- 周报月报扩充（5 人 × 6 周 + 5 人 × 2 月） ---------------- */
var WEEKLY_PEOPLE=['王研究员','李工','陈工','赵工','孙工'];
function _dfmt(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function buildWeeklyExtra(){
  var base=new Date(2026,7,3);   /* 2026-08-03 周一 */
  for(var w=0;w<6;w++){
    var st=new Date(base.getTime()); st.setDate(st.getDate()+w*7);
    var en=new Date(st.getTime()); en.setDate(st.getDate()+6);
    var period=_dfmt(st)+' ~ '+_dfmt(en);
    var last=(w===5);
    WEEKLY_PEOPLE.forEach(function(p,i){
      var draft=last&&i>=3;                       /* 最近一周尚有 2 人未提交 */
      WEEKLY_REPORTS.push({
        id:'WR-'+_dfmt(st).replace(/-/g,'')+'-'+(i+1),
        reportType:'周报',period:period,submitter:p,
        submitTime:draft?'':_dfmt(en)+' 1'+ (7+i) +':2'+i,
        status:draft?'草稿':'已提交',_gen:true
      });
    });
  }
  ['2026-08','2026-07'].forEach(function(m,idx){
    WEEKLY_PEOPLE.forEach(function(p,i){
      var late=idx===0&&i>=4;
      WEEKLY_REPORTS.push({
        id:'MR-2026-0'+(idx===0?'08':'07')+(i+1),
        reportType:'月报',period:m,submitter:p,
        submitTime:late?'':m+'-28 18:'+(10+i),
        status:late?'草稿':'已提交',_gen:true
      });
    });
  });
}

/* ---------------- 初始化 / 重置 ---------------- */
function seedDocFolders(){
  DOC_FOLDERS.length=0;
  DOC_FOLDERS_SEED.forEach(function(f){
    DOC_FOLDERS.push({id:f.id,name:f.name,parent:f.parent,scope:f.scope,note:f.note});
  });
  for(var i=DOCS.length-1;i>=0;i--){ if(DOCS[i]._extra)DOCS.splice(i,1); }
  DOCS_EXTRA_SEED.forEach(function(d){
    var c={}; for(var k in d)c[k]=d[k];
    c._extra=true; DOCS.push(c);
  });
  DOCS.forEach(function(d){
    if(DOC_PFOLDER_MAP[d.id])d.pfolder=DOC_PFOLDER_MAP[d.id];
    if(DOC_MFOLDER_MAP[d.id])d.mfolder=DOC_MFOLDER_MAP[d.id];
    d._mf=undefined;
  });
  for(var j=WEEKLY_REPORTS.length-1;j>=0;j--){ if(WEEKLY_REPORTS[j]._gen)WEEKLY_REPORTS.splice(j,1); }
  buildWeeklyExtra();
}

/* ---------------- 文件夹辅助 ---------------- */
function docFolderById(id){ return DOC_FOLDERS.filter(function(f){return f.id===id;})[0]||null; }
function docChildFolders(scope,parentId){
  return DOC_FOLDERS.filter(function(f){return f.scope===scope&&(f.parent||'')===(parentId||'');});
}
function docFolderPath(id){
  var out=[],f=docFolderById(id),guard=0;
  while(f&&guard++<10){ out.unshift(f); f=f.parent?docFolderById(f.parent):null; }
  return out;
}
function docDescendantIds(id){
  var out=[id];
  DOC_FOLDERS.forEach(function(f){ if(f.parent===id) out=out.concat(docDescendantIds(f.id)); });
  return out;
}
function docFolderName(id){ var f=docFolderById(id); return f?f.name:'未归类'; }

/* ---------------- 视图状态与数据 ---------------- */
var docView={scope:'public',folder:'',deep:true};

function docRowsOfScope(scope){
  var rows=[];
  if(scope==='public'){
    DOCS.filter(function(d){return d.status==='已发布'||d.status==='已归档';}).forEach(function(d){
      rows.push({id:d.id,name:d.name,type:d.type,ver:d.ver,owner:d.owner,upd:d.upd,status:d.status,
        folder:d.pfolder||'',kind:'doc',ref:d.id});
    });
    SDS_ROWS.filter(function(r){return r.status==='已发布';}).forEach(function(r){
      rows.push({id:r.no,name:r.product+' SDS',type:'SDS 文档',ver:r.ver,owner:r.owner,upd:r.date,
        status:r.status,folder:'F-P11',kind:'sds',ref:r.no});
    });
  }else{
    weeklyRowsForMine().forEach(function(r){
      rows.push({id:r.id,name:r.reportType+' · '+r.period,type:r.reportType,ver:r.period,owner:r.submitter,
        upd:(r.submitTime||'未提交').split(' ')[0],status:r.status,
        folder:r._mf||(r.reportType==='周报'?'F-M11':'F-M12'),kind:'weekly',ref:r.id,
        month:(r.period||'').slice(0,7)});
    });
    DOCS.filter(function(d){return d.owner==='王研究员';}).forEach(function(d){
      rows.push({id:d.id,name:d.name,type:d.type,ver:d.ver,owner:d.owner,upd:d.upd,status:d.status,
        folder:d.mfolder||'',kind:'doc',ref:d.id});
    });
  }
  rows.forEach(function(r){ r.folderName=docFolderName(r.folder); });
  return rows;
}
function docRowsIn(scope,fid,deep){
  var all=docRowsOfScope(scope);
  if(!fid)return all;
  var ids=deep?docDescendantIds(fid):[fid];
  return all.filter(function(r){return ids.indexOf(r.folder)>=0;});
}
function docRowsInView(){ return docRowsIn(docView.scope,docView.folder,docView.deep); }

function docUniq(rows,k){
  var seen={},out=[];
  rows.forEach(function(r){ var v=r[k]; if(v&&!seen[v]){seen[v]=1;out.push(v);} });
  return out.sort();
}
function optPairs(arr){ return arr.map(function(v){return [v,v];}); }

/* ---------------- 文件夹导航区 HTML ---------------- */
function docFolderBarHtml(scope){
  var h='<div class="doc-bar"><div class="doc-crumb">'+
        '<a onclick="docGo(\'\')">全部文档</a>';
  docFolderPath(docView.folder).forEach(function(f){
    h+='<span class="sep">/</span><a onclick="docGo(\''+f.id+'\')">'+esc(f.name)+'</a>';
  });
  h+='<span class="doc-cnt">当前视图 '+docRowsInView().length+' 份</span></div>'+
     '<div class="doc-ops">';
  if(docView.folder){
    h+='<label class="doc-chk"><input type="checkbox"'+(docView.deep?' checked':'')+
       ' onclick="docToggleDeep()">含子文件夹</label>';
  }
  h+='<button class="btn" onclick="docNewFolder()">＋ 新建文件夹</button></div></div>';

  var kids=docChildFolders(scope,docView.folder);
  if(kids.length){
    h+='<div class="doc-folders">';
    kids.forEach(function(f){
      var cnt=docRowsIn(scope,f.id,true).length;
      var subs=docChildFolders(scope,f.id).length;
      h+='<div class="doc-folder" onclick="docGo(\''+f.id+'\')">'+
           '<div class="df-ic">🗂</div>'+
           '<div class="df-main"><b>'+esc(f.name)+'</b>'+
           '<span>'+cnt+' 份文档'+(subs?' · '+subs+' 个子文件夹':'')+'</span></div>'+
           '<div class="df-ops">'+
             '<button class="btn btn-link" onclick="event.stopPropagation();docRenameFolder(\''+f.id+'\')">重命名</button>'+
             '<button class="btn btn-link danger" onclick="event.stopPropagation();docDelFolder(\''+f.id+'\')">删除</button>'+
           '</div></div>';
    });
    h+='</div>';
  }
  return h;
}

/* ---------------- 文件夹操作 ---------------- */
function docGo(id){ docView.folder=id||''; showPage(docView.scope==='public'?'doc:public':'doc:mine'); }
function docToggleDeep(){ docView.deep=!docView.deep; docGo(docView.folder); }
function docNewFolder(){
  var cur=docFolderById(docView.folder);
  if(cur&&cur.parent){ toast('仅支持两级文件夹，无法在子文件夹下继续新建','info'); return; }
  openModal({title:'新建文件夹',width:460,
    body:'<div class="form-grid"><div class="field"><label>文件夹名称</label>'+
         '<input class="input" id="dfName" placeholder="如：客户资料"></div>'+
         '<div class="field"><label>位置</label><input class="input" value="'+esc(docView.folder?docFolderName(docView.folder):'根目录（一级分类）')+'" disabled></div></div>',
    footer:'<button class="btn" onclick="closeModal()">取消</button><div class="spacer"></div>'+
           '<button class="btn btn-primary" onclick="docNewFolderSave()">创建</button>'});
}
function docNewFolderSave(){
  var v=($('dfName')&&$('dfName').value||'').trim();
  if(!v){ toast('请输入文件夹名称','info'); return; }
  DOC_FOLDERS.push({id:'F-N'+(Date.now()%100000),name:v,parent:docView.folder||'',scope:docView.scope,note:''});
  closeModal(); toast('文件夹已创建','ok'); docGo(docView.folder);
}
function docRenameFolder(id){
  var f=docFolderById(id); if(!f)return;
  openModal({title:'重命名文件夹',width:460,
    body:'<div class="form-grid"><div class="field"><label>文件夹名称</label>'+
         '<input class="input" id="dfName" value="'+esc(f.name)+'"></div></div>',
    footer:'<button class="btn" onclick="closeModal()">取消</button><div class="spacer"></div>'+
           '<button class="btn btn-primary" onclick="docRenameFolderSave(\''+id+'\')">保存</button>'});
}
function docRenameFolderSave(id){
  var f=docFolderById(id); if(!f)return;
  var v=($('dfName')&&$('dfName').value||'').trim();
  if(!v){ toast('请输入文件夹名称','info'); return; }
  f.name=v; closeModal(); toast('已重命名','ok'); docGo(docView.folder);
}
function docDelFolder(id){
  var f=docFolderById(id); if(!f)return;
  var subs=docChildFolders(f.scope,id);
  if(subs.length){ toast('请先删除其下的 '+subs.length+' 个子文件夹','info'); return; }
  var cnt=docRowsIn(f.scope,id,false).length;
  if(cnt){ toast('文件夹内还有 '+cnt+' 份文档，请先移动到其他文件夹','info'); return; }
  confirmBox('删除文件夹','确定删除文件夹「'+esc(f.name)+'」吗？',function(){
    for(var i=DOC_FOLDERS.length-1;i>=0;i--){ if(DOC_FOLDERS[i].id===id)DOC_FOLDERS.splice(i,1); }
    toast('文件夹已删除','ok');
    var path=docFolderPath(id); docGo(path.length>1?path[path.length-2].id:'');
  },{okText:'确认删除',danger:true});
}
function docMoveDoc(ref,kind){
  var list=DOC_FOLDERS.filter(function(f){return f.scope===docView.scope;});
  var cur=docRowsInView().filter(function(r){return r.ref===ref&&r.kind===kind;})[0];
  var opts='';
  list.forEach(function(f){
    var p=f.parent?docFolderName(f.parent)+' / ':'';
    opts+='<option value="'+esc(f.id)+'"'+(cur&&cur.folder===f.id?' selected':'')+'>'+esc(p+f.name)+'</option>';
  });
  openModal({title:'移动到文件夹',width:460,
    body:'<div class="form-grid"><div class="field"><label>目标文件夹</label>'+
         '<select class="ctrl" id="dfTarget">'+opts+'</select></div>'+
         '<div class="field"><label>文档</label><input class="input" value="'+esc(cur?cur.name:'')+'" disabled></div></div>',
    footer:'<button class="btn" onclick="closeModal()">取消</button><div class="spacer"></div>'+
           '<button class="btn btn-primary" onclick="docMoveDocSave(\''+esc(ref)+'\',\''+esc(kind)+'\')">移动</button>'});
}
function docMoveDocSave(ref,kind){
  var t=$('dfTarget'); if(!t)return;
  var target=t.value;
  if(kind==='weekly'){
    weeklyRowsForMine().forEach(function(r){ if(r.id===ref)r._mf=target; });
  }else if(docView.scope==='mine'){
    DOCS.forEach(function(d){ if(d.id===ref)d.mfolder=target; });
  }else{
    DOCS.forEach(function(d){ if(d.id===ref)d.pfolder=target; });
  }
  closeModal(); toast('已移动到「'+docFolderName(target)+'」','ok'); docGo(docView.folder);
}

/* ---------------- 文档页渲染 ---------------- */
function renderDocFolderPage(scope){
  /* 切换公共 / 我的时重置下钻位置，避免带着上一个 scope 的文件夹进入 */
  if(docView.scope!==scope){ docView.folder=''; docView.deep=true; }
  docView.scope=scope;
  var isPub=scope==='public';
  var rows=docRowsInView();
  var cols=[
    {k:'id',t:'编号',w:'132px',fmt:function(r){return mono(r.id);}},
    {k:'name',t:'名称',w:'250px'},
    {k:'type',t:'类型',w:'100px'},
    {k:'ver',t:'版本 / 周期',w:'150px',fmt:function(r){return '<span class="mono">'+esc(r.ver)+'</span>';}},
    {k:'folderName',t:'所在文件夹',w:'150px'},
    {k:'owner',t:'负责人',w:'90px'},
    {k:'upd',t:'更新时间',w:'100px'},
    {k:'status',t:'状态',w:'92px',fmt:function(r){return gtag(r.status);}}
  ];
  lp({
    title:isPub?'公共文档':'我的文档',
    sub:isPub?'公共文档为团队共享的正式发布版本，全团队可见。支持两级文件夹归类，进入分类后可用「含子文件夹」展开查看。'
             :'我的文档仅本人与上级领导可见。周报月报按周期自动归档至「我的周报月报」。',
    cols:cols,rows:rows,
    kwKeys:['id','name','type','owner','folderName'],
    kwPh:'搜索编号 / 名称 / 类型 / 负责人 / 文件夹',
    filters:[
      {k:'type',t:'类型',all:'全部',opts:optPairs(docUniq(rows,'type'))},
      {k:'status',t:'状态',all:'全部',opts:optPairs(docUniq(rows,'status'))},
      {k:'folderName',t:'文件夹',all:'全部',opts:optPairs(docUniq(rows,'folderName'))}
    ].concat(rows.some(function(r){return r.month;})
      ?[{k:'month',t:'月份',all:'全部',opts:optPairs(docUniq(rows.filter(function(r){return r.month;}),'month').reverse())}]
      :[]),
    pageSize:12,
    extra:docFolderBarHtml(scope),
    headActs:'<span></span>',
    acts:function(r){
      /* SDS 文档由 SDS 模块维护，不参与文件夹归类 */
      if(r.kind==='sds'){
        return '<button class="btn btn-link" onclick="docOpenRow(\''+esc(r.ref)+'\',\'sds\')">查看</button>';
      }
      return '<button class="btn btn-link" onclick="docOpenRow(\''+esc(r.ref)+'\',\''+esc(r.kind)+'\')">查看</button>'+
             '<button class="btn btn-link" onclick="docMoveDoc(\''+esc(r.ref)+'\',\''+esc(r.kind)+'\')">移动到</button>';
    },
    onRowClick:function(r){ docOpenRow(r.ref,r.kind); }
  });
}
function docOpenRow(ref,kind){
  if(kind==='weekly'){ openWeeklyDetailById(ref); return; }
  if(kind==='sds'){ showPage('sds:list'); return; }
  mdOpenDoc(ref);
}

/* ---------------- 周报月报归档页 ---------------- */
function docWeeklyRows(){
  return WEEKLY_REPORTS.map(function(r){
    return {id:r.id,type:r.reportType,period:r.period,month:(r.period||'').slice(0,7),
      submitter:r.submitter,submitTime:r.submitTime||'—',status:r.status};
  });
}
function docWeeklyKpi(rows){
  var total=rows.length,sub=rows.filter(function(r){return r.status==='已提交';}).length;
  var draft=total-sub,people={};
  rows.forEach(function(r){people[r.submitter]=1;});
  var months=docUniq(rows,'month');
  return '<div class="kpi-row">'+
    '<div class="kpi"><span>报告总数</span><b>'+total+'</b><small>覆盖 '+months.length+' 个月</small></div>'+
    '<div class="kpi"><span>已提交</span><b>'+sub+'</b><small>归档完成</small></div>'+
    '<div class="kpi"><span>草稿 / 未提交</span><b>'+draft+'</b><small>需跟进</small></div>'+
    '<div class="kpi"><span>参与人员</span><b>'+Object.keys(people).length+'</b><small>人</small></div>'+
  '</div>';
}
function renderWeeklyArchive(){
  var rows=docWeeklyRows();
  lp({
    title:'周报月报',
    sub:'全团队工作报告的统一归档记录，支持按类型、提交人、状态与月份筛选。',
    cols:[
      {k:'id',t:'报告编号',w:'170px',fmt:function(r){return mono(r.id);}},
      {k:'type',t:'类型',w:'90px'},
      {k:'period',t:'周期',w:'200px'},
      {k:'submitter',t:'提交人',w:'110px'},
      {k:'submitTime',t:'提交时间',w:'160px'},
      {k:'status',t:'状态',w:'100px',fmt:function(r){return gtag(r.status);}}
    ],
    rows:rows,
    kwKeys:['id','period','submitter'],
    kwPh:'搜索编号 / 周期 / 提交人',
    filters:[
      {k:'type',t:'类型',all:'全部',opts:[['周报','周报'],['月报','月报']]},
      {k:'submitter',t:'提交人',all:'全部',opts:optPairs(docUniq(rows,'submitter'))},
      {k:'status',t:'状态',all:'全部',opts:optPairs(docUniq(rows,'status'))},
      {k:'month',t:'月份',all:'全部',opts:optPairs(docUniq(rows,'month').reverse())}
    ],
    pageSize:10,
    extra:docWeeklyKpi(rows),
    headActs:'<button class="btn" onclick="showPage(\'home\')">返回工作台</button>',
    acts:function(r){
      return '<button class="btn btn-link" onclick="openWeeklyDetailById(\''+esc(r.id)+'\')">查看</button>';
    },
    onRowClick:function(r){ openWeeklyDetailById(r.id); }
  });
}

/* 通用周报月报详情：openWeeklyFromMine 只覆盖「王研究员」，归档页需支持查看任何人。
   2026-09-14：改为按真实模板（研发人员 / 研究室经理）只读渲染，见 24z3 的 wkArchiveHTML。 */
function openWeeklyDetailById(id){
  var range=weeklyDateRange(),current=range.start+' ~ '+range.today;
  var r=WEEKLY_REPORTS.filter(function(x){return x.id===id;})[0];
  if(!r||(r.submitter==='王研究员'&&r.period===current)){ openWeeklyReport(); return; }
  var role=r.role||(r.submitter==='孙工'?'manager':'staff');
  openModal({title:r.reportType+'详情 · '+r.period,width:1040,
    body:'<div class="weekly-report-head" style="margin-bottom:14px"><div><b>'+esc(r.reportType)+' · '+esc(r.period)+'</b>'+
      '<span>'+esc(r.submitter)+' · '+esc(r.submitTime||'未提交')+' · '+(role==='manager'?'研究室经理模板':'研发人员模板')+'</span></div>'+
      '<span class="tag '+(r.status==='已提交'?'tag-green':'tag-grey')+'">'+esc(r.status)+'</span></div>'+
      wkArchiveHTML(r.period,role),
    footer:'<button class="btn" onclick="closeModal()">关闭</button>'});
}

/* ---------------- 页面注册（覆盖 27 / 24z3 的旧实现） ---------------- */
regPage('doc:public',{
  title:'公共文档',crumb:['文档管理','公共文档'],
  render:function(){ renderDocFolderPage('public'); }
});
regPage('doc:mine',{
  title:'我的文档',crumb:['文档管理','我的文档'],
  render:function(){ renderDocFolderPage('mine'); }
});
regPage('doc',{
  title:'公共文档',crumb:['文档管理','公共文档'],
  render:function(){ renderDocFolderPage('public'); }
});
/* ⑤（2026-09-10 领导评审）：「周报月报」菜单已删除，查看入口统一为
   我的文档 →「我的周报月报」文件夹。doc:weekly 保留为重定向，兼容旧入口。 */
function gotoWeeklyArchive(){
  docView.scope='mine';docView.folder='F-M1';docView.deep=true;
  showPage('doc:mine');
}
regPage('doc:weekly',{
  title:'周报月报',crumb:['文档管理','周报月报'],
  render:function(){ gotoWeeklyArchive(); }
});

seedDocFolders();
