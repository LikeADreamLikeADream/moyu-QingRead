# 轻阅 本地阅读器

**简体中文** | [English](README.en.md)

轻阅是一款免费、无需登录的本地电子书阅读器。基础版本为 **0.1.0**，最新发布版本请查看 [Releases](https://github.com/LikeADreamLikeADream/moyu-QingRead/releases)。使用 Electron + TypeScript/JavaScript，支持 TXT、EPUB、MOBI 和 AZW3。

书籍由 JavaScript 后台线程解析，书架数据使用 Electron 内置 Node.js SQLite 保存。

## 下载与运行

前往 [GitHub Releases](https://github.com/LikeADreamLikeADream/moyu-QingRead/releases) 下载适合系统和处理器架构的压缩包：

| 系统 | 架构 | 文件 |
| --- | --- | --- |
| Windows | x64 | `QingRead-<版本>-win-x64.zip` |
| macOS（Intel） | x64 | `QingRead-<版本>-mac-x64.zip` |
| macOS（Apple Silicon） | arm64 | `QingRead-<版本>-mac-arm64.zip` |
| Linux | x64 | `QingRead-<版本>-linux-x64.tar.gz` |

Windows 解压后运行 `轻阅.exe`；macOS 解压后打开 `.app`；Linux 解压后运行目录中的应用程序。请保留解压后的完整目录，运行时不需要安装 Node.js 或开发工具。发布流程已配置以上构建目标，macOS 和 Linux 尚未完成实机运行验证；当前未配置代码签名与 macOS 公证。

### Windows 本地打包目录

运行打包目录中的：

```text
./artifacts/QingRead-Electron/win-unpacked/轻阅.exe
```

请保留整个 `win-unpacked` 目录，不能只复制 exe。运行时不需要安装 Node.js 或开发工具。

当前开发机的最新运行文件为：

```text
.\artifacts\QingRead-Electron\win-unpacked\轻阅.exe
```

重新打包只更新上述项目产物，不会自动更新其他位置的解压副本。若使用独立安装目录，应先从托盘退出软件，再用最新完整运行目录替换旧程序文件；已有快捷方式也应指向更新后的程序。

- 软件默认以小窗启动，右上角提供透明、透明度调整、置顶、大小窗、最小化和关闭图标。
- 关闭按钮将窗口隐藏到系统托盘，并保存阅读位置；双击托盘图标，或选择托盘菜单“显示并找回”恢复窗口。
- 完全关闭软件需要在托盘菜单中选择“退出”。
- 默认老板键为 `Ctrl+Alt+Z`，可隐藏或找回窗口，也可在阅读设置中修改。

## 书架

- 点击“导入书籍”或将文件拖入窗口，支持 TXT、EPUB、MOBI、AZW3；导入时复制文件，不修改原始文件。
- 支持取消导入、搜索书名或作者、按分类筛选。分类使用可搜索的浮层下拉菜单，支持再次点击按钮或点击外部收起；开启分类数量后，选项显示对应书籍数量。
- 右击书籍的菜单顺序为“编辑、导出、删除”。编辑支持书名和分类；导出保存导入的原格式文件。
- 删除书籍前需要确认。确认后立即删除书架记录及应用内副本，不保留数天；原始文件不受影响。
- 书架设置提供中英文界面切换，语言选择自动保存；仅切换软件界面文字，不修改书籍正文、书名、作者或分类信息。
- 书架设置支持拖动排序、按上次阅读时间倒序、显示分类书籍数量，以及书名、阅读进度、书籍类型的显示开关。
- 透明开关作用于窗口背景和封面显示；透明度浮层支持 1%～100% 的不透明度滑块与数值输入。

### 中英文界面

在书架页面点击齿轮，进入“书架设置”，顶部的“界面语言”浮层下拉菜单可选择“简体中文”或“English”，再次点击按钮或点击外部收起。这个入口位于书架设置，不在阅读设置中。

选择后立即切换书架设置、阅读设置、工具栏、菜单及确认弹框等界面文字，托盘菜单也随之切换；语言选项保存在 `electron-shelf.json`，重启后保留。只切换软件界面，不翻译或修改书籍正文、书名、作者、分类、书签名称及编辑框中已有的书籍信息。

若找不到语言选项，先确认运行的是最新 exe，而不是较早 ZIP 解压出的副本。

## 阅读

- 支持目录、全文搜索、书签、滚动、分页、自动阅读、单行阅读和进度跳转。
- 滚动到章末后继续向下滚动进入下一章；到章首后继续向上滚动进入上一章末尾。
- 滚动模式下，自动阅读按“滚动速度”持续滚动；分页模式下，按“翻页间隔（秒）”自动翻页。
- 进度跳转支持滑块和百分比输入；滑块左侧为黑色、右侧为浅灰色。
- 支持方向键、PageUp/PageDown 翻页，Ctrl+F 打开搜索，Esc 关闭侧栏或设置并暂停自动阅读；阅读按键可自定义。
- 阅读位置及书籍阅读设置自动保存，再次从书架打开同一本书时恢复。

### 返回原进度

- 点击目录、搜索结果或书签，实际跳转到不同阅读位置后，底部显示“返回原进度”。
- 点击该按钮恢复跳转前的章节和文字位置，支持滚动、翻页模式。
- 按钮显示 10 秒，超时自动隐藏并清除返回记录，不改变当前阅读位置。
- 有效期内连续跳转保留首次起点，并从最近一次实际跳转完成后重新计时。
- 点击后位置没有变化时，不显示按钮，也不重置已有倒计时。
- 完成返回、返回书架或重新打开书籍后，清除返回记录。

### 阅读设置

支持字号、行距、左右边距、上下边距、字体、主题、文字颜色、背景颜色、紧凑段落、宽窗双栏、自动阅读参数与快捷键等。

- 上下边距范围为 0–96 像素，默认 32 像素；同时调整正文顶部和底部留白，适用于滚动和翻页模式，按书籍保存。小窗高度不足时会自动限制实际边距。

- 字体支持导入 TTF、OTF、WOFF、WOFF2，并在字体下拉菜单内按字体名称搜索。导入字体会复制到应用数据目录并自动应用；“删除字体”仅删除当前选中的导入副本，不删除系统字体或原始文件，相关书籍回退到默认字体。
- 字体、背景和单行模式采用一致的浮层下拉菜单样式：点击展开，再次点击收起；点击菜单外部也会收起。字体菜单内支持搜索；背景提供纸张、明亮、夜间、护眼，单行模式提供横向滚动、纵向滚动。
- “字体加粗”开关即时应用于正文及单行阅读，按书籍保存；关闭开关或恢复阅读默认值可取消加粗。
- 文字颜色和背景颜色分别提供“重置”，恢复当前主题默认颜色。
- 颜色选择浮层支持色块、RGB 滑块和十六进制颜色值；点击外部区域或按 Esc 收起。
- 点击阅读设置面板外的区域会隐藏面板，已打开的颜色及下拉浮层也会关闭。
- 窗口设置包括工具栏自动隐藏、鼠标移出暂隐、截图保护和老板键；截图保护的实际效果取决于系统及捕获工具。

### 书签

同一本书的同一章节、同一文字位置重复添加书签时，只保留最后一次，并以最后一次输入的名称替换旧书签，并排到列表最新位置；其他章节或文字位置的书签不受影响。书签名称最多 200 个字符，列表显示前 10 个字符，超出部分显示 `...`，悬停可查看完整名称。添加成功后立即刷新已打开的书签列表。删除按钮位于每条书签右侧，仅弹出一次确认框；确认删除后显示可手动关闭的提示。

## 开发

使用 VS Code 或 WebStorm 打开项目根目录。当前活动源码位于 [electron](electron/) 目录。

开发环境使用 Node.js 24 和 pnpm 11.25.0；依赖版本由 `electron/pnpm-lock.yaml` 锁定。当前 Electron 版本为 44.7.0。

项目使用 pnpm 11.25.0；首次使用前可执行 `npm install -g pnpm@11.25.0` 安装。依赖下载到项目外的共享仓库，可用 `pnpm --dir electron store path` 查看位置。`electron/pnpm-workspace.yaml` 使用隔离依赖布局，通过符号链接组织依赖，并通过硬链接复用共享仓库文件；当前打包流程已按此布局验证。项目中仍保留 `electron/node_modules/`，不要手动移动它。

根目录统一提供 `pnpm run deps:install`、`pnpm start`、`pnpm run build`、`pnpm test` 和 `pnpm run package`。仅使用 pnpm 安装依赖，避免生成不同的锁文件。

在项目根目录执行：

```powershell
npm install -g pnpm@11.25.0
pnpm run deps:install
pnpm --dir electron exec install-electron
pnpm start
```

仅编译 TypeScript：

```powershell
pnpm run build
```

上述命令可在项目根目录执行；也可进入 `electron/` 使用原有命令。`electron/src/` 是当前源码，必须保留。

## 打包

先通过托盘菜单“退出”关闭正在运行的轻阅，避免文件占用。在 `electron` 目录执行：

```powershell
pnpm run package --config.electronDist=node_modules/electron/dist
```

该命令使用 `pnpm install --frozen-lockfile` 安装的本地 Electron 运行时，编译并生成 Windows 运行目录：

```text
artifacts/QingRead-Electron/win-unpacked/
```

当前默认只更新 exe 运行目录，**不生成或更新压缩包**；仅在明确需要时单独压缩。已有 ZIP 文件可能早于最新运行目录，分发前需按需更新。

需要压缩包时，在项目根目录执行：

```powershell
Compress-Archive -LiteralPath 'artifacts/QingRead-Electron/win-unpacked' -DestinationPath 'artifacts/QingRead-Electron/轻阅-Electron版.zip' -CompressionLevel Optimal -Force
```

解压新版压缩包不会更新其他旧解压目录；请确认实际启动路径。

## 自动发布

[发布工作流](.github/workflows/release.yml) 在代码推送到 `main` 后执行，也可在 GitHub Actions 中选择 `Release`，从 `main` 分支手动运行。

- Windows x64、macOS x64 / arm64 和 Linux x64 分别构建，所有构建成功后统一发布一个 GitHub Release，并附带四个下载包。
- 未存在 `v0.1.*` 正式标签时，从 `v0.1.0` 开始；之后按现有 `v0.1.*` 标签的最大补丁号递增，例如 `v0.1.1`、`v0.1.2`。
- 构建时将发布版本写入包内元数据，不自动修改或提交仓库中的 `package.json`。
- 同一提交已有 `v0.1.*` 正式标签时跳过重复发布。
- 使用 GitHub 自带的 `GITHUB_TOKEN`，发布任务已声明 `contents: write` 权限，无需另行添加个人访问令牌。
- 此流程发布可下载的新版本；已安装客户端不会因此自动更新。

## 数据与兼容

Windows 默认数据目录：

```text
%LOCALAPPDATA%/QingRead.Reader
```

macOS 和 Linux 使用 Electron 的 `app.getPath('userData')` 目录；设置 `QINGREAD_READER_DATA` 后，各系统均使用指定目录。

主要内容为 `library.db`、`books/`、字体缓存、`electron-window.json` 和 `electron-shelf.json`。复制备份整个数据目录前，应先从托盘完全退出软件。

开发或检查时可指定独立数据目录，避免使用日常书架：

```powershell
$env:QINGREAD_READER_DATA = 'D:\QingRead-TestData'
pnpm start
# 测试结束后，在当前终端恢复默认数据目录：
Remove-Item Env:QINGREAD_READER_DATA
```

该启动示例可在项目根目录执行。书籍元数据、进度与设置使用 SQLite 保存，正文和图片缓存在书籍目录中。需要修复的 MOBI 缓存会在打开时重新解析，并保留备份；大型书籍首次修复需要等待。

## 验证

在 `electron` 目录执行：

```powershell
pnpm test
```

覆盖自编 TXT、EPUB、MOBI、AZW3 样本，检查插图、搜索、编辑、导出、阅读进度、偏好设置、书签、重启后数据恢复、删除和取消导入。检查使用独立数据目录，结果保存在 `artifacts/` 下。

项目根目录中的专项检查：

- `tests/electron-native-package-check.cjs`：加载打包内模块，检查解析及存储功能；需使用打包 Electron 的 Node 运行模式执行。
- `tests/annotations-store-check.cjs`：划线位置校验、搜索、更新、重启恢复和删除同步。
- `tests/annotations-ui-check.cjs`：独立数据目录中的真实 Electron 划线与笔记流程，包含鼠标点击、跨段落和三处删除同步。
- `tests/bookmark-replace-check.cjs`：同位置书签覆盖、列表顺序与重启保留。
- `tests/jump-return-check.cjs`：目录、搜索、书签跳转及返回、连续跳转保留首次起点与书籍切换清理。
- `tests/jump-noop-check.cjs`：未改变阅读位置时不显示返回入口、不重置计时。
- `tests/jump-return-timer-check.cjs`、`tests/jump-return-expiry-check.cjs`：10 秒计时、重置与实际到期隐藏。
- `tests/font-search-check.cjs`、`tests/theme-select-check.cjs`、`tests/single-mode-select-check.cjs`、`tests/language-select-check.cjs`、`tests/category-select-check.cjs`：字体搜索与各下拉菜单的选择、重复点击和外部收起。
- `tests/position-restore-check.cjs`：实际 Electron 渲染中的分页末页对齐与位置恢复。
- `tests/paged-auto-probe.cjs`：实际 Electron 渲染中的自动翻页及暂停。
- `tests/color-picker-check.cjs`：颜色选择及外部点击、Esc 关闭。
- `tests/i18n-check.cjs`：中英双向切换、动态设置项与语言保存调用，以及书名、分类和编辑框内容不受翻译影响（使用模拟桌面接口）。

界面专项检查可在项目根目录用以下形式执行：

```powershell
& './electron/node_modules/electron/dist/electron.exe' tests/position-restore-check.cjs
```

部分界面检查使用模拟桌面接口验证界面行为与保存调用，不代表真实数据库的端到端覆盖；字体、书签及导入存储另有实际模块检查。专项检查不全部包含在 `pnpm test` 中，需按改动选择执行。

自动检查不等同于所有书籍的兼容性保证。MOBI/KF8 格式变体仍需按具体文件验证，受保护内容不保证可读取；含 `encryption.xml` 的 EPUB 当前会拒绝导入。发布工作流已配置 Windows、macOS 和 Linux 构建；构建成功不等同于实机运行验证，macOS 和 Linux 尚未完成当前版本的实机验证。

## 项目结构

| 路径 | 用途 |
| --- | --- |
| `.github/workflows/release.yml` | 跨平台构建、自动版本号与 GitHub Release 发布 |
| `electron/src/main.ts` | 窗口、托盘、快捷键、字体导入入口、本地资源协议及 IPC |
| `electron/src/preload.ts` | 向界面提供受限的桌面接口 |
| `electron/src/library.ts` | SQLite 存储、导入、书架、进度、书签及缓存修复 |
| `electron/src/book-parser.ts` | 后台线程中的 TXT / EPUB / MOBI / KF8 解析 |
| `electron/src/fonts.ts` | 导入字体的复制、校验、去重及删除 |
| `electron/ui/app.js`、`app.css`、`index.html` | 书架、设置、菜单和阅读界面 |
| `electron/ui/annotations.js` | 笔记书籍、书内笔记、划线编辑及删除同步 |
| `electron/ui/reader/annotations.js` | 原文选择、划线渲染及选中文字工具栏 |
| `electron/ui/i18n.js` | 界面词条、中英切换及动态控件翻译；排除书籍内容和信息 |
| `electron/ui/reader/` | 正文渲染、分页、滚动、自动阅读和位置恢复 |
| `electron/dist/` | TypeScript 编译输出，由 `pnpm run build` 重新生成 |
| `electron/node_modules/` | 开发、运行源码及打包依赖，由根目录 `pnpm run deps:install` 安装 |
| `electron/package.json` | 项目依赖、启动命令和打包配置 |
| `electron/pnpm-lock.yaml` | 锁定 pnpm 依赖版本 |
| `electron/pnpm-workspace.yaml` | pnpm 依赖布局、硬链接与安装脚本配置 |
| `electron/.npmrc` | 当前项目的官方依赖下载源 |
| `pnpm-lock.yaml` | 根目录命令入口的锁文件，根目录不声明应用依赖 |
| `electron/tsconfig.json` | TypeScript 编译配置 |
| `package.json` | 根目录统一开发、构建、测试和打包入口 |
| `tests/` | 当前 Electron 自动检查与自编样本 |
| `artifacts/` | 运行目录、历史包和检查产物 |

### 目录保留与清理

- 继续开发时，保留 `electron/src/`、`electron/ui/`、依赖及编译配置、`tests/` 和文档。
- `electron/dist/` 可以清理，之后执行 `pnpm run build` 重新生成；`electron/node_modules/` 可以清理，之后在根目录执行 `pnpm run deps:install` 重新安装。
- `artifacts/` 存放运行目录、压缩包、历史版本及自动检查生成的临时数据，不属于源码。旧版本和不再需要的测试产物可以清理；部分专项检查依赖已有打包产物或前置检查结果，清理后需要重新生成。
- 如果从项目内运行软件，应保留完整的 `artifacts/QingRead-Electron/win-unpacked/`，不能只保留 exe。仅使用打包软件时，不依赖项目中的 `electron/` 目录。
- 日常书架、阅读进度、设置和导入字体位于 `%LOCALAPPDATA%/QingRead.Reader`，不在 `artifacts/` 内。清理打包或测试产物时不要删除该数据目录；指定 `QINGREAD_READER_DATA` 后以指定目录为准。

[Electron 架构说明](docs/Electron架构说明.md)介绍当前结构；开发步骤和验证范围分别见 [开发与打包说明](docs/开发与打包说明.md) 与 [验证说明](docs/验证说明.md)。
