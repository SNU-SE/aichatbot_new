# Task 10 Implementation Summary: Class-Scoped Activity Visibility

## Overview
We introduced per-class visibility controls for teaching activities so administrators can limit each activity to a specific set of classes instead of exposing everything to the entire student body. The default experience remains “전체” (all classes), but administrators can now opt into a curated list of classes, and students only see activities assigned to their class.

## Database & Supabase
- Added migration `20250915123000_activity_class_assignments.sql` creating `activity_class_assignments` with `(activity_id, class_name)` uniqueness, timestamps, cascading FK to `activities`, and indexes on `activity_id`/`class_name`.
- Enabled RLS with `SELECT` permitted for any authenticated user and mutations restricted to admins via `public.has_role`.
- Updated generated Supabase types (`src/integrations/supabase/types.ts`) to expose the new table for typed queries.

## Shared Types & Hooks
- Extended `Activity`/`ActivityFormData` (`src/types/activity.ts`) with `assignedClasses` and `allowAllClasses` helpers.
- Updated `useActivities` (`src/hooks/useActivities.ts`) to join `activity_class_assignments`, normalise `assignedClasses`, and compute the boolean `allowAllClasses` for admin-facing views.

## Admin Experience
- `ActivityForm` (`src/components/admin/activity/ActivityForm.tsx`):
  - Added class scope selector (전체 vs 선택한 클래스) with Radix radio + checkbox UI.
  - Fetches distinct class names from `students`, handles empty/error states, and persists assignments on submit (clearing previous rows before reinserting the selection).
  - Guards against saving when “선택한 클래스” is chosen without any classes.
- `ActivityList` (`src/components/admin/activity/ActivityList.tsx`): displays a “대상 클래스” column with badges summarising scope (전체 or specific class names).

## Student Experience
- `ActivitySelection` (`src/components/student/ActivitySelection.tsx`):
  - Loads the student’s class from `studentProfile` cache (or Supabase fallback) and caches the class name.
  - Fetches activities with assignments, filters them according to the student’s class, and surfaces only general chat and class-visible activities.
  - Adds a lightweight notice when no class information is available so the student understands why only “전체 공개” 활동 is shown.
- `StudentDashboard` (`src/pages/StudentDashboard.tsx`) now forwards `studentId` so `ActivitySelection` can resolve the class on-demand.

## Supporting Updates
- Migration + type additions require `pnpm supabase gen types typescript --local` (or `supabase gen types`) before committing to keep Supabase typings in sync.
- Documentation refreshed in this summary to capture the new visibility workflow.

## Validation & Follow-up
Manual checks performed:
- Create/edit activity, toggle between “전체” and custom class lists, ensure assignments are persisted and reflected in the admin list.
- Students from matching and non-matching classes see the expected activity cards; general chat always appears.
- RLS prevents non-admin writes to `activity_class_assignments` (reads remain open for client filtering).

Recommended next steps (optional):
1. Add automated tests around activity filtering if a testing harness is available.
2. Extend analytics dashboards to show coverage by class using the new table.
