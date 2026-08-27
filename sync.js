/* BPI Cloud Sync Layer —— 资料库 page SDK 接入
 *
 * 在线（资料库 page 注入 window.__SMART_PAGE__.database）时：
 *   - 打开页面：把资料库里的「进行中项目库」和「历史归档库」分别拉到各自 localStorage（云优先）
 *   - 改动保存：把两个库分别增量同步回资料库（新增/更新/删除）
 * 本地（file:// 或 localhost，没有 SDK）时：本文件完全不介入，行为与原版一致。
 *
 * 两张表独立，互不影响：
 *   进行中项目库  -> Bi8IagLwm9at72lkrajE1P (bpi_project_library_v1)  19 列
 *   历史归档库    -> QXICki3hl3o0Z6a5vAu50A (bpi_archive_v1)          20 列（多「归档时间」）
 */

(function () {
  'use strict';

  var LIB_DB_ID = 'Bi8IagLwm9at72lkrajE1P';
  var ARCHIVE_DB_ID = 'QXICki3hl3o0Z6a5vAu50A';
  var LIB_KEY = 'bpi_project_library_v1';
  var ARCHIVE_KEY = 'bpi_archive_v1';

  // app 字段(英文) -> 资料库列名(中文)
  var PDAYS = ['p1', 'p2', 'p3', 'p4', 'p5'];

  function isCloud() {
    return !!(window.__SMART_PAGE__ && window.__SMART_PAGE__.database);
  }
  function db() { return window.__SMART_PAGE__.database; }

  // 公共字段映射（app 项目对象 -> 资料库 properties，键必须是中文列名）
  function commonProps(p) {
    var props = {};
    props['项目名称'] = { text: p.name || '' };
    props['项目编号'] = { text: p.projCode || '' };
    props['客户名称'] = { text: p.clientName || '' };
    props['客户简称'] = { text: p.clientShort || '' };
    props['客户编号'] = { text: p.clientCode || '' };
    props['客户性质'] = { select: p.clientNature || '老客户老部门' };
    props['开始日期'] = { text: p.startDate || '' };
    props['结束日期'] = { text: p.endDate || '' };
    props['金额'] = { currency: Number(p.amount) || 0 };
    props['预算'] = { currency: Number(p.budget) || 0 };
    props['成本率'] = { text: (p.costRate == null ? '' : String(p.costRate)) };
    props['决算金额'] = { text: (p.finalAmount == null ? '' : String(p.finalAmount)) };
    PDAYS.forEach(function (k) { props[k.toUpperCase() + '人天'] = { number: Number(p[k]) || 0 }; });
    return props;
  }

  function toDB(p, withArchive) {
    var props = commonProps(p);
    props['记录ID'] = { text: p.id || '' };
    props['保存时间'] = { text: p.savedAt || new Date().toISOString() };
    if (withArchive) {
      props['归档时间'] = { text: p.archivedAt ? new Date(p.archivedAt).toISOString() : '' };
    }
    return props;
  }

  // 公共字段映射（资料库记录 -> app 项目对象）
  function commonFrom(rec) {
    var p = {};
    p.name = rec['项目名称'] || '';
    p.projCode = rec['项目编号'] || '';
    p.clientName = rec['客户名称'] || '';
    p.clientShort = rec['客户简称'] || '';
    p.clientCode = rec['客户编号'] || '';
    p.clientNature = rec['客户性质'] || '老客户老部门';
    p.startDate = rec['开始日期'] || '';
    p.endDate = rec['结束日期'] || '';
    p.amount = rec['金额'] != null ? String(rec['金额']) : '';
    p.budget = rec['预算'] != null ? String(rec['预算']) : '';
    p.costRate = rec['成本率'] != null ? String(rec['成本率']) : '';
    p.finalAmount = rec['决算金额'] != null ? String(rec['决算金额']) : '';
    PDAYS.forEach(function (k) { p[k] = rec[k.toUpperCase() + '人天'] != null ? String(rec[k.toUpperCase() + '人天']) : '0'; });
    return p;
  }

  function fromDB(rec, withArchive) {
    var p = commonFrom(rec);
    if (withArchive) {
      p.archivedAt = rec['归档时间'] ? (Date.parse(rec['归档时间']) || 0) : 0;
    }
    p.id = rec['记录ID'] || '';
    p.savedAt = rec['保存时间'] || '';
    p._rid = rec._id || '';
    return p;
  }

  function newIdOf(r) {
    if (!r) return '';
    return r.id || (r.result && (r.result._id || r.result.id)) || '';
  }

  // 拉取某张表 -> 写回对应 localStorage（云优先；云端为空或失败则不动本地）
  function pullKey(dbId, key, withArchive) {
    if (!isCloud()) return Promise.resolve(false);
    return db().query({ databaseId: dbId, pageSize: 200 }).then(function (res) {
      var recs = (res && res.results) || [];
      if (!recs.length) return false;
      var arr = recs.map(function (r) { return fromDB(r, withArchive); });
      try { localStorage.setItem(key, JSON.stringify(arr)); } catch (e) {}
      return true;
    }).catch(function () { return false; });
  }

  function pullToLocal() {
    if (!isCloud()) return Promise.resolve(false);
    return Promise.all([
      pullKey(LIB_DB_ID, LIB_KEY, false),
      pullKey(ARCHIVE_DB_ID, ARCHIVE_KEY, true)
    ]).then(function (r) { return !!(r[0] || r[1]); });
  }

  // 推送某 localStorage -> 对应资料库（增量 upsert / delete），fire-and-forget
  // 删除基线 = 云端当前全表 record id（首次 push 前先 query 一次），
  // 否则「先删本地、后首次 push」的场景（如生成器立项后归档）会漏删云端记录。
  var knownRids = { lib: {}, arc: {} };
  var pending = { lib: {}, arc: {} };
  var pushChains = { lib: Promise.resolve(), arc: Promise.resolve() };
  var knownReady = { lib: false, arc: false };

  function ensureKnown(dbId, bucket) {
    if (knownReady[bucket]) return Promise.resolve(knownRids[bucket]);
    knownReady[bucket] = true; // 只发起一次；失败则退化为「本轮不做删除」，下轮重试
    return db().query({ databaseId: dbId, pageSize: 200 }).then(function (res) {
      var recs = (res && res.results) || [];
      var known = {};
      recs.forEach(function (r) { if (r && r._id) known[r._id] = true; });
      knownRids[bucket] = known;
      return known;
    }).catch(function () {
      knownRids[bucket] = {}; // 拉取失败：不删任何云端记录（宁可残留、不误删）
      return knownRids[bucket];
    });
  }

  function pushKey(dbId, key, withArchive, bucket) {
    if (!isCloud()) return;
    pushChains[bucket] = pushChains[bucket].then(function () {
      return ensureKnown(dbId, bucket);
    }).then(function (known) {
      var arr;
      try { arr = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { arr = []; }

      var curRids = {};
      arr.forEach(function (p) { if (p._rid) curRids[p._rid] = true; });

      // 删除：云端基线里有、本地已没有的记录
      Object.keys(known).forEach(function (rid) {
        if (!curRids[rid]) {
          db().deleteRecord({ databaseId: dbId, recordId: rid }).catch(function () {});
        }
      });

      // 新增 / 更新
      arr.forEach(function (p) {
        var props = toDB(p, withArchive);
        if (p._rid) {
          db().updateRecord({ databaseId: dbId, recordId: p._rid, properties: props }).catch(function () {});
        } else if (!pending[bucket][p.id]) {
          pending[bucket][p.id] = true;
          db().addRecord({ databaseId: dbId, properties: props }).then(function (r) {
            var nid = newIdOf(r);
            if (nid) {
              p._rid = nid;
              knownRids[bucket][nid] = true;
              try {
                var cur = JSON.parse(localStorage.getItem(key) || '[]');
                for (var i = 0; i < cur.length; i++) { if (cur[i].id === p.id) { cur[i]._rid = nid; break; } }
                localStorage.setItem(key, JSON.stringify(cur));
              } catch (e) {}
            }
            pending[bucket][p.id] = false;
          }).catch(function () { pending[bucket][p.id] = false; });
        }
      });

      knownRids[bucket] = curRids;
    }).catch(function () {});
  }

  function pushLibrary() { pushKey(LIB_DB_ID, LIB_KEY, false, 'lib'); }
  function pushArchive() { pushKey(ARCHIVE_DB_ID, ARCHIVE_KEY, true, 'arc'); }

  window.BPISync = {
    isCloud: isCloud,
    pullToLocal: pullToLocal,
    pushLibrary: pushLibrary,
    pushArchive: pushArchive
  };
})();
