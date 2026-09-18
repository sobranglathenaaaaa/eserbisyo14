# Chapter 3
# METHODOLOGY

## 3.1 Requirements Analysis

This chapter presents the methodology used in developing the eSerbisyo system. It documents how requirements were identified, translated into system features, and validated through design, implementation, testing, and evaluation activities. The analysis is based on the actual role-based workflows of the platform: Resident, Staff, and Administrator.

### 3.1.1 Requirements-Features Matrix

The Requirements-Features Matrix is a structured table that maps system requirements to specific features. This matrix ensures that all identified requirements are addressed in the final system and reduces the risk of missing essential functionalities. It includes requirement descriptions, corresponding modules or features, priority level, and implementation status.

Functional requirements define what the system must do. Non-functional requirements describe expected quality attributes such as responsiveness, maintainability, and reliability.d

| Req ID | Requirement Description | Type | Mapped Feature/Module | Priority | Status |
|---|---|---|---|---|---|
| FR-01 | Users must be able to register an account as resident. | Functional | Registration page and resident onboarding form | High | Implemented |
| FR-02 | Users must be able to log in and be redirected by role. | Functional | Login workflow and role-based dashboard routing | High | Implemented |
| FR-03 | Resident users must submit document requests online. | Functional | Resident document request module | High | Implemented |
| FR-04 | Resident users must track request progress. | Functional | Request history and status monitoring pages | High | Implemented |
| FR-05 | Administrators must review and decide on pending requests. | Functional | Admin document request review | High | Implemented |
| FR-06 | Staff must process approved requests. | Functional | Staff processing queue and status updates | High | Implemented |
| FR-07 | Residents must submit incident and blotter reports. | Functional | Blotter and incident reporting pages | High | Implemented |
| FR-08 | Admin must publish and manage announcements. | Functional | Announcement management module | Medium | Implemented |
| FR-09 | Users must be able to join and monitor service queue. | Functional | Queue modules for resident and admin | High | Implemented |
| FR-10 | Residents must submit reservations; admin must review them. | Functional | Reservation request and review modules | Medium | Implemented |
| FR-11 | Admin and staff must manage medicines. | Functional | Medicine inventory modules | Medium | Implemented |
| FR-12 | Residents must generate a digital ID card. | Functional | Digital ID module | Medium | Implemented |
| FR-13 | Residents must access OCR and chatbot support tools. | Functional | OCR and chatbot modules | Medium | Implemented |
| FR-14 | Admin must be able to export report data. | Functional | Report and CSV export utilities | Medium | Implemented |
| NFR-01 | System interface should remain responsive across devices. | Non-Functional | Responsive layout and design tokens | High | Implemented |
| NFR-02 | System should enforce role-specific access and navigation. | Non-Functional | Role-based access and route segmentation | High | Implemented |
| NFR-03 | Codebase should be maintainable and type-safe. | Non-Functional | TypeScript strict mode and lint rules | High | Implemented |
| NFR-04 | System should support basic offline shell behavior. | Non-Functional | Service worker and web manifest | Medium | Implemented |
| NFR-05 | Data layer should be switchable between mock and backend sources. | Non-Functional | Provider abstraction via environment configuration | High | Implemented |

### 3.1.2 Use Case Diagrams

The Use Case Diagram provides a high-level representation of interactions between actors and the system. It helps communicate system scope and expected behavior clearly to developers, testers, and stakeholders.

Primary actors:

1. Resident
2. Staff
3. Administrator

Core use cases:

1. Register account
2. Log in
3. Submit and track document requests
4. Review and process requests
5. Submit incident or blotter report
6. Manage announcements
7. Join and manage queue
8. Create and review reservations
9. Manage medicine records
10. Access notifications and dashboards
11. Use OCR and chatbot features
12. Generate digital ID

### 3.1.3 Use Case Reports

Each use case report contains the following elements:

1. Use Case Name
2. Actors
3. Description
4. Preconditions
5. Flow of Events (main and alternative flows)
6. Postconditions
7. Exceptions

#### UC-01 Register Resident Account

1. Use Case Name: Register Resident Account
2. Actors: Resident
3. Description: Creates a new resident profile for accessing eSerbisyo services.
4. Preconditions: User is not yet registered.
5. Flow of Events:
	1. Resident opens registration page.
	2. Resident enters personal and account information.
	3. System validates required fields.
	4. System creates account record.
	5. User is redirected to login page.
6. Postconditions: Resident account is successfully stored.
7. Exceptions: Duplicate account data or invalid entries.

#### UC-02 Authenticate User

1. Use Case Name: User Login
2. Actors: Resident, Staff, Administrator
3. Description: Authenticates user credentials and opens role-specific dashboard.
4. Preconditions: Active account exists.
5. Flow of Events:
	1. User enters email and password.
	2. System validates credentials.
	3. System creates session.
	4. System redirects based on role.
