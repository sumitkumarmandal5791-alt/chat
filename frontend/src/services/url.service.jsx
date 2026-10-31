import axios from "axios";

const apiUrl = `${import.meta.env.VITE_API_URL || "http://localhost:1200"}/api`;

const axiosInstance = axios.create({
    baseURL: apiUrl,
    withCredentials: true,
});

let currentAccessToken = null;
let refreshPromise = null;

export const setAccessToken = (token) => {
    currentAccessToken = token;
};

export const getAccessToken = () => currentAccessToken;

export const refreshAccessToken = async () => {
    if (!refreshPromise) {
        refreshPromise = axios
            .post(`${apiUrl}/auth/refresh`, {}, { withCredentials: true })
            .then((response) => {
                const newAccessToken = response.data?.accessToken;
                if (!newAccessToken) {
                    throw new Error("Refresh response did not contain an access token");
                }
                setAccessToken(newAccessToken);
                return response.data;
            })
            .finally(() => {
                refreshPromise = null;
            });
    }

    return refreshPromise;
};

axiosInstance.interceptors.request.use(
    (config) => {
        if (currentAccessToken) {
            config.headers = config.headers || {};
            if (!config.headers.Authorization) {
                config.headers.Authorization = `Bearer ${currentAccessToken}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((promise) => {
        if (error) {
            promise.reject(error);
        } else {
            promise.resolve(token);
        }
    });
    failedQueue = [];
};

axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const requestUrl = originalRequest?.url || "";
        const isAuthRequest = ["/auth/refresh", "/auth/verify-otp", "/auth/send-otp"]
            .some((path) => requestUrl.includes(path));

        if (
            error.response?.status !== 401 ||
            !originalRequest ||
            originalRequest._retry ||
            isAuthRequest
        ) {
            return Promise.reject(error);
        }

        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            }).then((token) => {
                originalRequest.headers = originalRequest.headers || {};
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return axiosInstance(originalRequest);
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
            const refreshResponse = await refreshAccessToken();
            const newAccessToken = refreshResponse.accessToken;
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            processQueue(null, newAccessToken);
            return axiosInstance(originalRequest);
        } catch (refreshError) {
            processQueue(refreshError);
            setAccessToken(null);
            window.dispatchEvent(new Event("auth:logout"));
            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    }
);

export default axiosInstance;
