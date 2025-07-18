"use client";
import React from 'react'
import "./DataTable.css"
import GenericTable from '../GenericTable/GenericTable'
import { Button } from 'react-bootstrap'
import Image from 'next/image';


// Define the Column type
type Column<T> = {
  label: string;
  key: keyof T | string;
  width?: string;
  render?: (item: T) => React.ReactNode;
};



type ActivityItem = {
  event: string;
  department: string;
  time: string;
  date: string;
  Asigname: string;
  asignpic: string;
  
};

// Sample Data
const Activity: ActivityItem[] = [
  {
    event: "European Pet Foundation(new business) onboarding, meeting at 3pm",
    department: "CRM",
    time: "10:15 AM",
    date: "24 July 2025",
    Asigname: "Assignee:Surbhi",
    asignpic: "/Images/clnder.png", 
  },
  {
    event: "Blog on Food diets for pets, posted on animal blogs- http/webapp/blog.com",
    department: "CMS",
    time: "10:15 AM",
    date: "24 July 2025",
    Asigname: "Assignee:Suryansh",
    asignpic: "/Images/clnder.png", 
  },
  {
    event: "Salaries  sent to employees account with 8% hike",
    department: "Finance",
    time: "10:15 AM",
    date: "24 July 2025",
    Asigname: "Assignee:Anil",
    asignpic: "/Images/clnder.png", 
  },
  
  
];

// Columns for GenericTable
const columns: Column<ActivityItem>[] = [

  {
    label: "Events",
    key: "events",
    render: (item: ActivityItem) => (
      <p className='MesssageDiv'>{item.event}</p>
    ),
  },
 
  {
  label: "Department ",
  key: "department",
  render: (item: ActivityItem) => <p>{item.department}</p>,
},
{
    label: "Start Date",
    key: "date",
    render: (item: ActivityItem) => (
      <div>
        <p>{item.time}</p>
        <span>{item.date}</span>
      </div>
    ),
  },
   
   {
    label: "Actions",
    key: "actions",
    render: (item: ActivityItem) => (
      <div className="AssignDiv">
          <Button className="circle-btn view" title="View" onClick={() => console.log("View", item)}>
              {item.Asigname}
              <div className="asignuser">
                <Image  aria-hidden src={item.asignpic}  alt="eyes" width={24} height={24}/>
              </div>
              
          </Button>
      </div>
    ),
  }

];
function ActivityTable() {
  return (
    <>


        <div className="table-wrapper">
            <GenericTable data={Activity} columns={columns as any} bordered={false} />
        </div>





    </>
  )
}

export default ActivityTable