# SAFEPATH AI
> "Predict Danger. Protect Lives."

SafePath AI is an AI-powered Predictive Safety Intelligence Platform designed for Women, Men, Children, Students, Senior Citizens, and Travelers. It predicts route risks, tracks live locations, triggers SOS alerts, and provides real-time voice assistance in English & Tamil.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## Project Components
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. **Frontend (`/frontend`)**: Next.js 15, TypeScript, Tailwind CSS, Framer Motion.
2. **Backend (`/backend`)**: Node.js, Express, PostgreSQL / Supabase, JWT Authentication.
3. **AI Engine (`/ai-engine`)**: Python FastAPI, risk scoring model, route prediction engine.
4. **Database Schema (`/database`)**: SQL seed script for Supabase database.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## Quick Start Setup (Local Run)
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Step 1: Initialize Database (Supabase / Postgres)
- Create a new project in **Supabase** or initialize a local PostgreSQL database.
- Go to the **SQL Editor** in your Supabase dashboard.
- Copy and paste the contents of `database/schema.sql` and click **Run** to set up tables, indexes, and seed mock reports.

### Step 2: Start the AI Engine (FastAPI)
1. Open a new terminal in `/ai-engine`.
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Start the FastAPI server using Uvicorn:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
4. Access docs at `http://localhost:8000/docs`.

### Step 3: Start the Backend API (Express)
1. Open a terminal in `/backend`.
2. Create a `.env` file from `.env.example` and set your variables (or let it run on automatic file-based database.json fallback!).
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Express API starts at `http://localhost:5000`.

### Step 4: Start the Frontend (Next.js 15)
1. Open a terminal in `/frontend`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the developer server:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:3000` in your web browser.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## Testing and Validation Instructions
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 1. English / Tamil Voice Assistant
- Click the **Microphone** button on the bottom left AI Safety Assistant panel.
- Grant microphone access when prompted.
- **English Test**: Whisper `"Is this route safe?"` or `"Help me"` to trigger SOS.
- **Tamil Test**: Speak `"நெருக்கடி நிலை"` (SOS trigger) or `"நான் பாதுகாப்பாக இருக்கிறேனா?"` (Is my route safe?).
- The assistant will respond using Voice Synthesis (Text-to-Speech) in the correct language.

### 2. Evidence SOS Emergency Mode
- Click the big **SOS Button** on the right side.
- A 3-second countdown will start (can be cancelled by entering security PIN `1234`).
- After 3 seconds, the camera and microphone streams activate, a siren sounds, and mock evidence files (Audio/Video/Screenshots) are uploaded.
- Notifications are sent to the configured trusted contacts list.

### 3. Guardian Mode Telemetry Simulator
- Click **Start Journey Monitoring** under Guardian Mode.
- Click **Simulate Deviation** or **Distress Prompt** to trigger GPS anomalies and check prompt timing.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## Production Deployment Instructions
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Database Deployment (Supabase)
1. Set up a free PostgreSQL database on Supabase.
2. Under project settings, fetch the **URI Database Connection String** and place it in the Express backend environment variable as `DATABASE_URL`.

### Backend Deployment (Render / Heroku)
1. Push the `/backend` folder to a Git repository.
2. Connect it to **Render** as a Web Service.
3. Add environment variables: `DATABASE_URL`, `JWT_SECRET`, and `PORT`.

### AI Engine Deployment (Render / Railway)
1. Deploy the `/ai-engine` folder to **Railway** or Render.
2. Specify the start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.

### Frontend Deployment (Vercel)
1. Push the `/frontend` folder to Github.
2. Import it into **Vercel**.
3. Set environment variables:
   - `NEXT_PUBLIC_BACKEND_URL=https://your-backend.render.com/api`
   - `NEXT_PUBLIC_AI_ENGINE_URL=https://your-ai-engine.railway.app`
4. Click **Deploy**.
