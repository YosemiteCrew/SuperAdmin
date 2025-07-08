"use client";
import React from 'react'
import "./DashCard.css"
import { FaStar, FaUser } from 'react-icons/fa';
import { IoArrowDownCircleSharp, IoArrowUpCircleSharp } from 'react-icons/io5';
import { HiMiniUserPlus } from 'react-icons/hi2';
import { AiFillMessage } from 'react-icons/ai';
import { BsFillBookmarkCheckFill } from 'react-icons/bs';
import { FaCircleDollarToSlot } from 'react-icons/fa6';
import { PiHourglassSimpleFill } from 'react-icons/pi';
import { BiSolidError } from 'react-icons/bi';

function DashCard() {
  return (
    <>

        <div className="CRMDashBoardCard">

            <DashInfoCard DashIcon={<FaUser/>} UserName="Total Users" CrdNumb="2639" RatioIcon={<IoArrowUpCircleSharp/>} RatioText="23%" RatioCL="Done"/>
            <DashInfoCard DashIcon={<HiMiniUserPlus/>} UserName="New Signups" CrdNumb="288" RatioIcon={<IoArrowDownCircleSharp/>} RatioText="23%" RatioCL="Error"/>
            <DashInfoCard DashIcon={<FaStar />} UserName="Daily Active Users" CrdNumb="697" RatioIcon={<IoArrowUpCircleSharp/>} RatioText="23%" RatioCL="Done"/>
            <DashInfoCard DashIcon={<AiFillMessage />} UserName="New Support Tickets" CrdNumb="113" RatioIcon={<IoArrowUpCircleSharp/>} RatioText="23%" RatioCL="Done"/>
            <DashInfoCard DashIcon={<BsFillBookmarkCheckFill />} UserName="Profile Completion Rate" CrdNumb="90.6%" RatioIcon={<IoArrowUpCircleSharp/>} RatioText="23%" RatioCL="Done"/>
            <DashInfoCard DashIcon={<PiHourglassSimpleFill/>} UserName="Pending Verifications" CrdNumb="7" RatioIcon={<IoArrowDownCircleSharp/>} RatioText="23%" RatioCL="Error"/>
            <DashInfoCard DashIcon={<BiSolidError/>} UserName="Inactive Practices" CrdNumb="113" RatioIcon={<IoArrowDownCircleSharp/>} RatioText="23%" RatioCL="Error"/>
            <DashInfoCard DashIcon={<FaCircleDollarToSlot />} UserName="Monthly Recurring Revenue (MRR)" CrdNumb="$4197" RatioIcon={<IoArrowUpCircleSharp/>} RatioText="23%" RatioCL="Done"/>


        </div>




    </>
  )
}

export default DashCard


// DashInfoCard Started

interface DashInfoCardProps {
  DashIcon: React.ReactNode;
  UserName: string;
  CrdNumb: string;
  RatioIcon: React.ReactNode;
  RatioCL?: string;
  RatioText?: string | number;
}

export function DashInfoCard({ DashIcon ,UserName ,CrdNumb ,RatioIcon ,RatioText ,RatioCL }: DashInfoCardProps) {
    return <div className="DashInfoCd">
        {DashIcon}
        <p>{UserName}</p>
        <div className="RatioDiv">
            <h3>{CrdNumb}</h3>
            <span className={RatioCL}>{RatioIcon} {RatioText}</span>
        </div>

    </div>
}
