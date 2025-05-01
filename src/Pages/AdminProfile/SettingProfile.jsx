import React, { useRef , useState } from 'react'
import "./AdminProfile.css"
import AdminDashboardLayout from '../AdminDashboard/layout'
import { Button, Col, Container, Form, Nav, Row } from 'react-bootstrap'
import { FaUser } from 'react-icons/fa'
import { GrContactInfo } from 'react-icons/gr'
import { RiLockPasswordFill } from 'react-icons/ri'
import { MdDeleteForever, MdNotificationsActive, MdOutlineSecurity } from 'react-icons/md'
import { SiSessionize } from 'react-icons/si'
import { IoIosEye, IoIosEyeOff } from 'react-icons/io'

function SettingProfile() {

    
      const profRef = useRef(null);
    //   const basicRef = useRef(null);
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

    //   Password hide show 
        const [showPassword, setShowPassword] = useState({
            current: false,
            new: false,
            confirm: false,
        });
        
        const toggleVisibility = (field) => {
            setShowPassword((prev) => ({
            ...prev,
            [field]: !prev[field],
            }));
        };
    //   Password hide show 




  return (
    <>
        <AdminDashboardLayout dashName="Profile Setting">

            

            <section className='ProfileSettingSec'>
                <Container fluid>

                    <Row>
                        <Col md={12}> 
                            <div className="AnalysticData">
                            <h3>Settings</h3>
                            <p>Check the sales, value and bounce rate by country.</p>
                            </div>
                        </Col>
                    </Row>

            
                    <div className="ddd">
                        <Row className='mt-5'>

                            <Col sm={3}>
                                <Nav variant="pills" className="flex-column ProfileNavPill">
                                    <Nav.Item>
                                    <Nav.Link onClick={() => scrollToSection(profRef)}><FaUser /> Profile</Nav.Link>
                                    </Nav.Item>
                                    {/* <Nav.Item>
                                    <Nav.Link onClick={() => scrollToSection(basicRef)}><GrContactInfo /> Basic Info</Nav.Link>
                                    </Nav.Item> */}
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

                                    {/* <div ref={basicRef} className='BasicInfoDiv' >
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
                                    </div> */}

                                    <div ref={passwordRef} className='ProfPassword' >
                                        <h5>Change Password</h5>
                                        <div className="PasswrdForm mt-4">
                                            <Form>
                                                <Row>
                                                    <Col md={12}>
                                                        <Form.Group className="mb-3 PassFormControl" controlId="formCurrentPassword">
                                                            <Form.Control type={showPassword.current ? 'text' : 'password'} placeholder="Current password"/>
                                                            <span className='PasswordIcon' onClick={() => toggleVisibility('current')}>
                                                                {showPassword.current ? <IoIosEyeOff /> : <IoIosEye />}
                                                            </span>
                                                        </Form.Group>
                                                    </Col>

                                                    <Col md={12}>
                                                        <Form.Group className="mb-3 PassFormControl" controlId="formNewPassword">
                                                            <Form.Control type={showPassword.new ? 'text' : 'password'} placeholder="New password" />
                                                            <span className='PasswordIcon'onClick={() => toggleVisibility('new')} >
                                                                {showPassword.new ? <IoIosEyeOff /> : <IoIosEye />}
                                                            </span>
                                                        </Form.Group>
                                                    </Col>

                                                    <Col md={12}>
                                                        <Form.Group className="mb-3 PassFormControl" controlId="formConfirmPassword">
                                                            <Form.Control type={showPassword.confirm ? 'text' : 'password'} placeholder="Confirm New password" />
                                                            <span className='PasswordIcon' onClick={() => toggleVisibility('confirm')} >
                                                                {showPassword.confirm ? <IoIosEyeOff /> : <IoIosEye />}
                                                            </span>
                                                        </Form.Group>
                                                    </Col>
                                                </Row>
                                                <Row>
                                                    <Col md={12}>
                                                        <div className="PassRequirDiv">
                                                            <div className="pssrqritm">
                                                                <h4>Password requirements</h4>
                                                                <p>Please follow this guide for a strong password:</p>
                                                                <ul>
                                                                    <li>One special characters</li>
                                                                    <li>Min 6 characters</li>
                                                                    <li>One number (2 are recommended)</li>
                                                                    <li>Change it often</li>
                                                                </ul>
                                                            </div>
                                                            <div className="pssdbtn">
                                                                <Button >Update password</Button>
                                                            </div>
                                                        </div>
                                                    </Col>
                                                </Row>
                                            </Form>
                                        </div>
                                    </div>

                                    <div ref={faRef}>
                                        <div className="FactorAuthrDiv">

                                            <div className="AUTH">
                                                <h4>Two-factor authentication</h4>
                                                <span>ENABLED</span>
                                            </div>

                                            <div className="FactAuthData">

                                                <div className="FactAuthItem">
                                                    <span>Security keys</span>
                                                    <div className="AuthKeys">
                                                        <p>No Security Keys</p>
                                                        <Button>Add</Button>
                                                    </div>
                                                </div>
                                                <hr class="horizontal dark"></hr>






                                            </div>

                                        </div>
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

export default SettingProfile