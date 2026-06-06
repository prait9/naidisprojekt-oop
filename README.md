# Energiahinna rakendus

Täispinu rakendus elektrihindade importimiseks, sünkroonimiseks, kuvamiseks ja haldamiseks. Projekt koosneb Node.js + Express backendist, React + Vite frontendist ja MySQL andmebaasist.

## 1. Keskkonna seadistamine (Environment setup)

### Vajalikud tööriistad

- Node.js 20 või uuem
- npm 10 või uuem
- MySQL 8 või MariaDB ühilduv versioon
- Git

Pythonit ja Dockerit selle projekti käivitamiseks vaja ei ole.

### Projekti allalaadimine

```bash
git clone <repository-url>
cd naidisprojekt
```

Kui projekt on juba arvutis olemas, liigu projekti juurkausta.

### Andmebaasi loomine

Backend kasutab vaikimisi MySQL andmebaasi nimega `EnergyReadings`.

Loo andmebaas MySQL-is:

```sql
CREATE DATABASE EnergyReadings;
```

Rakenduse runtime ühendus asub failis `backend/utils/db.js`. Sequelize migratsioonide ühendus asub failis `backend/config/config.json`. Mõlemas peab olema sama andmebaasi nimi, kasutaja, parool ja host.

Vaikimisi väärtused:

- database: `EnergyReadings`
- username: `root`
- password: `qwerty`
- host: `localhost`
- dialect: `mysql`

### Sõltuvuste paigaldamine

Paigalda sõltuvused juurkaustas, backendis ja frontendis:

```bash
npm install
cd backend
npm install
cd ../frontend
npm install
```

Windows PowerShellis võib `npm` olla execution policy tõttu blokeeritud. Sel juhul kasuta sama käsu `.cmd` varianti:

```bash
npm.cmd install
```

## 2. Andmebaasi migratsioonide käivitamine (How to run migrations)

Migratsioonid asuvad kaustas `backend/migrations`.

### Migratsioonide käivitamine

Mine backend kausta ja käivita:

```bash
cd backend
npx sequelize-cli db:migrate
```

See loob tabeli `EnergyReadings`, kuhu salvestatakse elektrihinna kirjed.

### Uue migratsiooni loomine

Uue migratsioonifaili loomiseks:

```bash
cd backend
npx sequelize-cli migration:generate --name migration-name
```

Pärast migratsioonifaili täitmist rakenda muudatus:

```bash
npx sequelize-cli db:migrate
```

### Migratsiooni tagasivõtmine

Viimase migratsiooni tagasivõtmiseks:

```bash
npx sequelize-cli db:migrate:undo
```

## 3. JSON-andmete importimine (How to import JSON data)

Imporditav JSON fail asub siin:

```text
backend/data/energy_dump.json
```

Backend loeb selle faili endpointi kaudu. Käivita backend ja saada POST päring:

```bash
curl -X POST http://localhost:3000/api/import/json
```

Import teeb järgmist:

- loeb andmed failist `backend/data/energy_dump.json`
- valideerib timestamp väärtused ISO 8601 UTC formaadis
- jätab vigased timestampid vahele
- kontrollib duplikaate `timestamp + location` järgi
- salvestab korrektsed read allikaga `UPLOAD`

Eduka impordi vastuses on kokkuvõte:

```json
{
  "success": true,
  "summary": {
    "inserted": 1,
    "skipped": 2,
    "duplicates_detected": 1
  },
  "message": "Import completed: inserted=1, skipped=2, duplicates_detected=1"
}
```

## 4. Backend'i ja frontend'i käivitamine (How to run backend and frontend)

### Backend

Käivita backend eraldi terminalis:

```bash
cd backend
npm start
```

Backend töötab aadressil:

```text
http://localhost:3000
```

Health check:

```text
http://localhost:3000/api/health
```

### Frontend

Käivita frontend teises terminalis:

```bash
cd frontend
npm run dev
```

Frontend töötab Vite arendusserveris tavaliselt aadressil:

```text
http://localhost:5173
```

