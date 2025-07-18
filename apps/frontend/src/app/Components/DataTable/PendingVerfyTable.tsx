"use client";
import React from 'react'
import "./DataTable.css"
import GenericTable from '../GenericTable/GenericTable'
import { Button } from 'react-bootstrap'
import { FaEye,  } from 'react-icons/fa6';


// Define the Column type
type Column<T> = {
  label: string;
  key: keyof T | string;
  width?: string;
  render?: (item: T) => React.ReactNode;
};



type PendingVerificationItem = {
  name: string;
  place: string;
  country: string;
  profile: string;
  since: string;
};

// Sample Data
const Pending: PendingVerificationItem[] = [
  {
    name: "Happy Tails Vet",
    place: "Toronto",
    country: "Canada",
    profile: "95%",
    since: "6 hrs%",
  },
  {
    name: "Cozy Paws",
    place: "New York",
    country: "USA",
    profile: "78%",
    since: "2 days",
  },
  {
    name: "UrbanPet Clinic",
    place: "Berlin",
    country: "Germany",
    profile: "86%",
    since: "7 days",
  },
  
];

// Columns for GenericTable
const columns: Column<PendingVerificationItem>[] = [

  {
    label: "Practice Name",
    key: "name",
    render: (item: PendingVerificationItem) => (
      <p className="name">{item.name}</p>
    ),
  },
  {
    label: "Region",
    key: "region",
    render: (item: PendingVerificationItem) => (
      <div>
        <p>{item.place}</p>
        <span>{item.country}</span>
      </div>
    ),
  },
  {
  label: "Profile Completion",
  key: "profile ",
  render: (item: PendingVerificationItem) => <p>{item.profile}</p>,
},
{
  label: "Pending Since",
  key: "since",
  render: (item: PendingVerificationItem) => <p>{item.since}</p>,
},

  
 {
  label: "Actions",
  key: "actions",
  render: (item: PendingVerificationItem) => (
    <div className="action-btn-col">
        <Button className="circle-btn view" title="View" onClick={() => console.log("View", item)}>
            <FaEye size={24}/>
        </Button>
    </div>
  ),
}


];


function PendingVerfyTable() {
  return (
    <>

        <div className="table-wrapper">
            <GenericTable data={Pending} columns={columns as any} bordered={false} />
            <div className="table-footerBtn ">
                <Button>See All</Button>
            </div>
        </div>




    </>
  )
}

export default PendingVerfyTable