/* ==================================================================
   [23b] SDS · 章节内容增强（G2 / G3 / G4 / G13 …）

   本分片承载 SDS 各章节内容的后续增强代码。
   原因：23-js-sds.js 已达 3485 行 / 196 个函数，继续往里堆会失控。
   约定：新增章节内容一律写在这里，23-js-sds.js 只保留必要的调用钩子。
   ================================================================== */

/* ==================================================================
   G2 · 第 3 章组分表（真表格）

   真实 SDS 第 3 章是表格而非文本行。列对齐示例文档：
     Chemical Name / Registration No. / CAS No. / EC No.
     / Concentration / Classification / SCL·M-Factors·ATE

   数据全部来自组分库（DB_CFG.component 的身份字段 + COMP_CLP 的分类参数），
   SDS 内只读引用 —— 与 M 因子专项的口径一致，不在编制 SDS 时就地改。
   ================================================================== */
function compTableHtml(){
  var dv=wz.view==='deliver';
  if(!wz.formula.length){
    return '<div style="padding:10px 14px;color:var(--muted);font-size:12.5px">'
      +'　（配方尚未录入，组分表待生成）</div>';
  }
  var tr=wz.formula.map(function(f){
    var r=DB_CFG.component.rows.filter(function(x){return x.cas===f.cas;})[0]||{};
    var q=clpParamOf(f.cas);
    /* 保密组分按区间披露浓度，且不暴露精确值 */
    var conc=f.secret?concRange(f.conc):(f.conc+' %');
    var extra=[];
    if(q.scl&&q.scl!=='—')extra.push('SCL：'+q.scl);
    if(q.m&&q.m!=='—')extra.push('M 因子：'+q.m+'（'+q.mSrcTxt+'）');
    if(q.ate&&q.ate!=='—')extra.push('ATE：'+q.ate);
    var noCls=(q.uni==='未维护统一分类'||q.uni==='—');
    return '<tr>'
      +'<td><b>'+esc(f.name)+'</b>'
        +(f.secret&&!dv?' <span class="tag purple">保密</span>':'')+'</td>'
      +'<td class="mono">'+esc(f.cas||'—')+'</td>'
      +'<td class="mono">'+esc(r.ec||'—')+'</td>'
      +'<td class="mono" style="font-size:11.5px">'+esc(r.reachNo||'N/A')+'</td>'
      +'<td class="ctr">'+esc(conc)
        /* 「区间披露」是内部系统口径提示，真实 SDS 交付件只给区间数值本身 */
        +(f.secret&&!dv?'<br><small style="color:var(--muted)">区间披露</small>':'')+'</td>'
      +'<td style="font-size:11.5px">'
        +(noCls?'<span class="muted">Not available</span>':esc(q.uni))+'</td>'
      +'<td style="font-size:11.5px">'
        +(extra.length?extra.map(esc).join('<br>'):'<span class="muted">N/A</span>')+'</td>'
      +'</tr>';
  }).join('');
  return '<div class="tbl-wrap" style="margin:0 0 10px">'
    +'<table class="tbl mini"><thead><tr>'
      +'<th style="width:140px">物质名称</th>'
      +'<th style="width:96px">CAS 号</th>'
      +'<th style="width:96px">EC 号</th>'
      +'<th style="width:150px">REACH 注册号</th>'
      +'<th style="width:86px">浓度</th>'
      +'<th style="width:160px">分类</th>'
      +'<th>SCL / M 因子 / ATE</th>'
    +'</tr></thead><tbody>'+tr+'</tbody></table></div>';
}

/* ==================================================================
   G3 · 第 8 章职业接触限值（OEL）表 + 8.2 暴露控制补全

   修复前：第 8 章只有两行硬编码文本，写的是「乙二醇单丁醚 20 ppm / 甲醛 0.3 ppm」，
   与当前配方无关 —— 是别的产品的数据，演示时会被懂行的当场看穿。

   修复后：按目标市场（EU / CN）从 OEL_DATA 取当前配方各组分所在国家/地区的限值，
   8h 与 15min 双时段 + Note 脚注，与示例文档列结构一致。
   8.1.2 附加限值、8.1.3 DNEL/PNEC 按法规要求留位；8.2 补齐热危害与环境暴露控制。
   ================================================================== */
