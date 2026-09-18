# Frontend Delivery

## Current Implementation Boundary

This requirement set is the source of truth for product and UI context.

For the current development pass:

- historical note: this document captured the initial frontend-first pass
- do not edit backend behavior yet
- do not change database schema yet
- assume Supabase is the existing data source
- use current frontend data contracts and routes where possible

This document is kept for traceability and is superseded by the backend implementation documents in `requirement/07` onward.

If a feature needs backend work to become fully functional, the frontend may ship with mocked, seeded, read-only, or client-side-integrated behavior as long as the intended workflow is clear.

## Frontend Screen Inventory

### Public

- landing page
- login
- registration

### Resident

- dashboard
- document requests
- request history
- notifications
- report submission
- queue
- census or profile
- feedback
- digital documents
- digital ID
- OCR
- chatbot

### Admin

- dashboard
- document requests
- document templates
- incident reports
- announcements
- notifications
- queue
- medicines
- reports
- users

### Staff

- dashboard
- process requests
- medicines
- notifications

## Acceptance Notes For Frontend Work

For this project phase, frontend completion means:

- each in-scope feature has a clear route or reachable UI surface
- the role-specific flow is understandable without backend changes
- forms, lists, empty states, and status states are represented
- mobile and desktop layouts are supported
- the interface communicates current scope honestly when a feature is MVP+ or has launch constraints

## Multi-language Support

The product supports:

- English
- Filipino

The UI should allow localized labels, guidance, and status messaging.

## PWA Support

Supported:

- offline draft behavior where practical

Not supported in MVP:

- full offline submission workflow

## Technical Constraints

- use polling, not WebSockets
- use email-based notifications
- target serverless-friendly deployment
- preserve mobile responsiveness
- keep flows understandable even with low digital literacy
