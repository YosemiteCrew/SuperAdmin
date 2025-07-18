"use client";
import React, { useState, useEffect } from "react";
import { ChevronLeft, QrCode, Smartphone, Mail, Check , Eye, EyeOff} from "lucide-react";
import { useRouter } from "next/navigation";
import { Container, Row, Col, Button, Form } from "react-bootstrap";
import { toast } from "react-toastify";
import CustomToast from "../../Components/Toasts/CustomToast";
import CustomAlert from "../../Components/Alerts/CustomAlert";
import axios from "axios";



const Signup = () => {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    userType: "admin",
    email: "",
    password: "",
    confirmPassword: "",
    authCode: "",
    twofaCode: "",
    agreeTerms: false,
  });

  const [errors, setErrors] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    authCode: "",
    twofaCode: "",
    agreeTerms: "",
  });



  const [generatedCode, setGeneratedCode] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);

  const [secret, setSecret] = useState("");
  const [qrCode, setQrCode] = useState("");

  const router = useRouter();

  
  type FieldName = "email" | "password" | "confirmPassword" | "authCode" | "twofaCode" | "agreeTerms";

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, type, value, checked } = e.target;
    const fieldValue = type === "checkbox" ? checked : value;
    const fieldName = name as FieldName;

    setFormData({ ...formData, [fieldName]: fieldValue });

    if (errors[fieldName]) {
      setErrors({ ...errors, [fieldName]: "" });
    }
  };

  useEffect(() => {
    if (step === 3 && formData.email) {
      axios
        .get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/2fa/generate`, {
          params: { email: formData.email },
        })
        .then((res) => {
          setQrCode(res.data.qrCode);
          setSecret(res.data.base32);
        })
        .catch((err) => {
          console.error("QR generation error:", err);
          //toast.error("Failed to generate 2FA QR code");
          toast(
            <CustomToast
              title="Error!"
              message={"Failed to generate 2FA QR code"}
              type="error"
            />,
            { className: "toast-error" }
          );
        });
    }
  }, [step, formData.email]);

  const handleNextStep = async () => {
    
    const newErrors: any = {};
    if (step === 1) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/;

        if (!formData.email) {
          newErrors.email = "Email is required";
        } else if (!emailRegex.test(formData.email)) {
          newErrors.email = "Enter a valid email address";
        }

        if (!formData.password) {
          newErrors.password = "Password is required";
        } else if (!passwordRegex.test(formData.password)) {
          newErrors.password = "Password must be 8+ chars with upper, lower, and special character";
        }

        if (!formData.confirmPassword) {
          newErrors.confirmPassword = "Confirm Password is required";
        } else if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = "Passwords do not match";
        }

        if (!formData.agreeTerms) {
          newErrors.agreeTerms = "You must agree to the terms";
        }
      

     

      setErrors(newErrors);

      if (Object.keys(newErrors).length === 0) {
         try {
          const res = await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/user-detail`, {
            email: formData.email,
          });

          if (res.data.success) {
            setStep(2);
            sendAuthCode();
           
          } 
        } catch (error: any) {
          console.error("user-detail failed", error);
          //toast.error(error?.response?.data?.message || "Something went wrong with userdetail");
          toast(
            <CustomToast
              title="Error!"
              message={error?.response?.data?.message || "Something went wrong with userdetail"}
              type="error"
            />,
            { className: "toast-error" }
          );
          
        }
        
      }
    } else if (step === 2) {
      if (!formData.authCode) {
          newErrors.authCode = "Code is required";
        } else if (formData.authCode !== generatedCode) {
          newErrors.authCode = "Invalid code";
        }

        console.log("newErrors",newErrors);
        setErrors(newErrors);

        if (Object.keys(newErrors).length === 0) {

        
        try {
          const res = await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/signup`, {
            email: formData.email,
            password: formData.password,
            userType: formData.userType,
          });

          

          if (res.data.success) {
            //toast.success("Signup successful. Please set up 2FA.");
            toast(
              <CustomToast
                title="Success!"
                message="Signup successful. Please set up 2FA."
                type="success"
              />,
              { className: "toast-success" }
            );
            setStep(3);
           
          } else {
            setErrors((prev) => ({
              ...prev,
              twofaCode: res.data.message || "Invalid 2FA code",
            }));
          }
        } catch (error: any) {
          //console.error("Signup failed", error);
          //toast.error(error?.response?.data?.message || "Something went wrong with Signup");
          const apiError = error?.response?.data;

          if (apiError?.errors?.length > 0) {
            //toast.error(apiError.errors[0].message);
            toast(
              <CustomToast
                title="Error!"
                message={apiError.errors[0].message || "Something went wrong with userdetail"}
                type="error"
              />,
              { className: "toast-error" }
            );
          } else {
            //toast.error(apiError?.message || "Something went wrong with Signup");
            toast(
              <CustomToast
                title="Error!"
                message={apiError?.message || "Something went wrong with Signup"}
                type="error"
              />,
              { className: "toast-error" }
            );
          }
        }
        
      }

     
    } else if (step === 3) {
      setStep(4);
      // if (!formData.authCode) {
      //  setErrors(prev => ({
      //     ...prev,
      //     authCode: "Code is required"
      //   }));
      //   return;
      // }
      // if (formData.authCode === generatedCode) {
      //   alert("Account created!");
      //   localStorage.setItem("token", "mockToken123");
      //   router.push("/AdminDashboard");
      // } else {
      //   alert("Invalid code");
      // }
    } else if (step === 4) {
    if (!formData.twofaCode) {
      setErrors(prev => ({
        ...prev,
        twofaCode: "2FA Code is required"
      }));
      return;
    }

    try {
    const res = await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/2fa/verify`, {
      token: formData.twofaCode,
      secret: secret,
      email: formData.email,
    });

    if (res.data.success) {
      //toast.success("2FA Verified & Account Created");
      toast(
        <CustomToast
          title="Success!"
          message="2FA Verified & Account Created"
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
  } catch (error: any) {
    
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
  }
  };

  // const sendAuthCode = () => {
  //   const code = Math.floor(100000 + Math.random() * 900000).toString();
  //   setGeneratedCode(code);
  //   setIsCodeSent(true);
  //   alert(`Code sent to ${formData.email}: ${code}`);
  // };

    const sendAuthCode = async () => {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedCode(code);
      setIsCodeSent(true);

      try {
          

          const response = await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/send-email`, {
            toEmail: formData.email,
            code,
          });

          
          if (response.data.success) {
            //toast.success("Authentication code sent to your email.");
            toast(
              <CustomToast
                title="Success!"
                message="Authentication code sent to your email."
                type="success"
              />,
              { className: "toast-success" }
            );
          //alert("Authentication code sent to your email.");
          } else {
          //alert("Failed to send email.");
          //toast.error(response.data.message || "Failed to send email.");
          toast(
            <CustomToast
              title="Error!"
              message={response.data.message || "Failed to send email."}
              type="error"
            />,
            { className: "toast-error" }
          );
          }
      } catch (error: any) {
          console.error("Email error:", error);
          const message = error.response?.data?.message || "Something went wrong while sending the code.";
          //toast.warning(message);
          toast(
            <CustomToast
              title="Error!"
              message={message}
              type="error"
            />,
            { className: "toast-error" }
          );
      }
    };

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
                      type="email"
                      placeholder="Email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
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
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
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

                  <Form.Group className="mb-3">
                    <Form.Control
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm Password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      isInvalid={!!errors.confirmPassword}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.confirmPassword}
                    </Form.Control.Feedback>
                    {/* Eye Icon */}
                      <span onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </span>
                  </Form.Group>

                  <Form.Check
                    type="checkbox"
                    className="mb-3"
                    name="agreeTerms"
                    label="I agree to the Terms and Privacy Policy"
                    checked={formData.agreeTerms}
                    onChange={handleInputChange}
                    isInvalid={!!errors.agreeTerms}
                    feedback={errors.agreeTerms}
                    feedbackType="invalid"
                  />

                 

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
                    {/* <Button variant="link" onClick={goBack}><ChevronLeft /></Button> */}
                    <Smartphone className="text-primary ms-2" />
                    <h5 className="ms-2">Verify Code</h5>
                  </div>
                  <p className="text-muted text-center mb-3">
                    Enter the code we just sent to your email to proceed with verification.
                  </p>
                  <Form.Control
                    type="text"
                    name="authCode"
                    value={formData.authCode}
                    onChange={handleInputChange}
                    maxLength={6}
                    placeholder="Enter 6-digit code"
                    className="text-center fs-4 mb-3"
                    isInvalid={!!errors.authCode}
                  />
                  <Form.Control.Feedback type="invalid">
                      {errors.authCode}
                  </Form.Control.Feedback>

                  <Button variant="outline-secondary" className="w-100 mb-2" onClick={goBack}>
                    Back
                  </Button>

                   <Button variant="dark" className="w-100" onClick={handleNextStep}>
                      <Check className="me-2" /> Verify & Complete
                    </Button>

                  <Button variant="primary" className="w-100 mb-2" onClick={sendAuthCode}>
                      <Mail className="me-2" /> Resend Code
                  </Button>
                </div>
              )}

              {/* Step 3*/}
             {step === 3 && (
              <div>
                <div className="d-flex align-items-center mb-3">
                  <QrCode className="text-primary ms-2" />
                  <h5 className="ms-2">Scan QR Code</h5>
                </div>
                <p className="text-muted text-center mb-3">
                  Use your Authenticator App to scan and continue
                </p>

                {qrCode && <img src={qrCode} alt="QR Code" className="mb-4 w-100" />}

                

                <Button variant="outline-secondary" className="w-100 mb-2" onClick={goBack}>
                  Back
                </Button>
                <Button variant="dark" className="w-100" onClick={handleNextStep}>
                   Next
                </Button>

                
              </div>
            )}


              {/* Step 4 */}
              {step === 4 && (
                <div>
                  <div className="d-flex align-items-center mb-3">
                    {/* <Button variant="link" onClick={goBack}><ChevronLeft /></Button> */}
                    <Smartphone className="text-primary ms-2" />
                    <h5 className="ms-2">Verify Code</h5>
                  </div>
                  <p className="text-muted text-center mb-3">
                    Enter the code we just sent to your Authenticator App to proceed with your profile
                  </p>
                 <Form.Control
                  type="text"
                  name="twofaCode"
                  value={formData.twofaCode}
                  onChange={handleInputChange}
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  className="text-center fs-4 mb-3"
                  isInvalid={!!errors.twofaCode}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.twofaCode}
                </Form.Control.Feedback>

                <Button variant="dark" className="w-100" onClick={handleNextStep}>
                  Verify Code
                </Button>

                <Button variant="outline-secondary" className="w-100 mb-2" onClick={goBack}>
                  Back
                </Button>

                  {/* {!isCodeSent ? (
                    <Button variant="primary" className="w-100 mb-2" onClick={sendAuthCode}>
                      <Mail className="me-2" /> Send Code
                    </Button>
                  ) : (
                    <Button variant="dark" className="w-100" onClick={handleNextStep}>
                      <Check className="me-2" /> Verify Code
                    </Button>
                  )} */}
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
