import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { FaVideo } from "react-icons/fa";
import { FiPlusCircle } from "react-icons/fi";
import { FaUser } from "react-icons/fa";
import { FaShield } from "react-icons/fa6";
import { FaCloud } from "react-icons/fa";
import { IoSettings } from "react-icons/io5";
import { useTheme } from "../ThemeContext";
import Themebutton from "../../components/ThemeButton"

const now = new Date();
const year = now.getFullYear();
const date = now.getDate();
const day = now.toLocaleString('en-US', { weekday: 'long' });
const hours = now.getHours();
const minutes = now.getMinutes();


export default function Home() {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState("");
  const [userName, setUserName] = useState("");
  const {theme, toggleTheme}= useTheme();

  const createRoom = () => {
    if (!userName.trim()) {
      alert("Please enter your name before starting a meeting!");
      return;
    }
    const roomId = uuidv4();
    navigate(`/room/${roomId}`, { state: { userName } });
  };

  const joinRoom = (e) => {
    e.preventDefault();
    if (!roomCode.trim() || !userName.trim()) {
      alert("Please enter both name and room ID!");
      return;
    }
    navigate(`/room/${roomCode.trim()}`, { state: { userName } });
  };
  
  
  
  
  return (
     <div  className="min-h-screen flex flex-col bg-white dark:bg-zinc-900 " style={{
       backgroundImage:
        theme==="dark"
        
     }} >
      <div className="flex-grow">
      {/* Top Strip */}
      <div className="top-strip bg-gray-200 dark:bg-zinc-600 py-2">
      <div className="flex  flex-cols-1">
        
          <div className="ml-[2%] text-xl text-blue-600">
         <img
          src="/images/logo-Photoroom.png"
          alt="logo"
          className="w-[30%] h-auto object-contain"
         />
          </div>
          <div className="flex justify-end py-6 w-full">
          <div className=" mr-[2%] text-xl text-black dark:text-white">{hours}:{minutes}  {day},{date}, {year} </div>
          <div className="mr-[2%]"> <IoSettings className="text-black dark:text-white"/>  </div>
          
          
          </div>
         <div className="theme-switch flex justify-end m-auto ">
        <Themebutton/>
         {/* <span className="mr-4  dark:text-white"> {theme==="dark" ? "Dark Mode" : "Light Mode" } </span>*/}
          </div> 
        
      </div>
        
      </div>
     
      <div>
      <div className="grid grid-cols-2 mt-10 ml-10 gap-[20%]">
        <div>
          
        <img
         src="/images/MAIN.png"
         alt="main"
         className="w-full rounded"
        />
        <div className="flex justify-center gap-10 mt-10">
        <div>
          <button
           onClick={createRoom}
           className="bg-[#516AED] hover:bg-[#2A3DAD] text-white px-6 py-2 w-full cursor-pointer rounded-lg font-medium mb-8 transition">
           <FaVideo /> New Meeting
          </button>
         
        </div>
         <div className=" " > 
          <button type="submit" className="bg-blue-600 text-white cursor-pointer px-6 py-2  rounded-lg hover:bg-blue-700 transition"> 
            Join With Code  <FiPlusCircle />

          </button> 
        </div>
        </div>
        <div className="text-blue-600 cursor-pointer text-center">
          Create a Room
        </div>
         </div>
       <div className="flex flex-col justify-end items-center ">
       <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        
      

        {/* Right Side - Text & Controls */}
        <div className="text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-bold  mb-4 dark:text-white">
            Seamless Video Chat for Everyone
          </h1>
          <p className="text-gray-600 mb-6 dark:text-white">
            Connect, share, and collaborate instantly
          </p>

          {/* Name Input */}
          <input
            type="text"
            placeholder="Enter your name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-full md:w-3/4 px-4 py-2 mb-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
          />

          {/* Join Room */}
          <form onSubmit={joinRoom} className="flex mb-4 w-full md:w-3/4">
            <input
              type="text"
              placeholder="Enter Meeting Code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              className="flex-1 px-4 py-2 border rounded-l-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white cursor-pointer px-4 py-2 rounded-r-lg hover:bg-blue-700 transition dark:text-white"
            >
              Join
            </button>
          </form>

          {/* New Meeting Button 
          <button
            onClick={createRoom}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-2  cursor-pointer  rounded-lg font-medium mb-8 transition"
          >
            New Meeting
          </button>*/}

          {/* Feature icons */}
          <div className="flex flex-wrap justify-center md:justify-start gap-4 text-gray-500 text-sm">
            <div className="flex items-center space-x-1">
              <span><FaUser /></span>
              <span>Easy to Use</span>
            </div>
            <div className="flex items-center space-x-1">
              <span><FaShield /></span>
              <span>Secure & Private</span>
            </div>
            <div className="flex items-center space-x-1">
              <span><FaCloud /></span>
              <span>Cloud Based</span>
            </div>
          </div>
          </div>
         </div>

       </div>
     
      </div>
      </div>
      <footer className="flex bg-gray-200 justify-end dark:bg-zinc-600  py-6 mt-70 gap-4">
            <div className="text-blue-600 dark:text-white">About Us</div> 
            <div className="text-blue-600 dark:text-white ">Help</div> 
            <div className="text-blue-600  dark:text-white">Term </div> 
            <div className="text-blue-600 dark:text-white mr-[2%] ">Privacy </div> 
            
      </footer>
      </div>
    </div>
  );
}
