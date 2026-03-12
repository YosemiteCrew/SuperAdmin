import type { InsightDataPoint } from "./crm-features-dropoff";
import type { PendingVerificationRow } from "./crm-pending-verifications";
import type { PracticeActivityColumn, PracticeActivityRow } from "./crm-practice-activity-overview";
import type { StatCard } from "./crm-segment-dashboard";

const ICONS = {
  person: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  personPlus: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  ),
  star: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  calendar: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  document: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  checkCircle: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  alert: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  dollar: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
};

export const HOSPITALS_DATA = {
  pendingRows: [
    { name: "Waggy Tails Vet", city: "London", country: "United Kingdom", completion: "95%", pending: "6 hrs" },
    { name: "Cozy Paws", city: "New York", country: "USA", completion: "78%", pending: "23 hrs" },
    { name: "UrbanPet Clinic", city: "Berlin", country: "Germany", completion: "86%", pending: "2 days" },
    { name: "Paw & Claws", city: "London", country: "United Kingdom", completion: "94%", pending: "4 days" },
    { name: "MediVet", city: "New Delhi", country: "India", completion: "79%", pending: "7 days" },
  ] as PendingVerificationRow[],
  practiceRows: [
    { name: "Happy Tails Vet", city: "Toronto", country: "Canada", appointments: 134, assessments: 25, tickets: 25, staff: 56, lastActivity: "1h ago", status: "Active", statusColor: "bg-green-100 text-green-700" },
    { name: "Cozy Paws", city: "New York", country: "USA", appointments: 198, assessments: 81, tickets: 10, staff: 93, lastActivity: "40d ago", status: "Dormant", statusColor: "bg-orange-100 text-orange-700" },
    { name: "UrbanPet Clinic", city: "Berlin", country: "Germany", appointments: 4, assessments: 0, tickets: 2, staff: 14, lastActivity: "2d ago", status: "Churn Risk", statusColor: "bg-red-100 text-red-700" },
    { name: "Cozy Paws", city: "New York", country: "USA", appointments: 198, assessments: 26, tickets: 10, staff: 93, lastActivity: "4h ago", status: "Active", statusColor: "bg-green-100 text-green-700" },
    { name: "UrbanPet Clinic", city: "Berlin", country: "Germany", appointments: 6, assessments: 1, tickets: 3, staff: 5, lastActivity: "2d ago", status: "New", statusColor: "bg-blue-100 text-blue-700" },
  ] as PracticeActivityRow[],
  practiceColumns: [
    { key: "appointments", label: "Appointments" },
    { key: "assessments", label: "Assessments" },
    { key: "tickets", label: "Tickets Raised" },
    { key: "staff", label: "Active Staff Count" },
  ] as PracticeActivityColumn[],
  mostUsedFeatures: [
    { label: "Appointments", value: 38, display: "38%" },
    { label: "Assessments", value: 18, display: "18%" },
    { label: "Chat", value: 14, display: "14%" },
    { label: "Inventory", value: 16, display: "16%" },
    { label: "Calendar View", value: 11, display: "11%" },
    { label: "Discounts", value: 3, display: "3%" },
  ] as InsightDataPoint[],
  dropOffIndicators: [
    { label: "No Appt", value: 38, display: "38%" },
    { label: "Low Feature Usage", value: 18, display: "18%" },
    { label: "Infrequent Logins", value: 14, display: "14%" },
    { label: "Inactive Staff", value: 16, display: "16%" },
    { label: "Missing Profile Info", value: 11, display: "11%" },
    { label: "No Recent Activity", value: 3, display: "3%" },
  ] as InsightDataPoint[],
  statCards: [
    { label: "Total Practices", value: "814", change: "+8%", trend: "up" as const, icon: ICONS.person },
    { label: "New Signups", value: "29", change: "-15%", trend: "down" as const, icon: ICONS.personPlus },
    { label: "Daily Active Users", value: "598", change: "+23%", trend: "up" as const, icon: ICONS.star },
    { label: "Avg Appointments / Month", value: "85", change: "+42%", trend: "up" as const, icon: ICONS.calendar },
    { label: "Churn Risk Count", value: "12", change: "-37%", trend: "down" as const, icon: ICONS.document },
    { label: "Pending Verifications", value: "5", change: "+23%", trend: "up" as const, icon: ICONS.checkCircle },
    { label: "Inactive Practices", value: "27", change: "-14%", trend: "down" as const, icon: ICONS.alert },
    { label: "Monthly Recurring Revenue (MRR)", value: "$2569", change: "+54%", trend: "up" as const, icon: ICONS.dollar },
  ] as StatCard[],
};

