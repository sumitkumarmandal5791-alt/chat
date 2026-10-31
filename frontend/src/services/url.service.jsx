import axios from "axios";

const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:1200'}/api`;

const axiosInstance = axios.create({
    baseURL: apiUrl,
    withCredentials: true, // Send httpOnly cookies (refreshToken) with every request
});

// In-memory access token storage
let currentAccessToken = null;

export const setAccessToken = (token) => {
    currentAccessToken = token;
};

export const getAccessToken = () => {
    return currentAccessToken;
};

// Request Interceptor: Attach Access Token
axiosInstance.interceptors.request.use(
    (config) => {
        if (currentAccessToken && !config.headers.Authorization) {
            config.headers.Authorization = `Bearer ${currentAccessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor: Auto Refresh Token on 401
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Skip refresh loop for auth refresh / login / verify endpoints
        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url?.includes('/auth/refresh') &&
            !originalRequest.url?.includes('/auth/verify-otp') &&
            !originalRequest.url?.includes('/auth/send-otp')
        ) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return axiosInstance(originalRequest);
                    })
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Call /auth/refresh with credentials (reads httpOnly refreshToken cookie)
                const res = await axios.post(
                    `${apiUrl}/auth/refresh`,
                    {},
                    { withCredentials: true }
                );

                const newAccessToken = res.data?.accessToken;
                if (newAccessToken) {
                    setAccessToken(newAccessToken);
                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                    processQueue(null, newAccessToken);
                    return axiosInstance(originalRequest);
                }
            } catch (refreshErr) {
                processQueue(refreshErr, null);
                setAccessToken(null);
                // Trigger storage event to synchronize logout across tabs
                window.dispatchEvent(new Event('auth:logout'));
                return Promise.reject(refreshErr);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;
