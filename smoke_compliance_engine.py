# -*- coding: utf-8 -*-
"""合规计算引擎内核自检（第三十九轮 · 阶段 1：最小真实计算引擎）

原则：**不在 Python 里复制一套计算公式**。
所有断言都通过浏览器执行构建产物中真实的 JS 引擎（COMPLIANCE_METHOD_REGISTRY
+ 四个执行器 + clpEvaluateMixture 调度器），只比对引擎自己给出的结果。

测试用配方走 complianceBuildContext(formula, rule, pack, 自定义字典)，
**不污染 COMP_CLP**；需要临时改 CLP_RULES 的用例一律 try/finally 还原。
"""
from playwright.sync_api import sync_playwright

_CHROME_PATH = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
F = "/Users/dowell/Desktop/code/workbuddy/PLM/PLM3.0全系统演示原型.html"
P, Fail = 0, 0


def ok(c, m):
    global P, Fail
    if c:
        P += 1; print("  ✅ " + m)
    else:
        Fail += 1; print("  ❌ " + m)


with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=_CHROME_PATH, args=["--no-sandbox"])
    pg = b.new_page(viewport={"width": 1680, "height": 1050})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append("console:" + m.text) if m.type == "error" else None)
    pg.goto("file://" + F)
    pg.wait_for_timeout(2200)

    # ---------- 测试夹具：注入到 window，仅供本脚本使用 ----------
    pg.evaluate("""() => {
      /* 测试用组分字典（与 COMP_CLP 隔离） */
      window.TDB = {
        'T-ATE':   {name:'测试ATE物', haz:{acuteOral:true}, ateO:100, ateState:'known'},
        'T-ATE-U': {name:'ATE未知物',  haz:{acuteOral:true}, ateO:100, ateState:'unknown'},
        'T-ATE-0': {name:'ATE为零物',  haz:{acuteOral:true}, ateO:0,   ateState:'known'},
        'T-NA':    {name:'无急性毒性', haz:{}},
        'T-CORR':  {name:'腐蚀物',     haz:{skinCorr:'1B'}},
        'T-IRR':   {name:'刺激物',     haz:{skinIrrit:'2'}},
        'T-EDAM':  {name:'眼损伤物',   haz:{eyeDamage:'1'}},
        'T-EIRR':  {name:'眼刺激物',   haz:{eyeIrrit:'2'}},
        'T-SENS':  {name:'致敏物有SCL',haz:{skinSens:{cat:'1', scl:0.2}}},
        'T-SENS0': {name:'致敏物无SCL',haz:{skinSens:{cat:'1'}}},
        'T-AQ1':   {name:'慢性1',      haz:{aquaticChronic:'1'}, mC:10, aqState:'known'},
        'T-AQ4':   {name:'慢性4',      haz:{aquaticChronic:'4'}, mC:0,  aqState:'known'},
        'T-AQ-U':  {name:'水生未知',   haz:{aquaticChronic:'2'}, mC:0,  aqState:'unknown'},
        'T-AQ-M':  {name:'水生未维护', haz:{aquaticChronic:'2'}, mC:0,  aqState:'unmaintained'}
      };
      window.TPACK = {id:'TEST-PACK', market:'EU', ruleIds:[], methodVersions:{}};
      /* 构造统一执行上下文：cas + 浓度 */
      window.ctxOf = function(ruleId, comps){
        return complianceBuildContext(comps, clpRuleById(ruleId), window.TPACK, window.TDB);
      };
      window.run = function(ruleId, comps){
        return complianceExecuteMethod(clpRuleById(ruleId).method, window.ctxOf(ruleId, comps));
      };
      window.C = function(cas, conc){ return {cas:cas, name:window.TDB[cas].name, conc:conc}; };
      return true;
    }""")

    print("\n=== 一、计算方法注册表 ===")
    reg = pg.evaluate("""() => {
      var ks = Object.keys(COMPLIANCE_METHOD_REGISTRY);
      var dist = ks.filter(function(k,i){return ks.indexOf(k)===i;});
      var four = ['CLP-M-ATE-SUM','CLP-M-GCL-SUM','CLP-M-SCL','CLP-M-MFACTOR'];
      return {n:ks.length, unique:ks.length===dist.length, keys:ks,
        fourIn:four.every(function(c){return complianceHasMethod(c)&&complianceMethodImplemented(c);}),
        versions:four.every(function(c){return !!complianceGetMethod(c).version;}),
        vers:four.map(function(c){return complianceGetMethod(c).version;})};
    }""")
    ok(reg['n'] >= 4 and reg['unique'], "注册表存在且方法代码唯一（已登记 %d 个）" % reg['n'])
    ok(reg['fourIn'], "四个已运行方法均已注册且状态为 implemented")
    ok(reg['versions'], "四个方法均带版本：%s" % ' / '.join(reg['vers']))

    dup = pg.evaluate("""() => {
      var dup=false, msg='';
      try{ complianceRegisterMethod({code:'CLP-M-ATE-SUM', version:'9.9.9', name:'重复注册测试',
             implementationStatus:'implemented', execute:function(){}}); }
      catch(e){ dup=true; msg=String(e.message); }
      return {dup:dup, msg:msg, stillOld:complianceGetMethod('CLP-M-ATE-SUM').version};
    }""")
    ok(dup['dup'] and '重复注册' in dup['msg'], "重复注册明确报错，不静默覆盖：%s" % dup['msg'])
    ok(dup['stillOld'] != '9.9.9', "重复注册后原方法版本未被覆盖（仍为 %s）" % dup['stillOld'])

    guard = pg.evaluate("""() => {
      var a=false,b=false,c=false;
      try{ complianceRegisterMethod({code:'T-NOVER',version:'',name:'x',implementationStatus:'implemented',execute:function(){}}); }catch(e){a=true;}
      try{ complianceRegisterMethod({code:'T-BADST',version:'1',name:'x',implementationStatus:'weird',execute:function(){}}); }catch(e){b=true;}
      try{ complianceRegisterMethod({code:'T-NOEXE',version:'1',name:'x',implementationStatus:'implemented',execute:null}); }catch(e){c=true;}
      return {a:a,b:b,c:c, leaked:complianceHasMethod('T-NOVER')||complianceHasMethod('T-BADST')||complianceHasMethod('T-NOEXE')};
    }""")
    ok(guard['a'] and guard['b'] and guard['c'], "注册校验生效：缺版本 / 非法状态 / 缺执行函数均报错")
    ok(not guard['leaked'], "校验失败的非法方法没有进入注册表")

    uns = pg.evaluate("""() => {
      var r = complianceExecuteMethod('CLP-M-NOT-EXIST', window.ctxOf('CLP-R-0001',[]));
      var ni = {has:complianceHasMethod('CLP-M-ED-PBT'), impl:complianceMethodImplemented('CLP-M-ED-PBT')};
      var ex = complianceExecuteMethod('CLP-M-ED-PBT', window.ctxOf('CLP-R-0001',[]));
      return {st:r.status, msg:r.messages.join(''), items:r.items.length, ni:ni, exSt:ex.status, exMsg:ex.messages.join('')};
    }""")
    ok(uns['st'] == 'UNSUPPORTED_METHOD' and uns['items'] == 0,
       "未登记方法返回 UNSUPPORTED_METHOD，不产出分类项")
    ok('尚未登记' in uns['msg'], "未登记方法给出业务可读提示：%s" % uns['msg'])
    ok(uns['ni']['has'] and not uns['ni']['impl'],
       "CLP-M-ED-PBT 已登记但实现状态为 not_implemented")
    ok(uns['exSt'] == 'BLOCKED' and '不可调用' in uns['exMsg'],
       "未实现方法被调用时返回 BLOCKED：%s" % uns['exMsg'])

    print("\n=== 二、CLP-M-ATE-SUM（经口急性毒性 ATE 加和法）===")
    ate = pg.evaluate("""() => {
      var normal = window.run('CLP-R-0001', [window.C('T-ATE',50)]);           /* ATE_mix = 200 */
      var none   = window.run('CLP-R-0001', [window.C('T-NA',100)]);           /* 无适用组分 */
      var unk    = window.run('CLP-R-0001', [window.C('T-ATE-U',50)]);         /* 数据状态 unknown */
      var zero   = window.run('CLP-R-0001', [window.C('T-ATE-0',50)]);         /* ATE 为 0 */
      var eq5    = window.run('CLP-R-0001', [window.C('T-ATE',100)]);          /* 用真实 ATE=100：见下 */
      return {
        normal:{s:normal.status, r:normal.items[0].result, c:normal.items[0].code,
                mix:normal.intermediates.ateMix, inv:normal.intermediates.inverseSum,
                ths:normal.intermediates.thresholds},
        none:{s:none.status, r:none.items[0].result},
        unk:{s:unk.status, r:unk.items[0].result, miss:normal.intermediates.missingAteComponents.length},
        zero:{s:zero.status, r:zero.items[0].result},
        eq5:eq5
      };
    }""")
    ok(ate['normal']['s'] == 'AUTO' and ate['normal']['r'] == '类别 3',
       "正常计算：ATE_mix=%s → %s（%s）" % (ate['normal']['mix'], ate['normal']['r'], ate['normal']['c']))
    ok(abs(ate['normal']['mix'] - 200) < 1e-6 and abs(ate['normal']['inv'] - 0.5) < 1e-6,
       "中间值 Σ(Ci/ATEi)=%s、ATE_mix=%s 正确" % (ate['normal']['inv'], ate['normal']['mix']))
    ok(len(ate['normal']['ths']) == 4, "输出命中的类别区间表（%d 档）" % len(ate['normal']['ths']))
    ok(ate['none']['s'] == 'NO_MATCH' and ate['none']['r'] == '不分类', "无适用组分 → NO_MATCH / 不分类")
    ok(ate['unk']['s'] == 'NEED_INPUT' and ate['unk']['r'] == '—', "ATE 数据状态 unknown → NEED_INPUT / 结果留白")
    ok(ate['zero']['s'] == 'NEED_INPUT' and ate['zero']['r'] == '—', "ATE 数值缺失 → NEED_INPUT / 结果留白")

    bnd = pg.evaluate("""() => {
      var at = function(o){ /* 直接造“ATE 为指定值”的组分 */
        window.TDB['T-X'] = {name:'边界物', haz:{acuteOral:true}, ateO:o, ateState:'known'};
        var r = window.run('CLP-R-0001', [window.C('T-X',100)]);
        return {s:r.status, r:r.items[0].result, mix:r.intermediates.ateMix};
      };
      /* ATE_mix = 100 / (Ci / ATEi)：Ci 固定 100%，故 ATE_mix = ATEi */
      return {eq5:at(5), below:at(4), above:at(6), high:at(10000)};
    }""")
    ok(bnd['eq5']['r'] == '类别 1' and abs(bnd['eq5']['mix'] - 5) < 1e-9, "等于类别 1 边界（ATE_mix=5）→ 类别 1")
    ok(bnd['below']['r'] == '类别 1', "略低于边界（ATE_mix=4）→ 仍为类别 1")
    ok(bnd['above']['r'] == '类别 2' and abs(bnd['above']['mix'] - 6) < 1e-9,
       "略高于边界（ATE_mix=6）→ 类别 2")
    ok(bnd['high']['s'] == 'NO_MATCH', "远高于类别 4 上限 → NO_MATCH，不分类")

    immut = pg.evaluate("""() => {
      var comps=[window.C('T-ATE',50), window.C('T-CORR',10)];
      var before=JSON.stringify(comps);
      var ctx=complianceBuildContext(comps, clpRuleById('CLP-R-0001'), window.TPACK, window.TDB);
      complianceExecuteMethod('CLP-M-ATE-SUM', ctx);
      complianceExecuteMethod('CLP-M-GCL-SUM', ctx);
      var afterCtx=JSON.stringify(ctx.components.map(function(c){return c.concentration;}));
      return {same:JSON.stringify(comps)===before, ctxSame:afterCtx===JSON.stringify([50,10])};
    }""")
    ok(immut['same'], "执行后传入的配方数组未被修改")
    ok(immut['ctxSame'], "执行后上下文中的组分浓度未被修改")

    print("\n=== 三、CLP-M-GCL-SUM（通用浓度限值加和法：皮肤 + 眼）===")
    gcl = pg.evaluate("""() => {
      var below = window.run('CLP-R-0002', [window.C('T-CORR',4.99)]);
      var eq    = window.run('CLP-R-0002', [window.C('T-CORR',5)]);
      var irr   = window.run('CLP-R-0002', [window.C('T-IRR',10)]);
      var edam  = window.run('CLP-R-0002', [window.C('T-EDAM',3)]);
      var eirr  = window.run('CLP-R-0002', [window.C('T-EIRR',10)]);
      var pick = function(r,id){ return r.items.filter(function(x){return x.id===id;})[0]; };
      return {
        below:pick(below,'skin').result, eq:pick(eq,'skin').result, irr:pick(irr,'skin').result,
        edam:pick(edam,'eye').result, eirr:pick(eirr,'eye').result,
        n:eq.items.length, ids:eq.items.map(function(x){return x.id;}).join(),
        mid:eq.intermediates, st:{below:below.status, eq:eq.status}
      };
    }""")
    ok(gcl['below'] == '类别 2', "皮肤腐蚀低于阈值（4.99%% < 5%%）→ 落到刺激类别 2")
    ok(gcl['eq'] == '腐蚀 类别 1A/1B/1C', "皮肤腐蚀等于阈值（5%%）→ 腐蚀类别 1")
    ok(gcl['irr'] == '类别 2', "皮肤刺激加权和等于阈值（10%%）→ 类别 2")
    ok(gcl['edam'] == '类别 1', "严重眼损伤等于阈值（3%%）→ 类别 1")
    ok(gcl['eirr'] == '类别 2', "眼刺激加权和等于阈值（10%%）→ 类别 2")
    ok(gcl['n'] == 2 and gcl['ids'] == 'skin,eye', "一个方法一次返回多个分类项：%s" % gcl['ids'])
    ok('weight' in gcl['mid'] and 'skinCorrThreshold' in gcl['mid'],
       "输出加权权重与阈值中间值（weight=%s / skinCorr=%s%%）" % (gcl['mid']['weight'], gcl['mid']['skinCorrThreshold']))

    print("\n=== 四、CLP-M-SCL（特定浓度限值优先替代法）===")
    scl = pg.evaluate("""() => {
      var pick=function(r){return r.items[0];};
      var useScl = window.run('CLP-R-0003', [window.C('T-SENS',0.2)]);
      var gclEq  = window.run('CLP-R-0003', [window.C('T-SENS0',0.1)]);
      var low    = window.run('CLP-R-0003', [window.C('T-SENS',0.05)]);
      var high   = window.run('CLP-R-0003', [window.C('T-SENS',0.5)]);
      return {
        useScl:{r:pick(useScl).result, src:useScl.inputs[0].thresholdSource, thr:useScl.inputs[0].threshold,
                hits:useScl.intermediates.hitComponents.length, st:useScl.status},
        gclEq:{r:pick(gclEq).result, src:gclEq.inputs[0].thresholdSource, thr:gclEq.inputs[0].threshold, st:gclEq.status},
        low:{r:pick(low).result, st:low.status}, high:{r:pick(high).result},
        ths:useScl.intermediates.thresholds
      };
    }""")
    ok(scl['useScl']['st'] == 'AUTO' and scl['useScl']['r'] == '类别 1', "使用组分自身 SCL（0.2%%，浓度 0.2%%）→ 命中类别 1")
    ok(scl['useScl']['src'] == 'SCL' and scl['useScl']['thr'] == 0.2, "阈值来源标记为 SCL，实际阈值 0.2%%")
    ok(scl['gclEq']['src'] == 'GCL' and scl['gclEq']['thr'] == 0.1, "无 SCL 时回落规则通用限值 GCL（0.1%%）")
    ok(scl['gclEq']['r'] == '类别 1', "等于通用限值即命中（保留现有边界行为）")
    ok(scl['low']['r'] == '不分类' and scl['low']['st'] == 'NO_MATCH', "低于阈值 → 不分类 / NO_MATCH")
    ok(scl['high']['r'] == '类别 1', "高于阈值 → 类别 1")
    ok(len(scl['ths']) == 1 and 'SCL' in scl['ths'][0], "输出每个组分实际使用的阈值与来源：%s" % scl['ths'][0])

    print("\n=== 五、CLP-M-MFACTOR（慢性水生危害 M 因子加权求和）===")
    mf = pg.evaluate("""() => {
      var pick=function(r){return r.items[0];};
      var low  = window.run('CLP-R-0004', [window.C('T-AQ4',10)]);
      var eq   = window.run('CLP-R-0004', [window.C('T-AQ4',25)]);
      var high = window.run('CLP-R-0004', [window.C('T-AQ4',30)]);
      var multi= window.run('CLP-R-0004', [window.C('T-AQ1',3), window.C('T-AQ4',5)]);
      var unk  = window.run('CLP-R-0004', [window.C('T-AQ-U',50)]);
      var unm  = window.run('CLP-R-0004', [window.C('T-AQ-M',50)]);
      return {
        low:{r:pick(low).result, s:low.status, mid:low.intermediates},
        eq:{r:pick(eq).result}, high:{r:pick(high).result},
        multi:{r:pick(multi).result, m1:pick(multi).result, s1:multi.intermediates.chronic1WeightedSum},
        unk:{r:pick(unk).result, s:unk.status, miss:unk.intermediates.missingEvidenceComponents},
        unm:{r:pick(unm).result, s:unm.status}
      };
    }""")
    ok(mf['low']['r'] == '不分类' and mf['low']['s'] == 'NO_MATCH', "低于 25%% 阈值 → 不分类 / NO_MATCH")
    ok(mf['eq']['r'] == '类别 4', "等于 25%% 阈值 → 类别 4（保留现有边界行为）")
    ok(mf['high']['r'] == '类别 4', "高于 25%% 阈值 → 类别 4")
    ok(mf['multi']['r'] == '类别 1' and abs(mf['multi']['s1'] - 30) < 1e-9,
       "多组分 M 因子加权：Σ(M×Chronic 1)=%s → 类别 1" % mf['multi']['s1'])
    ok(mf['unk']['s'] == 'NEED_INPUT' and mf['unk']['r'] == '—', "水生数据状态 unknown → NEED_INPUT")
    ok(mf['unm']['s'] == 'NEED_INPUT' and mf['unm']['r'] == '—', "水生数据状态 unmaintained → NEED_INPUT")
    ok(mf['unk']['r'] != '不分类' and mf['unm']['r'] != '不分类', "未知数据没有被当成 0 后输出「不分类」")
    ok(len(mf['unk']['miss']) == 1, "输出缺少来源依据的组分：%s" % mf['unk']['miss'])
    mid = mf['low']['mid']
    ok(all(k in mid for k in ['chronic1WeightedSum', 'chronic2Score', 'chronic3Score', 'chronic4Score', 'limit']),
       "输出各级求和中间值与规则阈值（limit=%s%%）" % mid['limit'])

    print("\n=== 六、活动规则包筛选 ===")
    pack = pg.evaluate("() => clpActivePack()")
    ok(pack['ruleIds'] == ['CLP-R-0001', 'CLP-R-0002', 'CLP-R-0003', 'CLP-R-0004'],
       "默认活动规则 4 条，与重构前实际执行范围一致：%s" % pack['ruleIds'])
    ok(pack['methods'] == ['CLP-M-ATE-SUM', 'CLP-M-GCL-SUM', 'CLP-M-SCL', 'CLP-M-MFACTOR'], "活动包登记 4 种方法")
    ok(pack['id'] == 'CLP-EU-ATP22-R2026.2-L2026.3', "规则包编号不变：%s" % pack['id'])
    ok(isinstance(pack.get('methodVersions'), dict) and len(pack['methodVersions']) == 4,
       "规则包快照包含方法版本：%s" % pack.get('methodVersions'))
    ok(pack['tested'] and pack['status'] == '已发布', "规则包通过发布门禁")

    filt = pg.evaluate("""() => {
      /* 阶段 2 起 CLP_RULES 是「活动规则版本的兼容投影」，
         改规则要改到活动版本上再同步投影，不能直接改投影变量（会被同步覆盖）。 */
      var ver = clpRuleVersionResolve();
      var bak = clpRuleDeepClone(ver.rules);
      var setRule = function(id, k, v){
        var r = null; ver.rules.forEach(function(x){ if(x.id === id) r = x; });
        r[k] = v; clpSyncActiveRulesProjection();
      };
      var restore = function(){ ver.rules = clpRuleDeepClone(bak); clpSyncActiveRulesProjection(); };
      var R = clpRuleById, out = {};
      try{
        /* ① 测试未通过 */
        setRule('CLP-R-0001', 'test', '未通过');
        out.testFail = clpActivePack().ruleIds.indexOf('CLP-R-0001') < 0;
        restore();
        /* ② 待审核 */
        setRule('CLP-R-0002', 'status', '待审核');
        out.pending = clpActivePack().ruleIds.indexOf('CLP-R-0002') < 0;
        restore();
        /* ③ 无运行参数 */
        out.noRun = clpActivePack().ruleIds.indexOf('CLP-R-0005') < 0 && !R('CLP-R-0005').run;
        /* ④ 无执行器（未实现方法） */
        out.noExec = clpActivePack().ruleIds.indexOf('CLP-R-0006') < 0 && clpActivePack().ruleIds.indexOf('CLP-R-0007') < 0;
        /* ⑤ 展示字典标「已支持」但未登记实现 → 仍不得入包 */
        out.fake = R('CLP-R-0005').engine === '已支持' && clpActivePack().ruleIds.indexOf('CLP-R-0005') < 0;
        /* ⑥ 还原后回到 4 条 */
        out.restored = clpActivePack().ruleIds.length === 4;
      } finally {
        restore();
      }
      out.final = clpActivePack().ruleIds;
      return out;
    }""")
    ok(filt['testFail'], "测试未通过的规则不进入活动规则包")
    ok(filt['pending'], "待审核的规则不进入活动规则包")
    ok(filt['noRun'], "没有运行参数的规则不进入活动规则包（CLP-R-0005）")
    ok(filt['noExec'], "没有可执行方法的规则不进入活动规则包（CLP-R-0006 / 0007）")
    ok(filt['fake'], "展示字典标「已支持」但方法未实现，仍不得入包（CLP-R-0005）")
    ok(filt['restored'] and filt['final'] == ['CLP-R-0001', 'CLP-R-0002', 'CLP-R-0003', 'CLP-R-0004'],
       "临时改动已还原，活动包恢复 4 条")

    print("\n=== 七、执行器约束与异常处理 ===")
    pure = pg.evaluate("""() => {
      var cBefore=JSON.stringify(COMP_CLP), rBefore=JSON.stringify(CLP_RULES.map(function(r){return JSON.stringify(r.run);}));
      clpEvaluateMixture([{cas:'50-00-0',name:'甲醛',conc:'0.35'},{cas:'79-10-7',name:'丙烯酸',conc:'2.50'}]);
      return {c:JSON.stringify(COMP_CLP)===cBefore,
              r:JSON.stringify(CLP_RULES.map(function(r){return JSON.stringify(r.run);}))===rBefore};
    }""")
    ok(pure['c'], "执行器未修改 COMP_CLP")
    ok(pure['r'], "执行器未修改 CLP_RULES 的运行参数")

    err = pg.evaluate("""() => {
      var bak=COMPLIANCE_METHOD_REGISTRY['CLP-M-ATE-SUM'].execute, out={};
      try{
        COMPLIANCE_METHOD_REGISTRY['CLP-M-ATE-SUM'].execute=function(){throw new Error('BOOM_INTERNAL_DETAIL');};
        var r=complianceExecuteMethod('CLP-M-ATE-SUM', window.ctxOf('CLP-R-0001',[window.C('T-ATE',50)]));
        out={status:r.status, msg:r.messages.join(''), dbg:JSON.stringify(r.debug||{}), items:r.items.length};
      } finally { COMPLIANCE_METHOD_REGISTRY['CLP-M-ATE-SUM'].execute=bak; }
      out.restored = complianceGetMethod('CLP-M-ATE-SUM').execute===bak;
      out.after = window.run('CLP-R-0001',[window.C('T-ATE',50)]).status;
      return out;
    }""")
    ok(err['status'] == 'ERROR' and err['items'] == 0, "单个方法异常被捕获，返回统一 ERROR 状态")
    ok('请联系系统管理员' in err['msg'], "给出人类可读提示：%s" % err['msg'])
    ok('BOOM_INTERNAL_DETAIL' not in err['msg'], "业务提示不含内部错误细节")
    ok('BOOM_INTERNAL_DETAIL' in err['dbg'], "调试信息保留在 debug 字段（不进 UI）")
    ok(err['restored'] and err['after'] == 'AUTO', "异常后执行器已还原，不影响后续计算")

    mp = pg.evaluate("""() => {
      var m={'AUTO':[],'NO_MATCH':[],'NEED_INPUT':[],'UNSUPPORTED_METHOD':[],'BLOCKED':[],'ERROR':[]};
      Object.keys(m).forEach(function(s){m[s]=[complianceUiStatus(s), complianceUiNeed(s)||''];});
      var it=complianceAdaptItem({status:'NEED_INPUT',method:{code:'X',version:'1'},rule:{id:'CLP-R-0001'}},
        {id:'z',name:'z',result:'不分类',code:'c',rule:'r',display:{input:'i',formula:'f'},opts:[],src:[]},'PACK');
      return {m:m, forced:{result:it.result, status:it.status, need:it.need}};
    }""")
    ok(mp['m']['AUTO'] == ['auto', ''] and mp['m']['NO_MATCH'] == ['auto', ''], "AUTO / NO_MATCH → 页面 auto")
    ok(mp['m']['NEED_INPUT'] == ['pending', 'judge'], "NEED_INPUT → 页面 pending / judge")
    ok(mp['m']['ERROR'] == ['pending', 'judge'] and mp['m']['BLOCKED'] == ['pending', 'judge']
       and mp['m']['UNSUPPORTED_METHOD'] == ['pending', 'judge'], "ERROR / BLOCKED / UNSUPPORTED → 页面 pending / judge")
    ok(mp['forced']['result'] == '—' and mp['forced']['status'] == 'pending',
       "适配器防线：非成功状态不得把结果写成「不分类」（改写为 —）")

    print("\n=== 八、重构后回归（SDS 真实流程）===")
    pg.evaluate("()=>{showPage('sds:wizard');}")
    pg.wait_for_timeout(700)
    pg.evaluate("()=>{wzGo(1);}")
    pg.wait_for_timeout(400)
    pg.evaluate("()=>{wz.project.product='水性聚氨酯涂饰树脂 WPU-320';pickMarket('EU');}")
    pg.wait_for_timeout(400)
    pg.evaluate("()=>{wzGo(4);}")
    pg.wait_for_timeout(900)
    live = pg.evaluate("""() => {
      var r=clpEvaluateMixture(wz.formula), m={};
      r.items.forEach(function(x){m[x.id]={r:x.result,s:x.status,n:x.need||'',c:x.code,me:x.method,mv:x.methodVersion};});
      return {items:m, ids:r.items.map(function(x){return x.id;}),
        labels:r.labels, pack:r.pack, warn:r.warnings.length,
        exec:r.executions.map(function(e){return {m:e.methodCode,v:e.methodVersion,rule:e.ruleId,
          rv:e.ruleVersion,st:e.status,inp:e.inputs.length,mid:Object.keys(e.intermediates).length,
          ev:e.evidence.length,res:e.result.length};}),
        body:$('wzBody').innerText};
    }""")
    ok(live['ids'] == ['acuteOral', 'skin', 'sens', 'eye', 'aqua'], "分类项顺序与重构前一致：%s" % live['ids'])
    exp = {'acuteOral': '不分类', 'skin': '类别 2', 'sens': '类别 1', 'eye': '类别 2', 'aqua': '—'}
    ok(all(live['items'][k]['r'] == v for k, v in exp.items()),
       "默认演示配方五项分类结果不变：%s" % ', '.join('%s=%s' % (k, live['items'][k]['r']) for k in exp))
    ok(live['items']['aqua']['s'] == 'pending' and live['items']['aqua']['n'] == 'judge', "aqua 仍为待人工判断")
    ok(live['labels']['hCodes'] == ['H315', 'H317', 'H319'], "H 码结果不变：%s" % live['labels']['hCodes'])
    ok(live['labels']['pictograms'] == ['GHS07'] and live['labels']['signal'] == 'warning', "象形图与信号词不变")
    ok(live['pack']['id'] == 'CLP-EU-ATP22-R2026.2-L2026.3', "SDS 保存的规则包快照编号不变")
    ok(live['warn'] == 0, "默认演示无执行告警（warnings=0）")
    ok(len(live['exec']) == 4, "产生 4 次方法执行记录")
    ok(all(e['v'] and e['rule'] and e['rv'] and e['st'] for e in live['exec']),
       "每次执行记录方法版本 / 规则编号 / 规则版本 / 执行状态")
    ok(all(e['mid'] > 0 and e['ev'] > 0 for e in live['exec']), "每次执行记录中间值与证据来源")
    ok(all(e['inp'] >= 0 for e in live['exec']), "每次执行记录输入参数")
    ok(all(live['items'][k]['me'] for k in ['acuteOral', 'skin', 'sens', 'eye', 'aqua']),
       "分类项仍带方法代码：%s" % live['items']['skin']['me'])

    ev = pg.evaluate("""() => {
      for(var i=0;i<wz.classItems.length;i++) evToggle(i);
      return $('wzBody').innerText;
    }""")
    ok('本次调用的 CLP 规则包' in ev and 'CLP-R-0001' in ev, "计算依据展开后可见规则包与规则编号")
    ok(all(x in ev for x in ['CLP-M-ATE-SUM', 'CLP-M-GCL-SUM', 'CLP-M-SCL', 'CLP-M-MFACTOR']),
       "计算依据展开后可见四个方法代码")
    ok('1.0.0-demo' in ev, "计算依据展开后可见方法版本（可追溯到执行器版本）")
    ok('CLP-R-0001' not in live['body'], "规则 / 方法编号默认仍收起，不占主界面")

    pg.evaluate("()=>{wzGo(5);}")
    pg.wait_for_timeout(900)
    ok('化学品及企业标识' in pg.evaluate("()=>$('wzBody').innerText"), "第 5 步草案正常生成")
    ok(pg.evaluate("()=>typeof exportSdsWord==='function' && sdsDocBodyHtml().length>500"),
       "Word 导出入口可用且文档体非空")

    for pid, name in [('law:clp', 'CLP 法规库'), ('law:reach', 'REACH 法规库'), ('law:query', '法规统一查询')]:
        pg.evaluate("(p)=>showPage(p)", pid)
        pg.wait_for_timeout(500)
        ok(pg.evaluate("()=>curPage") == pid and len(pg.evaluate("()=>$('pageHost').innerText")) > 200,
           "%s 页面仍可正常打开" % name)
    pg.evaluate("()=>{showPage('law:clp');clpLImport();}")
    pg.wait_for_timeout(700)
    ok(pg.evaluate("()=>!!document.getElementById('modal')"), "CLP 导入向导仍可正常打开")
    pg.evaluate("()=>closeModal()")
    pg.wait_for_timeout(300)

    print("\nJS 错误：", errs)
    ok(len(errs) == 0, "无 JS 错误")

    print("\n" + "=" * 56)
    print("断言通过 %d / %d" % (P, P + Fail))
    print("=" * 56)


if Fail:
    raise SystemExit(1)
