import { BrowserRouter , Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import { ThemeProvider, useTheme } from "./ThemeContext";
import Meeting from "./pages/Meeting";
import Login from "./pages/Login";
import "./index.css";
import { Slide, ToastContainer } from "react-toastify";

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent() {
  const { theme } = useTheme();

  return (
    <BrowserRouter>
      <ToastContainer
        position="top-center"
        autoClose={2000}
        pauseOnHover={false}
        transition={Slide}
        theme={theme}   
      />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/test" element={<Meeting />} />
        <Route path="/user/login" element={<Login />} />
        <Route path="/user/register" element={<Login />} />
        <Route path="/meeting" element={<Meeting />} />
        
      </Routes>
    </BrowserRouter>
  );
}
