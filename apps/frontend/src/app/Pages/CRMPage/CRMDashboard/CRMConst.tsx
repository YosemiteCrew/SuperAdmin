import DashCard from "@/app/Components/DashCard/DashCard";
import PendingVerfyTable from "@/app/Components/DataTable/PendingVerfyTable";
import PracticeActivityTable from "@/app/Components/DataTable/PracticeActivityTable";
import SupportTicketsTable from "@/app/Components/DataTable/SupportTicketsTable";


export const CrmDashTabs = [
  {
    eventKey: 'all',
    title: 'All',
    content: (
      <>
      <DashCard/>
      </>
    ),
  },
  {
    eventKey: 'hospitals',
    title: 'Hospitals',
    content: (
      <>
       <DashCard/>
      </>
    ),
  },
  {
    eventKey: 'groomers',
    title: 'Groomers',
    content: (
      <>
        <DashCard/>
      </>
    ),
  },
  {
    eventKey: 'breeders',
    title: 'Breeders',
    content: (
      <>
        <DashCard/>
      </>
    ),
  },
];

// PendingTabs Started 
export const PendingTabs = [
  {
    eventKey: 'hospitals',
    title: 'Hospitals',
    count: '5',
    content: (
      <>
      <PendingVerfyTable/>
      </>
    ),
  },
  {
    eventKey: 'groomers',
    title: 'Groomers',
    count: '2',
    content: (
      <>
       <PendingVerfyTable/>
      </>
    ),
  },
  {
    eventKey: 'breeders',
    title: 'Breeders',
    content: (
      <>
        <PendingVerfyTable/>
      </>
    ),
  },
  {
    eventKey: 'sitters',
    title: 'Sitters',
    content: (
      <>
        <PendingVerfyTable/>
      </>
    ),
  },
];



// PracticeTabs Started 
export const PracticeTabs = [
  {
    eventKey: 'hospitals',
    title: 'Hospitals',
    content: (
      <>
      <PracticeActivityTable/>
      </>
    ),
  },
  {
    eventKey: 'groomers',
    title: 'Groomers',
    content: (
      <>
       <PracticeActivityTable/>
      </>
    ),
  },
  {
    eventKey: 'breeders',
    title: 'Breeders',
    content: (
      <>
       <PracticeActivityTable/>
      </>
    ),
  },
  {
    eventKey: 'sitters',
    title: 'Sitters',
    content: (
      <>
        <PracticeActivityTable/>
      </>
    ),
  },
];




// SupportTicketTabs Started 
export const SuportTicketTabs = [
  {
    eventKey: 'professionals',
    title: 'Professionals',
    content: (
      <>
      <SupportTicketsTable/>
      </>
    ),
  },
  {
    eventKey: 'pet parents',
    title: 'Pet Parents',
    content: (
      <>
       <SupportTicketsTable/>
      </>
    ),
  },

];


