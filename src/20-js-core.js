/* ==================================================================
   [20] 核心公共组件
   esc / $ / toast / modal / confirmBox / tabs / chart / progress
   placeholder / downloadFile / renderListPage
   ================================================================== */

/* ---------- 基础工具 ---------- */
function $(id){return document.getElementById(id);}
function $$(sel,root){return Array.prototype.slice.call((root||document).querySelectorAll(sel));}
function esc(s){
  if(s===null||s===undefined)return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                  .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function uid(prefix){
  _uidN=(_uidN||0)+1;
  return (prefix||'id')+'-'+Date.now().toString(36)+'-'+_uidN;
}
var _uidN=0;
function pad(n){return n<10?'0'+n:''+n;}
function nowStr(){
  var d=new Date();
  return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+' '+pad(d.getHours())+':'+pad(d.getMinutes());
}
function todayStr(){
  var d=new Date();
  return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
}
function daysFromNow(n){
  var d=new Date(); d.setDate(d.getDate()+n);
  return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
}
/* 距今天数：正数=未来还有 N 天，负数=已过期 N 天 */
function daysTo(s){
  if(!s)return 0;
  var a=s.split('-'),b=todayStr().split('-');
  if(a.length<3)return 0;
  var d1=new Date(+a[0],+a[1]-1,+a[2]),d2=new Date(+b[0],+b[1]-1,+b[2]);
  return Math.round((d1-d2)/86400000);
}

/* ---------- Toast ---------- */
var TOAST_ICON={ok:'✓',err:'✕',warn:'!',info:'i'};
function toast(msg,type){
  type=type||'ok';
  var wrap=$('toastWrap'); if(!wrap)return;
  var el=document.createElement('div');
  el.className='toast '+type;
  el.innerHTML='<i class="ti">'+TOAST_ICON[type]+'</i><span>'+esc(msg)+'</span>';
  wrap.appendChild(el);
  setTimeout(function(){
    el.className+=' out';
    setTimeout(function(){ if(el.parentNode)el.parentNode.removeChild(el); },260);
  },2600);
}

/* ---------- Modal ---------- */
var _modalOpen=false;
function openModal(o){
  o=o||{};
  var m=$('modal'),mask=$('mask');
  if(!m||!mask)return;
  var ft=o.footer;
  var ftHtml=(ft===undefined)
    ? '<button class="btn" onclick="closeModal()">关闭</button>'
    : (ft===''?'':ft);
  m.className='modal'+(o.cls?(' '+o.cls):'');
  m.style.width=(o.width||560)+'px';
  m.innerHTML=
    '<div class="modal-hd"><h3>'+esc(o.title||'')+'</h3>'+
      '<button class="modal-x" onclick="closeModal()">✕</button></div>'+
    '<div class="modal-bd" id="mBody">'+(o.body||'')+'</div>'+
    (ftHtml?'<div class="modal-ft" id="mFoot">'+ftHtml+'</div>':'');
  mask.className='on'; _modalOpen=true;
  if(typeof o.onOpen==='function')o.onOpen(m);
}
function closeModal(){
  var mask=$('mask');
  if(mask)mask.className='';
  _modalOpen=false;
}
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'&&_modalOpen)closeModal();
});

/* ---------- confirmBox ---------- */
function confirmBox(title,html,cb,opts){
  opts=opts||{};
  var okText=opts.okText||'确定';
  var danger=!!opts.danger;
  openModal({
    title:title,
    width:opts.width||480,
    cls:opts.cls,
    body:'<div style="font-size:13.5px;line-height:1.75">'+html+'</div>',
    footer:'<button class="btn" onclick="closeModal()">取消</button>'+
           '<button class="btn '+(danger?'btn-danger':'btn-primary')+'" id="_cfmOk">'+esc(okText)+'</button>',
    onOpen:function(){
      $('_cfmOk').onclick=function(){ closeModal(); if(typeof cb==='function')cb(); };
    }
  });
}

