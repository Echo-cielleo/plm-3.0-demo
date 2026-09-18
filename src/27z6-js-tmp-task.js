/* ==================================================================
   [27z6] 项目管理 · 临时任务（2026-09-17）
   ------------------------------------------------------------------
   业务背景：管理层（如严总）会发布非系统性计划的临时任务，需要指定执行人
             并跟踪反馈结果，形成闭环。

   范围：
     · 菜单「项目管理 → 临时任务」（pageId: proj:task）
     · 列表页：任务标题 / 发布人 / 执行人 / 发布时间 / 要求完成时间
                / 状态（待接收 · 进行中 · 已反馈）/ 操作
     · 新建表单：标题、内容、执行人（单选）、要求完成时间
                 （发布人 = 当前登录用户，不占表单字段）
     · 执行人视角：首页「接下来要做」行动区出现指派给自己的临时任务，
                   带「临时任务」标签区分，点击可直接填写反馈（文本 + 附件）；
                   反馈后状态 → 已反馈，发布人可查看
     · mock 3 条数据

   状态机：待接收 --(执行人点「接收任务」)--> 进行中
           待接收 / 进行中 --(执行人点「填写反馈」)--> 已反馈

   持久化：plm3_tmptask_v1（整表落盘，演示态保留）；重置钩子 _tmpReset()
           已挂 23z1 的 wzReset 链
   ================================================================== */

/* ---------- 1. 基础字典与数据 ---------- */
var TMP_ME = '王研究员';                 /* 当前登录用户（首页「接下来要做」的视角） */
var TMP_STATUS = ['待接收', '进行中', '已反馈'];
var TMP_STATUS_TAG = {'待接收': 'tag-orange', '进行中': 'tag-blue', '已反馈': 'tag-green'};
var TMP_KEY = 'plm3_tmptask_v1';

/* 演示用相对日期：保证「接下来要做」7 天窗口内始终有临时任务 */
function tmpDue(n){ return daysFromNow(n); }
function tmpAt(n, hhmm){ return daysFromNow(n) + ' ' + hhmm; }

function tmpTaskSeed(){
  TMP_TASKS = [
    {
      id: 'TMP-2026-001',
      title: '整理 WPU-320 国产化中试第一批对比数据（客户临时要看）',
      content: '客户周五来访，临时需要一份 1 页纸的对比说明：国产料与进口料在手感评分、' +
               '耐干擦、成膜外观三项上的差异，以及当前存在的风险点。数据直接从已完成实验里取，' +
               '不用另做实验。',
      publisher: '严总', executor: '王研究员',
      publishAt: tmpAt(-1, '09:20'), due: tmpDue(3),
      status: '待接收', feedback: '', fbFile: '', fbAt: ''
    },
    {
      id: 'TMP-2026-002',
      title: '核查高温老化试验箱近两周点检记录并给出是否需要外校的结论',
      content: '老化室 B203 高温老化试验箱近期温度波动偏大，请调取近两周点检记录，' +
               '核对温度偏差是否在设备能力范围内，并给出「继续内校 / 转外校」的明确结论。',
      publisher: '严总', executor: '李工',
      publishAt: tmpAt(-2, '16:05'), due: tmpDue(5),
      status: '进行中', feedback: '', fbFile: '', fbAt: ''
    },
    {
      id: 'TMP-2026-003',
      title: '补充 GL-9 涂饰剂的 ZDHC MRSL 符合性声明口径说明',
      content: '出口客户问到 ZDHC 符合性，请把 GL-9 当前保证函覆盖到哪一级（Level 1/2/3）、' +
               '还有哪些物质缺检测报告，整理成一段可直接答复客户的文字。',
      publisher: '王研究员', executor: '陈工',
      publishAt: tmpAt(-4, '10:40'), due: tmpDue(2),
      status: '已反馈',
      feedback: 'GL-9 目前可声明 ZDHC Level 1（自评），Level 3 需补 APEO 与有机锡两项检测报告，' +
                '已排期本月送检；现有保证函可覆盖 4 项受限物质，附件为最新一版声明口径。',
      fbFile: 'GL-9_ZDHC声明口径_V1.2.pdf',
      fbAt: tmpAt(-1, '15:12')
    }
  ];
}
var TMP_TASKS = null;
tmpTaskSeed();

