# Code name-Poseidon Watch
### MSDIS — Maritime Search and Rescue Decision Information System

A full-stack maritime web application providing drift prediction and SAR decision support for Maritime Search and Rescue Coordination.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Backend | Python Flask |
| Map | Mapbox GL JS |
| Deployment | Render |

---

## Features

- Real-time drift prediction
- SAR search pattern visualizer
- AI-powered admin panel
- Coordinate converter (DD, DMS, DDM, Signed Decimal)
- Custom Mapbox dark maritime style
- User management and approvals

---

## Local Development

### Prerequisites
- Python 3.11+
- Node.js 18+

### Backend Setup
```bash
pip install -r requirements.txt
python main.py
```

### Frontend Setup
```bash
npm install
npm run dev
```

---

## Deployment

Deployed via [Render](https://render.com) using `render.yaml` config.

Environment variables required:
- `MAPBOX_TOKEN` — your Mapbox public token
- `SECRET_KEY` — Flask secret key
- `FLASK_ENV` — set to `production`
- `ADMIN_PASSWORD` — admin account password. Created or reset on every startup. Never commit it.
- `ADMIN_USERNAME` — optional, defaults to `Admin`

Environment variables for real weather data (without these the app runs on SIMULATED data and shows a red warning):
- `OPENWEATHERMAP_API_KEY` — live wind
- `COPERNICUS_USERNAME` / `COPERNICUS_PASSWORD` — live ocean currents

---

## Project Structure

```
poseidon-watch/
├── main.py              # Flask entry point
├── requirements.txt     # Python dependencies
├── package.json         # Node dependencies
├── Procfile             # Deployment start command
├── render.yaml          # Render deployment config
├── src/                 # React frontend
│   ├── components/
│   ├── App.jsx
│   └── main.jsx
└── index.html
```

---

*Built for maritime Search and Rescue Coordination — MSDIS Project*
