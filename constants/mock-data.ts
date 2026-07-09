export type ReminderStatus = 'taken' | 'missed' | 'snoozed' | 'skipped' | 'upcoming' | 'late';

export type PatientGender = 'Male' | 'Female' | 'Other' | 'Prefer not to say';

export type HelperNotifyVia = 'app' | 'whatsapp';

export interface PatientHelper {
  id: string;
  name: string;
  email?: string;
  onPlatform: boolean;
  linkedUserId?: string;
  whatsapp?: string;
  notifyVia: HelperNotifyVia;
}

export interface Patient {
  id: string;
  name: string;
  relationship: string;
  relationshipColor: string;
  age: number;
  gender?: PatientGender | string;
  email?: string;
  /** Whether this email belongs to an existing MediReminder account */
  onPlatform?: boolean;
  /** Linked Firebase Auth uid when onPlatform is true */
  linkedUserId?: string;
  phone?: string;
  bloodGroup?: string;
  notes?: string;
  avatar?: string;
  nextReminder: string;
  nextDay: string;
  dueToday: number;
  adherence: number;
  patientId?: string;
  /** Additional helpers who receive this patient's reminders */
  helpers?: PatientHelper[];
}

export interface Medicine {
  id: string;
  name: string;
  dosage: string;
  strength: string;
  type: string;
  instructions: string;
  category: string;
  description: string;
  startDate: string;
  endDate: string;
  doctorNote: string;
  status: 'active' | 'completed';
  nextReminder: string;
  nextDay: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  /** Display name of the patient this medicine belongs to */
  patientName: string;
  /** Firestore patient id this medicine is prescribed for */
  patientId?: string;
  /** If true, this medicine is a shared helper copy */
  sharedHelperMedicine?: boolean;
  /** Helper uid this copy belongs to */
  sharedToUid?: string;
  /** Caretaker uid who created this shared copy */
  addedByUid?: string;
  /** Original caretaker medicine id */
  originalMedicineId?: string;
  /** Schedule times in "8:00 AM" format */
  scheduleTimes?: string[];
  /** Display label e.g. "Twice daily" */
  frequency?: string;
  notifyPush?: boolean;
  notifySms?: boolean;
  notifyWhatsapp?: boolean;
  daysLeft: number;
}

export interface Reminder {
  id: string;
  time: string;
  date: string;
  medicine: string;
  patient: string;
  instructions: string;
  status: ReminderStatus;
  snoozeDuration?: string;
  patientId?: string;
  medicineId?: string;
  /** For helper-shared reminders: original caretaker medicine id */
  originalMedicineId?: string;
}

export interface Notification {
  id: string;
  title: string;
  subtitle: string;
  detail: string;
  time: string;
  status: string;
  statusColor: string;
  statusBg: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  section: 'Today' | 'Yesterday' | 'Earlier';
  unread?: boolean;
}

export const patients: Patient[] = [
  { id: '1', name: 'John Anderson', relationship: 'Self', relationshipColor: '#008B8B', age: 68, nextReminder: '8:00 AM', nextDay: 'Today', dueToday: 2, adherence: 85, patientId: 'AJ-1024' },
  { id: '2', name: 'Mary Anderson', relationship: 'Spouse', relationshipColor: '#7C3AED', age: 64, nextReminder: '12:30 PM', nextDay: 'Today', dueToday: 1, adherence: 90 },
  { id: '3', name: 'Michael Anderson', relationship: 'Son', relationshipColor: '#2B78D4', age: 38, nextReminder: '6:00 PM', nextDay: 'Today', dueToday: 3, adherence: 75 },
  { id: '4', name: 'Sarah Anderson', relationship: 'Daughter', relationshipColor: '#27AE60', age: 34, nextReminder: '9:00 AM', nextDay: 'Tomorrow', dueToday: 0, adherence: 88 },
  { id: '5', name: 'Robert Anderson', relationship: 'Father', relationshipColor: '#F2994A', age: 72, nextReminder: '7:30 PM', nextDay: 'Tomorrow', dueToday: 0, adherence: 70 },
  { id: '6', name: 'Mary Johnson', relationship: 'Mother', relationshipColor: '#7C3AED', age: 72, nextReminder: '8:00 AM', nextDay: 'Today', dueToday: 2, adherence: 85 },
  { id: '7', name: 'John Davis', relationship: 'Father', relationshipColor: '#F2994A', age: 65, nextReminder: '12:00 PM', nextDay: 'Today', dueToday: 1, adherence: 70 },
  { id: '8', name: 'Emily Wilson', relationship: 'Sister', relationshipColor: '#27AE60', age: 28, nextReminder: '6:00 PM', nextDay: 'Today', dueToday: 3, adherence: 90 },
];

