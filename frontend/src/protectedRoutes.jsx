import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { checkUserAuth } from './services/user.services';
import useUserStore from "./store/useruserStore";
import Loader from "./utils/Loader";

export const ProtectedRoute = () => {
    const location = useLocation();
    const [isChecking, setIsChecking] = useState(true);
    const { isAuthenticated, setUser, clearuser } = useUserStore();

    useEffect(() => {
        let isMounted = true;

        const verifySession = async () => {
            try {
                const authStatus = await checkUserAuth();
                if (!isMounted) return;

                if (authStatus.isAuthenticated && authStatus.user) {
                    setUser(authStatus.user);
                } else {
                    clearuser();
                }
            } catch (error) {
                if (isMounted) clearuser();
            } finally {
                if (isMounted) setIsChecking(false);
            }
        };

        verifySession();

        const handleLogoutEvent = () => {
            clearuser();
        };

        window.addEventListener('auth:logout', handleLogoutEvent);
        return () => {
            isMounted = false;
            window.removeEventListener('auth:logout', handleLogoutEvent);
        };
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
