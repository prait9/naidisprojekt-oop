# Energia rakendus - Moodul 1

Projekt koosneb frontendist (React + Vite) ja backendist (Node.js + Express).

## Eeldused

- Node.js
- MySQL andmebaas (`naidisprojekt`)
- Credentials: `root` / `qwerty`

## Kiirstart

### 1. Backend käivitamine

```bash
cd backend
npm install
npx sequelize-cli db:migrate
npm start
```

Backend käivitub: `http://localhost:3000`

### 2. Frontend käivitamine

Uues terminalis:

```bash
cd frontend
npm install
npm run dev
```

Frontend käivitub: `http://localhost:5173`

## Funktsionaalsus

✅ Health endpoint (`GET /api/health`)
✅ Frontend näitab backendi ja DB staarust
✅ Migratsioon loob `EnergyReadings` tabeli

## Tabel struktuuri

`EnergyReadings`:
- `id` (Primary Key, Auto-increment)
- `timestamp` (DATE, NOT NULL)
- `location` (STRING, NOT NULL)
- `price_eur_mwh` (FLOAT, nullable)
- `source` (ENUM: 'UPLOAD' või 'API')
- `createdAt` (DATETIME)
- `updatedAt` (DATETIME)
