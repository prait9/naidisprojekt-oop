# Energia rakendus

Projekt koosneb frontendist (React) ja backendist (Node.js + Express).

## Eeldused

- Node.js (lubatud versioon)
- MySQL andmebaas

## Installatsioon

### Backend

```bash
cd backend
npm install
npx sequelize-cli db:migrate
```

### Frontend

```bash
cd frontend
npm run dev
```

## Käivitamine

### 1. Backend käivitamine

```bash
cd backend
node index.js
```

Server käivitub pordi 3000 peal: `http://localhost:3000`

### 2. Frontend käivitamine

Uues terminalis:

```bash
cd frontend
node index.js
```

Frontend käivitub: `http://localhost:5173`

## Funktsionaalsus

- **GET /api/health** - Tagastab backendi ja andmebaasi staatuse
- Frontend kuvab backendi staatus
- Andmebaasi migratsioon loob `EnergyReadings` tabeli

## Projekti ühendus

Frontend teeb `GET` päringu `http://localhost:3000/api/health` ja kuvab tulemuse
