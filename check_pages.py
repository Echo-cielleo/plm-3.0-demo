#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""菜单 / 页面注册一致性体检
作用：找出三类问题
  1. 菜单项指向不存在的页面（点进去白屏）
  2. 孤儿页：已 regPage 注册，但既不在菜单里、也没有任何跳转入口可达
  3. 同名 regPage 重复注册（后加载者静默覆盖前者，是本项目踩过多次的坑）

用法：
    python3 check_pages.py            # 列出问题
    python3 check_pages.py --all      # 额外列出正常项（排查用）

注意：判定「无入口」时会同时扫描 showPage('x') 与字符串内的 showPage(\\'x\\')，
      以及 openXxx() 类间接调用的间接证据（见 REF_HINT）。删除页面前务必先看
      --all 里的「有入口」清单，别误删（曾经误删过 exp:best）。
"""
import io, os, re, sys

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'src')

# 页面注册：regPage('xxx' / regLawMaintenance('xxx' 等
RE_REG = re.compile(r"\breg[A-Za-z]+\(\s*'([^']+)'")  # regPage / regLawMaintenance 等工厂注册
# 跳转入口：直接调用 + 写在 HTML 字符串里的转义引号形式
RE_SHOW = re.compile(r"showPage\(\s*\\?['\"]([^'\"]+)")
RE_SHOW2 = re.compile(r"go\s*:\s*\\?['\"]([^'\"]+)")          # 卡片/待办的 go 字段
RE_REF_ANY = re.compile(r"['\"](\w+:[a-z0-9\-]+)['\"]")        # 任何页面 key 形态的字面量


def read_all():
    files = sorted(f for f in os.listdir(SRC) if f.endswith('.js'))
    txt = {}
    for f in files:
        txt[f] = io.open(os.path.join(SRC, f), encoding='utf-8').read()
    return txt


def parse_menu(txt):
    """从 22-js-router.js 的 MENU 里取所有 id，区分叶子 / 分组"""
    s = txt.get('22-js-router.js', '')
    a, b = s.find('var MENU=['), s.find('var PRIO_TXT')
    if a < 0:
        return [], []
    seg = s[a:b if b > 0 else len(s)]
    leaves, groups = [], []
    for line in seg.splitlines():
        m = re.search(r"\{id:'([^']+)'", line)
        if not m:
            continue
        # children:[ 在同一行开始 → 分组节点（自身通常也是可点击页面或仅作父节点）
        if 'children:[' in line:
            groups.append(m.group(1))
            continue
        # 无子菜单的一级节点：用 page:'xxx' 指向真实页面（如报表管理 rpt → rpt:home）
        pm = re.search(r"page\s*:\s*'([^']+)'", line)
        leaves.append(pm.group(1) if pm else m.group(1))
    return leaves, groups


def main():
    show_all = '--all' in sys.argv
    txt = read_all()
    joined = '\n'.join(txt.values())

    reg_list = []          # (key, file) 按加载顺序
    for f, s in txt.items():
        for k in RE_REG.findall(s):
            reg_list.append((k, f))
    reg = [k for k, _ in reg_list]
    reg_set = set(reg)

    # 写在 HTML 字符串里的入口形如 showPage(\'x\')，捕获组会把尾部转义符一起吃进来，必须 strip
    refs = set(x.rstrip('\\') for x in RE_SHOW.findall(joined))
    refs |= set(x.rstrip('\\') for x in RE_SHOW2.findall(joined))
    menu_leaves, menu_groups = parse_menu(txt)
    menu_all = set(menu_leaves) | set(menu_groups)

    print('=== 菜单 / 页面体检 ===')
    print('菜单叶子 %d 个 · 分组 %d 个 · 已注册页面 %d 个 · 跳转目标 %d 个'
          % (len(menu_leaves), len(menu_groups), len(reg), len(refs)))

    # ① 菜单项无页面
    miss = [k for k in menu_leaves if k not in reg_set]
    print('\n[1] 菜单项找不到注册页：%s' % (miss if miss else '无 ✅'))
    if miss:
        print('    （若页面由 regXxxPage() 动态注册则属正常，核对后再动）')

    # ② 重复注册（后覆盖前，高危）
    seen, dup = {}, []
    for k, f in reg_list:
        if k in seen:
            dup.append((k, seen[k], f))
        else:
            seen[k] = f
    print('\n[2] 同名重复注册（后加载覆盖前者）：')
    if not dup:
        print('    无 ✅')
    for k, f1, f2 in dup:
        print('    ⚠ %s  %s → 被 %s 覆盖' % (k, f1, f2))

    # ③ 孤儿页
    orphan = [k for k in reg_set
              if k not in menu_all and k not in refs and k not in ('home', 'dev:kit')]
    print('\n[3] 孤儿页（不在菜单 + 无跳转入口，dev:kit 调试页除外）：')
    if not orphan:
        print('    无 ✅')
    for k in orphan:
        f = seen[k]
        # 二次确认：整个源码里有没有出现过这个 key 的其它引用
        other = set(RE_REF_ANY.findall(joined))
        hint = '' if k not in other else '  ⚠ 代码里另有字面量引用，删除前先看上下文'
        print('    · %-18s %s%s' % (k, f, hint))

    # ④ 有入口但不在菜单（详情页类，正常）
    hidden_ok = [k for k in reg_set if k not in menu_all and k in refs]
    print('\n[4] 不在菜单但有入口（详情/向导类，正常）：%d 个' % len(hidden_ok))
    if show_all:
        for k in hidden_ok:
            print('    · %-18s %s' % (k, seen[k]))

    print('\n=== 体检结束 ===')


if __name__ == '__main__':
    main()
