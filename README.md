# 批量立项文件生成器

一个**离线**的网页应用：填表 → 浏览器端直接生成 3 个 Excel 立项文件并打包下载，无需联网、无需服务器。

适用于每月月底批量申报执行额 / 立项时，把繁琐的手工填表变成「选 + 填」。

## 两个独立页面（工作流顺序）

整个工具分两个独立页面，**通过浏览器 localStorage 共享同一份「项目库」数据**（键 `bpi_project_library_v1`）：

1. **`library.html` —— ① 项目库（准备立项的项目）**：平时把每个月要立项的项目存进来（含客户、金额、起止、人天），可编辑/删除、导出/导入 JSON 备份。这是**数据源**，优先级第一。
2. **`index.html` —— ② 批量立项文件生成器**：点「从项目库导入…」勾选要立项的项目，一键载入 ② 区，检查后生成文件。生成器是项目库的**消费者**，不回写项目库。

> ③ 历史项目库（立项完成后的归档）为待建项，后续扩展。

## 直接用法

双击打开 `library.html` 先维护项目；再到 `index.html` 引用生成（推荐 Chrome / Edge）。

**`index.html` 内：**
1. **① 固定信息**：公司归口字段已预填，可折叠，一般每月只改一次。
2. **② 每个项目**：点「+ 添加项目」加一行，或点「从项目库导入…」勾选项目载入。每行顶部选客户（自动带出编号/名称/简称，编号唯一只读），再填项目名称、起止日期、项目金额、预算金额、决算金额。预算占比自动算；决算金额留空 = 等于预算。
   - 注：**项目编号只在生成「API预算决算」时需要**（立项时还没有编号，故仅勾选该文件时才校验必填）。
3. **④ 预览**：点「预览」可展开所有要写入的字段，缺项标红，确认无误再生成。
4. **③ 生成并下载**：得到 `批量立项文件_时间戳.zip`，解压后是 3 个 xlsx，直接上传公司系统。

生成的 3 个文件：
- `API预算决算 - 2026.xlsx`（21 列，含预算成本率/税金/毛利公式）
- `批量立项目-销管-模板.xlsx`（7 列，预算金额 = 金额 × 占比、末行合计）
- `批量立项文件.xlsx`（26 列，客户性质/行业/产品类型等下拉校验、P1–P5 人天）

## 源码结构

- `template.html` + `gen.js` + `app.js` + `picker.js` + `customers.js` + `vendor/` → 内联进自包含的 `index.html`（生成器）
- `library.html` + `library.js` + `picker.js` + `customers.js` → 项目库独立页面（`picker.js` 为两个页面**共用**的客户搜索组件，避免重复实现）
- `gen.js`：纯生成逻辑（与 DOM 解耦，可被 Node 单测）

## 重新构建（改了生成器源码后）

```bash
python build_html.py
```

会把 `template.html` + `gen.js` + `app.js` + `picker.js` + `customers.js` + `vendor/` 重新内联进单一 `index.html`。
`library.html` 为独立页面，直接编辑 `library.html` / `library.js` 即可，无需构建。
更新客户列表时，重新用客户档案表生成 `customers.js` 再构建。

## 部署到 Netlify（静态站点）

本仓库是纯静态站点，`index.html` 已自包含（库已内联）；`library.html` 与其同目录引用 `picker.js` / `library.js` / `customers.js`。

在 Netlify 中连接此 GitHub 仓库后：
- **Build command**：`python build_html.py`（从源码重建 `index.html`）
- **Publish directory**：`.`（仓库根目录）
- 分支：`main`

推送代码即自动触发 Netlify 重新部署。
