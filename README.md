# Générateur d'Agenda — EJP Cotonou

Application fullstack permettant de générer un agenda mensuel professionnel à partir d'un fichier `.ics` exporté depuis Google Calendar, avec prévisualisation en temps réel et export PDF ou PNG.

---

## Ce que fait l'application

1. **Import du fichier .ics** — glisser-déposer ou sélection manuelle d'un fichier exporté depuis Google Calendar.
2. **Analyse des événements** — le backend extrait tous les événements de Mai 2026, y compris les récurrences hebdomadaires (RRULE) et les événements multi-jours.
3. **Correction timezone** — tous les horaires sont convertis dans le fuseau Africa/Porto-Novo (UTC+1, Cotonou), indépendamment du serveur qui exécute l'application.
4. **Catégorisation automatique** — chaque événement est classé selon son titre :
   - **MPI** (bleu) — titre contient "MPI"
   - **STAFF** (vert) — titre contient "STAFF"
   - **EJP** (violet) — tous les autres
5. **Prévisualisation** — affichage du calendrier directement dans le navigateur, organisé par semaine puis par jour.
6. **Export PDF ou PNG** — génération via Chromium headless (Puppeteer) d'un document A4 paysage haute résolution.

---

## Stack technique

| Composant  | Technologie                                      |
|------------|--------------------------------------------------|
| Frontend   | Next.js 14, TypeScript, Tailwind CSS, Zustand    |
| Backend    | Node.js, Express, Puppeteer, EJS                 |
| Parser ICS | node-ical, date-fns, date-fns-tz                 |
| PDF / PNG  | Puppeteer (Chromium headless)                    |
| Docker     | Docker Compose, Alpine Linux                     |

---

## Prérequis

- **Docker** et **Docker Compose** (méthode recommandée)
- ou **Node.js 20+** et **npm 9+** (développement local sans Docker)

---

## Lancer l'application

### Avec Docker — développement (hot reload)

```bash
docker compose up
```

- Frontend : [http://localhost:3000](http://localhost:3000)
- Backend  : [http://localhost:3001](http://localhost:3001)

Toute modification dans `frontend/` ou `backend/` est prise en compte automatiquement sans redémarrer les conteneurs.

### Avec Docker — production

```bash
docker compose -f docker-compose.prod.yml up --build
```

### Sans Docker

```bash
# Terminal 1 — backend
cd backend
npm install
npm run dev

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
```

---

## Utilisation

1. Ouvrir [http://localhost:3000](http://localhost:3000)
2. Exporter le calendrier depuis Google Calendar au format `.ics`
3. Glisser-déposer le fichier `.ics` dans la zone d'import (ou cliquer pour sélectionner)
4. L'agenda Mai 2026 s'affiche en prévisualisation avec tous les événements regroupés par jour
5. Cliquer sur **Télécharger PDF** ou **Télécharger PNG** pour exporter

---

## Fonctionnalités techniques notables

- **Récurrences RRULE** — les événements répétés hebdomadairement (prières quotidiennes, etc.) sont tous expandés et listés individuellement pour chaque occurrence de Mai 2026.
- **Événements multi-jours** — un événement de 3 jours (ex. jeûne du 20 au 22 mai) génère une entrée sur chacun des jours couverts.
- **Minuit et cross-midnight** — les programmes démarrant à 00h00 (heure locale) sont correctement groupés sous le bon jour, malgré le décalage UTC.
- **Nettoyage des descriptions** — les artefacts Google Meet (liens, séparateurs `~:~`, mentions "do not edit") sont automatiquement supprimés.
- **Indépendance système** — `formatInTimeZone` (date-fns-tz) est utilisé pour tous les affichages d'heure, ce qui rend le résultat identique que le serveur soit en UTC (Docker) ou en UTC+1 (macOS local).

---

## API Backend

### `POST /api/upload-ics`

Analyse un fichier `.ics` et retourne les événements de Mai 2026.

**Requête** : `multipart/form-data`, champ `file` (max 10 Mo, extension `.ics`)

**Réponse 200** :
```json
{
  "success": true,
  "byDay": {
    "2026-05-11": [
      {
        "id": "...",
        "dateKey": "2026-05-11",
        "dayNum": 11,
        "title": "Formation STAFF sur la prière",
        "description": "...",
        "location": "",
        "timeStr": "19:00 – 21:30",
        "isAllDay": false,
        "category": "STAFF",
        "color": "#16A34A",
        "startIso": "2026-05-11T18:00:00.000Z",
        "endIso": "2026-05-11T20:30:00.000Z"
      }
    ]
  },
  "allEvents": [...],
  "meta": {
    "month": "Mai 2026",
    "totalEvents": 69
  }
}
```

**Erreurs** : `400` fichier manquant ou invalide — `500` erreur de parsing

---

### `POST /api/generate`

Génère le calendrier au format PDF ou PNG.

**Requête** : `application/json`
```json
{ "byDay": { ... }, "format": "pdf" }
```

| Paramètre | Valeurs              | Description                        |
|-----------|----------------------|------------------------------------|
| byDay     | Object               | Données issues de `/upload-ics`    |
| format    | `pdf`, `png`, `both` | Format de sortie                   |

**Réponse** :
- `pdf` → `application/pdf`
- `png` → `image/png`
- `both` → JSON avec champs `pdf` et `png` en base64

**Erreurs** : `400` données invalides — `500` erreur Puppeteer

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
│   │   │   ├── upload.controller.js      # Réception et validation du fichier .ics
│   │   │   └── generate.controller.js    # Déclenchement de la génération PDF/PNG
│   │   ├── services/
│   │   │   ├── icsParser.service.js      # Parsing, expansion RRULE, gestion timezone
│   │   │   ├── calendarBuilder.service.js # Mise en forme des données pour le template
│   │   │   └── render.service.js         # Rendu Puppeteer → PDF/PNG
│   │   ├── templates/
│   │   │   └── calendar.ejs              # Template HTML du calendrier imprimable
│   │   └── index.js                      # Entrée Express
│   └── package.json
├── frontend/
│   ├── app/
│   │   ├── components/
│   │   │   ├── UploadZone.tsx            # Zone de dépôt du fichier .ics
│   │   │   ├── CalendarPreview.tsx       # Prévisualisation de l'agenda par semaine/jour
│   │   │   └── DownloadButtons.tsx       # Boutons PDF et PNG
│   │   ├── api/[...path]/route.ts        # Proxy runtime vers le backend (Docker-safe)
│   │   ├── store/calendarStore.ts        # État global Zustand
│   │   └── page.tsx
│   └── package.json
├── docker/
│   ├── Dockerfile.backend.dev            # Image dev avec Chromium + dépendances
│   ├── Dockerfile.backend                # Image production backend
│   └── Dockerfile.frontend              # Image production frontend
├── docker-compose.yml                    # Dev : hot reload nodemon + Next.js
├── docker-compose.prod.yml               # Production
└── README.md
```

---

## Logs

```bash
docker compose logs -f backend
docker compose logs -f frontend
```

---

## Licence

MIT
