// Mock data for the hospital management system

export const mockPatients = [
  { id: "P001", name: "John Smith", ward: "ICU", severity: "Critical", admissionDate: "2026-02-15", dischargeDate: null, assignedNurse: "N001" },
  { id: "P002", name: "Emily Davis", ward: "ICU", severity: "Critical", admissionDate: "2026-02-16", dischargeDate: null, assignedNurse: "N001" },
  { id: "P003", name: "Robert Wilson", ward: "ICU", severity: "Serious", admissionDate: "2026-02-14", dischargeDate: null, assignedNurse: "N002" },
  { id: "P004", name: "Maria Garcia", ward: "ICU", severity: "Critical", admissionDate: "2026-02-17", dischargeDate: null, assignedNurse: "N002" },
  { id: "P005", name: "James Brown", ward: "General", severity: "Stable", admissionDate: "2026-02-10", dischargeDate: null, assignedNurse: "N003" },
  { id: "P006", name: "Patricia Lee", ward: "General", severity: "Stable", admissionDate: "2026-02-12", dischargeDate: null, assignedNurse: "N003" },
  { id: "P007", name: "David Martinez", ward: "General", severity: "Moderate", admissionDate: "2026-02-13", dischargeDate: null, assignedNurse: "N004" },
  { id: "P008", name: "Linda Taylor", ward: "General", severity: "Stable", admissionDate: "2026-02-11", dischargeDate: null, assignedNurse: "N004" },
  { id: "P009", name: "Thomas Anderson", ward: "Pediatrics", severity: "Moderate", admissionDate: "2026-02-16", dischargeDate: null, assignedNurse: "N005" },
  { id: "P010", name: "Barbara Thomas", ward: "Pediatrics", severity: "Stable", admissionDate: "2026-02-14", dischargeDate: null, assignedNurse: "N005" },
  { id: "P011", name: "Michael White", ward: "Surgery", severity: "Serious", admissionDate: "2026-02-17", dischargeDate: null, assignedNurse: "N006" },
  { id: "P012", name: "Susan Harris", ward: "Surgery", severity: "Moderate", admissionDate: "2026-02-18", dischargeDate: null, assignedNurse: "N006" },
  { id: "P013", name: "Chris Johnson", ward: "ICU", severity: "Critical", admissionDate: "2026-02-18", dischargeDate: null, assignedNurse: "N001" },
  { id: "P014", name: "Nancy Clark", ward: "General", severity: "Stable", admissionDate: "2026-02-15", dischargeDate: "2026-02-19", assignedNurse: "N003" },
  { id: "P015", name: "Kevin Lewis", ward: "Emergency", severity: "Critical", admissionDate: "2026-02-19", dischargeDate: null, assignedNurse: "N007" },
];

export const mockNurses = [
  { id: "N001", name: "Sarah Johnson", ward: "ICU", shift: "Day", status: "On-Duty" as const, role: "Senior Nurse" },
  { id: "N002", name: "Amy Chen", ward: "ICU", shift: "Day", status: "On-Duty" as const, role: "Nurse" },
  { id: "N003", name: "Diana Ross", ward: "General", shift: "Day", status: "On-Duty" as const, role: "Senior Nurse" },
  { id: "N004", name: "Beth Williams", ward: "General", shift: "Night", status: "Off-Duty" as const, role: "Nurse" },
  { id: "N005", name: "Carol Evans", ward: "Pediatrics", shift: "Day", status: "On-Duty" as const, role: "Nurse" },
  { id: "N006", name: "Fiona Grant", ward: "Surgery", shift: "Day", status: "On-Duty" as const, role: "Senior Nurse" },
  { id: "N007", name: "Grace Park", ward: "Emergency", shift: "Day", status: "On-Duty" as const, role: "Nurse" },
  { id: "N008", name: "Helen Moore", ward: "ICU", shift: "Night", status: "Off-Duty" as const, role: "Nurse" },
];

