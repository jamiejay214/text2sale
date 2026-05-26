# Command Center — Desktop App

A thin native shell (Electron) that wraps the live Command Center so it installs
like a real Mac/Windows app. It loads the deployed web dashboard, so it always
shows the same live data as the browser — no separate build of the app itself.

## Run it (dev)

```bash
cd electron
npm install
npm start                # opens https://text2sale.com/command
npm run start:local      # opens http://localhost:3000/command (run `npm run dev` in the repo root first)
```

Point it anywhere by setting `CC_URL`:

```bash
CC_URL=https://text2sale.com/command npm start
```

## Build an installer

```bash
cd electron
npm install
npm run dist:mac    # → dist/Command Center-1.0.0.dmg
npm run dist:win    # → dist/Command Center Setup 1.0.0.exe   (build on Windows)
```

The `.dmg` / `.exe` lands in `electron/dist/`. Double-click to install.

### Optional: custom app icon
Drop a 512×512 (or larger) PNG at `electron/build/icon.png` before running
`npm run dist` and electron-builder will use it automatically.

### Code signing
Unsigned builds run fine locally (right-click → Open on macOS the first time).
For distribution to others, add Apple Developer / Windows signing certs per the
[electron-builder code-signing docs](https://www.electron.build/code-signing).

## How it works
- `main.js` opens a `BrowserWindow` pointed at `CC_URL`.
- Off-site links open in your system browser; in-app navigation stays in the window.
- Login/auth is handled by the web app exactly as in the browser.
