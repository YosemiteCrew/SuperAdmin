"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';

import AdminDashboardLayout from './layout'
import {Col, Container, Row } from 'react-bootstrap'
import { BiSolidBellRing } from 'react-icons/bi';
import Image from 'next/image';
import { GraphSelected } from '../CRMPage/CRMDashboard/CRMDashboard';
import RevenueGraph from "@/app/Components/BarGraph/RevenueGraph";
import ActivityTable from "@/app/Components/DataTable/ActivityTable";
import AnalyticsReport from "@/app/Components/BarGraph/AnalyticsReport";
import SocialTable from "@/app/Components/DataTable/SocialTable";
import Conversion from "@/app/Components/BarGraph/Conversion";

const AdminDashboard = () => {

  const [selectedRange1, setSelectedRange1] = useState("All"); // graphSelected 
  const [selectedRange2, setSelectedRange2] = useState("Hospitals"); // graphSelected 

  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/Auth/Login");
    }
  }, []);




  return (
    <>
    <AdminDashboardLayout>
      
      <section className='DashBoardSec'>
        <Container fluid>
          <div className="DashBoardData">

            <div className="DashBoardTopHead">
              <p>Welcome</p>
              <h2>Super Admin Dashboard <span><BiSolidBellRing/> 8 New Notification</span></h2>
            </div>

            <div className="DashCardDiv">

              <DashMainCard
                iconSrc="/Images/clnder.png"
                altText="Calendar Icon"
                title="Admin Team Members"
                count="370"
              />
              <DashMainCard
                iconSrc="/Images/clnder.png"
                altText="Calendar Icon"
                title="Total Appointments"
                count="04"
              />
              <DashMainCard
                iconSrc="/Images/clnder.png"
                altText="Calendar Icon"
                title="Time Spend On App"
                count="1856 hrs"
              />
              <DashMainCard
                iconSrc="/Images/clnder.png"
                altText="Calendar Icon"
                title="Time Spend on Web"
                count="80741 hrs"
              />

            </div>

            <Row>
              <Col md={6}>

                <GraphSelected
                  title="New User Trend"
                  optionsList={[ ["All", "Hospitals", "Groomers","Breeders","Sitters","Developers"] ]}
                  selectCount={1} selectedOption={selectedRange1} onSelect={setSelectedRange1}
                />



              </Col>
              <Col md={6}>

                <GraphSelected
                  title="User Engagement"
                  optionsList={[ ["Hospitals", "Groomers","Breeders","Sitters","Developers"] ]}
                  selectCount={1} selectedOption={selectedRange2} onSelect={setSelectedRange2}
                />



              </Col>
             

            </Row>

            <Row>
              <Col md={12}>
                <GraphSelected
                  title="Conversion Source"
                  optionsList={[ ["All", "Hospitals", "Groomers","Breeders","Sitters","Developers"] ]}
                  selectCount={1} selectedOption={selectedRange1} onSelect={setSelectedRange1}
                />
                <Conversion/>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <GraphSelected
                  title="Analytics & Report"
                  optionsList={[ ["All", "Hospitals", "Groomers","Breeders","Sitters","Developers"] ]}
                  selectCount={1} selectedOption={selectedRange1} onSelect={setSelectedRange1}
                />
                <AnalyticsReport data={[
                    { name: 'A', total: 200, value: 170 },
                    { name: 'B', total: 200, value: 120 },
                  ]} />
              </Col>

              <Col md={6}>
                <GraphSelected
                  title="Social Media Overview"
                  optionsList={[ ["Hospitals", "Groomers","Breeders","Sitters","Developers"] ]}
                  selectCount={1} selectedOption={selectedRange2} onSelect={setSelectedRange2}
                />
                <SocialTable/>
              </Col>
            </Row>

            <Row>
              <Col md={12}>
                <GraphSelected
                  title="Revenue"
                  optionsList={[ ["All", "Hospitals", "Groomers","Breeders","Sitters","Developers"] ]}
                  selectCount={1} selectedOption={selectedRange1} onSelect={setSelectedRange1}
                />
                <RevenueGraph/>
              </Col>
            </Row>
            
            <Row>
              <Col md={12}>
                <GraphSelected
                  title="Activity Logs"
                  optionsList={[ ["All", "Hospitals", "Groomers","Breeders","Sitters","Developers"] ]}
                  selectCount={1} selectedOption={selectedRange1} onSelect={setSelectedRange1}
                />
                <ActivityTable/>
              </Col>
            </Row>
            











          </div>

        </Container>

      </section>

    </AdminDashboardLayout>
    
    </>
  )
}

export default AdminDashboard



interface DashMainCardProps {
  iconSrc: string;
  altText: string;
  title: string;
  count: number | string;
}

export function DashMainCard({
  iconSrc,
  altText,
  title,
  count,
}: DashMainCardProps) {
  return (
    <div className="DashCard">
      <div className="iconDiv">
        <Image
          src={iconSrc}
          alt={altText}
          width={32}
          height={32}
        />
      </div>
      <div className="ItemText">
        <p>{title}</p>
        <h4>{count}</h4>
      </div>
    </div>
  );
}