6. Postconditions: Authenticated session is active.
7. Exceptions: Invalid credentials.

#### UC-03 Submit Document Request

1. Use Case Name: Submit Document Request
2. Actors: Resident
3. Description: Allows residents to request barangay documents online.
4. Preconditions: Resident is logged in.
5. Flow of Events:
	1. Resident selects document type.
	2. Resident enters purpose/details.
	3. System stores request with pending status.
	4. Resident can monitor status from request pages.
6. Postconditions: New request transaction is recorded.
7. Exceptions: Incomplete or invalid input.

#### UC-04 Review and Process Request

1. Use Case Name: Review and Process Request
2. Actors: Administrator, Staff
3. Description: Admin decides on pending requests; staff completes approved requests.
4. Preconditions: Request record exists.
5. Flow of Events:
	1. Admin reviews pending requests.
	2. Admin approves or declines request.
	3. Staff processes approved requests.
	4. Staff updates processing/completion status.
6. Postconditions: Request lifecycle state is updated.
7. Exceptions: Unauthorized action or invalid transition.

## 3.2 Design Specifications

### 3.2.1 Activity Diagram

The Activity Diagram illustrates the logical flow of key system transactions. For the document request process, the flow starts from resident submission, continues to administrative review, then staff processing, and ends with status notification to the resident.

Workflow summary:

1. Resident logs in
2. Resident submits request
3. System validates and records request
4. Admin reviews request
5. Decision point: approve or decline
6. If approved, staff processes request
7. Staff marks transaction completed or declined
8. Resident receives final status update

### 3.2.2 GUI Design

This section describes the visual structure and behavior of the system interface. The GUI is organized by user role and uses consistent layouts, forms, and status indicators for better usability.

Interface characteristics:

1. Role-based portals for Resident, Staff, and Administrator
2. Dashboard-focused summaries for operational visibility
3. Form-driven pages for registration, requests, reports, and reservations
4. Status badges, cards, and tables for workflow tracking
5. Responsive design for desktop and mobile devices

### 3.2.3 Database Schema

The database schema defines how system data is organized for storage and retrieval. The data model supports user management, request processing, notifications, queueing, reservations, reporting, and auditability.

Core entities:

1. Users
2. Sessions
3. Document Requests
4. Document Templates
5. Generated Documents
6. Incident Reports
7. Feedback
8. Announcements
9. Census Records
10. Queue Entries
11. Reservations
12. Medicines
13. Notifications
14. Email Logs
15. Audit Logs
16. OCR Jobs
17. Chat Sessions
18. Digital IDs
19. App Metadata

Relationships include one-to-many links between user records and transactional entities (requests, reports, queue entries, reservations, notifications, and logs), with key foreign-reference fields used for traceability.

### 3.2.4 Data Dictionary

The Data Dictionary provides detailed definitions of critical fields used by the system.

| Entity | Field | Data Type | Size/Format | Constraints | Description |
|---|---|---|---|---|---|
| users | id | VARCHAR | 50 | PK, Required | Unique user identifier |
| users | full_name | VARCHAR | 120 | Required | Resident/staff/admin full name |
| users | email_address | VARCHAR | 100 | Required, Unique | Login and notification email |
| users | role | ENUM | admin, staff, resident | Required | User role classification |
| users | is_deleted | BOOLEAN | true/false | Required, Default false | Soft delete marker |
| sessions | user_id | VARCHAR | 50 | FK, Required | References users.id |
| sessions | locale | ENUM | en, fil | Required | Language preference |
| document_requests | request_id | VARCHAR | 50 | PK, Required | Request record identifier |
| document_requests | reference_no | VARCHAR | 30 | Required | Human-readable transaction number |
| document_requests | resident_id | VARCHAR | 50 | FK, Required | Request owner |
| document_requests | status | ENUM | pending/approved/processing/completed/declined/cancelled | Required | Request status |
| incident_reports | report_id | VARCHAR | 50 | PK, Required | Incident/blotter record ID |
| incident_reports | kind | ENUM | incident, blotter | Required | Report category |
| incident_reports | status | ENUM | pending, under_review, resolved | Required | Case progress state |
| queue_entries | queue_id | VARCHAR | 50 | PK, Required | Queue transaction ID |
| queue_entries | position | INT | numeric | Required | Queue position |
| reservations | reservation_id | VARCHAR | 50 | PK, Required | Reservation ID |
| reservations | resource | ENUM | barangay_hall, covered_court, equipment | Required | Reserved facility/resource |
| medicines | medicine_id | VARCHAR | 50 | PK, Required | Medicine record ID |
| medicines | available | BOOLEAN | true/false | Required | Stock availability indicator |
| notifications | notification_id | VARCHAR | 50 | PK, Required | Notification record ID |
| notifications | read_flag | BOOLEAN | true/false | Required, Default false | Read/unread state |

