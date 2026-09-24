# S.P.A.R.K. — Demo Cheat-Sheet

Everything you need for tomorrow, in one page.

---

## 1. Start the stack (2 terminals, or one after another)

```bash
# Terminal 1 — backend (port 5000)
cd Avishkar
npx tsx server/index.ts

# Terminal 2 — frontend (port 5174)
cd Avishkar
npx vite --port 5174 --strictPort
```

Open **http://localhost:5174** → **Sign In**.

> **Before the demo, run the demo seed once.** It's idempotent (safe to re-run
> any time, even live between demo sessions, to reset the data):
>
> ```bash
> cd Avishkar
> npm run seed:demo
> ```

---

## 2. Demo logins — password for all: `Demo@2026`

| Portal          | Email                                  | What you'll see |
|-----------------|----------------------------------------|-----------------|
| Student         | `demo.student@spark.ac.in`             | Aarav Sharma, IIT Bombay, readiness 78%, 6 verified skills, 6 applications across all ATS stages, offer letter 🎉 |
| Alumni Mentor   | `ananya.deshpande@alumni.coep.ac.in`   | Ananya Deshpande (Zoho) — mentor dashboard with 1 mentee chat room + 1 fast-track referral |
| College (TPO)   | `demo.college@spark.ac.in`             | Prof. Meera Joshi, TPO workspace |
| Industry (HR)   | `demo.industry@spark.ac.in`            | Rahul Verma (HR) — global ATS pipeline view |
| Government      | `demo.gov@spark.ac.in`                 | Directorate portal, 2 pending verification rows |

**Student login flow:** Select **Student** portal → email + password → Enter.
You land on the Profile with **Aarav Sharma / IIT Bombay / 78%** (real DB identity,
not the old cached demo persona).

---

## 3. Seeded demo data (all via `npm run seed:demo`)

- **6 applications** for Aarav: Applied → Under Review → Assessment Sent →
  Shortlisted → Interview Scheduled → **Offer Extended** (with recruiter notes)
- **4 notifications**: offer 🎉, interview scheduled, assessment reminder, new matches
- **3 assessment attempts** (58% → 67% → 74%) for the analytics trajectory chart
- **Accepted mentorship**: Aarav ↔ Ananya with a 3-message chat room
- **Fast-track referral**: Backend Engineer @ Zoho posted by Ananya
- **2 gov verification rows**: VJTI (recognized), Walchand Sangli (pending)

---

## 4. What was fixed (talking points if asked)

1. **Security** — Admin table CRUD and `/notifications` now require a JWT;
   notifications are scoped to the signed-in user only.
2. **Identity sync** — Login now drives the whole app via `GET /students/me`:
   profile, applications, and mentor lookups all use the real session email.
   MentorDashboard resolves verified alumni correctly (no more "No verified
   alumni profile yet").
3. **Roadmaps** — auto-created for every student (including brand-new ones);
   assessments guarantee one too. No more 404s.
4. **Personal vs global data** — PlacementTracker/ProgressAnalytics show only
   *your* applications; Industry dashboard keeps the global pipeline.
5. **Display bugs** — salaries ordered low→high, ₹ renders correctly,
   dates shown as "27 Sept 2026" (no raw ISO strings).
6. **Assessment lock** — no longer traps you after a reload if there is no
   in-progress attempt saved.
7. **Fake telemetry removed** — Live Coding Telemetry card now fetches real
   GitHub/LeetCode data (or shows "link your profile" guidance).

---

## 5. Suggested demo path (10 min)

1. **Student**: Profile (verified skills, ID-card badge) → AI Assessment
   *(optional, 10 min — skip live)* → Skill Gap → Roadmap (modules load for
   new students too) → Smart Matching (salary benchmarks, ₹) → Placement
   Tracking (6 stages, offer) → Notifications (bell icon: 4 items)
2. **Alumni**: sign in as Ananya → Mentor Dashboard → My Mentees → open chat
   room with Aarav → Fast-Track tab (Zoho referral)
3. **Industry**: sign in as HR → Dashboard → global applicant table →
   update an application status
4. **Government**: sign in → Verification Queue (VJTI row) → approve it
5. Close on the student's **Competency Passport (PDF)**.

---

## 6. Troubleshooting

- **Backend won't start / port busy**: `netstat -ano | findstr :5000` →
  `taskkill /PID <pid> /F` → start again. (`.env` PORT=0 is guarded in code.)
- **Data looks stale or wrong**: re-run `npm run seed:demo` (safe any time).
- **Login fails**: all demo passwords are exactly `Demo@2026`.
- **Frontend blank**: hard refresh (Ctrl+Shift+R) once after backend restart.
