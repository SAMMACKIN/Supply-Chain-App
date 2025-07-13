# Call-Off CRUD Edge Function

A comprehensive Supabase Edge Function that handles all Call-Off operations including CRUD operations, state machine transitions, and business rule validation with proper RLS enforcement.

## API Endpoints

### Call-Off Management

#### `POST /call-offs`
Create a new call-off.

**Request Body:**
```json
{
  "quota_id": "uuid",
  "bundle_qty": 100,
  "requested_delivery_date": "2025-08-15" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "call_off_id": "uuid",
    "call_off_number": "CO-2025-0001",
    "quota_id": "uuid",
    "bundle_qty": 100,
    "status": "NEW",
    "created_at": "2025-07-12T10:00:00Z"
  }
}
```

#### `GET /call-offs`
List call-offs with filtering and pagination.

**Query Parameters:**
- `status`: Filter by status (NEW, CONFIRMED, FULFILLED, CANCELLED)
- `quota_id`: Filter by quota
- `metal_code`: Filter by metal code
- `direction`: Filter by direction (BUY, SELL)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50, max: 100)
- `sort_by`: Sort field (default: created_at)
- `sort_order`: Sort order (asc, desc) (default: desc)

#### `GET /call-offs/{id}`
Get call-off details.

#### `PATCH /call-offs/{id}`
Update mutable fields (only NEW status).

**Request Body:**
```json
{
  "bundle_qty": 150,
  "requested_delivery_date": "2025-08-20"
}
```

#### `POST /call-offs/{id}/confirm`
Transition call-off from NEW to CONFIRMED.

#### `POST /call-offs/{id}/cancel`
Cancel call-off (from NEW or CONFIRMED states).

**Request Body (optional):**
```json
{
  "reason": "Customer request"
}
```

#### `POST /call-offs/{id}/fulfill`
Transition call-off from CONFIRMED to FULFILLED (requires shipment lines).

### Quota Management

#### `GET /quotas`
List available quotas for the user.

**Query Parameters:**
- `metal_code`: Filter by metal code
- `direction`: Filter by direction
- `period_month`: Filter by period

#### `GET /quotas/{id}/remaining-balance`
Get quota balance and utilization.

**Response:**
```json
{
  "success": true,
  "data": {
    "quota_id": "uuid",
    "quota_qty_tonnes": 1000,
    "consumed_bundles": 250,
    "remaining_qty_tonnes": 750,
    "tolerance_pct": 5.0,
    "utilization_pct": 25.0,
    "tolerance_status": "WITHIN_LIMITS"
  }
}
```

## Business Rules

### State Machine
Call-offs follow a strict state machine:
- **NEW** → CONFIRMED, CANCELLED
- **CONFIRMED** → FULFILLED, CANCELLED
- **FULFILLED** → (terminal state)
- **CANCELLED** → (terminal state)

### Quota Validation
- Call-offs cannot exceed quota capacity
- Tolerance limits are enforced on confirmation
- Users can only access quotas within their business unit (RLS)

### Role Permissions
- **OPS**: Full CRUD + state transitions
- **TRADE**: Full CRUD + state transitions
- **PLANNER**: Read + Cancel + Fulfill (no create/update)

## Authentication

All requests require a valid Supabase JWT token in the Authorization header:
```
Authorization: Bearer <jwt-token>
```

The user must have an active profile with appropriate role permissions.

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": ["validation error 1", "validation error 2"] // For validation errors
}
```

## Deployment

Deploy to Supabase Edge Functions:

```bash
supabase functions deploy calloff-crud
```

## Environment Variables

- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for authentication

## Testing

Use the provided test data from the quota seed migration to test all endpoints:

1. Create call-offs against different quotas
2. Test state transitions
3. Verify quota balance calculations
4. Test permission enforcement
5. Validate error handling