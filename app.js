/* 浏览器端：UI 交互 + 调用 buildWorkbooks（来自 gen.js，已内联） */
(function () {
  'use strict';

  /* ---------- 公司归口与分类（每月基本不变） ---------- */
  var DEFAULTS = {
    applicant:      '刘渝',
    salesManager:   '刘渝',
    projectManager: '刘渝',
    contractOwner:  '信息技术',
    bizSales:       '刘渝',
    deliveryOwner:  '刘渝',
    bizDept:        '数据BU',
    l1Type:         '体验',
    l1Tag:          '客户体验',
    mainType:       '在线采集',
    subType:        'API',
    ownerEntity:    '北京数字一百信息技术',
    industry:       '其他',
    productType:    'API',
    expTheme:       '产品体验',
    revenueType:    '线上数据收入',
    mktDept:        '数据BU',
    mktGroup:       '在线数据组',
    mktOwner:       '刘渝',
    csDept:         '数据BU',
    csGroup:        '在线数据组',
    csOwner:        '刘渝',
    supplier:       '在线样本费用'
  };

  var CLIENT_NATURE = ['老客户老部门', '老客户新部门', '新客户'];

  var SAMPLE = [
    { name: 'Dynata（2512）', clientCode: 'CA9e132d19ca1f471da8d3357dfacb0bc9', clientName: 'Dynata', clientShort: 'Dynata', clientNature: '老客户老部门', projCode: 'BKM-2604-SJ003-X295', startDate: '2025-12-01', endDate: '2025-12-31', amount: 23528, budget: 11919.28, finalAmount: 11919.28, p1: 0.5 },
    { name: 'CINT（2511-2601）', clientCode: 'CA15bdb2b4665042eb80b598c87e908f9d', clientName: 'Cint API', clientShort: 'Cint', clientNature: '老客户老部门', projCode: 'BKM-2604-SJ006-X298', startDate: '2025-11-01', endDate: '2026-01-31', amount: 78898.5, budget: 44167.38, finalAmount: 44167.38 }
  ];

  /* ---------- DOM 工具 ---------- */
  function $(id) { return document.getElementById(id); }
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    if (kids) kids.forEach(function (c) { e.appendChild(c); });
    return e;
  }

  /* ---------- ① 全局默认值表单（公司归口与分类） ---------- */
  var GLOBAL_LABELS = {
    applicant: '申请人', salesManager: '商务负责人', projectManager: '项目经理',
    contractOwner: '合同归属', bizSales: '归属业务销售', deliveryOwner: '交付负责人',
    bizDept: '归属业务部门',
    l1Type: '一级类型', l1Tag: '一级标签', mainType: '主项目类型', subType: '子项目类型',
    ownerEntity: '归属主体', industry: '项目行业', productType: '产品类型',
    expTheme: '体验主题', revenueType: '收入类型',
    mktDept: '营销部门', mktGroup: '营销组', mktOwner: '营销负责人',
    csDept: '客户成功部门', csGroup: '客户成功组', csOwner: '客户成功负责人', supplier: '供应商名称'
  };

  function buildGlobalForm() {
    var wrap = $('global-fields');
    Object.keys(DEFAULTS).forEach(function (k) {
      var inp = el('input', { type: 'text', id: 'g_' + k, value: DEFAULTS[k], class: 'gin' });
      var lab = el('label', { for: 'g_' + k }, [document.createTextNode(GLOBAL_LABELS[k] || k)]);
      var box = el('div', { class: 'gitem' }, [lab, inp]);
      wrap.appendChild(box);
    });
  }

  function readGlobal() {
    var g = {};
    Object.keys(DEFAULTS).forEach(function (k) { g[k] = $('g_' + k).value.trim(); });
    return g;
  }

  /* ---------- ② 每行客户选择组（来自 customers.js 内联） ---------- */
  function buildCustPicker(parent, initialCode) {
    var sel = el('select', { class: 'cin cust-picker' });
    sel.appendChild(el('option', { value: '' }, [document.createTextNode('— 选择客户 —')]));
    var list = (typeof CUSTOMERS !== 'undefined') ? CUSTOMERS : [];
    var seen = {};
    list.forEach(function (c) { var k = c.short || c.name; seen[k] = (seen[k] || 0) + 1; });
    list.forEach(function (c) {
      var base = c.short || c.name;
      var label = base + (seen[base] > 1 ? ' · ' + c.code.slice(-6) : '');
      var op = el('option', { value: c.code, title: c.name + '  (' + c.code + ')' }, [document.createTextNode(label)]);
      if (initialCode && c.code === initialCode) op.selected = true;
      sel.appendChild(op);
    });
    parent.appendChild(sel);
    return sel;
  }

  function makeCustRow(data) {
    var wrap = el('div', { class: 'field full' });
    var inner = el('div', { class: 'cust-row' });
    inner.appendChild(el('label', {}, [document.createTextNode('① 选客户（编号自动锁定为客户档案里的唯一编号）')]));

    var grid = el('div', { class: 'cust-grid' });

    // cell 1: picker (无 data-f，真正的编号存在 readonly 输入里)
    var pickCell = el('div', { class: 'cf-cell' });
    pickCell.appendChild(el('span', {}, [document.createTextNode('选择客户')]));
    pickCell.appendChild(buildCustPicker(pickCell, data.clientCode || ''));
    grid.appendChild(pickCell);

    // cell 2: 客户简称
    var shCell = el('div', { class: 'cf-cell' });
    shCell.appendChild(el('span', {}, [document.createTextNode('客户简称')]));
    shCell.appendChild(el('input', { type: 'text', class: 'cin', 'data-f': 'clientShort', value: data.clientShort || '', readonly: 'readonly' }));
    grid.appendChild(shCell);

    // cell 3: 客户全称
    var nmCell = el('div', { class: 'cf-cell' });
    nmCell.appendChild(el('span', {}, [document.createTextNode('客户全称')]));
    nmCell.appendChild(el('input', { type: 'text', class: 'cin', 'data-f': 'clientName', value: data.clientName || '', readonly: 'readonly' }));
    grid.appendChild(nmCell);

    // cell 4: 客户编号（mirror，写入文件用）
    var cdCell = el('div', { class: 'cf-cell' });
    cdCell.appendChild(el('span', {}, [document.createTextNode('客户编号（唯一）')]));
    cdCell.appendChild(el('input', { type: 'text', class: 'cin', 'data-f': 'clientCode', value: data.clientCode || '', readonly: 'readonly' }));
    grid.appendChild(cdCell);

    // cell 5: 客户性质
    var natCell = el('div', { class: 'cf-cell' });
    natCell.appendChild(el('span', {}, [document.createTextNode('客户性质')]));
    var natSel = el('select', { class: 'cin', 'data-f': 'clientNature' });
    CLIENT_NATURE.forEach(function (o) {
      var op = el('option', { value: o }, [document.createTextNode(o)]);
      if ((data.clientNature || '老客户老部门') === o) op.selected = true;
      natSel.appendChild(op);
    });
    natCell.appendChild(natSel);
    grid.appendChild(natCell);

    inner.appendChild(grid);
    wrap.appendChild(inner);
    return wrap;
  }

  function bindCustRow(card) {
    var picker = card.querySelector('.cust-picker');
    if (!picker) return;
    picker.onchange = function () {
      var code = picker.value;
      var codeInp = card.querySelector('[data-f="clientCode"]');
      var shInp = card.querySelector('[data-f="clientShort"]');
      var nmInp = card.querySelector('[data-f="clientName"]');
      if (!code) { if (codeInp) codeInp.value = ''; if (shInp) shInp.value = ''; if (nmInp) nmInp.value = ''; return; }
      var list = (typeof CUSTOMERS !== 'undefined') ? CUSTOMERS : [];
      var c = null;
      for (var i = 0; i < list.length; i++) { if (list[i].code === code) { c = list[i]; break; } }
      if (!c) return;
      if (codeInp) codeInp.value = c.code;
      if (shInp) shInp.value = c.short || c.name;
      if (nmInp) nmInp.value = c.name;
    };
  }

  /* ---------- 项目行（卡片式：顶部客户 + 7 字段 + 5 人天） ---------- */
  var ROW_FIELDS = [
    { f: 'name',        t: 'text',   label: '项目名称',       span: 'full' },
    { f: 'projCode',    t: 'text',   label: '项目编号',       span: 'full' },
    { f: 'startDate',   t: 'date',   label: '开始日期',       span: 'half' },
    { f: 'endDate',     t: 'date',   label: '结束日期',       span: 'half' },
    { f: 'amount',      t: 'number', label: '项目金额（元）', span: 'half', ph: '合同总金额' },
    { f: 'budget',      t: 'number', label: '预算金额（元）', span: 'half', ph: '预算', withRatio: true },
    { f: 'finalAmount', t: 'number', label: '决算金额（元）', span: 'full', ph: '留空则等于预算金额' },
    { f: 'p1', t: 'number', label: 'P1 人天', span: 'compact' },
    { f: 'p2', t: 'number', label: 'P2 人天', span: 'compact' },
    { f: 'p3', t: 'number', label: 'P3 人天', span: 'compact' },
    { f: 'p4', t: 'number', label: 'P4 人天', span: 'compact' },
    { f: 'p5', t: 'number', label: 'P5 人天', span: 'compact' }
  ];

  var COMPACT_FIELDS = ['p1', 'p2', 'p3', 'p4', 'p5'];

  function makeRow(data) {
    data = data || {};
    var card = el('div', { class: 'rowcard' });

    // 顶部：项目名 + 删除
    var head = el('div', { class: 'rowhead' });
    head.appendChild(el('span', { class: 'rownum' }, [document.createTextNode('项目')]));
    var del = el('button', { type: 'button', class: 'btn-del' }, [document.createTextNode('删除此项目')]);
    head.appendChild(del);
    card.appendChild(head);

    // 顶部：每行的客户选择组
    card.appendChild(makeCustRow(data));

    // 字段网格
    var body = el('div', { class: 'rowbody' });
    ROW_FIELDS.forEach(function (c) {
      if (c.span === 'compact') return;
      var f = el('div', { class: 'field ' + c.span });
      f.appendChild(el('label', {}, [document.createTextNode(c.label)]));
      var attrs = { type: c.t, class: 'cin', 'data-f': c.f };
      if (c.ph) attrs.placeholder = c.ph;
      if (data[c.f] !== undefined && data[c.f] !== '') attrs.value = data[c.f];
      var inp = el('input', attrs);
      if (c.withRatio) {
        var wr = el('div', { class: 'inpratio' });
        wr.appendChild(inp);
        var r = el('span', { class: 'ratio' }, [document.createTextNode('—')]);
        wr.appendChild(r);
        f.appendChild(wr);
        card._ratioCell = r;
      } else {
        f.appendChild(inp);
      }
      body.appendChild(f);
    });

    // 紧凑人天
    var pg = el('div', { class: 'field full' });
    pg.appendChild(el('label', {}, [document.createTextNode('人员配置（P1–P5 人天，留空 = 0）')]));
    var group = el('div', { class: 'pgroup' });
    COMPACT_FIELDS.forEach(function (key) {
      var item = el('span', { class: 'pitem' });
      item.appendChild(el('em', {}, [document.createTextNode(key.toUpperCase())]));
      var attrs = { type: 'number', class: 'cin', 'data-f': key, min: '0', step: '0.5' };
      if (data[key] !== undefined && data[key] !== '') attrs.value = data[key];
      else attrs.value = '0';
      item.appendChild(el('input', attrs));
      group.appendChild(item);
    });
    pg.appendChild(group);
    body.appendChild(pg);

    card.appendChild(body);

    // 事件：实时占比
    var amtInp = card.querySelector('[data-f="amount"]');
    var budInp = card.querySelector('[data-f="budget"]');
    var onAmt = function () { recomputeRatio(card); };
    amtInp.oninput = onAmt;
    budInp.oninput = onAmt;

    // 绑定客户下拉联动
    bindCustRow(card);

    // 删除
    del.onclick = function () { card.parentNode.removeChild(card); updateCount(); };

    return card;
  }

  function recomputeRatio(card) {
    if (!card._ratioCell) return;
    var amt = parseFloat(card.querySelector('[data-f="amount"]').value);
    var bud = parseFloat(card.querySelector('[data-f="budget"]').value);
    if (amt > 0 && !isNaN(bud)) {
      card._ratioCell.textContent = (bud / amt * 100).toFixed(2) + '%';
    } else {
      card._ratioCell.textContent = '—';
    }
  }

  function addRow(data) {
    var card = makeRow(data);
    $('rows').appendChild(card);
    recomputeRatio(card);
    updateCount();
    return card;
  }

  function readProjects() {
    var cards = $('rows').querySelectorAll('.rowcard');
    var out = [];
    cards.forEach(function (card) {
      var p = {};
      card.querySelectorAll('[data-f]').forEach(function (inp) {
        var v = inp.value.trim();
        // 防 data-f 重复（如 clientCode 只有一个 input，picker 不带 data-f）；同名 key 后写覆盖，这里只一处
        p[inp.getAttribute('data-f')] = v === '' ? '' : v;
      });
      out.push(p);
    });
    return out;
  }

  function updateCount() {
    $('count').textContent = $('rows').querySelectorAll('.rowcard').length;
  }

  /* ---------- 生成 ---------- */
  function showStatus(msg, isErr) {
    var s = $('status');
    s.textContent = msg;
    s.className = isErr ? 'status err' : 'status ok';
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function stamp() {
    var d = new Date();
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '_' + pad(d.getHours()) + pad(d.getMinutes());
  }

  function downloadBlob(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = el('a', { href: url, download: name });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function generate() {
    var g = readGlobal();
    var projects = readProjects();
    if (projects.length === 0) { showStatus('请至少添加一个项目。', true); return; }

    var errors = [];
    projects.forEach(function (p, i) {
      var n = i + 1;
      if (!p.name) errors.push('第' + n + '行：缺少“项目名称”');
      if (!p.projCode) errors.push('第' + n + '行：缺少“项目编号”');
      if (!p.startDate) errors.push('第' + n + '行：缺少“开始日期”');
      if (!p.endDate) errors.push('第' + n + '行：缺少“结束日期”');
      if (!p.amount || isNaN(parseFloat(p.amount))) errors.push('第' + n + '行：项目金额必须是数字');
      if (!p.budget || isNaN(parseFloat(p.budget))) errors.push('第' + n + '行：预算金额必须是数字');
      if (!p.clientCode) errors.push('第' + n + '行：未选客户（卡片顶部）');
      if (!p.clientNature) errors.push('第' + n + '行：缺少“客户性质”');
    });
    if (errors.length) { showStatus('有错误：\n' + errors.join('\n'), true); return; }

    var opts = {
      budget: $('f_budget').checked,
      sales: $('f_sales').checked,
      project: $('f_project').checked
    };
    if (!opts.budget && !opts.sales && !opts.project) { showStatus('请至少勾选一个要生成的文件。', true); return; }

    try {
      var files = buildWorkbooks(g, projects, opts);
      if (typeof JSZip === 'undefined') { showStatus('压缩库未加载，无法打包，请刷新页面。', true); return; }
      var zip = new JSZip();
      files.forEach(function (f) {
        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, f.ws, 'Sheet1');
        var buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
        zip.file(f.name, buf);
      });
      zip.generateAsync({ type: 'blob' }).then(function (blob) {
        downloadBlob(blob, '批量立项文件_' + stamp() + '.zip');
        showStatus('已生成 ' + files.length + ' 个文件，开始下载压缩包。', false);
      });
    } catch (e) {
      showStatus('生成出错：' + (e && e.message ? e.message : e), true);
    }
  }

  /* ---------- ④ 预览 ---------- */
  function fmtMoney(v) {
    if (v == null || isNaN(v)) return '—';
    return Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function preview() {
    var g = readGlobal();
    var cards = $('rows').querySelectorAll('.rowcard');

    var groups = [
      { label: '基本信息', cols: ['#', '项目名称', '项目编号', '起止日期', '项目金额', '预算金额', '决算金额', '预算占比'] },
      { label: '客户信息', cols: ['客户简称', '客户全称', '客户编号', '客户性质'] },
      { label: '归口人员', cols: ['归属业务部门', '归属主体', '合同归属', '申请人', '项目经理'] },
      { label: '分类类型', cols: ['一级类型', '主项目类型', '子项目类型', '项目行业', '产品类型', '体验主题', '收入类型'] },
      { label: '人天', cols: ['P1~P5'] }
    ];
    var flat = [];
    groups.forEach(function (x) { flat = flat.concat(x.cols); });

    var html = '<thead>';
    html += '<tr>' + groups.map(function (x) {
      return '<th class="gh" colspan="' + x.cols.length + '">' + x.label + '</th>';
    }).join('') + '</tr>';
    html += '<tr>' + flat.map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr>';
    html += '</thead><tbody>';

    if (!cards.length) {
      html += '<tr><td colspan="' + flat.length + '" style="padding:14px;color:#9aa1ab;text-align:center;">暂无项目。先到 ② 添加项目并填好客户与金额。</td></tr>';
    } else {
      cards.forEach(function (card, idx) {
        var p = {};
        card.querySelectorAll('[data-f]').forEach(function (inp) { p[inp.getAttribute('data-f')] = (inp.value || '').trim(); });

        var amt = parseFloat(p.amount) || 0;
        var bud = parseFloat(p.budget) || 0;
        var fin = (p.finalAmount === '' || p.finalAmount == null) ? bud : (parseFloat(p.finalAmount) || 0);
        var ratio = amt > 0 ? (bud / amt * 100) : 0;

        var miss = [];
        if (!p.name) miss.push('name');
        if (!p.projCode) miss.push('code');
        if (!p.startDate || !p.endDate) miss.push('date');
        if (!p.clientCode) miss.push('cust');
        if (!p.clientNature) miss.push('nature');

        var C = function (v, flag) {
          var s = (v == null || v === '') ? '—' : String(v);
          return '<td' + (flag ? ' class="miss"' : '') + '>' + s + '</td>';
        };
        var M = function (v) { return '<td class="money">' + (v > 0 || v === 0 ? fmtMoney(v) : '—') + '</td>'; };
        var pds = [p.p1, p.p2, p.p3, p.p4, p.p5].map(function (x) {
          var n = parseFloat(x);
          return (isNaN(n) || n === 0) ? '·' : String(n);
        }).join(' / ');

        html += '<tr>';
        html += '<td>' + (idx + 1) + '</td>';
        html += C(p.name, miss.indexOf('name') >= 0);
        html += C(p.projCode, miss.indexOf('code') >= 0);
        html += C((p.startDate || '?') + ' ~ ' + (p.endDate || '?'), miss.indexOf('date') >= 0);
        html += M(amt); html += M(bud); html += M(fin);
        html += '<td class="money">' + (ratio > 0 ? ratio.toFixed(2) + '%' : '—') + '</td>';
        html += C(p.clientShort, miss.indexOf('cust') >= 0);
        html += C(p.clientName);
        html += C(p.clientCode, miss.indexOf('cust') >= 0);
        html += C(p.clientNature, miss.indexOf('nature') >= 0);
        html += C(g.bizDept); html += C(g.ownerEntity); html += C(g.contractOwner);
        html += C(g.applicant); html += C(g.projectManager);
        html += C(g.l1Type); html += C(g.mainType); html += C(g.subType);
        html += C(g.industry); html += C(g.productType); html += C(g.expTheme); html += C(g.revenueType);
        html += '<td>' + pds + '</td>';
        html += '</tr>';
      });
    }
    html += '</tbody>';

    $('previewTable').innerHTML = html;
    $('previewCard').style.display = 'block';
    showStatus('预览已更新，共 ' + cards.length + ' 个项目。', false);
    var pv = $('previewCard');
    if (pv && typeof pv.scrollIntoView === 'function') pv.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- 初始化 ---------- */
  function init() {
    buildGlobalForm();
    addRow(); // 起始一行空白
    $('add').onclick = function () { addRow(); };
    $('sample').onclick = function () {
      $('rows').innerHTML = '';
      SAMPLE.forEach(function (p) { addRow(p); });
      showStatus('已填入示例数据（仅供测试，正式申报请改成真实项目）。', false);
    };
    $('clear').onclick = function () {
      $('rows').innerHTML = '';
      updateCount();
      showStatus('已清空项目行。', false);
    };
    $('gen').onclick = generate;
    $('previewBtn').onclick = preview;
    // ① 区折叠/展开
    $('toggle-g').onclick = function () {
      var body = $('global-body');
      var collapsed = body.classList.toggle('collapsed');
      this.textContent = collapsed ? '展开 ▸' : '收起 ▾';
    };
    updateCount();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
