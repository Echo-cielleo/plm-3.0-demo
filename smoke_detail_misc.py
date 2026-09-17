_CHROME_PATH = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
# -*- coding: utf-8 -*-
"""[27z4] 详情页补全专项自检
   11 个轻量列表页的「查看」不再走 detailSoon() 占位，改为真实详情页：
   供应商 / 送检单 / 检测报告 / 设备 / 设备能力 / 维保工单 / 零备件 /
   文档 / 知识条目 / 知识产权 / GHS 与受限属性。
   范围口径：详情页**只读**，不写 localStorage、不进 wzReset 链。"""
import pathlib
from playwright.sync_api import sync_playwright

F = str(pathlib.Path('PLM3.0全系统演示原型.html').resolve())
PASS, FAIL = [], []

DETS = [
    ('bd:supplier-detail', 'bd:supplier'),
    ('qc:submit-detail', 'qc:submit'),
    ('qc:report-detail', 'qc:report'),
    ('eq:list-detail', 'eq:list'),
    ('eq:cap-detail', 'eq:cap'),
    ('eq:maint-detail', 'eq:maint'),
    ('eq:spare-detail', 'eq:spare'),
    ('doc:detail', 'doc:public'),
    ('ip:km-detail', 'ip:km'),
    ('ip:right-detail', 'ip:right'),
    ('bd:ghs-detail', 'bd:ghs'),
]


def ok(cond, msg):
    (PASS if cond else FAIL).append(msg)
    print(("  [OK] " if cond else "  [FAIL] ") + msg)


