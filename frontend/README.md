# Supply Chain Logistics App - Frontend

React TypeScript frontend for the Supply Chain Logistics App with call-off management functionality.

## Features

- ✅ Create Call-Off Form with quota selection
- ✅ Real-time quota balance validation
- ✅ Responsive design with Tailwind CSS
- ✅ Form validation with Zod and React Hook Form
- ✅ API integration with Supabase Edge Functions
- ✅ Toast notifications for user feedback

## Tech Stack

- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **React Hook Form** for form management
- **Zod** for validation
- **TanStack React Query** for server state management
- **Radix UI** for accessible components
- **Supabase** for backend API integration

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env.local
```

3. Update `.env.local` with your Supabase credentials

4. Start development server:
```bash
npm run dev
```

## Usage

1. Click "Create New Call-Off" to open the form
2. Select a quota from the dropdown (searchable)
3. Enter bundle quantity (validated against quota balance)
4. Optionally set a delivery date
5. Submit to create the call-off

## Form Validation

- Quota selection is required
- Bundle quantity must be 1-10,000 tonnes
- Quantity cannot exceed available quota balance
- Delivery date must be in the future (if provided)

## API Integration

The form integrates with the CallOff CRUD Edge Function:
- `GET /quotas` - Fetch available quotas
- `GET /quotas/{id}/remaining-balance` - Get quota balance
- `POST /call-offs` - Create new call-off

## Testing

The application is ready for testing with the existing quota seed data:
- 20 quotas across 3 business units
- Various metals (CU, AL, NI, ZN, PB, SN)
- Different tolerance scenarios for validation testing

## Next Steps

- Add authentication integration
- Implement call-off list view
- Add edit functionality for NEW call-offs
- Implement state transition actions
