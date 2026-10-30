# -*- coding: utf-8 -*-
"""试用反馈关键缺陷修复专项自检（2026-10-29 反馈批次）
覆盖：
  C3  遮罩吞文本选择——弹窗内拖选/全选，松开落在遮罩上不再闪退（#mask mousedown+mouseup 双判定）
  F17 CAS 改动后物质名称同步——命中带出；未命中清空名称 + 警示（fmCas / matRecipeCas 两处）
  F18 必填星号全局渲染——裸 openModal 弹窗（组分基础数据 dbEdit）必填项有星
"""
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
    ctx = b.new_context(viewport={'width': 1600, 'height': 1000})
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto("file://" + F)
    pg.wait_for_timeout(1600)

    # ================= C3：遮罩吞文本选择 =================
    print("=== C3 遮罩吞文本选择（闪退） ===")
    pg.evaluate("""()=>{
      renderSdsWizard(); pickMarket('EU');
      $('f_product').value='水性聚氨酯涂饰树脂 WPU-320'; wzValidate1();
      wzLoadMaterial('MAT-00127'); wzGo(2);
      fmPickComp(); ['7732-18-5','111-76-2'].forEach(c=>_pickCompSel[c]=1); fmPickApply();
      wz.frozen=true; wz.frozenAt=nowStr(); wzGo(3);
    }""")
    pg.wait_for_timeout(900)  # reCollect 700ms 延迟
    r = pg.evaluate("""()=>{
      var out=null;
      Object.keys(wz.collect).forEach(function(cas){
        (wz.collect[cas]||[]).forEach(function(it,idx){
          if(!out&&it.miss&&idx!==7&&!clpCollectControlled(idx))out={cas:cas,idx:idx,k:it.k};
        });
      });
      return out;
    }""")
    ok(bool(r), "第 3 步存在可打开「补充数据项」弹窗的缺失项（%s）" % (r or {}).get("k", ""))
    pg.evaluate("fillData(%s,%d)" % ('"%s"' % r['cas'], r['idx']))
    pg.wait_for_timeout(300)
    ok(pg.evaluate("()=>$('mask').className==='on'"), "「补充数据项」弹窗已打开")

    # 键盘全选（焦点在 textarea）
    pg.focus('#fdVal')
    pg.keyboard.press('Meta+a')
    pg.wait_for_timeout(150)
    ok(pg.evaluate("()=>$('mask').className==='on'"), "键盘 Cmd+A 全选后弹窗仍在（不闪退）")

    # 鼠标拖选、松开落在遮罩上（C3 原始操作路径）
    box = pg.locator('#fdVal').bounding_box()
    pg.mouse.move(box['x'] + 40, box['y'] + 10)
    pg.mouse.down()
    pg.mouse.move(box['x'] - 300, box['y'] - 200, steps=8)
    pg.mouse.up()
    pg.wait_for_timeout(250)
    ok(pg.evaluate("()=>$('mask').className==='on'"), "拖选文本松开在遮罩上弹窗仍在（C3 核心断言）")

    # 回归 1：正常点击遮罩空白处仍应关闭
    pg.mouse.click(60, 500)
    pg.wait_for_timeout(200)
    ok(pg.evaluate("()=>$('mask').className!=='on'"), "回归：点击遮罩空白处仍能关闭弹窗")

    # 回归 2：按下在遮罩、松开在弹窗内（拖入）不应关闭
    pg.evaluate("dbEdit(null)")
    pg.wait_for_timeout(250)
    mbox = pg.locator('#modal').bounding_box()
    pg.mouse.move(60, 500)
    pg.mouse.down()
    pg.mouse.move(mbox['x'] + 100, mbox['y'] + 100, steps=5)
    pg.mouse.up()
    pg.wait_for_timeout(200)
    ok(pg.evaluate("()=>$('mask').className==='on'"), "回归：按下遮罩拖进弹窗内松开不误关")
    pg.evaluate("closeModal()")

    # ================= F17：CAS 改动名称同步 =================
    print("\n=== F17 CAS 改动后物质名称同步 ===")
    pg.evaluate("""()=>{
      wz.frozen=false; wz.collected=false; wz.collect={};
      renderStep2(); wzUpdateFoot(); wzGo(2);
    }""")
    pg.wait_for_timeout(250)
    # 命中：改成甲苯
    pg.evaluate("fmCas(0,'108-88-3')")
    ok(pg.evaluate("()=>[wz.formula[0].cas,wz.formula[0].name]") == ['108-88-3', '甲苯'],
       "CAS 命中库：名称自动带出「甲苯」")
    # 未命中：改成反馈截图中的错号
    pg.evaluate("fmCas(0,'9003-03-6')")
    ok(pg.evaluate("()=>[wz.formula[0].cas,wz.formula[0].name]") == ['9003-03-6', ''],
       "CAS 未命中库：名称同步清空（不留旧物质名）")
    ok(pg.evaluate("()=>$('wzBody').querySelectorAll('tbody tr')[0].querySelectorAll('input')[1].value") == '',
       "未命中后 DOM 名称输入框同步清空")
    # 冻结校验兜底
    pg.evaluate("wz.formula[0].conc='50'; wz.formula[1].conc='50'")
    nbad = pg.evaluate("()=>wz.formula.filter(function(r){return !r.cas.trim()||!r.name.trim()||!r.conc;}).length")
    ok(nbad == 1, "空名称行被冻结校验识别（bad=%d，期望 1）" % nbad)

    # matRecipeCas 同款（物料主数据编辑弹窗内的配方子表）
    pg.evaluate("""()=>{
      dbKey='material'; _edForm='混合物（混合料）';
      _edRecipe=[{cas:'7732-18-5',name:'水',conc:'45',secret:false}];
    }""")
    pg.evaluate("matRecipeCas(0,'9003-03-6')")
    ok(pg.evaluate("()=>[_edRecipe[0].cas,_edRecipe[0].name]") == ['9003-03-6', ''],
       "物料配方子表 matRecipeCas 未命中同样清空名称")

    # ================= F18：必填星号全局渲染 =================
    print("\n=== F18 必填星号（组分基础数据新增弹窗） ===")
    pg.evaluate("showPage('bd:comp'); dbEdit(null)")
    pg.wait_for_timeout(300)
    stars = pg.evaluate("""()=>{
      var out={req:[],nreq:[]};
      document.querySelectorAll('#modal .field label').forEach(function(l){
        var has=l.className.indexOf('req')>=0;
        var cs=getComputedStyle(l,'::before');
        (has?out.req:out.nreq).push({t:l.textContent.trim(),star:cs.content});
      });
      return out;
    }""")
    req_ok = all(s['star'] == '"*"' for s in stars['req'])
    nreq_ok = all(s['star'] == 'none' for s in stars['nreq'])
    ok(req_ok and len(stars['req']) == 4,
       "必填 4 项（CAS/中文/英文/状态）全部渲染红星：req=%d, 全星=%s" % (len(stars['req']), req_ok))
    ok(nreq_ok, "非必填项无星（%d 项）" % len(stars['nreq']))
    # 供应商弹窗星号不回归（09-30 5c617ed 修过的场景）
    pg.evaluate("closeModal(); showPage('bd:supplier'); supForm(null)")
    pg.wait_for_timeout(300)
    sup = pg.evaluate("""()=>{
      var n=0;
      document.querySelectorAll('#modal .field label.req').forEach(function(l){
        if(getComputedStyle(l,'::before').content==='\"*\"')n++;
      });
      return {starred:n, total:document.querySelectorAll('#modal .field label.req').length};
    }""")
    ok(sup['starred'] == sup['total'] and sup['total'] > 0,
       "供应商弹窗必填星号无回归（%d/%d）" % (sup['starred'], sup['total']))

    print("\n=== 无 JS 错误 ===")
    ok(len(errs) == 0, "运行期 0 JS 错误" + ("" if not errs else " -> " + str(errs[:2])))
    b.close()

print("\n失败项：%d" % len(fails))
if fails:
    for f in fails:
        print("  - " + f)
    sys.exit(1)
print("全部通过 ✅")
