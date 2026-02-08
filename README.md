# UWaterloo Study Spot

A multi-user app for UWaterloo students to find and share real-time study room conditions. Crowdsource noise levels, people count, yappers, and music to pick the best spot.

## Features

- **Multi-user auth** – Sign in with email to save and share data
- **Noise scan** – Uses device mic + Web Audio API (Quiet / Moderate / Loud)
- **Expanded status** – People count, yappers (chatty people), music in background
- **UWaterloo buildings** – DC, MC, SLC, Dana Porter, E7, etc.
- **Live rankings** – Rooms sorted by noise level and crowd data
- **Add rooms** – Authenticated users can add new rooms with building tags

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up Supabase**
   - Create a project at [supabase.com](https://supabase.com)
   - Run the SQL in `supabase/schema.sql` in the SQL Editor
   - In Authentication → Providers, enable **Email** (and optionally Google for @uwaterloo.ca)
   - Copy your project URL and anon key

3. **Configure env**
   ```bash
   cp .env.example .env
   # Edit .env with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
   ```

4. **Run dev server**
   ```bash
   npm run dev
   ```

5. Open http://localhost:5173, sign up, and start reporting.

## Tech Stack

- React 18 + TypeScript + Vite
- Supabase (Auth + Postgres)
- Web Audio API for noise detection
- Lucide React for icons
