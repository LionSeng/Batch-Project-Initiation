/* 共享：客户搜索组合框（挂载到 body，避免被 Grid 嵌套裁切/遮挡）。
   生成器（index.html）与项目库（library.html）共用本文件，避免重复实现。 */
(function (global) {
  'use strict';

  function buildCustPicker(parent, initialCode) {
    var list = (typeof CUSTOMERS !== 'undefined') ? CUSTOMERS : [];
    var seen = {};
    list.forEach(function (c) { var k = c.short || c.name; seen[k] = (seen[k] || 0) + 1; });

    var wrap = document.createElement('div');
    wrap.className = 'cust-combo';
    var search = document.createElement('input');
    search.type = 'text';
    search.className = 'cin cust-search';
    search.placeholder = '搜索客户简称 / 全称 / 编号…';
    search.autocomplete = 'off';
    // 下拉列表挂到 body，彻底脱离 Grid 嵌套避免被裁切/遮挡
    var ul = document.createElement('ul');
    ul.className = 'cust-list';
    ul.style.display = 'none';
    document.body.appendChild(ul);
    var hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.className = 'cust-picker';
    hidden.value = initialCode || '';
    wrap.appendChild(search);
    wrap.appendChild(hidden);
    parent.appendChild(wrap);

    function positionList() {
      var r = search.getBoundingClientRect();
      ul.style.left = r.left + window.scrollX + 'px';
      ul.style.top = (r.bottom + window.scrollY + 4) + 'px';
      ul.style.width = r.width + 'px';
    }
    function showList() {
      positionList();
      ul.style.display = 'block';
    }
    function hideList() {
      ul.style.display = 'none';
    }

    function labelOf(c) {
      var base = c.short || c.name;
      return base + (seen[base] > 1 ? ' · ' + c.code.slice(-6) : '');
    }
    var active = -1;
    function render(items) {
      ul.innerHTML = '';
      active = -1;
      if (!items.length) {
        var empty = document.createElement('li');
        empty.className = 'cust-empty';
        empty.textContent = '无匹配客户';
        ul.appendChild(empty);
        return;
      }
      items.forEach(function (c) {
        var li = document.createElement('li');
        li.className = 'cust-opt';
        li.setAttribute('data-code', c.code);
        li.title = c.name + '  (' + c.code + ')';
        li.textContent = labelOf(c);
        li.onmousedown = function (e) { e.preventDefault(); select(c); };
        ul.appendChild(li);
      });
    }
    function findCard() {
      var node = wrap;
      while (node && !(node.classList && node.classList.contains('rowcard'))) node = node.parentElement;
      return node;
    }
    function select(c) {
      hidden.value = c.code;
      search.value = labelOf(c);
      hideList();
      var card = findCard();
      if (card) {
        var codeInp = card.querySelector('[data-f="clientCode"]');
        var shInp = card.querySelector('[data-f="clientShort"]');
        var nmInp = card.querySelector('[data-f="clientName"]');
        if (codeInp) codeInp.value = c.code;
        if (shInp) shInp.value = c.short || c.name;
        if (nmInp) nmInp.value = c.name;
      }
    }
    function currentItems() {
      var q = search.value.trim().toLowerCase();
      if (!q) return list.slice();
      return list.filter(function (c) {
        return (c.name && c.name.toLowerCase().indexOf(q) >= 0) ||
               (c.short && c.short.toLowerCase().indexOf(q) >= 0) ||
               (c.code && c.code.toLowerCase().indexOf(q) >= 0);
      });
    }
    search.onfocus = function () { render(currentItems()); showList(); };
    search.oninput = function () { render(currentItems()); showList(); };
    search.onkeydown = function (e) {
      var opts = ul.querySelectorAll('.cust-opt');
      if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, opts.length - 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); }
      else if (e.key === 'Enter') { e.preventDefault(); if (active >= 0 && opts[active]) opts[active].dispatchEvent(new MouseEvent('mousedown')); return; }
      else if (e.key === 'Escape') { hideList(); return; }
      else return;
      opts.forEach(function (o, i) { o.classList.toggle('active', i === active); });
      if (opts[active]) opts[active].scrollIntoView({ block: 'nearest' });
    };
    search.onblur = function () { setTimeout(hideList, 150); };
    // 窗口滚动/缩放时隐藏（防漂移）
    window.addEventListener('scroll', hideList, { passive: true });
    window.addEventListener('resize', hideList, { passive: true });
    if (initialCode) {
      for (var i = 0; i < list.length; i++) { if (list[i].code === initialCode) { search.value = labelOf(list[i]); break; } }
    }
    return hidden;
  }

  global.buildCustPicker = buildCustPicker;
})(window);
