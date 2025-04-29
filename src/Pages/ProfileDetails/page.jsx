import React , { useRef , useState } from 'react'
import "./ProfileDetails.css"
import AdminDashboardLayout from '../AdminDashboard/layout'
import { Col, Container, Form, Nav, Row} from 'react-bootstrap'
import { FaUser } from 'react-icons/fa'
import { GrContactInfo } from 'react-icons/gr'
import { RiLockPasswordFill } from 'react-icons/ri'
import { MdDeleteForever, MdNotificationsActive, MdOutlineSecurity } from 'react-icons/md'
import { SiSessionize } from 'react-icons/si'

function ProfileDetails() {

  const profRef = useRef(null);
  const basicRef = useRef(null);
  const passwordRef = useRef(null);
  const faRef = useRef(null);
  const accountRef = useRef(null);
  const notifyRef = useRef(null);
  const sessionRef = useRef(null);
  const deleteRef = useRef(null);

  const scrollToSection = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const [isChecked, setIsChecked] = useState(false);
  const handleToggle = () => {
    setIsChecked(!isChecked);
  };

  return (
    <>
    <AdminDashboardLayout>

      <section className='ProfileSection'>
        <Container fluid>

        <Row>
          <Col md={12}> 
            <div className="AnalysticData">
              <h3>Settings</h3>
              <p>Check the sales, value and bounce rate by country.</p>
            </div>
          </Col>
        </Row>

        {/* <div className="ddd">
          <Tab.Container id="left-tabs-example" defaultActiveKey="prof">
            <Row>

              <Col sm={3}>
                <Nav variant="pills" className="flex-column">
                  <Nav.Item>
                    <Nav.Link eventKey="prof"><span><FaUser/></span> Profile</Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="basic"><span><GrContactInfo/></span> Basic Info</Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="password"><span><RiLockPasswordFill /></span> Change Password</Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="2fa"><span><MdOutlineSecurity /></span> 2FA</Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="account"><span><MdNotificationsActive /></span> Accounts</Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="notify"><span><MdNotificationsActive /></span> Notifications</Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="session"><span><SiSessionize /></span> Sessions</Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="deltact"><span><MdDeleteForever /></span> Delete Account</Nav.Link>
                  </Nav.Item>
                </Nav>
              </Col>

              <Col sm={9}>
                <Tab.Content>
                  <Tab.Pane eventKey="prof">First tab content</Tab.Pane>
                  <Tab.Pane eventKey="basic">Second tab content</Tab.Pane>
                  <Tab.Pane eventKey="password">Second tab content</Tab.Pane>
                  <Tab.Pane eventKey="2fa">Second tab content</Tab.Pane>
                  <Tab.Pane eventKey="account">Second tab content</Tab.Pane>
                  <Tab.Pane eventKey="notify">Second tab content</Tab.Pane>
                  <Tab.Pane eventKey="session">Second tab content</Tab.Pane>
                  <Tab.Pane eventKey="deltact">Second tab content</Tab.Pane>
                </Tab.Content>
              </Col>
            </Row>
          </Tab.Container>
        </div> */}

        <div className="ddd">
          <Row className='mt-5'>

            <Col sm={3}>
              <Nav variant="pills" className="flex-column ProfileNavPill">
                <Nav.Item>
                  <Nav.Link onClick={() => scrollToSection(profRef)}><FaUser /> Profile</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link onClick={() => scrollToSection(basicRef)}><GrContactInfo /> Basic Info</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link onClick={() => scrollToSection(passwordRef)}><RiLockPasswordFill /> Change Password</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link onClick={() => scrollToSection(faRef)}><MdOutlineSecurity /> 2FA</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link onClick={() => scrollToSection(accountRef)}><MdNotificationsActive /> Accounts</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link onClick={() => scrollToSection(notifyRef)}><MdNotificationsActive /> Notifications</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link onClick={() => scrollToSection(sessionRef)}><SiSessionize /> Sessions</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link onClick={() => scrollToSection(deleteRef)}><MdDeleteForever /> Delete Account</Nav.Link>
                </Nav.Item>
              </Nav>
            </Col>

            <Col sm={9}>

              <div className="ProfileTabContent">

                <div ref={profRef} className='ProfDiv'>
                  <div className="ProfInfo">
                    <div className="avtar">
                      <img src="/Images/user.jpg" alt="UserImg" width={74} height={74} />
                    </div>
                    <div className="AvtarText">
                      <h5>Richard Davis</h5>
                      <p>CEO/Co-Founder</p>
                    </div>
                  </div>
                  <div className="Proft">
                    <label className="toggle-switch">
                      <span className="label-text">{isChecked ? 'Switch to visible' : 'Switch to invisible'}</span>
                      <input type="checkbox" checked={isChecked} onChange={handleToggle} />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>

                <div ref={basicRef} className='BasicInfoDiv' >
                  <h5>Basic Info</h5>
                  <div className="BasicForm mt-3">
                    <Form>
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3 PrfFormControl" controlId="formBasicFname">
                            <Form.Label>First Name</Form.Label>
                            <Form.Control type="name" placeholder="Enter First Name" />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3 PrfFormControl" controlId="formBasicLname">
                            <Form.Label>Last Name </Form.Label>
                            <Form.Control type="name" placeholder="Enter Last Name" />
                          </Form.Group>
                        </Col>
                      </Row>
                      <Row>
                        <Col md={4}>
                        </Col>
                        <Col md={8}>
                        </Col>
                      </Row>
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3 PrfFormControl" controlId="formBasicEmail">
                            <Form.Label>Email </Form.Label>
                            <Form.Control type="email" placeholder="Enter Email" />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3 PrfFormControl" controlId="formBasicCEmail">
                            <Form.Label>Confirm Email </Form.Label>
                            <Form.Control type="email" placeholder="Enter Confirm Email" />
                          </Form.Group>
                        </Col>
                      </Row>
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3 PrfFormControl" controlId="formBasicLocation">
                            <Form.Label>Your location</Form.Label>
                            <Form.Control type="text" placeholder="Enter Your location" />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3 PrfFormControl" controlId="formBasicNumber">
                            <Form.Label>Phone Number</Form.Label>
                            <Form.Control type="number" placeholder="Enter Phone Number" />
                          </Form.Group>
                        </Col>
                      </Row>
                     
                    </Form>
                  </div>
                </div>

                <div ref={passwordRef} className='ProfPassword' >
                  <h5>Change Password</h5>
                  <div className="PasswrdForm mt-4">
                    <Form>
                      <Row>
                        <Col md={12}>
                          <Form.Group className="mb-3 PassFormControl" controlId="formBasicPassword">
                            <Form.Control type="name" placeholder="Current password" />
                          </Form.Group>
                        </Col>
                        <Col md={12}>
                          <Form.Group className="mb-3 PassFormControl" controlId="formBasicLname">
                            <Form.Control type="name" placeholder="New password" />
                          </Form.Group>
                        </Col>
                        <Col md={12}>
                          <Form.Group className="mb-3 PassFormControl" controlId="formBasicLname">
                            <Form.Control type="name" placeholder="Confirm New password" />
                          </Form.Group>
                        </Col>
                      </Row>
                    </Form>
                  </div>

                </div>

                <div ref={faRef} >
                  <h3>2FA</h3>
                  <p>Your two-factor authentication setup...</p>
                </div>
                <div ref={accountRef}>
                  <h3>Accounts</h3>
                  <p>Your account settings...</p>
                </div>
                <div ref={notifyRef}>
                  <h3>Notifications</h3>
                  <p>Your notification preferences...</p>
                </div>
                <div ref={sessionRef}>
                  <h3>Sessions</h3>
                  <p>Active sessions list...</p>
                </div>
                <div ref={deleteRef}>
                  <h3>Delete Account</h3>
                  <p>Delete account section...</p>
                </div>

              </div>

            </Col>

          </Row>
        </div>
          











        </Container>
      </section>
      







    </AdminDashboardLayout>

    </>
  )
}

export default ProfileDetails