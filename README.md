# ilikeshorturl

Short URL service monorepo.

## Structure

```
ilikeshorturl/
├── backend/   NestJS API (Prisma 7 + PostgreSQL)
└── frontend/  Frontend app (to be added)
```

## Backend

See [backend/README.md](backend/README.md).

```bash
cd backend
npm install
cp .env.example .env   # configure DATABASE_URL
npx prisma migrate dev
npm run start:dev
```
