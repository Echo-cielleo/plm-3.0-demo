/* ==================================================================
   [27z8a] 设备使用记录（eq:use）
   · 业务：实验室设备日常使用登记——谁在什么时候用了哪台设备、做什么实验
   · 数据：EQUIP_USES，设备引用 EQUIPMENTS 真实编号；部门取 27z8 补齐的 e.dept
   · 页面：renderListPage 通用能力（filterDefaults 预筛 / dateRange 范围筛选，见 20-js-core）
   · 从设备列表跳入：showPage('eq:use',{eq:'EQ-xxx'}) → 预筛该设备
   · 命名前缀 equ*（避免与 tmp/stg/mat/sup/eqm 等已占用前缀冲突）
   ================================================================== */

/* ---------- 1. 种子数据（日期按演示锚点平移，不写死——20-js-core 铁律） ---------- */
var EQUIP_USES=(function(){
  var T=demoYmd();
  /* [日期偏移天, 设备编号, 使用人, 用途/关联实验, 领用, 归还, 备注]（归还='—' → 在用） */
  var seed=[
    [-1,  'EQ-2026-001','李工',  'PRJ-2026-002 WPU-320 拉伸强度复测',      '09:30','11:45','革样 12 片，结果合格'],
    [-1,  'EQ-2026-002','陈工',  'QC-2026-0142 送检样 VOC 复检',           '10:00','16:20','袋式法，平行两份'],
    [-2,  'EQ-2026-009','王研究员','PRJ-2026-003 乳液粒径分布测试',          '14:00','15:10','NS-10 小试样'],
    [-2,  'EQ-2026-004','李工',  'SB-11 耐黄变评估（QUV 500h）',           '—','—','累计计时中'],
    [-3,  'EQ-2026-006','李工',  'PRJ-2026-001 涂饰层耐磨验证（马丁代尔）', '09:00','12:30','10 万次循环'],
    [-3,  'EQ-2026-011','陈工',  'L-27 批次称量',                          '08:40','09:05',''],
    [-4,  'EQ-2026-007','王研究员','HF-5 改配方手感评分',                    '13:30','14:20','与主观评价对照'],
    [-5,  'EQ-2026-008','王研究员','NS-10 粘度跟踪',                         '16:00','16:40','25℃ 标准转子'],
    [-6,  'EQ-2026-010','赵工',  'CR-33 耐热老化预试验',                   '—','—','设备转维修，试验中止'],
    [-7,  'EQ-2026-003','陈工',  'WPU-320 红外结构确认',                   '10:20','11:00','']
  ];
  function pad4(n){ n=String(n); while(n.length<4)n='0'+n; return n; }
  return seed.map(function(s,i){
    var eq=eqById(s[1])||{};
    var inUse=(s[5]==='—');
    return {
      id:'EU-2026-'+pad4(140-i),
      date:dateAdd(T,s[0]),
      eq:s[1],
      user:s[2],
      dept:eq.dept||'研发部',
      use:s[3],
      tFrom:s[4],
      tTo:s[5],
      status:inUse?'在用':'已归还',
      remark:s[6]
    };
  });
})();

/* ---------- 2. 状态标签 / 编号 ---------- */
var EQU_STATUS_TAG={'在用':'tag-blue','已归还':'tag-green'};
function equNextId(){
  var max=140;
  EQUIP_USES.forEach(function(r){
    var m=/^EU-2026-(\d+)$/.exec(r.id||'');
    if(m)max=Math.max(max,parseInt(m[1],10));
  });
  var n=String(max+1); while(n.length<4)n='0'+n;
  return 'EU-2026-'+n;
}

/* ---------- 3. 页面 ---------- */
regPage('eq:use',{
  title:'使用记录',crumb:['设备资源','使用记录'],
  render:function(params){
    var preEq=(params&&params.eq)||'';
    lp(listCfg({
      title:'使用记录',
      sub:'实验室设备日常使用登记：谁在什么时候用了哪台设备、做什么实验；归还前状态为「在用」。',
      cols:[
        {k:'date',t:'日期',w:'105px',fmt:function(r){return mono(r.date);}},
        {k:'eq',t:'设备',w:'205px',fmt:function(r){
          var e=eqById(r.eq);
          return mono(r.eq)+'<br><span style="font-size:12px">'+esc(e?e.name:r.eq)+'</span>';
        }},
        {k:'user',t:'使用人',w:'90px'},
        {k:'dept',t:'所属部门',w:'95px',fmt:function(r){return gtag(r.dept);}},
        {k:'use',t:'用途 / 关联实验'},
        {k:'tFrom',t:'领用时间',w:'85px'},
        {k:'tTo',t:'归还时间',w:'85px'},
        {k:'status',t:'状态',w:'85px',fmt:function(r){
          return '<span class="tag '+(EQU_STATUS_TAG[r.status]||'tag-grey')+'">'+esc(r.status)+'</span>';
        }},
        {k:'remark',t:'备注',w:'165px'}
      ],
      rows:EQUIP_USES,
      kwKeys:['id','eq','user','use','remark'],
      kwPh:'搜索设备编号 / 使用人 / 用途',
      headActs:'<button class="btn" data-lp-reset>重置筛选</button>'+
               '<button class="btn btn-primary" onclick="equAdd()">＋ 使用登记</button>',
      /* 行内归还按钮（行本身不设详情跳转） */
      acts:function(r){
        return r.status==='在用'
          ? '<button class="btn btn-link" onclick="equReturn(\''+esc(r.id)+'\')">归还</button>'
          : '<span class="muted" style="font-size:12px">—</span>';
      },
      onRowClick:null,
      filters:[
        {k:'eq',t:'设备',all:'全部设备',
         opts:EQUIPMENTS.map(function(e){return [e.id,e.id+' '+e.name];})},
        {k:'status',t:'状态',all:'全部',opts:[['在用','在用'],['已归还','已归还']]}
      ],
      filterDefaults:preEq?{eq:preEq}:null,
      dateRange:{k:'date',t:'日期'}
    }));
  }
});

