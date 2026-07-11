# Changelog

All notable changes to MediReminder that are not yet committed.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased] — 2026-07-12

### Added

#### Daily reminder generation
- Added `lib/firestore/daily-reminders.ts` to create today's reminder records for all active medicines within their start/end date range (or ongoing medicines with no end date).
- Each dose time gets a separate reminder per day; duplicates are prevented via in-memory checks and Firestore slot queries (`reminderSlotExists`).
- Caretakers receive daily reminders for their own medicines.
- On-platform helpers assigned to a patient receive shared reminder copies in their account each day.
- Helpers with shared medicine copies also get reminders when their app sync runs.
- Wired daily sync into `contexts/medi-data-context.tsx` — runs on app load, when the date changes (checked every minute), and when the app returns to foreground.
- Added `generateDailyReminders` Cloud Function (`functions/src/daily-reminders.ts`) that runs every 30 minutes server-side to generate reminders even when the app is not open.
- Added `dailyWhatsappDate` field on medicines to avoid duplicate WhatsApp queue entries when WhatsApp is enabled.

#### Firebase Cloud Functions
- Added `functions/src/features.ts` feature flag (mirrors app config).
- Added `functions/src/daily-reminders.ts` with server-side daily reminder and helper-sharing logic.

#### Feature flags
- Added `constants/features.ts` with `WHATSAPP_ENABLED` flag to toggle WhatsApp across the app and functions without removing code.

#### Firestore helpers
- Added `reminderSlotExists()` in `lib/firestore/reminders.ts` to query whether a reminder already exists for a given day, time, and medicine.
- Added `omitUndefined()` when writing reminders so Firestore never receives invalid `undefined` values.

### Changed

#### Patients tab UI (`app/(tabs)/patients.tsx`)
- Fixed card layout alignment when a patient has no schedule.
- Email displays on a single line with middle ellipsis when long.
- Patient name shows in full (wraps to multiple lines on its own row).
- Platform badge moved below the name so it no longer truncates the name.
- "No schedule" label is vertically and horizontally centered in the schedule column.
- Schedule column stretches to full card height for consistent layout.

#### Sign-up & profile
- Sign-up no longer sends `undefined` to Firestore when optional fields are empty (`lib/firestore/user-profile.ts` builds payloads field-by-field; empty strings stored as `null`).
- WhatsApp number and opt-in fields on sign-up are shown only when `WHATSAPP_ENABLED` is true.
- Profile WhatsApp section hidden when WhatsApp is disabled.
- Settings page hides WhatsApp status card and Message Setup link when WhatsApp is disabled.

#### Add medicine (`app/medicine/add.tsx`)
- WhatsApp notification toggle hidden when WhatsApp is disabled; `notifyWhatsapp` forced to `false` on save.
- Sets `dailyWhatsappDate` after queuing WhatsApp on first save (when WhatsApp is enabled).

#### Patient helpers (`app/patient/[id].tsx`)
- Off-platform helpers cannot be assigned when WhatsApp is disabled — helpers must have a MediReminder account.
- WhatsApp number fields in the assign-helper modal hidden when WhatsApp is disabled.
- Helper badge text updated for off-platform helpers when WhatsApp is off.

#### Reminder handling (`contexts/medi-data-context.tsx`)
- Auto-mark-as-missed logic now applies only to **today's** reminders, not past days.
- Daily sync uses refs for latest medicines/patients/reminders to avoid re-running on every reminder update.

#### Auth (`contexts/auth-context.tsx`)
- `SignUpOptions.whatsapp` is optional again.
- `onWhatsapp` forced to `false` on sign-up and profile update when WhatsApp is disabled.

### Fixed

- **Sign-up Firestore error**: Fixed `setDoc called with invalid data` when WhatsApp number was left empty by stripping `undefined` from profile writes.
- **Patients tab layout**: Left-side patient info stays aligned whether or not a schedule exists.
- **Duplicate helper reminders**: Daily sync checks helper Firestore collections before creating shared copies.
- **Duplicate WhatsApp queue entries**: `dailyWhatsappDate` marker prevents re-queuing on the same day (when WhatsApp is enabled).

### Disabled

#### WhatsApp (temporary)
- Set `WHATSAPP_ENABLED = false` in `constants/features.ts` and `functions/src/features.ts`.
- `processWhatsappQueue` Cloud Function is commented out so deploy does not require `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, or `WHATSAPP_API_VERSION` secrets.
- `queueWhatsappMessage()` no-ops when WhatsApp is disabled.
- Daily sync and Cloud Function skip WhatsApp queuing when the flag is off.
- UI for WhatsApp removed or hidden on sign-up, profile, settings, add medicine, and helper assignment.

### Deployment notes

- Deploy daily reminders only (no WhatsApp secrets needed):
  ```bash
  cd functions && npm run build
  firebase deploy --only functions:generateDailyReminders
  ```
- Firebase may require a **collection group index** on `medicines` with `status` — follow the link in the deploy output if prompted.
- To re-enable WhatsApp later: set `WHATSAPP_ENABLED = true` in both feature files, uncomment `processWhatsappQueue` in `functions/src/index.ts`, configure secrets, and redeploy all functions.

### Files changed (uncommitted)

**Modified**
- `app/(tabs)/patients.tsx`
- `app/(tabs)/settings.tsx`
- `app/medicine/add.tsx`
- `app/patient/[id].tsx`
- `app/profile.tsx`
- `app/register.tsx`
- `constants/mock-data.ts`
- `contexts/auth-context.tsx`
- `contexts/medi-data-context.tsx`
- `functions/src/index.ts`
- `lib/firestore/medicines.ts`
- `lib/firestore/reminders.ts`
- `lib/firestore/user-profile.ts`
- `lib/firestore/whatsapp.ts`

**Added**
- `CHANGELOG.md`
- `constants/features.ts`
- `functions/src/daily-reminders.ts`
- `functions/src/features.ts`
- `lib/firestore/daily-reminders.ts`
