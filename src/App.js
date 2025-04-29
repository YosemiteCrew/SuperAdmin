import { Route, Routes } from "react-router-dom";
import AdminDashboard from "./Pages/AdminDashboard/page";
import SignIn from "./Pages/SignIn/page";
import ProfileDetails from "./Pages/ProfileDetails/page";



function App() {
  return (
    <div className="App">

      <Routes>
        <Route path="/" element={<AdminDashboard />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/profile" element={<ProfileDetails />} />
      </Routes>

     
      
    </div>
  );
}

export default App;
