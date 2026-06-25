# Excellence Online College — Student MIS

A complete **Management Information System (MIS)** for managing students at [Excellence Online College](https://lms.excellenceonlinecollege.com/). Built with **Next.js**, **Supabase**, and deployable on **Vercel**.

## Features

| Module | Description |
|--------|-------------|
| **Dashboard** | KPIs: students, enrollments, revenue, pending fees |
| **Students** | Register in MIS first; auto admission numbers (`ADM-2026-0001`), ID cards, then import to LMS |
| **Programs** | Diploma & certificate programs with tuition fees |
| **Courses** | Course catalog linked to programs |
| **Enrollments** | Enroll students in courses per academic term |
| **Attendance** | Daily attendance tracking (present, absent, late, excused) |
| **Fees** | Tuition and payment tracking in KES |
| **Reports** | Students by status/program, fee collection summary |
| **LMS Import** | One-click import to Moodle LMS via Web Services API |

## Admission Workflow

```
1. Register Student in MIS  →  Auto admission number (ADM-2026-0001)
2. ID Card auto-generated   →  Print from student profile
3. Import to Moodle LMS     →  Creates LMS account with temp password
```

Staff register students in the MIS first. The system automatically assigns an admission number and generates a printable student ID card. When ready, click **Import to LMS** to create the student's Moodle account.

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, Row Level Security)
- **Hosting:** Vercel

---

## Quick Start

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Open **SQL Editor** and run the migration file:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_admission_lms_idcard.sql
```

This creates all tables, RLS policies, triggers, and sample programs/courses.

### 2. Configure environment variables

Copy the example env file and add your Supabase credentials:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
MOODLE_URL=https://lms.excellenceonlinecollege.com
MOODLE_WS_TOKEN=your-moodle-webservice-token
```

Find these in Supabase → **Project Settings** → **API**.

### 3. Enable email auth in Supabase

In Supabase Dashboard → **Authentication** → **Providers**:
- Enable **Email** provider
- For development, disable "Confirm email" under Email settings

### 4. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), create an account, and start managing students.

---

## Deploy to Vercel

### Option A: Vercel CLI

```bash
npm i -g vercel
vercel
```

### Option B: GitHub integration

1. Push this repo to GitHub
2. Import the project at [vercel.com/new](https://vercel.com/new)
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

### Post-deploy: Supabase auth redirect

In Supabase → **Authentication** → **URL Configuration**, add your Vercel URL:

- **Site URL:** `https://your-app.vercel.app`
- **Redirect URLs:** `https://your-app.vercel.app/**`

---

## User Roles

| Role | Access |
|------|--------|
| `admin` | Full access, can update all profiles |
| `staff` | Manage students, programs, courses, fees |
| `teacher` | View/manage courses and attendance |
| `student` | View own records only |

Set role during signup or update in the `profiles` table.

---

## Database Schema

```
profiles          → Staff/admin users (linked to Supabase Auth)
academic_terms    → Intake periods (Jan 2026, Jul 2026, etc.)
programs          → Academic programs (DIT, CBA, DOE)
courses           → Courses within programs
students          → Student records
enrollments       → Student ↔ Course ↔ Term
attendance        → Daily attendance per enrollment
fee_payments      → Tuition and payment tracking
```

Admission numbers are auto-generated: `ADM-YYYY-XXXX` (e.g. `ADM-2026-0001`).

---

## Moodle LMS Integration

### Setup Moodle Web Services

1. In Moodle → **Site administration** → **Plugins** → **Web services** → enable web services
2. Create a web service token for a user with permission to create users (`core_user_create_users`)
3. Add to `.env.local`:
   ```env
   MOODLE_URL=https://lms.excellenceonlinecollege.com
   MOODLE_WS_TOKEN=your-token-here
   ```

### Import flow

1. Register student in MIS (admission number + ID card created automatically)
2. Open student profile → click **Import to LMS**
3. System creates Moodle account with username derived from admission number
4. Temporary password is shown once — share securely with the student

---

## Project Structure

```
src/
├── app/
│   ├── actions/          # Server actions (CRUD)
│   ├── dashboard/        # Protected MIS pages
│   ├── login/            # Auth pages
│   └── signup/
├── components/
│   ├── layout/           # Sidebar, shell
│   ├── students/         # Student forms & search
│   └── ui/               # Reusable UI components
└── lib/
    ├── supabase/         # Supabase clients
    └── types.ts          # TypeScript types
supabase/
└── migrations/           # SQL schema
```

---

## License

Private — Excellence Online College
