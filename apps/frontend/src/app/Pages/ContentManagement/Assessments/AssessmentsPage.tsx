"use client";
import React, { useState, useEffect } from "react";
import AdminDashboardLayout from '../../AdminDashboard/layout';
import { Container, Row, Col, Button, Form, Badge, Dropdown } from 'react-bootstrap';
import { FaSearch, FaPlus, FaEye, FaEllipsisV, FaChevronLeft, FaChevronRight, FaClock } from 'react-icons/fa';
import "./Assessments.css";
import CommonTabs from "@/app/Components/CommonTabs/CommonTabs";
import AssesmentsListTable from "@/app/Components/DataTable/AssesmentsListTable";
import { useRouter } from "next/navigation";
import axios from "axios";




// PracticeTabs Started 
export const PracticeTabs = [
    {
      eventKey: 'Published',
      title: 'Published',
      content: (
        <>
        <AssesmentsListTable activeTab="published" />
        </>
      ),
    },
    {
      eventKey: 'Unpublished',
      title: 'Unpublished',
      content: (
        <>
         <AssesmentsListTable activeTab="unpublished"/>
        </>
      ),
    },
    
  ];

const AssessmentsPage: React.FC = () => {

    const router = useRouter();
    const [loading, setLoading] = useState(true);
  
    
    const handleCreateAssessment = () => {
        // Handle create new assessment
        console.log('Create new assessment clicked');
        // You can navigate to create page or open modal
        router.push('/assessments/create');
      };


  

  return (
    <AdminDashboardLayout>

        <section>
            <Container>

                <div className="AssemementData">
                    <h2>Assessments</h2>
                    <div className="f">
                        <h4>List of Assessments</h4>
                    </div>

                    <div className="ss">

                    <CommonTabs 
                    tabs={PracticeTabs}
                    showCreateButton={true}
                    createButtonText="Create Assessment"
                    onCreateClick={handleCreateAssessment} 
                    />
                    </div>









                </div>

            </Container>
        </section>
     
    </AdminDashboardLayout>
  );
};

export default AssessmentsPage;