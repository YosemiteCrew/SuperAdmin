"use client";
import React from 'react'
import "./DataTable.css"
import GenericTable from '../GenericTable/GenericTable'
import { Button } from 'react-bootstrap'
import { MdEdit } from 'react-icons/md';


// Define the Column type
type Column<T> = {
  label: string;
  key: keyof T | string;
  width?: string;
  render?: (item: T) => React.ReactNode;
};



type BuisnessLeadItem = {
  name: string;
  type: string;
  place: string;
  country: string;
  email: string;
  source: string;
  date: string;
  time: string;
  status: string;
};

// Sample Data
const Buisness: BuisnessLeadItem[] = [
  {
    name: "Bella Paws Clinic",
    type:"Hospital",
    place: "Toronto",
    country: "Canada",
    email: "bella@pawclinic.com",
    source: "Website",
    date: "20 June 2025",
    time: "2h ago",
    status: "Done",
  },
  {
    name: "Bella Paws Clinic",
    type:"Hospital",
    place: "Toronto",
    country: "Canada",
    email: "bella@pawclinic.com",
    source: "Website",
    date: "20 June 2025",
    time: "2h ago",
    status: "",
  },
  {
    name: "Bella Paws Clinic",
    type:"Hospital",
    place: "Toronto",
    country: "Canada",
    email: "bella@pawclinic.com",
    source: "Website",
    date: "20 June 2025",
    time: "2h ago",
    status: "In-progress",
  },
  {
    name: "Bella Paws Clinic",
    type:"Hospital",
    place: "Toronto",
    country: "Canada",
    email: "bella@pawclinic.com",
    source: "Website",
    date: "20 June 2025",
    time: "2h ago",
    status: "",
  },
  {
    name: "Bella Paws Clinic",
    type:"Hospital",
    place: "Toronto",
    country: "Canada",
    email: "bella@pawclinic.com",
    source: "Website",
    date: "20 June 2025",
    time: "2h ago",
    status: "In-progress",
  },
  {
    name: "Bella Paws Clinic",
    type:"Hospital",
    place: "Toronto",
    country: "Canada",
    email: "bella@pawclinic.com",
    source: "Website",
    date: "20 June 2025",
    time: "2h ago",
    status: "Cancel",
  },
  {
    name: "Bella Paws Clinic",
    type:"Hospital",
    place: "Toronto",
    country: "Canada",
    email: "bella@pawclinic.com",
    source: "Website",
    date: "20 June 2025",
    time: "2h ago",
    status: "Done",
  },
  {
    name: "Bella Paws Clinic",
    type:"Hospital",
    place: "Toronto",
    country: "Canada",
    email: "bella@pawclinic.com",
    source: "Website",
    date: "20 June 2025",
    time: "2h ago",
    status: "Cancel",
  },
  {
    name: "Bella Paws Clinic",
    type:"Hospital",
    place: "Toronto",
    country: "Canada",
    email: "bella@pawclinic.com",
    source: "Website",
    date: "20 June 2025",
    time: "2h ago",
    status: "In-progress",
  },

];

// Columns for GenericTable
const columns: Column<BuisnessLeadItem>[] = [

  {
    label: "Lead Name",
    key: "name",
    render: (item: BuisnessLeadItem) => (
      <p className="name">{item.name}</p>
    ),
  },
  {
    label: "User Type",
    key: "type",
    render: (item: BuisnessLeadItem) => (
      <p className="name">{item.type}</p>
    ),
  },
  {
    label: "Region",
    key: "region",
    render: (item: BuisnessLeadItem) => (
      <div>
        <p>{item.place}</p>
        <span>{item.country}</span>
      </div>
    ),
  },
  {
    label: "Email",
    key: "email",
    render: (item: BuisnessLeadItem) => (
      <p className="name">{item.email}</p>
    ),
  },
  {
    label: "Lead Source",
    key: "source",
    render: (item: BuisnessLeadItem) => (
      <p className="name">{item.source}</p>
    ),
  },
  {
    label: "Created on",
    key: "created",
    render: (item: BuisnessLeadItem) => (
      <div>
        <p>{item.date}</p>
        <span>{item.time}</span>
      </div>
    ),
  },
  
{
    label: "Status",
    key: "status",
    render: (item: BuisnessLeadItem) => (
        <div className="action-btn-col">
    {(() => {
        switch (item.status) {
        case "Done":
            return (
            <Button className="ptt-status done" title="Done">
                Upgraded to Paid
            </Button>
            );
        case "In-progress":
            return (
            <Button className="ptt-status blueprogress" title="In Progress">
                Unresponsive
            </Button>
            );
        case "Cancel":
            return (
            <Button className="ptt-status cancel" title="Cancel">
                Not Interested
            </Button>
            );
        default:
            return (
            <Button className="ptt-status Ticket view" title="In Progress" onClick={() => console.log("View", item)}>
                New Lead
            </Button>
            );
        }
    })()}
    </div>
    ),
},
{
  label: "Actions",
  key: "actions",
  render: (item: BuisnessLeadItem) => (
    <div className="SingleBtnDiv">
      <Button className="circle-btn view" title="View" onClick={() => console.log("View", item)}>
        <MdEdit size={24} />
      </Button>
    </div>
  ),
},
  

];


function BuisnessLeadsTable() {
  return (
    <>

        <div className="table-wrapper">
            <GenericTable data={Buisness} columns={columns} bordered={false} />
            <div className="table-footerBtn ">
                <Button>See All</Button>
            </div>
        </div>
    
    
    
    
    </>
  )
}

export default BuisnessLeadsTable