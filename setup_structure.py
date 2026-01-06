#!/usr/bin/env python3
from pathlib import Path
import textwrap
import json

ROOT = Path(__file__).parent

FILES = {
    "electron/main.js": r"""
        const { app, BrowserWindow, ipcMain } = require('electron');
        const path = require('path');

        const isDev = !app.isPackaged;

        let mainWindow;

        function createWindow() {
          mainWindow = new BrowserWindow({
            width: 1280,
            height: 800,
            webPreferences: {
              preload: path.join(__dirname, 'preload.js'),
              contextIsolation: true,
              nodeIntegration: false
            }
          });

          if (isDev) {
            mainWindow.loadURL('http://localhost:5173');
            mainWindow.webContents.openDevTools();
          } else {
            mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
          }

          mainWindow.on('closed', () => {
            mainWindow = null;
          });
        }

        app.whenReady().then(() => {
          createWindow();

          app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) createWindow();
          });
        });

        app.on('window-all-closed', () => {
          if (process.platform !== 'darwin') app.quit();
        });

        // пример IPC
        ipcMain.handle('ping', () => 'pong from main');
    """,

    "electron/preload.js": r"""
        const { contextBridge, ipcRenderer } = require('electron');

        contextBridge.exposeInMainWorld('electronAPI', {
          ping: () => ipcRenderer.invoke('ping')
        });
    """,

    "src/App.tsx": r"""
        import React, { useState } from 'react';

        const App: React.FC = () => {
          const [pingResult, setPingResult] = useState('');

          const handlePing = async () => {
            const res = await window.electronAPI.ping();
            setPingResult(res);
          };

          return (
            <div style={{ padding: 16 }}>
              <h1>Twitch Mod Dashboard</h1>
              <button onClick={handlePing}>Ping main</button>
              <p>{pingResult}</p>
            </div>
          );
        };

        export default App;
    """,

    "src/main.tsx": r"""
        import React from 'react';
        import ReactDOM from 'react-dom/client';
        import App from './App';

        ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
          <React.StrictMode>
            <App />
          </React.StrictMode>
        );
    """,

    "src/vite-env.d.ts": r"""
        interface ElectronAPI {
          ping: () => Promise<string>;
        }

        declare global {
          interface Window {
            electronAPI: ElectronAPI;
          }
        }

        export {};
    """,

    "tsconfig.json": r"""
        {
          "compilerOptions": {
            "target": "ESNext",
            "module": "ESNext",
            "jsx": "react-jsx",
            "moduleResolution": "Node",
            "strict": true,
            "esModuleInterop": true,
            "skipLibCheck": true,
            "resolveJsonModule": true,
            "allowSyntheticDefaultImports": true,
            "baseUrl": ".",
            "paths": {
              "@/*": ["src/*"]
            },
            "types": ["vite/client"]
          },
          "include": ["src", "vite.config.ts"]
        }
    """,

    "vite.config.ts": r"""
        import { defineConfig } from 'vite';
        import react from '@vitejs/plugin-react';

        export default defineConfig({
          plugins: [react()],
          build: {
            outDir: 'dist/renderer'
          }
        });
    """,

    "index.html": r"""
        <!doctype html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <title>Twitch Mod Dashboard</title>
          </head>
          <body>
            <div id="root"></div>
            <script type="module" src="/src/main.tsx"></script>
          </body>
        </html>
    """
}


def create_files():
    for rel_path, raw_content in FILES.items():
        path = ROOT / rel_path
        path.parent.mkdir(parents=True, exist_ok=True)

        content = textwrap.dedent(raw_content).lstrip("\n")

        if path.exists():
            print(f"[СКИП] {rel_path} уже существует, не трогаю")
            continue

        path.write_text(content, encoding="utf-8")
        print(f"[OK]   Создан файл {rel_path}")


def patch_package_json():
    pkg_path = ROOT / "package.json"
    if not pkg_path.exists():
        print("[WARN] package.json не найден, пропускаю его правку")
        return

    try:
        data = json.loads(pkg_path.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"[ERR]  Не удалось прочитать package.json: {e}")
        return

    changed = False

    # main
    if data.get("main") != "electron/main.js":
        data["main"] = "electron/main.js"
        changed = True
        print("[OK]   Поле main в package.json установлено в 'electron/main.js'")

    # scripts
    scripts = data.setdefault("scripts", {})

    desired_scripts = {
        "dev:renderer": "vite",
        "dev:electron": "wait-on http://localhost:5173 && electron .",
        "dev": 'concurrently -k "npm run dev:renderer" "npm run dev:electron"',
        "build:renderer": "vite build"
    }

    for name, value in desired_scripts.items():
        if name in scripts:
            if scripts[name] == value:
                print(f"[СКИП] script '{name}' уже есть и совпадает")
            else:
                print(
                    f"[КОНФЛИКТ] script '{name}' уже существует с другим значением, "
                    "оставляю как есть"
                )
            continue

        scripts[name] = value
        changed = True
        print(f"[OK]   Добавлен script '{name}' в package.json")

    if changed:
        pkg_path.write_text(
            json.dumps(data, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8"
        )
        print("[OK]   package.json обновлён")
    else:
        print("[СКИП] package.json уже содержит нужные поля, изменений нет")


def main():
    create_files()
    patch_package_json()


if __name__ == "__main__":
    main()