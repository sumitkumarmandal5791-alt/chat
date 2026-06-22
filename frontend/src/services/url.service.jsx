import axios from "axios";

// Change REACT_APP_API_URL to VITE_API_URL
const apiUrl = `${import.meta.env.VITE_API_URL}/api`;

const axiosInstance = axios.create({
    baseURL: apiUrl,
    withCredentials: true,
});

export default axiosInstance;