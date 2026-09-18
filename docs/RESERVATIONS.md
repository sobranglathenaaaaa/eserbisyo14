# Reservation System Documentation

## Overview

The reservation system allows residents to reserve facilities, vehicles, and equipment from the barangay. Staff and admin can review and approve/decline these reservations based on availability.

## Features

### Resident Features
- **Create Reservations**: Residents can submit requests to reserve:
  - Multi Purpose Hall
  - Covered Court
  - Service Vehicle
  - Equipment (Tables, Chairs, Ladder)
- **View Status**: Track reservation status (Pending, Approved, Declined, Cancelled)
- **Cancel Pending**: Residents can cancel pending reservations before approval
- **Automatic Validation**: System checks:
  - Equipment stock availability
  - Facility scheduling conflicts
  - Time slot overlaps

### Staff Features
- **Review Reservations**: Staff can review pending reservation requests
- **Approve/Decline**: Accept approved reservations or decline with reasons
- **Availability Checks**: System validates that approved reservations don't conflict with existing ones
- **Search & Filter**: Find reservations by resident name, resource type, or status

### Admin Features
- **Note**: Reservations are handled by staff. Admins do not process reservation approvals/declines.

## Database Schema

### Tables

#### `reservations`
```sql
id (uuid) - Primary key
tenant_id (uuid) - Tenant reference
resident_id (uuid) - Resident who made the reservation
resource (enum) - Type: 'barangay_hall', 'covered_court', 'equipment', 'service_vehicle'
item_name (text) - Equipment name (for equipment type)
quantity_requested (integer) - Quantity (for equipment type)
date (date) - Reservation date
start_at (timestamptz) - Start datetime
end_at (timestamptz) - End datetime
time_slot (text) - Optional time slot description
purpose (text) - Purpose of reservation
status (enum) - 'pending', 'approved', 'declined', 'cancelled'
reason (text) - Decline reason (if declined)
created_at (timestamptz) - Created timestamp
updated_at (timestamptz) - Last updated timestamp
```

#### `equipment`
```sql
id (uuid) - Primary key
tenant_id (uuid) - Tenant reference
name (text) - Equipment name (e.g., 'Tables', 'Chairs', 'Ladder')
quantity (integer) - Total stock available
is_deleted (boolean) - Soft delete flag
created_at (timestamptz) - Created timestamp
```

## API Endpoints

### Base URL
`/api/v1/reservations`

### List Reservations
- **Method**: `GET`
- **URL**: `/api/v1/reservations`
- **Query Params**:
  - `status` (optional): Filter by status
- **Auth**: Residents see only own; Staff/Admin see all
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "reservations": [...]
    }
  }
  ```

### Create Reservation
- **Method**: `POST`
- **URL**: `/api/v1/reservations`
- **Auth**: Resident access required
- **Body**:
  ```json
  {
    "serviceType": "covered_court",
    "itemName": "Tables",
    "quantityRequested": 5,
    "startAt": "2026-06-15T14:00:00Z",
    "endAt": "2026-06-15T16:00:00Z",
    "notes": "Community gathering"
  }
  ```
- **Response**: Created reservation object

### Get Reservation
- **Method**: `GET`
- **URL**: `/api/v1/reservations/{reservationId}`
- **Response**: Reservation object

### Delete Reservation
- **Method**: `DELETE`
- **URL**: `/api/v1/reservations/{reservationId}`
- **Auth**: Resident (only pending); Staff/Admin (any)
- **Response**: Empty success

### Update Reservation Status
- **Method**: `PATCH`
- **URL**: `/api/v1/reservations/{reservationId}/status`
- **Auth**: Staff/Admin
- **Body**:
  ```json
  {
    "status": "approved",
    "reason": "Scheduled"
  }
  ```
- **Response**: Updated reservation object

### List Equipment
- **Method**: `GET`
- **URL**: `/api/v1/equipment`
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "equipment": [
        {
          "id": "...",
          "name": "Tables",
          "quantity": 20
        }
      ]
    }
  }
  ```

