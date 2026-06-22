
import axiosInstance from "./url.service";

// 1. Send OTP (Payload keys match whatever backend expects)
export const sendOtp = async (payload) => {
    try {
        const response = await axiosInstance.post("/auth/send-otp", payload);
        console.log("OTP sent successfully:", response.data);
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || "An error occurred while sending OTP.";
    }
};

// 2. Verify OTP (Crucial: Include otp in payload)
export const verifyOtp = async (payload) => {
    try {
        const response = await axiosInstance.post("/auth/verify-otp", payload);
        console.log("OTP sent successfully:", response.data);
        return response.data; // Expected backend response format: { isNewUser: true/false }
    } catch (error) {
        throw error.response?.data?.message || "An error occurred while verifying OTP.";
    }
};

// 3. Complete/Update Profile
export const updateProfile = async (updatedUserData) => {
    try {
        const response = await axiosInstance.post("/auth/update-profile", updatedUserData);
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || "An error occurred while updating profile.";
    }
};

// 4. Check Authentication Status
export const checkUserAuth = async () => {
    try {
        const response = await axiosInstance.get("/auth/profile");
        if (response.data && response.data.user) {
            return { isAuthenticated: true, user: response.data.user };
        } else {
            return { isAuthenticated: false, user: null };
        }
    } catch (error) {
        return { isAuthenticated: false, user: null }; // Silent fallback on auth failures
    }
};

// 5. Logout User (Renamed from checkUserAuth)
export const logoutUser = async () => {
    try {
        const response = await axiosInstance.get("/auth/logout");
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || "An error occurred during logout.";
    }
};

// 6. Fetch All Users (Renamed from checkUserAuth)
export const getAllUsers = async () => {
    try {
        const response = await axiosInstance.get("/auth/get-all-users");
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || "An error occurred while fetching users.";
    }
};

// 7. Get Conversation List of User
export const getConversations = async (userId) => {
    try {
        const response = await axiosInstance.get(`/chat/conversation/${userId}`);
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || "An error occurred while fetching conversations.";
    }
};

// 8. Get Messages of Specific Conversation
export const getMessages = async (conversationId) => {
    try {
        const response = await axiosInstance.get(`/chat/conversations/${conversationId}/messages`);
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || "An error occurred while fetching messages.";
    }
};

// 9. Send Message
export const sendMessage = async (payload) => {
    try {
        // payload can be FormData for files or standard object for text
        const headers = payload instanceof FormData ? { "Content-Type": "multipart/form-data" } : {};
        const response = await axiosInstance.post("/chat/send-message", payload, { headers });
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || "An error occurred while sending message.";
    }
};

// 10. Mark Message as Read
export const markAsRead = async (messageId) => {
    try {
        const response = await axiosInstance.put("/chat/messages/read", { messageId });
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || "An error occurred while marking message as read.";
    }
};

