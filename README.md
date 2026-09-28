# PLM 3.0 Demo Prototype

面向皮革化工企业研发协同场景的 PLM 3.0 单文件演示原型，覆盖研发项目、实验管理、基础数据、合规管理、SDS 编制、文档管理等模块。

> 本仓库用于产品设计与业务演示。页面中的企业、人员、物料、法规版本、实验及业务数据均为 mock / 示例数据，不应作为真实生产、法律或合规判断依据。

## 快速体验

直接用浏览器打开根目录中的 `PLM3.0全系统演示原型.html`。原型为单文件、零服务端依赖，交互数据主要保存在浏览器 `localStorage`。

## 开发与构建

源码按功能拆分在 `src/`，根目录 HTML 是构建产物，请勿直接编辑。

```bash
bash build.sh
```

构建脚本会按约定顺序合并 HTML、CSS、JavaScript 与内置 ECharts，并检查 `<script>` 标签是否配平。

## 验证

运行全量 smoke：

```bash
bash run_smoke.sh
```

也可以按模块运行，例如：

```bash
python3 smoke_sds.py
python3 smoke_clp.py
python3 smoke_reach.py
python3 smoke_oel.py
```

浏览器交互测试依赖本机可用的 Playwright / Chromium 环境。

## 给协作者

开始工作前请先阅读：

1. `续接指南.md`：当前实现、代码组织、重要产品决定与验证方式。
2. `SDS缺失项清单.md`：SDS 模块与真实文档结构的差距分析。
3. `design-qa.md`：原型设计与质量检查记录。

代码修改约定：

- 先检查 `git status`，保留其他协作者的未提交改动。
- 修改 `src/` 后运行 `bash build.sh`，提交同步生成的根目录 HTML。
- JavaScript 分片至少运行一次 `node --check <文件>`。
- 按受影响模块运行对应 smoke；涉及公共能力时运行 `bash run_smoke.sh`。
- 原型能力与规划能力要明确区分，不把 mock 数据或静态结论表述成真实自动计算结果。

### ChatGPT 网页协作

`integrations/github-mcp-server/` 提供仅针对本仓库的 GitHub MCP Server，包含仓库/代码读取及 Issue 创建、更新、评论工具，支持本地 STDIO 和带鉴权的 Streamable HTTP；详细步骤见该目录的说明。

`integrations/chatgpt-github/` 保留为 GPT Action 方案，适用于不接 MCP 的客户端。

## 当前合规管理主线

CLP 法规库与 SDS 分类演示链路已经建立；REACH、OEL 和国内法规有维护或查询演示页面。法规统一查询仅覆盖当前接入的示例数据；法规版本差异、影响分析及部分导入结果为预置示例。运输法规库仍是规划占位页，SDS 第 14 章由法规 / EHS 人员人工填写并确认，尚无自动运输分类。下一阶段需统一法规数据来源、核实各名单与限值的真实取数链路，并建立运输法规数据和规则。

## 许可

本仓库暂未附加开源许可证。未经权利人另行授权，公开可见不等同于授予复制、修改或再分发许可。
