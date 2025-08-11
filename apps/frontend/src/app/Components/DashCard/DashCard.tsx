"use client";
import React, { useEffect, useState } from 'react';
import "./DashCard.css"
import { FaStar, FaUser } from 'react-icons/fa';
import { IoArrowDownCircleSharp, IoArrowUpCircleSharp } from 'react-icons/io5';
import { HiMiniUserPlus } from 'react-icons/hi2';
import { AiFillMessage } from 'react-icons/ai';
import { BsFillBookmarkCheckFill } from 'react-icons/bs';
import { FaCircleDollarToSlot } from 'react-icons/fa6';
import { PiHourglassSimpleFill } from 'react-icons/pi';
import { BiSolidError } from 'react-icons/bi';
import type { JSX } from 'react';
import axios from "axios";

type DashCardProps = {
  type: "all" | "hospitals" | "groomers" | "breeders" | "sitters" | "petparents"
  filter: "30" | "60" | "90"; // Last 30/60/90 days
};

interface CardItem {
  icon: JSX.Element;
  label: string;
  value: string;
  status: "Done" | "Error";
  ratiotext: string;
}


// Mapping labels to icons
const labelToIconMap: Record<string, JSX.Element> = {
  "Total Users": <FaUser />,
  "New Signups": <HiMiniUserPlus />,
  "Daily Active Users": <FaStar />,
  "New Support Tickets": <AiFillMessage />,
  "Profile Completion Rate": <BsFillBookmarkCheckFill />,
  "Pending Verifications": <PiHourglassSimpleFill />,
  "Inactive Practices": <BiSolidError />,
  "Monthly Recurring Revenue (MRR)": <FaCircleDollarToSlot />,
};



// Simulated API response shape
// const staticData: Record<DashCardProps["type"], Record<DashCardProps["filter"], CardItem[]>> = {
//   all: {
//     "30": [
//       { icon: <FaUser />, label: "Total Users", value: "1000", status: "Done", ratiotext: "15%" },
//       { icon: <HiMiniUserPlus />, label: "New Signups", value: "400", status: "Error", ratiotext: "12%" },
//       { icon: <FaStar />, label: "Daily Active Users", value: "800", status: "Done", ratiotext: "10%" },
//       { icon: <AiFillMessage />, label: "New Support Tickets", value: "90", status: "Done", ratiotext: "5%" },
//       { icon: <BsFillBookmarkCheckFill />, label: "Profile Completion Rate", value: "85%", status: "Done", ratiotext: "5%" },
//       { icon: <PiHourglassSimpleFill />, label: "Pending Verifications", value: "5", status: "Error", ratiotext: "8%" },
//       { icon: <BiSolidError />, label: "Inactive Practices", value: "22", status: "Error", ratiotext: "3%" },
//       { icon: <FaCircleDollarToSlot />, label: "Monthly Recurring Revenue (MRR)", value: "$3210", status: "Done", ratiotext: "6%" },
//     ],
//     "60": [
//       { icon: <FaUser />, label: "Total Users", value: "2000", status: "Done", ratiotext: "15%" },
//     ],
//     "90": [
//       { icon: <FaUser />, label: "Total Users", value: "3000", status: "Done", ratiotext: "15%" },
//       { icon: <HiMiniUserPlus />, label: "New Signups", value: "200", status: "Error", ratiotext: "12%" },
//     ],
//   },
//   hospitals: {
//     "30": [
//       { icon: <FaUser />, label: "Total Users", value: "2000", status: "Done", ratiotext: "10%" },
//       { icon: <HiMiniUserPlus />, label: "New Signups", value: "150", status: "Error", ratiotext: "5%" },
//       { icon: <FaStar />, label: "Daily Active Users", value: "300", status: "Done", ratiotext: "6%" },
//       { icon: <AiFillMessage />, label: "New Support Tickets", value: "40", status: "Done", ratiotext: "2%" },
//       { icon: <BsFillBookmarkCheckFill />, label: "Profile Completion Rate", value: "90%", status: "Done", ratiotext: "7%" },
//       { icon: <PiHourglassSimpleFill />, label: "Pending Verifications", value: "2", status: "Error", ratiotext: "2%" },
//       { icon: <BiSolidError />, label: "Inactive Practices", value: "8", status: "Error", ratiotext: "1%" },
//       { icon: <FaCircleDollarToSlot />, label: "Monthly Recurring Revenue (MRR)", value: "$1800", status: "Done", ratiotext: "4%" },
//     ],
//     "60": [/* ... */],
//     "90": [/* ... */],
//   },
//   // 👇 Similarly for groomers, breeders, sitters...
//   groomers: { "30": [], "60": [], "90": [] },
//   breeders: { "30": [], "60": [], "90": [] },
//   sitters: { "30": [], "60": [], "90": [] },
// };

function DashCard({ type, filter }: DashCardProps) {
  const [cards, setCards] = useState<CardItem[]>([]);

  // useEffect(() => {
  //   setCards(staticData[type][filter]);
  // }, [type, filter]);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/business/allbusiness`, {
          businessType: type,
          filter: filter,
        });

        if (res.data.success) {
          const dataWithIcons: CardItem[] = res.data.data.map((item: any) => ({
            ...item,
            icon: labelToIconMap[item.label] || <FaUser />,
          }));

          setCards(dataWithIcons);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      }
    };

    fetchData();
  }, [type, filter]);

  return (
    <div className="CRMDashBoardCard">
      {cards.map((item, idx) => (
        <DashInfoCard
          key={idx}
          DashIcon={item.icon}
          UserName={item.label}
          CrdNumb={item.value}
          RatioIcon={item.status === "Done" ? <IoArrowUpCircleSharp /> : <IoArrowDownCircleSharp />}
          RatioText={item.ratiotext}
          RatioCL={item.status}
        />
      ))}
    </div>
  );
}

export default DashCard;


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
