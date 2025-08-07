import React from 'react'
import "../CRMPage.css"
import AdminDashboardLayout from '../../AdminDashboard/layout'
import { Container, Row } from 'react-bootstrap'
import { BiSolidBellRing } from 'react-icons/bi'
import DashCard from '@/app/Components/DashCard/DashCard'
import PendingVerfyTable from '@/app/Components/DataTable/PendingVerfyTable'

function CRMSitters() {
  return (
    <>

    <AdminDashboardLayout>

        <section>
            <Container fluid>
                <div className="CRMPageData">

                    <div className="CRMDashTopHead">
                        <h2>CRM Dashboard - Breeders</h2>
                        <span className='red'><BiSolidBellRing/> 5 Practices Awaiting Verification</span>
                    </div>

                    <Row>
                        <DashCard type="sitters" filter={"90"}/>
                    </Row>

                    <div className='HospitalVerifyDiv'>
                        <h5>Pending Verifications <span>5</span></h5>
                        <PendingVerfyTable/>
                    </div>


                    <div className='HospitalVerifyDiv'>
                        <div className="ff">
                            <h5>Practice Activity Overview</h5>
                            <div className="s">
                                
                            </div>
                        </div>
                        <h5>Pending Verifications <span>5</span></h5>
                        <PendingVerfyTable/>
                    </div>





                </div>
            </Container>
        </section>

    </AdminDashboardLayout>

    </>
  )
}

export default CRMSitters