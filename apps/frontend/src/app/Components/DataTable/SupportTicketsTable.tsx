"use client";
import React from 'react'
import "./DataTable.css"
import GenericTable from '../GenericTable/GenericTable'
import { Button, Dropdown } from 'react-bootstrap'
import {  BsThreeDotsVertical } from 'react-icons/bs';
import Image from 'next/image';
import { FaCircleCheck, FaEye, FaUser } from 'react-icons/fa6';


// Define the Column type
type Column<T> = {
  label: string;
  key: keyof T | string;
  width?: string;
  render?: (item: T) => React.ReactNode;
};



type SupportTicketsItem = {

  ticketId: string;
  emailAddress: string;
  category: string;
  message: string;
  createdAt: string;
  status: string;


  name: string;
  owner: string;
  image: string;
  appointmentId: string;
  reason: string;
  breed: string;
  time: string;
  date: string;
  doctor: string;
  specialization: string;
};

// Sample Data
const appointments: SupportTicketsItem[] = [
  {
    ticketId: 'T204',
    emailAddress: 'johndeo@gmail.com',
    category: 'DSAR',
    message: "I can't log into my dashboard — it keeps saying 'user not found' even though I signed up last week.",
    createdAt: "26 June 2025",
    status: "Cancel",




    name: "Kizie",
    owner: "Sky B",
    image: "/Images/pet3.png",
    appointmentId: "DRO01-03-23-2024",
    reason: "Annual Health Check-Up",
    breed: "Beagle/Dog",
    time: "11:30 AM",
    date: "01 Sep 2024",
    doctor: "Dr. Emily Johnson",
    specialization: "Cardiology",
  },
 
];

// Columns for GenericTable
const columns: Column<SupportTicketsItem>[] = [
   
  {
    label: "Ticket ID",
    key: "ticketId",
    render: (item: SupportTicketsItem) => (

        <p className="name">{item.ticketId}</p>
    ),
  },

  {
  label: "Email",
  key: "emailAddress",
  render: (item: SupportTicketsItem) => <span>{item.emailAddress}</span>,
},
{
  label: "Category",
  key: "category",
  render: (item: SupportTicketsItem) => <p>{item.category}</p>,
},
{
  label: "Message",
  key: "message",
  render: (item: SupportTicketsItem) => <p>{item.message}</p>,
},
  {
    label: "Created On",
    key: "createdAt",
    render: (item: SupportTicketsItem) => (
      <div>
        <p>{item.createdAt}</p>
        <span>{item.createdAt}</span>
      </div>
    ),
  },
  {
    label: "Actions",
    key: "actions",
    render: (item: SupportTicketsItem) => (
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
              New Ticket
            </Button>
          );
      }
    })()}
  </div>
  
    ),
  },
  
  {
  label: "",
  key: "actionsDropdown",
  render: (item: SupportTicketsItem) => (
    <div className="action-dropdown">
      <Dropdown align="end">
        <Dropdown.Toggle as="span" className="custom-toggle">
          <BsThreeDotsVertical className="menu-icon" />
        </Dropdown.Toggle>
        <Dropdown.Menu>
          <Dropdown.Item onClick={() => console.log("Edit", item)}>New Ticket</Dropdown.Item>
          <Dropdown.Item onClick={() => console.log("Save", item)}>In Progress</Dropdown.Item>
          <Dropdown.Item onClick={() => console.log("Delete", item)}>Waiting</Dropdown.Item>
          <Dropdown.Item onClick={() => console.log("Delete", item)}>Escalated</Dropdown.Item>
          <Dropdown.Item onClick={() => console.log("Delete", item)}>Reopened</Dropdown.Item>
          <Dropdown.Item onClick={() => console.log("Delete", item)}>Closed</Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    </div>
  ),
}


];

function SupportTicketsTable() {
  return (
    <>

        <div className="table-wrapper">
            <GenericTable data={appointments} columns={columns as any} bordered={false} pagination pageSize={10} />
        </div>
      
    </>
  )
}

export default SupportTicketsTable
