"use client";
import React, { useState } from "react";
import { ChevronLeft, QrCode, Smartphone, Mail, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { Container, Row, Col, Button, Form } from "react-bootstrap";

const Signup = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    authCode: "",
  });

  const [generatedCode, setGeneratedCode] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const router = useRouter();

  const handleInputChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
        alert("Please fill all fields");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        alert("Passwords do not match");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      if (formData.authCode === generatedCode) {
        alert("Account created!");
        localStorage.setItem("token", "mockToken123");
        router.push("/Pages/AdminDashboard");
      } else {
        alert("Invalid code");
      }
    }
  };

  const sendAuthCode = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
    setIsCodeSent(true);
    alert(`Code sent to ${formData.email}: ${code}`);
  };
    // const sendAuthCode = async () => {
    // const code = Math.floor(100000 + Math.random() * 900000).toString();
    // setGeneratedCode(code);
    // setIsCodeSent(true);

    // try {
    //     const response = await fetch("/api/send-email", {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({ toEmail: formData.email, code }),
    //     });

    //     const data = await response.json();
    //     if (data.success) {
    //     alert("Authentication code sent to your email.");
    //     } else {
    //     alert("Failed to send email.");
    //     }
    // } catch (error) {
    //     console.error("Email error:", error);
    //     alert("Error sending email.");
    // }
    // };

  const goBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const getStepImage = () => {
    return `/Images/signup-step${step}.png`;
  };

  return (
    <section className="form-section py-5">
      <Container fluid>
        <Row className="min-vh-100">
          {/* Left Image Block */}
          <Col md={6} className="d-none d-md-block p-0">
            <div
              className="h-100 w-100 bg-cover bg-center"
              style={{
                backgroundImage: `url(${getStepImage()})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            ></div>
          </Col>

          {/* Form Section */}
          <Col md={6} className="d-flex align-items-center justify-content-center">
            <div className="auth-box p-5 shadow-lg w-100" style={{ maxWidth: "450px" }}>
              

              {/* Step 1 */}
              {step === 1 && (
                <Form>
                  <h4 className="mb-4 fw-bold">Sign up now</h4>

                  <Form.Group className="mb-3">
                    <Form.Control
                      type="text"
                      placeholder="Full Name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Control
                      type="email"
                      placeholder="Email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Control
                      type="password"
                      placeholder="Password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Control
                      type="password"
                      placeholder="Confirm Password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                    />
                  </Form.Group>

                  <Form.Check className="mb-3" label="I agree to the Terms and Privacy Policy" />

                  <Button variant="dark" className="w-100" onClick={handleNextStep}>
                    Sign Up
                  </Button>

                  <p className="text-center mt-3">
                    Already have an account? <a href="/Auth/Login">Login</a>
                  </p>
                </Form>
              )}

              {/* Step 2 */}
              {step === 2 && (
                <div>
                  <div className="d-flex align-items-center mb-3">
                    
                    <QrCode className="text-primary ms-2" />
                    <h5 className="ms-2">Scan QR Code</h5>
                  </div>
                  <p className="text-muted text-center mb-3">
                    Use the Authenticator App to scan and continue
                  </p>
                  <div className="border p-5 text-center mb-4 bg-light" style={{
                        backgroundImage: `url(/Images/signupscanner.png)`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                    }}></div>

                  {/* <Button variant="outline-secondary" className="w-100 mb-2" onClick={sendAuthCode}>
                    Can't Scan? Send Code
                  </Button> */}
                  <Button variant="outline-secondary" className="w-100 mb-2" onClick={goBack}>
                    Back
                  </Button>
                  <Button variant="dark" className="w-100" onClick={handleNextStep}>
                    Next
                  </Button>
                </div>
              )}

              {/* Step 3 */}
              {step === 3 && (
                <div>
                  <div className="d-flex align-items-center mb-3">
                    <Button variant="link" onClick={goBack}><ChevronLeft /></Button>
                    <Smartphone className="text-primary ms-2" />
                    <h5 className="ms-2">Verify Code</h5>
                  </div>
                  <p className="text-muted text-center mb-3">
                    Enter the 6-digit code sent to <strong>{formData.email}</strong>
                  </p>
                  <Form.Control
                    type="text"
                    name="authCode"
                    value={formData.authCode}
                    onChange={handleInputChange}
                    maxLength={6}
                    placeholder="123456"
                    className="text-center fs-4 mb-3"
                  />

                  {!isCodeSent ? (
                    <Button variant="primary" className="w-100 mb-2" onClick={sendAuthCode}>
                      <Mail className="me-2" /> Send Code
                    </Button>
                  ) : (
                    <Button variant="dark" className="w-100" onClick={handleNextStep}>
                      <Check className="me-2" /> Verify & Complete
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Col>
        </Row>
      </Container>
    </section>
  );
};

export default Signup;
