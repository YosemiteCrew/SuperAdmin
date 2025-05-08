import { Route, Routes } from "react-router-dom";
import AdminDashboard from "./Pages/AdminDashboard/page";
import SignIn from "./Pages/SignIn/page";
import AdminProfile from "./Pages/AdminProfile/AdminProfile";
import SettingProfile from "./Pages/AdminProfile/SettingProfile";
import AddAssessment from "./Pages/Assessment/AddAssessment";
import AssessmentPage from "./Pages/Assessment/AssessmentPage";
import ProtectedRoute from './Components/ProtectedRoute';

function App() {


  return (
    <>
      <div className="App">
        <Routes>
          <Route path="/signin" element={<SignIn />} />
          <Route path="/assessment" element={<AssessmentPage/>} />
          <Route path="/addassessment" element={<AddAssessment/>} />
          <Route  path="/" element={ <ProtectedRoute> <AdminDashboard />  </ProtectedRoute>  }  />
          <Route path="/profile" element={  <ProtectedRoute> <AdminProfile /> </ProtectedRoute> } />
          <Route path="/settingprofile" element={  <ProtectedRoute> <SettingProfile /> </ProtectedRoute> } />
        
        </Routes>
      </div>

    </>
  )
}

export default App
