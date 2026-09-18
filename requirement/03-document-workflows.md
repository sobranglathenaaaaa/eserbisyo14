# Document Workflows

## Core Module

The Service and Record Management System is the primary MVP workflow.

## Document Request Statuses

- `pending`
- `approved`
- `processing`
- `completed`
- `declined`
- `cancelled`

## Primary Workflow

1. Resident submits request.
2. Admin reviews the request.
3. Admin either approves or declines it.
4. Approved requests move to staff processing.
5. Staff updates the request to `processing`.
6. Staff finalizes the request as `completed`, or declines during processing with a reason.
7. Resident sees updated status and receives notification.
8. Resident views, prints, or downloads the finished document.

## Decision Rules

- admin decline requires a reason
- staff decline during processing requires a reason
- residents may cancel only while a request is still `pending`
- residents may not cancel once the request is already `processing`

## Resident Experience Requirements

Residents must be able to:

- create a new request
- select a supported document type
- enter purpose or notes
- see active requests
- see request history
- see generated or ready documents
- identify actionable issues such as decline reasons

## Admin Experience Requirements

Admins must be able to:

- view incoming requests
- inspect request details
- approve requests
- decline requests with reason
- understand current backlog and counts

## Staff Experience Requirements

Staff must be able to:

- view approved requests
- move requests into processing
- complete requests
- decline during processing with reason

## Digital Documents

Digital document release is part of the MVP.

### Required Capabilities

- document preview context inside the app
- printable document output
- PDF-ready user experience
- digital seal indicator
- authorized e-signature indicator

### QR Code Verification

Each generated document should carry verification-ready information, including:

- document type
- resident name
- date issued
- processed by
- verification status

### Reference Number

Each request or document must have a unique reference number.

Required format:

- `ES-YYYY-XXXX` or an equivalent system-generated format following the same intent

### Templates

Admins must be able to:

- create templates
- edit template content
- define dynamic fields
- maintain wording and layout context

## Feedback And History

### Feedback Module

Residents can submit feedback after completed transactions.

Feedback format:

- rating from 1 to 5
- optional comment

Admins must be able to review feedback for service evaluation.

### Resident History

Residents must be able to review their own service history, including:

- request history
- generated documents
- notification trail
- report progress where applicable

### Admin Activity View

Admins must be able to review system activity such as:

- request actions
- processing actions
- role changes
- generated document actions
