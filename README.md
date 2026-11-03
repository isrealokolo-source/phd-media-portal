# PHD Services Release Management & Rights Clearance Portal

A production-grade, full-stack enterprise web application built for **PHD Services ("PHD")** to digitise, manage, clear, administer, and execute music releases and their accompanying legal schedules:
- **Schedule A**: Standard Release Schedule and Master Register.
- **Schedule B**: Standard Rights Documentation and Clearance Register.

The portal implements the provisions, terminology, declarations, acknowledgements, general schedule terms, and 70/30 revenue waterfall from the authoritative **Music Distribution, Management & Master Control Agreement**.

---

## 1. Key Capabilities & Architecture

- **Artist Portal**:
  - Artist registration, login, and secure dashboard.
  - Multi-step release registration wizard with auto-saving progress.
  - Master Recording Register with multi-track management, ISRC tracking, language, explicit declarations, and 100% ownership splits.
  - 14-point statutory Schedule B Rights Clearance Checklist with document references, notes, and pending clearance warnings.
  - Deliverables management: lossless WAV audio file inspection (sample rate, bit depth, channels, lossy checks) and 3000x3000px square cover artwork validation.
  - Expense ledger with 70% Artist / 30% PHD recoupment waterfall simulator.
  - HTML5 digital signature pad (drawn & typed signatures) with audit snapshot hashing.

- **PHD Administration Portal**:
  - Executive dashboard with release volume, clearance health, readiness metrics, and upcoming dates.
  - Submission management table with real-time search, sorting, and status filtering.
  - Comprehensive 10-tab release review console with audio playback, document previews, and section-specific revision requests.
  - Formal countersigning & execution workflow with statutory inspection confirmation.
  - Artist registry and release catalogue tracking.
  - Operational configuration (company contact, default signatories, currencies, reference prefix).

- **Legal Document Generation & Execution Engine**:
  - Server-side PDF generation reproducing the exact text, tables, continuation sheets, and signatory blocks of Schedule A and Schedule B.
  - Embedded digital signatures (Artist & PHD Representative) with exact execution timestamps.
  - SHA-256 cryptographic document hash calculation and immutable storage in the database.
  - Separate downloads for Schedule A, Schedule B, and Combined Schedules.
  - Immutable execution records: executed agreements cannot be altered in place; amendments initiate a fresh approval lifecycle.

- **Automated Workflow & Notifications**:
  - Status transitions: `DRAFT` ➔ `SUBMITTED_PENDING_APPROVAL` ➔ `REVISION_REQUESTED` ➔ `RESUBMITTED` ➔ `FULLY_EXECUTED_APPROVED` ➔ `ON_HOLD`.
  - Transactional email notifications via Resend (with simulated dev logger fallback):
    1. Artist Submission (sent to PHD Operations with review link).
    2. Revision Request (sent to Artist with feedback and resume link).
    3. Release Execution (sent to Artist with executed PDFs and permanent vault link).
    4. On Hold Notice (sent to Artist with reason).
  - Comprehensive audit logging of all user and system events.

- **One-Click Demo Mode**:
  - Prominent "Pre-fill Sample Release" button available in both portals.
  - Pre-fills Dekaf's *Midnight in Lagos EP* (4 tracks, splits, beat licence, sample clearances, deliverables, budget) for immediate testing.

---

## 2. Technology Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide React icons, React Hook Form, Zod validation, Framer Motion.
- **Backend**: Next.js Server Actions & API Routes, PostgreSQL 16 database, Prisma ORM.
- **Authentication**: Secure bcrypt password hashing, JSON Web Tokens (JWT), HTTP-only cookies, role-based access control (`SUPER_ADMIN`, `ADMIN`, `RELEASE_REVIEWER`, `ARTIST`).
- **PDF Engine**: `pdf-lib` vector rendering with Helvetica/Courier embedding, table drawing, and SHA-256 hashing.
- **File Storage**: Local persistent disk storage under `public/uploads/` (`masters/`, `artwork/`, `documents/`, `signatures/`, `pdfs/`).
- **Email**: Resend transactional email integration with automatic development logger.

---

## 3. Environment Variables Setup

Create a `.env` file in the root directory (refer to `.env.example`):

```bash
# Database: PostgreSQL connection URL
DATABASE_URL="postgresql://israeluwaishe@127.0.0.1:5432/phd_portal?sslmode=disable"

# Application URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# JWT Secret for session authentication
JWT_SECRET="phd-services-secure-jwt-signing-key-production-grade-2026"

# Resend API Key (Optional: leave empty to use built-in simulated transactional logger)
RESEND_API_KEY=""

# PHD Administrative Operations Email
PHD_ADMIN_EMAIL="operations@phdservices.com"

# Storage Directory for Uploaded Assets
UPLOAD_DIR="./public/uploads"
```

---

## 4. Installation & Database Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```

3. **Sync Database Schema**:
   ```bash
   npx prisma db push
   ```

4. **Seed Default Accounts & Configuration**:
   ```bash
   npm run db:seed
   ```

---

## 5. Default Demonstration Accounts

The database seed initializes the following pre-configured credentials:

| Role | Email | Password | Purpose |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@phdservices.com` | `Password123!` | Full administrative, review, countersigning & settings access |
| **Release Reviewer** | `reviewer@phdservices.com` | `Password123!` | Review console, audio QA & revision request access |
| **Artist (Dekaf)** | `artist@dekaf.com` | `Password123!` | Release creation, track registration, signing & vault access |

*Note: You can also use the one-click demo login buttons directly on the login screen (`/login`).*

---

## 6. Development & Production Commands

- **Start Development Server**:
  ```bash
  npm run dev
  ```
  Open [http://localhost:3000](http://localhost:3000) in your browser.

- **Run Automated End-to-End Workflow Test Suite**:
  ```bash
  npx tsx scripts/test-workflow.mjs
  ```
  *(Tests authentication, sequential reference generation, track splits, 14 clearance items, readiness score, signing, revision request cycle, countersigning, PDF generation, SHA-256 calculation, and access control).*

- **Build for Production**:
  ```bash
  npm run build
  ```

- **Start Production Server**:
  ```bash
  npm start
  ```

---

## 7. Legal Document Structure Preserved

The application strictly preserves all terms from `RELEASE SCHEDULE.docx`:
- **Schedule A**:
  - Part I: Release Information
  - Part II: Master Recording Register (with continuation pages for multi-track releases)
  - Part III: Release Deliverables and Deadlines
  - Part IV: Release Budget and Approved Recoupable Costs (including Clauses 1 to 6)
  - Part V: Approval and Incorporation (Dual Signatures)
- **Schedule B**:
  - Part I: Master Ownership Declaration & Statutory Artist Declaration
  - Part II: 14-Point Rights Clearance Checklist & Pending Clearance Warning
  - Part III: Producer and Contributor Register (fees, publishing, master share distinctions)
  - Part IV: Beat, Sample and Third-Party Licence Form
  - Part V: Featured Artist and Performer Consent Register
  - Part VI: Artwork and Audiovisual Rights Register
  - Part VII: Rights Document Submission Log
  - Part VIII: Final Clearance Confirmation (Artist Confirmation & PHD Acknowledgment)
  - General Schedule Terms (Clauses 1 to 6: Incorporation, Ownership, Scope of control, Changes, Conflicts, Records).

