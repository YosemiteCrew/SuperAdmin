import DashCard from "@/app/Components/DashCard/DashCard";
import PendingVerfyTable from "@/app/Components/DataTable/PendingVerfyTable";
import PracticeActivityTable from "@/app/Components/DataTable/PracticeActivityTable";
import SupportTicketsTable from "@/app/Components/DataTable/SupportTicketsTable";


export const CrmDashTabs = (filter: '30' | '60' | '90') => [
  {
    eventKey: 'all',
    title: 'All',
    content: <DashCard type="all" filter={filter}/>,
  },
  {
    eventKey: 'hospitals',
    title: 'Hospitals',
    content: <DashCard type="hospitals" filter={filter}/>,
  },
  {
    eventKey: 'groomers',
    title: 'Groomers',
    content: <DashCard type="groomers" filter={filter}/>,
  },
  {
    eventKey: 'breeders',
    title: 'Breeders',
    content: <DashCard type="breeders" filter={filter}/>,
  },
  {
    eventKey: 'sitters',
    title: 'Sitters',
    content: <DashCard type="sitters" filter={filter}/>,
  },
  {
    eventKey: 'petparents',
    title: 'Pet Parents',
    content: <DashCard type="petparents" filter={filter}/>,
  },
];

// PendingTabs Started 
// export const PendingTabs = [
//   {
//     eventKey: 'hospitals',
//     title: 'Hospitals',
//     count: '5',
//     content: (
//       <>
//       <PendingVerfyTable/>
//       </>
//     ),
//   },
//   {
//     eventKey: 'groomers',
//     title: 'Groomers',
//     count: '2',
//     content: (
//       <>
//        <PendingVerfyTable/>
//       </>
//     ),
//   },
//   {
//     eventKey: 'breeders',
//     title: 'Breeders',
//     content: (
//       <>
//         <PendingVerfyTable/>
//       </>
//     ),
//   },
//   {
//     eventKey: 'sitters',
//     title: 'Sitters',
//     content: (
//       <>
//         <PendingVerfyTable/>
//       </>
//     ),
//   },
// ];

export const getPendingTabs = (counts: Record<string, number>) => [
  {
    eventKey: 'hospitals',
    title: 'Hospitals',
    ...(counts.hospitals > 0 && { count: counts.hospitals.toString() }),
    content: <PendingVerfyTable type="hospitals"/>,
  },
  {
    eventKey: 'groomers',
    title: 'Groomers',
    ...(counts.groomers > 0 && { count: counts.groomers.toString() }),
    content: <PendingVerfyTable type="groomers"/>,
  },
  {
    eventKey: 'breeders',
    title: 'Breeders',
    ...(counts.breeders > 0 && { count: counts.breeders.toString() }),
    content: <PendingVerfyTable type="breeders"/>,
  },
  {
    eventKey: 'sitters',
    title: 'Sitters',
    ...(counts.sitters > 0 && { count: counts.sitters.toString() }),
    content: <PendingVerfyTable type="sitters"/>,
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
      <SupportTicketsTable userType="professionals"/>
      </>
    ),
  },
  {
    eventKey: 'pet parents',
    title: 'Pet Parents',
    content: (
      <>
       <SupportTicketsTable userType="petparents"/>
      </>
    ),
  },

];


