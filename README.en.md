# QingRead Local Ebook Reader

[简体中文](README.md) | **English**

QingRead (轻阅) is a free local ebook reader that requires no login. Its base version is **0.1.0**; see [Releases](https://github.com/LikeADreamLikeADream/moyu-QingRead/releases) for the latest published version. Built with Electron and TypeScript/JavaScript, it supports TXT, EPUB, MOBI, and AZW3.

Books are parsed in JavaScript background threads. Library data is stored with the Node.js SQLite implementation bundled with Electron.

## Download and run

Download the archive for your operating system and processor from [GitHub Releases](https://github.com/LikeADreamLikeADream/moyu-QingRead/releases).

| System | Architecture | File |
| --- | --- | --- |
| Windows | x64 | `QingRead-<version>-win-x64.zip` |
| macOS (Intel) | x64 | `QingRead-<version>-mac-x64.zip` |
| macOS (Apple Silicon) | arm64 | `QingRead-<version>-mac-arm64.zip` |
| Linux | x64 | `QingRead-<version>-linux-x64.tar.gz` |

On Windows, extract the archive and run `轻阅.exe`. On macOS, extract it and open the `.app`. On Linux, extract it and run the application inside the directory. Keep the complete extracted directory. Node.js and development tools are not required to run a packaged application.

The release workflow is configured for these targets. macOS and Linux have not yet been verified on actual machines. Code signing and macOS notarization are not configured.

### Local Windows build directory

Run the application from:

```text
./artifacts/QingRead-Electron/win-unpacked/轻阅.exe
```

Keep the entire `win-unpacked` directory; copying only the executable is insufficient. Node.js and development tools are not required to run it.

The latest application on the current development machine is:

```text
.\artifacts\QingRead-Electron\win-unpacked\轻阅.exe
```

Rebuilding updates this project output only, not copies extracted elsewhere. Before replacing a separate installation directory, quit QingRead from the tray, replace the complete application directory, and ensure shortcuts point to the updated executable.

- The application starts in a small window. The upper-right controls provide transparency, opacity, always-on-top, window size, minimize, and close actions.
- Closing hides the window to the system tray and saves your reading position. Double-click the tray icon or choose the tray menu's show/restore action to return.
- To quit completely, choose the tray menu's exit action.
- The default boss key is `Ctrl+Alt+Z`. It hides or restores the window and can be changed in reading settings.

## Library

- Click the import button or drag books into the window. Importing TXT, EPUB, MOBI, or AZW3 copies the file without changing the original.
- Cancel imports, search by title or author, and filter by category. The category dropdown supports search, repeated-click and outside-click dismissal, and optional book counts.
- The book context menu contains edit, export, and delete actions, in that order. Edit changes the title and category; export saves the original imported format.
- Deletion requires confirmation, then immediately removes the library record and the application's copy. The original source file is preserved.
- Library settings provide a saved Chinese/English interface preference. This changes interface text only, leaving book contents, titles, authors, and categories unchanged.
- Settings also support drag sorting, sorting by most recent reading time, category counts, and toggles for title, reading progress, and format labels.
- Transparency applies to the window background and cover display. The opacity popup supports a slider and numeric input from 1% to 100%.

### Interface language

Click the gear icon on the library page to open library settings. The language dropdown at the top offers Simplified Chinese and English. Click again or click outside to close it. This control is in library settings, not reading settings.

The selection immediately updates settings, toolbars, menus, confirmation dialogs, and the tray menu. It is stored in `electron-shelf.json` and survives restarts. It does not translate book contents, titles, authors, categories, bookmark names, or existing text in editing fields.

If the language option is missing, check that you are running the latest application rather than an older extracted copy.

## Reading

- Includes a table of contents, full-text search, bookmarks, scrolling, pagination, automatic reading, single-line reading, and progress navigation.
- Scrolling past a chapter's end opens the next chapter; scrolling above its beginning opens the end of the previous chapter.
- Automatic reading uses the scrolling speed in scroll mode and the page interval in pagination mode.
- Progress navigation supports a slider and percentage input. The slider is black to the left and light gray to the right.
- Arrow keys and PageUp/PageDown turn pages. Ctrl+F opens search. Esc closes sidebars or settings and pauses automatic reading. Reading keys can be customized.
- Reading positions and per-book preferences are saved and restored when reopening a book.

### Return to the previous position

- A return button appears at the bottom after a table-of-contents, search-result, or bookmark action actually moves to another position.
- It restores the chapter and text position from before the jump, in both scrolling and pagination modes.
- The button expires after 10 seconds, clearing the return record without moving the current reading position.
- Further jumps within that period keep the original starting position and restart the timer after the most recent actual jump.
- An action that does not change position neither shows the button nor resets an existing timer.
- Returning, going back to the library, or reopening a book clears the return record.

### Reading settings

Adjust font size, line spacing, margins, fonts, themes, text and background colors, compact paragraphs, wide-window columns, automatic reading, and shortcuts.

- Import TTF, OTF, WOFF, or WOFF2 fonts and search the font dropdown by name. Imported fonts are copied to the application data directory and applied immediately. Deleting a font removes only the selected imported copy, preserving system fonts and original files; affected books fall back to the default font.
- Font, background, and single-line controls use matching popup dropdowns. Click to open, click again or outside to close. Fonts support search; backgrounds include paper, light, night, and eye-care themes; single-line mode supports horizontal and vertical scrolling.
- The bold font toggle immediately applies to the book text and single-line reading, and is saved per book. Turn it off or restore the default reading settings to remove bold formatting.
- Text and background colors each have a reset action that restores the current theme's defaults.
- Color popups support swatches, RGB sliders, and hexadecimal values. Click outside or press Esc to dismiss them.
- Clicking outside reading settings closes the panel and any open color or dropdown popups.
- Window options include automatic toolbar hiding, temporary hiding when the pointer leaves, capture protection, and the boss key. Capture protection depends on the operating system and capture tool.

### Bookmarks

Adding a bookmark at the same chapter and text position replaces its name with the latest input and moves it to the newest position in the list. Bookmarks at other positions are preserved. Names support up to 200 characters; the list shows the first 10 followed by `...` for longer names, with the complete name on hover. Adding a bookmark immediately refreshes an open list. Each row has a delete button that shows one confirmation dialog, followed by a dismissible notification after deletion.

## Development

Open the project root in VS Code or WebStorm. Active source code lives in [electron](electron/).

Use Node.js 24 and pnpm 11.25.0. Dependencies are locked in `electron/pnpm-lock.yaml`; the current Electron dependency is 44.7.0. Use pnpm for dependency installation to avoid introducing another lockfile.

From the project root:

```sh
npm install -g pnpm@11.25.0
pnpm run deps:install
pnpm --dir electron exec install-electron
pnpm start
```

The explicit `install-electron` command downloads the Electron runtime needed for local startup and Windows directory packaging.

To compile TypeScript only:

```sh
pnpm run build
```

Root scripts provide dependency installation, startup, compilation, tests, and Windows packaging through `pnpm run deps:install`, `pnpm start`, `pnpm run build`, `pnpm test`, and `pnpm run package`. You can also run the corresponding scripts inside `electron/`. Keep `electron/src/` as the source of truth.

Dependencies are stored in a shared store outside the project; use `pnpm --dir electron store path` to locate it. `electron/pnpm-workspace.yaml` configures isolated dependencies with symbolic links and hard links to shared package files. The current packaging process has been verified with this layout. Do not manually move `electron/node_modules/`.

## Packaging

Quit QingRead from the tray before rebuilding to avoid locked files. From the `electron` directory:

```powershell
pnpm run package --config.electronDist=node_modules/electron/dist
```

This command uses the local Electron runtime installed through `pnpm install --frozen-lockfile`, compiles the application, and generates the Windows application directory:

```text
artifacts/QingRead-Electron/win-unpacked/
```

Local packaging updates the application directory only; it does **not** create or refresh a ZIP. Existing archives may be older than the latest application directory.

To create a ZIP when needed, run this from the project root in PowerShell:

```powershell
Compress-Archive -LiteralPath 'artifacts/QingRead-Electron/win-unpacked' -DestinationPath 'artifacts/QingRead-Electron/轻阅-Electron版.zip' -CompressionLevel Optimal -Force
```

Extracting a new archive does not update other extracted copies. Check the path of the application you actually launch.

## Automatic releases

The [release workflow](.github/workflows/release.yml) runs when code is pushed to `main`. It can also be started manually by selecting `Release` in GitHub Actions and running it on `main`.

- Windows x64, macOS x64 / arm64, and Linux x64 build separately. Once all builds succeed, one GitHub Release is published with four downloadable archives.
- If no formal `v0.1.*` tag exists, the version starts at `v0.1.0`. Later releases increment the highest existing `v0.1.*` patch number, such as `v0.1.1` and `v0.1.2`.
- The release version is written into package metadata during the build. Repository `package.json` files are not automatically changed or committed.
- A commit already carrying a formal `v0.1.*` tag is skipped to avoid duplicate publication.
- Publication uses GitHub's built-in `GITHUB_TOKEN`. The release job declares `contents: write`; no additional personal access token is needed.
- The workflow publishes downloadable versions. It does not automatically update installed clients.

## Data and compatibility

The default Windows data directory is:

```text
%LOCALAPPDATA%/QingRead.Reader
```

macOS and Linux use Electron's `app.getPath('userData')` directory. On every platform, `QINGREAD_READER_DATA` overrides the default directory.

Data includes `library.db`, `books/`, font caches, `electron-window.json`, and `electron-shelf.json`. Quit completely from the tray before backing up the entire data directory.

Use a separate data directory for development or inspection. For example, from the project root in PowerShell:

```powershell
$env:QINGREAD_READER_DATA = 'D:\QingRead-TestData'
pnpm start
# Restore the default for subsequent launches in this terminal:
Remove-Item Env:QINGREAD_READER_DATA
```

Book metadata, progress, and settings are stored in SQLite. Text and images are cached in book directories. MOBI caches requiring repair are reparsed when opened, with a backup retained. Large books may take time on the first repair.

## Verification

From the `electron` directory:

```sh
pnpm test
```

This checks project-created TXT, EPUB, MOBI, and AZW3 samples, including illustrations, search, editing, export, progress, preferences, bookmarks, persistence after restart, deletion, and import cancellation. It uses separate data directories and writes results under `artifacts/`.

Additional checks in the root `tests/` directory:

| Check | Coverage |
| --- | --- |
| `electron-native-package-check.cjs` | Parsing and storage through packaged modules; run using the packaged Electron runtime in Node mode |
| `bookmark-replace-check.cjs` | Bookmark replacement at the same position, ordering, and restart persistence |
| `jump-return-check.cjs` | Contents/search/bookmark jumps and return, preservation of the first origin, and cleanup on book changes |
| `jump-noop-check.cjs` | No return button or timer reset when the position does not change |
| `jump-return-timer-check.cjs`, `jump-return-expiry-check.cjs` | The 10-second timer, resets, and actual expiry |
| `font-search-check.cjs`, `theme-select-check.cjs`, `single-mode-select-check.cjs`, `language-select-check.cjs`, `category-select-check.cjs` | Font search and dropdown selection, repeated clicks, and outside-click dismissal |
| `position-restore-check.cjs` | Last-page alignment and position restoration in an actual Electron renderer |
| `paged-auto-probe.cjs` | Automatic pagination and pausing in an actual Electron renderer |
| `color-picker-check.cjs` | Color selection and dismissal by outside click or Esc |
| `i18n-check.cjs` | Chinese/English switching, dynamic controls, language-save calls, and preservation of book metadata and editing fields, using mocked desktop interfaces |

For example, run a UI check from the project root in Windows PowerShell:

```powershell
& './electron/node_modules/electron/dist/electron.exe' tests/position-restore-check.cjs
```

Some UI checks mock desktop interfaces to verify interface behavior and save calls; they do not establish end-to-end database coverage. Fonts, bookmarks, and import storage have separate module checks. Not all specialized checks are included in `pnpm test`; select them according to the change.

Automated checks do not guarantee compatibility with every book. MOBI/KF8 variants require testing with the specific file, and protected content is not guaranteed to work. EPUB files containing `encryption.xml` are currently rejected. The workflow targets Windows, macOS, and Linux, but successful builds do not establish runtime compatibility. macOS and Linux have not yet been verified on actual machines for this version.

## Project structure

| Path | Purpose |
| --- | --- |
| `.github/workflows/release.yml` | Cross-platform builds, automatic version numbers, and GitHub Releases |
| `electron/src/main.ts` | Window management, tray, shortcuts, font import entry points, local resource protocol, and IPC |
| `electron/src/preload.ts` | Restricted desktop interfaces exposed to the UI |
| `electron/src/library.ts` | SQLite storage, imports, library, progress, bookmarks, and cache repair |
| `electron/src/book-parser.ts` | TXT / EPUB / MOBI / KF8 parsing in background threads |
| `electron/src/fonts.ts` | Copying, validation, deduplication, and deletion of imported fonts |
| `electron/ui/app.js`, `app.css`, `index.html` | Library, settings, menus, and reading interface |
| `electron/ui/i18n.js` | Interface strings, language switching, and dynamic controls; excludes book contents and metadata |
| `electron/ui/reader/` | Text rendering, pagination, scrolling, automatic reading, and position restoration |
| `electron/dist/` | TypeScript output regenerated by `pnpm run build` |
| `electron/node_modules/` | Development, runtime, and packaging dependencies installed by `pnpm run deps:install` |
| `electron/package.json` | Dependencies, startup scripts, and packaging configuration |
| `electron/pnpm-lock.yaml` | Locked dependency versions |
| `electron/pnpm-workspace.yaml` | pnpm dependency layout, hard links, and installation-script configuration |
| `electron/.npmrc` | Official dependency registry configuration |
| `pnpm-lock.yaml` | Root command-entry lockfile; application dependencies are declared under `electron/` |
| `electron/tsconfig.json` | TypeScript configuration |
| `package.json` | Root development, build, test, and packaging commands |
| `tests/` | Electron checks and project-created samples |
| `artifacts/` | Application directories, older packages, and check output |

### Keeping and cleaning directories

- For development, keep `electron/src/`, `electron/ui/`, dependency and compiler configuration, `tests/`, and documentation.
- Regenerate `electron/dist/` with `pnpm run build`. Reinstall `electron/node_modules/` with `pnpm run deps:install` from the project root.
- `artifacts/` contains application directories, archives, older versions, and temporary check data. It is not source code. Older versions and unneeded results can be removed; some specialized checks need packaged output or earlier results, which must then be regenerated.
- If running from the project, keep the complete `artifacts/QingRead-Electron/win-unpacked/` directory, not just the executable. A distributed application does not require the project's `electron/` directory.
- Everyday library data, progress, settings, and imported fonts are stored in `%LOCALAPPDATA%/QingRead.Reader`, outside `artifacts/`. Do not delete the data directory when cleaning build or check output. When set, `QINGREAD_READER_DATA` determines the data location.

Further documentation is currently in Chinese: [Electron architecture](docs/Electron架构说明.md), [Development and packaging](docs/开发与打包说明.md), and [Verification](docs/验证说明.md).