export const medicines: Medicine[] = [
  { id: '1', name: 'Metformin', dosage: '1 tablet', strength: '500 mg', type: 'Tablet', instructions: 'After food, with water', category: 'Antidiabetic', description: 'Helps control blood sugar levels in adults with type 2 diabetes.', startDate: 'May 20, 2025', endDate: 'May 20, 2026', doctorNote: 'Take regularly as prescribed. Monitor blood sugar as advised.', status: 'active', nextReminder: 'Today, 8:00 AM', nextDay: 'Today', timeOfDay: 'morning', patientName: 'Sarah Johnson', daysLeft: 245 },
  { id: '2', name: 'Amlodipine', dosage: '1 tablet', strength: '5 mg', type: 'Tablet', instructions: 'After dinner', category: 'Antihypertensive', description: 'Used to treat high blood pressure.', startDate: 'Jan 15, 2025', endDate: 'Jan 15, 2026', doctorNote: 'Take at the same time each day.', status: 'active', nextReminder: 'Today, 6:00 PM', nextDay: 'Today', timeOfDay: 'evening', patientName: 'Emily Wilson', daysLeft: 180 },
  { id: '3', name: 'Vitamin D3', dosage: '1 tablet', strength: '1000 IU', type: 'Tablet', instructions: 'At bedtime', category: 'Supplement', description: 'Supports bone health and immune function.', startDate: 'Mar 1, 2025', endDate: 'Mar 1, 2026', doctorNote: 'Take with a meal containing fat.', status: 'active', nextReminder: 'Today, 9:00 PM', nextDay: 'Today', timeOfDay: 'night', patientName: 'Mary Johnson', daysLeft: 300 },
  { id: '4', name: 'Atorvastatin', dosage: '1 tablet', strength: '20 mg', type: 'Tablet', instructions: 'After lunch', category: 'Statin', description: 'Lowers cholesterol levels.', startDate: 'Nov 1, 2024', endDate: 'May 25, 2025', doctorNote: 'Avoid grapefruit juice.', status: 'active', nextReminder: 'Today, 12:00 PM', nextDay: 'Today', timeOfDay: 'afternoon', patientName: 'John Davis', daysLeft: 5 },
  { id: '5', name: 'Panadol', dosage: '1 tablet', strength: '500 mg', type: 'Tablet', instructions: 'Take with water after breakfast', category: 'Analgesic', description: 'Pain relief and fever reduction.', startDate: 'May 1, 2025', endDate: 'Jun 1, 2025', doctorNote: 'Do not exceed recommended dose.', status: 'active', nextReminder: 'Today, 8:30 AM', nextDay: 'Today', timeOfDay: 'morning', patientName: 'Alex Johnson', daysLeft: 30 },
];

export const todayReminders = [
  { id: '1', time: '8:00 AM', medicine: 'Metformin 500mg', instructions: '1 tablet • After breakfast', status: 'taken' as ReminderStatus, icon: 'sunny' },
  { id: '2', time: '12:00 PM', medicine: 'Atorvastatin 20mg', instructions: '1 tablet • After lunch', status: 'upcoming' as ReminderStatus, icon: 'sunny' },
  { id: '3', time: '6:00 PM', medicine: 'Amlodipine 5mg', instructions: '1 tablet • After dinner', status: 'upcoming' as ReminderStatus, icon: 'partly-sunny' },
  { id: '4', time: '9:00 PM', medicine: 'Vitamin D3 1000 IU', instructions: '1 tablet • At bedtime', status: 'upcoming' as ReminderStatus, icon: 'moon' },
];

export const reminderHistory: Reminder[] = [
  { id: '1', time: '09:02 AM', date: 'May 20, 2025', medicine: 'Metformin 500mg', patient: 'Sarah Johnson', instructions: '1 tablet • After breakfast', status: 'taken' },
  { id: '2', time: '08:00 AM', date: 'May 20, 2025', medicine: 'Atorvastatin 20mg', patient: 'John Davis', instructions: '1 tablet • After lunch', status: 'missed' },
  { id: '3', time: '07:30 AM', date: 'May 20, 2025', medicine: 'Amlodipine 5mg', patient: 'Emily Wilson', instructions: '1 tablet • After dinner', status: 'snoozed', snoozeDuration: 'Snoozed for 30 min' },
  { id: '4', time: '06:45 AM', date: 'May 20, 2025', medicine: 'Vitamin D3 1000 IU', patient: 'Mary Johnson', instructions: '1 tablet • At bedtime', status: 'taken' },
  { id: '5', time: '06:00 AM', date: 'May 20, 2025', medicine: 'Omeprazole 20mg', patient: 'Robert Brown', instructions: '1 tablet • Before breakfast', status: 'skipped' },
  { id: '6', time: '05:30 AM', date: 'May 20, 2025', medicine: 'Calcium 500mg', patient: 'Sarah Johnson', instructions: '1 tablet • With food', status: 'snoozed', snoozeDuration: 'Snoozed for 15 min' },
  { id: '7', time: '09:00 PM', date: 'May 19, 2025', medicine: 'Vitamin B12 1000mcg', patient: 'John Davis', instructions: '1 tablet • After dinner', status: 'taken' },
];

