"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import CustomToast from "../../Components/Toasts/CustomToast";
import { MailCheck, Lock, Check, ShieldCheck, ChevronLeft, Eye, EyeOff } from "lucide-react";
import { Container, Row, Col, Button, Form } from "react-bootstrap";

import axios from "axios";

export default function Login() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twofaCode, setTwofaCode] = useState("");
  const [secret, setSecret] = useState(""); 
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState({
    email: "",
    password: "",
    twofaCode: "",
  });

  const handleLogin = async () => {
    const newErrors: any = {};
    if (!email) newErrors.email = "Email is required";
    if (!password) newErrors.password = "Password is required";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    // Simulated backend fetch (replace with real logic to get stored 2FA secret)
    //const response = await fetch(`/api/2fa/generate?email=${encodeURIComponent(email)}`);
    //const data = await response.json();
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/signin`, {
        email: email,
        password: password,
      });

      if (res.data.success) {
        setSecret(res.data.twoFASecret);
        setStep(2);

        
      } 

    } catch (error) {
      const apiError = error?.response?.data;
      
          if (apiError?.errors?.length > 0) {
            //toast.error(apiError.errors[0].message);
            toast(
              <CustomToast
                title="Error!"
                message={apiError.errors[0].message}
                type="error"
              />,
              { className: "toast-error" }
            );
          } else {
            //toast.error(apiError?.message || "Something went wrong with 2FA verification");
            toast(
              <CustomToast
                title="Error!"
                message={apiError?.message || "Something went wrong with 2FA verification"}
                type="error"
              />,
              { className: "toast-error" }
            );
          }
    }

    // if (data && data.base32) {
    //   setSecret(data.base32);
    //   setStep(2);
    //   toast.info("Enter the 2FA code from your Authenticator App.");
    // } else {
    //   toast.error("Invalid login or failed to fetch 2FA secret.");
    // }
  };

  const handleVerify2FA = async () => {
    if (!twofaCode) {
      setErrors(prev => ({ ...prev, twofaCode: "2FA code is required" }));
      return;
    }

  

     try {
    //   const res = await fetch("/api/2fa/verify", {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({ token: twofaCode, secret }),
    //   });

    //   const data = await res.json();

    //   if (data.success) {
    //     localStorage.setItem("token", "mockToken123");
    //     toast.success("Login successful!");
    //     router.push("/AdminDashboard");
    //   } else {
    //     //toast.error("Invalid 2FA code.");
    //     setErrors(prev => ({ ...prev, twofaCode: "Invalid 2FA code." }));
    //     return;
    //   }

      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/2fa/verify`, {
        token: twofaCode,
        secret: secret,
        email: email,
      });

      if (res.data.success) {
        //toast.success("2FA Verified");
        toast(
          <CustomToast
            title="Success!"
            message="2FA Verified."
            type="success"
          />,
          { className: "toast-success" }
        );
        localStorage.setItem("token", res.data.tokenjwt);
        router.push("/AdminDashboard");
      } else {
        setErrors((prev) => ({
          ...prev,
          twofaCode: res.data.message || "Invalid 2FA code",
        }));
      }

    } catch (err) {
      //toast.error("2FA verification failed.");
      toast(
              <CustomToast
                title="Error!"
                message={"2FA verification failed."}
                type="error"
              />,
              { className: "toast-error" }
            );
    }
  };

  const goBack = () => {
    setStep(1);
    setTwofaCode("");
    setErrors({ email: "", password: "", twofaCode: "" });
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

          {/* Right Login Form */}
          <Col md={6} className="d-flex align-items-center justify-content-center">
            <div className="auth-box p-5 shadow-lg w-100" style={{ maxWidth: "450px" }}>
              

              {/* Step 1: Email + Password */}
              {step === 1 && (
                
                <Form>
                  <h4 className="mb-4 fw-bold">Log In now </h4>
                  <Form.Group className="mb-3">
                    <Form.Control
                      type="email"
                      placeholder="Email"
                      value={email}
                      
                      onChange={(e) => {
                        setEmail(e.target.value);

                        // Clear error on change
                        if (errors.email) {
                          setErrors((prev) => ({
                            ...prev,
                            email: "",
                          }));
                        }
                      }}
                      isInvalid={!!errors.email}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.email}
                    </Form.Control.Feedback>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Control
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={password}
                      
                      onChange={(e) => {
                        setPassword(e.target.value);

                        // Clear error on change
                        if (errors.password) {
                          setErrors((prev) => ({
                            ...prev,
                            password: "",
                          }));
                        }
                      }}
                      isInvalid={!!errors.password}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.password}
                    </Form.Control.Feedback>
                    {/* Eye Icon */}
                    <span onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </span>
                  </Form.Group>

                   <div className="text-end mb-4">
                    <a href="/Auth/ForgotPassword" className="text-decoration-none">
                      Forgot Password?
                    </a>
                  </div>

                  <Button variant="dark" className="w-100" onClick={handleLogin}>
                    <Check className="me-2" /> Log In
                  </Button>

                  <p className="text-center mt-3">
                    Don't have an account? <a href="/Auth/Signup">Sign up</a>
                  </p>
                </Form>
              )}

              {/* Step 2: 2FA Code */}
              {step === 2 && (
                <Form>
                  <div className="d-flex align-items-center mb-3">
                    {/* <Button variant="link" onClick={goBack}><ChevronLeft /></Button> */}
                    
                    <h5 className="ms-2">Verify Code</h5>
                  </div>
                  <p className="text-muted text-center mb-3">
                    Enter the code we just sent to your Authenticator App to proceed with your profile
                  </p>

                  

                  <Form.Control
                    type="text"
                    maxLength={6}
                    className="text-center fs-4 mb-3"
                    placeholder="123456"
                    value={twofaCode}
                    onChange={(e) => {
                      setTwofaCode(e.target.value);

                      // Clear error on change
                      if (errors.twofaCode) {
                        setErrors((prev) => ({
                          ...prev,
                          twofaCode: "",
                        }));
                      }
                    }}
                    isInvalid={!!errors.twofaCode}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.twofaCode}
                  </Form.Control.Feedback>

                  <Button variant="dark" className="w-100" onClick={handleVerify2FA}>
                    <Lock className="me-2" /> Verify & Login
                  </Button>

                  <Button
                    variant="outline-secondary"
                    className="w-100 mt-2"
                    onClick={goBack}
                  >
                    <ChevronLeft className="me-2" />
                    Back
                  </Button>
                </Form>
              )}
            </div>
          </Col>
        </Row>
      </Container>
    </section>
  );
}
