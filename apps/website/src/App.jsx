import { Route, Routes } from "react-router-dom";
import AdminDashboard from "./Pages/AdminDashboard/page";
import SignIn from "./Pages/SignIn/page";
import AdminProfile from "./Pages/AdminProfile/AdminProfile";
import SettingProfile from "./Pages/AdminProfile/SettingProfile";
import AddAssessment from "./Pages/Assessment/AddAssessment";
import AssessmentPage from "./Pages/Assessment/AssessmentPage";

function App() {


  return (
    <>
      <div className="App">
        <Routes>
          <Route path="/" element={<AdminDashboard />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/Adminprofile" element={<AdminProfile/>} />
          <Route path="/settingprofile" element={<SettingProfile/>} />
          <Route path="/assessment" element={<AssessmentPage/>} />
          <Route path="/addassessment" element={<AddAssessment/>} />
        </Routes>
      </div>

    </>
  )
}

export default App
