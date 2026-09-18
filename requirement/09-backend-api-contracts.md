# Backend API Contracts

Version: Backend Contracts v1.1
Last Updated: April 5, 2026
Depends On:

- [07-backend-implementation-plan.md](./07-backend-implementation-plan.md)
- [08-backend-task-breakdown.md](./08-backend-task-breakdown.md)

## Purpose

This document defines the canonical request and response contracts for backend endpoints.

Goals:

- prevent frontend and backend contract drift
- standardize validation and error handling
- make endpoint behavior testable and predictable
- keep payload fields stable for current frontend selectors/components

## Global API Rules

1. Base path: /api/v1
2. Content type: application/json for request and response bodies unless file upload endpoint is explicitly defined.
3. Time format: ISO 8601 UTC.
4. IDs: UUID string.
5. Pagination: cursor-based preferred. If offset pagination is used, response must include total and next cursor capability plan.
6. All responses include requestId in headers where available.
7. Operational mutation endpoints should return updated entity shape in data (not status-only responses) whenever possible.
8. Compatibility shims are allowed temporarily for existing screens but must preserve canonical envelope.

## Standard Response Shapes

### Success Envelope

Fields:

- success: true
- data: object or array
- meta: optional object

Shape:

{
  "success": true,
  "data": {},
  "meta": {}
}

### Error Envelope

Fields:

- success: false
- error.code: stable machine code
- error.message: user-safe message
- error.details: optional structured details

Shape:

{
  "success": false,
  "error": {
    "code": "AUTH_UNAUTHORIZED",
    "message": "Authentication required",
    "details": {}
  }
}

## Standard Error Codes

- AUTH_UNAUTHORIZED
- AUTH_FORBIDDEN
- AUTH_INVALID_CREDENTIALS
- AUTH_TOKEN_EXPIRED
- VALIDATION_ERROR
- RESOURCE_NOT_FOUND
- RESOURCE_CONFLICT
- RATE_LIMITED
- INTERNAL_ERROR

## Auth and Session Contracts

### POST /api/v1/auth/register

Request:

- email: string
- password: string
- firstName: string
- middleName: string optional
- lastName: string
- birthDate: string
- phone: string
- address: object (preferred) or string (compatibility)
- idReference: string

Success response data:

- userId: string
- verificationRequired: false
- emailConfirm: true
- isVerified: true
- role: resident

Error cases:

- VALIDATION_ERROR
- RESOURCE_CONFLICT

### POST /api/v1/auth/login

Request:

- email: string
- password: string

Success response data:

- userId: string
- role: admin or staff or resident
- profile: object
- session: object

Error cases:

- AUTH_INVALID_CREDENTIALS
- AUTH_UNAUTHORIZED
- RATE_LIMITED

### POST /api/v1/auth/logout

Request:

- no body required

Success response data:

- loggedOut: true

Error cases:

- AUTH_UNAUTHORIZED

### GET /api/v1/auth/session

Success response data:

- userId: string
- role: admin or staff or resident
- profile: object
- expiresAt: string

Error cases:

- AUTH_UNAUTHORIZED
- AUTH_TOKEN_EXPIRED

### POST /api/v1/auth/verify

Compatibility note:

- endpoint may remain temporarily for backward compatibility
- new UI flows must not depend on this endpoint

Request:

- token: string

Success response data:

- verified: true

Error cases:

- AUTH_UNAUTHORIZED
- VALIDATION_ERROR

## Profile and User Contracts

### GET /api/v1/profiles/me

Success response data:

- profile object for current user

### PATCH /api/v1/profiles/me

Request:

- allowed editable profile fields only

Success response data:

- updated profile object

Error cases:

- AUTH_UNAUTHORIZED
- VALIDATION_ERROR

### GET /api/v1/users

Query:

- role optional
- status optional
- search optional
- cursor optional
- limit optional

Success response data:

- users: array
- nextCursor: string optional

Error cases:

- AUTH_FORBIDDEN

### POST /api/v1/users

Request:

- email: string
- role: staff or resident
- profile fields

Success response data:

- user object

Error cases:

- AUTH_FORBIDDEN
- RESOURCE_CONFLICT
- VALIDATION_ERROR

### PATCH /api/v1/users/:userId

Request:

- mutable user fields by admin policy

Success response data:

- updated user object

### DELETE /api/v1/users/:userId

Behavior:

- soft delete only

Success response data:

- deleted: true

### POST /api/v1/users/:userId/restore

Success response data:

- restored: true

## Document Module Contracts

Status normalization baseline:

- document request status values: pending, approved, declined, processing, completed
- incident status values: pending, under_review, resolved
- queue ticket status values: waiting, serving, completed, cancelled

UI and API should use these same canonical values.

Compatibility note:

- if UI uses legacy aliases (for example skipped), API may map to canonical values (for example cancelled) in responses.

### GET /api/v1/document-types

Success response data:

- documentTypes: array

### GET /api/v1/document-requests

Query:

- status optional
- requestType optional
- cursor optional
- limit optional

Success response data:

- requests: array
- nextCursor: string optional

### GET /api/v1/document-requests/:requestId

Success response data:

- request detail object

