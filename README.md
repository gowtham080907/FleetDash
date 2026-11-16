Create a .env file from the example:

cp .env.example .env
Variable	Description	Default
VITE_API_BASE_URL	Backend REST API endpoint	http://localhost:5000/api
VITE_SOCKET_URL	Socket.IO server endpoint	http://localhost:5000
VITE_DEMO_MODE	Deterministic demo telemetry generator	true
Development Server
npm run dev
Navigate to http://localhost:5173/ in your browser.
Click "Instant Demo Login" on the login screen to enter the command center immediately.

7. Verification & Production Build
Run Automated Unit Tests (Vitest)
npm test
Runs 28 automated tests across 7 test suites validating:

32-Byte Binary packet decoder and Little-Endian byte offset reading
Coordinate boundary validation
Spatial Map position buffering
Canvas rendering coordinate projection and culling algorithms
Zustand auth and alert stores
Mock REST API vehicle filtering and queries
Run Strict TypeScript Type Check
npx tsc --noEmit
Build Optimized Production Bundle
npm run build
Generates production artifacts in dist/ with optimized vendor chunking:

leaflet-vendor: Leaflet GIS runtime
recharts-vendor: Data analytics visualization engine
react-vendor: React DOM and core dependencies
Granular lazy-loaded page chunks with gzip compression
Create a .env file from the example:

cp .env.example .env
Variable	Description	Default
VITE_API_BASE_URL	Backend REST API endpoint	http://localhost:5000/api
VITE_SOCKET_URL	Socket.IO server endpoint	http://localhost:5000
VITE_DEMO_MODE	Deterministic demo telemetry generator	true
Development Server
npm run dev
Navigate to http://localhost:5173/ in your browser.
Click "Instant Demo Login" on the login screen to enter the command center immediately.

7. Verification & Production Build
Run Automated Unit Tests (Vitest)
npm test
Runs 28 automated tests across 7 test suites validating:

32-Byte Binary packet decoder and Little-Endian byte offset reading
Coordinate boundary validation
Spatial Map position buffering
Canvas rendering coordinate projection and culling algorithms
Zustand auth and alert stores
Mock REST API vehicle filtering and queries
Run Strict TypeScript Type Check
npx tsc --noEmit
Build Optimized Production Bundle
npm run build
Generates production artifacts in dist/ with optimized vendor chunking:

leaflet-vendor: Leaflet GIS runtime
recharts-vendor: Data analytics visualization engine
react-vendor: React DOM and core dependencies
Granular lazy-loaded page chunks with gzip compression