export const notifications: Notification[] = [
  { id: '1', title: 'Medicine due now', subtitle: 'Metformin 500mg', detail: 'Take 1 tablet • After breakfast', time: '08:00 AM', status: 'Due Now', statusColor: '#008B8B', statusBg: '#E6F2F2', icon: 'medical', iconColor: '#008B8B', iconBg: '#E6F2F2', section: 'Today', unread: true },
  { id: '2', title: 'Dose confirmed', subtitle: 'Atorvastatin 20mg', detail: '1 tablet • After lunch', time: '12:05 PM', status: 'Confirmed', statusColor: '#27AE60', statusBg: '#E8F8EF', icon: 'shield-checkmark', iconColor: '#008B8B', iconBg: '#E6F2F2', section: 'Today' },
  { id: '3', title: 'Missed-dose alert', subtitle: 'Vitamin D3 1000 IU', detail: 'Scheduled at 9:00 PM • Yesterday', time: '09:30 PM', status: 'Missed', statusColor: '#EB5757', statusBg: '#FDEEEE', icon: 'alert-circle', iconColor: '#EB5757', iconBg: '#FDEEEE', section: 'Today', unread: true },
  { id: '4', title: 'Reminder sent via WhatsApp', subtitle: 'Amlodipine 5mg', detail: 'Sent to +91 98765 43210', time: '06:15 PM', status: 'Sent', statusColor: '#27AE60', statusBg: '#E8F8EF', icon: 'logo-whatsapp', iconColor: '#25D366', iconBg: '#E8F8EF', section: 'Today' },
  { id: '5', title: 'Patient added successfully', subtitle: 'Emily Wilson', detail: 'New patient added to your list', time: 'Yesterday 03:45 PM', status: 'Success', statusColor: '#27AE60', statusBg: '#E8F8EF', icon: 'person-add', iconColor: '#008B8B', iconBg: '#E6F2F2', section: 'Yesterday' },
  { id: '6', title: 'Weekly adherence summary', subtitle: 'May 13 - May 19, 2025', detail: 'Your adherence was 85% this week', time: 'Yesterday 08:30 AM', status: 'Summary', statusColor: '#2B78D4', statusBg: '#EBF4FF', icon: 'bar-chart', iconColor: '#008B8B', iconBg: '#E6F2F2', section: 'Yesterday' },
  { id: '7', title: 'Reminder scheduled', subtitle: 'Vitamin D3 1000 IU', detail: 'Daily at 9:00 PM', time: 'May 19, 2025 09:00 PM', status: 'Scheduled', statusColor: '#2B78D4', statusBg: '#EBF4FF', icon: 'notifications', iconColor: '#008B8B', iconBg: '#E6F2F2', section: 'Earlier' },
];

export const reportHistory = [
  { id: '1', medicine: 'Metformin 500 mg', instructions: '1 tablet • After Breakfast', status: 'taken' as ReminderStatus, time: '8:12 AM' },
  { id: '2', medicine: 'Atorvastatin 10 mg', instructions: '1 tablet • After Dinner', status: 'late' as ReminderStatus, time: '8:45 PM' },
  { id: '3', medicine: 'Vitamin D3 1000 IU', instructions: '1 tablet • Morning', status: 'missed' as ReminderStatus, time: 'Yesterday' },
  { id: '4', medicine: 'Omega-3 1000 mg', instructions: '1 capsule • After Breakfast', status: 'skipped' as ReminderStatus, time: 'Yesterday' },
  { id: '5', medicine: 'Levothyroxine 50 mcg', instructions: '1 tablet • Morning', status: 'taken' as ReminderStatus, time: 'May 12, 8:05 AM' },
];

export const weeklyOverview = [
  { day: 'Mon', percent: 100, taken: 14, total: 14, color: '#008B8B' },
  { day: 'Tue', percent: 80, taken: 12, total: 15, color: '#008B8B' },
  { day: 'Wed', percent: 60, taken: 9, total: 15, color: '#F2994A' },
  { day: 'Thu', percent: 100, taken: 14, total: 14, color: '#008B8B' },
  { day: 'Fri', percent: 75, taken: 9, total: 12, color: '#F2994A' },
  { day: 'Sat', percent: 100, taken: 14, total: 14, color: '#008B8B' },
  { day: 'Sun', percent: 50, taken: 5, total: 10, color: '#EB5757' },
];
