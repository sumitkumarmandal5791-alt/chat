import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaLock } from 'react-icons/fa';
import useThemeStore from '../store/themeStore';
import useLayoutStore from '../store/layoutStore';
import Layout from './Layout';
import ChatList from "../page/chatSection/chatList"
import { getAllUsers } from '../services/user.services';

const HomePage = () => {
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';
    //10t selectedContact = useLayoutStore(state => state.selectedContact);
    const setSelectedContact = useLayoutStore(state => state.setSelectedContact);
    const [allUsers, setAllUsers] = useState([])

    return (
        <Layout>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="h-full"
            >
            </motion.div>
        </Layout>
    );
};

export default HomePage;