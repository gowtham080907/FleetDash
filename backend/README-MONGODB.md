# MongoDB integration notes

See the package-level `README.md` and `../docs/` for the full setup, database design, frontend integration, migration, and test instructions.

Quick start from this folder:

```powershell
Copy-Item .env.example .env
docker compose up -d
npm install
npm run dev
```

In another terminal:

```powershell
npm run db:verify
npm test
```
