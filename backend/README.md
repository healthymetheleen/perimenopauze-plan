# Perimenopauze Plan Backend API

Backend API voor de Perimenopauze Plan applicatie, gebouwd met Express, TypeScript en PostgreSQL.

## 🚀 Quick Start

### Vereisten
- Node.js 20+
- PostgreSQL 17 (Sevalla)
- npm of pnpm

### Installatie

```bash
# Installeer dependencies
cd backend
npm install

# Kopieer environment variables
cp .env.example .env

# Bewerk .env met je credentials
nano .env
```

### Database Setup

```bash
# Run database schema en seed data
npm run db:setup
```

### Development

```bash
# Start development server met hot reload
npm run dev
```

De API draait nu op `http://localhost:3000`

### Production Build

```bash
# Build TypeScript naar JavaScript
npm run build

# Start production server
npm start
```

## 📁 Project Structuur

```
backend/
├── src/
│   ├── config/
│   │   └── database.ts       # PostgreSQL connectie
│   ├── middleware/
│   │   ├── auth.ts           # JWT authenticatie
│   │   └── cors.ts           # CORS configuratie
│   ├── routes/
│   │   ├── auth.ts           # Auth endpoints
│   │   ├── diary.ts          # Dagboek endpoints
│   │   ├── cycle.ts          # Cyclus tracking
│   │   └── ...               # Andere routes
│   ├── services/
│   │   ├── email.ts          # Email service (Resend)
│   │   ├── payments.ts       # Betalingen (Mollie)
│   │   └── ai.ts             # AI services
│   ├── db/
│   │   ├── schema.sql        # Database schema
│   │   ├── setup.ts          # Setup script
│   │   └── migrations/       # Database migraties
│   ├── types/
│   │   └── index.ts          # TypeScript types
│   └── server.ts             # Main entry point
├── .env.example              # Environment variables template
├── package.json
└── tsconfig.json
```

## 🔐 Authentication

De API gebruikt JWT (JSON Web Tokens) voor authenticatie.

### Endpoints

- `POST /api/auth/signup` - Nieuwe gebruiker aanmaken
- `POST /api/auth/login` - Inloggen
- `GET /api/auth/me` - Huidige gebruiker ophalen
- `POST /api/auth/logout` - Uitloggen

### Headers

Voor protected endpoints:
```
Authorization: Bearer <jwt-token>
```

## 🗄️ Database

### Sevalla PostgreSQL Connectie

Internal (binnen Sevalla cluster):
```
postgres://heleen:PASSWORD@heleen-wxeda-postgresql.heleen-wxeda.svc.cluster.local:5432/perimenopauzeplan
```

### Schema

Zie `src/db/schema.sql` voor het complete database schema.

Belangrijkste tabellen:
- `users` - Gebruikers accounts
- `profiles` - Gebruiker profielen
- `diary_entries` - Dagboek entries
- `cycle_data` - Cyclus tracking
- `meal_logs` - Maaltijd logs
- `sleep_logs` - Slaap tracking
- `movement_logs` - Beweging tracking
- `recipes` - Recepten
- `subscriptions` - Premium abonnementen

## 🔧 Environment Variables

Zie `.env.example` voor alle beschikbare variabelen.

Belangrijkste:
- `DATABASE_URL` - PostgreSQL connectie string
- `JWT_SECRET` - Secret voor JWT tokens
- `RESEND_API_KEY` - Voor email verzending
- `MOLLIE_API_KEY` - Voor betalingen
- `ANTHROPIC_API_KEY` - Voor AI features

## 📝 API Endpoints (geplanned)

### Auth
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Diary
- `GET /api/diary`
- `POST /api/diary`
- `PUT /api/diary/:id`
- `DELETE /api/diary/:id`

### Cycle
- `GET /api/cycle`
- `POST /api/cycle`
- `GET /api/cycle/predictions`

### AI
- `POST /api/ai/analyze-meal`
- `POST /api/ai/cycle-coach`
- `POST /api/ai/daily-analysis`
- `POST /api/ai/monthly-analysis`

## 🚀 Deployment naar Sevalla

1. Build de applicatie:
```bash
npm run build
```

2. Upload naar Sevalla
3. Set environment variables in Sevalla dashboard
4. Start de service

## 📊 Monitoring

De API heeft een health check endpoint:
```
GET /health
```

Returns:
```json
{
  "success": true,
  "message": "API is running",
  "timestamp": "2026-01-10T..."
}
```

## 🔒 Security

- Helmet.js voor security headers
- CORS configuratie
- JWT token authenticatie
- Bcrypt password hashing
- Input validation met Zod
- SQL injection preventie (parameterized queries)

## 📞 Support

Voor vragen of problemen, open een issue in de repository.
