# Unique Features Build Plan (14 features, phased)

Building features **1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16** — everything from the list except #2 (Parent Digest) and #3 (Class Pulse).

This is a large scope, so I'll ship in **4 phases**. Each phase is independently useful, tested end-to-end, and won't break existing screens.

---

## Phase 1 — Faculty & HOD Power Tools (highest ROI, uses existing data)
1. **Smart Substitute Auto-Suggest** — extend `substitute_allocations` flow; scoring by subject expertise, free period, workload, history. UI on `AdminSubstitutes.tsx`.
8. **Anomaly Radar** — new HOD panel tab; edge function scans attendance drops, suspicious marking speed, sudden CGPA falls; ranked alert feed.
10. **Faculty Load Balancer** — new HOD tab; visual weekly grid (hours + corrections + substitutions + mentees) with red/yellow/green heat.
11. **Immutable Grade Ledger** — new `grade_audit` table + trigger on `subject_scores`/`academic_records`; student-visible history view.

## Phase 2 — Student Success
4. **Attendance Predictor + What-If Slider** — on `StudentAttendance.tsx`; pure client math using existing attendance rows.
16. **Exam Countdown + Auto-Revision Planner** — reads `exam_timetable` + `subject_scores`; AI generates 14-day plan per student.
6. **Career Path Simulator** — student picks role → AI (Lovable AI Gateway) returns readiness %, gaps, certs, matched alumni from `alumni` table.
7. **Auto Resume + LinkedIn Sync** — auto-compile resume PDF from `student_achievements` + `student_activities` + academics; LinkedIn snippet formatter.

## Phase 3 — Trust, Feedback & AI Doubt
12. **Anonymous Complaint Box → Tutor** — new `anonymous_feedback` table; RLS routes to tutor of student's section without exposing identity.
14. **AI Doubt Assistant (Subject-Scoped)** — edge function; RAG over `class_notes` uploaded by faculty (embeddings on notes text/metadata) + fallback general knowledge with citations.
5. **Study Buddy Matcher** — AI groups students within a section by complementary `subject_scores`; tutor-visible pairings.

## Phase 4 — Placement & Alumni & BLE
9. **Placement War Room** — new admin page; eligibility filters (CGPA, backlogs, resume ready), bulk mail via edge function, offer tracker table.
15. **Alumni Reverse Mentorship** — new `mentorship_slots` + `mentorship_bookings` tables; alumni post slots, students book, auto thank-you note via AI.
13. **Bluetooth Beacon Attendance** — Web Bluetooth API on faculty device broadcasts session token; student PWA detects and self-marks. Fallback to QR when BLE unsupported. (Ships last — most experimental.)

---

## Technical notes
- **Backend**: Lovable Cloud (Postgres + edge functions). New tables added with proper RLS + GRANTs.
- **AI**: Lovable AI Gateway (`google/gemini-2.5-flash` default) for Anomaly Radar, Career Simulator, Doubt Assistant, Revision Planner, Buddy Matcher.
- **PDF**: reuse existing `src/lib/pdfReports.ts` for resume + OD-style outputs.
- **Routing**: new admin pages registered in `AdminLayout`; student pages in `StudentLayout`.
- **No breaking changes** to existing tutor/faculty/admin flows.

## Delivery order this turn
I'll start **Phase 1** now (Smart Substitute, Anomaly Radar, Load Balancer, Grade Ledger) in one build pass, then confirm before moving to Phase 2.

Approve to start Phase 1, or tell me to reorder / drop specific numbers.
