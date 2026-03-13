import type { InsightDataPoint } from "./crm-features-dropoff";
import type { PetParentRow } from "../overview/pet-parents-overview";
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
  userAlert: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
      <path d="M12 11v4M12 17h.01" />
    </svg>
  ),
  documentPending: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
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

export const PET_PARENTS_DATA = {
  statCards: [
    { label: "Total Pet Parents", value: "29,681", change: "+8%", trend: "up" as const, icon: ICONS.person },
    { label: "New Signups", value: "2,901", change: "-15%", trend: "down" as const, icon: ICONS.personPlus },
    { label: "Daily Active Users", value: "12,987", change: "+23%", trend: "up" as const, icon: ICONS.star },
    { label: "Avg Appointments / Month", value: "8,510", change: "+42%", trend: "up" as const, icon: ICONS.calendar },
    { label: "Churn Risk Count", value: "1,231", change: "-37%", trend: "down" as const, icon: ICONS.userAlert },
    { label: "Pending Profile Completion", value: "2,497", change: "+23%", trend: "up" as const, icon: ICONS.documentPending },
    { label: "Inactive Users", value: "3,471", change: "-14%", trend: "down" as const, icon: ICONS.alert },
    { label: "Monthly Revenue", value: "$25,690", change: "+54%", trend: "up" as const, icon: ICONS.dollar },
  ] as StatCard[],
  petParentRows: [
    { name: "Danny James", email: "dannyjames@gmail.com", city: "Toronto", country: "Canada", practiceAssociation: "Sunshine Vet, Fluffy Groomers", pets: 4, appointments: 8, lastActivity: "2h ago", status: "Active", statusColor: "bg-green-100 text-green-700" },
    { name: "Floyd Miles", email: "fmiles@yahoo.com", city: "New York", country: "United States", practiceAssociation: "Independent", pets: 2, appointments: 2, lastActivity: "12d ago", status: "Dormant", statusColor: "bg-orange-100 text-orange-700" },
    { name: "Albert Flores", email: "albert@denk.inc", city: "Berlin", country: "Germany", practiceAssociation: "PetCare Hospital", pets: 1, appointments: 0, lastActivity: "27d ago", status: "Inactive", statusColor: "bg-gray-100 text-gray-700" },
    { name: "Wade Warren", email: "wewarren@gmail.com", city: "London", country: "United Kingdom", practiceAssociation: "Whisker Sitters, Paws & Pooch", pets: 2, appointments: 0, lastActivity: "40d ago", status: "Churn Risk", statusColor: "bg-red-100 text-red-700" },
    { name: "Darlene Robertson", email: "darlene@fiva.com", city: "Tokyo", country: "Japan", practiceAssociation: "Independent", pets: 1, appointments: 4, lastActivity: "8h ago", status: "Active", statusColor: "bg-green-100 text-green-700" },
  ] as PetParentRow[],
  mostUsedFeatures: [
    { label: "Pet Duties", value: 38, display: "38%" },
    { label: "Pain Mgmt", value: 18, display: "18%" },
    { label: "Chat", value: 14, display: "14%" },
    { label: "Medical Records", value: 10, display: "10%" },
    { label: "Expense Tracker", value: 7, display: "7%" },
    { label: "Diabetes Mgmt", value: 3, display: "3%" },
  ] as InsightDataPoint[],
  dropOffIndicators: [
    { label: "No Appt", value: 38, display: "38%" },
    { label: "Low Feature Usage", value: 18, display: "18%" },
    { label: "Infrequent Logins", value: 14, display: "14%" },
    { label: "Inactive Staff", value: 10, display: "10%" },
    { label: "Missing Profile Info", value: 7, display: "7%" },
    { label: "No Recent Activity", value: 3, display: "3%" },
  ] as InsightDataPoint[],
};
