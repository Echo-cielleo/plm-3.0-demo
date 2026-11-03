# -*- coding: utf-8 -*-
"""设备使用记录（eq:use）专项自检
覆盖：菜单位置 / 列表列与种子数据 / 筛选（设备·状态·日期范围）/ 新增登记 / 归还 /
     设备列表与设备详情跳入预筛 / 0 JS 错误。"""
import sys
from playwright.sync_api import sync_playwright

_CHROME_PATH = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
F = "/Users/dowell/Desktop/code/workbuddy/PLM/PLM3.0全系统演示原型.html"
fails = []


def ok(cond, msg):
    print(("✔ " if cond else "❌ ") + msg)
    if not cond:
        fails.append(msg)


with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=_CHROME_PATH, args=["--no-sandbox"])
    ctx = b.new_context(viewport={'width': 1680, 'height': 1050})
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto("file://" + F)
    pg.wait_for_timeout(1600)

    print("=== 菜单与种子数据 ===")
    r = pg.evaluate("""()=>{
      var g=MENU.find(x=>x.id==='eq');
      var names=g.children.map(c=>c.id);
      return {order:names, n:EQUIP_USES.length,
              inUse:EQUIP_USES.filter(x=>x.status==='在用').length,
              returned:EQUIP_USES.filter(x=>x.status==='已归还').length,
              allEqKnown:EQUIP_USES.every(x=>!!eqById(x.eq)),
              hasDept:EQUIP_USES.every(x=>!!x.dept),
              statusVals:[...new Set(EQUIP_USES.map(x=>x.status))]};
    }""")
    ok(r['order'].index('eq:use') == r['order'].index('eq:list') + 1,
       "菜单「使用记录」紧跟「设备列表」之后")
    ok(r['n'] == 10, "种子数据 10 条（实际 %d）" % r['n'])
    ok(2 <= r['inUse'] <= 3, "状态=在用 2~3 条（实际 %d）" % r['inUse'])
    ok(r['inUse'] + r['returned'] == r['n'], "其余全部为已归还（%d）" % r['returned'])
    ok(r['allEqKnown'], "设备编号全部能在 EQUIPMENTS 中联查到")
    ok(r['hasDept'], "每条都有所属部门（来自 27z8 补齐）")
    ok(set(r['statusVals']) == {'在用', '已归还'}, "状态枚举只有 在用/已归还")

    print("\n=== 列表页与列 ===")
    pg.evaluate("showPage('eq:use')")
    pg.wait_for_timeout(400)
    heads = pg.evaluate("()=>[...document.querySelectorAll('#lpHost thead th')].map(t=>t.textContent.trim())")
    for col in ['日期', '设备', '使用人', '所属部门', '用途 / 关联实验', '领用时间', '归还时间', '状态', '备注']:
        ok(col in heads, "列头含「%s」" % col)
    body = pg.inner_text('#lpHost')
    ok('EQ-2026-001' in body and '电子万能材料试验机' in body, "设备列同时显示编号与名称（联查 EQUIPMENTS）")
    ok('拉伸强度' in body, "种子场景贴合研发（力学试验）")
    ok(pg.evaluate("()=>EQUIP_USES.every(x=>x.date===x.date && /^\\d{4}-\\d{2}-\\d{2}$/.test(x.date))"),
       "日期均为 YYYY-MM-DD（演示锚点平移生成）")
    ok(pg.evaluate("()=>document.querySelector('#lpHost [data-drange=from]')!==null"),
       "工具条含日期范围控件（from）")
    ok(pg.evaluate("()=>document.querySelector('#lpHost [data-drange=to]')!==null"),
       "工具条含日期范围控件（to）")

    print("\n=== 筛选 ===")
    # 状态筛选
    pg.select_option("[data-flt='status']", "在用")
    pg.wait_for_timeout(250)
    n_inuse = pg.evaluate("()=>EQUIP_USES.filter(x=>x.status==='在用').length")
    rows = pg.evaluate("()=>[...document.querySelectorAll('#lpHost tbody tr')].map(t=>t.textContent)")
    ok(len(rows) == n_inuse and all('在用' in t for t in rows),
       "状态筛选=在用 → %d 行全为在用" % n_inuse)
    ok(all('归还' not in t or '在用' in t for t in rows), "筛选后不含已归还行")
    # 设备筛选
    pg.select_option("[data-flt='status']", "")
    pg.select_option("[data-flt='eq']", "EQ-2026-002")
    pg.wait_for_timeout(250)
    rows = pg.evaluate("()=>[...document.querySelectorAll('#lpHost tbody tr')].map(t=>t.textContent)")
    ok(len(rows) >= 1 and all('EQ-2026-002' in t for t in rows),
       "设备筛选=EQ-2026-002 → %d 行全为该设备" % len(rows))
    # 日期范围：[-2,-1] 应只含近两天
    dates = pg.evaluate("()=>[...new Set(EQUIP_USES.map(x=>x.date))].sort()")
    d_from, d_to = dates[-2], dates[-1]
    pg.select_option("[data-flt='eq']", "")
    pg.fill("[data-drange='from']", d_from)
    pg.dispatch_event("[data-drange='from']", "change")
    pg.fill("[data-drange='to']", d_to)
    pg.dispatch_event("[data-drange='to']", "change")
    pg.wait_for_timeout(300)
    rows = pg.evaluate("()=>[...document.querySelectorAll('#lpHost tbody tr')].map(t=>t.textContent)")
    ok(len(rows) >= 2 and all(d_from <= t.split()[0] <= d_to for t in rows if 'EU-' in t),
       "日期范围 %s~%s → 行日期全部落在区间内（%d 行）" % (d_from, d_to, len(rows)))
    # 重置
    pg.click("[data-lp-reset]")
    pg.wait_for_timeout(250)
    n_all = pg.evaluate("()=>EQUIP_USES.length")
    rows = pg.evaluate("()=>[...document.querySelectorAll('#lpHost tbody tr')].length")
    ok(rows == min(n_all, 10), "重置筛选恢复全量（%d 行）" % rows)
    ok(pg.evaluate("()=>document.querySelector(\"[data-drange='from']\").value===''"),
       "重置后日期范围控件清空")

    print("\n=== 新增使用登记 ===")
    pg.click("text=＋ 使用登记")
    pg.wait_for_timeout(300)
    ok(pg.evaluate("()=>$('mask').className==='on'"), "「使用登记」弹窗打开")
    opt_n = pg.evaluate("()=>document.querySelectorAll('#euEq option').length")
    ok(opt_n == EQUIPMENTS_LEN if False else opt_n == pg.evaluate("()=>EQUIPMENTS.length"),
       "设备下拉覆盖全部 EQUIPMENTS（%d 项）" % opt_n)
    ok(pg.evaluate("""()=>[...document.querySelectorAll('#euEq option')].some(o=>o.disabled && o.textContent.indexOf('维修')>=0)"""),
       "非「正常」状态设备在下拉中禁用并标注状态")
    pg.select_option("#euEq", "EQ-2026-009")
    pg.fill("#euUser", "测试员")
    pg.fill("#euUse", "粒径分析冒烟测试")
    pg.click("text=确认登记")
    pg.wait_for_timeout(400)
    ok(pg.evaluate("()=>EQUIP_USES[0].status==='在用' && EQUIP_USES[0].user==='测试员' && EQUIP_USES[0].use==='粒径分析冒烟测试'"),
       "提交后新记录置顶且状态=在用")
    ok(pg.evaluate("()=>/^EU-2026-\\d{4}$/.test(EQUIP_USES[0].id)"), "新记录编号沿用 EU-2026-xxxx 序列")
    ok(pg.evaluate("()=>EQUIP_USES[0].dept") == '研发部', "新记录部门自动带出（EQ-2026-009 → 研发部）")
    # 必填校验
    pg.click("text=＋ 使用登记")
    pg.wait_for_timeout(300)
    pg.fill("#euUser", "")
    pg.click("text=确认登记")
    pg.wait_for_timeout(250)
    ok(pg.evaluate("()=>$('mask').className==='on'"), "使用人为空时被拦截，弹窗不关")
    pg.evaluate("closeModal()")

    print("\n=== 归还 ===")
    # 直接对第一条在用记录归还
    pg.evaluate("""()=>{ var r=EQUIP_USES.find(x=>x.status==='在用'); window._equTest=r.id; }""")
    pg.evaluate("equReturn(EQUIP_USES.find(x=>x.status==='在用').id)")
    pg.wait_for_timeout(300)
    ok(pg.evaluate("()=>$('mask').className==='on'"), "「归还」弹窗打开")
    ok(pg.evaluate("()=>document.getElementById('euTo').value!==''"), "归还时间预填当前时刻")
    pg.fill("#euTo", "18:00")
    pg.click("text=确认归还")
    pg.wait_for_timeout(400)
    rid = pg.evaluate("()=>window._equTest")
    r = pg.evaluate("()=>{var x=EQUIP_USES.find(y=>y.id===window._equTest);return [x.status,x.tTo];}")
    ok(r[0] == '已归还' and r[1] == '18:00', "确认归还后状态=已归还、时间=18:00")

    print("\n=== 设备列表 / 详情跳入预筛 ===")
    pg.evaluate("showPage('eq:list')")
    pg.wait_for_timeout(400)
    ok(pg.evaluate("()=>[...document.querySelectorAll('#lpHost .op button')].some(b=>b.textContent==='使用记录')"),
       "设备列表行操作含「使用记录」")
    pg.evaluate("showPage('eq:use',{eq:'EQ-2026-004'})")
    pg.wait_for_timeout(400)
    v = pg.evaluate("()=>document.querySelector(\"[data-flt='eq']\").value")
    rows = pg.evaluate("()=>[...document.querySelectorAll('#lpHost tbody tr')].map(t=>t.textContent)")
    ok(v == 'EQ-2026-004', "showPage 传参后设备筛选已预填 EQ-2026-004")
    ok(len(rows) >= 1 and all('EQ-2026-004' in t for t in rows), "预筛后列表只显示该设备记录")
    ok('SB-11 耐黄变评估' in pg.inner_text('#lpHost'), "预筛内容正确（QUV 使用记录可见）")
    # 无记录设备 → 空态
    pg.evaluate("showPage('eq:use',{eq:'EQ-2026-005'})")
    pg.wait_for_timeout(400)
    ok('暂无数据' in pg.inner_text('#lpHost'), "无记录设备（EQ-2026-005）显示空态")
    # 设备详情入口
    pg.evaluate("showPage('eq:list')")
    pg.wait_for_timeout(300)
    pg.evaluate("mdOpenEq('EQ-2026-003')")
    pg.wait_for_timeout(500)
    ok(pg.evaluate("curPage") == 'eq:list-detail', "打开设备详情页")
    ok(pg.evaluate("""()=>[...document.querySelectorAll('#pageHost button')].some(b=>b.textContent==='使用记录')"""),
       "设备详情页含「使用记录」按钮")
    pg.evaluate("""()=>[...document.querySelectorAll('#pageHost button')].filter(b=>b.textContent==='使用记录')[0].click()""")
    pg.wait_for_timeout(500)
    ok(pg.evaluate("curPage") == 'eq:use', "详情页按钮跳到使用记录页")
    ok(pg.evaluate("()=>document.querySelector(\"[data-flt='eq']\").value==='EQ-2026-003'"),
       "从详情跳入同样预筛该设备")

    print("\n=== 无 JS 错误 ===")
    ok(len(errs) == 0, "运行期 0 JS 错误" + ("" if not errs else " -> " + str(errs[:2])))
    b.close()

print("\n失败项：%d" % len(fails))
if fails:
    for f in fails:
        print("  - " + f)
    sys.exit(1)
print("全部通过 ✅")