/* ---------- 2. 持久化 ---------- */
function tmpSave(){
  try{ localStorage.setItem(TMP_KEY, JSON.stringify(TMP_TASKS || [])); }catch(e){}
}
/* 一键重置钩子（由 23z1 的 wzReset 调用） */
function _tmpReset(){
  try{ localStorage.removeItem(TMP_KEY); }catch(e){}
  tmpTaskSeed();
}
(function(){
  try{
    var a = JSON.parse(localStorage.getItem(TMP_KEY) || 'null');
    if(a && a.length) TMP_TASKS = a;
  }catch(e){}
})();

/* ---------- 3. 数据访问 ---------- */
function tmpById(id){ return (TMP_TASKS || []).filter(function(t){ return t.id === id; })[0] || null; }
function tmpNextId(){
  var y = new Date().getFullYear(), max = 0;
  (TMP_TASKS || []).forEach(function(t){
    var m = /^TMP-(\d{4})-(\d+)$/.exec(t.id || '');
    if(m && +m[1] === y) max = Math.max(max, +m[2]);
  });
  return 'TMP-' + y + '-' + ('000' + (max + 1)).slice(-3);
}
function tmpIsMine(t){ return t && t.executor === TMP_ME; }
function tmpStatusTag(t){
  return '<span class="tag ' + (TMP_STATUS_TAG[t.status] || 'tag-grey') + '">' + esc(t.status) + '</span>';
}

/* 首页行动区：指派给我、且未反馈的临时任务 */
function taskTodos(){
  return (TMP_TASKS || []).filter(function(t){
    return tmpIsMine(t) && t.status !== '已反馈';
  }).map(function(t){
    var left = daysTo(t.due);
    return {
      id: t.id,
      executor: t.executor,
      t: t.title,
      source: '临时任务',
      from: t.publisher,
      due: t.due,
      kind: '临时任务 · ' + t.status + (left < 0 ? (' · 已超期 ' + Math.abs(left) + ' 天') : ''),
      urgent: left < 0,
      act: '去反馈',
      go: 'proj:task',
      /* 行动区按钮直接开反馈弹窗，不用先跳列表 */
      fn: "tmpTaskFeedback('" + t.id + "')"
    };
  });
}

