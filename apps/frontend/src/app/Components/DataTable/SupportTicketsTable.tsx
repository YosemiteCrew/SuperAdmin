"use client";
import React from 'react'
import "./DataTable.css"
import GenericTable from '../GenericTable/GenericTable'
import { Button } from 'react-bootstrap'
import { FaEye } from 'react-icons/fa';
import { LuMessageSquareReply } from 'react-icons/lu';


// Define the Column type
type Column<T> = {
  label: string;
  key: keyof T | string;
  width?: string;
  render?: (item: T) => React.ReactNode;
};



type SupportTicketsItem = {
  Id: string;
  category: string;
  message: string;
  platform: string;
  date: string;
  time: string;
  statusaction: string;
  registor: string;
  email: string;
  status: string;

  
};

// Sample Data
const Pending: SupportTicketsItem[] = [
  {
    Id: "T204",
    category: "DSAR",
    message: "I can't log into my dashboard — it keeps saying 'user not found' even though I signed up last week.",
    platform: "Discord",
    status: "",
    date: "26 June 2025",
    time: "3h ago",
    statusaction: "Reply",
    registor: "Registered",
    email: "User ID",
  },
  {
    Id: "T217",
    category: "General",
    message: "Hi, we're trying to explore your platform before signing up. Can we schedule a demo or speak with someone?",
    platform: "Email",
    status: "done",
    date: "25 June 2025",
    time: "16h ago",
    statusaction: "",
    registor: "Registered",
    email: "User ID",
  },
  
];

// Columns for GenericTable
const columns: Column<SupportTicketsItem>[] = [

  {
    label: "Ticket ID",
    key: "id",
    render: (item: SupportTicketsItem) => (
      <p className="name">{item.Id}</p>
    ),
  },

  {
  label: "User status",
  key: "userstatus",
  render: (item: SupportTicketsItem) => (
    <div>
      <p
        className={item.registor === "Not Registered" ? "text-red" : "text-black"}
      >
        {item.registor}
      </p>
      <span className="user-email">{item.email}</span>
    </div>
  ),
},


  {
  label: "Category ",
  key: "category",
  render: (item: SupportTicketsItem) => <p>{item.category}</p>,
},
  {
  label: "Message",
  key: "message ",
  render: (item: SupportTicketsItem) => <p className='MesssageDiv'>{item.message}</p>,
},
{
  label: "Platform",
  key: "platform",
  render: (item: SupportTicketsItem) => <p>{item.platform}</p>,
},

{
  label: "Status",
  key: "status",
  render: (item: SupportTicketsItem) => (
    <div className="action-btn-col">
        {(() => {
            switch (item.status) {
            case "Done":
                return (
                <Button className="ptt-status done" title="Closed">
                    Closed
                </Button>
                );
            case "In-progress":
                return (
                <Button className="ptt-status blueprogress" title="In Progress">
                    In Progress
                </Button>
                );
            
            case "Cancel":
                return (
                <Button className="ptt-status cancel" title="Escalated">
                    Escalated
                </Button>
                );
            default:
                return (
                <Button
                    className="ptt-status Ticket view"
                    title="New Ticket"
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
    label: "Created On",
    key: "created",
    render: (item: SupportTicketsItem) => (
      <div>
        <p>{item.date}</p>
        <span>{item.time}</span>
      </div>
    ),
  },

{
  label: "Actions",
  key: "actions",
  render: (item: SupportTicketsItem) => (
    <div className="action-btn-col">
      {item.statusaction === "Reply" ? (
        <Button className="circle-btn reply"
          title="Done">
            <LuMessageSquareReply size={24}/>
          
        </Button>
      ) : (
        <Button
          className="circle-btn view"
          title="View"
          onClick={() => console.log("View", item)}
        >
            <FaEye size={24}/>
        </Button>
      )}
    </div>
  ),
},  


];





function SupportTicketsTable() {
  return (
    <>

        <div className="table-wrapper">
            <GenericTable data={Pending} columns={columns} bordered={false} />
            <div className="table-footerBtn ">
                <Button>See All</Button>
            </div>
        </div>

    </>
  )
}

export default SupportTicketsTable