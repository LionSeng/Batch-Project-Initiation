/* 项目库页面逻辑：维护"准备立项的项目"，本地持久化 + JSON 备份。
   与生成器（index.html）共用同一 localStorage 键 bpi_project_library_v1 与同一项目结构，
   因此生成器"从项目库导入"可直接原样回填。 */
(function () {
  'use strict';

  var LIB_KEY = 'bpi_project_library_v1';
  var FIELDS = ['name', 'projCode', 'startDate', 'endDate', 'amount', 'budget', 'finalAmount', 'p1', 'p2', 'p3', 'p4', 'p5'];
  var editingId = null;
  var pickerHidden = null;

  function $(id) { return document.getElementById(id); }
  function findCust(code) {
    if (!code || typeof CUSTOMERS === 'undefined') return null;
    for (var i = 0; i < CUSTOMERS.length; i++) if (CUSTOMERS[i].code === code) return CUSTOMERS[i];
    return null;
  }

  function escHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c];
    });
  }
  function escAttr(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function showStatus(msg, isErr) {
    var s = $('status');
    s.textContent = msg;
    s.className = 'status ' + (isErr ? 'err' : 'ok');
    s.style.display = 'block';
  }

  function libLoad() {
    try { var s = localStorage.getItem(LIB_KEY); return s ? JSON.parse(s) : []; }
    catch (e) { return []; }
  }
  function libSave(arr) {
    try { localStorage.setItem(LIB_KEY, JSON.stringify(arr)); return true; }
    catch (e) { showStatus('保存失败（浏览器存储不可用或已满）：' + (e && e.message ? e.message : e), true); return false; }
  }
  function libUid() { return 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7); }

  /* 客户组合框：每次重建前清掉上一次的 ul，避免 body 堆积孤儿节点 */
  function buildPicker(initialCode) {
    var olds = document.querySelectorAll('.cust-list');
    Array.prototype.forEach.call(olds, function (u) { if (u.parentNode) u.parentNode.removeChild(u); });
    var slot = $('custSlot');
    slot.innerHTML = '';
    pickerHidden = window.buildCustPicker(slot, initialCode || '');
    syncClient();
    new MutationObserver(syncClient).observe(pickerHidden, { attributes: true, attributeFilter: ['value'] });
    return pickerHidden;
  }
  function syncClient() {
    var code = pickerHidden ? pickerHidden.value : '';
    var c = findCust(code);
    $('f_clientShort').value = c ? (c.short || c.name) : '';
    $('f_clientName').value = c ? c.name : '';
    $('f_clientCode').value = code;
  }

  function readForm() {
    var obj = {};
    FIELDS.forEach(function (k) { obj[k] = $('f_' + k).value.trim(); });
    obj.clientNature = $('f_clientNature').value;
    var code = pickerHidden ? pickerHidden.value : '';
    obj.clientCode = code || '';
    var c = findCust(code);
    obj.clientShort = c ? (c.short || c.name) : $('f_clientShort').value.trim();
    obj.clientName = c ? c.name : $('f_clientName').value.trim();
    return obj;
  }

  function fillForm(proj) {
    FIELDS.forEach(function (k) {
      var v = proj[k];
      $('f_' + k).value = (v == null ? '' : v);
      if (k.indexOf('p') === 0 && !v) $('f_' + k).value = '0';
    });
    $('f_clientNature').value = proj.clientNature || '老客户老部门';
    $('f_clientShort').value = proj.clientShort || '';
    $('f_clientName').value = proj.clientName || '';
    $('f_clientCode').value = proj.clientCode || '';
    editingId = proj.id || null;
    buildPicker(proj.clientCode || '');
    $('formTitle').textContent = '编辑项目';
    $('cancelEdit').style.display = '';
    $('saveProj').textContent = '保存修改';
  }

  function resetForm() {
    ['name', 'projCode', 'startDate', 'endDate', 'amount', 'budget', 'finalAmount'].forEach(function (k) { $('f_' + k).value = ''; });
    ['p1', 'p2', 'p3', 'p4', 'p5'].forEach(function (k) { $('f_' + k).value = '0'; });
    $('f_clientNature').value = '老客户老部门';
    $('f_clientShort').value = '';
    $('f_clientName').value = '';
    $('f_clientCode').value = '';
    editingId = null;
    buildPicker('');
    $('formTitle').textContent = '添加项目';
    $('cancelEdit').style.display = 'none';
    $('saveProj').textContent = '保存项目';
  }

  function onSave() {
    var obj = readForm();
    if (!obj.name && !obj.clientCode) { showStatus('请至少填写「项目名称」或选择一个客户。', true); return; }
    var wasEdit = !!editingId;
    var arr = libLoad();
    if (wasEdit) {
      for (var i = 0; i < arr.length; i++) {
        if (arr[i].id === editingId) { obj.id = editingId; obj.savedAt = arr[i].savedAt; arr[i] = obj; break; }
      }
    } else {
      obj.id = libUid();
      obj.savedAt = new Date().toISOString();
      arr.push(obj);
    }
    libSave(arr);
    renderList();
    resetForm();
    showStatus(wasEdit ? '已保存修改。' : '已添加到项目库。', false);
  }

  function editProj(id) {
    var arr = libLoad();
    for (var i = 0; i < arr.length; i++) if (arr[i].id === id) { fillForm(arr[i]); break; }
    $('formTitle').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function deleteProj(id) {
    var arr = libLoad().filter(function (x) { return x.id !== id; });
    libSave(arr);
    renderList();
    showStatus('已删除 1 个项目。', false);
  }

  function renderList() {
    var arr = libLoad();
    $('libMeta').textContent = '共 ' + arr.length + ' 个项目';
    var tbl = $('libTable');
    if (!arr.length) {
      tbl.innerHTML = '<tbody><tr><td class="lib-empty">项目库为空。在上方添加待立项项目。</td></tr></tbody>';
      return;
    }
    var head = '<thead><tr><th style="width:34px;"></th><th>项目名称</th><th>客户</th><th>金额</th><th>起止日期</th><th>项目编号</th><th style="width:120px;">操作</th></tr></thead>';
    var body = '<tbody>';
    arr.forEach(function (x) {
      var amt = (x.amount && !isNaN(parseFloat(x.amount)))
        ? Number(x.amount).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
      body += '<tr>';
      body += '<td><input type="checkbox" class="row-chk" data-id="' + escAttr(x.id) + '"></td>';
      body += '<td>' + escHtml(x.name || '—') + '</td>';
      body += '<td>' + escHtml(x.clientShort || x.clientName || '—') + '</td>';
      body += '<td class="money">' + amt + '</td>';
      body += '<td>' + escHtml(x.startDate || '?') + ' ~ ' + escHtml(x.endDate || '?') + '</td>';
      body += '<td>' + escHtml(x.projCode || '—') + '</td>';
      body += '<td><button type="button" class="btn-edit" data-id="' + escAttr(x.id) + '">编辑</button><button type="button" class="btn-del" data-id="' + escAttr(x.id) + '">删除</button></td>';
      body += '</tr>';
    });
    body += '</tbody>';
    tbl.innerHTML = head + body;
    tbl.querySelectorAll('.btn-edit').forEach(function (b) { b.onclick = function () { editProj(b.getAttribute('data-id')); }; });
    tbl.querySelectorAll('.btn-del').forEach(function (b) { b.onclick = function () { deleteProj(b.getAttribute('data-id')); }; });
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function stamp() {
    var d = new Date();
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '_' + pad(d.getHours()) + pad(d.getMinutes());
  }
  function downloadBlob(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function exportJson() {
    var arr = libLoad();
    var blob = new Blob([JSON.stringify(arr, null, 2)], { type: 'application/json' });
    downloadBlob(blob, '项目库_' + stamp() + '.json');
    showStatus('已导出 ' + arr.length + ' 个项目到 JSON 文件。', false);
  }

  function importJson(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var incoming = JSON.parse(reader.result);
        if (!Array.isArray(incoming)) throw new Error('JSON 根节点不是数组');
        var arr = libLoad();
        var existed = {}; arr.forEach(function (x) { existed[x.id] = true; });
        var added = 0, merged = 0;
        incoming.forEach(function (it) {
          if (!it || typeof it !== 'object') return;
          if (!it.id) it.id = libUid();
          if (existed[it.id]) merged++; else { arr.push(it); existed[it.id] = true; added++; }
        });
        libSave(arr); renderList();
        showStatus('导入完成：新增 ' + added + ' 个，相同 ID 跳过 ' + merged + ' 个。', false);
      } catch (e) {
        showStatus('导入失败：' + (e && e.message ? e.message : e), true);
      }
    };
    reader.readAsText(file);
  }

  function init() {
    buildPicker('');
    renderList();
    $('saveProj').onclick = onSave;
    $('cancelEdit').onclick = resetForm;
    $('btnExport').onclick = exportJson;
    $('btnImport').onclick = function () { $('fileImport').click(); };
    $('fileImport').onchange = function () {
      if (this.files && this.files[0]) importJson(this.files[0]);
      this.value = '';
    };
    $('selAll').onchange = function () {
      var v = this.checked;
      $('libTable').querySelectorAll('.row-chk').forEach(function (cb) { cb.checked = v; });
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
