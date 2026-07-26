import pathlib

base = pathlib.Path('.')
tpl = (base / 'template.html').read_text(encoding='utf-8')
sheetjs = (base / 'vendor' / 'xlsx.full.min.js').read_text(encoding='utf-8')
jszip = (base / 'vendor' / 'jszip.min.js').read_text(encoding='utf-8')
customers = (base / 'customers.js').read_text(encoding='utf-8')
picker = (base / 'picker.js').read_text(encoding='utf-8')
gen = (base / 'gen.js').read_text(encoding='utf-8')
app = (base / 'app.js').read_text(encoding='utf-8')


def safe(s):
    # 防止内联 JS 中的 </script> 提前闭合 script 标签
    return s.replace('</script', '<\\/script')


out = tpl
out = out.replace('<!--SHEETJS-->', '<script>\n' + safe(sheetjs) + '\n</script>')
out = out.replace('<!--JSZIP-->', '<script>\n' + safe(jszip) + '\n</script>')
out = out.replace('<!--CUSTOMERS-->', '<script>\n' + safe(customers) + '\n</script>')
out = out.replace('<!--PICKER-->', '<script>\n' + safe(picker) + '\n</script>')
out = out.replace('<!--GEN-->', '<script>\n' + safe(gen) + '\n</script>')
out = out.replace('<!--APP-->', '<script>\n' + safe(app) + '\n</script>')

# 兜底：若仍有未替换的标记，报警
for marker in ['<!--SHEETJS-->', '<!--JSZIP-->', '<!--CUSTOMERS-->', '<!--PICKER-->', '<!--GEN-->', '<!--APP-->']:
    if marker in out:
        raise SystemExit('未替换的标记: ' + marker)

(base / 'index.html').write_text(out, encoding='utf-8')
print('index.html 构建完成，大小', len(out), '字节')
print('库内联检查:',
      'XLSX' in out and 'JSZip' in out and 'buildWorkbooks' in out and 'generate' in out)