export const GROOMERS_DATA = {
  pendingRows: [
    { name: "Fluff & Buff", city: "Toronto", country: "Canada", completion: "95%", pending: "6 hrs" },
    { name: "The Paws Spa", city: "New York", country: "USA", completion: "78%", pending: "23 hrs" },
    { name: "SnipSnout", city: "Berlin", country: "Germany", completion: "86%", pending: "2 days" },
    { name: "Groom & Bloom", city: "London", country: "United Kingdom", completion: "94%", pending: "4 days" },
    { name: "Wagworthy Styles", city: "New Delhi", country: "India", completion: "79%", pending: "7 days" },
  ] as PendingVerificationRow[],
  practiceRows: [
    { name: "Groomland", city: "Toronto", country: "Canada", appointments: 134, petsAttended: 241, tickets: 25, staff: 56, lastActivity: "1h ago", status: "Active", statusColor: "bg-green-100 text-green-700" },
    { name: "Fur Seasons", city: "New York", country: "USA", appointments: 198, petsAttended: 202, tickets: 10, staff: 93, lastActivity: "40d ago", status: "Dormant", statusColor: "bg-orange-100 text-orange-700" },
    { name: "Bark & Bubbles", city: "Berlin", country: "Germany", appointments: 4, petsAttended: 4, tickets: 2, staff: 14, lastActivity: "2d ago", status: "Churn Risk", statusColor: "bg-red-100 text-red-700" },
    { name: "Pawlished Pets", city: "New York", country: "USA", appointments: 16, petsAttended: 20, tickets: 10, staff: 93, lastActivity: "4h ago", status: "Active", statusColor: "bg-green-100 text-green-700" },
    { name: "Tail Trends", city: "Berlin", country: "Germany", appointments: 6, petsAttended: 10, tickets: 3, staff: 5, lastActivity: "2d ago", status: "New", statusColor: "bg-blue-100 text-blue-700" },
  ] as PracticeActivityRow[],
  practiceColumns: [
    { key: "appointments", label: "Appointments" },
    { key: "petsAttended", label: "Pets Attended" },
    { key: "tickets", label: "Tickets Raised" },
    { key: "staff", label: "Active Staff Count" },
  ] as PracticeActivityColumn[],
  mostUsedFeatures: [
    { label: "Appointments", value: 38, display: "38%" },
    { label: "Invoices", value: 18, display: "18%" },
    { label: "Inventory", value: 16, display: "16%" },
    { label: "Chat", value: 14, display: "14%" },
    { label: "Calendar View", value: 11, display: "11%" },
    { label: "Discounts", value: 3, display: "3%" },
  ] as InsightDataPoint[],
  dropOffIndicators: [
    { label: "No Appt", value: 38, display: "38%" },
    { label: "Low Feature Usage", value: 18, display: "18%" },
    { label: "Inactive Staff", value: 16, display: "16%" },
    { label: "Infrequent Logins", value: 14, display: "14%" },
    { label: "Missing Profile Info", value: 11, display: "11%" },
    { label: "No Recent Activity", value: 3, display: "3%" },
  ] as InsightDataPoint[],
  statCards: [
    { label: "Total Practices", value: "814", change: "+8%", trend: "up" as const, icon: ICONS.person },
    { label: "New Signups", value: "29", change: "-15%", trend: "down" as const, icon: ICONS.personPlus },
    { label: "Daily Active Users", value: "598", change: "+23%", trend: "up" as const, icon: ICONS.star },
    { label: "Avg Appointments / Month", value: "85", change: "+42%", trend: "up" as const, icon: ICONS.calendar },
    { label: "Churn Risk Count", value: "12", change: "-37%", trend: "down" as const, icon: ICONS.document },
    { label: "Pending Verifications", value: "5", change: "+23%", trend: "up" as const, icon: ICONS.checkCircle },
    { label: "Inactive Practices", value: "27", change: "-14%", trend: "down" as const, icon: ICONS.alert },
    { label: "Monthly Recurring Revenue (MRR)", value: "$2569", change: "+54%", trend: "up" as const, icon: ICONS.dollar },
  ] as StatCard[],
};

