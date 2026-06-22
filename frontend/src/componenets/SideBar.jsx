import useLayoutStore from "../store/layoutStore";
import useThemeStore from "../store/themeStore";
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import userUserStore from "../store/useruserStore";
import { FaWhatsapp, FaCircleNotch, FaUser, FaCog } from "react-icons/fa";
import { Link } from 'react-router-dom'
import { motion } from "framer-motion";

const SideBar = () => {
    const location = useLocation();
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const { theme, setTheme } = useThemeStore();
    const { user } = userUserStore();
    const { activeTab, setActiveTab, selectedContact } = useLayoutStore();

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        if (location.pathname === "/homePage/") {
            setActiveTab("chats")
        }

        else if (location.pathname === "/status") {
            setActiveTab("status")
        }

        else if (location.pathname === '/userDetail') {
            setActiveTab("userDetail")
        }

        else if (location.pathname === '/setting') {
            setActiveTab("setting")
        }

    }, [location, setActiveTab])


    if (isMobile && selectedContact) {
        return null;
    }


    const SideBarContenet = (
        <>
            <Link
                to="/homePage"
                className={`${isMobile ? " " : "mb-4"}  ${activeTab === 'chats' && "bg-gray-300 shadow-sm p-2 rounded-full"}`}
            >
                <FaWhatsapp
                    className={`h-6 w-6 ${activeTab === 'chats' ? (theme === "dark" ? "text-gray-800" : "") : (theme === 'dark' ? "text-gray-300" : "text-gray-800")} focus:outline-none`} />
            </Link>

            <Link
                to="/status"
                className={`${isMobile ? " " : "mt-10"}  ${activeTab === 'status' && "bg-gray-300 shadow-sm p-2 rounded-full"}`}
            >
                <FaCircleNotch
                    className={`h-6 w-6 ${activeTab === 'status' ? (theme === "dark" ? "text-gray-800" : "") : (theme === 'dark' ? "text-gray-300" : "text-gray-800")} focus:outline-none`} />
            </Link>

            <Link
                to="/userDetail"
                className={`${isMobile ? " " : "mb-4"}  ${activeTab === 'userDetail' && "bg-gray-300 shadow-sm p-2 rounded-full"}`}
            >
                <FaUser
                    className={`h-6 w-6 ${activeTab === 'userDetail' ? (theme === "dark" ? "text-gray-800" : "") : (theme === 'dark' ? "text-gray-300" : "text-gray-800")} focus:outline-none`} />
            </Link>

            <Link
                to="/setting"
                className={`${isMobile ? " " : "mb-4"}  ${activeTab === 'setting' && "bg-gray-300 shadow-sm p-2 rounded-full"}`}
            >
                <FaCog
                    className={`h-6 w-6 ${activeTab === 'setting' ? (theme === "dark" ? "text-gray-800" : "") : (theme === 'dark' ? "text-gray-300" : "text-gray-800")} focus:outline-none`} />
            </Link>
        </>
    )
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            // className="flex flex-col bg-gradient-to-b from-emerald-200 to-emerald-100 shadow-lg border-r border-gray-200/50 p-4"
            className={`${isMobile ? "fixed bottom-0 left-0 right-0 h-16 z-50" : "w-16 h-screen border-r-2"}
            ${theme === "dark" ? "bg-[rbg(239,242,254)]" : "border-gray-300"}
            bg-opacity-90 flex items-center py-4 shadow-lg 
            ${isMobile ? " flex-row justify-around" : "flex-col justify-between"}
            `}
        >
            {SideBarContenet}
        </motion.div>
    )
}
export default SideBar;