/* ---------- 4. 页面：临时任务列表 ---------- */
regPage('proj:task', {
  title: '临时任务',
  crumb: ['项目管理', '临时任务'],
  render: function(){
    $('pageHost').innerHTML = '<div id="lpHost"></div>';
    var ac = (TMP_TASKS || []).filter(function(t){ return tmpIsMine(t) && t.status !== '已反馈'; }).length;
    renderListPage({
      title: '临时任务',
      noteKey: 'proj-task',
      note: '管理层发布的<b>非系统性计划任务</b>：不在项目计划与 OA 节点里，但需要指定执行人并跟踪反馈结果。' +
            '流程为 <b>发布 → 执行人接收 → 填写反馈（文本 + 附件）→ 已反馈</b>，发布人可随时查看反馈内容。' +
            '<br>指派给当前登录用户（' + esc(TMP_ME) + '）且未反馈的任务，会同步出现在首页「接下来要做」行动区，' +
            '并带「临时任务」标签区分。',
      sub: '当前有 <b>' + ac + '</b> 条指派给 ' + esc(TMP_ME) + ' 的未反馈任务',
      headActs: '<button class="btn btn-primary" onclick="tmpTaskNew()">＋ 新建临时任务</button>',
      kwPh: '搜索任务标题 / 内容 / 编号',
      kwKeys: ['title', 'content', 'publisher', 'executor', 'id'],
      cols: [
        {k: 'id', t: '任务编号', w: '130px', fmt: function(r){ return '<span class="mono">' + esc(r.id) + '</span>'; }},
        {k: 'title', t: '任务标题', fmt: function(r){
          var over = r.status !== '已反馈' && daysTo(r.due) < 0;
          return '<div style="font-weight:500">' + esc(r.title) + '</div>' +
                 '<div class="muted" style="font-size:11.5px;margin-top:2px;overflow:hidden;' +
                 'text-overflow:ellipsis;white-space:nowrap;max-width:420px">' + esc(r.content) + '</div>' +
                 (over ? '<span class="tag tag-red" style="margin-top:3px">已超期 ' + Math.abs(daysTo(r.due)) + ' 天</span>' : '');
        }},
        {k: 'publisher', t: '发布人', w: '96px'},
        {k: 'executor', t: '执行人', w: '96px',
         fmt: function(r){ return tmpIsMine(r) ? ('<b>' + esc(r.executor) + '</b>') : esc(r.executor); }},
        {k: 'publishAt', t: '发布时间', w: '140px'},
        {k: 'due', t: '要求完成时间', w: '128px', fmt: function(r){
          var left = daysTo(r.due);
          var cl = r.status === '已反馈' ? 'var(--muted)' : (left < 0 ? '#b42318' : (left <= 2 ? '#d46b08' : 'var(--text)'));
          return '<span style="color:' + cl + '">' + esc(r.due) + '</span>';
        }},
        {k: 'status', t: '状态', w: '92px', fmt: function(r){ return tmpStatusTag(r); }}
      ],
      rows: TMP_TASKS,
      filters: [
        {k: 'status', t: '状态', opts: TMP_STATUS.map(function(s){ return [s, s]; })},
        {k: 'executor', t: '执行人', opts: [['王研究员', '王研究员'], ['李工', '李工'], ['陈工', '陈工'], ['赵工', '赵工']]},
        {k: 'publisher', t: '发布人', opts: [['严总', '严总'], ['王研究员', '王研究员']]}
      ],
      rowCls: function(r){
        return (r.status !== '已反馈' && daysTo(r.due) < 0) ? 'tmp-row-over' : '';
      },
      acts: function(r){
        var h = '<button class="btn-link" onclick="tmpTaskDetail(\'' + r.id + '\')">详情</button>';
        if(tmpIsMine(r) && r.status === '待接收'){
          h += ' <button class="btn-link" onclick="tmpTaskAccept(\'' + r.id + '\')">接收</button>';
        }
        if(tmpIsMine(r) && r.status !== '已反馈'){
          h += ' <button class="btn-link" onclick="tmpTaskFeedback(\'' + r.id + '\')">填写反馈</button>';
        }
        h += ' <button class="btn-link danger" onclick="tmpTaskDel(\'' + r.id + '\')">删除</button>';
        return h;
      },
      onRowClick: function(r){ tmpTaskDetail(r.id); }
    });
  }
});