export const BREEDERS_DATA = {
  pendingRows: [
    { name: "Noble Paws Kennel", city: "Toronto", country: "Canada", completion: "95%", pending: "6 hrs" },
    { name: "Pureline Companions", city: "New York", country: "USA", completion: "78%", pending: "23 hrs" },
    { name: "Whisker Roots", city: "Berlin", country: "Germany", completion: "86%", pending: "2 days" },
    { name: "Heritage Tails", city: "London", country: "United Kingdom", completion: "94%", pending: "4 days" },
    { name: "Velvet Paw Breeders", city: "New Delhi", country: "India", completion: "79%", pending: "7 days" },
  ] as PendingVerificationRow[],
  practiceRows: [
    { name: "Kenny's Kennel", city: "Toronto", country: "Canada", appointments: 134, confirmedAdoptions: 241, tickets: 25, staff: 56, lastActivity: "1h ago", status: "Active", statusColor: "bg-green-100 text-green-700" },
    { name: "Golden Gene Co.", city: "New York", country: "USA", appointments: 198, confirmedAdoptions: 202, tickets: 10, staff: 93, lastActivity: "40d ago", status: "Dormant", statusColor: "bg-orange-100 text-orange-700" },
    { name: "The Pup Foundry", city: "Berlin", country: "Germany", appointments: 4, confirmedAdoptions: 4, tickets: 2, staff: 14, lastActivity: "2d ago", status: "Churn Risk", statusColor: "bg-red-100 text-red-700" },
    { name: "Breed & Bloom", city: "New York", country: "USA", appointments: 16, confirmedAdoptions: 20, tickets: 10, staff: 93, lastActivity: "4h ago", status: "Active", statusColor: "bg-green-100 text-green-700" },
    { name: "Wholesome Litters", city: "Berlin", country: "Germany", appointments: 6, confirmedAdoptions: 10, tickets: 3, staff: 5, lastActivity: "2d ago", status: "New", statusColor: "bg-blue-100 text-blue-700" },
  ] as PracticeActivityRow[],
  practiceColumns: [
    { key: "appointments", label: "Appointments" },
    { key: "confirmedAdoptions", label: "Confirmed Adoptions" },
    { key: "tickets", label: "Tickets Raised" },
    { key: "staff", label: "Active Staff Count" },
  ] as PracticeActivityColumn[],
  mostUsedFeatures: [
    { label: "Appointments", value: 38, display: "38%" },
    { label: "Invoices", value: 18, display: "18%" },
    { label: "Chat", value: 14, display: "14%" },
    { label: "Inventory", value: 16, display: "16%" },
    { label: "Calendar View", value: 17, display: "17%" },
    { label: "Discounts", value: 3, display: "3%" },
  ] as InsightDataPoint[],
  dropOffIndicators: [
    { label: "No Appt", value: 38, display: "38%" },
    { label: "Low Feature Usage", value: 18, display: "18%" },
    { label: "Infrequent Logins", value: 14, display: "14%" },
    { label: "Inactive Staff", value: 16, display: "16%" },
    { label: "Missing Profile Info", value: 11, display: "11%" },
    { label: "No Recent Activity", value: 3, display: "3%" },
  ] as InsightDataPoint[],
  statCards: [
    { label: "Total Practices", value: "814", change: "+8%", trend: "up" as const, icon: ICONS.person },
    { label: "New Signups", value: "29", change: "-15%", trend: "down" as const, icon: ICONS.personPlus },
    { label: "Daily Active Users", value: "598", change: "+23%", trend: "up" as const, icon: ICONS.star },
    { label: "Avg Appointments / Month", value: "85", change: "+42%", trend: "up" as const, icon: ICONS.calendar },
    { label: "Churn Risk Count", value: "12", change: "-37%", trend: "down" as const, icon: ICONS.document },
    { label: "Pending Verifications", value: "5", change: "+23%", trend: "up" as const, icon: ICONS.checkCircle },
    { label: "Inactive Practices", value: "27", change: "-14%", trend: "down" as const, icon: ICONS.alert },
    { label: "Monthly Recurring Revenue (MRR)", value: "$2569", change: "+54%", trend: "up" as const, icon: ICONS.dollar },
  ] as StatCard[],
};

