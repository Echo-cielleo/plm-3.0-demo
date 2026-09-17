# -*- coding: utf-8 -*-
"""扫描每个菜单页面的表格字段，输出 Markdown 清单"""
import pathlib, json
from playwright.sync_api import sync_playwright

_CHROME_PATH = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
URL = 'file://' + str(pathlib.Path('PLM3.0全系统演示原型.html').resolve())

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=_CHROME_PATH)
    page = b.new_context(viewport={'width': 1800, 'height': 1100}).new_page()
    page.goto(URL, wait_until='load')
    page.wait_for_timeout(700)

    items = page.evaluate("""() => {
      var out=[];
      MENU.forEach(g=>{
        var gname=g.name;
        if(g.page) out.push({id:g.page, path:[gname]});
        (g.children||[]).forEach(c=>{
          var cname=gname+' > '+c.name;
          if(c.children){
            (c.children||[]).forEach(cc=>out.push({id:cc.id, path:[gname,c.name,cc.name]}));
          } else {
            out.push({id:c.id, path:[gname,c.name]});
          }
        });
      });
      return out;
    }""")

    res = []
    for it in items:
        pid = it['id']
        try:
            page.evaluate('showPage("%s")' % pid)
            page.wait_for_timeout(260)
        except Exception as ex:
            res.append({**it, 'err': str(ex).splitlines()[0]})
            continue
        tables = page.evaluate("""() => {
          var host=document.querySelector('#pageHost');
          var out=[];
          host.querySelectorAll('table').forEach(function(t){
            if(t.parentElement.closest('table')) return;   // 跳过嵌套子表
            if(t.offsetParent===null && t.closest('tr[style*="display:none"], .hide, [hidden]')) return;
            var hrow=t.querySelector('thead tr');           // 只取首行表头
            var ths=[...hrow.querySelectorAll('th, td')].map(function(x){
              var s=x.textContent.trim().replace(/\\s+/g,'');
              if(!s && x.querySelector('input[type=checkbox]')) s='[选择列]';
              return s||'[空列]';
            });
            var trs=[...t.querySelectorAll('tbody tr')].filter(r=>!r.parentElement.closest('tr')).length;
            if(ths.length) out.push({cols:ths, rows:trs});
          });
          return out;
        }""")
        res.append({**it, 'tables': tables})

    b.close()

lines = ['# PLM 3.0 原型 · 各菜单表格字段现状清单', '', '> 自动扫描生成，供逐项确认。`行数`为当前 mock 数据条数。', '']
cur1 = None
for r in res:
    path = r['path']
    if path[0] != cur1:
        cur1 = path[0]
        lines.append('\n## %s\n' % cur1)
    name = path[-1]
    pid = r['id']
    lines.append('### %s  `%s`' % (name, pid))
    lines.append('路径：%s' % ' > '.join(path))
    if r.get('err'):
        lines.append('- ⚠ 渲染异常：%s' % r['err'])
    elif not r.get('tables'):
        lines.append('- （无 table 结构 — 卡片/表单/图表页）')
    else:
        for i, t in enumerate(r['tables'], 1):
            tag = '' if len(r['tables']) == 1 else ' · 表%d' % i
            lines.append('- 字段%s（%d 列 / %d 行）：`%s`' % (tag, len(t['cols']), t['rows'], '` | `'.join(t['cols'])))
    lines.append('')

out = pathlib.Path('表格字段清单.md')
out.write_text('\n'.join(lines), encoding='utf-8')
print('写入', out.resolve(), '共 %d 个菜单项' % len(res))
