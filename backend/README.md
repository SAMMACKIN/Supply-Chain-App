# Supply Chain Backend API

Express/TypeScript API for Supply Chain Management

## Setup

```bash
npm install
npm run build
npm start
```

## Environment Variables

See `.env.railway` for required variables.

## Endpoints

- `GET /health` - Health check
- `GET /api/quotas` - List quotas
- `POST /api/call-offs` - Create call-off
- `GET /api/call-offs/:id` - Get call-off details

## Development

```bash
npm run dev
```