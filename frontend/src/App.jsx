import { BrowserRouter , Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import { ThemeProvider } from "./ThemeContext";
import Test from "./pages/Test";
import "./index.css";
//import Room from "./pages/Room";

export default function App() {
  return (
    <ThemeProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/test" element={<Test />} />
        {/* <Route path="/room/:roomId" element={<Room />} />*/}
      </Routes>
    </BrowserRouter>
    </ThemeProvider>
  );
}
