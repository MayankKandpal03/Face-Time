import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext= createContext();

export const useTheme= () =>{
    return useContext(ThemeContext);
};

export const ThemeProvider=({children})=>{
const storedTheme = localStorage.getItem("theme");
const [isDarkMode, setIsDarkMode]=useState(
    storedTheme==="dark"? true : false
);

const toggleTheme=(()=>{
 setIsDarkMode((prevState)=>!prevState );
});
const theme = isDarkMode ? "dark": "light";

useEffect(()=>{
document.documentElement.setAttribute("data-theme",theme);
localStorage.setItem("theme", theme);
}, [theme]);



  
    return <ThemeContext.Provider value={{theme,toggleTheme}} >{children} </ThemeContext.Provider>
}                      