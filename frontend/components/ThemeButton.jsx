"use client";
import React ,{useState} from "react";
import { motion, scale } from "framer-motion";
import { useTheme } from "../src/ThemeContext";
import { FaSun,FaMoon } from "react-icons/fa6";


export default function ThemeButton (){
   const {theme, toggleTheme}= useTheme();
   const isDark = theme === "dark";

   return(
    <motion.button 
     onClick ={toggleTheme}
     className= "relative flex items-center w-[80px] h-[40px] rounded-2xl mr-5 mt-2 bg-indigo-600"
     whileTap={{scale:0.9}}
     >
    <motion.div
     layout
     transition={{type:"spring", visualDuration:0.2, bounce:0.2 }}
     className="w-[35px] h-[35px] bg-white dark:bg-yellow-400 rounded-full ml-0.5 flex items-center justify-content shadow-lg "
     animate={{x :isDark? 40:0  }}
     
      >
     {isDark?<FaMoon className="ml-2 h-[35px] text-gray-900" />: <FaSun className="ml-2 h-[35px] text-yellow-500"/>}
    </motion.div>
    
    </motion.button>
   )

}