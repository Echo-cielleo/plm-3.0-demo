/* ==================================================================
   [23y1] GHS 象形图（演示用内联矢量图）
   ------------------------------------------------------------------
   用途：法规统一查询 · GHS 分类页签的「象形图」列。
   说明：原型不引入外部图片资产，用内联 SVG 画「红菱形 + 黑色符号」。
        GHS 代码沿用 CLP 附录 VI 数据里的 pictograms 字段（GHS01–GHS09）。
        ⚠️ 图形为示意画法，正式标识以联合国 GHS 与各国官方版本为准。
   尺寸：viewBox 48×48，展示 30×30；菱形顶点贴边，符号限制在内切圆内。
   ================================================================== */
/* ⚠️ 单一事实源：象形图「名称」取 CLP 法规库 Annex V 的 CLP_PICTO（官方 Annex V 名称）。
   该表在 23z6-js-clp.js 定义、加载顺序晚于本分片，故用运行时惰性查找，不在此处拷贝一份；
   下面的 fallback 只在 CLP 分片缺失时兜底，名称与 CLP_PICTO 保持一致。 */
var GHS_PICTO_NAME_FALLBACK={
  GHS01:'爆炸物',GHS02:'火焰',GHS03:'火焰在圆环上',GHS04:'气瓶',GHS05:'腐蚀',
  GHS06:'骷髅与交叉骨',GHS07:'感叹号',GHS08:'健康危害',GHS09:'环境'
};
/* 符号本体：坐标以 (20,20) 为中心设计，外层统一 translate(4,4) 后落在 48×48 中央。
   注意：本表只负责「图形」，与 CLP 页 Annex V 的素材占位（.pdia，讲的是专员上传维护素材）
   是两回事，两者并存属设计意图，不要互相顶掉。 */
