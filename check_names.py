#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""分片全局符号重名检查（新增分片前后都建议跑一次）

为什么需要它：
    build.sh 把所有 src/2*.js 按文件名顺序拼成**同一个作用域**的单文件，
    后加载的分片会**静默覆盖**先加载分片的同名函数/变量，不报错、不提示。
    典型事故：新增分片里写了 physVal()，覆盖了 23z3-js-sds-sections.js 的
    physVal(p)，导致 SDS 第 9 章理化表整表渲染成 [object Object]，
    而两个分片单独的 node --check 都是通过的。

用法：
    python3 check_names.py            # 全量检查，exit 1 表示有重名
    python3 check_names.py 27z1 27z2  # 只检查文件名含这些关键字的分片
"""
import re
import sys
import glob
import os
import collections

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'src')
# 匹配「行首的 var x = ...」与「行首的 function x(...)」两种全局定义
DEF = re.compile(r'^(?:var|function)\s+([A-Za-z_$][A-Za-z0-9_$]*)', re.M)
# 只关心业务分片（2 开头），跳过 vendor 与 html/css
PATTERN = '2*.js'

# 已知的「有意覆盖」：早期轮次刻意用新分片替换旧分片同名函数的既有设计，
# 不是缺陷，不再报警。（新增分片若需覆盖旧实现，也请在此登记并写明原因）
KNOWN_OVERRIDES = {
    # 23y-js-law-query 重写 23-js-sds 里的法规页渲染
    'lawRender': '23y-js-law-query.js',
    'renderLawPage': '23y-js-law-query.js',
    'lawFinish': '23y-js-law-query.js',
    # 24z4 重写 23-js-sds 的 AI 问答入口
    'aiAsk': '24z4-js-exp-ai-analysis.js',
    # 24z1 重写 23z1 的重置二次确认（改为实验重构版文案）
    'wzResetConfirm': '24z1-js-exp-restructure.js',
    # 24z5 重写 24z4 的 AI 入口：改为两步选择（实验 + 参数）+ 可选统计工具
    'openSumAI': '24z5-js-exp-analysis2.js',
    'openSumReport': '24z5-js-exp-analysis2.js',
}


def collect():
    owners = collections.defaultdict(list)
    for f in sorted(glob.glob(os.path.join(SRC, PATTERN))):
        if os.path.isdir(f):
            continue
        try:
            src = open(f, encoding='utf-8').read()
        except OSError:
            continue
        for name in DEF.findall(src):
            owners[name].append(os.path.basename(f))
    return owners


def main(argv):
    only = argv[1:]
    owners = collect()
    dups = []
    known = 0
    for name, files in sorted(owners.items()):
        if len(files) < 2:
            continue
        if only and not any(any(k in f for k in only) for f in files):
            continue
        if KNOWN_OVERRIDES.get(name) == files[-1]:
            known += 1
            continue
        dups.append((name, files))

    if not dups:
        print('OK: 未发现新增的跨分片重名（检查 %d 个全局符号，已知有意覆盖 %d 处）'
              % (len(owners), known))
        return 0

    print('!! 发现 %d 处**新增**的跨分片重复定义（后加载者生效，先加载者被静默覆盖）：' % len(dups))
    for name, files in dups:
        print('   %-22s %s   → 生效：%s' % (name, ' , '.join(files), files[-1]))
    print('\n处理建议：给新分片的符号加业务前缀（如 physProdVal / physTplOf）；'
          '若确为有意覆盖，请登记到 check_names.py 的 KNOWN_OVERRIDES。')
    return 1


if __name__ == '__main__':
    sys.exit(main(sys.argv))