/* ---------- Tabs ---------- */
function tabs(items,activeKey,onSwitch,small){
  var h='<div class="tabs'+(small?' tabs-sm':'')+'">';
  items.forEach(function(it){
    h+='<button type="button" data-key="'+esc(it.key)+'" class="'+(it.key===activeKey?'on':'')+'">'+esc(it.label)+'</button>';
  });
  h+='</div>';
  var wrap=document.createElement('div');
  wrap.innerHTML=h;
  var el=wrap.firstChild;
  el.addEventListener('click',function(e){
    var b=e.target.closest('button[data-key]'); if(!b)return;
    $$('button',el).forEach(function(x){x.className='';});
    b.className='on';
    onSwitch(b.getAttribute('data-key'));
  });
  return el;
}

/* ---------- ECharts ---------- */
var _charts={};   // domId -> echarts instance
function chart(domId,option){
  var el=$(domId);
  if(!el||typeof echarts==='undefined'){
    if(el)el.innerHTML='<div class="empty">图表组件未加载</div>';
    return null;
  }
  try{
    if(_charts[domId]){ _charts[domId].dispose(); delete _charts[domId]; }
    var inst=echarts.init(el);
    inst.setOption(option);
    _charts[domId]=inst;
    return inst;
  }catch(err){
    el.innerHTML='<div class="empty">图表渲染失败：'+esc(err.message)+'</div>';
    return null;
  }
}
function resizeAll(){
  Object.keys(_charts).forEach(function(k){
    try{ _charts[k].resize(); }catch(e){}
  });
}
window.addEventListener('resize',function(){ setTimeout(resizeAll,120); });

/* ---------- 进度条动画 ---------- */
function progress(barId,textId,done,speed){
  speed=speed||18;
  var bar=$(barId),txt=$(textId),p=0;
  if(!bar)return;
  var fill=bar.querySelector('.pf');
  if(!fill){ bar.innerHTML='<div class="pf"></div>'; fill=bar.querySelector('.pf'); }
  var t=setInterval(function(){
    p+=Math.random()*7+2;
    if(p>=100){ p=100; clearInterval(t); fill.style.width='100%';
      if(txt)txt.textContent='完成';
      setTimeout(function(){ if(typeof done==='function')done(); },260);
    }else{
      fill.style.width=p.toFixed(1)+'%';
      if(txt)txt.textContent=Math.round(p)+'%';
    }
  },speed);
}

/* ==================================================================
   页面说明（可折叠）
   标题右侧放「说明」按钮，点击展开本页说明面板；
   展开状态存于 NOTE_OPEN，列表页翻页/搜索重渲染后仍保持。
   用法：
     var n = noteBlock('law-zdhc', '说明文本（可含已转义 HTML）');
     标题 .page-acts 区放 n.btn，标题下方放 n.panel
   ================================================================== */
var NOTE_OPEN={};
function noteBlock(key,text,label){
  var open=!!NOTE_OPEN[key];
  return {
    key:key,
    btn:'<button class="btn note-btn'+(open?' on':'')+'" id="nb-'+key+'"'
        +' onclick="toggleNote(\''+key+'\')" title="查看本页说明">'
        +'<i class="nb-ico">ⓘ</i>'+esc(label||'说明')+'<i class="nb-caret">▼</i></button>',
    panel:'<div class="note-panel'+(open?' open':'')+'" id="np-'+key+'"><div class="np-in">'
        +'<div class="np-t">页面说明</div><div class="np-x">'+text+'</div></div></div>'
  };
}
function toggleNote(key){
  NOTE_OPEN[key]=!NOTE_OPEN[key];
  var b=$('nb-'+key),p=$('np-'+key);
  if(b)b.classList.toggle('on',NOTE_OPEN[key]);
  if(p)p.classList.toggle('open',NOTE_OPEN[key]);
}

/* ---------- 占位页 ---------- */
function placeholder(icon,title,desc){
  return '<div class="placeholder"><span class="pi">'+icon+'</span>'+
    '<h3>'+esc(title)+'</h3><p>'+desc+'</p></div>';
}