/* ---------- 5. 新建 ---------- */
function tmpTaskNew(){
  var userOpts = USERS.map(function(u){
    return '<option value="' + esc(u.id) + '">' + esc(u.name) + '（' + esc(u.role) + '）</option>';
  }).join('');
  openModal({
    title: '新建临时任务', width: 640,
    body: '<div class="notice notice-info"><i class="ni">ℹ</i><div>' +
            '临时任务用于<b>不在项目计划与 OA 节点内</b>的临时安排：发布人默认取当前登录用户 ' +
            '<b>' + esc(TMP_ME) + '</b>，执行人收到后可在首页「接下来要做」直接填写反馈。' +
          '</div></div>' +
          '<div class="form-grid" style="margin-top:12px">' +
            '<div class="field span2"><label class="req">任务标题</label>' +
              '<input class="ctrl" id="ttTitle" placeholder="一句话说明要做什么"></div>' +
            '<div class="field span2"><label class="req">任务内容</label>' +
              '<textarea class="ctrl" id="ttContent" rows="4" placeholder="背景、具体要求、交付物形式与注意点"></textarea></div>' +
            '<div class="field"><label class="req">执行人</label>' +
              '<select class="ctrl" id="ttExecutor">' + userOpts + '</select></div>' +
            '<div class="field"><label class="req">要求完成时间</label>' +
              '<input class="ctrl" type="date" id="ttDue" value="' + esc(daysFromNow(3)) + '"></div>' +
          '</div>',
    footer: '<button class="btn" onclick="closeModal()">取消</button>' +
            '<button class="btn btn-primary" onclick="tmpTaskSaveNew()">发布</button>'
  });
}
function tmpTaskSaveNew(){
  var title = ($('ttTitle') && $('ttTitle').value || '').trim();
  var content = ($('ttContent') && $('ttContent').value || '').trim();
  var executor = ($('ttExecutor') && $('ttExecutor').value || '').trim();
  var due = ($('ttDue') && $('ttDue').value || '').trim();
  if(!title){ toast('任务标题必填', 'warn'); return; }
  if(!content){ toast('任务内容必填', 'warn'); return; }
  if(!executor){ toast('请选择执行人', 'warn'); return; }
  if(!due){ toast('请选择要求完成时间', 'warn'); return; }
  TMP_TASKS.unshift({
    id: tmpNextId(), title: title, content: content,
    publisher: TMP_ME, executor: executor,
    publishAt: nowStr(), due: due,
    status: '待接收', feedback: '', fbFile: '', fbAt: ''
  });
  tmpSave();
  closeModal();
  toast('已发布临时任务，执行人 ' + executor + ' 可在首页看到', 'ok');
  if(curPage === 'proj:task') showPage('proj:task');
}

/* ---------- 6. 详情 / 接收 / 反馈 / 删除 ---------- */
function tmpTaskDetail(id){
  var t = tmpById(id); if(!t) return;
  var fb = t.status === '已反馈'
    ? ('<dt>反馈内容</dt><dd>' + esc(t.feedback || '—') + '</dd>' +
       '<dt>反馈附件</dt><dd>' + (t.fbFile ? ('<span class="mono">' + esc(t.fbFile) + '</span>')
                                          : '<span class="muted">—</span>') + '</dd>' +
       '<dt>反馈时间</dt><dd>' + esc(t.fbAt || '—') + '</dd>')
    : ('<dt>反馈</dt><dd><span class="muted">执行人尚未反馈</span></dd>');
  openModal({
    title: '临时任务详情 · ' + t.id, width: 660,
    body: '<dl class="desc-list">' +
            '<dt>任务编号</dt><dd class="mono">' + esc(t.id) + '</dd>' +
            '<dt>任务标题</dt><dd><b>' + esc(t.title) + '</b></dd>' +
            '<dt>任务内容</dt><dd style="white-space:pre-wrap">' + esc(t.content) + '</dd>' +
            '<dt>发布人</dt><dd>' + esc(t.publisher) + '</dd>' +
            '<dt>执行人</dt><dd>' + esc(t.executor) + '</dd>' +
            '<dt>发布时间</dt><dd>' + esc(t.publishAt) + '</dd>' +
            '<dt>要求完成时间</dt><dd>' + esc(t.due) + '</dd>' +
            '<dt>状态</dt><dd>' + tmpStatusTag(t) + '</dd>' +
            fb +
          '</dl>',
    footer: '<button class="btn" onclick="closeModal()">关闭</button>' +
            (tmpIsMine(t) && t.status === '待接收'
              ? '<button class="btn" onclick="tmpTaskAccept(\'' + t.id + '\')">接收任务</button>' : '') +
            (tmpIsMine(t) && t.status !== '已反馈'
              ? '<button class="btn btn-primary" onclick="tmpTaskFeedback(\'' + t.id + '\')">填写反馈</button>' : '')
  });
}

