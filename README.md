# 🚛 Fleet Tracker

Assholeeeeeee 



Real-time GPS vehicle tracking system with Google Maps integration.

![Fleet Tracker](https://img.shields.io/badge/Python-FastAPI-green)
![React](https://img.shields.io/badge/React-18-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Features

- 📍 **Real-time GPS Tracking** - Live vehicle location updates
- 🗺️ **Google Maps Integration** - Interactive map with multiple view modes
- 📊 **Dashboard & Analytics** - Fleet statistics and insights
- ⚡ **WebSocket Support** - Instant position updates
- 🔐 **Device Authentication** - Secure GPS device integration
- 📱 **Responsive Design** - Works on desktop and mobile

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
- PostgreSQL (optional, SQLite works for development)
- Google Maps API Key

### Backend Setup

1. **Clone the repository:**
```bash
git clone https://github.com/YOUR_USERNAME/fleet-tracker.git
cd fleet-tracker
```

2. **Create virtual environment:**
```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# Mac/Linux: source .venv/bin/activate
```

3. **Install dependencies:**
```bash
pip install -r requirements.txt
```

4. **Create `.env` file:**
```env
DATABASE_URL=sqlite:///./fleet_tracker.db
DEVICE_API_KEY=your-secret-device-key
SECRET_KEY=your-jwt-secret
```

5. **Run the backend:**
```bash
uvicorn app.main:app --reload --port 8000
```

Backend API: http://localhost:8000  
API Docs: http://localhost:8000/docs

### Frontend Setup

1. **Navigate to frontend:**
```bash
cd frontend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Create `.env` file:**
```env
VITE_API_BASE=http://localhost:8000/api
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

4. **Run the frontend:**
```bash
npm run dev
```

Frontend: http://localhost:5173

## 📁 Project Structure
```
fleet-tracker/
├── app/                      # Backend (FastAPI)
│   ├── main.py              # App entry point
│   ├── models.py            # Database models
│   ├── routes.py            # API endpoints
│   ├── schemas.py           # Pydantic schemas
│   ├── websocket.py         # WebSocket manager
│   └── auth.py              # Authentication
│
├── frontend/                 # Frontend (React)
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── App.jsx          # Main app
│   │   └── main.jsx         # Entry point
│   └── package.json
│
├── .gitignore
├── requirements.txt
└── README.md
```

## 🔑 Getting Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable **Maps JavaScript API**
4. Create credentials → API Key
5. Restrict the key to your domain

## 📡 GPS Device Integration

Send position updates to: `POST /api/device/position`

**Headers:**
```
X-Device-Token: your-device-api-key
Content-Type: application/json
```

**Body:**
```json
{
  "device_id": "DEVICE001",
  "lat": 6.5244,
  "lng": 3.3792,
  "speed": 45.5
}
```

## 🚀 Deployment

### Backend (Railway/Render)

1. Connect your GitHub repository
2. Set environment variables:
   - `DATABASE_URL`
   - `DEVICE_API_KEY`
   - `SECRET_KEY`
3. Deploy!

### Frontend (GitHub Pages)

1. Update `frontend/vite.config.js`:
```javascript
base: '/fleet-tracker/'
```

2. Update `frontend/.env.production`:
```env
VITE_API_BASE=https://your-backend.railway.app/api
VITE_GOOGLE_MAPS_API_KEY=your_key
```

3. Build and deploy:
```bash
npm run build
# Use GitHub Actions or manual deploy
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.



## 👨‍💻 Author

Your Name - [GitHub](https://github.com/Silverx-code)

## 🙏 Acknowledgments

- FastAPI for the awesome Python framework
- React Leaflet for map components
- Google Maps Platform