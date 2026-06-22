import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { checkUserAuth } from './services/user.services';
import useUserStore from "./store/useruserStore";
import Loader from "./utils/Loader";

export const ProtectedRoute = ({ children }) => {
    const location = useLocation();
    const [isChecking, setIsChecking] = useState(true);

    const { isAuthenticated, setUser, clearuser } = useUserStore();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const authStatus = await checkUserAuth();
                if (authStatus.isAuthenticated) {
                    setUser(authStatus.user);
                } else {
                    clearuser();
                }
            } catch (error) {
                console.error("Error checking authentication:", error);
                clearuser();
            } finally {
                setIsChecking(false);
            }
        };

        checkAuth();
    }, [setUser, clearuser]);

    if (isChecking) {
        return <Loader />;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <Outlet />;
};

export const PublicRoute = () => {
    const { isAuthenticated } = useUserStore();

    if (isAuthenticated) {
        return <Navigate to="/homePage" replace />;
    }

    return <Outlet />;
};