Frontend eeldab, et backend töötab aadressil `http://localhost:3000`.

## 5. Testide käivitamine (How to run tests)

Backend testid kasutavad Node.js sisseehitatud testiraamistikku `node:test`.

Kõik testid käivituvad projekti juurkaustast ühe käsuga:

```bash
npm test
```

Windows PowerShellis võib vaja minna:

```bash
npm.cmd test
```

Juurkausta testikäsk käivitab backendi testid:

```bash
npm --prefix backend test
```

Otse backend kaustast saab teste käivitada nii:

```bash
cd backend
npm test
```

Testid kontrollivad muu hulgas JSON importi, timestamp valideerimist, duplikaatide tuvastamist ja `UPLOAD` andmete kustutamist.

## 6. Lühike arhitektuuri kirjeldus (Brief architecture description)

Projekt on jaotatud kolmeks põhiosaks.

### Backend

Backend asub kaustas `backend` ja on ehitatud Express raamistikuga.

Olulised failid:

- `backend/index.js` - loob Sequelize mudeli, sünkroonib andmebaasi ja käivitab serveri
- `backend/app.js` - defineerib API endpointid ja globaalse error handler'i
- `backend/services/reading-service.js` - sisaldab JSON impordi ja cleanup loogikat
- `backend/utils/validation.js` - valideerib kuupäevi ja regioone
- `backend/utils/db.js` - loob Sequelize andmebaasiühenduse
- `backend/models/energy-reading.js` - defineerib `EnergyReadings` tabeli mudeli

Backend suhtleb MySQL andmebaasiga Sequelize ORM-i kaudu. Välisest Eleringi API-st hindade toomiseks kasutatakse Axios teeki.

### Frontend

Frontend asub kaustas `frontend` ja on ehitatud React + Vite abil.

Olulised failid:

- `frontend/src/App.jsx` - peamine kasutajaliides ja API päringud
- `frontend/src/App.css` - rakenduse stiilid
- `frontend/src/main.jsx` - React rakenduse mountimine

Frontend võimaldab valida kuupäevavahemiku ja regiooni, sünkroonida hindu, vaadata graafikuid ning kustutada ainult `UPLOAD` allikaga andmeid.

### Andmebaas

Andmed salvestatakse MySQL tabelisse `EnergyReadings`.

Tabeli peamised väljad:

- `timestamp` - elektrihinna ajatempel
- `location` - regioon, näiteks `EE`, `LV` või `FI`
- `price_eur_mwh` - hind eurodes MWh kohta
- `source` - andmete allikas, kas `UPLOAD` või `API`
- `createdAt` ja `updatedAt` - Sequelize ajatemplid

## 7. API sisemised endpoint'id (Document API internal endpoints)

### GET `/api/health`

Kontrollib, kas backend töötab ja kas andmebaasiühendus on korras.

Sisend puudub.

Näidisvastus:

```json
{
  "status": "ok",
  "db": "ok"
}
```

### POST `/api/import/json`

Impordib andmed failist `backend/data/energy_dump.json`.

Sisend puudub.

Näidisvastus:

```json
{
  "success": true,
  "summary": {
    "inserted": 10,
    "skipped": 3,
    "duplicates_detected": 2
  },
  "message": "Import completed: inserted=10, skipped=3, duplicates_detected=2"
}
```

### GET `/api/readings`

Tagastab elektrihinna kirjed valitud perioodi ja regiooni järgi.

Query parameetrid:

- `start` - ISO 8601 UTC timestamp koos ajavööndi infoga, näiteks `2026-01-01T00:00:00Z`
- `end` - ISO 8601 UTC timestamp koos ajavööndi infoga, näiteks `2026-01-02T00:00:00Z`
- `location` - lubatud väärtused on `EE`, `LV`, `FI`

Reegel: `end` peab olema suurem kui `start`.

Näidispäring:

```bash
curl "http://localhost:3000/api/readings?location=EE&start=2026-01-01T00:00:00Z&end=2026-01-02T00:00:00Z"
```

