# Service Modules

## Community Bulletin

Admins can:

- create announcements
- edit announcements
- delete announcements

Announcements must be visible to intended audiences and surfaced in resident-facing UI.

## Incident And Blotter Reporting

The system includes a unified reporting experience for residents.

### Report Types

- incident
- blotter

### Resident Capabilities

Residents can:

- submit reports with identity attached
- provide title, details, location, and date
- track report status later

### Admin Capabilities

Admins can:

- review reports
- update status
- keep reports permanently in records

Reports cannot be deleted through normal admin workflow.

### Report Statuses

- `pending`
- `under_review`
- `resolved`

## Census And Resident Profile

This module supports household-based data capture.

Residents can maintain:

- household size
- number of minors
- ownership status
- residency classification
- demographic or sector classification where available

Product direction also includes:

- filtering residents by demographic groups
- generating census-based reports
- supporting barangay planning and reporting

For the current frontend phase, the resident update flow is the priority.

## Notification System

Notifications are email-oriented at the product level and in-app at the frontend level.

### Trigger Events

- registration
- request submission
- request approval
- request decline with reason
- request completion
- report status updates

### Recipients

- residents as primary recipients
- optional admin and staff alerts

## Virtual Queue System

Priority: MVP+

Residents can:

- join queue remotely
- see current position
- cancel queue entry while allowed

Barangay personnel can:

- update queue status
- monitor queue flow

## Medicine Request And Inventory Management

Priority: MVP+

Staff and admin users can:

- add medicines
- edit medicines
- search inventory
- toggle availability
- soft delete entries

## Audit Logs And Reports

Priority: MVP+

The system direction includes:

- account changes
- role updates
- request actions
- generation activity
- processing activity
- approval and decline history
- filtered admin reporting
- CSV or Excel export

## Admin Analytics Dashboard

This is included in the MVP.

The admin dashboard should summarize:

- total requests
- pending requests
- approved requests
- completed requests
- incident report summary
- feedback ratings overview

The UX goal is fast operational scanning, not deep BI.
