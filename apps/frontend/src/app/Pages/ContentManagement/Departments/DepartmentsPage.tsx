"use client";
import React, { useState, useEffect } from "react";
import AdminDashboardLayout from '../../AdminDashboard/layout';
import { Container, Row, Col, Button, Form, Badge, Dropdown } from 'react-bootstrap';
import { FaSearch, FaPlus, FaEye, FaEllipsisV, FaChevronLeft, FaChevronRight, FaClock } from 'react-icons/fa';
import "./Departments.css";
import CommonTabs from "@/app/Components/CommonTabs/CommonTabs";
import DepartmentsListTable from "@/app/Components/DataTable/DepartmentsListTable";
import { useRouter } from "next/navigation";
import axios from "axios";

const DepartmentsPage: React.FC = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
  
    const handleAddNewDepartment = () => {
        // Handle create new department
        console.log('Create new department clicked');
        // You can navigate to create page or open modal
        router.push('/departments/create');
    };

    return (
        <AdminDashboardLayout>
            <section>
                <Container>
                    <div className="AssemementData">
                        <h2>Departments</h2>
                        

                        <div className="ss">
                            <DepartmentsListTable 
                            showCreateButton={true}
                            createButtonText="Add New"
                            onCreateClick={handleAddNewDepartment} 
                            />
                            
                        </div>
                    </div>
                </Container>
            </section>
        </AdminDashboardLayout>
    );
};

export default DepartmentsPage;