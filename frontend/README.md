The web app lives in this folder. Setup, architecture, and demo steps are in the [root README](../README.md).

```bash
npm install
npm run dev
```

Vite (http://localhost:5173) proxies `/api` to the Express server on port 3001. It reads `VITE_GOOGLE_MAPS_API_KEY` from the **repo-root** `.env` (`envDir: ".."` in `vite.config.ts`).
