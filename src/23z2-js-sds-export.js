/* ==================================================================
   [23z2] 第 5 步交付预览 · 模拟 Word/PDF 文档流 + 无交互导出 Word

   需求：交付预览（dv 视图）从「网页卡片 / 手风琴」改为「连续文档」外观，
        像 Office / PDF 阅读器里的正式文档；并新增一个无交互的导出 Word 按钮
        （点击即生成 .doc 下载，不走需发布解锁的 wzExport 弹窗）。

   范围：仅交付预览（dv）走文档流；编制视图（edit）保持原工作台手风琴不变。
   约定：新功能进新分片，renderStep5 只加最小调用钩子。
   ================================================================== */

/* 文档正文（封面 + 16 章连续正文，不含顶部工具条 / 切换栏） */
function sdsDraftBodyHtml(documentStatus){
  var p = wz.project, eu = p.market === 'EU';
  var dirty = deliverScan();
  var cover =
    '<div class="doc-cover">'
      + '<div class="cover-title">SAFETY DATA SHEET</div>'
      + '<div class="cover-sub">安全数据表</div>'
      + '<div class="cover-prod">' + esc(p.product || '未命名产品') + '</div>'
      + '<div class="cover-meta">'
        + '<span>版本 ' + esc(wz.docVer || 'V1.0') + '</span>'
        + '<span>编制日期 ' + todayStr() + '</span>'
        + '<span>目标市场：' + (eu ? ('欧盟 · ' + esc(p.state || '—')) : '中国') + '</span>'
        + '<span>语言：' + esc(p.lang || '—') + '</span>'
      + '</div>'
      + '<div class="cover-sup">'
        + '<div>供应商 / 责任主体：' + esc(p.orName || '—') + '</div>'
        + (p.emerg ? '<div>应急电话：' + esc(p.emerg) + '</div>' : '')
      + '</div>'
      + '<div class="cover-basis"><b>编制依据：</b><br>' + esc(legalBasis(p.market)).replace(/\n/g, '<br>') + '</div>'
      + '<div class="cover-badge">' + deliverBadge(dirty) + '</div>'
    + '</div>';
  var secs = SDS_16.map(function (s, i) {
    var txt = wz.draftEdits[i] !== undefined ? wz.draftEdits[i] : draftText(i,documentStatus);
    var body = esc(txt).replace(/\n/g, '<br>');
    var extra = (i === 2 ? compTableHtml() : '') + (i === 7 ? oelTableHtml() : '')
      + (i === 8 ? physTableHtml() : '') + (i === 10 ? toxTableHtml() : '')
      + (i === 11 ? ecotoxTableHtml() : '') + (i === 13 ? transportTableHtml() : '')
      + (i === 14 ? legalTableHtml() : '');
    return '<section class="doc-sec-wrap">'
      + '<h2 class="doc-sec"><span class="doc-sec-no">' + String(i + 1).padStart(2, '0') + '</span>' + esc(s.n) + '</h2>'
      + '<div class="sds-text">' + body + '</div>'
      + (extra ? '<div class="doc-tbl">' + extra + '</div>' : '')
      + '</section>';
  }).join('');
  return cover + secs;
}
function sdsEffectiveBodyHtml(){
  var release=wz.published&&sdsActiveRelease();
  return release?release.document.bodyHtml:sdsDraftBodyHtml();
}
function sdsDocBodyHtml(){return sdsEffectiveBodyHtml();}

/* 预览外壳：灰底 + 白纸 + 页脚（依赖页面 CSS 视觉） */
function sdsDocPreviewHtml(){
  var release=wz.published&&sdsActiveRelease();
  return '<div class="doc-shell"><div class="doc-page">'
    + sdsDocBodyHtml()
    + '<div class="doc-foot">PLM 3.0 演示原型 · 第 5 步交付预览 · '
      + esc(release?release.document.productName:wz.project.product || '未命名产品') + '</div>'
    + '</div></div>';
}

/* 无交互导出 Word：拼一份 Word 可识别的 HTML（自带内联样式），
   点击即下载，不弹窗、不受发布状态限制（草案亦可导出预览副本） */
