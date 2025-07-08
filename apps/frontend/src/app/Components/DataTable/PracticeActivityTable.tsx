"use client";
import React from 'react'
import "./DataTable.css"
import GenericTable from '../GenericTable/GenericTable'
import { Button } from 'react-bootstrap'


// Define the Column type
type Column<T> = {
  label: string;
  key: keyof T | string;
  width?: string;
  render?: (item: T) => React.ReactNode;
};



type PracticeActivityItem = {
  name: string;
  place: string;
  country: string;
  appointment: string;
  ticket: string;
  staff: string;
  activity: string;
  status: string;
};

// Sample Data
const Practice: PracticeActivityItem[] = [
  {
    name: "Happy Tails Vet",
    place: "Toronto",
    country: "Canada",
    appointment: "134",
    ticket: "25",
    staff: "56",
    activity: "1h ago",
    status: "Done",

  },
  {
    name: "Happy Tails Vet",
    place: "Toronto",
    country: "Canada",
    appointment: "134",
    ticket: "25",
    staff: "56",
    activity: "1h ago",
    status: "In-progress",

  },
  {
    name: "Happy Tails Vet",
    place: "Toronto",
    country: "Canada",
    appointment: "134",
    ticket: "25",
    staff: "56",
    activity: "1h ago",
    status: "Cancel",

  },
  
  
];

// Columns for GenericTable
const columns: Column<PracticeActivityItem>[] = [

  {
    label: "Practice Name",
    key: "name",
    render: (item: PracticeActivityItem) => (
      <p className="name">{item.name}</p>
    ),
  },
  {
    label: "Region",
    key: "region",
    render: (item: PracticeActivityItem) => (
      <div>
        <p>{item.place}</p>
        <span>{item.country}</span>
      </div>
    ),
  },
  {
  label: "Appointments ",
  key: "appointment",
  render: (item: PracticeActivityItem) => <p>{item.appointment}</p>,
},
  {
  label: "Tickets Raised",
  key: "tickets ",
  render: (item: PracticeActivityItem) => <p>{item.ticket}</p>,
},
{
  label: "Active Staff Count",
  key: "staff",
  render: (item: PracticeActivityItem) => <p>{item.staff}</p>,
},
{
  label: "Last Activity",
  key: "activity",
  render: (item: PracticeActivityItem) => <p>{item.activity}</p>,
},
{
  label: "Actions",
  key: "actions",
  render: (item: PracticeActivityItem) => (
    <div className="action-btn-col">
  {(() => {
    switch (item.status) {
      case "Done":
        return (
          <Button className="ptt-status done" title="Done">
            Active
          </Button>
        );
      case "In-progress":
        return (
          <Button className="ptt-status progress" title="In Progress">
            Dormant
          </Button>
        );
      case "Cancel":
        return (
          <Button className="ptt-status cancel" title="Cancel">
            Churn Risk
          </Button>
        );
      default:
        return (
          <Button
            className="ptt-status progress view"
            title="In Progress"
            onClick={() => console.log("View", item)}
          >
            Dormant
          </Button>
        );
    }
  })()}
</div>

  ),
},


];

function PracticeActivityTable() {
  return (
    <>

      <div className="table-wrapper">
          <GenericTable data={Practice} columns={columns} bordered={false} />
          <div className="table-footerBtn ">
              <Button>See All</Button>
          </div>
      </div>





    </>
  )
}

export default PracticeActivityTable