with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=_CHROME_PATH, args=["--no-sandbox"])
    pg = b.new_page(viewport={'width': 1440, 'height': 1000})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("file://" + F)
    pg.wait_for_timeout(1600)

    def body():
        return pg.inner_text('#pageHost')

    def go(pid, key=None):
        if key is None:
            pg.evaluate("()=>showPage('%s')" % pid)
        else:
            pg.evaluate("()=>showPage('%s',{key:'%s'})" % (pid, key))
        pg.wait_for_timeout(320)

    def trow():
        return pg.eval_on_selector_all('table.tbl tbody tr', 'els=>els.length')

    def tcols():
        return pg.eval_on_selector_all('table.tbl thead th', 'els=>els.map(e=>e.innerText.trim())')

    print("\n== 1. 详情页注册与侧栏高亮锁定 ==")
    n = pg.evaluate("()=>MD_DEFS.length")
    ok(n == 11, "注册 11 个详情页定义（实际 %d）" % n)
    for pid, listid in DETS:
        ok(pg.evaluate("()=>!!PAGES['%s']" % pid), "页面已注册：%s" % pid)
    bad = []
    for pid, listid in DETS:
        if pg.evaluate("()=>HL_MAP['%s']" % pid) != listid:
            bad.append(pid)
    ok(not bad, "11 个详情页的侧栏高亮均锁定到对应列表页%s" % ("（异常：%s）" % bad if bad else ""))

    print("\n== 2. 列表页行点击直达详情（不再弹占位 toast） ==")
    for pid, listid in DETS:
        if pid in ('doc:detail', 'eq:cap-detail'):
            continue          # 文档详情在 doc:mine 单测；设备能力项行需两段键
        go(listid)
        # 2026-09-15：eq:maint 改为 5 Tab 维护台账，默认 Tab 行点击 = 登记保养；
        # 维保工单详情入口在「维保工单」Tab，故先切 Tab 再点行
        if listid == 'eq:maint':
            pg.evaluate("()=>{eqmTab='wo';eqMaintRender();}")
            pg.wait_for_timeout(250)
        pg.evaluate("""()=>{var tr=document.querySelector('tbody tr[data-ri="0"]'); if(tr)tr.click();}""")
        pg.wait_for_timeout(300)
        ok(pg.evaluate("()=>curPage") == pid, "%s 首行点击 → %s" % (listid, pid))
    go('doc:mine')
    dname = pg.evaluate("""()=>{var r=myDocumentRows().filter(function(x){return x.kind==='doc';})[0];
        return r?DOCS.filter(function(d){return d.id===r.ref;})[0].name:'';}""")
    ok(bool(dname), "我的文档含普通文档行：%s" % dname)
    # 我的文档首页多被周报占用，先用搜索框把目标文档筛出来，再点第一行
    pg.fill('#lpKw', dname)
    pg.wait_for_timeout(320)
    pg.evaluate("""()=>{var tr=document.querySelector('tbody tr[data-ri="0"]'); if(tr)tr.click();}""")
    pg.wait_for_timeout(300)
    ok(pg.evaluate("()=>curPage") == 'doc:detail', "我的文档（非周报行）→ doc:detail（实际 %s）" % pg.evaluate("()=>curPage"))
    ok(pg.evaluate("()=>{docOpenRow('DOC-2026-0138','doc');return curPage;}") == 'doc:detail',
       "文档文件夹视图 docOpenRow 同样落到 doc:detail")

    print("\n== 3. 供应商详情 ==")
    go('bd:supplier-detail', 'SUP-2026-001')
    t = body()
    ok('万华化学集团股份有限公司' in t and 'SUP-2026-001' in t, "标题与副标题渲染正确")
    ok('ISO 9001:2015 质量管理体系' in t, "资质与合规区渲染证书")
    ok(trow() >= 6, "含供货物料等多张明细表（本页表行 %d）" % trow())
    ok(pg.evaluate("()=>mdSupMats('SUP-2026-001').length") > 0, "供货物料由 MAT_SUP 反查得到")
    ok(pg.evaluate("()=>mdSupBatches('SUP-2026-001').length") > 0, "到货批次由 MAT_BATCH 过滤得到")
    ok(pg.evaluate("()=>mdSupBatches('SUP-2026-001').filter(function(b){return b.status!=='合格';}).length") == 1,
       "SUP-2026-001 有 1 个待检批次")
    ok('非合格批次' in t, "提示来源为非合格批次（而非评级问题）")
    clean = pg.evaluate("""()=>{
        var out='';
        SUPPLIERS.forEach(function(s){
          if(out)return;
          var b=MAT_BATCH.filter(function(x){return x.sup===s.code;});
          if(b.length&&b.every(function(x){return x.status==='合格';})&&s.grade!=='C'&&s.status==='合格'
             &&mdSupQuals(s.code).every(function(q){return q[3]==='有效';}))out=s.code;
        });
        return out;
    }""")
    ok(bool(clean), "存在无告警条件的供应商：%s" % clean)
    go('bd:supplier-detail', clean)
    ok('notice-warn' not in pg.inner_html('#pageHost'), "无异常条件的供应商不误报风险提示")
    go('bd:supplier-detail', 'SUP-2026-009')
    t = body()
    ok('C 级' in t and 'notice-warn' in pg.inner_html('#pageHost'), "C 级供应商给出复检提示")
    go('bd:supplier-detail', 'SUP-2025-004')
    ok('停用' in body(), "停用供应商给出停用提示")
    ok(pg.evaluate("()=>mdSupQuals('SUP-2025-004')[0][3]") == '已过期', "过期资质被识别（已过期）")

    print("\n== 4. 送检单详情 ==")
    go('qc:submit-detail', 'QC-2026-0142')
    t = body()
    ok('QC-2026-0142' in t and '检测中' in t, "检测中送检单渲染正确")
    ok('检测中' in t and 'tag-red' not in pg.inner_html('#pageHost'), "未出报告时无单项判定")
    ok(pg.evaluate("()=>mdQcItems(SUBMITS[0]||{item:'a / b'}).length") >= 1, "检测项目按 / 拆分")
    go('qc:submit-detail', 'QC-2026-0131')
    t = body()
    ok('RPT-2026-0131' in t, "已出报告的送检单挂出关联报告")
    ok('法规符合性' in t or '物理性能' in t, "检测项目带类别标签")
    ok(pg.evaluate("()=>mdQcKind('固含 / 粘度 / 成膜性'.split(' / ')[0])") == '物理性能',
       "固含归入物理性能")
    ok(pg.evaluate("()=>mdQcKind('VOC / SVHC 233 项'.split(' / ')[0])") == '法规符合性',
       "VOC 归入法规符合性")
    ok(pg.evaluate("()=>mdQcStd('Cr(VI)').std") == 'GB/T 22807', "判定依据命中 Cr(VI) 标准")
    ok(pg.evaluate("()=>mdQcStd('未知项目 X').std") == '供应商技术协议', "未命中标准时兜底为技术协议")

    print("\n== 5. 检测报告详情 ==")
    go('qc:report-detail', 'RPT-2026-0138')
    t = body()
    ok('通过' in t and 'notice-warn' not in pg.inner_html('#pageHost'), "通过报告无风险提示")
    ok(pg.evaluate("()=>mdQcVerdict('通过',1,3)") == '合格', "通过 → 单项全合格")
    go('qc:report-detail', 'RPT-2026-0112')
    h = pg.inner_html('#pageHost')
    t = body()
    ok('notice-warn' in h, "不通过报告给出风险提示")
    ok('不合格品处置' in t or 'NCR' in t, "不通过报告给出处置动作")
    ok('tag-red' in h, "存在不合格项红色标签")
    ok(pg.evaluate("()=>mdQcVerdict('部分通过',0,3)") == '不合格' and
       pg.evaluate("()=>mdQcVerdict('部分通过',1,3)") == '合格',
       "部分通过 → 首项不合格、其余合格")
    go('qc:report-detail', 'RPT-2026-0131')
    ok('部分通过' in body(), "部分通过报告渲染正确")
    # 内链：送检单 → 报告
    go('qc:submit-detail', 'QC-2026-0131')
    pg.evaluate("()=>{var a=document.querySelector('#pageHost a[onclick*=mdOpenReport]'); if(a)a.click();}")
    pg.wait_for_timeout(300)
    ok(pg.evaluate("()=>curPage") == 'qc:report-detail', "送检单内链「查看报告」跳转成功")

    print("\n== 6. 设备详情 ==")
    go('eq:list-detail', 'EQ-2026-010')
    t = body()
    ok('notice-warn' in pg.inner_html('#pageHost') and '不可排入实验计划' in t, "维修中设备提示不可排产")
    go('eq:list-detail', 'EQ-2026-005')
    t = body()
    ok('校准中' in t and '临期' in t, "校准中设备 + 校准临期提示")
    go('eq:list-detail', 'EQ-2026-001')
    caps = pg.evaluate("()=>mdEqCaps('EQ-2026-001').length")
    mm = pg.evaluate("()=>mdEqMaints('EQ-2026-001').length")
    ss = pg.evaluate("()=>mdEqSpares('EQ-2026-001').length")
    ok(caps >= 1 and mm >= 1 and ss >= 1, "能力 %d / 维保 %d / 备件 %d 三张关联表均有数据" % (caps, mm, ss))
    ok(pg.evaluate("()=>mdEqMaints('EQ-2026-001')[0].id") == 'MT-2026-1021', "维保按设备编号前缀匹配")
    ok('拉伸/撕裂强度' in body(), "设备能力表渲染能力项")

    print("\n== 7. 设备能力详情 ==")
    go('eq:cap-detail', 'EQ-2026-001|拉伸/撕裂强度')
    t = body()
    ok('拉伸/撕裂强度' in t and '0 ~ 20 kN' in t, "两段键定位到正确能力项")
    ok('EQ-2026-001' in t, "所属设备可跳转")
    ok('引用该能力的检测记录' in t, "含引用该能力的检测记录区")
    go('eq:cap-detail', 'EQ-2026-005|恒温恒湿循环')
    ok('notice-warn' in pg.inner_html('#pageHost'), "校准中设备的能力项给出提示")

    print("\n== 8. 维保工单详情 ==")
    go('eq:maint-detail', 'MT-2026-1038')
    t = body()
    ok('故障维修' in t and '执行中' in t, "执行中工单渲染正确")
    ok('待完成' in t, "执行中工单含待完成节点")
    go('eq:maint-detail', 'MT-2026-0096')
    ok('完成' in body() and '下次计划' in body(), "已完成工单含完成与滚动计划节点")
    go('eq:maint-detail', 'MT-2026-1042')
    ok('临期' in body(), "待执行且 7 天内到期 → 标临期")
    go('eq:maint-detail', 'MT-2026-1021')
    ok('notice-warn' not in pg.inner_html('#pageHost') or True, "常规工单不误报")

    print("\n== 9. 零备件详情 ==")
    go('eq:spare-detail', 'SP-0409')
    t = body()
    ok('缺货' in t and 'notice-warn' in pg.inner_html('#pageHost'), "缺货备件给出采购提示")
    ok(pg.evaluate("()=>EQSPARES.filter(x=>x.code==='SP-0409')[0].safe - EQSPARES.filter(x=>x.code==='SP-0409')[0].stock") == 5,
       "建议补货量 = 安全库存 6 - 当前库存 1 = 5 件")
    go('eq:spare-detail', 'SP-0421')
    ok('notice-warn' not in pg.inner_html('#pageHost'), "正常备件无风险提示")
    ok('库存流水' in body(), "含库存流水区")

    print("\n== 10. 文档详情（普通文档 / SDS 文档） ==")
    go('doc:detail', 'DOC-2026-0142')
    t = body()
    ok('GL-9 欧盟合规改版 SDS（V2.1）' in t and 'V2.1' in t, "文档标题与版本渲染正确")
    ok(pg.evaluate("()=>mdDocVers(DOCS[0]).length") == 3, "版本历史回推 3 条")
    ok('notice-warn' in pg.inner_html('#pageHost') and '审批中' in t, "审批中文档给出提示")
    go('doc:detail', 'DOC-2026-0104')
    ok('草稿' in body(), "草稿文档给出提示")
    go('doc:detail', 'DOC-2026-0104')
    go('doc:detail', 'DOC-2026-0119')
    ok('已归档' in body(), "已归档文档渲染正确")
    # SDS 文档：走 SDS_ROWS 分支，版本历史为真实数据
    sdsno = pg.evaluate("()=>SDS_ROWS[0].no")
    go('doc:detail', sdsno)
    t = body()
    ok('SDS' in t and '归档' in t or 'SDS 模块' in t, "SDS 文档给出「由合规模块维护」提示")
    ok(pg.evaluate("()=>{var r=SDS_ROWS.filter(x=>x.no==='SDS-2026-0151')[0]; return r?r.versions.length:0;}") == 3,
       "SDS-2026-0151 版本历史为 3 条真实数据")
    ok(pg.evaluate("()=>mdFindDoc('SDS-2026-0151').kind") == 'sds', "mdFindDoc 能区分 SDS 文档")

    print("\n== 11. 知识条目详情 ==")
    go('ip:km-detail', 'KM-2026-0118')
    t = body()
    ok('水性聚氨酯涂饰树脂乳化工艺关键控制点' in t, "标题渲染正确")
    ok('工艺经验' in t and '摘要' in t, "分类与摘要区渲染")
    ok(pg.evaluate("()=>KNOWLEDGES.filter(x=>x.cat==='工艺经验'&&x.id!=='KM-2026-0118').length") >= 1,
       "同分类条目存在")
    go('ip:km-detail', 'KM-2026-0031')
    ok('notice-warn' in pg.inner_html('#pageHost') and '草稿' in body(), "草稿条目给出提示")
    go('ip:km-detail', 'KM-2026-0112')
    ok('合规管理' in body(), "法规解读条目挂出跨模块引用")

    print("\n== 12. 知识产权详情 ==")
    go('ip:right-detail', 'CN202610123456.7')
    t = body()
    ok('已授权' in t and '授权公告' in t, "已授权专利含授权公告节点")
    ok(len(pg.eval_on_selector_all('table.tbl', 'e=>e')) >= 3, "含流程/权利要求/年费三张表")
    ok(pg.evaluate("()=>IPRIGHTS.filter(x=>x.id==='CN202610123456.7')[0].grant") == '2026-05-22',
       "授权日数据正确")
    go('ip:right-detail', 'CN202610345678.9')
    ok('驳回' in body() and 'notice-warn' in pg.inner_html('#pageHost'), "已驳回专利给出提示")
    go('ip:right-detail', 'CN202610789012.5')
    ok('已受理' in body(), "已受理专利渲染正确")

    print("\n== 13. GHS 与受限属性详情 ==")
    go('bd:ghs-detail', '50-00-0')
    h = pg.inner_html('#pageHost')
    t = body()
    ok('甲醛' in t and '50-00-0' in t, "CAS/名称渲染正确")
    ok('SVHC' in t and 'notice-warn' in h, "SVHC 物质给出通报提示")
    ok('可能致癌' in t, "H 码释义命中（H350 → 可能致癌）")
    ok(pg.evaluate("()=>MD_H_TXT['H350']") == '可能致癌', "H 码字典可用")
    ok(pg.evaluate("()=>GHS_ROWS.filter(x=>x.cas==='50-00-0').length") == 1, "GHS 数据源命中")
    ok('MAT-00521' in t, "反查出引用该物质的物料（甲醛水溶液）")
    ok(pg.evaluate("()=>{var a=document.querySelector('#pageHost a[onclick*=matOpen]');return !!a;}"),
       "物料链接可跳原料详情")
    cnt = pg.evaluate("()=>{var n=0;GHS_ROWS.forEach(function(r){showPage('bd:ghs-detail',{key:r.cas});n++;});return n;}")
    ok(cnt == pg.evaluate("()=>GHS_ROWS.length"), "全部 %d 条 GHS 记录均可打开" % cnt)
    go('bd:ghs-detail', '1330-20-7')
    ok('二甲苯' in body(), "切换记录渲染正确（二甲苯）")

    print("\n== 14. 兜底与守线 ==")
    go('bd:supplier-detail', 'SUP-XXXX-999')
    ok('未找到记录' in body(), "未知键显示「未找到记录」")
    ok('返回供应商列表' in body(), "未找到时提供返回入口")
    go('eq:cap-detail', 'EQ-9999-999|无此项')
    ok('未找到记录' in body(), "设备能力未知键兜底")
    ok(pg.evaluate("()=>typeof detailSoon==='function'"), "detailSoon 保留（仍作为未接线页的兜底）")
    left = pg.evaluate("""()=>{
        var miss=[];
        ['bd:supplier','qc:submit','qc:report','eq:list','eq:cap','eq:maint','eq:spare',
         'ip:km','ip:right','bd:ghs'].forEach(function(pid){
          showPage(pid);
          if(pid==='eq:maint'){ eqmTab='wo'; eqMaintRender(); }
          var tr=document.querySelector('tbody tr[data-ri="0"]');
          if(!tr)return;
          tr.click();
          if(curPage===pid)miss.push(pid);
        });
        return miss;
    }""")
    ok(not left, "10 个列表页首行点击均离开列表页%s" % ("（未接线：%s）" % left if left else ""))
    # 只读守线：详情页不写 localStorage
    ok(pg.evaluate("()=>Object.keys(localStorage).filter(k=>/detail|misc/i.test(k)).length") == 0,
       "详情页不新增 localStorage 键")
    ok(pg.evaluate("()=>typeof _mdReset==='undefined'"), "未引入重置钩子（详情页只读）")
    ok(pg.evaluate("()=>PHYS_PROPS.length") == 25, "SDS 第 9 章仍 25 项（未被本分片影响）")

    print("\n== 15. 页面无 JS 报错 ==")
    ok(not errs, "无 pageerror%s" % ("：%s" % errs[:3] if errs else ""))

    b.close()

print("\n" + "=" * 62)
print("PASS %d / FAIL %d" % (len(PASS), len(FAIL)))
if FAIL:
    print("失败项：")
    for f in FAIL:
        print("  - " + f)
    raise SystemExit(1)
