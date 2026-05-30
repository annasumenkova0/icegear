# IceGear

Talvespordivarustuse kataloog koos toodete võrdluse ja hindade jälgimisega.

## Nõuded

- [Node.js 22+](https://nodejs.org/en/download) (kasutab sisseehitatud SQLite moodulit)

## Seadistamine

```bash
git clone <repo-url>
cd icegear
npm start
```

Server käivitub aadressil [http://localhost:3000](http://localhost:3000)

## Kraapija (valikuline)

Andmebaasi täitmine tootedega hind.ee-st:

```bash
cd scraper
npm ci
npm start
```

## Struktuur

```txt
├── server.js          # HTTP server
├── src/
│   ├── schema.sql     # Andmebaasi skeem
│   ├── lib/db.js      # SQLite ühendus
│   ├── lib/static.js  # Staatiliste failide käsitleja
│   └── routes/api.js  # REST API lõpp-punktid
├── public/            # Kasutajaliides
└── scraper/           # Andmete kraapija (eraldi tööriist)
```

---

# English

Winter sports equipment catalog with product comparison and price tracking.

## Requirements

- [Node.js 22+](https://nodejs.org/en/download) (uses built-in SQLite module)

## Setup

```bash
git clone <repo-url>
cd icegear
npm start
```

Server starts at [http://localhost:3000](http://localhost:3000)

## Scraper (optional)

Populate the database with product data from hind.ee:

```bash
cd scraper
npm ci
npm start
```

## Structure

```txt
├── server.js          # HTTP server
├── src/
│   ├── schema.sql     # Database schema
│   ├── lib/db.js      # SQLite connection
│   ├── lib/static.js  # Static file handler
│   └── routes/api.js  # REST API endpoints
├── public/            # Frontend
└── scraper/           # Data scraper (separate tool)
```
