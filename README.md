# Sai Enterprise Expense Tracker

A mobile-first business income and expense tracker for a printing shop. Transactions and categories are stored in MongoDB Atlas; the connection string is only read by server-side API routes.

## Local setup

1. Install Node.js 20.9 or newer.
2. Copy `.env.example` to `.env.local` and fill in your MongoDB Atlas connection string and database name. Make sure your Atlas network access rules allow the development machine.
3. Install dependencies and start the app:

   ```powershell
   npm install
   npm run dev
   ```

4. Open http://localhost:3000.

The first category request seeds the default expense and income categories. MongoDB collections and transaction indexes are created automatically. Keep `.env.local` out of source control.

## Vercel deployment

1. Push the project to a Git provider and import it into Vercel. Vercel should detect Next.js and use `npm run build` automatically.
2. In the Vercel project settings, add `MONGODB_URI` and `MONGODB_DB` as environment variables for Production. Add them to Preview only if preview deployments should use the database. Do not prefix these server-only values with `NEXT_PUBLIC_`.
3. In MongoDB Atlas, use a dedicated database user with only the required database permissions and configure network access for the Vercel deployment. Prefer a supported static outbound IP or private connectivity option; avoid opening Atlas to `0.0.0.0/0`.
4. Redeploy after saving environment variables, then verify the dashboard and API routes against the production deployment.

**Access control is required before public deployment.** This version has no authentication, and its transaction, category, and export APIs are unauthenticated. Restrict production access with an appropriate access-control solution before deploying sensitive financial data.

## Checks

```powershell
npx tsc --noEmit
npm run lint
npm run build
```

## V1 features

- Dashboard totals for today, this month, and the selected date range.
- Transaction create, edit, delete, search, type/category filtering, and pagination.
- Expense and income analytics, category totals, frequently used expense items, and monthly aggregation.
- CSV and JSON downloads of database transactions.
- Category management with seeded printing-business defaults.

## API

- `GET`, `POST /api/transactions`
- `GET`, `PATCH`, `DELETE /api/transactions/:id`
- `GET`, `POST /api/categories`
- `PATCH`, `DELETE /api/categories/:id`
- `GET /api/analytics/summary`, `/categories`, `/items`, `/major-categories`, `/monthly`
- `GET /api/export/csv`, `/api/export/json`

No authentication is included in this single-user V1. Do not expose it publicly until access control is in place.
