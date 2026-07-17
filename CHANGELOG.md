# Changelog

All notable changes to MediReminder that are not yet committed.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased] — 2026-07-17

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

#### Patient cascade deletion
- Added a destructive **Delete Patient** action to the patient detail page with confirmation, progress state, and error handling.
- Deleting a patient removes all of their caretaker-owned medicines and reminders before deleting the patient document.
- Shared medicine and reminder copies are also removed from every currently assigned on-platform helper.
- Added patient-based and original-medicine-based cleanup helpers for owner and helper reminder collections.
- Added scoped Firestore access allowing a caretaker to query and delete only helper records they originally shared.
- Helper reminder delete queries now constrain `sharedHelperReminder`, `sharedToUid`, and `addedByUid` to match Firestore security rules.
- Daily reminders generated from shared helper medicines now retain `sharedHelperReminder`, `sharedToUid`, `addedByUid`, and `originalMedicineId` metadata.
- Added helper-side orphan reminder cleanup so stale reminders are removed after their shared medicine is deleted.

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
- Added a **Myself** patient option that creates/selects the signed-in user's self-patient record when needed.
- Patient choices now wrap across multiple rows so all patient names remain visible.
- Added explicit loading and empty-account messages for the patient selector.
- Added a dedicated **Add patient** option and disabled patient switching while editing an existing medicine.
- Reduced the compact header height and removed the large blank header graphic.

#### Patient helpers (`app/patient/[id].tsx`)
- Off-platform helpers cannot be assigned when WhatsApp is disabled — helpers must have a MediReminder account.
- WhatsApp number fields in the assign-helper modal hidden when WhatsApp is disabled.
- Helper badge text updated for off-platform helpers when WhatsApp is off.

#### Reminder handling (`contexts/medi-data-context.tsx`)
- Auto-mark-as-missed logic now applies only to **today's** reminders, not past days.
- Daily sync uses refs for latest medicines/patients/reminders to avoid re-running on every reminder update.
- Medicine `nextReminder` values are now enriched live from schedule times and today's reminder statuses.
- After a dose is taken, skipped, or missed, medicine cards advance to the next pending dose time.
- When all doses for today are handled, the next label shows tomorrow's first dose if the medicine remains active.
- Medicines outside their active date range show **All doses done** instead of a stale time.
- Dynamic next-dose labels are shared across the home, patients, reminders, medicine detail, and patient detail views.

#### Home quick actions (`app/(tabs)/index.tsx`)
- Removed the unused **Scan Medicine** and **View Reports** quick-action buttons.
- Restored a balanced two-column block layout for the remaining **Add Reminder** and **Add Patient** actions.
- Added accessibility labels and button roles to the remaining quick actions.

#### Auth (`contexts/auth-context.tsx`)
- `SignUpOptions.whatsapp` is optional again.
- `onWhatsapp` forced to `false` on sign-up and profile update when WhatsApp is disabled.

### Fixed

- **Sign-up Firestore error**: Fixed `setDoc called with invalid data` when WhatsApp number was left empty by stripping `undefined` from profile writes.
- **Patients tab layout**: Left-side patient info stays aligned whether or not a schedule exists.
- **Duplicate helper reminders**: Daily sync checks helper Firestore collections before creating shared copies.
- **Duplicate WhatsApp queue entries**: `dailyWhatsappDate` marker prevents re-queuing on the same day (when WhatsApp is enabled).
- **Stale medicine next time**: Completing today's dose now advances the displayed next time instead of continuing to show the completed dose.
- **Helper cascade cleanup**: Shared helper reminders generated by both the app and Cloud Function now include the metadata required for caretaker deletion.
- **Patient selector clarity**: The add-medicine screen now distinguishes loading, no-patient, and selectable-patient states.

### Disabled

#### WhatsApp (temporary)
- Set `WHATSAPP_ENABLED = false` in `constants/features.ts` and `functions/src/features.ts`.
- `processWhatsappQueue` Cloud Function is commented out so deploy does not require `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, or `WHATSAPP_API_VERSION` secrets.
- `queueWhatsappMessage()` no-ops when WhatsApp is disabled.
- Daily sync and Cloud Function skip WhatsApp queuing when the flag is off.
- UI for WhatsApp removed or hidden on sign-up, profile, settings, add medicine, and helper assignment.

### Deployment notes

- Deploy the updated helper cascade permissions:
  ```bash
  firebase deploy --only firestore:rules
  ```
- Build and redeploy daily reminder generation so new helper reminders include cascade metadata (no WhatsApp secrets needed):
  ```bash
  cd functions
  npm run build
  cd ..
  firebase deploy --only functions:generateDailyReminders
  ```
- Firebase may require a **collection group index** on `medicines` with `status` — follow the link in the deploy output if prompted.
- To re-enable WhatsApp later: set `WHATSAPP_ENABLED = true` in both feature files, uncomment `processWhatsappQueue` in `functions/src/index.ts`, configure secrets, and redeploy all functions.

### Files changed (uncommitted)

**Modified**
- `app/(tabs)/index.tsx`
- `app/(tabs)/patients.tsx`
- `app/(tabs)/settings.tsx`
- `app/medicine/add.tsx`
- `app/patient/[id].tsx`
- `app/profile.tsx`
- `app/register.tsx`
- `constants/mock-data.ts`
- `contexts/auth-context.tsx`
- `contexts/medi-data-context.tsx`
- `firestore.rules`
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
