# Générateur d'Agenda EJP – Cotonou

Une application fullstack permettant de générer un agenda mensuel professionnel (Mai 2026) à partir d'un fichier `.ics`, avec prévisualisation et export en PDF ou PNG.

## Fonctionnalités

- Import de fichier `.ics` par glisser-déposer ou sélection
- Analyse et filtrage des événements de Mai 2026
- Catégorisation automatique : **MPI** (bleu), **STAFF** (vert), **EJP** (violet)
- Prévisualisation du calendrier en temps réel dans le navigateur
- Export **PDF A4 paysage** (via Puppeteer)
- Export **PNG haute résolution** (via Puppeteer)
- Interface 100% en français avec messages d'erreur conviviaux

---

## Stack technique

| Composant  | Technologie                                |
|------------|--------------------------------------------|
| Frontend   | Next.js 14, TypeScript, Tailwind CSS, Zustand |
| Backend    | Node.js, Express, Puppeteer, EJS           |
| Parser ICS | node-ical, date-fns, date-fns-tz           |
| PDF/PNG    | Puppeteer (Chromium headless)              |
| Docker     | Docker Compose, Alpine Linux               |

---

## Prérequis

- **Node.js 20+** et **npm 9+**
- **Docker** et **Docker Compose** (pour le déploiement conteneurisé)
- Système : macOS, Linux, ou Windows (WSL2)

---

## Installation et démarrage en développement local

### 1. Backend

```bash
cd backend
npm install
npm run dev       # Démarre sur http://localhost:3001
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev       # Démarre sur http://localhost:3000
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

> **Note** : Le frontend proxifie automatiquement `/api/*` vers `http://localhost:3001/api/*` via `next.config.js`.

---

## Déploiement Docker

### Build et lancement

```bash
# Depuis la racine du projet
docker compose up --build
```

- Frontend : [http://localhost:3000](http://localhost:3000)
- Backend  : [http://localhost:3001](http://localhost:3001)

### Arrêt

```bash
docker compose down
```

### Logs

```bash
docker compose logs -f backend
docker compose logs -f frontend
```

---

## Documentation API

### `POST /api/upload-ics`

Analyse un fichier `.ics` et retourne les événements de Mai 2026.

**Requête** : `multipart/form-data`
| Champ | Type   | Description          |
|-------|--------|----------------------|
| file  | File   | Fichier `.ics` (max 10 Mo) |

**Réponse 200** :
```json
{
  "success": true,
  "byDay": {
    "2026-05-15": [
      {
        "id": "...",
        "dateKey": "2026-05-15",
        "dayNum": 15,
        "title": "MPI Formation - Module 3",
        "description": "Salle de conférence B",
        "location": "Cotonou",
        "timeStr": "08:00 – 17:00",
        "isAllDay": false,
        "category": "MPI",
        "color": "#2563EB",
        "startIso": "2026-05-15T08:00:00.000Z",
        "endIso": "2026-05-15T17:00:00.000Z"
      }
    ]
  },
  "allEvents": [...],
  "meta": {
    "month": "Mai 2026",
    "totalEvents": 12
  }
}
```

**Erreurs** :
- `400` : fichier manquant, extension invalide, type MIME invalide
- `500` : erreur d'analyse

---

### `POST /api/generate`

Génère le calendrier au format PDF ou PNG.

**Requête** : `application/json`
```json
{
  "byDay": { ... },
  "format": "pdf"
}
```

| Paramètre | Valeurs          | Description                      |
|-----------|------------------|----------------------------------|
| byDay     | Object           | Données issues de `/upload-ics` |
| format    | `pdf`, `png`, `both` | Format de sortie            |

**Réponse** :
- `format=pdf`  → `application/pdf` (binaire)
- `format=png`  → `image/png` (binaire)
- `format=both` → `application/json` avec champs `pdf` et `png` en base64

**Erreurs** :
- `400` : données ou format invalide
- `500` : erreur Puppeteer

---

### `GET /health`

```json
{ "status": "ok", "timestamp": "2026-05-06T10:00:00.000Z" }
```

---

## Structure du projet

```
agenda-generator/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── upload.controller.js
│   │   │   └── generate.controller.js
│   │   ├── services/
│   │   │   ├── icsParser.service.js
│   │   │   ├── calendarBuilder.service.js
│   │   │   └── render.service.js
│   │   ├── templates/
│   │   │   └── calendar.ejs
│   │   └── index.js
│   └── package.json
├── frontend/
│   ├── app/
│   │   ├── components/
│   │   │   ├── UploadZone.tsx
│   │   │   ├── CalendarPreview.tsx
│   │   │   └── DownloadButtons.tsx
│   │   ├── store/
│   │   │   └── calendarStore.ts
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── package.json
├── docker/
│   ├── Dockerfile.backend
│   └── Dockerfile.frontend
├── docker-compose.yml
└── README.md
```

---

## Catégories d'événements

| Catégorie | Couleur | Détection                         |
|-----------|---------|-----------------------------------|
| MPI       | Bleu `#2563EB`  | Titre contient "MPI"     |
| STAFF     | Vert `#16A34A`  | Titre contient "STAFF"   |
| EJP       | Violet `#7C3AED`| Par défaut                |

---

## Licence

MIT
