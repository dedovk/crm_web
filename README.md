# React + Vite

## Run the built application

Do not open `dist/index.html` directly with `file://`. Serve it over HTTP so browser modules and API requests work.

```bash
npm install
npm run build
npm start
```

Open `http://localhost:3002/` in a browser. Copy `dist`, `server.js`, `DataBase`, `package.json`, and `package-lock.json` to the other computer, then run the same commands there.

## Windows automatic startup

After building the project, run PowerShell once from the project folder:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\install-crm-autostart.ps1
```

Windows Task Scheduler will start the server automatically after your user logs in. The server log is written to `logs/crm-server.log`. Open `http://localhost:3002/` to use the app.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
