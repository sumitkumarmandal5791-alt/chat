import axiosInstance from './url.service';

export const createGroup = async (payload) => {
    const isFormData = payload instanceof FormData;
    const response = await axiosInstance.post('/groups', payload, {
        headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {}
    });
    return response.data;
};

export const getMyGroups = async () => {
    const response = await axiosInstance.get('/groups');
    return response.data;
};

export const getGroupDetails = async (groupId) => {
    const response = await axiosInstance.get(`/groups/${groupId}`);
    return response.data;
};

export const updateGroup = async (groupId, payload) => {
    const isFormData = payload instanceof FormData;
    const response = await axiosInstance.patch(`/groups/${groupId}`, payload, {
        headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {}
    });
    return response.data;
};

export const addMembers = async (groupId, memberIds) => {
    const response = await axiosInstance.post(`/groups/${groupId}/members`, { memberIds });
    return response.data;
};

export const removeMember = async (groupId, userId) => {
    const response = await axiosInstance.delete(`/groups/${groupId}/members/${userId}`);
    return response.data;
};

export const leaveGroup = async (groupId) => {
    const response = await axiosInstance.post(`/groups/${groupId}/leave`);
    return response.data;
};

export const changeRole = async (groupId, userId, role) => {
    const response = await axiosInstance.patch(`/groups/${groupId}/members/${userId}/role`, { role });
    return response.data;
};

export const transferOwnership = async (groupId, newOwnerId) => {
    const response = await axiosInstance.post(`/groups/${groupId}/transfer-ownership`, { newOwnerId });
    return response.data;
};

export const generateInviteLink = async (groupId, reset = false) => {
    const response = await axiosInstance.post(`/groups/${groupId}/invite-link?reset=${reset}`);
    return response.data;
};

export const joinViaInvite = async (inviteCode) => {
    const response = await axiosInstance.post(`/groups/join/${inviteCode}`);
    return response.data;
};

export const deleteGroup = async (groupId) => {
    const response = await axiosInstance.delete(`/groups/${groupId}`);
    return response.data;
};

export const getGroupMessages = async (groupId, cursor = null, limit = 50) => {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    if (limit) params.append('limit', limit);
    const response = await axiosInstance.get(`/groups/${groupId}/messages?${params.toString()}`);
    return response.data;
};

export const sendGroupMessage = async (groupId, payload) => {
    const isFormData = payload instanceof FormData;
    const response = await axiosInstance.post(`/groups/${groupId}/messages`, payload, {
        headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {}
    });
    return response.data;
};

export const markGroupMessagesRead = async (groupId, messageId = null) => {
    const response = await axiosInstance.post(`/groups/${groupId}/read`, { messageId });
    return response.data;
};

export const getMessageInfo = async (messageId) => {
    const response = await axiosInstance.get(`/groups/messages/${messageId}/info`);
    return response.data;
};

