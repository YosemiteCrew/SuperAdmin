import React from 'react'
import AdminDashboardLayout from '../../AdminDashboard/layout'
import "../CRMPage.css"
import { Container, Row } from 'react-bootstrap'
import { BiSolidBellRing } from 'react-icons/bi'
import DashCard from '@/app/Components/DashCard/DashCard'
import PendingVerfyTable from '@/app/Components/DataTable/PendingVerfyTable'

function CRMHospital() {
  return (
    <>

    <AdminDashboardLayout>

        <section>
            <Container fluid>
                <div className="CRMPageData">

                    <div className="CRMDashTopHead">
                        <h2>CRM Dashboard - Hospitals</h2>
                        <span className='red'><BiSolidBellRing/> 5 Practices Awaiting Verification</span>
                    </div>

                    <Row>
                        <DashCard type="hospitals" filter={"90"}/>
                    </Row>

                    <div className='HospitalVerifyDiv'>
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

export default CRMHospital