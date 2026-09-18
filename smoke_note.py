_CHROME_PATH = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
from playwright.sync_api import sync_playwright
F="/Users/dowell/Desktop/code/workbuddy/PLM/PLM3.0全系统演示原型.html"
errs=[]
# law:zdhc 由 23y regLawMaintenance 重新注册，说明按钮 key 为 law-zdhc-maint
# 2026-09-18：law:rohs 已改为「受限物质管理 · RoHS 限用物质」新页面（无说明面板），
# 此处改用同为分库维护页的 law:cn（说明 key law-cn）
PAGES=[("law:zdhc","ZDHC MRSL","law-zdhc-maint"),("law:cn","国内危化品法规库","law-cn"),("subst:list","受限物质管理","subst")]
def st(pg,key):
    return pg.evaluate("""(k)=>{
      var b=document.getElementById('nb-'+k), p=document.getElementById('np-'+k);
      if(!b||!p) return {miss:true};
      var r=p.getBoundingClientRect();
      return {btn:!!b, btnOn:b.classList.contains('on'),
              btnTxt:b.innerText.trim(), panelOpen:p.classList.contains('open'),
              h:Math.round(r.height), txt:p.innerText.trim().slice(0,60),
              inActs: !!b.closest('.page-acts')};
    }""",key)
with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path=_CHROME_PATH, args=["--no-sandbox"])
    pg=b.new_page(viewport={"width":1600,"height":1000})
    pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.on("console",lambda m:errs.append("console:"+m.text) if m.type=="error" else None)
    pg.goto("file://"+F); pg.wait_for_timeout(2200)
    for pid,title,key in PAGES:
        pg.evaluate("showPage('%s')"%pid); pg.wait_for_timeout(800)
        s0=st(pg,key)
        print("\n== %s (%s) =="%(title,pid))
        print("  收起态:",s0)
        assert not s0.get("miss"), "缺少说明按钮/面板"
        assert s0["h"]==0 and not s0["panelOpen"], "默认应为收起"
        assert s0["inActs"], "按钮应在标题右侧 .page-acts 内"
        # 点击展开
        pg.click("#nb-"+key); pg.wait_for_timeout(500)
        s1=st(pg,key)
        print("  展开态:",s1)
        assert s1["panelOpen"] and s1["h"]>30, "点击后应展开"
        assert s1["btnOn"], "按钮应高亮"
        # 翻页/筛选后保持（仅列表页）
        if pid=="subst:list":
            pg.fill("#lpKw","甲醛"); pg.wait_for_timeout(500)
            s2=st(pg,key); print("  搜索后:",{k:s2[k] for k in ("panelOpen","h")})
            assert s2["panelOpen"], "重渲染后应保持展开"
            pg.fill("#lpKw",""); pg.wait_for_timeout(400)
        # 再点收起
        pg.click("#nb-"+key); pg.wait_for_timeout(500)
        s3=st(pg,key); print("  再收起:",{k:s3[k] for k in ("panelOpen","h")})
        assert not s3["panelOpen"] and s3["h"]==0, "再次点击应收起"
    print("\nJS errors:",errs)
    b.close()
print("ALL PASS")


# --- 统一退出码：存在失败断言时返回非零，避免 run_smoke.sh 误判为通过 ---
if errs:
    raise SystemExit(1)
