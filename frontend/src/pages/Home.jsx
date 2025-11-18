import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { motion } from "framer-motion";
import { FaVideo } from "react-icons/fa";
import { FiPlusCircle } from "react-icons/fi";
import { FaUser } from "react-icons/fa";
import { FaShield } from "react-icons/fa6";
import { FaCloud } from "react-icons/fa";
import { IoSettings } from "react-icons/io5";
import { useTheme } from "../ThemeContext";
import Themebutton from "../../components/ThemeButton";
import { toast } from "react-toastify";

const now = new Date();
const year = now.getFullYear();
const date = now.getDate();
const day = now.toLocaleString('en-US', { weekday: 'long' });
const hours = now.getHours();
const minutes = now.getMinutes();

export default function Home() {
  
  const [roomCode, setRoomCode] = useState("");
  const [userName, setUserName] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const createRoom = () => {
    if (!userName.trim()) {
      toast.warning("Please enter your name before starting a meeting!");
      return;
    }
    const meetingId = uuidv4();
    navigate(`/room/${meetingId}`, { state: { userName } });
  };

  const joinRoom = (e) => {
    e.preventDefault();
    if (!roomCode.trim() || !userName.trim()) {
      toast.warning("Please enter both name and room ID!", {
        className: theme=== "dark"? "bg-gray-900 text-white" : "bg-white text-black",
      });
      return;
    }
    
    navigate(`/join/${roomCode.trim()}`, { state: { userName } });
  };
  useEffect(()=>{
    const token = localStorage.getItem("token");
    if(!token) return;

    fetch("http://localhost:5000/api/user/profile",{
      method:"GET",
      headers:{ "Authorization":`Bearer ${token}` }
    
    })   .then(async (res) => {
      if (!res.ok) {
        // token invalid/expired — clean up and remain logged out
        localStorage.removeItem("token");
        setIsLoggedIn(false);
        setUserName("");
        return;
      }
      const data = await res.json();
      if (data.user && data.user.name) {
        setUserName(data.user.name);
        setIsLoggedIn(true);
      }
    })
    .catch((err) => {
      console.error("Profile fetch error:", err);
      localStorage.removeItem("token");
      setIsLoggedIn(false);
      setUserName("");
    });
  }, [])
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen flex flex-col bg-white dark:bg-zinc-900"
    >
      <div className="flex-grow">

        {/* TOP BAR SLIDE DOWN */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="top-strip bg-gray-200 dark:bg-zinc-600 py-2"
        >
          <div className="flex flex-cols-1">

            <div className="ml-[2%] text-xl text-blue-600">
              <motion.img
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6 }}
                src="/images/logo-Photoroom.png"
                alt="logo"
                className="w-[30%] h-auto object-contain"
              />
            </div>

            <div className="flex justify-end gap-2 py-6 w-full">
              <div className="text-xl dark:text-white"><Link to="/user/login"> Sign In </Link></div>
              <div className="text-xl dark:text-white"><Link to="/meeting"> Meeting </Link></div>
              <div className="mr-[2%] text-xl text-black dark:text-white">{hours}:{minutes} {day},{date}, {year}</div>
              <div className="mr-[2%]"> <IoSettings className="text-black cursor-pointer text-2xl dark:text-white" />  </div>
            </div>

            {/* THEME BUTTON FADE */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="theme-switch flex justify-end m-auto"
            >
              <Themebutton />
            </motion.div>
          </div>
        </motion.div>

        {/* MAIN BODY */}
        <div>
          <div className="grid grid-cols-2 mt-10 ml-10 gap-[20%]">

            {/* LEFT IMAGE + BUTTONS */}
            <motion.div
              initial={{ x: -40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            >
              <img
                src="/images/MAIN.png"
                alt="main"
                className="w-full rounded"
              />

              <div className="flex justify-center gap-10 mt-10 ">
                <div className="tracking-tighter">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={createRoom}
                  className="bg-[#516AED] hover:bg-[#2A3DAD] text-white flex items-center gap-2 px-6 py-2 w-full cursor-pointer rounded-lg font-medium mb-8 transition"
                >
                  <FaVideo  className="text-xl "/> New Meeting
                </motion.button>
                </div>
                <div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-blue-600 text-white text-tighter cursor-pointer flex items-center gap-2 px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Join With Code <FiPlusCircle />
                </motion.button>
                </div>
              </div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                className="text-blue-600 cursor-pointer text-center"
                
              >
                
                Create a Room
              </motion.div>
            </motion.div>

            {/* RIGHT SIDE CONTENT */}
            <motion.div
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.7 }}
              className="flex flex-col justify-end items-center"
            >
              <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-10 items-center">

                <div className="text-center md:text-left">

                  {/* HEADING STAGGER ANIMATION */}
                  <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="text-3xl md:text-4xl font-bold mb-4 dark:text-white"
                  >
                    Seamless Video Chat for Everyone
                  </motion.h1>

                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                    className="text-gray-600 mb-6 dark:text-white"
                  >
                    Connect, share, and collaborate instantly
                  </motion.p>

                  {/* NAME INPUT */}
                  <motion.input
                    whileFocus={{ scale: 1.02 }}
                    type="text"
                    placeholder={!isLoggedIn?"Enter your name":""}
                    value={isLoggedIn?`Hi , ${userName}`:userName}
                    readOnly={isLoggedIn}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full md:w-3/4 px-4 py-2 mb-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                  />

                  {/* JOIN ROOM FORM */}
                  <motion.form
                    onSubmit={joinRoom}
                    className="flex mb-4 w-full md:w-3/4"
                  >
                    <motion.input
                      whileFocus={{ scale: 1.02 }}
                      type="text"
                      placeholder="Enter Meeting Code"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value)}
                      className="flex-1 px-4 py-2 border rounded-l-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="submit"
                      className="bg-blue-600 text-white cursor-pointer px-4 py-2 rounded-r-lg hover:bg-blue-700 transition dark:text-white"
                    >
                      Join
                    </motion.button>
                  </motion.form>

                  {/* FEATURES */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="flex flex-wrap justify-center md:justify-start gap-4 text-gray-500 text-sm"
                  >
                    <div className="flex items-center space-x-1">
                      <FaUser /> <span>Easy to Use</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <FaShield /> <span>Secure & Private</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <FaCloud /> <span>Cloud Based</span>
                    </div>
                  </motion.div>

                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* FOOTER FADE UP */}
      <motion.footer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="flex bg-gray-200 justify-end dark:bg-zinc-600 py-6 mt-70 gap-4"
      >
        <div className="text-blue-600 dark:text-white">About Us</div>
        <div className="text-blue-600 dark:text-white">Help</div>
        <div className="text-blue-600 dark:text-white">Term</div>
        <div className="text-blue-600 dark:text-white mr-[2%]">Privacy</div>
      </motion.footer>
    </motion.div>
  );
}