var OEL_DATA={
  /* 演示数据：8h = 8 小时时间加权平均；15min = 短期接触限值（STEL）
     同一物质在不同成员国限值可能不同，逐个列出才符合真实 SDS 的写法。
     '—' 表示该国未就该物质设立该项限值。 */
  EU:{
    '111-76-2':[{c:'欧盟（IOELV）',p8:'20',m8:'98',p15:'50',m15:'246',note:'皮肤吸收（Skin）'}],
    '64-17-5':[{c:'欧盟（IOELV）',p8:'—',m8:'—',p15:'—',m15:'—',note:'未设立欧盟层面限值'}],
    '50-00-0':[{c:'欧盟（IOELV）',p8:'0.3',m8:'0.37',p15:'0.6',m15:'0.74',note:'致敏（Sen）· 致癌 1B'},
               {c:'德国（TRGS 900）',p8:'0.3',m8:'0.37',p15:'0.6',m15:'0.74',note:'致癌物，不设安全阈值'},
               {c:'波兰',p8:'0.3',m8:'0.37',p15:'0.6',m15:'0.74',note:'NDS / NDSCh'}],
    '79-10-7':[{c:'德国（TRGS 900）',p8:'2',m8:'5.9',p15:'4',m15:'11.8',note:'—'},
               {c:'爱尔兰',p8:'2',m8:'5.9',p15:'—',m15:'—',note:'OELV（8h）'}],
    '9009-54-5':[{c:'欧盟（IOELV）',p8:'—',m8:'—',p15:'—',m15:'—',note:'聚合物，未设立'}],
    '7732-18-5':[{c:'欧盟（IOELV）',p8:'—',m8:'—',p15:'—',m15:'—',note:'不适用'}]
  },
  CN:{
    '111-76-2':[{c:'中国（GBZ 2.1）',p8:'—',m8:'97',p15:'—',m15:'—',note:'PC-TWA'}],
    '64-17-5':[{c:'中国（GBZ 2.1）',p8:'—',m8:'—',p15:'—',m15:'—',note:'未制定'}],
    '50-00-0':[{c:'中国（GBZ 2.1）',p8:'—',m8:'0.5',p15:'—',m15:'—',note:'PC-TWA · 致癌 G1'}],
    '79-10-7':[{c:'中国（GBZ 2.1）',p8:'—',m8:'6',p15:'—',m15:'—',note:'PC-TWA'}],
    '9009-54-5':[{c:'中国（GBZ 2.1）',p8:'—',m8:'—',p15:'—',m15:'—',note:'未制定'}],
    '7732-18-5':[{c:'中国（GBZ 2.1）',p8:'—',m8:'—',p15:'—',m15:'—',note:'不适用'}]
  }
};
function oelCell(o,a,b){
  if(o[a]==='—'&&o[b]==='—')return '<span class="muted">未设立</span>';
  return (o[a]||'—')+' / '+(o[b]||'—');
}
function oelTableHtml(){
  var eu=wz.project.market==='EU';
  var db=OEL_DATA[eu?'EU':'CN']||{};
  if(!wz.formula.length){
    return '<div style="padding:10px 14px;color:var(--muted);font-size:12.5px">'
      +'　（配方尚未录入，接触限值表待生成）</div>';
  }
  var tr=[];
  wz.formula.forEach(function(f){
    var r=DB_CFG.component.rows.filter(function(x){return x.cas===f.cas;})[0]||{};
    var list=db[f.cas]||[{c:eu?'欧盟（IOELV）':'中国（GBZ 2.1）',
      p8:'—',m8:'—',p15:'—',m15:'—',note:'本库尚未维护该物质限值'}];
    list.forEach(function(o,i){
      var first=(i===0);
      tr.push('<tr>'
        +'<td>'+esc(o.c)+'</td>'
        +'<td>'+(first?'<b>'+esc(f.name)+'</b>':'<span class="muted">〃</span>')+'</td>'
        +'<td class="mono">'+(first?esc(r.ec||'—'):'')+'</td>'
        +'<td class="mono">'+(first?esc(f.cas):'')+'</td>'
        +'<td class="ctr">'+oelCell(o,'p8','m8')+'</td>'
        +'<td class="ctr">'+oelCell(o,'p15','m15')+'</td>'
        +'<td style="font-size:11.5px">'+esc(o.note||'—')+'</td></tr>');
    });
  });
  return '<div class="tbl-wrap" style="margin:0 0 10px">'
    +'<table class="tbl mini"><thead><tr>'
      +'<th style="width:130px">国家 / 地区</th>'
      +'<th style="width:120px">物质</th>'
      +'<th style="width:96px">EC 号</th>'
      +'<th style="width:96px">CAS 号</th>'
      +'<th style="width:130px">8h（ppm / mg/m³）</th>'
      +'<th style="width:130px">15min（ppm / mg/m³）</th>'
      +'<th>Note</th>'
    +'</tr></thead><tbody>'+tr.join('')+'</tbody></table></div>';
}
