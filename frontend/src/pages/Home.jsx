import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { motion, AnimatePresence } from "framer-motion";
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
  const [loadingProfile, setLoadingProfile] = React.useState(true);
  const [joinModalOpen, setJoinModalOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = React.useRef(null);
  const [joinCode, setJoinCode] = React.useState("");
  const [toast, setToast] = React.useState(null);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  
  function showToast(message, type = "info", timeout = 3500) {
  setToast({ message, type });
  setTimeout(() => setToast(null), timeout);
}

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

  const id = roomCode?.trim();
  if (!id) {
    toast.warning("Please enter a room ID!", {
      className: theme === "dark" ? "bg-gray-900 text-white" : "bg-white text-black",
    });
    return;
  }

  // optional: pass userName as state so Meeting can read it
  navigate(`/meeting?room=${encodeURIComponent(id)}`, { state: { userName } });
};

   // --- BEGIN: Handlers (paste inside component) ---

// A: Start New Meeting (requires login)
async function handleNewMeeting() {
  if (!isLoggedIn) {
    showToast("Please login to create a new meeting", "error");
    return;
  }
  try {
    const token = localStorage.getItem("token");
    const res = await fetch("http://localhost:5000/api/meeting/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: userName || "Host" }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Create failed");
    const meetingId = data.meeting?._id || data.meeting?.id || data.meetingId || data.id;
    if (!meetingId) throw new Error("Invalid meeting id from server");
    // navigate — assume you already have navigate hook or change to your navigation logic
    // if you use react-router v6 with useNavigate:
    navigate(`/meeting?room=${meetingId}`);
  } catch (err) {
    console.error(err);
    showToast(err.message || "Failed to create meeting", "error");
  }
}

// B: Open join-with-code modal
function openJoinModal() {
  setJoinModalOpen(true);
  setJoinCode("");
}

// Validate and join by code
async function handleJoinWithCode(e) {
  if (e && e.preventDefault) e.preventDefault();

  const id = joinCode?.trim();
  if (!id) {
    showToast("Please enter a meeting code", "error");
    return;
  }

  try {
    // optional: validate the room exists before navigating
    const res = await fetch(`http://localhost:5000/api/meeting/${encodeURIComponent(id)}`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || "Meeting not found");
    }

    setJoinModalOpen(false);
    navigate(`/meeting?room=${encodeURIComponent(id)}`, { state: { userName } });
  } catch (err) {
    console.error("Join with code error:", err);
    showToast(err.message || "Meeting not found", "error");
  }
}


// C: Create Room explicit (same as New Meeting) — toast if not logged in
async function handleCreateRoom() {
  if (!isLoggedIn) {
    showToast("You must be logged in to create rooms", "error");
    return;
  }
  await handleNewMeeting();
}
//settings
React.useEffect(() => {
  function handleOutsideClick(e) {
    if (settingsRef.current && !settingsRef.current.contains(e.target)) {
      setSettingsOpen(false);
    }
  }
  document.addEventListener("mousedown", handleOutsideClick);
  return () => document.removeEventListener("mousedown", handleOutsideClick);
}, []);
// --- END: Handlers ---
  
  React.useEffect(() => {
  const token = localStorage.getItem("token");
  if (!token) {
    setIsLoggedIn(false);
    setLoadingProfile(false);
    return;
  }
    fetch("http://localhost:5000/api/user/profile",{
      method:"GET",
      headers:{ "Authorization":`Bearer ${token}` }
    
    })   .then(async (res) => {
      if (!res.ok) {
        // token invalid/expired — clean up and remain logged out
        localStorage.removeItem("token");
        setIsLoggedIn(false);
        setUserName("");
        setLoadingProfile(false);
        return;
      }
      const data = await res.json();
      if (data.user && data.user.name) {
        setUserName(data.user.name);
        setIsLoggedIn(true);
        setLoadingProfile(false);
      }
    })
    .catch((err) => {
      console.error("Profile fetch error:", err);
      localStorage.removeItem("token");
      setIsLoggedIn(false);
      setUserName("");
      setLoadingProfile(false);
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
             
              <div className="text-xl dark:text-white"><Link to="/meeting"> Meeting </Link></div>
              <div className="mr-[2%] text-xl text-black dark:text-white">{hours}:{minutes} {day},{date}, {year}</div>
              {/* Settings icon + dropdown */}
<div className="mr-[2%] relative" ref={settingsRef}>
  <button
    onClick={() => setSettingsOpen((s) => !s)}
    aria-haspopup="true"
    aria-expanded={settingsOpen}
    className="focus:outline-none"
    title="Settings"
  >
    <IoSettings className="text-black cursor-pointer text-2xl dark:text-white" />
  </button>

  {settingsOpen && (
    <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-zinc-800 text-black dark:text-white rounded shadow-lg z-50">
      <nav className="flex flex-col">
        <Link
          to="/user/register"
          className="px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-700"
          onClick={() => setSettingsOpen(false)}
        >
          Sign Up
        </Link>
        <Link
          to="/user/login"
          className="px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-700"
          onClick={() => setSettingsOpen(false)}
        >
          Login
        </Link>
      </nav>
    </div>
  )}
</div>

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
                  onClick={handleNewMeeting}
                  className="bg-[#516AED] hover:bg-[#2A3DAD] text-white flex items-center gap-2 px-6 py-2 w-full cursor-pointer rounded-lg font-medium mb-8 transition"
                >
                    <Link to="/meeting" className="flex items-center gap-2"> <FaVideo  className="text-xl "/> New Meeting </Link>
                </motion.button>
                </div>
                <div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={openJoinModal}
                  className="bg-blue-600 text-white text-tighter cursor-pointer flex items-center gap-2 px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Join With Code <FiPlusCircle />
                </motion.button>
                </div>
              </div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                className="text-blue-600 cursor-pointer text-center"
                onClick={handleCreateRoom}
                
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
                      onClick={handleNewMeeting}
                      className="bg-blue-600 text-white cursor-pointer px-4 py-2 rounded-r-lg hover:bg-blue-700 transition dark:text-white "
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
            {/* --- JOIN CODE MODAL (added) --- */}
      <AnimatePresence>
        {joinModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          >
            <motion.div initial={{ y: 20 }} animate={{ y: 0 }} exit={{ y: 20 }} className="bg-white dark:bg-slate-800 rounded p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-3 dark:text-white">Enter Meeting Code</h3>
              <form onSubmit={handleJoinWithCode}>
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Enter meeting id or code "
                  className="w-full px-3 py-2 rounded mb-3 dark:text-white"
                />
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setJoinModalOpen(false)} className="px-3 py-2 border rounded cursor-pointer dark:text-white">
                    Cancel
                  </button>
                  <button type="submit" onClick={handleNewMeeting} className="px-3 py-2 cursor-pointer bg-indigo-600 text-white rounded">
                    Join
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- TOAST (added) --- */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`fixed bottom-6 right-6 z-50 max-w-sm p-3 rounded shadow-lg ${toast.type === "error" ? "bg-red-600 text-white" : "bg-slate-800 text-white"}`}
            onClick={() => setToast(null)}
          >
            <div className="text-sm">{toast.message}</div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