Näidisvastus:

```json
{
  "success": true,
  "data": [],
  "count": 0,
  "location": "EE",
  "dateRange": {
    "start": "2026-01-01T00:00:00Z",
    "end": "2026-01-02T00:00:00Z"
  }
}
```

Validation error näide:

```json
{
  "success": false,
  "error": "start must be a valid ISO 8601 UTC timestamp with timezone info"
}
```

### DELETE `/api/readings?source=UPLOAD`

Kustutab ainult kirjed, mille `source` on `UPLOAD`.

See endpoint ei kustuta `API` allikaga ridu.

Query parameeter:

- `source=UPLOAD`

Näidispäring:

```bash
curl -X DELETE "http://localhost:3000/api/readings?source=UPLOAD"
```

Näidisvastus, kui kirjed kustutati:

```json
{
  "success": true,
  "deletedCount": 12,
  "message": "Deleted 12 uploaded records."
}
```

Näidisvastus, kui `UPLOAD` kirjeid ei olnud:

```json
{
  "success": true,
  "deletedCount": 0,
  "message": "No UPLOAD records found."
}
```

### POST `/api/sync/prices`

Toob elektrihinnad Eleringi API-st ja salvestab need andmebaasi allikaga `API`.

Request body:

```json
{
  "start": "2026-01-01T00:00:00Z",
  "end": "2026-01-02T00:00:00Z",
  "location": "EE"
}
```

`start` ja `end` on valikulised. Kui neid ei saadeta, kasutatakse viimase 24 tunni vahemikku. `location` on samuti valikuline ja vaikimisi `EE`.

Näidisvastus:

```json
{
  "success": true,
  "summary": {
    "inserted": 5,
    "updated": 19,
    "skipped": 0
  },
  "message": "API data fetch completed: inserted=5, updated=19, skipped=0",
  "location": "EE",
  "dateRange": {
    "start": "2026-01-01T00:00:00.000Z",
    "end": "2026-01-02T00:00:00.000Z"
  }
}
```

### Error handling

Kõik API vead tagastatakse turvalise JSON vastusena. Stack trace'i kasutajale ei tagastata.

Näide:

```json
{
  "success": false,
  "error": "end must be greater than start"
}
```

## 8. Peamised sõltuvused ja nende eesmärk (Key dependencies and their purpose)

### Backend

- `express` - HTTP server ja API endpointide defineerimine
- `cors` - lubab frontendil teha päringuid backendi aadressile
- `sequelize` - ORM MySQL andmebaasiga suhtlemiseks
- `sequelize-cli` - migratsioonide loomine ja käivitamine
- `mysql2` - MySQL draiver Sequelize jaoks
- `axios` - HTTP päringud välise Eleringi API vastu
- `node:test` - Node.js sisseehitatud testiraamistik backendi testide jaoks

### Frontend

- `react` - kasutajaliidese komponentide loomine
- `react-dom` - React rakenduse renderdamine brauserisse
- `vite` - frontend arendusserver ja build tööriist
- `@mui/material` - Material UI komponendid
- `@mui/x-charts` - joondiagrammid ja tulpdiagrammid hindade kuvamiseks
- `@emotion/react` - MUI stiilide runtime tugi
- `@emotion/styled` - styled API MUI komponentide jaoks
- `eslint` - JavaScripti ja React koodi staatiline kontroll

## Soovituslik käivitamisjärjekord

1. Paigalda Node.js, npm ja MySQL.
2. Loo MySQL andmebaas `EnergyReadings`.
3. Kontrolli DB seadeid failides `backend/utils/db.js` ja `backend/config/config.json`.
4. Paigalda sõltuvused juurkaustas, backendis ja frontendis.
5. Käivita migratsioonid käsuga `npx sequelize-cli db:migrate`.
6. Käivita backend käsuga `npm start`.
7. Käivita frontend käsuga `npm run dev`.
8. Impordi vajadusel JSON andmed endpointiga `POST /api/import/json`.
9. Käivita testid käsuga `npm test`.
