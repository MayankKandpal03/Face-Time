import { motion } from "framer-motion";
import { useTheme } from "../ThemeContext";
import { useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [isRegisterMode, setIsRegisterMode]=useState(false);
  const [formData, setFormData] =useState({
   name:"",
   email:"",
   password:""

  });
  function handleChange(e) {
  const { name, value } = e.target;
  setFormData(prev => ({ ...prev, [name]: value }));
}
const handleSubmit = async () => {
  try {
    // client-side validation
    if (isRegisterMode) {
      if (!formData.name?.trim() || !formData.email?.trim() || !formData.password?.trim()) {
        toast.warning("Please fill name, email and password to register.");
        return;
      }
    } else {
      if (!formData.email?.trim() || !formData.password?.trim()) {
        toast.warning("Please enter email and password to login.");
        return;
      }
    }

    const url = isRegisterMode
      ? "http://localhost:5000/api/user/register"
      : "http://localhost:5000/api/user/login";

    const payload = isRegisterMode ? formData : { email: formData.email.trim(), password: formData.password };

    console.log("Auth payload ->", payload);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data?.message || (isRegisterMode ? "Register failed" : "Login failed");
      toast.error(msg);
      console.error("Auth failure", res.status, data);
      return;
    }

    // Save token and redirect
    localStorage.setItem("token", data.token);
    toast.success(isRegisterMode ? "Registered" : "Logged in");
    navigate("/");
  } catch (err) {
    console.error("Auth error:", err);
    toast.error("Something went wrong");
  }
};

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };


  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className={ `min-h-screen flex items-center justify-center p-4 transition-all duration-300 
        ${theme === "dark"
            ? "bg-gradient-to-br from-gray-900 to-gray-800"
            : "bg-gradient-to-br from-blue-50 to-zinc-100"}`}
    >
      
      <motion.div
        className="absolute inset-0 -z-10"
        animate={{
          opacity:theme==="dark"? 0.12:0.3,
          background: [
            "radial-gradient(circle at 20% 20%, rgba(99,102,241,0.3), transparent 60%)",
            "radial-gradient(circle at 80% 30%, rgba(79,70,229,0.3), transparent 60%)",
            "radial-gradient(circle at 50% 80%, rgba(63,131,248,0.3), transparent 60%)",
          ],
        }}
        transition={{ duration: 8, repeat: Infinity, repeatType: "mirror" }}
      />

      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className={     `w-full max-w-md backdrop-blur-xl shadow-xl rounded-2xl p-8 transition-all 
           ${theme === "dark" ? "bg-gray-800/80 text-white" : "bg-white/80 text-black"}`}
      >
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          <motion.h1
            variants={item}
            className="text-3xl font-bold text-center text-gray-800 dark:text-white"
          >
            {isRegisterMode?"Register":"Login"}
          </motion.h1>

          {/* Name Field */}
          <motion.div variants={item} className="flex flex-col">
            <label className="text-gray-700 font-medium mb-1 dark:text-white">Name</label>
            <motion.input
              whileFocus={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 200 }}
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your name"
              className="px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-400 outline-none"
            />
          </motion.div>

          {/* Email Field */}
          <motion.div variants={item} className="flex flex-col">
            <label className="text-gray-700 font-medium mb-1 dark:text-white">Email</label>
            <motion.input
              whileFocus={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 200 }}
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              className="px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-400 outline-none"
            />
          </motion.div>

          {/* Password Field */}
          <motion.div variants={item} className="flex flex-col">
            <label className="text-gray-700 font-medium mb-1 dark:text-white ">Password</label>
            <motion.input
              whileFocus={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 200 }}
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              className="px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-400 outline-none"
            />
          </motion.div>
          <motion.div 
          onClick={() => setIsRegisterMode(!isRegisterMode)}

          className="text-center mt-3 text-blue-600">
            {isRegisterMode? "Already have an account? Login" :"Don't have an account? Register"}
            
          </motion.div>
          {/* Login Button */}
          <motion.button
            variants={item}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.99}}
            transition={{ type: "spring", stiffness: 200 }}
            onClick={handleSubmit}
            
            className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold shadow-md hover:bg-indigo-700 cursor-pointer"
          >
           {isRegisterMode?"Register": "Login"}
          </motion.button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
