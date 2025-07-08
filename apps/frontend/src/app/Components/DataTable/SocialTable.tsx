"use client";
import React from 'react'
import "./DataTable.css"
import GenericTable from '../GenericTable/GenericTable'
import { AiFillInstagram, AiFillTikTok } from 'react-icons/ai';
import { BsChatHeartFill } from 'react-icons/bs';
import { FaLinkedin, FaSquareXTwitter } from 'react-icons/fa6';


// Define the Column type
type Column<T> = {
  label: string;
  key: keyof T | string;
  width?: string;
  render?: (item: T) => React.ReactNode;
};



type SocialItem = {
  icon: React.ReactNode;
  type: string;
  likes: string;
  follower: string;
};

// Sample Data
const Activity: SocialItem[] = [
  {
    icon: <AiFillInstagram size={32} key="instagram-icon" />,
    type: "Instagram",
    likes: "700",
    follower: "1840",
  },
  {
    icon: <AiFillTikTok size={32} key="tiktok-icon" />,
    type: "TikTok",
    likes: "501",
    follower: "42",
  },
  {
    icon: <FaSquareXTwitter size={32} key="x-icon" />,
    type: "X",
    likes: "492",
    follower: "234",
  },
  {
    icon: <FaLinkedin size={32} key="linkdin-icon" />,
    type: "Linkedin",
    likes: "560",
    follower: "1345",
  },
  
  
  
];

// Columns for GenericTable
const columns: Column<SocialItem>[] = [

{
  label: "",
  key: "",
  width: "50px",
  render: (item: SocialItem) => (
    <p>{item.icon}</p>
  ),
},
  {
    label: "Type",
    key: "type",
    render: (item: SocialItem) => (
      <p >{item.type}</p>
    ),
  },
  {
    label: "Likes",
    key: "likes",
    render: (item: SocialItem) => (
      <div className='Likediv'>
        <p><BsChatHeartFill /></p>
        <p>{item.likes}</p>
      </div>
    ),
  },

  {
  label: "Follower ",
  key: "follower",
  render: (item: SocialItem) => <p>{item.follower}</p>,
},


];


function SocialTable() {
  return (
    <>

        <div className="table-wrapper">
            <GenericTable data={Activity} columns={columns} bordered={false} />
        </div>



    </>
  )
}

export default SocialTable