import { Route, Routes } from "react-router-dom";
import AdminDashboard from "./Pages/AdminDashboard/page";
import SignIn from "./Pages/SignIn/page";
import AdminProfile from "./Pages/AdminProfile/AdminProfile";
import SettingProfile from "./Pages/AdminProfile/SettingProfile";
import ProtectedRoute from './Components/ProtectedRoute';
import NotFound from './Pages/NotFound'; 


function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/login" element={<SignIn />} />
        {/* Protect the Dashboard route */}
         <Route  path="/" element={ <ProtectedRoute> <AdminDashboard />  </ProtectedRoute>  }  />
         <Route path="/profile" element={  <ProtectedRoute> <AdminProfile /> </ProtectedRoute> } />
         <Route path="/settingprofile" element={  <ProtectedRoute> <SettingProfile /> </ProtectedRoute> } />

          {/* Catch-all route for Page Not Found (404) */}
          <Route path="*" element={<NotFound />} /> 

        {/* You can add more protected routes here */}
      </Routes>
    </div>
  );
}

export default App;
