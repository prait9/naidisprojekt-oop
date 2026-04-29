# Energia Rakendus

See projekt on täispinu rakendus energiahindade vaatamiseks ja haldamiseks. Lahendus koosneb `frontend` kaustas olevast React + Vite kasutajaliidesest ja `backend` kaustas olevast Node.js + Express API-st, mis suhtleb MySQL andmebaasiga.

## 1. Keskkonna seadistamine

### Vajalikud tööriistad

- `Node.js` soovituslikult versioon `20+`
- `npm` soovituslikult versioon `10+`
- `MySQL` või `MariaDB`, mis toetab Sequelize MySQL draiverit

### Andmebaasi eeldused

Backend kasutab praegu failis `backend/utils/db.js` seadistatud ühendust:

- andmebaasi nimi: `EnergyReadings`
- kasutaja: `root`
- parool: `qwerty`
- host: `localhost`

Enne käivitamist loo oma MySQL serveris see andmebaas:

```sql
CREATE DATABASE EnergyReadings;
```

Kui soovid kasutada teisi andmeid, muuda vastavalt faili `backend/utils/db.js`.

### Sõltuvuste paigaldamine

Paigalda sõltuvused projekti juurkaustas, backendis ja frontendis:

```bash
npm install
cd backend
npm install
cd ../frontend
npm install
```

Windows PowerShellis võib `npm` olla blokeeritud execution policy tõttu. Sel juhul kasuta `npm.cmd`, näiteks:

```bash
npm.cmd install
```

## 2. Andmebaasi migratsioonide käivitamine

### Migratsioonide asukoht

Migratsioonifailid asuvad kaustas `backend/migrations`.

### Kuidas migratsioone käivitada

Mine backendi kausta ja käivita:

```bash
cd backend
npx sequelize-cli db:migrate
```

See loob tabeli `EnergyReadings`, kus hoitakse energiahindade kirjeid.

### Uue migratsiooni loomine

Kui soovid luua uue migratsiooni, kasuta näiteks:

```bash
cd backend
npx sequelize-cli migration:generate --name add-some-change
```

Pärast faili täitmist rakenda see jälle käsuga:

```bash
npx sequelize-cli db:migrate
```

## 3. JSON-andmete importimine

### Kust JSON fail tuleb

Imporditav JSON fail asub siin:

- `backend/data/energy_dump.json`

### Kuidas import käivitada

JSON import tehakse API endpointi kaudu. Kui backend töötab, saada järgmine päring:

```bash
curl -X POST http://localhost:3000/api/import/json
```

See loeb faili `backend/data/energy_dump.json`, valideerib kirjed ja lisab sobivad kirjed andmebaasi allikaga `UPLOAD`.

### Impordi käitumine

- vigased ajatemplid jäetakse vahele
- duplikaadid tuvastatakse `timestamp + location` kombinatsiooni järgi
- vastuses tagastatakse kokkuvõte väljadega `inserted`, `skipped` ja `duplicates_detected`

## 4. Backend’i ja frontend’i käivitamine

### Backend

```bash
cd backend
npm start
```

Backend töötab aadressil:

- `http://localhost:3000`

### Frontend

Käivita frontend eraldi terminalis:

```bash
cd frontend
npm run dev
```

Frontend töötab vaikimisi aadressil:

- `http://localhost:5173`

### Rakenduse tööloogika

- frontend teeb päringuid backendi API-le
- backend loeb ja kirjutab MySQL andmebaasi
- hinnasünkroniseerimine kasutab välist Eleringi API-t

## 5. Testide käivitamine

### Kasutatav testiraamistik

Backendi testid kasutavad Node.js sisseehitatud test runnerit `node:test`.

### Kuidas teste käivitada

Kõik backendi testid saab käivitada projekti juurkaustast ühe käsuga:

```bash
npm test
```

See käivitab tegelikult:

```bash
npm --prefix backend test
```

Soovi korral saab teste käivitada ka otse backendi kaustast:

```bash
cd backend
npm test
```

## 6. Lühike arhitektuuri kirjeldus

### Backend

Backend on ehitatud `Express` raamistikuga. Põhifailid on:

