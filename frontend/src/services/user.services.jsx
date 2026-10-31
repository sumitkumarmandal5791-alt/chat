import axiosInstance, { setAccessToken } from "./url.service";

// 1. Send OTP
export const sendOtp = async (payload) => {
    try {
        const response = await axiosInstance.post("/auth/send-otp", payload);
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || "An error occurred while sending verification code.";
    }
};

// 2. Verify OTP
export const verifyOtp = async (payload) => {
    try {
        const response = await axiosInstance.post("/auth/verify-otp", payload);
        if (response.data?.accessToken) {
            setAccessToken(response.data.accessToken);
        }
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || "Invalid or expired verification code.";
    }
};

// 3. Resend OTP
export const resendOtp = async (payload) => {
    try {
        const response = await axiosInstance.post("/auth/resend-otp", payload);
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || "An error occurred while resending verification code.";
    }
};

// 4. Complete / Update Profile
export const updateProfile = async (updatedUserData) => {
    try {
        const isFormData = updatedUserData instanceof FormData;
        const response = await axiosInstance.post("/auth/complete-profile", updatedUserData, {
            headers: isFormData ? { "Content-Type": "multipart/form-data" } : {}
        });
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || "An error occurred while saving profile.";
    }
};

// 5. Silent Refresh
export const refreshToken = async () => {
    try {
        const response = await axiosInstance.post("/auth/refresh");
        if (response.data?.accessToken) {
            setAccessToken(response.data.accessToken);
        }
        return response.data;
    } catch (error) {
        setAccessToken(null);
        throw error.response?.data?.message || "Failed to refresh session.";
    }
};

// 6. Check Auth Status / Get Current User
export const checkUserAuth = async () => {
    try {
        // Try refreshing session first to ensure valid accessToken
        const refreshRes = await axiosInstance.post("/auth/refresh");
        if (refreshRes.data?.accessToken && refreshRes.data?.user) {
            setAccessToken(refreshRes.data.accessToken);
            return { isAuthenticated: true, user: refreshRes.data.user };
        }
    } catch (e) {
        // Fallback to /auth/me
        try {
            const response = await axiosInstance.get("/auth/me");
            if (response.data?.user) {
                return { isAuthenticated: true, user: response.data.user };
            }
        } catch {
            return { isAuthenticated: false, user: null };
        }
    }
    return { isAuthenticated: false, user: null };
};

// 7. Logout Current Device
export const logoutUser = async () => {
    try {
        const response = await axiosInstance.post("/auth/logout");
        setAccessToken(null);
        return response.data;
    } catch (error) {
        setAccessToken(null);
        return { success: true };
    }
};

// 8. Logout All Devices
export const logoutAllDevices = async () => {
    try {
        const response = await axiosInstance.post("/auth/logout-all");
        setAccessToken(null);
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || "Failed to terminate all sessions.";
    }
};

// 9. Fetch All Users (for contacts & conversations)
export const getAllUsers = async () => {
    try {
        const response = await axiosInstance.get("/auth/get-all-users");
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || "An error occurred while fetching users.";
    }
};

// 10. Get Conversation List of User
export const getConversations = async (userId) => {
    try {
        const response = await axiosInstance.get(`/chat/conversation/${userId}`);
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || "An error occurred while fetching conversations.";
    }
};

// 11. Get Messages of Specific Conversation
export const getMessages = async (conversationId) => {
    try {
        const response = await axiosInstance.get(`/chat/conversations/${conversationId}/messages`);
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || "An error occurred while fetching messages.";
    }
};

// 12. Send Message
export const sendMessage = async (payload) => {
    try {
        const headers = payload instanceof FormData ? { "Content-Type": "multipart/form-data" } : {};
        const response = await axiosInstance.post("/chat/send-message", payload, { headers });
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || "An error occurred while sending message.";
    }
};