var GHS_PICTO_GLYPH={
  GHS01:'<circle cx="20" cy="24.5" r="5.2" fill="#1b1b1b"/>'+
    '<path d="M20 8.5 L22.4 15.6 L20 18 L17.6 15.6 Z" fill="#1b1b1b"/>'+
    '<path d="M31.5 12.5 L25.4 17.6 L23 15.2 L28.1 9.1 Z" fill="#1b1b1b"/>'+
    '<path d="M8.5 12.5 L14.6 17.6 L17 15.2 L11.9 9.1 Z" fill="#1b1b1b"/>',
  GHS02:'<path d="M20 8.8 C21.9 13.3 27 15.4 27 20.3 A7 7 0 0 1 13 20.3 C13 16.6 15.7 15.2 17.3 13 C18.3 11.6 18.9 10.8 20 8.8 Z" fill="#1b1b1b"/>'+
    '<path d="M20 16.6 C20.9 18.8 23 19.6 23 21.8 A3 3 0 0 1 17 21.8 C17 20 19 19.2 20 16.6 Z" fill="#fff"/>',
  GHS03:'<circle cx="20" cy="27.4" r="4.6" fill="none" stroke="#1b1b1b" stroke-width="2.4"/>'+
    '<path d="M20 7.6 C21.5 10.8 25.5 12.4 25.5 16 A5.5 5.5 0 0 1 14.5 16 C14.5 13.2 17 12 18.3 10.4 C19.1 9.5 19.5 9.1 20 7.6 Z" fill="#1b1b1b"/>',
  GHS04:'<rect x="15.5" y="12.6" width="9" height="19" rx="2.6" fill="#1b1b1b"/>'+
    '<rect x="18.3" y="8.4" width="3.4" height="4.6" rx="1" fill="#1b1b1b"/>'+
    '<rect x="15.5" y="19.2" width="9" height="4" fill="#fff"/>',
  GHS05:'<path d="M20 8.8 C21.7 11.8 23.4 13.5 23.4 15.5 A3.4 3.4 0 0 1 16.6 15.5 C16.6 13.5 18.3 11.8 20 8.8 Z" fill="#1b1b1b"/>'+
    '<path d="M10.5 23.6 H17.2 L20 28.6 L22.8 23.6 H29.5" fill="none" stroke="#1b1b1b" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
  GHS06:'<path d="M20 7.2 C15.9 7.2 12.8 9.9 12.8 13.6 C12.8 15.7 13.7 17.1 14.7 17.9 V20.1 C14.7 20.9 15.3 21.4 16.1 21.4 H23.9 C24.7 21.4 25.3 20.9 25.3 20.1 V17.9 C26.3 17.1 27.2 15.7 27.2 13.6 C27.2 9.9 24.1 7.2 20 7.2 Z" fill="#1b1b1b"/>'+
    '<circle cx="17" cy="13.4" r="2.1" fill="#fff"/><circle cx="23" cy="13.4" r="2.1" fill="#fff"/>'+
    '<path d="M19.1 17 H20.9 V19.6 H19.1 Z" fill="#fff"/>'+
    '<g stroke="#1b1b1b" stroke-width="2.4" stroke-linecap="round"><path d="M11.5 31 L28.5 25.4"/><path d="M11.5 25.4 L28.5 31"/></g>',
  GHS07:'<rect x="18.2" y="8.8" width="3.6" height="12.6" rx="1.8" fill="#1b1b1b"/>'+
    '<circle cx="20" cy="26.2" r="2.2" fill="#1b1b1b"/>',
  GHS08:'<circle cx="20" cy="10" r="2.7" fill="#1b1b1b"/>'+
    '<path d="M20 13.8 C16.7 13.8 14.5 15.4 13.5 17.8 C12.4 20.4 11.9 24.4 11.6 30.4 H28.4 C28.1 24.4 27.6 20.4 26.5 17.8 C25.5 15.4 23.3 13.8 20 13.8 Z" fill="#1b1b1b"/>'+
    '<path d="M20 18 L21.2 20.6 L24 20.9 L21.9 22.8 L22.5 25.6 L20 24.2 L17.5 25.6 L18.1 22.8 L16 20.9 L18.8 20.6 Z" fill="#fff"/>',
  GHS09:'<ellipse cx="19" cy="24" rx="7.5" ry="4.6" fill="#1b1b1b"/>'+
    '<path d="M26 24 L31.4 20 V28 Z" fill="#1b1b1b"/>'+
    '<circle cx="15" cy="22.6" r="1" fill="#fff"/>'
};
function ghsPictoName(code){
  if(typeof CLP_PICTO!=='undefined'&&CLP_PICTO){
    for(var i=0;i<CLP_PICTO.length;i++){if(CLP_PICTO[i].code===code)return CLP_PICTO[i].name;}
  }
  return GHS_PICTO_NAME_FALLBACK[code]||code;
}
function ghsPictoSvg(code){
  var g=GHS_PICTO_GLYPH[code];if(!g)return '';
  var nm=ghsPictoName(code);
  return '<svg viewBox="0 0 48 48" width="30" height="30" role="img" aria-label="'+esc(code+' '+nm)+'" '+
    'style="display:block;flex:0 0 auto"><title>'+esc(code+' '+nm)+'</title>'+
    '<polygon points="24,1.8 46.2,24 24,46.2 1.8,24" fill="#fff" stroke="#D0202A" stroke-width="3.6" stroke-linejoin="round"/>'+
    '<g transform="translate(4,4)">'+g+'</g></svg>';
}
/* 代码数组 → 并排象形图；无可用代码时回落为破折号 */
function ghsPictoHtml(codes){
  var list=(codes||[]).filter(function(c){return !!GHS_PICTO_GLYPH[c];});
  if(!list.length)return '<span class="muted">—</span>';
  return '<span style="display:inline-flex;gap:3px;align-items:center;flex-wrap:wrap">'+
    list.map(ghsPictoSvg).join('')+'</span>';
}
/* 代码数组 → 文字（详情弹窗等紧凑场景用） */
function ghsPictoText(codes){
  var list=(codes||[]).filter(function(c){return !!GHS_PICTO_GLYPH[c];});
  return list.length?list.map(function(c){return c+' '+ghsPictoName(c);}).join(' / '):'—';
}