export const mockCodeBlueEvents = [
  { id: "CB001", patientId: "P001", ward: "ICU", triggerTime: "2026-02-19T08:15:00", responseTime: "2026-02-19T08:17:30", team: ["Dr. Chen", "N001", "N002"], outcome: "Stabilized", responseMinutes: 2.5 },
  { id: "CB002", patientId: "P004", ward: "ICU", triggerTime: "2026-02-18T14:20:00", responseTime: "2026-02-18T14:23:00", team: ["Dr. Patel", "N001", "N008"], outcome: "Stabilized", responseMinutes: 3.0 },
  { id: "CB003", patientId: "P015", ward: "Emergency", triggerTime: "2026-02-19T06:45:00", responseTime: "2026-02-19T06:47:15", team: ["Dr. Kim", "N007"], outcome: "Transferred to ICU", responseMinutes: 2.25 },
  { id: "CB004", patientId: "P011", ward: "Surgery", triggerTime: "2026-02-17T22:10:00", responseTime: "2026-02-17T22:15:00", team: ["Dr. Adams", "N006"], outcome: "Stabilized", responseMinutes: 5.0 },
  { id: "CB005", patientId: "P003", ward: "ICU", triggerTime: "2026-02-16T03:30:00", responseTime: "2026-02-16T03:32:00", team: ["Dr. Chen", "N008"], outcome: "Stabilized", responseMinutes: 2.0 },
];

export const mockAlerts = [
  { id: "A001", type: "critical" as const, message: "ICU nurse-to-patient ratio exceeded safe threshold (1:5)", ward: "ICU", timestamp: "2026-02-19T09:00:00", acknowledged: false },
  { id: "A002", type: "warning" as const, message: "Code Blue response time above 4 minutes in Surgery", ward: "Surgery", timestamp: "2026-02-17T22:15:00", acknowledged: true },
  { id: "A003", type: "warning" as const, message: "High patient load in General Ward (approaching capacity)", ward: "General", timestamp: "2026-02-19T07:30:00", acknowledged: false },
  { id: "A004", type: "info" as const, message: "Night shift nurse shortage in Pediatrics", ward: "Pediatrics", timestamp: "2026-02-19T00:00:00", acknowledged: false },
  { id: "A005", type: "critical" as const, message: "Emergency department at 95% capacity", ward: "Emergency", timestamp: "2026-02-19T08:45:00", acknowledged: false },
];

export const mockFeedback = [
  { id: "F001", patientId: "P014", patientName: "Nancy Clark", ward: "General", satisfaction: 4, nurseResponsiveness: 5, overallExperience: 4, comments: "Great care from nursing staff", date: "2026-02-19" },
  { id: "F002", patientId: "P005", patientName: "James Brown", ward: "General", satisfaction: 3, nurseResponsiveness: 3, overallExperience: 3, comments: "Long wait times but good treatment", date: "2026-02-18" },
  { id: "F003", patientId: "P010", patientName: "Barbara Thomas", ward: "Pediatrics", satisfaction: 5, nurseResponsiveness: 5, overallExperience: 5, comments: "Excellent care for my child", date: "2026-02-17" },
  { id: "F004", patientId: "P006", patientName: "Patricia Lee", ward: "General", satisfaction: 4, nurseResponsiveness: 4, overallExperience: 4, comments: "Clean facilities, attentive staff", date: "2026-02-16" },
];

export const wardRatios = [
  { ward: "ICU", nurses: 3, patients: 5, ratio: "1:1.7", status: "safe" as const, threshold: "1:2" },
  { ward: "General", nurses: 2, patients: 4, ratio: "1:2", status: "safe" as const, threshold: "1:6" },
  { ward: "Pediatrics", nurses: 1, patients: 2, ratio: "1:2", status: "safe" as const, threshold: "1:4" },
  { ward: "Surgery", nurses: 1, patients: 2, ratio: "1:2", status: "safe" as const, threshold: "1:4" },
  { ward: "Emergency", nurses: 1, patients: 1, ratio: "1:1", status: "safe" as const, threshold: "1:3" },
];

export const ratioHistory = [
  { date: "Feb 13", ICU: 1.5, General: 4.0, Pediatrics: 3.0, Surgery: 2.5 },
  { date: "Feb 14", ICU: 2.0, General: 3.5, Pediatrics: 2.5, Surgery: 3.0 },
  { date: "Feb 15", ICU: 1.8, General: 4.5, Pediatrics: 2.0, Surgery: 2.0 },
  { date: "Feb 16", ICU: 2.5, General: 3.0, Pediatrics: 3.5, Surgery: 2.5 },
  { date: "Feb 17", ICU: 1.7, General: 5.0, Pediatrics: 2.0, Surgery: 3.0 },
  { date: "Feb 18", ICU: 2.0, General: 4.0, Pediatrics: 2.5, Surgery: 2.0 },
  { date: "Feb 19", ICU: 1.7, General: 2.0, Pediatrics: 2.0, Surgery: 2.0 },
];
