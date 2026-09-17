#!/usr/bin/env bash
# PLM 原型 · 回归自检聚合脚本（并行）
# 用法：
#   bash run_smoke.sh            # 全量 32 个脚本，并行 -P4
#   bash run_smoke.sh rawmat     # 只跑 smoke_rawmat.py
#   bash run_smoke.sh sds doe    # 跑 smoke_sds.py + smoke_doe.py（按关键字匹配）
# 注意：前台运行（后台 shell 会被沙箱拦截 Chrome 写临时文件）
set -u
cd "$(dirname "$0")"
PY=/usr/bin/python3
TS=$(date +%Y%m%d_%H%M%S)
LOGDIR="/tmp/PLM_smoke_$TS"
mkdir -p "$LOGDIR"

# 前置守卫：分片全局符号重名检查（后加载分片会静默覆盖同名函数，详见 check_names.py）
if [ -f check_names.py ]; then
  echo "----- 分片符号重名检查 -----"
  /usr/bin/python3 check_names.py || true
  echo
fi

# 前置守卫：菜单 / 页面注册一致性（孤儿页、菜单指向空页、同名重复注册）
if [ -f check_pages.py ]; then
  echo "----- 菜单 / 页面体检 -----"
  /usr/bin/python3 check_pages.py || true
  echo
fi

if [ $# -eq 0 ]; then
  SCRIPTS=($(ls smoke_*.py | sort))
else
  SCRIPTS=()
  for a in "$@"; do
    for f in $(ls smoke_*${a}*.py 2>/dev/null | sort); do
      SCRIPTS+=("$f")
    done
  done
fi

if [ ${#SCRIPTS[@]} -eq 0 ]; then
  echo "未匹配到 smoke 脚本"; exit 1
fi

echo "待测脚本: ${#SCRIPTS[@]} 个 | 并行度 4 | 日志: $LOGDIR"
# 并行跑，每个脚本退出码写入 .rc，日志写入 .log（rc=0 即通过，不依赖各脚本输出文案）
printf '%s\n' "${SCRIPTS[@]}" | xargs -P 4 -I{} sh -c '/usr/bin/python3 "$1" > "'"$LOGDIR"'/$(basename "$1" .py).log" 2>&1; echo $? > "'"$LOGDIR"'/$(basename "$1" .py).rc"' _ {}

echo "----- 结果汇总 -----"
fail=0
for f in "${SCRIPTS[@]}"; do
  base=$(basename "$f" .py)
  rc=$(cat "$LOGDIR/$base.rc" 2>/dev/null || echo "?")
  tail=$(tail -2 "$LOGDIR/$base.log" 2>/dev/null | tr '\n' ' ')
  if [ "$rc" = "0" ]; then
    printf "%-30s ✅ | %s\n" "$base" "$tail"
  else
    printf "%-30s ❌ rc=%s | %s\n" "$base" "$rc" "$tail"
    fail=$((fail+1))
  fi
done
echo "===== 完成：失败脚本 $fail 个 ====="
[ $fail -eq 0 ] && echo "✅ 全绿" || echo "❌ 有失败，详见 $LOGDIR"
