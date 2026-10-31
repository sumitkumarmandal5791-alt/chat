import axios from 'axios';
import axiosInstance from './url.service';

/**
 * Request signed upload parameters from backend
 */
export const getUploadSignature = async () => {
    const response = await axiosInstance.get('/status/upload-signature');
    return response.data;
};

/**
 * Upload media directly to Cloudinary using backend-generated signature
 */
export const uploadToCloudinaryDirect = async (file, signatureData, onProgress, cancelToken) => {
    const isVideo = file.type.startsWith('video');
    const resourceType = isVideo ? 'video' : 'image';
    const uploadUrl = `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/${resourceType}/upload`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', signatureData.apiKey);
    formData.append('timestamp', signatureData.timestamp);
    formData.append('signature', signatureData.signature);
    formData.append('folder', signatureData.folder);

    const response = await axios.post(uploadUrl, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
        cancelToken,
        onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
                const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                if (onProgress) onProgress(percent);
            }
        },
    });

    return response.data;
};

/**
 * Create a new status
 */
export const createStatusApi = async (statusData) => {
    const response = await axiosInstance.post('/status', statusData);
    return response.data;
};

/**
 * Get grouped status feed
 */
export const getStatusFeedApi = async () => {
    const response = await axiosInstance.get('/status/feed');
    return response.data;
};

/**
 * Get logged-in user's active statuses
 */
export const getMyStatusesApi = async () => {
    const response = await axiosInstance.get('/status/mine');
    return response.data;
};

/**
 * Mark status as viewed
 */
export const markStatusViewedApi = async (statusId) => {
    const response = await axiosInstance.post(`/status/${statusId}/view`);
    return response.data;
};

/**
 * Get viewers list for a status (owner only)
 */
export const getStatusViewersApi = async (statusId) => {
    const response = await axiosInstance.get(`/status/${statusId}/viewers`);
    return response.data;
};

/**
 * Delete a status
 */
export const deleteStatusApi = async (statusId) => {
    const response = await axiosInstance.delete(`/status/${statusId}`);
    return response.data;
};

/**
 * Reply to a status
 */
export const replyStatusApi = async (statusId, message) => {
    const response = await axiosInstance.post(`/status/${statusId}/reply`, { message });
    return response.data;
};

/**
 * Mute user statuses
 */
export const muteStatusUserApi = async (userId) => {
    const response = await axiosInstance.post(`/status/mute/${userId}`);
    return response.data;
};

/**
 * Unmute user statuses
 */
export const unmuteStatusUserApi = async (userId) => {
    const response = await axiosInstance.delete(`/status/mute/${userId}`);
    return response.data;
};

/**
 * Update status privacy defaults
 */
export const updateStatusPrivacyApi = async (privacyData) => {
    const response = await axiosInstance.patch('/users/me/status-privacy', privacyData);
    return response.data;
};

