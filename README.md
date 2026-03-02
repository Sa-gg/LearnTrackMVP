# LearnTrack MVP

An AI-powered adaptive e-learning platform that allows educators to upload DepEd PDF modules and image-based presentations, then automatically generates structured multiple-choice quizzes using the **Google Gemini 2.5 Flash** API. Students can take the generated quizzes in-browser and receive instant scoring.

---

## Tech Stack

### Frontend

- React 19 + TypeScript
- Vite 6
- React Router DOM v7
- Axios

### Backend

- Node.js + Express 4
- TypeScript 5.6
- Prisma 7 ORM (with `pg` + `@prisma/adapter-pg`)
- PostgreSQL
- Multer (file uploads)
- Google Generative AI SDK (`@google/generative-ai`)

---

## Local Setup Guide

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9 (ships with Node 18+)
- **PostgreSQL** running locally (or a remote connection string)
- A **Google Gemini API key** — obtain one from [Google AI Studio](https://aistudio.google.com/app/apikey)

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/LearnTrackMVP.git
cd LearnTrackMVP
```

### 2. Install all dependencies

From the **root** of the monorepo, one command installs both workspaces:

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file inside the `backend/` directory:

```bash
# backend/.env

DATABASE_URL="postgresql://<user>:<password>@localhost:5432/learntrack_db"
GEMINI_API_KEY="your_gemini_api_key_here"
PORT=5000
NODE_ENV=development
```

> **⚠️ IMPORTANT:** Never commit your `.env` file. It contains your Gemini API key and database credentials. The `.gitignore` at the project root already excludes it, but always double-check before pushing.

### 4. Create the database & run migrations

Make sure your PostgreSQL server is running, then:

```bash
cd backend
npx prisma migrate dev --name init
```

This will create the `learntrack_db` database tables (`quizzes` and `questions`) defined in `backend/prisma/schema.prisma`.

### 5. Start the development servers

Open **two terminals** from the project root:

```bash
# Terminal 1 — Backend (http://localhost:5000)
npm run dev:backend

# Terminal 2 — Frontend (http://localhost:5173)
npm run dev:frontend
```

Or run them individually from each workspace:

```bash
# From backend/
npm run dev

# From frontend/
npm run dev
```

---

## Project Structure

```
LearnTrackMVP/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma        # Quiz & Question models
│   ├── src/
│   │   ├── controllers/         # Route handlers (chat, quiz gen, quiz retrieval)
│   │   ├── lib/                 # Prisma 7 client singleton
│   │   ├── middleware/           # Multer upload config
│   │   ├── routes/              # Express route definitions
│   │   ├── types/               # Shared TypeScript interfaces
│   │   ├── utils/               # JSON sanitizer
│   │   └── index.ts             # Express entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/          # ChatbotUI, QuizGenerator, TakeQuiz
│   │   ├── lib/                 # Axios instance
│   │   ├── App.tsx              # Layout + routing
│   │   ├── App.css
│   │   ├── index.css            # Global design system
│   │   └── main.tsx
│   └── package.json
├── .gitignore
├── README.md
└── package.json                 # npm workspaces root
```

---

## Key Features

- **AI Chatbot** — Free-form Q&A powered by Gemini 2.5 Flash
- **File-Based Quiz Generation** — Upload a PDF or image; the AI reads it and produces structured JSON quizzes
- **Database Persistence** — Every generated quiz is saved to PostgreSQL via Prisma 7 transactions
- **Interactive Quiz Taking** — Students answer multiple-choice questions and get instant scoring
- **Modern UI** — Professional SaaS design system with CSS custom properties, responsive layout, and dark navbar

---

## Author

**Patrick Sagum** — BSIT-3B
