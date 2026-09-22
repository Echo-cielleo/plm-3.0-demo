# ChatGPT ↔ PLM GitHub Issue 协作

这个目录提供一份范围固定的 GPT Action 定义，让网页 ChatGPT 只操作仓库 `Echo-cielleo/plm-3.0-demo` 的 Issues。

支持的动作：

- 查询 Issue 列表与详情
- 读取 Issue 评论
- 创建 Issue
- 回复 Issue
- 更新标题、正文、标签和打开/关闭状态

不开放源码写入、分支、Pull Request、Release、仓库设置或其他仓库权限。

## 为什么个人 Pro 使用 GPT Action

OpenAI 当前只向 Business、Enterprise/Edu 开放带写操作的完整 MCP。个人 Pro 的自定义 MCP 只能读取和检索。因此这里使用 GPT Action 直接调用 GitHub REST API；它能实现相同的 Issue 协作目标。使用 Action 时不能选择 ChatGPT 的 Pro mode，需要选择支持 Actions 的普通模型。

以后如果工作区升级到支持完整 MCP，可以继续保留本文件定义的 6 个动作语义，只把接入层替换为 MCP。

## 1. 创建最小权限 GitHub Token

在 GitHub 打开 **Settings → Developer settings → Personal access tokens → Fine-grained tokens**，创建一个仅限此仓库的 Token：

- Resource owner：`Echo-cielleo`
- Repository access：Only select repositories → `plm-3.0-demo`
- Repository permissions：
  - Issues：Read and write
  - Metadata：Read-only
- 建议设置较短的有效期，到期后重新生成

不要把 Token 写入本仓库、GPT 指令或对话消息。

## 2. 在网页 ChatGPT 创建 Action

1. 打开自己的 GPT 编辑器，进入 **Configure → Actions → Create new action**。
2. Authentication 选择 **API Key**。
3. Auth Type 选择 **Bearer**，把上一步 Token 填入密钥框。
4. 将 `openapi.yaml` 的全部内容粘贴到 Schema。
5. 保持 GPT 为 **Only me**，先在 Preview 测试；若以后公开 GPT，需要另外提供隐私政策 URL。
6. 选择支持 Actions 的普通模型，不使用 Pro mode。

## 3. 建议写进 GPT Instructions 的协作规则

```text
你是 PLM 3.0 的产品协作者。GitHub 仓库为 Echo-cielleo/plm-3.0-demo。

讨论阶段先和用户厘清需求，不要创建 Issue。用户明确说“提交 Issue”“交给 Codex”或同等意思后：
1. 先给出最终 Issue 标题与正文供用户确认；
2. 获得确认后调用 createPlmIssue；
3. 新需求默认加 gpt-pro、needs-triage 标签；
4. 正文必须包含：背景、目标、范围、交互或业务规则、验收标准、明确不做的内容；
5. 返回 Issue 编号和链接。

读取 Codex 处理结果时，读取 Issue 及评论，区分已验证事实和建议。只有用户同意后，才能评论、改写或关闭 Issue。
```

## 4. 第一次联调

先做无写入测试：

```text
读取 PLM 仓库当前打开的 Issues，只列编号、标题、标签和更新时间，不要创建或修改任何内容。
```

确认读取正常后，再让 GPT 起草一个标题带 `[联调]` 的 Issue。检查标题和正文后明确批准创建；创建成功后，可以在 GitHub 手动关闭或让 GPT 经确认后关闭。

## 5. 两边协作约定

- 网页 GPT：讨论需求、整理 Issue、阅读验收结果。
- Codex：认领 Issue、修改代码、运行检查、提交并在 Issue 留下提交号和验证结果。
- GitHub Issue：双方唯一的任务交接记录；聊天里的临时讨论不自动视为已确认需求。
- 修改需求时优先更新原 Issue，避免同一需求生成多个相互冲突的 Issue。
