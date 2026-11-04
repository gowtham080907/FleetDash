# Frontend connection settings

Use the supplied `.env.example` as the frontend `.env` template when running with the real backend:

```dotenv
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_DEMO_MODE=false
```

Restart the Vite dev server after changing environment variables. Keep your frontend's existing API client and Socket.IO service; this integration package is designed to preserve the existing backend API and socket contract.
