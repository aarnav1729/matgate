# MatGate — Material Movement Control System

Scan-based RM movement control system for Stores → Production material issuance, with QR code labels, receipt tracking, and full audit trail.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Seed the SAP material master data into MongoDB
npm run seed

# 3. Start the server
npm start
```

Open [http://localhost:3000](http://localhost:3000)

## Default Credentials

| Role       | Username     | Password    |
|------------|-------------|-------------|
| Stores     | `stores`    | `stores123` |
| Production | `production`| `prod123`   |
| Admin      | `admin`     | `admin123`  |

## Features

### Material Master (CRUD)
- Full search, sort, filter by Type/Group/UoM
- Multi-select rows
- Export to Excel (all, filtered, or selected)
- Add / Edit / Delete materials

### Material Issuance (Stores Role)
- Select material via autocomplete dropdown (code & description)
- Auto-fills description, type, UoM from master
- Enter quantity + DMR number
- Date/time auto-captured in IST
- Generates printable label with QR code
- QR encodes: Issuance ID, Material Code, Description, Qty, DMR, Issued By, Date

### Scan & Receive (Production Role)
- Camera-based QR scanning (uses device camera)
- Manual issuance ID lookup fallback
- Confirm receipt or reject with remarks
- Full audit trail of who received and when

### Issuance History
- All issuances with search, status filter, date range
- Sortable columns
- View full details + QR for any issuance
- Re-print labels from history
- Export to Excel

### Dashboard
- Stats: total, pending, received, today's count
- Recent issuances table

## Tech Stack
- **Backend:** Node.js, Express, Mongoose (MongoDB Atlas)
- **Frontend:** React 18 (CDN), Vanilla CSS
- **QR:** `qrcode` (server-side generation), `jsQR` (client-side scanning)
- **Export:** SheetJS (XLSX)

## Project Structure

```
matgate/
├── server.js              # Express server + MongoDB connection
├── seed.js                # Seed script (reads Excel → MongoDB)
├── package.json
├── Material_codes_list_-_13_03_2026.xlsx  # SAP master file
├── models/
│   ├── Material.js        # Material master schema
│   ├── User.js            # User + bcrypt auth
│   └── Issuance.js        # Issuance tracking schema
├── middleware/
│   └── auth.js            # JWT authentication
├── routes/
│   ├── auth.js            # Login, setup
│   ├── materials.js       # CRUD + search + export
│   └── issuances.js       # Issue, receive, scan, stats
└── public/
    └── index.html         # React SPA
```

## Environment Variables (optional)

| Variable    | Default                          |
|-------------|----------------------------------|
| `PORT`      | `3000`                           |
| `MONGO_URI` | MongoDB Atlas connection string  |
| `JWT_SECRET`| `matgate-secret-key-2026`        |