- `backend/index.js`: käivitab serveri ja Sequelize ühenduse
- `backend/app.js`: loob Express rakenduse ja defineerib endpointid
- `backend/services/reading-service.js`: impordi ja cleanup loogika
- `backend/utils/validation.js`: kuupäeva- ja asukohavalideerimine
- `backend/utils/db.js`: Sequelize andmebaasiühendus

### Frontend

Frontend on ehitatud `React` ja `Vite` abil. Peamine kasutajaliides asub failis:

- `frontend/src/App.jsx`

Frontend võimaldab:

- valida kuupäevavahemikku ja regiooni
- sünkroonida hinnad API kaudu
- laadida ja visualiseerida hinnad graafikutel
- kustutada ainult `UPLOAD` allikaga andmed

### Andmebaas

Andmed salvestatakse tabelisse `EnergyReadings`, kus iga kirje sisaldab:

- `timestamp`
- `location`
- `price_eur_mwh`
- `source`
- `createdAt`
- `updatedAt`

## 7. API sisemised endpoint’id

### `GET /api/health`

- eesmärk: kontrollida, kas backend töötab ja kas DB ühendus õnnestub
- sisend: puudub
- näidisvastus:

```json
{
  "status": "ok",
  "db": "ok"
}
```

### `POST /api/import/json`

- eesmärk: importida andmed failist `backend/data/energy_dump.json`
- sisend: puudub
- näidisvastus:

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

### `GET /api/readings`

- eesmärk: tagastada energiahinnad valitud perioodi ja asukoha järgi
- query parameetrid:
  - `start`: ISO 8601 UTC ajatempel, näiteks `2026-01-01T00:00:00Z`
  - `end`: ISO 8601 UTC ajatempel, näiteks `2026-01-02T00:00:00Z`
  - `location`: `EE`, `LV` või `FI`
- näidispäring:

```bash
curl "http://localhost:3000/api/readings?location=EE&start=2026-01-01T00:00:00Z&end=2026-01-02T00:00:00Z"
```

- näidisvastus:

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

### `DELETE /api/readings?source=UPLOAD`

- eesmärk: kustutada ainult need kirjed, mille `source = "UPLOAD"`
- query parameeter:
  - `source=UPLOAD`
- näidisvastus edu korral:

```json
{
  "success": true,
  "deletedCount": 12,
  "message": "Deleted 12 uploaded records."
}
```

- näidisvastus juhul kui kirjeid ei leitud:

```json
{
  "success": true,
  "deletedCount": 0,
  "message": "No UPLOAD records found."
}
```

### `POST /api/sync/prices`

- eesmärk: tuua hinnad Eleringi API-st ja salvestada need allikaga `API`
- request body:

```json
{
  "start": "2026-01-01T00:00:00Z",
  "end": "2026-01-02T00:00:00Z",
  "location": "EE"
}
```

- `start` ja `end` on valikulised; kui neid ei anta, kasutatakse viimase 24 tunni vahemikku
- `location` on valikuline; vaikimisi kasutatakse `EE`
- näidisvastus:

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

## 8. Peamised sõltuvused ja nende eesmärk

### Backend

- `express`: HTTP server ja API endpointide loomine
- `cors`: võimaldab frontendil teha päringuid backendi teisele originile
- `sequelize`: ORM MySQL andmebaasiga suhtlemiseks
- `sequelize-cli`: migratsioonide loomine ja käivitamine
- `mysql2`: MySQL draiver, mida Sequelize kasutab
- `axios`: välise Eleringi API poole HTTP päringute tegemine

### Frontend

- `react`: kasutajaliidese komponentide loomine
- `react-dom`: React rakenduse renderdamine brauserisse
- `vite`: arenduskeskkond ja build tööriist frontendile
- `@mui/material`: kasutajaliidese komponendid
- `@mui/x-charts`: joon- ja tulpdiagrammide kuvamine
- `@emotion/react` ja `@emotion/styled`: MUI stiilisüsteemi sõltuvused

## Soovituslik käivitamisjärjekord

1. Loo MySQL andmebaas `EnergyReadings`.
2. Paigalda sõltuvused juurkaustas, backendis ja frontendis.
3. Käivita backendi migratsioonid.
4. Käivita backend.
5. Käivita frontend.
6. Vajadusel impordi JSON andmed käsuga `POST /api/import/json`.
7. Käivita testid käsuga `npm test`.
