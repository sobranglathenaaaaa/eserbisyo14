# eSerbisyo — Service and Record Management System

A modern web application designed for Barangay Progreso to streamline document requests, resident management, and community services.

---

## What is eSerbisyo?

**eSerbisyo** is an all-in-one digital governance platform that connects barangay residents, staff, and administrators in a single, easy-to-use system. It replaces slow physical queues with fast online transactions, automated document generation, and real-time status updates.

---

## Features

### Resident Portal

- **Document Requests:** Easily request Barangay Clearance, Certificate of Indigency, Certificate of Residency, Business Permits, and more.
- **Request Tracking:** Real-time updates on submitted applications with status milestones.
- **Appointments & Reservations:** Book health center doctor checkups and reserve barangay equipment or facilities.
- **Blotter & Incident Reports:** Submit community concerns and incident reports directly to barangay officials.
- **AI Assistant:** 24/7 interactive guide to help residents with requirements and FAQs.

### Staff Portal

- **OCR Fast Issuance:** Scan paper forms and automatically extract applicant information.
- **Document Builder:** Generate official certificates with automated formatting, headers, and digital templates.
- **Blotter Management:** Handle incident records, schedule hearings, and issue summons.
- **Report Generator:** Create administrative reports such as BDRRMC summaries.

### Admin Portal

- **Account Verification:** Review and approve resident registrations and ID proofs.
- **Announcements:** Post public advisories, news, and community events.
- **User Management:** Manage staff roles and user accounts.
- **Census & Analytics:** View population statistics and service request analytics.

---

## Technical Specifications

- **Framework:** Next.js (App Router), React, TypeScript
- **Styling:** Tailwind CSS, Lucide Icons
- **Backend & Database:** Supabase (PostgreSQL, Authentication, Realtime)
- **Document Processing:** Tesseract.js (OCR), Docxtemplater, jsPDF

---

## How to run the code:

### 1. Clone the repository

```bash
git clone https://github.com/your-username/eserbisyo14.git
cd eserbisyo14
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run the development server

```bash
npm run dev
```

---

## Project Structure

```text
eserbisyo14/
├── app/          # Next.js pages and API routes (resident, staff, admin, auth)
├── components/   # Reusable UI components and document editors
├── features/     # Feature-specific logic for user roles
├── lib/          # Helper utilities, auth, OCR, and database clients
├── public/       # Logos, images, and public assets
├── supabase/     # Database schemas and migrations
└── template/     # Document templates (.docx)
```

---

## License

Developed for Barangay Progreso, San Juan City. All rights reserved.