## Availability Logic

### Equipment Reservations
When creating or approving an equipment reservation, the system:
1. Fetches the equipment item
2. Checks all pending and approved reservations for the same equipment
3. Calculates reserved quantity for overlapping time periods
4. Validates: `(existing_reserved + requested_quantity) <= total_stock`
5. Allows reservation only if stock is available

### Facility Reservations
For facilities (Multi Purpose Hall, Covered Court, Service Vehicle):
1. Checks for overlapping pending/approved reservations
2. No double-booking allowed
3. Time ranges must not overlap: `start_time < other_end_time AND end_time > other_start_time`

## UI Routes

### Resident
- **Make Reservations**: `/resident/reservations`
- **View Status**: Same page with tabs
- **Draft Auto-save**: Drafts saved to localStorage key `eserbisyo.draft.reservation`

### Admin
- **Note**: Admins have oversight but reservation approvals/declines are handled by staff only.

### Staff
- **Review & Approve**: `/staff/reservations`
- **Same features as Admin**

## Workflow

```
1. Resident submits reservation
   ↓
2. System validates availability
   ↓
   (If invalid: Error returned to resident)
   ↓
3. Reservation created with status "pending"
   ↓
4. Notification sent to resident
   ↓
5. Staff/Admin reviews reservation
   ├─ Approve: Status → "approved", notification sent
   ├─ Decline: Status → "declined", reason stored, notification sent
   └─ (Resident can cancel if pending)
   ↓
6. Approved reservations are held; re-validation on approval ensures no conflicts
```

## Error Handling

### Common Errors

#### VALIDATION_ERROR (400)
- Missing required fields
- Invalid start/end times
- Quantity out of range

#### RESOURCE_NOT_FOUND (404)
- Reservation not found
- Equipment not found

#### RESOURCE_CONFLICT (409)
- Equipment not available (insufficient stock for time period)
- Facility already reserved for time period
- Invalid status transition

#### AUTH_FORBIDDEN (403)
- Insufficient permissions
- Resident trying to access other's data

## Notifications

When a reservation status changes:
1. Notification record created in `notifications` table
2. Sent via in-app notification system
3. Optional: Email notifications (if email service configured)

Notification details:
- **Type**: `request`
- **Event Key**: `document.status_changed` (reused for reservations)
- **Priority**: `info` (default) or `warning` (declined/cancelled)

## Migration

Run the migration to add equipment quantity:
```bash
# In Supabase dashboard or via migration runner:
# File: supabase/migrations/20260529_add_equipment_quantity.sql
```

This migration:
1. Adds `quantity` column to `equipment` table
2. Sets defaults:
   - Tables: 20
   - Chairs: 100
   - Ladder: 5

## Testing

### Test Scenarios

1. **Create Equipment Reservation**
   - Create a reservation for Tables (qty 5)
   - Verify stock check passes
   - Create another overlapping (qty 10)
   - Verify second fails with RESOURCE_CONFLICT

2. **Create Facility Reservation**
   - Create Covered Court reservation 2-4 PM
   - Create overlapping 3-5 PM
   - Verify second fails with RESOURCE_CONFLICT

3. **Approval Workflow**
   - Submit reservation (status: pending)
   - Approve (status: approved)
   - Try to decline approved → fails

4. **Resident Cancellation**
   - Submit reservation (status: pending)
   - Cancel (DELETE) → succeeds
   - Approve, then try cancel → fails

## Performance Considerations

- Equipment availability queries use index on `(tenant_id, resource, status, start_at, end_at)`
- Pagination limit: 200 reservations per query
- Draft auto-save: client-side localStorage (no server calls)

## Future Enhancements

- [ ] Recurring reservations
- [ ] Email reminders before reservation date
- [ ] Attachment uploads (e.g., event details)
- [ ] Calendar view for staff
- [ ] Reservation history/analytics
- [ ] Waitlist/backup scheduling
- [ ] SMS notifications
