import React from 'react'
import AdminDashboardLayout from './layout'
import { Col, Container, Row } from 'react-bootstrap'
import { MdOutlineLeaderboard, MdOutlineStore, MdWeekend } from 'react-icons/md'
import { IoPersonAddSharp } from 'react-icons/io5'

const AdminDashboard = () => {
  return (
    <>
    <AdminDashboardLayout>
      
      <section className='DashBoardSec'>
        <Container fluid>

          <Row>
            <Col md={12}> 
              <div className="AnalysticData">
                <h3>Analytics</h3>
                <p>Check the sales, value and bounce rate by country.</p>
              </div>
            </Col>
          </Row>

          <div className='DashcardDiv'>

            <div className="Dashcard">
              <div className="crdhedr">
                <div className='Crdtexted'>
                  <p>Bookings</p>
                  <h4>281</h4>
                </div>
                <div className="crdicon">
                  <MdWeekend />
                </div>
              </div>
              <hr className="dark horizontal "></hr>
              <div className="crdfotr">
                <p><span className="text-success">+55% </span> than last week</p>
              </div>
            </div>
            
            <div className="Dashcard">
              <div className="crdhedr">
                <div className='Crdtexted'>
                  <p>Today's Users</p>
                  <h4>2,300</h4>
                </div>
                <div className="crdicon">
                  <MdOutlineLeaderboard />
                </div>
              </div>
              <hr className="dark horizontal "></hr>
              <div className="crdfotr">
                <p><span className="text-success">+55% </span> than last week</p>
              </div>
            </div>
            
            <div className="Dashcard">
              <div className="crdhedr">
                <div className='Crdtexted'>
                  <p>Revenue</p>
                  <h4>$34,000</h4>
                </div>
                <div className="crdicon">
                  <MdOutlineStore />
                </div>
              </div>
              <hr className="dark horizontal "></hr>
              <div className="crdfotr">
                <p><span className="text-success">+55% </span> than last week</p>
              </div>
            </div>

            <div className="Dashcard">
              <div className="crdhedr">
                <div className='Crdtexted'>
                  <p>Followers</p>
                  <h4>+2,910</h4>
                </div>
                <div className="crdicon">
                  <IoPersonAddSharp />
                </div>

              </div>
              <hr className="dark horizontal "></hr>
              <div className="crdfotr">
                <p><span className="text-success">+55% </span> than last week</p>
              </div>
            </div>
            

          </div>

          <Row>




            
          </Row>






          
        </Container>








      </section>





      
      
    </AdminDashboardLayout>
    
    
    
    </>
  )
}

export default AdminDashboard