function exportSdsWord(){
  var release=wz.published&&sdsActiveRelease(),p=release?release.document:wz.project;
  var name = (p.productName || p.product || 'SDS') + '_' + (p.market === 'EU' ? 'EU' : 'CN') + '_'
           + (release?release.documentVersion:(wz.docVer || 'V1.0'))
           + (release ? '' : '_草案') + '.doc';
  var style = '<style>'
    + 'body{font-family:Calibri,\'Microsoft YaHei\',sans-serif;font-size:10.5pt;color:#1a1a1a;line-height:1.6;margin:34px}'
    + 'h1.cover-title{text-align:center;font-size:22pt;letter-spacing:2px;margin:0}'
    + '.cover-sub{text-align:center;font-size:12pt;color:#555;margin:2px 0 10px}'
    + '.cover-prod{text-align:center;font-size:15pt;font-weight:bold;margin-bottom:8px}'
    + '.cover-meta{display:flex;gap:18px;justify-content:center;flex-wrap:wrap;font-size:10.5pt;margin:4px 0}'
    + '.cover-sup{font-size:10.5pt;margin:4px 0}'
    + '.cover-basis{font-size:10pt;color:#444;margin-top:8px;line-height:1.7}'
    + '.cover-warn{font-size:9.5pt;color:#b42318;margin-top:6px}'
    + 'h2.doc-sec{border-bottom:1.5px solid #222;font-size:13pt;margin:18px 0 8px;padding-bottom:3px}'
    + '.doc-sec-no{color:#888;margin-right:8px}'
    + '.sds-text{white-space:pre-wrap;font-size:10.5pt}'
    + 'table.tbl{border-collapse:collapse;width:100%;margin:8px 0;font-size:9.5pt}'
    + 'table.tbl th,table.tbl td{border:1px solid #999;padding:3px 6px;text-align:left}'
    + 'table.tbl th{background:#f0f0f0}'
    + '</style>';
  var html = '<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office">'
    + '<head><meta charset="utf-8">' + style + '</head><body>'
    + sdsDocBodyHtml()
    + '</body></html>';
  downloadFile(name, html, 'application/msword');
  toast('已导出 Word 文档' + (release ? '' : '（草案副本，演示）'), 'ok');
}

/* 预览视觉样式（仅交付预览文档流生效，不影响编制视图） */
(function () {
  var st = document.createElement('style');
  st.textContent =
    '.doc-shell{background:#eef1f4;padding:18px 0 30px}'
    + '.doc-page{max-width:820px;margin:0 auto;background:#fff;box-shadow:0 2px 14px rgba(0,0,0,.12);'
    + 'padding:46px 54px;border-radius:2px;min-height:1100px}'
    + '.doc-cover{text-align:center;padding-bottom:14px;margin-bottom:6px;border-bottom:2px solid #222}'
    + '.cover-title{font-size:24px;letter-spacing:2px;font-weight:700}'
    + '.cover-sub{font-size:13px;color:#666;margin:2px 0 12px}'
    + '.cover-prod{font-size:18px;font-weight:700;margin-bottom:10px}'
    + '.cover-meta{display:flex;gap:18px;justify-content:center;flex-wrap:wrap;font-size:12.5px;color:#333}'
    + '.cover-sup{font-size:12.5px;color:#333;margin-top:6px}'
    + '.cover-basis{font-size:11.5px;color:#666;text-align:left;margin-top:10px;line-height:1.7}'
    + '.cover-warn{font-size:11px;color:#b42318;margin-top:6px}'
    + '.doc-sec-wrap{margin:0}'
    + '.doc-sec{font-size:15px;font-weight:700;border-bottom:1.5px solid #222;padding-bottom:3px;margin:20px 0 8px}'
    + '.doc-sec-no{color:#999;margin-right:8px}'
    + '.doc-tbl{margin:8px 0}'
    + '.doc-foot{margin-top:22px;padding-top:8px;border-top:1px solid #ddd;font-size:11px;color:#999;text-align:center}';
  document.head.appendChild(st);
})();
