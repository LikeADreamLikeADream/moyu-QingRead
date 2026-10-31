# Electron 架构说明

轻阅采用 Electron + TypeScript/JavaScript。主进程管理窗口、托盘、快捷键、文件选择与本地资源协议；渲染进程负责书架、设置和正文显示，通过 preload 提供的受限 IPC 调用主进程。

- electron/src/main.ts：主进程入口。
- electron/src/library.ts：Node.js SQLite、书籍副本、导入、搜索、进度和书签。
- electron/src/book-parser.ts：Worker 中解析 TXT、EPUB、MOBI 和 AZW3。
- electron/src/fonts.ts：导入字体管理。
- electron/ui/：书架、设置、中英文界面和阅读器。

用户数据默认保存在 %LOCALAPPDATA%/QingRead.Reader，可通过 QINGREAD_READER_DATA 指定独立目录。导入复制原文件，不修改用户原件。

构建与验证命令见根目录 README.md。
