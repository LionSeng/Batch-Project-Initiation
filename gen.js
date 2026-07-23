/* Excel 生成逻辑（浏览器/Node 共用）。
   依赖全局 XLSX（SheetJS）。用法：
   const files = buildWorkbooks(global, projects, opts);
   files: [{name, blob/sheet}] 在浏览器用 XLSX.write 导出；Node 测试用 XLSX.writeFile。
*/
(function (root) {
  'use strict';

  const FMT_MONEY = '#,##0.00';
  const FMT_PCT = '0.00%';
  const FMT_DATE = 'yyyy-mm-dd';
  const FMT_TEXT = '@';

  const FILE1_HEADERS = ['项目名称','客户名称','客户性质','项目编号','编号金额','项目金额','预算金额','预算成本率','决算金额','决算成本率','税金','项目毛利','合同归属','归属业务部门','归属业务销售','交付负责人','一级类型','一级标签','主项目类型','子项目类型','申请人'];
  const FILE2_HEADERS = ['项目名称','客户','商务负责人','项目经理','项目金额','预算金额','预算占比'];
  const FILE3_HEADERS = ['项目名称','客户编号','客户简称','客户性质','归属主体','项目开始时间','项目结束时间','项目行业','产品类型','体验主题','收入类型','营销部门','营销组','营销负责人','客户成功部门','客户成功组','客户成功负责人','项目经理','金额','预算金额','供应商名称','P1职位人天','P2职位人天','P3职位人天','P4职位人天','P5职位人天'];

  function cell(v, opts) {
    opts = opts || {};
    const c = {};
    if (opts.f !== undefined) { c.t = 'n'; c.f = opts.f; c.v = v; }
    else if (v instanceof Date) { c.t = 'd'; c.v = v; }
    else if (typeof v === 'number') { c.t = 'n'; c.v = v; }
    else if (typeof v === 'boolean') { c.t = 'b'; c.v = v; }
    else { c.v = v; }
    if (opts.z) c.z = opts.z;
    if (opts.t) c.t = opts.t;
    return c;
  }

  function newSheet(headers) {
    const ws = {};
    headers.forEach((h, ci) => { ws[XLSX.utils.encode_cell({ r: 0, c: ci })] = cell(h, { t: 's' }); });
    if (!ws['!ref']) ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } });
    ws['!cols'] = headers.map(() => ({ wch: 14 }));
    return ws;
  }

  function setRef(ws, nrows, ncols) {
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: nrows, c: ncols - 1 } });
  }

  function pct(n, d) { return d ? n / d : 0; }

  function buildFile1(g, projects) {
    const ws = newSheet(FILE1_HEADERS);
    const n = projects.length;
    projects.forEach((p, i) => {
      const r = i + 1;
      const amt = Number(p.amount) || 0;
      const bud = Number(p.budget) || 0;
      const fin = (p.finalAmount !== '' && p.finalAmount != null) ? Number(p.finalAmount) : bud;
      const tax = amt * 0.1;
      const profit = amt - fin - tax;
      const set = (c, v, o) => { ws[XLSX.utils.encode_cell({ r, c })] = cell(v, o); };
      set(0, p.name, { t: 's' });
      set(1, p.clientName || p.clientShort || '', { t: 's' });
      set(2, p.clientNature, { t: 's', z: FMT_TEXT });
      set(3, p.projCode || '', { t: 's' });
      set(4, amt, { z: FMT_MONEY });
      set(5, amt, { z: FMT_MONEY });
      set(6, bud, { z: FMT_MONEY });
      set(7, pct(bud, amt), { f: `G${r + 1}/E${r + 1}`, z: FMT_PCT });
      set(8, fin, { z: FMT_MONEY });
      set(9, pct(fin, amt), { f: `I${r + 1}/F${r + 1}`, z: FMT_PCT });
      set(10, tax, { f: `F${r + 1}*0.1`, z: FMT_MONEY });
      set(11, profit, { f: `F${r + 1}-I${r + 1}-K${r + 1}`, z: FMT_MONEY });
      set(12, g.contractOwner, { t: 's' });
      set(13, g.bizDept || '', { t: 's' });
      set(14, g.bizSales, { t: 's' });
      set(15, g.deliveryOwner, { t: 's' });
      set(16, g.l1Type, { t: 's' });
      set(17, g.l1Tag, { t: 's' });
      set(18, g.mainType, { t: 's' });
      set(19, g.subType, { t: 's' });
      set(20, g.applicant, { t: 's', z: FMT_TEXT });
    });
    setRef(ws, n, FILE1_HEADERS.length);
    return ws;
  }

  function buildFile2(g, projects) {
    const ws = newSheet(FILE2_HEADERS);
    const n = projects.length;
    projects.forEach((p, i) => {
      const r = i + 1;
      const amt = Number(p.amount) || 0;
      const bud = Number(p.budget) || 0;
      const ratio = amt ? bud / amt : 0;
      const set = (c, v, o) => { ws[XLSX.utils.encode_cell({ r, c })] = cell(v, o); };
      set(0, p.name, { t: 's' });
      set(1, p.clientShort || '', { t: 's' });
      set(2, g.salesManager, { t: 's' });
      set(3, g.projectManager, { t: 's' });
      set(4, amt, { z: FMT_MONEY });
      set(5, bud, { f: `E${r + 1}*G${r + 1}`, z: FMT_MONEY });
      set(6, ratio, { z: FMT_PCT });
    });
    const sumR = n + 1;
    ws[XLSX.utils.encode_cell({ r: sumR, c: 5 })] = cell((function(){let s=0;projects.forEach(p=>s+=(Number(p.budget)||0));return s;})(), { f: `SUM(F2:F${sumR})`, z: FMT_MONEY });
    setRef(ws, sumR, FILE2_HEADERS.length);
    return ws;
  }

  function toDate(s) {
    if (!s) return null;
    if (s instanceof Date) return s;
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
    if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  function buildFile3(g, projects) {
    const ws = newSheet(FILE3_HEADERS);
    const n = projects.length;
    projects.forEach((p, i) => {
      const r = i + 1;
      const amt = Number(p.amount) || 0;
      const bud = Number(p.budget) || 0;
      const sd = toDate(p.startDate), ed = toDate(p.endDate);
      const set = (c, v, o) => { ws[XLSX.utils.encode_cell({ r, c })] = cell(v, o); };
      set(0, p.name, { t: 's' });
      set(1, p.clientCode || '', { t: 's' });
      set(2, p.clientShort || '', { t: 's' });
      set(3, p.clientNature, { t: 's' });
      set(4, g.ownerEntity, { t: 's' });
      set(5, sd, { z: FMT_DATE });
      set(6, ed, { z: FMT_DATE });
      set(7, g.industry, { t: 's' });
      set(8, g.productType, { t: 's' });
      set(9, g.expTheme, { t: 's' });
      set(10, g.revenueType, { t: 's' });
      set(11, g.mktDept, { t: 's' });
      set(12, g.mktGroup, { t: 's' });
      set(13, g.mktOwner, { t: 's' });
      set(14, g.csDept, { t: 's' });
      set(15, g.csGroup, { t: 's' });
      set(16, g.csOwner, { t: 's' });
      set(17, g.projectManager, { t: 's' });
      set(18, amt, { z: FMT_MONEY });
      set(19, bud, { z: FMT_MONEY });
      set(20, g.supplier, { t: 's' });
      set(21, Number(p.p1) || 0, {});
      set(22, Number(p.p2) || 0, {});
      set(23, Number(p.p3) || 0, {});
      set(24, Number(p.p4) || 0, {});
      set(25, Number(p.p5) || 0, {});
    });
    // 下拉校验（复刻模板）
    const last = n; // 数据行 2..n+1 -> r index 1..n
    const sq = (col) => `${XLSX.utils.encode_col(col)}2:${XLSX.utils.encode_col(col)}${n + 1}`;
    ws['!dataValidations'] = [
      { type: 'list', allowBlank: true, sqref: sq(3), formula1: '"新客户,老客户新部门,老客户老部门"' },
      { type: 'list', allowBlank: true, sqref: sq(4), formula1: '"北京数字一百信息技术,北京数字一百市场咨询,天津凯摩一百,霍尔果斯凯摩时代,上海数字一百市场调研,上海动米网络科技有限公司,市场对内"' },
      { type: 'list', allowBlank: true, sqref: sq(7), formula1: '"政府,互联网,科技,金融,消费品,汽车,房地产,医疗,其他"' },
      { type: 'list', allowBlank: true, sqref: sq(8), formula1: '"会议效果,O2O,大数据,AI采集,广告监播,招募,传统个案,MROC,在线个案,API,在线采集,软件,渠道检查,神秘客,白皮书"' },
      { type: 'list', allowBlank: true, sqref: sq(9), formula1: '"客户体验,品牌体验,产品体验,其他体验"' },
      { type: 'list', allowBlank: true, sqref: sq(10), formula1: '"软件-编程收入,线上数据收入,线下数据收入,咨询收入,软件-CEM收入"' }
    ];
    setRef(ws, n, FILE3_HEADERS.length);
    return ws;
  }

  function buildWorkbooks(global, projects, opts) {
    opts = opts || {};
    const files = [];
    if (opts.budget !== false) files.push({ name: 'API预算决算 - 2026.xlsx', ws: buildFile1(global, projects) });
    if (opts.sales !== false) files.push({ name: '批量立项目-销管-模板.xlsx', ws: buildFile2(global, projects) });
    if (opts.project !== false) files.push({ name: '批量立项文件.xlsx', ws: buildFile3(global, projects) });
    return files;
  }

  root.buildWorkbooks = buildWorkbooks;
})(typeof window !== 'undefined' ? window : globalThis);
