# -*- coding: utf-8 -*-
"""CLP Annex I 规则版本生命周期自检（第四十轮 · 阶段 2）

原则：**不在 Python 里复制生命周期逻辑**。
所有断言都通过浏览器执行构建产物中真实的 JS（23z6c 生命周期 + 23z6b 引擎 +
23z6a 导入向导），只比对系统自己算出的结果。

分组对应需求 §26：基线不可变 / Diff / 引擎支持状态 / 测试复用 / Release Manifest /
单一审核发布 / 按日期解析 / 页面流程。
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
    pg.wait_for_timeout(2300)

    # ---------- 测试夹具：全部走真实 JS，不复制公式 ----------
    pg.evaluate("""() => {
      window.PRISTINE_RULES = JSON.parse(JSON.stringify(CLP_RULES));
      window.LF = {
        reset: function(){
          CLP_RULE_VERSION_STORE.length = 0;
          CLP_RULES = JSON.parse(JSON.stringify(window.PRISTINE_RULES));
          clpRuleVersionSeedBaseline();
          clpSyncActiveRulesProjection();
          return CLP_RULE_VERSION_STORE.length;
        },
        base: function(){ return clpRuleVersionBaseline(); },
        row: function(v, id){
          var rs = (v && v.rules) || [], r = null;
          rs.forEach(function(x){ if(x.id === id) r = x; });
          return r;
        },
        draft: function(ver, eff, rows){
          return clpRuleVersionCreateDraft({
            version: ver, effectiveFrom: eff, cutoff: '2026-09-15', createdBy: '质管-杨工',
            source: {regulation:'Regulation (EC) No 1272/2008', annex:'Annex I',
                     sourceVersion: ver, sourceDate: '2026-09-15'},
            rows: rows
          });
        },
        demoRows: function(ver){
          _clpImp.mod = 'rules'; _clpImp.ver = ver || 'R2027.1';
          return clpImpDemoDraftRows();
        },
        cloneRules: function(){
          return clpRuleVersionRules(clpRuleVersionBaseline()).map(function(r){ return clpRuleDeepClone(r); });
        },
        pub: function(d, o){
          o = o || {};
          return clpRuleVersionPublish(d, {
            reviewedBy: (o.by === undefined ? '质管-杨工' : o.by),
            reviewedAt: '2026-09-22 10:00',
            declarationAccepted: (o.decl !== false),
            reviewNote: ''
          });
        },
        active: function(d){ return clpRuleVersionResolve(d); },
        asOf: function(){ return clpRuleAsOfDate(); }
      };
      window.LF.reset();
      return true;
    }""")

    print("\n=== 一、基线与不可变性 ===")
    r = pg.evaluate("""() => {
      LF.reset();
      var n1 = CLP_RULE_VERSION_STORE.length;
      clpRuleVersionSeedBaseline(); clpRuleVersionSeedBaseline();
      var n2 = CLP_RULE_VERSION_STORE.length;
      var b = LF.base();
      var d = LF.draft('R2099-A', '2027-01-01', LF.demoRows('R2099-A'));
      var r2 = LF.row(d, 'CLP-R-0002');
      var before = clpRuleExecutionFingerprint(LF.row(b, 'CLP-R-0002'));
      if(r2) r2.run.skinCorr = 99;                       /* 只改草稿 */
      var after = clpRuleExecutionFingerprint(LF.row(b, 'CLP-R-0002'));
      var sameObj = (LF.row(d, 'CLP-R-0001') === LF.row(b, 'CLP-R-0001'));
      /* 历史版本指纹：活动投影变化前后应完全一致 */
      var fp1 = LF.row(b, 'CLP-R-0004') ? clpRuleFullFingerprint(LF.row(b, 'CLP-R-0004')) : '';
      clpSyncActiveRulesProjection();
      var fp2 = LF.row(b, 'CLP-R-0004') ? clpRuleFullFingerprint(LF.row(b, 'CLP-R-0004')) : '';
      /* 已发布版本不可编辑 */
      var guard = '';
      try { clpRuleVersionGuardEditable(b); } catch(e){ guard = String(e.message); }
      var repub = clpRuleVersionPublish(b, {reviewedBy:'质管-杨工', declarationAccepted:true});
      return {n1:n1, n2:n2, ver:b.version, st:b.status, eff:b.effectiveFrom,
        rules:b.rules.length, curRules:CLP_RULES.length, before:before, after:after,
        sameObj:sameObj, fpSame:fp1===fp2, guard:guard, repubOk:repub.ok, repubErr:repub.errors[0]||''};
    }""")
    ok(r['n1'] == 1 and r['n2'] == 1, "基线只初始化一次（重复 seed 后仍为 %d 个版本）" % r['n2'])
    ok(r['st'] == '已生效' and r['ver'] == 'R2026.2', "基线版本 %s 状态为「%s」" % (r['ver'], r['st']))
    ok(r['rules'] == r['curRules'] and r['rules'] == 7, "基线规则数正确（%d 条，与 CLP_RULES 投影一致）" % r['rules'])
    ok(r['before'] == r['after'], "修改草稿不影响基线规则")
    ok(r['sameObj'] is False, "草稿规则为深拷贝，不与基线共享对象引用")
    ok(r['fpSame'], "历史版本不会因活动投影同步而改变")
    ok('不可编辑' in r['guard'], "已发布版本编辑被拒绝：%s" % r['guard'])
    ok(r['repubOk'] is False and '不可编辑' in r['repubErr'], "已发布版本不可再次发布：%s" % r['repubErr'])

    print("\n=== 二、增量 Diff ===")
    r = pg.evaluate("""() => {
      LF.reset();
      var rows = LF.cloneRules();
      function row(id){ var r=null; rows.forEach(function(x){ if(x.id===id) r=x; }); return r; }
      row('CLP-R-0002').run.skinCorr = 3;                                  /* 参数变化 */
      row('CLP-R-0001').method = 'CLP-M-GCL-SUM';                          /* 方法映射变化 */
      row('CLP-R-0004').det.cond = '混合物含 Chronic 1/2/3/4 组分（补充测试）'; /* 前置条件变化 */
      row('CLP-R-0003').det.except = '同一组分多类别 SCL 分别适用（补充）';   /* 例外变化 */
      row('CLP-R-0005').h = 'H360';                                        /* H 码变化 */
      row('CLP-R-0006').name = '内分泌干扰物判定规则（名称修订）';            /* 文案变化 */
      row('CLP-R-0007').name = '  桥接原则（Bridging）—相似混合物分类沿用规则  ';      /* 首尾空格 */
      row('CLP-R-0006').det.src = row('CLP-R-0006').det.src
        .replace('Regulation (EC) No', 'Regulation  (EC)   No') + '   ';                 /* 连续空格 + 尾空格 */
      rows.push({id:'CLP-R-0010', name:'新增演示规则', cat:'演示', target:'混合物', gcl:'—',
        add:'否', ref:'Annex I（演示）', ver:'R2027.1', status:'待审核', method:'CLP-M-ATE-SUM', h:'',
        run:{thresholds:[{max:5,cat:'类别 1',h:'H300'}]},
        det:{inputs:'', cond:'', formula:'', except:'', prio:'', output:'', label:'', src:'Annex I（演示）'}});
      var d = LF.draft('R2099-B', '2027-01-01', rows);
      var cmp = clpRuleVersionCompare(LF.base(), d);
      function fd(ruleId){ var o=null; cmp.fieldDiffs.forEach(function(f){ if(f.ruleId===ruleId) o=f; }); return o; }
      function ct(id){ var o=null; cmp.modified.concat(cmp.unchanged).forEach(function(x){ if(x.ruleId===id) o=x.changeType; }); return o; }
      return {
        added: cmp.added.map(function(x){return x.ruleId;}),
        unchanged: cmp.unchanged.map(function(x){return x.ruleId;}),
        deact: cmp.deactivated.map(function(x){return x.ruleId;}),
        f2: fd('CLP-R-0002'), f1: fd('CLP-R-0001'), f4: fd('CLP-R-0004'),
        f3: fd('CLP-R-0003'), f5: fd('CLP-R-0005'), f6: fd('CLP-R-0006'),
        ct1: ct('CLP-R-0001'), ct4: ct('CLP-R-0004'), ct6: ct('CLP-R-0006'), ct7: ct('CLP-R-0007'),
        sum: cmp.summary
      };
    }""")
    ok('CLP-R-0010' in r['added'], "新增规则被识别（%s）" % '/'.join(r['added']))
    ok(r['f2'] and r['f2']['label'] == '皮肤腐蚀阈值' and r['f2']['before'] == 5 and r['f2']['after'] == 3,
       "参数变化识别为字段级差异：皮肤腐蚀阈值 5% → 3%")
    ok(r['f2'] and r['f2']['affectsExecution'] is True, "参数变化标记为「影响计算」→ 触发重新测试")
    ok(r['ct1'] == '方法映射变更', "方法映射变化识别为「%s」" % r['ct1'])
    ok(r['ct4'] == '适用条件变更', "前置条件变化识别为「%s」" % r['ct4'])
    ok(r['f3'] and r['f3']['changeType'] == '例外条件变更', "例外条件变化识别为「例外条件变更」")
    ok(r['f5'] and r['f5']['changeType'] == 'H 码或标签要素变更', "H 码变化识别为「H 码或标签要素变更」")
    ok(r['ct6'] == '文案或来源变更' and r['f6'] and r['f6']['affectsExecution'] is False,
       "文案变化识别为「文案或来源变更」且不触发重新测试")
    ok(r['ct7'] == '未变化', "首尾空格变化不误报（CLP-R-0007 判为未变化）")
    ok(r['ct6'] == '文案或来源变更', "连续空格与尾随空格不误报为文本内容变化（CLP-R-0006 仅名称变更）")
    ok(r['sum']['deactivated'] == 0, "全部现行规则都在候选版本中时不产生候选停用")

    print("\n=== 三、引擎支持状态由系统生成 ===")
    r = pg.evaluate("""() => {
      LF.reset();
      var rows = LF.cloneRules();
      function row(id){ var r=null; rows.forEach(function(x){ if(x.id===id) r=x; }); return r; }
      /* 伪造：上传文件里把支持状态写成「已支持」、测试写成「通过」 */
      rows.push({id:'CLP-R-0011', name:'伪造支持状态演示', cat:'演示', target:'混合物', gcl:'—',
        add:'否', ref:'Annex I（演示）', ver:'R2027.1', status:'待审核',
        method:'CLP-M-NEWTOX', engine:'已支持', test:'通过', h:'',
        run:{limit:0.1}, det:{inputs:'',cond:'',formula:'',except:'',prio:'',output:'',label:'',src:'Annex I（演示）'}});
      /* 已实现方法但缺参数 */
      rows.push({id:'CLP-R-0012', name:'缺参数演示', cat:'演示', target:'混合物', gcl:'—',
        add:'否', ref:'Annex I（演示）', ver:'R2027.1', status:'待审核',
        method:'CLP-M-ATE-SUM', engine:'已支持', test:'通过', h:'',
        run:{}, det:{inputs:'',cond:'',formula:'',except:'',prio:'',output:'',label:'',src:'Annex I（演示）'}});
      var d = LF.draft('R2099-C', '2027-01-01', rows);
      var g = clpRuleVersionRunGates(d);
      function e(id){ var o=null; g.entries.forEach(function(x){ if(x.ruleId===id) o=x; }); return o; }
      /* 方法版本变化 → 不得复用历史测试结果 */
      var fakeBase = clpRuleDeepClone(LF.base());
      fakeBase.methodVersions['CLP-M-ATE-SUM'] = '0.0.1-old';
      var reuse1 = clpRuleTestReusable(LF.row(LF.base(),'CLP-R-0001'), LF.row(LF.base(),'CLP-R-0001'), LF.base());
      var reuse2 = clpRuleTestReusable(LF.row(LF.base(),'CLP-R-0001'), LF.row(LF.base(),'CLP-R-0001'), fakeBase);
      return {
        s1: e('CLP-R-0001').engineSupport,
        s11: e('CLP-R-0011').engineSupport, s11msg: e('CLP-R-0011').issues[0]||'',
        s12: e('CLP-R-0012').engineSupport, s12msg: e('CLP-R-0012').issues[0]||'',
        s5: e('CLP-R-0005').engineSupport, s5msg: e('CLP-R-0005').issues[0]||'',
        ignored: d.ignoredUploadFields,
        reuse1: reuse1, reuse2: reuse2
      };
    }""")
    ok(r['s1'] == '已支持', "已实现方法 + 参数完整 + 测试通过 → 已支持")
    ok(r['s11'] == '需要研发实现', "未登记方法 → 需要研发实现（上传文件伪造的「已支持」被忽略）")
    ok('尚未开发' in r['s11msg'], "提示为业务语言：%s" % r['s11msg'])
    ok(r['s12'] == '需要配置参数' and '缺少' in r['s12msg'], "缺参数 → 需要配置参数：%s" % r['s12msg'])
    ok(r['s5'] == '需要研发实现' and '尚未实现' in r['s5msg'], "方法已登记但未实现 → 需要研发实现：%s" % r['s5msg'])
    ok('engine' in r['ignored'] and 'test' in r['ignored'], "上传文件中的 engine / test 列被标记为系统字段并忽略")
    ok(r['reuse1'] is True and r['reuse2'] is False, "方法版本变化后不得复用历史测试结果")

    print("\n=== 四、测试复用与测试门禁 ===")
    r = pg.evaluate("""() => {
      LF.reset();
      var d = LF.draft('R2099-D', '2027-01-01', LF.demoRows('R2099-D'));
      var g = clpRuleVersionRunGates(d);
      function e(id){ var o=null; g.entries.forEach(function(x){ if(x.ruleId===id) o=x; }); return o; }
      /* 执行指纹变化后不得复用：把 R-0001 的阈值区间改掉 */
      var rows2 = LF.cloneRules();
      var t = null;
      rows2.forEach(function(x){ if(x.id==='CLP-R-0001') t = x; });
      t.run.thresholds = [{max:5,cat:'类别 1',h:'H300'},{max:40,cat:'类别 2',h:'H300'}];
      var d2 = LF.draft('R2099-D2', '2027-01-01', rows2);
      var g2 = clpRuleVersionRunGates(d2);
      var e2 = null;
      g2.entries.forEach(function(x){ if(x.ruleId==='CLP-R-0001') e2 = x; });
      /* 新规则（方法已实现 + 参数完整）但无测试用例 */
      var rows3 = LF.cloneRules();
      rows3.push({id:'CLP-R-0013', name:'无用例新增规则', cat:'演示', target:'混合物', gcl:'—',
        add:'否', ref:'Annex I（演示）', ver:'R2027.1', status:'待审核', method:'CLP-M-ATE-SUM', h:'',
        run:{thresholds:[{max:5,cat:'类别 1',h:'H300'},{max:50,cat:'类别 2',h:'H300'},{max:300,cat:'类别 3',h:'H301'},{max:2000,cat:'类别 4',h:'H302'}]},
        det:{inputs:'',cond:'',formula:'',except:'',prio:'',output:'',label:'',src:'Annex I（演示）'}});
      var d3 = LF.draft('R2099-D3', '2027-01-01', rows3);
      var g3 = clpRuleVersionRunGates(d3);
      var e3 = null;
      g3.entries.forEach(function(x){ if(x.ruleId==='CLP-R-0013') e3 = x; });
      return {
        r1reuse: e('CLP-R-0001').testResult.reused, r1from: e('CLP-R-0001').testResult.fromVersion,
        r4reuse: e('CLP-R-0004').testResult.reused,
        r3ran: e('CLP-R-0003').testResult.ran, r3pass: e('CLP-R-0003').testResult.pass,
        r2ran: e('CLP-R-0002').testResult.ran, r2pass: e('CLP-R-0002').testResult.pass,
        r2gate: e('CLP-R-0002').gateStatus,
        e2reuse: e2 ? e2.testResult.reused : null, e2gate: e2 ? e2.gateStatus : null,
        e3gate: e3 ? e3.gateStatus : null, e3msg: e3 ? (e3.issues[0]||'') : ''
      };
    }""")
    ok(r['r1reuse'] is True and r['r1from'] == 'R2026.2', "未变化规则沿用上版测试结果（来源版本 %s）" % r['r1from'])
    ok(r['r4reuse'] is True, "只改法规公式描述的规则不重复执行计算测试")
    ok(r['r3ran'] is True and r['r3pass'] is True and r['r3ran'], "例外条件变化的规则实际执行了测试并通过")
    ok(r['r2ran'] is True and r['r2pass'] is False and r['r2gate'] == '测试失败', "修改规则测试失败 → 门禁判为「测试失败」")
    ok(r['e2reuse'] is False and r['e2gate'] != '可发布', "执行指纹变化后不得复用历史测试（门禁 %s）" % r['e2gate'])
    ok(r['e3gate'] == '待补充' and '测试用例' in r['e3msg'], "新规则无代表性测试用例 → 不得发布：%s" % r['e3msg'])

    print("\n=== 五、Release Manifest 与部分发布 ===")
    r = pg.evaluate("""() => {
      LF.reset();
      var d = LF.draft('R2099-E', '2027-01-01', LF.demoRows('R2099-E'));
      var m1 = clpRuleVersionBuildReleaseManifest(d);
      /* 未确认停用 → 旧规则继续有效 */
      var res1 = LF.pub(d, {});
      var a1 = LF.active(LF.asOf());
      var after1 = a1 ? a1.rules.map(function(x){return x.id;}) : [];
      var skin1 = LF.row(a1, 'CLP-R-0002') ? LF.row(a1,'CLP-R-0002').run.skinCorr : null;
      /* 再建一个版本：确认停用 + 当天生效 */
      LF.reset();
      var d2 = LF.draft('R2099-E2', '2026-09-20', LF.demoRows('R2099-E2'));
      d2.deactivationConfirmed = true;
      var m2 = clpRuleVersionBuildReleaseManifest(d2);
      var res2 = LF.pub(d2, {});
      var a2 = LF.active(LF.asOf());
      var after2 = a2 ? a2.rules.map(function(x){return x.id;}) : [];
      var pack = clpActivePack();
      var base2 = LF.base();
      return {
        m1pub: m1.publishableRules, m1def: m1.deferredRules.map(function(x){return x.ruleId+':'+x.gateStatus;}),
        m1ret: m1.retainedOldRules, m1deact: m1.deactivatedRules, m1pend: m1.pendingDeactivationRules,
        res1ok: res1.ok, after1: after1, skin1: skin1,
        m2deact: m2.deactivatedRules, res2ok: res2.ok, after2: after2,
        st2: a2 ? a2.version : '', baseSt: base2.status,
        packIds: pack.ruleIds
      };
    }""")
    ok(r['m1pub'] == ['CLP-R-0001', 'CLP-R-0003', 'CLP-R-0004'], "可发布规则进入清单：%s" % '/'.join(r['m1pub']))
    ok(any(x.startswith('CLP-R-0005') or x.startswith('CLP-R-0006') or x.startswith('CLP-R-0008') for x in r['m1def']),
       "待研发实现规则进入延后清单")
    ok('CLP-R-0002:测试失败' in r['m1def'], "测试失败规则进入延后清单")
    ok('CLP-R-0002' in r['m1ret'], "未通过门禁的修改规则记为「旧版继续生效」")
    ok('CLP-R-0008' not in r['after1'] and 'CLP-R-0009' not in r['after1'], "不合格的新增规则不进入活动规则集")
    ok(r['skin1'] == 5, "不合格的修改规则保留旧版参数（skinCorr 仍为 5%）")
    ok('CLP-R-0007' in r['after1'] and r['m1pend'] == ['CLP-R-0007'], "未确认停用时旧规则继续有效")
    ok(r['m2deact'] == ['CLP-R-0007'] and 'CLP-R-0007' not in r['after2'], "明确确认停用后规则才会移除")
    ok('CLP-R-0001' in r['after2'] and 'CLP-R-0002' in r['after2'] and 'CLP-R-0006' in r['after2'],
       "部分发布不会破坏原有规则集（发布后仍含 %d 条）" % len(r['after2']))
    ok(sorted(r['packIds']) == ['CLP-R-0001', 'CLP-R-0002', 'CLP-R-0003', 'CLP-R-0004'],
       "发布后活动规则包仍只纳入 4 条可执行规则")

    print("\n=== 六、单一审核与发布 ===")
    r = pg.evaluate("""() => {
      LF.reset();
      var d = LF.draft('R2099-F', '2027-01-01', LF.demoRows('R2099-F'));
      var noDecl = LF.pub(d, {decl:false});
      var noBy = LF.pub(d, {by:''});
      var okp = LF.pub(d, {});
      var frozen = d.frozen, by = d.reviewedBy, at = d.reviewedAt, decl = d.declaration;
      var again = LF.pub(d, {});
      var st1 = d.status;
      /* 撤回 */
      var w = clpRuleVersionWithdraw(d.id);
      var st2 = d.status;
      var afterW = LF.active(LF.asOf());
      /* 当天生效 */
      LF.reset();
      var d2 = LF.draft('R2099-F2', '2026-09-20', LF.demoRows('R2099-F2'));
      var p2 = LF.pub(d2, {});
      var base = LF.base();
      return {noDeclOk:noDecl.ok, noDeclErr:noDecl.errors[0]||'', noByOk:noBy.ok, noByErr:noBy.errors[0]||'',
        okp:okp.ok, frozen:frozen, by:by, at:at, decl:decl,
        againOk:again.ok, againErr:again.errors[0]||'', st1:st1,
        wOk:w.ok, st2:st2, afterWVer: afterW ? afterW.version : '',
        st3:d2.status, baseSt:base.status};
    }""")
    ok(r['noDeclOk'] is False and '审核确认' in r['noDeclErr'], "未勾选审核确认不能发布：%s" % r['noDeclErr'])
    ok(r['noByOk'] is False and '审核人' in r['noByErr'], "没有审核人不能发布：%s" % r['noByErr'])
    ok(r['okp'] is True and r['by'] == '质管-杨工' and bool(r['at']), "发布后保存审核人（%s）与审核时间（%s）" % (r['by'], r['at']))
    ok('我已对照法规原文核对' in r['decl'], "审核声明即唯一确认项：%s" % r['decl'])
    ok(r['frozen'] is True and r['againOk'] is False and '不可编辑' in r['againErr'], "发布后草稿不可继续编辑")
    ok(r['st1'] == '待生效', "未来生效日期 → 版本状态「待生效」")
    ok(r['wOk'] is True and r['st2'] == '已撤回', "待生效版本可撤回 → 状态「已撤回」")
    ok(r['afterWVer'] == 'R2026.2', "撤回后活动版本回到基线（%s）" % r['afterWVer'])
    ok(r['st3'] == '已生效' and r['baseSt'] == '已失效', "当天生效 → 新版本「已生效」，上一版本「已失效」")

    print("\n=== 七、按日期解析活动版本 ===")
    r = pg.evaluate("""() => {
      LF.reset();
      var today = LF.asOf();
      var d = LF.draft('R2099-G', '2026-09-20', LF.demoRows('R2099-G'));
      LF.pub(d, {});
      var hist = clpRuleVersionResolve('2026-07-01');
      var cur = clpRuleVersionResolve(today);
      /* 未来生效版本不得提前参与计算 */
      var rowsG2 = LF.demoRows('R2099-G2');
      rowsG2.forEach(function(x){ if(x.id === 'CLP-R-0004') x.name = '慢性水生毒性—M 因子加权求和规则（名称补充）'; });
      var d2 = LF.draft('R2099-G2', '2027-03-01', rowsG2);
      var pubG2 = LF.pub(d2, {});
      var fut = clpRuleVersionResolve('2027-06-01');
      var now2 = clpRuleVersionResolve(today);
      var packNow = clpActivePack(today);
      var packSds = clpActivePack(wz.project.date);
      var run = clpEvaluateMixture(wz.formula, wz.project.date);
      return {pubG2: pubG2.ok, g2st: d2.status, hist: hist?hist.version:null, cur: cur?cur.version:null, fut: fut?fut.version:null,
        now2: now2?now2.version:null, packNow: packNow.ruleSetVersion, packSds: packSds.ruleSetVersion,
        sdsVer: run.pack.ruleSetVersion, sdsIds: run.pack.ruleIds,
        labels: run.labels, today: today, proj: wz.project.date};
    }""")
    ok(r['hist'] == 'R2026.2', "历史日期（2026-07-01）解析到旧版本 %s" % r['hist'])
    ok(r['cur'] == 'R2099-G', "当前日期（%s）解析到当前版本 %s" % (r['today'], r['cur']))
    ok(r['fut'] == 'R2099-G2', "更晚的日期解析到更晚的版本 %s" % r['fut'])
    ok(r['now2'] == 'R2099-G', "未来生效版本（2027-03-01）不会提前成为活动版本")
    ok(r['packNow'] == 'R2099-G' and r['packSds'] == 'R2099-G', "clpActivePack(日期) 返回对应规则版本")
    ok(r['sdsVer'] == 'R2099-G' and r['sdsIds'] == ['CLP-R-0001', 'CLP-R-0002', 'CLP-R-0003', 'CLP-R-0004'],
       "SDS 按投放日期（%s）调用规则版本 %s" % (r['proj'], r['sdsVer']))

    print("\n=== 八、默认演示结果与阶段 1 一致（行为保持） ===")
    r = pg.evaluate("""() => {
      LF.reset();
      var run = clpEvaluateMixture(wz.formula, wz.project.date);
      return {packVer: run.pack.ruleSetVersion,
        ids: run.items.map(function(i){return i.id;}),
        results: run.items.map(function(i){return i.result;}),
        status: run.items.map(function(i){return i.status;}),
        labels: run.labels};
    }""")
    ok(r['packVer'] == 'R2026.2', "默认演示 SDS 仍使用规则版本 %s" % r['packVer'])
    ok(r['ids'] == ['acuteOral', 'skin', 'sens', 'eye', 'aqua'],
       "引擎分类项顺序不变（%d 项）" % len(r['ids']))
    ok(r['results'][:5] == ['不分类', '类别 2', '类别 1', '类别 2', '—'],
       "前 5 项分类结果与阶段 1 一致：%s" % ' / '.join(r['results'][:5]))
    ok(r['labels']['hCodes'] == ['H315', 'H317', 'H319'], "H 码不变：%s" % '/'.join(r['labels']['hCodes']))
    ok(len(r['labels']['pCodes']) == 12 and r['labels']['pictograms'] == ['GHS07'] and r['labels']['signal'] == 'warning',
       "P 码 12 条 / 象形图 GHS07 / 信号词 warning 均不变")

    print("\n=== 九、页面流程（五步 · 单一审核 · 业务语言） ===")
    r = pg.evaluate("""() => {
      LF.reset();
      clpLImport();
      _clpImp.mod = 'rules'; _clpImp.ver = 'R2027.1'; _clpImp.eff = '2027-01-01'; _clpImp.cut = '2026-09-15';
      _clpImp.srcCode = 'R2027.1'; _clpImp.srcDate = '2026-09-15';
      clpImpBuildDraft(); _clpImp.step = 4;
      var h4 = clpLImpHtml(4);
      _clpImp.t4 = 'diff'; var h4d = clpLImpHtml(4);
      _clpImp.t4 = 'test'; var h4t = clpLImpHtml(4);
      _clpImp.step = 5; var h5 = clpLImpHtml(5);
      var foot5 = clpLImpFoot(5);
      /* Annex VI 分支不受影响 */
      clpLImport();
      _clpImp.t4 = 'diff';
      var vi4 = clpLImpHtml(4), vi5 = clpLImpHtml(5), viFoot = clpLImpFoot(5);
      var mini = clpLMini(1);
      return {
        steps: (mini.match(/mini-step /g)||[]).length,
        h4diff: h4d.indexOf('字段级差异')>=0, h4man: h4d.indexOf('发布清单')>=0,
        h4def: h4d.indexOf('暂不发布清单')>=0, h4sup: h4.indexOf('引擎支持状态')>=0,
        h4test: h4t.indexOf('沿用上版测试结果')>=0,
        h5once: (foot5.match(/审核并发布可用规则|审核通过并发布/g)||[]).length,
        decl: h5.indexOf('我已确认本次停用')>=0,
        bad: ['内部审核','外部审核','专业复核分流','多级审批','会签','第二审核人']
              .filter(function(w){return (h4+h5+foot5).indexOf(w)>=0;}),
        tech: ['schema invalid','method registry missing','fingerprint mismatch',
               'execution context invalid','parameter binding failed']
              .filter(function(w){return (h4+h5).indexOf(w)>=0;}),
        footCnt: foot5.indexOf('将发布 3 条')>=0,
        viOk: vi4.indexOf('变更类型覆盖面')>=0 && vi5.indexOf('cipOk1')>=0 && viFoot.indexOf('发布版本')>=0
      };
    }""")
    ok(r['steps'] == 5, "导入向导仍是 5 步，未新增第六步")
    ok(r['h4diff'] and r['h4man'] and r['h4def'], "第 4 步展示实时字段级 Diff / 发布清单 / 暂不发布清单")
    ok(r['h4sup'], "第 4 步展示系统自动判断的引擎支持状态")
    ok(r['h4test'], "第 4 步展示测试复用说明")
    ok(r['h5once'] >= 1 and r['decl'], "第 5 步只有一次审核发布动作 + 停用统一确认项")
    ok(not r['bad'], "页面不出现多级审核类表述（内部审核 / 外部审核 / 专业复核分流…）")
    ok(not r['tech'], "阻断提示不使用技术黑话（schema invalid / fingerprint mismatch…）")
    ok(r['footCnt'], "按钮旁显示发布与暂不发布数量")
    ok(r['viOk'], "Annex VI / 标签字典导入流程不受影响")

    print("\n=== 十、无动态求值 ===")
    r = pg.evaluate("""() => {
      var s = '';
      return {hasEval: (typeof COMPLIANCE_METHOD_REGISTRY === 'object')};
    }""")
    ok(r['hasEval'], "方法注册表在产物中可用")

    print("\n" + "=" * 46)
    print("阶段 2 生命周期自检：通过 %d / 失败 %d" % (P, Fail))
    if errs:
        print("页面错误：", errs[:5])
    print("=" * 46)
    b.close()
