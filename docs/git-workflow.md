# Spec Kit 与 Git 配合使用

## 分工

- Spec Kit Git 扩展：`before_specify` 创建 `feat/<编号>-<名称>` 分支；
  specify、clarify、plan、tasks、implement 后保存阶段提交。
- Git `pre-commit`：暂存内容涉及主应用非文档文件时，在 `existing_app/`
  执行 `npm run precommit`，检查前后端类型；失败阻止提交。
- 项目 `AGENTS.md`：约束改动范围、验证证据、推送和合并授权。

扩展是官方 bundled Git Branching Workflow v1.0.1，通过
`specify extension add git` 安装。命令与脚本随仓库保存；无需每台机器重新安装。
配置分别位于 `.specify/extensions.yml` 和
`.specify/extensions/git/git-config.yml`。前者决定何时调用，后者决定是否提交。
本项目关闭阶段开始前的自动提交，仅启用上述五个阶段结束后的提交。
这些后置 hooks 使用 `optional: false`，会在阶段结束时执行，不逐次询问。
只在整个工作区属于该阶段时使用自动提交；混合改动按文件手动提交。

## 每个 checkout 的本地设置

从仓库根目录执行（Node.js 24，依赖按主应用 README 安装）：

```powershell
git config --local extensions.worktreeConfig true
git config --worktree core.hooksPath existing_app/.githooks
git config --show-origin --get core.hooksPath
```

Git 不会从仓库文件自动启用 hooks；新 clone 或新 worktree 需执行上述设置。
使用 worktree 配置让这个 checkout 的设置不改变另一个旧 worktree 的 hooks。
无需改动主应用已有 `precommit` npm script。文档和手表原型提交跳过主应用类型检查，
手表变更仍需执行其自身适用的验证。此 hook 不替代 lint、测试和 CI。

## 新功能

1. 检查 `git status` 和分支；处理已有改动后，从约定基线开始。
   如从 main 开始，先 `git switch main`、`git pull --ff-only`。
2. 运行 `$speckit-specify`。其 Git hook 创建分支，无需提前手动创建。
   说明英文短名，例如 `family-binding`；新 spec 编号由现有目录决定。
3. 核对 Git 分支和 `.specify/feature.json` 指向同一功能。
   环境变量 `SPECIFY_FEATURE_DIRECTORY` 的优先级更高；切分支不会切换该指针。
4. 按需 clarify，然后 plan、tasks、analyze。
5. 分阶段 implement，每阶段先验证、审阅 diff，再保存实现与测试的 checkpoint。
6. converge 如追加任务，先明确提交任务记录，再 implement 并重新 converge。
   最后记录通过、已接受例外和环境限制；任务勾选完成不代表全部业务验收通过。
7. 获得推送授权后 `git push -u origin HEAD`，通过 PR 审阅，再按授权合并 main。

当前 spec002 已进入 main，不补造历史分支或重写提交。
其历史 Key 处置暂缓、浏览器环境限制继续以 verification.md 的记录为准。

## 检查与提交

在根目录检查 `git diff`、`git diff --cached`、`git status --short`，
确认没有无关文件或本地配置。官方自动提交会执行 `git add .`，不会自动隔离其他工作。
Conventional Commit 消息由 agent 根据真实 diff 生成，通过临时消息文件传入脚本。
没有改动时不创建空提交。

主应用阶段验证示例（在 `existing_app/`）：

```powershell
npm.cmd run lint
npm.cmd run test:integration -- --suite persistence
```

按影响选择套件；最终功能集成执行所需完整测试及构建。
集成测试依赖独立、本机、以 `_test` 结尾的 `DATABASE_URL_TEST`，不能使用开发库。
权限、持久化、数据库迁移和地图页面还需相应运行证据；不要用静态检查代替。

提交检查失败时先修复，失败后暂存区可能仍保留，使用 `git status` 核对再重试。
`SKIP_GIT_HOOKS` 是已有人工应急入口，agent 不得自动设置它绕过检查。

## CLI 启动器说明

配置时机器上的 `specify.exe` 报 `uv trampoline failed to canonicalize script path`。
本次通过已安装环境的 Python 调用 `specify_cli.main` 完成官方安装，没有重装全局工具。
项目 hooks 使用仓库内 PowerShell 脚本，无需依赖这个故障启动器运行。