/* ---------- 文件下载 ---------- */
function downloadFile(name,content,mime){
  mime=mime||'text/plain;charset=utf-8';
  var blob=new Blob(['\ufeff'+content],{type:mime});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob); a.download=name;
  document.body.appendChild(a); a.click();
  setTimeout(function(){ URL.revokeObjectURL(a.href); document.body.removeChild(a); },400);
}

/* ==================================================================
   通用列表页渲染器 renderListPage(cfg)
   cfg: {
     title, sub, icon,
     note (说明文本，给了就收进「说明」折叠面板，不再平铺 sub),
     cols:[{k,t,w,align,num,fmt(row)}],
     rows:[], kwKeys:[],
     filters:[{k,t,opts:[[value,label]],all:'全部'}],
     acts(row) -> html,  onRowClick(row) -> bool,
     rowCls(row) -> '行 class'（用于临期/过期行标底色）,
     rowExpand(row) -> html（给了就在行首加展开箭头 + 行内展开区）,
     pageSize, extra (html 插在工具条下方), headActs (html)
   }
   ================================================================== */
function renderListPage(cfg){
  var st={
    kw:'', page:1, size:cfg.pageSize||10,
    flt:{}
  };
  (cfg.filters||[]).forEach(function(f){ st.flt[f.k]=''; });

  function match(row){
    if(st.kw){
      var keys=cfg.kwKeys||cfg.cols.map(function(c){return c.k;});
      var hit=keys.some(function(k){
        return String(row[k]===undefined?'':row[k]).toLowerCase().indexOf(st.kw)>=0;
      });
      if(!hit)return false;
    }
    for(var k in st.flt){
      if(st.flt[k] && String(row[k])!==st.flt[k])return false;
    }
    return true;
  }
  function render(){
    var host=$('lpHost'); if(!host)return;
    var all=cfg.rows.filter(match);
    var pages=Math.max(1,Math.ceil(all.length/st.size));
    if(st.page>pages)st.page=pages;
    var list=all.slice((st.page-1)*st.size,st.page*st.size);

    var h='';
    /* 标题（note 优先：有 note 时说明文本收进折叠面板，不再平铺 sub） */
    var note=cfg.note?noteBlock(cfg.noteKey||('lp-'+cfg.title),cfg.note):null;
    h+='<div class="page-hd"><div class="t"><h1>'+esc(cfg.title)+'</h1>'+
       (cfg.sub&&!note?'<div class="page-sub">'+cfg.sub+'</div>':'')+'</div>'+
       '<div class="page-acts">'+(note?note.btn:'')+(cfg.headActs||'')+'</div></div>';
    if(note)h+=note.panel;
    /* 工具条 */
    h+='<div class="toolbar">'+
         '<div class="search-box"><span class="si">🔍</span>'+
           '<input class="input" id="lpKw" placeholder="'+(cfg.kwPh||'搜索关键词')+'" value="'+esc(st.kw)+'"></div>';
    (cfg.filters||[]).forEach(function(f){
      h+='<select class="ctrl" data-flt="'+esc(f.k)+'"><option value="">'+
         esc(f.t+'：'+(f.all||'全部'))+'</option>';
      f.opts.forEach(function(o){
        h+='<option value="'+esc(o[0])+'"'+(st.flt[f.k]===String(o[0])?' selected':'')+'>'+esc(o[1])+'</option>';
      });
      h+='</select>';
    });
    h+='<div class="spacer"></div>'+
       '<span class="muted" style="font-size:13px">共 '+all.length+' 条</span></div>';
    if(cfg.extra)h+=cfg.extra;

    /* 表格 */
    var hasExp=typeof cfg.rowExpand==='function';
    var nCol=cfg.cols.length+(cfg.acts?1:0)+(hasExp?1:0);
    h+='<div class="card"><div class="card-b tight"><div class="tbl-wrap"><table class="tbl">';
    h+='<thead><tr>';
    if(hasExp)h+='<th style="width:34px"></th>';
    cfg.cols.forEach(function(c){
      h+='<th'+(c.w?' style="width:'+c.w+'"':'')+'>'+esc(c.t)+'</th>';
    });
    if(cfg.acts)h+='<th style="width:1%">操作</th>';
    h+='</tr></thead><tbody>';
    if(list.length===0){
      h+='<tr><td colspan="'+nCol+'"><div class="empty">'+
         '<span class="ei">🗂</span>暂无数据</div></td></tr>';
    }
    list.forEach(function(row,ri){
      var clickable=typeof cfg.onRowClick==='function';
      var rowCls=typeof cfg.rowCls==='function'?(cfg.rowCls(row)||''):'';
      h+='<tr'+(clickable?' data-ri="'+ri+'"':'')+(rowCls?' class="'+rowCls+'"':'')
          +(clickable?' style="cursor:pointer"':'')+'>';
      if(hasExp)h+='<td class="exp-tog" id="lptog'+ri+'" onclick="lpToggleExp('+ri+',event)" title="展开/收起">▸</td>';
      cfg.cols.forEach(function(c){
        var cls=(c.num?' num':'')+(c.align==='c'?' ctr':'');
        var v=c.fmt?c.fmt(row):row[c.k];
        h+='<td class="'+cls+'">'+(v===undefined||v===null||v===''?'<span class="muted">—</span>':v)+'</td>';
      });
      if(cfg.acts)h+='<td class="op">'+cfg.acts(row)+'</td>';
      h+='</tr>';
      if(hasExp)h+='<tr class="exp-row" id="lpexp'+ri+'" style="display:none"><td colspan="'+nCol+'">'
                  +cfg.rowExpand(row)+'</td></tr>';
    });
    h+='</tbody></table></div>';
    /* 分页 */
    if(pages>1){
      h+='<div class="pager"><button class="pg-btn" data-pg="'+(st.page-1)+'"'+(st.page<=1?' disabled':'')+'>‹</button>';
      for(var p=1;p<=pages;p++){
        if(pages>7&&p>2&&p<pages-1&&Math.abs(p-st.page)>1){
          if(p===3||p===pages-2)h+='<span class="muted">…</span>';
          continue;
        }
        h+='<button class="pg-btn'+(p===st.page?' on':'')+'" data-pg="'+p+'">'+p+'</button>';
      }
      h+='<button class="pg-btn" data-pg="'+(st.page+1)+'"'+(st.page>=pages?' disabled':'')+'>›</button></div>';
    }
    h+='</div></div>';

    host.innerHTML=h;

    /* 事件 */
    var kwEl=$('lpKw');
    if(kwEl){
      kwEl.oninput=function(){ st.kw=this.value.trim().toLowerCase(); st.page=1; render();
        var n=$('lpKw'); if(n){n.focus(); n.setSelectionRange(n.value.length,n.value.length);} };
    }
    $$('[data-flt]',host).forEach(function(sel){
      sel.onchange=function(){ st.flt[this.getAttribute('data-flt')]=this.value; st.page=1; render(); };
    });
    $$('[data-pg]',host).forEach(function(b){
      b.onclick=function(){
        if(b.disabled)return;
        st.page=parseInt(this.getAttribute('data-pg'),10)||1; render();
      };
    });
    if(typeof cfg.onRowClick==='function'){
      $$('tr[data-ri]',host).forEach(function(tr){
        tr.onclick=function(ev){
          /* 行内链接/按钮有自己的行为，不让行点击叠加覆盖
             （如供应商页「供应物料」链应跳原料信息，而不是供应商详情） */
          var t=ev&&ev.target;
          if(t&&t.closest&&t.closest('a,button'))return;
          cfg.onRowClick(list[parseInt(this.getAttribute('data-ri'),10)]);
        };
      });
    }
  }
  render();                 /* 首次挂载即渲染，调用方不必再手动触发 */
  return {render:render};
}
/* 行内展开开关（配合 cfg.rowExpand 使用）：阻止冒泡，避免同时触发行点击 */
function lpToggleExp(ri,ev){
  if(ev&&ev.stopPropagation)ev.stopPropagation();
  var row=$('lpexp'+ri),tog=$('lptog'+ri);
  if(!row)return;
  var open=row.style.display==='none';
  row.style.display=open?'':'none';
  if(tog){tog.textContent=open?'▾':'▸';tog.classList.toggle('on',open);}
}