function tmpTaskAccept(id){
  var t = tmpById(id); if(!t) return;
  if(t.status !== '待接收'){ toast('该任务当前状态为「' + t.status + '」，无需接收', 'info'); return; }
  t.status = '进行中';
  tmpSave();
  toast('已接收任务，状态更新为「进行中」', 'ok');
  if(curPage === 'proj:task') showPage('proj:task');
}

/* 附件取值：只取文件名（原型不做真实上传） */
function tmpFilePick(inputId, showId){
  var el = $(inputId); if(!el || !el.files || !el.files[0]) return;
  var s = $(showId); if(s) s.innerHTML = '<span class="mono">' + esc(el.files[0].name) + '</span>';
}

function tmpTaskFeedback(id){
  var t = tmpById(id); if(!t) return;
  if(t.status === '已反馈'){ toast('该任务已反馈，如需修改请重新发布', 'info'); return; }
  openModal({
    title: '填写反馈 · ' + t.id, width: 660,
    body: '<div class="notice notice-info"><i class="ni">ℹ</i><div>' +
            '反馈提交后状态变为<b>「已反馈」</b>，发布人 <b>' + esc(t.publisher) + '</b> 可在列表中查看反馈内容与附件。' +
          '</div></div>' +
          '<div class="form-grid" style="margin-top:12px">' +
            '<div class="field span2"><label>任务标题</label>' +
              '<div class="ctrl" style="background:var(--bg);border-color:var(--line);color:var(--muted)">' +
              esc(t.title) + '</div></div>' +
            '<div class="field span2"><label>要求完成时间</label>' +
              '<div class="ctrl" style="background:var(--bg);border-color:var(--line);color:var(--muted)">' +
              esc(t.due) + '</div></div>' +
            '<div class="field span2"><label class="req">反馈内容</label>' +
              '<textarea class="ctrl" id="fbText" rows="5" placeholder="说明完成情况、结论或风险点"></textarea></div>' +
            '<div class="field span2"><label>附件</label>' +
              '<input class="ctrl" type="file" id="fbFile" onchange="tmpFilePick(\'fbFile\',\'fbFileTxt\')">' +
              '<div id="fbFileTxt" style="margin-top:5px;font-size:12px" class="muted">' +
              (t.fbFile ? ('<span class="mono">' + esc(t.fbFile) + '</span>') : '未选择文件') + '</div></div>' +
          '</div>',
    footer: '<button class="btn" onclick="closeModal()">取消</button>' +
            '<button class="btn btn-primary" onclick="tmpTaskSaveFeedback(\'' + t.id + '\')">提交反馈</button>'
  });
}
function tmpTaskSaveFeedback(id){
  var t = tmpById(id); if(!t) return;
  var txt = ($('fbText') && $('fbText').value || '').trim();
  if(!txt){ toast('反馈内容必填', 'warn'); return; }
  var f = $('fbFile');
  t.feedback = txt;
  t.fbFile = (f && f.files && f.files[0]) ? f.files[0].name : (t.fbFile || '');
  t.fbAt = nowStr();
  t.status = '已反馈';
  tmpSave();
  closeModal();
  toast('已提交反馈，任务状态更新为「已反馈」', 'ok');
  if(curPage === 'proj:task') showPage('proj:task');
  else if(curPage === 'home') showPage('home');
}

function tmpTaskDel(id){
  var t = tmpById(id); if(!t) return;
  confirmBox('删除临时任务',
    '确定删除任务 <b>' + esc(t.title) + '</b>（' + esc(t.id) + '）吗？<br>' +
    '<span class="muted">删除后执行人首页行动区不再显示该任务，且无法撤销。</span>',
    function(){
      TMP_TASKS = TMP_TASKS.filter(function(x){ return x.id !== id; });
      tmpSave();
      toast('已删除临时任务 ' + id, 'ok');
      if(curPage === 'proj:task') showPage('proj:task');
    }, {okText: '确认删除', danger: true});
}
