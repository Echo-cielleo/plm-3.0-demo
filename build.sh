#!/bin/sh
# ============================================================
# PLM 3.0 全系统演示原型 — 构建脚本
# 把 src/ 下的分片按序拼接为单文件 HTML
# 用法: sh build.sh
# ============================================================
set -e
cd "$(dirname "$0")"

OUT="PLM3.0全系统演示原型.html"
SRC="src"

echo "==> 构建 $OUT"

# 1) head
cat "$SRC/00-head.html" > "$OUT"

# 2) CSS
printf '<style>\n' >> "$OUT"
cat "$SRC/01-css-token.css" >> "$OUT"
cat "$SRC/02-css-comp.css"  >> "$OUT"
cat "$SRC/02z-css-home-bento.css" >> "$OUT"
cat "$SRC/03-css-mod.css"   >> "$OUT"
cat "$SRC/03z-css-exp-ai.css" >> "$OUT"
cat "$SRC/03z2-css-exp-ana.css" >> "$OUT"
cat "$SRC/04-css-sds.css"   >> "$OUT"
cat "$SRC/05-css-phys.css"  >> "$OUT"
cat "$SRC/05z-css-weekly.css" >> "$OUT"
cat "$SRC/05z2-css-catalog.css" >> "$OUT"
cat "$SRC/06z-css-navtools.css" >> "$OUT"
cat "$SRC/06z2-css-phys-range.css" >> "$OUT"
cat "$SRC/06z3-css-clp.css" >> "$OUT"
cat "$SRC/06z3a-css-clp-import.css" >> "$OUT"
cat "$SRC/06z4-css-reach.css" >> "$OUT"
cat "$SRC/06z5-css-oel.css" >> "$OUT"
printf '\n</style>\n</head>\n<body>\n' >> "$OUT"

# 3) HTML 骨架
cat "$SRC/10-shell.html" >> "$OUT"

# 4) ECharts 内联（必须转义 </script>，否则提前闭合标签导致白屏）
if [ -f "$SRC/vendor/echarts.min.js" ]; then
  printf '<script>/* ===== ECharts 5.x (Apache-2.0) inlined ===== */\n' >> "$OUT"
  sed 's|</script>|<\\/script>|g' "$SRC/vendor/echarts.min.js" >> "$OUT"
  printf '\n</script>\n' >> "$OUT"
  echo "    + echarts.min.js ($(wc -c < "$SRC/vendor/echarts.min.js") bytes)"
else
  echo "    ! 缺少 $SRC/vendor/echarts.min.js，跳过（图表将不可用）"
fi

# 5) 业务 JS（按文件名顺序）
for f in "$SRC"/2*.js; do
  [ -f "$f" ] || continue
  printf '<script>\n' >> "$OUT"
  cat "$f" >> "$OUT"
  printf '\n</script>\n' >> "$OUT"
  echo "    + $(basename "$f")"
done

printf '</body>\n</html>\n' >> "$OUT"

# 6) 校验：script 标签配平
OPEN=$(grep -o '<script' "$OUT" | wc -l | tr -d ' ')
CLOSE=$(grep -o '</script>' "$OUT" | wc -l | tr -d ' ')
if [ "$OPEN" != "$CLOSE" ]; then
  echo "!! 错误：<script>($OPEN) 与 </script>($CLOSE) 数量不配平"
  exit 1
fi

echo "==> 完成：$(wc -c < "$OUT") bytes / $(wc -l < "$OUT") 行 / script 标签配平 ${OPEN}:${CLOSE}"