/* ---------- 4. 新增使用登记 ---------- */
function equAdd(){
  var opts=EQUIPMENTS.map(function(e){
    var bad=(e.status!=='正常');
    return '<option value="'+esc(e.id)+'"'+(bad?' disabled':'')+'>'+
      esc(e.id)+' '+esc(e.name)+'（'+esc(e.loc)+'）'+(bad?' · '+esc(e.status):'')+'</option>';
  }).join('');
  openModal({title:'新增 · 设备使用登记',width:560,
    body:'<div class="form-grid">'+
      '<div class="field span2"><label class="req">设备</label><select class="ctrl" id="euEq">'+opts+'</select></div>'+
      '<div class="field"><label class="req">使用人</label><input class="ctrl" id="euUser" placeholder="如：李工"></div>'+
      '<div class="field"><label>领用时间</label><input class="ctrl" id="euFrom" placeholder="HH:MM" value="'+nowStr().slice(11,16)+'"></div>'+
      '<div class="field span2"><label class="req">用途 / 关联实验</label><input class="ctrl" id="euUse" placeholder="如：PRJ-2026-002 拉伸强度复测"></div>'+
      '<div class="field span2"><label>备注</label><input class="ctrl" id="euRemark" placeholder="选填"></div>'+
      '</div>',
    footer:'<button class="btn" onclick="closeModal()">取消</button>'+
           '<button class="btn primary" onclick="equAddSave()">确认登记</button>'});
}
function equAddSave(){
  var eq=$('euEq').value,user=$('euUser').value.trim(),use=$('euUse').value.trim();
  if(!eq){toast('请选择设备','warn');return;}
  if(!user){toast('请填写使用人','warn');return;}
  if(!use){toast('请填写用途 / 关联实验','warn');return;}
  var e=eqById(eq)||{};
  EQUIP_USES.unshift({
    id:equNextId(),
    date:todayStr(),
    eq:eq,user:user,
    dept:e.dept||'研发部',
    use:use,
    tFrom:$('euFrom').value.trim()||nowStr().slice(11,16),
    tTo:'',
    status:'在用',
    remark:$('euRemark').value.trim()
  });
  closeModal();
  showPage('eq:use');
  toast('已登记使用：'+eq+' '+((e.name)||'')+'（在用）','ok');
}

/* ---------- 5. 归还 ---------- */
function equReturn(id){
  var r=EQUIP_USES.filter(function(x){return x.id===id;})[0];
  if(!r||r.status!=='在用')return;
  openModal({title:'归还 · '+r.eq,width:440,
    body:'<div class="notice info" style="margin-bottom:12px"><div class="ni">i</div><div>'+
      '设备 <b>'+esc(r.eq)+' '+esc((eqById(r.eq)||{}).name||'')+'</b> · 使用人 '+esc(r.user)+'</div></div>'+
      '<div class="field"><label class="req">归还时间</label><input class="ctrl" id="euTo" placeholder="HH:MM" value="'+nowStr().slice(11,16)+'"></div>',
    footer:'<button class="btn" onclick="closeModal()">取消</button>'+
           '<button class="btn primary" onclick="equReturnSave(\''+esc(id)+'\')">确认归还</button>'});
}
function equReturnSave(id){
  var r=EQUIP_USES.filter(function(x){return x.id===id;})[0];
  if(!r)return;
  var t=$('euTo').value.trim();
  if(!t){toast('请填写归还时间','warn');return;}
  r.tTo=t;r.status='已归还';
  closeModal();
  showPage('eq:use');
  toast('已归还：'+r.eq+' '+((eqById(r.eq)||{}).name||''),'ok');
}
