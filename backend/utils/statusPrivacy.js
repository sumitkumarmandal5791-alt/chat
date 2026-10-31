/**
 * Evaluates whether a viewer is allowed to see a given status based on privacy rules.
 * 
 * @param {string|ObjectId} viewerId - ID of the user requesting to view
 * @param {Object} status - Status object with user and privacy config
 * @returns {boolean}
 */
const canViewStatus = (viewerId, status) => {
    if (!viewerId || !status) return false;

    const vId = viewerId.toString();
    const ownerId = (status.user?._id || status.user)?.toString();

    // The owner can always view their own status
    if (vId === ownerId) {
        return true;
    }

    const privacy = status.privacy || { mode: 'contacts', userIds: [] };
    const targetUserIds = (privacy.userIds || []).map((id) => (id?._id || id).toString());

    switch (privacy.mode) {
        case 'contacts':
            // In the "everyone can see everyone" contact model, all registered contacts can view
            return true;

        case 'contacts_except':
            // Contacts EXCEPT the specified user IDs
            return !targetUserIds.includes(vId);

        case 'only_share':
            // ONLY the specified user IDs can view
            return targetUserIds.includes(vId);

        default:
            return true;
    }
};

module.exports = {
    canViewStatus
};

