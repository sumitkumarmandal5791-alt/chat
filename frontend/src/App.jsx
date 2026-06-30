import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './page/user-login/login';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { PublicRoute, ProtectedRoute } from './protectedRoutes';
import HomePage from './componenets/homePage';
import Layout from './componenets/Layout';
import UserDetail from './componenets/userDetail';
import Setting from './page/settingSection/setting';
import Status from './page/StatusSection/status';
import ChatWindow from './page/chatSection/chatWindow';
import userUserStore from "./store/useruserStore";
import { initialzeSocket, disconnectSocket } from "./services/chatService";
import { useChatStore } from './store/chatStore';
function App() {

    const { user } = userUserStore();

    const { setCurrentUser, fetchConversations, cleanUp, initsocketListners } = useChatStore();
    useEffect(() => {

        if (user?._id || user?.id) {
            const socket = initialzeSocket();

            if (socket) {
                setCurrentUser(user);
                fetchConversations();
                initsocketListners()
            }
        }

        return () => {
            disconnectSocket();
            cleanUp()
        }

    }, [user, setCurrentUser, fetchConversations, cleanUp])
    return (
        <>
            <ToastContainer position='top-right' autoClose={3000} />

            <Router>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<PublicRoute />} >
                        <Route index element={<Navigate to="/login" replace />} />
                        <Route path="login" element={<Login />} />
                        {/* <Route element={<Layout />}>
                            <Route path="/homePage" element={<HomePage />} />
                            <Route path="/userDetail" element={<UserDetail />} />
                            <Route path="/setting" element={<Setting />} />
                            <Route path="/status" element={<Status />} />
                            <Route path="/chat" element={<ChatWindow />} />
                        </Route> */}
                    </Route>

                    {/* Protected Routes */}
                    <Route element={<ProtectedRoute />}>
                        <Route element={<Layout />}>
                            <Route path="/homePage" element={<HomePage />} />
                            <Route path="/userDetail" element={<UserDetail />} />
                            <Route path="/setting" element={<Setting />} />
                            <Route path="/status" element={<Status />} />
                            <Route path="/chat" element={<ChatWindow />} />
                        </Route>
                    </Route>
                </Routes>
            </Router >
        </>
    );
}

export default App;









// import React from 'react';
// import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// import Login from "../src/page/user-login/login";
// import { PublicRoute, ProtectedRoute } from './protectedRoutes';
// import { ToastContainer } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';

// import Layout from './utils/Loader';

// function App() {
//     return (
//         <ToastContainer position='top-right' autoClose={300}>
//             <Router>
//                 <Routes>
//                     <Route path="/" element={<Login />}></Route>
//                 </Routes>

//             </Router>
//         </ToastContainer>
//     );
// }

// export default App;
