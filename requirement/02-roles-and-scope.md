# Roles And Scope

## User Roles

### Admin

Admin users have full operational oversight.

Core responsibilities:

- manage users and role assignments
- review and approve or decline document requests
- manage announcements
- manage document templates
- review incident and blotter reports
- monitor queue, medicines, notifications, and reports
- view analytics and audit-oriented activity

### Staff

Staff users handle operational execution after admin approval.

Core responsibilities:

- process approved document requests
- update request status during fulfillment
- finalize document completion
- manage medicine inventory
- monitor staff-facing notifications

### Resident

Residents are the main service consumers.

Core responsibilities:

- register for an account
- request documents
- track request progress
- view or print completed digital documents
- submit incident and blotter reports
- join the queue
- update census or profile information
- view notifications, announcements, and service history
- submit service feedback

## Authentication And Account Management

### Resident Registration

Residents can self-register.

Required fields:

- first name
- middle name (optional)
- last name
- age
- birthdate
- address
  - house number
  - street
  - barangay
  - city
- email
- phone number
- government or barangay ID reference

### Account Activation Rules (Current Phase)

- resident accounts are immediately active after registration
- registration defaults:
  - email_confirm: true
  - is_verified: true
  - verificationRequired: false
- UI flow must not depend on email verification to proceed
- verification endpoint may exist as temporary compatibility only

### Admin Account Controls

Admins can:

- create staff or resident accounts
- assign and change roles
- soft delete users
- restore soft-deleted users later

## MVP Scope Split

### Must Have For MVP

- authentication and role-aware access
- resident registration flow
- document request workflow
- digital documents with e-signature, digital seal, and verification context
- editable document templates
- announcements or bulletin
- feedback
- resident history
- incident and blotter reporting
- resident and system notifications
- admin analytics dashboard

### Should Have Soon After MVP

- census updates
- virtual queue

### Future Or Extended Scope

- OCR
- AI chatbot
- digital ID
- advanced reporting and exports

## Non-Goals For This Pass

- no deep security hardening expansion beyond launch baseline
- no advanced threat analytics implementation
- no payment integration
- no realtime channel implementation