## 3.3 Development Methodology

The development used an iterative Agile approach, allowing modules to be delivered and validated incrementally while continuously refining features based on testing and stakeholder feedback.

### 3.3.1 Process Model

The selected model is Agile Incremental Development with mock-first prototyping.

Applied phases:

1. Requirements Analysis: Gathered functional and non-functional requirements from service workflows.
2. System Design: Planned architecture, route groups, UI components, and data structures.
3. Implementation: Built modules iteratively per user role and service domain.
4. Testing: Performed functional checks, role-flow validation, and regression testing.
5. Integration Readiness: Maintained abstraction for migration from mock provider to backend provider.
6. Deployment and Maintenance Planning: Prepared scripts, quality checks, and documentation for handoff and scaling.

### 3.3.2 Development Tools

The following tools were used in development:

1. Programming Language: TypeScript and JavaScript
2. Framework and Library: Next.js (App Router), React
3. Styling: Tailwind CSS
4. Code Quality: ESLint, TypeScript strict typing
5. Data Layer: Mock provider and pluggable data-provider interface
6. IDE: Visual Studio Code
7. Version Control: Git and GitHub
8. Debugging and Testing Utilities: Browser developer tools and built-in app validation scripts

## 3.4 Test Methodology/Procedures

Testing was conducted to verify that all required features behave correctly and that the system is usable and reliable.

Testing procedures:

1. Functional Testing of all core modules
2. Role-Based Testing for resident, staff, and admin flows
3. Interface and Responsiveness Testing on different viewport sizes
4. Data Consistency Testing of status transitions and records
5. Regression Testing after major updates
6. User Acceptance Testing to validate readiness and usability

## 3.5 System Requirements

This section specifies the hardware and software resources needed to run the system.

### Table 3. Sample System Requirements

| Category | Minimum Requirement | Recommended |
|---|---|---|
| Processor | Intel Core i3 or equivalent | Intel Core i5 or higher |
| RAM | 4 GB | 8 GB or higher |
| Storage | 500 GB HDD or 128 GB SSD | 256 GB SSD or higher |
| Database | MySQL | MySQL with phpMyAdmin |
| Other Requirements | Internet connection for online features | Stable internet and LAN access (if needed) |

## 3.6 Quality Plan

The Quality Plan outlines strategies to ensure performance, reliability, maintainability, and user satisfaction.

Quality measures:

1. Structured coding standards and modular architecture
2. Routine code review and lint checks
3. Incremental testing during each sprint cycle
4. Use of realistic mock scenarios for early issue detection
5. User Acceptance Testing before finalization
6. Documentation for maintainability and scalability

Discussion of ISO software quality standards such as ISO/IEC 25010 may be included to support evaluation criteria.

## 3.7 Evaluation Plan

The Evaluation Plan describes how the system was assessed in terms of usability, functionality, speed, and reliability.

Evaluation methods:

1. Structured user task execution
2. Survey questionnaires
3. Interviews and feedback sessions
4. Observation of error rates and completion times

Evaluation criteria:

1. Ease of use
2. Accuracy of outputs
3. Processing speed
4. Reliability and consistency

## 3.8 Ethical Considerations

Ethical standards were followed throughout system development, data gathering, and user testing, including compliance with RA 10173 (Data Privacy Act of 2012).

Ethical safeguards:

1. Informed consent before participation
2. Voluntary participation with right to withdraw
3. Confidential handling of participant data
4. Data usage limited to project and academic purposes
5. Proper citation of external references to avoid plagiarism

## 3.9 Data Analysis (Procedure and Treatment)

This section explains how quantitative and qualitative data gathered from testing and user feedback were processed and interpreted.

1. Quantitative data from Likert-scale instruments were tallied and averaged.
2. Mean scores were used to determine user agreement levels on usability and performance indicators.
3. Qualitative comments were categorized to identify recurring issues and recommendations.
4. Results were consolidated to produce actionable improvement priorities.

## 3.10 Statistical Treatments

Descriptive statistics were used to summarize evaluation data.

1. Frequency: number of respondents per option.
2. Percentage: proportion of each response.
3. Mean: average rating for each criterion.

Formula for percentage:

\[
P = \frac{f}{N} \times 100
\]

Formula for weighted mean:

\[
\bar{X} = \frac{\sum (f \cdot x)}{N}
\]

Where:

1. f = frequency of response
2. x = numerical weight
3. N = total number of responses

Statistical Treatment covers the numerical procedures, while Data Analysis includes broader interpretation by combining computed results with qualitative findings.