export const SITTERS_DATA = {
  pendingRows: [
    { name: "Stay & Wag", city: "Toronto", country: "Canada", completion: "95%", pending: "6 hrs" },
    { name: "The Paw Keeper", city: "New York", country: "USA", completion: "78%", pending: "23 hrs" },
    { name: "Snuggle Sitters", city: "Berlin", country: "Germany", completion: "86%", pending: "2 days" },
    { name: "Tailwatch", city: "London", country: "United Kingdom", completion: "94%", pending: "4 days" },
    { name: "HomeBuddy Pet Care", city: "New Delhi", country: "India", completion: "79%", pending: "7 days" },
  ] as PendingVerificationRow[],
  practiceRows: [
    { name: "WatchMyWoof", city: "Toronto", country: "Canada", appointments: 134, petsParents: 241, tickets: 25, staff: 56, lastActivity: "1h ago", status: "Active", statusColor: "bg-green-100 text-green-700" },
    { name: "FurEver Sitters", city: "New York", country: "USA", appointments: 198, petsParents: 202, tickets: 10, staff: 93, lastActivity: "40d ago", status: "Dormant", statusColor: "bg-orange-100 text-orange-700" },
    { name: "Cuddle & Care", city: "Berlin", country: "Germany", appointments: 4, petsParents: 4, tickets: 2, staff: 14, lastActivity: "2d ago", status: "Churn Risk", statusColor: "bg-red-100 text-red-700" },
    { name: "Sit. Stay. Love.", city: "New York", country: "USA", appointments: 16, petsParents: 20, tickets: 10, staff: 93, lastActivity: "4h ago", status: "Active", statusColor: "bg-green-100 text-green-700" },
    { name: "The Pet Nanny Co.", city: "Berlin", country: "Germany", appointments: 6, petsParents: 10, tickets: 3, staff: 5, lastActivity: "2d ago", status: "New", statusColor: "bg-blue-100 text-blue-700" },
  ] as PracticeActivityRow[],
  practiceColumns: [
    { key: "appointments", label: "Appointments" },
    { key: "petsParents", label: "Pets Parents" },
    { key: "tickets", label: "Tickets Raised" },
    { key: "staff", label: "Active Staff Count" },
  ] as PracticeActivityColumn[],
  mostUsedFeatures: [
    { label: "Appointments", value: 38, display: "38%" },
    { label: "Invoices", value: 18, display: "18%" },
    { label: "Chat", value: 14, display: "14%" },
    { label: "Inventory", value: 16, display: "16%" },
    { label: "Calendar View", value: 11, display: "11%" },
    { label: "Discounts", value: 3, display: "3%" },
  ] as InsightDataPoint[],
  dropOffIndicators: [
    { label: "No Appt", value: 38, display: "38%" },
    { label: "Low Feature Usage", value: 18, display: "18%" },
    { label: "Infrequent Logins", value: 14, display: "14%" },
    { label: "Inactive Staff", value: 16, display: "16%" },
    { label: "Missing Profile Info", value: 11, display: "11%" },
    { label: "No Recent Activity", value: 3, display: "3%" },
  ] as InsightDataPoint[],
  statCards: [
    { label: "Total Practices", value: "814", change: "+8%", trend: "up" as const, icon: ICONS.person },
    { label: "New Signups", value: "29", change: "-15%", trend: "down" as const, icon: ICONS.personPlus },
    { label: "Daily Active Users", value: "598", change: "+23%", trend: "up" as const, icon: ICONS.star },
    { label: "Avg Appointments / Month", value: "85", change: "+42%", trend: "up" as const, icon: ICONS.calendar },
    { label: "Churn Risk Count", value: "12", change: "-37%", trend: "down" as const, icon: ICONS.document },
    { label: "Pending Verifications", value: "5", change: "+23%", trend: "up" as const, icon: ICONS.checkCircle },
    { label: "Inactive Practices", value: "27", change: "-14%", trend: "down" as const, icon: ICONS.alert },
    { label: "Monthly Recurring Revenue (MRR)", value: "$2569", change: "+54%", trend: "up" as const, icon: ICONS.dollar },
  ] as StatCard[],
};
