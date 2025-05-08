import React from 'react'
import "./Assessment.css";
import AdminDashboardLayout from '../AdminDashboard/layout'
import { Container } from 'react-bootstrap'
import AssessmentTable from '../../Components/AssessmentTable/AssessmentTable'
import { Link } from 'react-router-dom';
import { FiPlusCircle } from 'react-icons/fi';

function AssessmentPage() {
  return (
    <>
        <AdminDashboardLayout dashName="Assessment Page">
            <Container fluid>
                <div className="AssessmentListing">

                  <div className="AssmntList">
                    <h2>Assessment List</h2>
                    <Link to="/addassessment"><FiPlusCircle /> Add Assessment</Link>
                  </div>

                  <AssessmentTable/>

                </div>

            </Container>
        </AdminDashboardLayout>



    </>
  )
}

export default AssessmentPage