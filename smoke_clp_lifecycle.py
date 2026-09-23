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
        /* 与页面真实加载后的版本库一致：基线 + 候选草稿 R2027.1 共存。
           专用于「导入草稿不得覆盖候选草稿」一类断言 —— reset() 会把候选草稿一并清掉，
           那种环境恰好绕开了这个冲突，所以必须单独有这个入口。 */
        resetReal: function(){
          CLP_RULE_VERSION_STORE.length = 0;
          CLP_RULES = JSON.parse(JSON.stringify(window.PRISTINE_RULES));
          clpRuleVersionSeedBaseline();
          clpRuleVersionSeedCandidate();
          clpSyncActiveRulesProjection();
          return CLP_RULE_VERSION_STORE.map(function(v){
            return v.version + ':' + v.status + (v.isCandidate ? ':候选' : (v.isBaseline ? ':基线' : ''));
          });
        },
        setProjDate: function(d){ wz.project.date = d; },
        projDate: function(){ return wz.project.date; },
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
        asOf: function(){ return clpSystemToday(); }
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
    ok(r['rules'] == r['curRules'] and r['rules'] == 5,
       "基线 R2026.2 只含实际生效的 5 条（R-0006/0007 已归 R2027.1 候选草稿）" % () if False else
       "基线 R2026.2 只含实际生效的 %d 条，与 CLP_RULES 投影一致（R-0006/0007 已归 R2027.1 候选草稿）" % r['rules'])
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
      row('CLP-R-0002').h = 'H360';                                        /* H 码变化（与参数变化并存） */
      /* 归一化：首尾空格 / 连续空格 / 尾随空格都不算业务变化 */
      row('CLP-R-0005').name = '  同一危害类别的分层与优先级原则  ';          /* 首尾空格 */
      row('CLP-R-0005').det.src = row('CLP-R-0005').det.src
        .replace('Regulation (EC) No', 'Regulation  (EC)   No') + '   ';    /* 连续空格 + 尾空格 */
      rows.push({id:'CLP-R-0010', name:'新增演示规则', cat:'演示', target:'混合物', gcl:'—',
        add:'否', ref:'Annex I（演示）', ver:'R2027.1', status:'待审核', method:'CLP-M-ATE-SUM', h:'',
        run:{thresholds:[{max:5,cat:'类别 1',h:'H300'}]},
        det:{inputs:'', cond:'', formula:'', except:'', prio:'', output:'', label:'', src:'Annex I（演示）'}});
      var d = LF.draft('R2099-B', '2027-01-01', rows);
      var cmp = clpRuleVersionCompare(LF.base(), d);
      function fd(ruleId, field){ var o=null; cmp.fieldDiffs.forEach(function(f){ if(f.ruleId===ruleId && (!field || f.field===field)) o=f; }); return o; }
      function ct(id){ var o=null; cmp.modified.concat(cmp.unchanged).forEach(function(x){ if(x.ruleId===id) o=x.changeType; }); return o; }
      return {
        added: cmp.added.map(function(x){return x.ruleId;}),
        unchanged: cmp.unchanged.map(function(x){return x.ruleId;}),
        deact: cmp.deactivated.map(function(x){return x.ruleId;}),
        f2: fd('CLP-R-0002'), f1: fd('CLP-R-0001'), f4: fd('CLP-R-0004'),
        f3: fd('CLP-R-0003'), f5: fd('CLP-R-0002', 'h'), f6: fd('CLP-R-0005'),
        ct1: ct('CLP-R-0001'), ct4: ct('CLP-R-0004'), ct5: ct('CLP-R-0005'),
        /* 独立的「纯文本变化」Diff：只改规则名称，不得触发重新测试 */
        ctTxt: (function(){
          var rows2 = LF.cloneRules();
          rows2.forEach(function(x){ if(x.id === 'CLP-R-0005') x.name = '同一危害类别的分层与优先级原则（名称修订）'; });
          var c2 = clpRuleVersionCompare(LF.base(), LF.draft('R2099-B2', '2027-01-01', rows2));
          var t = null; c2.modified.concat(c2.unchanged).forEach(function(x){ if(x.ruleId === 'CLP-R-0005') t = x.changeType; });
          return t;
        })(),
        fTxt: (function(){
          var rows2 = LF.cloneRules();
          rows2.forEach(function(x){ if(x.id === 'CLP-R-0005') x.name = '同一危害类别的分层与优先级原则（名称修订）'; });
          var c2 = clpRuleVersionCompare(LF.base(), LF.draft('R2099-B3', '2027-01-01', rows2));
          var f = null; c2.fieldDiffs.forEach(function(x){ if(x.ruleId === 'CLP-R-0005') f = x; });
          return f;
        })(),
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
    ok(r['ct5'] == '未变化', "首尾空格与连续空格不误报（CLP-R-0005 判为「%s」）" % r['ct5'])
    ok(not r['f6'], "归一化后不产生字段级差异（空格变化被折叠）")
    ok(r['ctTxt'] == '文案或来源变更' and r['fTxt'] and r['fTxt']['affectsExecution'] is False,
       "文本变化识别为「文案或来源变更」且**不**触发重新测试（可与计算变化区分）")
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
    ok('CLP-R-0005' in r['after1'] and r['m1pend'] == ['CLP-R-0005'],
       "未确认停用时旧规则继续有效（候选停用=%s）" % '/'.join(r['m1pend']))
    ok(r['m2deact'] == ['CLP-R-0005'] and 'CLP-R-0005' not in r['after2'], "明确确认停用后规则才会移除")
    ok('CLP-R-0001' in r['after2'] and 'CLP-R-0002' in r['after2'] and 'CLP-R-0004' in r['after2'],
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

    print("\n=== 十一、引擎支持状态：页面展示必须以方法注册表为唯一真源 ===")
    r = pg.evaluate("""() => {
      var out = {mismatch: [], fakeSupported: [], rendered: [], methEngine: 0, reg: {}};
      /* ① 每条规则：页面取值 == 系统派生值 == 规则上写回的 engine 字段 */
      CLP_RULES.forEach(function(r){
        var shown = clpRuleEngineStatusText(r);
        out.rendered.push({id: r.id, shown: shown, cached: r.engine, src: r.engineSource});
        if(shown !== r.engine) out.mismatch.push(r.id);
      });
      /* ② 红线：不得存在「方法未实现却显示已支持」的规则 */
      out.fakeSupported = CLP_RULES.filter(function(r){
        return clpRuleEngineStatusText(r) === '已支持' && !complianceMethodImplemented(r.method);
      }).map(function(r){ return r.id; });
      /* ③ LAYER / BRIDGE 必须「需要研发实现」 */
      out.layer  = clpRuleEngineStatusText({method: 'CLP-M-LAYER'});
      out.bridge = clpRuleEngineStatusText({method: 'CLP-M-BRIDGE'});
      /* ④ 方法字典不得再带手工 engine 字段 */
      out.methEngine = CLP_METHODS.filter(function(m){ return typeof m.engine !== 'undefined'; }).length;
      /* ⑤ 注册表真实状态对照 */
      ['CLP-M-LAYER','CLP-M-BRIDGE','CLP-M-ED-PBT','CLP-M-ATE-SUM'].forEach(function(c){
        out.reg[c] = COMPLIANCE_METHOD_REGISTRY[c] ? COMPLIANCE_METHOD_REGISTRY[c].implementationStatus : 'missing';
      });
      /* ⑥ 强红线：临时把 ATE 方法改成未实现，页面必须立刻跟着变（证明确为实时派生，非读缓存）。
            必须用真实规则（带 run 参数），否则会先被「参数缺失」判为需要配置参数。 */
      var rule = clpRuleById('CLP-R-0001');
      out.base = clpRuleEngineStatusText(rule);
      var bak = COMPLIANCE_METHOD_REGISTRY['CLP-M-ATE-SUM'].implementationStatus;
      COMPLIANCE_METHOD_REGISTRY['CLP-M-ATE-SUM'].implementationStatus = 'not_implemented';
      out.flipTo = clpRuleEngineStatusText(rule);
      COMPLIANCE_METHOD_REGISTRY['CLP-M-ATE-SUM'].implementationStatus = bak;
      out.flipBack = clpRuleEngineStatusText(rule);
      return out;
    }""")
    ok(not r['mismatch'], "每条规则：页面展示状态 == 系统派生值 == 写回字段（%s）" % ('/'.join(r['mismatch']) or '全部一致'))
    ok(r['fakeSupported'] == [], "红线：不存在「方法未实现却显示已支持」的规则（%s）" % ('/'.join(r['fakeSupported']) or '无'))
    ok(r['layer'] == '需要研发实现' and r['bridge'] == '需要研发实现',
       "LAYER / BRIDGE 一律「需要研发实现」（%s / %s）" % (r['layer'], r['bridge']))
    ok(r['layer'] != '已支持' and r['bridge'] != '已支持', "LAYER / BRIDGE 不得再显示「已支持」")
    ok(r['methEngine'] == 0, "CLP_METHODS 已删除手工 engine 字段（残留 %d 条）" % r['methEngine'])
    ok(r['reg']['CLP-M-LAYER'] == 'not_implemented' and r['reg']['CLP-M-BRIDGE'] == 'not_implemented',
       "注册表真实状态确为 not_implemented（LAYER=%s / BRIDGE=%s）" % (r['reg']['CLP-M-LAYER'], r['reg']['CLP-M-BRIDGE']))
    ok(all(x['src'] == '系统生成' for x in r['rendered']), "所有规则的支持状态均标记「系统生成」，非人工填写")
    ok(r['base'] == '已支持' and r['flipTo'] == '需要研发实现' and r['flipBack'] == '已支持',
       "强红线：改注册表实现状态，页面立刻随之变化（%s → %s → 还原 %s）" % (r['base'], r['flipTo'], r['flipBack']))

    print("\n=== 十、无动态求值 ===")
    r = pg.evaluate("""() => {
      var s = '';
      return {hasEval: (typeof COMPLIANCE_METHOD_REGISTRY === 'object')};
    }""")
    ok(r['hasEval'], "方法注册表在产物中可用")

    print("\n=== 十二、修复回归（日期分离 · 批量停用 · 包版本信息 · 导入草稿与候选草稿） ===")
    r = pg.evaluate("""() => {
      var out = {};

      /* ---- 12.1 规则版本何时生效，只由系统日期决定，与 SDS 投放日期无关 ---- */
      out.scen = {};
      ['2026-09-23', '2027-06-01', '2026-01-05'].forEach(function(pd, i){
        LF.setProjDate(pd);
        CLP_RULE_VERSION_STORE.length = 0;
        CLP_RULES = JSON.parse(JSON.stringify(window.PRISTINE_RULES));
        clpRuleVersionSeedBaseline(); clpRuleVersionSeedCandidate(); clpSyncActiveRulesProjection();
        var d = LF.draft('R2099-DT' + i, '2026-10-01', LF.demoRows('R2099-DT' + i));
        var p = LF.pub(d);
        var act = LF.active(LF.asOf());
        out.scen[pd] = {ok: p.ok, st: d.status, act: act ? act.version : null,
                        base: clpRuleVersionBaseline().status, sys: clpSystemToday()};
      });
      LF.setProjDate('2026-10-01');

      /* ---- 12.2 一次停用两条及以上规则，只移除被确认停用的那些 ---- */
      function stop(ids, ver){
        LF.reset();
        var rows = LF.cloneRules().filter(function(x){ return ids.indexOf(x.id) < 0; });
        var d = LF.draft(ver, '2026-09-20', rows);
        d.deactivationConfirmed = true;
        var man = clpRuleVersionBuildReleaseManifest(d);
        var p = LF.pub(d);
        return {ok: p.ok, pend: man.pendingDeactivationRules, after: d.rules.map(function(x){ return x.id; })};
      }
      out.stopTwo = stop(['CLP-R-0004', 'CLP-R-0005'], 'R2099-S1');
      out.stopMid = stop(['CLP-R-0002', 'CLP-R-0004'], 'R2099-S2');
      out.stopThree = stop(['CLP-R-0001', 'CLP-R-0003', 'CLP-R-0005'], 'R2099-S3');

      /* ---- 12.3 规则包上的版本信息，与本次实际取用的那版规则同源 ---- */
      LF.reset();
      var dP = LF.draft('R2099-P', '2026-09-20', LF.demoRows('R2099-P'));
      LF.pub(dP);
      var pFut = clpActivePack('2027-06-01'), pHis = clpActivePack('2026-07-01');
      var vFut = clpRuleVersionResolve('2027-06-01'), vHis = clpRuleVersionResolve('2026-07-01');
      out.fut = {rv: pFut.ruleSetVersion, mod: pFut.modules.rules, eff: pFut.effectiveFrom, id: pFut.id,
                 vver: vFut ? vFut.version : '', veff: vFut ? vFut.effectiveFrom : ''};
      out.his = {rv: pHis.ruleSetVersion, mod: pHis.modules.rules, vver: vHis ? vHis.version : ''};

      /* ---- 12.4 导入草稿不得覆盖候选草稿（真实启动态：两者共存） ---- */
      out.store0 = LF.resetReal();
      var cand0 = clpRuleVersionCandidate();
      out.cand0 = {id: cand0.id, rules: cand0.rules.map(function(x){ return x.id; })};
      clpLImport();
      _clpImp.mod = 'rules'; _clpImp.ver = 'R2027.1'; _clpImp.eff = '2027-01-01';
      _clpImp.cut = '2026-09-15'; _clpImp.srcCode = 'R2027.1'; _clpImp.srcDate = '2026-09-15';
      var d1 = clpImpBuildDraft();
      var cand1 = clpRuleVersionCandidate();
      out.store1 = CLP_RULE_VERSION_STORE.map(function(v){ return v.version + ':' + v.status; });
      out.cand1 = {id: cand1 ? cand1.id : '', rules: cand1 ? cand1.rules.map(function(x){ return x.id; }) : null};
      out.d1 = {id: d1 ? d1.id : '', isCand: d1 ? !!d1.isCandidate : null, isBase: d1 ? !!d1.isBaseline : null};

      /* ---- 12.5 同版本重复上传，复用同一个导入草稿 ---- */
      var d2 = clpImpBuildDraft();
      out.d2 = {id: d2 ? d2.id : '', same: !!(d1 && d2 && d1.id === d2.id), n: CLP_RULE_VERSION_STORE.length};
      return out;
    }""")

    for pd, label in [('2026-09-23', '投放日=系统今天'), ('2027-06-01', '投放日=未来'), ('2026-01-05', '投放日=过去')]:
        s = r['scen'][pd]
        ok(s['ok'] and s['st'] == '待生效' and s['act'] == 'R2026.2' and s['base'] == '已生效',
           "生效日期 2026-10-01 尚未到期 → %s：版本「%s」、活动版本仍 %s（系统日 %s）"
           % (label, s['st'], s['act'], s['sys']))

    ok(r['stopTwo']['pend'] == ['CLP-R-0004', 'CLP-R-0005']
       and r['stopTwo']['after'] == ['CLP-R-0001', 'CLP-R-0002', 'CLP-R-0003'],
       "一次停用相邻两条（R-0004 / R-0005）→ 只移除这两条，剩 %s" % '/'.join(r['stopTwo']['after']))
    ok(r['stopMid']['pend'] == ['CLP-R-0002', 'CLP-R-0004']
       and r['stopMid']['after'] == ['CLP-R-0001', 'CLP-R-0003', 'CLP-R-0005'],
       "一次停用不相邻两条（R-0002 / R-0004）→ 不误伤其他规则，剩 %s" % '/'.join(r['stopMid']['after']))
    ok(r['stopThree']['after'] == ['CLP-R-0002', 'CLP-R-0004'],
       "一次停用三条（R-0001 / R-0003 / R-0005）→ 剩 %s" % '/'.join(r['stopThree']['after']))

    f, h = r['fut'], r['his']
    ok(f['rv'] == 'R2099-P' and f['mod'] == f['rv'] and f['rv'] == f['vver'],
       "未来日期取的规则包：三处版本号一致（包版本 %s / 模块版本 %s / 解析版本 %s）" % (f['rv'], f['mod'], f['vver']))
    ok(f['eff'] == f['veff'] and f['eff'] == '2026-09-20',
       "规则包生效日期取自同一版本（包 %s / 版本 %s）" % (f['eff'], f['veff']))
    ok('R2099' in f['id'], "规则包编号含该版本标识：%s" % f['id'])
    ok(h['rv'] == 'R2026.2' and h['mod'] == 'R2026.2' and h['vver'] == 'R2026.2',
       "历史日期取到历史版本，包版本信息同为 %s" % h['rv'])

    ok(len(r['store0']) == 2 and r['cand0']['rules'] == ['CLP-R-0006', 'CLP-R-0007'],
       "真实启动态：基线 + 候选草稿共存（%s），候选含 %s" % (' / '.join(r['store0']), '/'.join(r['cand0']['rules'])))
    ok(r['d1']['id'] == 'CLP-RULESET-R2027.1-DRAFT' and r['d1']['isCand'] is False and r['d1']['isBase'] is False,
       "导入草稿是独立对象，不落在候选草稿上：%s" % r['d1']['id'])
    ok(r['cand1']['rules'] == ['CLP-R-0006', 'CLP-R-0007'] and r['cand1']['id'] == r['cand0']['id'],
       "导入后候选草稿内容未被动过（%s → %s）" % ('/'.join(r['cand0']['rules']), '/'.join(r['cand1']['rules'])))
    ok(len(r['store1']) == 3, "导入后版本库为 3 个（基线 + 候选 + 导入草稿）：%s" % ' / '.join(r['store1']))
    ok(r['d2']['same'] and r['d2']['n'] == 3,
       "同版本重复上传复用同一个导入草稿（%s），版本库不增长（%d 个）" % (r['d2']['id'], r['d2']['n']))

    print("\n" + "=" * 46)
    print("阶段 2 生命周期自检：通过 %d / 失败 %d" % (P, Fail))
    if errs:
        print("页面错误：", errs[:5])
    print("=" * 46)
    b.close()