Error cases:

- RESOURCE_NOT_FOUND
- AUTH_FORBIDDEN

### POST /api/v1/document-requests

Request:

- documentTypeId: string
- purpose: string
- notes: string optional
- requestedAt: string optional

Success response data:

- request object

Error cases:

- VALIDATION_ERROR
- RESOURCE_NOT_FOUND

### PATCH /api/v1/document-requests/:requestId/status

Request:

- status: pending or approved or declined or processing or completed or cancelled
- reason: string optional for decline

Success response data:

- request object with updated status

Error cases:

- AUTH_FORBIDDEN
- VALIDATION_ERROR
- RESOURCE_CONFLICT

### POST /api/v1/document-requests/:requestId/assign

Request:

- assigneeUserId: string

Success response data:

- assigned: true
- assignee: object

### POST /api/v1/document-requests/:requestId/complete

Request:

- releaseNotes: string optional
- verificationMetadata: object

Success response data:

- completed: true
- request object

## Announcements and Notifications Contracts

### GET /api/v1/announcements

Success response data:

- announcements: array

### POST /api/v1/announcements

Request:

- title: string
- body: string
- audience: all or residents or staff
- publishAt: string optional

Success response data:

- announcement object

### PATCH /api/v1/announcements/:announcementId

Request:

- mutable announcement fields

### DELETE /api/v1/announcements/:announcementId

Success response data:

- deleted: true

### GET /api/v1/notifications

Query:

- unreadOnly optional
- cursor optional
- limit optional

Success response data:

- notifications: array
- nextCursor: string optional

### PATCH /api/v1/notifications/:notificationId/read

Success response data:

- read: true

## Incidents and Blotter Contracts

### GET /api/v1/incidents

Query:

- status optional
- cursor optional
- limit optional

Success response data:

- incidents: array
- nextCursor: string optional

### POST /api/v1/incidents

Request:

- title: string
- description: string
- occurredAt: string
- location: string
- attachments: array optional

Success response data:

- incident object

### GET /api/v1/incidents/:incidentId

Success response data:

- incident detail object

### PATCH /api/v1/incidents/:incidentId/status

Request:

- status: pending or under_review or resolved
- note: string optional

Success response data:

- incident object

## Medicines And Queue Contracts

### GET /api/v1/medicines

Success response data:

- medicines: array

### POST /api/v1/medicines

Request:

- name: string
- stock: number
- unit: string
- expiryDate: string optional

Success response data:

- medicine object

### PATCH /api/v1/medicines/:medicineId

Request:

- mutable medicine fields

### GET /api/v1/queue

Success response data:

- queueState object

### POST /api/v1/queue/tickets

Request:

- serviceType: string
- notes: string optional
- idempotencyKey: string

Success response data:

- ticket object

### PATCH /api/v1/queue/tickets/:ticketId/status

Request:

- status: waiting or serving or completed or cancelled

Success response data:

- ticket object with updated status

### DELETE /api/v1/queue/tickets/:ticketId

Behavior:

- delete intent is mapped to `status=cancelled` (no hard delete)

Success response data:

- ticket object with status cancelled

## OCR And Digital ID Contracts

### GET /api/v1/ocr/jobs

Success response data:

- jobs: array

### POST /api/v1/ocr/jobs

Request:

- multipart/form-data
- file: image/jpeg | image/png | image/webp

Success response data:

- OCR job object including:
  - status: processing | completed | failed
  - extractedText
  - mimeType, fileSizeBytes, filePath, model, errorMessage metadata fields

### PATCH /api/v1/ocr/jobs/:ocrJobId

Request:

- extractedText: string

Success response data:

- updated OCR job object

### DELETE /api/v1/ocr/jobs/:ocrJobId

Success response data:

- deleted: true

### GET /api/v1/digital-id

Success response data:

- digital ID object for the authenticated resident

### POST /api/v1/digital-id

Behavior:

- creates digital ID if missing, otherwise refreshes issue/validity values

Success response data:

- digital ID object

### PATCH /api/v1/digital-id

Request:

- fullName: string optional
- address: string optional
- validUntil: string optional (YYYY-MM-DD)

Success response data:

- updated digital ID object

### DELETE /api/v1/digital-id

Success response data:

- deleted: true

## Feedback, History, Census, Dashboard Contracts

### POST /api/v1/feedback

Request:

- rating: number
- message: string optional
- relatedRequestId: string optional

Success response data:

- feedback object

### GET /api/v1/request-history

Success response data:

- history: array

### GET /api/v1/census

Success response data:

- census records array

### POST /api/v1/census

Request:

- census update payload

Success response data:

- census record object

### GET /api/v1/dashboard/summary

Success response data:

- role-scoped summary metrics object

## Contract Governance

1. Any contract change must update this document and matching frontend types in the same pull request.
2. Breaking changes require version bump policy and migration notes.
3. Contract tests must validate success and error envelopes for each endpoint.

## Definition Of Done

1. Every endpoint in [08-backend-task-breakdown.md](./08-backend-task-breakdown.md) has defined request and response contracts.
2. Error code usage is consistent and machine-readable.
3. Frontend integration can be implemented without guessing payload shapes.
