import { motion } from "framer-motion";
import { useTheme } from "../ThemeContext";

export default function Login() {
    const { theme } = useTheme();
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
            Login
          </motion.h1>

          {/* Name Field */}
          <motion.div variants={item} className="flex flex-col">
            <label className="text-gray-700 font-medium mb-1 dark:text-white">Name</label>
            <motion.input
              whileFocus={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 200 }}
              type="text"
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
              placeholder="Enter your password"
              className="px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-400 outline-none"
            />
          </motion.div>

          {/* Login Button */}
          <motion.button
            variants={item}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold shadow-md hover:bg-indigo-700 cursor-pointer"
          >
            Login
          </motion.button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
