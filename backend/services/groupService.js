const crypto = require('crypto');
const Group = require('../models/Group');
const Message = require('../models/Message');
const User = require('../models/User');

/**
 * Helper to generate a random 12-char alphanumeric invite code
 */
const generateUniqueInviteCode = () => {
    return crypto.randomBytes(6).toString('hex');
};

/**
 * Helper to create a system message in a group
 */
const createSystemMessage = async (groupId, text, io = null) => {
    try {
        const sysMsg = new Message({
            groupId,
            type: 'system',
            contentType: 'system',
            message: text
        });
        await sysMsg.save();

        await Group.findByIdAndUpdate(groupId, { lastMessage: sysMsg._id });

        if (io) {
            io.to(`group:${groupId}`).emit('message:new', sysMsg);
        }
        return sysMsg;
    } catch (err) {
        console.error('Failed to create system message:', err.message);
        return null;
    }
};

/**
 * 1. Create a new group
 */
const createGroup = async (creatorId, { name, description = '', avatar = '', memberIds = [] }, io = null) => {
    const creator = await User.findById(creatorId);
    if (!creator) throw { status: 404, message: 'Creator not found' };

    // Deduplicate member IDs and exclude creator
    const uniqueMemberIds = [
        ...new Set(memberIds.map((id) => id.toString()).filter((id) => id !== creatorId.toString()))
    ];

    // Validate users exist
    const validUsers = await User.find({ _id: { $in: uniqueMemberIds } }).select('_id username name');
    const validUserIds = validUsers.map((u) => u._id);

    const members = [
        {
            userId: creatorId,
            role: 'owner',
            joinedAt: new Date(),
            addedBy: creatorId
        },
        ...validUserIds.map((uId) => ({
            userId: uId,
            role: 'member',
            joinedAt: new Date(),
            addedBy: creatorId
        }))
    ];

    const group = new Group({
        name: name.trim(),
        description: description.trim(),
        avatar: avatar || '',
        createdBy: creatorId,
        members,
        inviteCode: generateUniqueInviteCode()
    });

    await group.save();

    // Create system message
    const creatorName = creator.username || creator.name || 'Admin';
    await createSystemMessage(group._id, `${creatorName} created group "${group.name}"`, io);

    const populatedGroup = await Group.findById(group._id)
        .populate('members.userId', 'username name profilePicture isOnline lastSeen')
        .populate('createdBy', 'username name profilePicture')
        .populate('lastMessage')
        .lean();

    if (io) {
        members.forEach((m) => {
            const uId = m.userId.toString();
            io.to(`user:${uId}`).to(uId).emit('group:created', populatedGroup);
        });
    }

    return populatedGroup;
};

/**
 * 2. Get all groups for a user
 */
const getMyGroups = async (userId) => {
    const groups = await Group.find({ 'members.userId': userId })
        .populate('members.userId', 'username name profilePicture isOnline lastSeen')
        .populate('createdBy', 'username name profilePicture')
        .populate({
            path: 'lastMessage',
            populate: { path: 'senderId', select: 'username name profilePicture' }
        })
        .sort({ updatedAt: -1 })
        .lean();

    // Calculate unread count for each group for this user
    const enhanced = await Promise.all(
        groups.map(async (grp) => {
            const memberEntry = grp.members.find((m) => m.userId?._id?.toString() === userId.toString());
            let unreadCount = 0;
            if (memberEntry?.lastReadMessageId) {
                const lastRead = await Message.findById(memberEntry.lastReadMessageId).select('createdAt');
                if (lastRead) {
                    unreadCount = await Message.countDocuments({
                        groupId: grp._id,
                        createdAt: { $gt: lastRead.createdAt },
                        deletedFor: { $ne: userId }
                    });
                }
            } else {
                unreadCount = await Message.countDocuments({
                    groupId: grp._id,
                    deletedFor: { $ne: userId }
                });
            }

            return {
                ...grp,
                unreadCount: Math.min(unreadCount, 99)
            };
        })
    );

    return enhanced;
};

/**
 * 3. Get single group details
 */
const getGroupDetails = async (groupId, userId) => {
    const group = await Group.findById(groupId)
        .populate('members.userId', 'username name profilePicture about isOnline lastSeen')
        .populate('createdBy', 'username name profilePicture')
        .populate({
            path: 'lastMessage',
            populate: { path: 'senderId', select: 'username name profilePicture' }
        })
        .lean();

    if (!group) throw { status: 404, message: 'Group not found' };

    const isMember = group.members.some(
        (m) => (m.userId?._id || m.userId)?.toString() === userId.toString()
    );
    if (!isMember) throw { status: 403, message: 'Access denied: not a group member' };

    return group;
};

/**
 * 4. Update group details (Name, description, avatar, settings)
 */
const updateGroup = async (groupId, userId, updates, io = null) => {
    const group = await Group.findById(groupId);
    if (!group) throw { status: 404, message: 'Group not found' };

    const membership = group.members.find((m) => m.userId.toString() === userId.toString());
    if (!membership) throw { status: 403, message: 'Not a member' };

    // Check setting whoCanEditInfo
    if (group.settings.whoCanEditInfo === 'admins' && membership.role !== 'admin' && membership.role !== 'owner') {
        throw { status: 403, message: 'Only admins can edit group information' };
    }

    const editor = await User.findById(userId).select('username name');
    const editorName = editor?.username || editor?.name || 'A member';
    const systemEvents = [];

    if (updates.name && updates.name.trim() && updates.name.trim() !== group.name) {
        systemEvents.push(`${editorName} changed the group name to "${updates.name.trim()}"`);
        group.name = updates.name.trim();
    }

    if (updates.description !== undefined && updates.description !== group.description) {
        systemEvents.push(`${editorName} updated the group description`);
        group.description = updates.description.trim();
    }

    if (updates.avatar !== undefined && updates.avatar !== group.avatar) {
        systemEvents.push(`${editorName} updated the group icon`);
        group.avatar = updates.avatar;
    }

    if (updates.settings) {
        if (membership.role !== 'admin' && membership.role !== 'owner') {
            throw { status: 403, message: 'Only admins can change group settings' };
        }
        group.settings = { ...group.settings, ...updates.settings };
        systemEvents.push(`${editorName} changed group settings`);
    }

    await group.save();

    for (const msgText of systemEvents) {
        await createSystemMessage(group._id, msgText, io);
    }

    const updated = await Group.findById(group._id)
        .populate('members.userId', 'username name profilePicture isOnline lastSeen')
        .populate('createdBy', 'username name profilePicture')
        .lean();

    if (io) {
        io.to(`group:${groupId}`).emit('group:updated', updated);
    }

    return updated;
};

/**
 * 5. Add members to group
 */
const addMembers = async (groupId, adminUserId, userIdsToAdd, io = null) => {
    const group = await Group.findById(groupId);
    if (!group) throw { status: 404, message: 'Group not found' };

    const existingMemberIds = new Set(group.members.map((m) => m.userId.toString()));
    const adminUser = await User.findById(adminUserId).select('username name');
    const adminName = adminUser?.username || adminUser?.name || 'Admin';

    // Filter valid, non-duplicate users
    const toAdd = [
        ...new Set(userIdsToAdd.map((id) => id.toString()).filter((id) => !existingMemberIds.has(id)))
    ];

    if (toAdd.length === 0) {
        throw { status: 400, message: 'All selected users are already members' };
    }

    if (group.members.length + toAdd.length > group.maxMembers) {
        throw {
            status: 400,
            message: `Group member limit (${group.maxMembers}) exceeded. Can only add ${group.maxMembers - group.members.length} more.`
        };
    }

    const validUsers = await User.find({ _id: { $in: toAdd } }).select('_id username name');

    const newMemberDocs = validUsers.map((u) => ({
        userId: u._id,
        role: 'member',
        joinedAt: new Date(),
        addedBy: adminUserId
    }));

    group.members.push(...newMemberDocs);
    await group.save();

    const addedNames = validUsers.map((u) => u.username || u.name).join(', ');
    await createSystemMessage(group._id, `${adminName} added ${addedNames}`, io);

    const populated = await Group.findById(group._id)
        .populate('members.userId', 'username name profilePicture isOnline lastSeen')
        .populate('createdBy', 'username name profilePicture')
        .lean();

    if (io) {
        // Emit to existing room
        io.to(`group:${groupId}`).emit('group:member-added', {
            groupId,
            addedMembers: validUsers,
            group: populated
        });

        // Notify new users directly
        toAdd.forEach((uId) => {
            io.to(`user:${uId}`).to(uId).emit('group:created', populated);
        });
    }

    return populated;
};

/**
 * 6. Remove member from group
 */
const removeMember = async (groupId, adminUserId, targetUserId, io = null) => {
    const group = await Group.findById(groupId);
    if (!group) throw { status: 404, message: 'Group not found' };

    const targetMembership = group.members.find((m) => m.userId.toString() === targetUserId.toString());
    if (!targetMembership) throw { status: 404, message: 'Member not found in group' };

    if (targetMembership.role === 'owner') {
        throw { status: 403, message: 'Cannot remove the group owner' };
    }

    const adminUser = await User.findById(adminUserId).select('username name');
    const targetUser = await User.findById(targetUserId).select('username name');

    group.members = group.members.filter((m) => m.userId.toString() !== targetUserId.toString());
    await group.save();

    const adminName = adminUser?.username || adminUser?.name || 'Admin';
    const targetName = targetUser?.username || targetUser?.name || 'Member';
    await createSystemMessage(group._id, `${adminName} removed ${targetName}`, io);

    if (io) {
        io.to(`group:${groupId}`).emit('group:member-removed', {
            groupId,
            userId: targetUserId.toString(),
            userName: targetName
        });
        io.to(`user:${targetUserId}`).to(targetUserId.toString()).emit('group:deleted', { groupId });
    }

    return { success: true, message: `${targetName} removed from group` };
};

/**
 * 7. Leave group
 */
const leaveGroup = async (groupId, userId, io = null) => {
    const group = await Group.findById(groupId);
    if (!group) throw { status: 404, message: 'Group not found' };

    const leavingIndex = group.members.findIndex((m) => m.userId.toString() === userId.toString());
    if (leavingIndex === -1) throw { status: 404, message: 'Not a member of this group' };

    const leavingMember = group.members[leavingIndex];
    const userDoc = await User.findById(userId).select('username name');
    const userName = userDoc?.username || userDoc?.name || 'A member';

    // Remove member
    group.members.splice(leavingIndex, 1);

    // If no members left: clean up group
    if (group.members.length === 0) {
        await Group.findByIdAndDelete(groupId);
        await Message.deleteMany({ groupId });
        return { success: true, message: 'Group deleted because last member left' };
    }

    // If owner leaves: transfer ownership to oldest admin, else oldest member
    if (leavingMember.role === 'owner') {
        const remainingAdmins = group.members.filter((m) => m.role === 'admin');
        let newOwner = null;

        if (remainingAdmins.length > 0) {
            remainingAdmins.sort((a, b) => new Date(a.joinedAt) - new Date(b.joinedAt));
            newOwner = remainingAdmins[0];
        } else {
            group.members.sort((a, b) => new Date(a.joinedAt) - new Date(b.joinedAt));
            newOwner = group.members[0];
        }

        newOwner.role = 'owner';
        group.createdBy = newOwner.userId;

        const newOwnerUser = await User.findById(newOwner.userId).select('username name');
        const newOwnerName = newOwnerUser?.username || newOwnerUser?.name || 'Member';
        await createSystemMessage(group._id, `${userName} left. ${newOwnerName} is now the group owner`, io);
    } else {
        await createSystemMessage(group._id, `${userName} left`, io);
    }

    await group.save();

    if (io) {
        io.to(`group:${groupId}`).emit('group:member-left', {
            groupId,
            userId: userId.toString(),
            userName
        });
        io.to(`user:${userId}`).to(userId.toString()).emit('group:deleted', { groupId });
    }

    return { success: true, message: 'Successfully left group' };
};

/**
 * 8. Change role (admin / member)
 */
const changeRole = async (groupId, targetUserId, newRole, io = null) => {
    if (!['admin', 'member'].includes(newRole)) {
        throw { status: 400, message: 'Role must be admin or member' };
    }

    const group = await Group.findById(groupId);
    if (!group) throw { status: 404, message: 'Group not found' };

    const member = group.members.find((m) => m.userId.toString() === targetUserId.toString());
    if (!member) throw { status: 404, message: 'Member not found in group' };

    if (member.role === 'owner') {
        throw { status: 403, message: 'Cannot modify owner role through changeRole' };
    }

    member.role = newRole;
    await group.save();

    const targetUser = await User.findById(targetUserId).select('username name');
    const targetName = targetUser?.username || targetUser?.name || 'Member';
    const roleMsg = newRole === 'admin' ? `${targetName} is now an admin` : `${targetName} is no longer an admin`;

    await createSystemMessage(group._id, roleMsg, io);

    if (io) {
        io.to(`group:${groupId}`).emit('group:role-changed', {
            groupId,
            userId: targetUserId.toString(),
            role: newRole
        });
    }

    return { success: true, message: roleMsg };
};

/**
 * 9. Transfer ownership
 */
const transferOwnership = async (groupId, currentOwnerId, newOwnerId, io = null) => {
    const group = await Group.findById(groupId);
    if (!group) throw { status: 404, message: 'Group not found' };

    const currentOwner = group.members.find((m) => m.userId.toString() === currentOwnerId.toString());
    if (currentOwner?.role !== 'owner') {
        throw { status: 403, message: 'Only current owner can transfer ownership' };
    }

    const targetMember = group.members.find((m) => m.userId.toString() === newOwnerId.toString());
    if (!targetMember) throw { status: 404, message: 'Target user is not a member' };

    currentOwner.role = 'admin';
    targetMember.role = 'owner';
    group.createdBy = targetMember.userId;

    await group.save();

    const newOwnerUser = await User.findById(newOwnerId).select('username name');
    const newOwnerName = newOwnerUser?.username || newOwnerUser?.name || 'Member';
    await createSystemMessage(group._id, `${newOwnerName} is now the group owner`, io);

    if (io) {
        io.to(`group:${groupId}`).emit('group:updated', group);
    }

    return { success: true, message: `Ownership transferred to ${newOwnerName}` };
};

/**
 * 10. Generate / Reset invite link
 */
const generateOrResetInviteLink = async (groupId, reset = false) => {
    const group = await Group.findById(groupId);
    if (!group) throw { status: 404, message: 'Group not found' };

    if (reset || !group.inviteCode) {
        group.inviteCode = generateUniqueInviteCode();
        await group.save();
    }

    return {
        inviteCode: group.inviteCode,
        inviteLink: `/groups/join/${group.inviteCode}`
    };
};

/**
 * 11. Join via invite code
 */
const joinViaInvite = async (inviteCode, userId, io = null) => {
    const group = await Group.findOne({ inviteCode });
    if (!group) throw { status: 404, message: 'Invalid invite link' };

    if (!group.settings.inviteLinkEnabled) {
        throw { status: 403, message: 'Invite links are disabled for this group' };
    }

    const alreadyMember = group.members.some((m) => m.userId.toString() === userId.toString());
    if (alreadyMember) {
        return { success: true, message: 'Already a member', group };
    }

    if (group.members.length >= group.maxMembers) {
        throw { status: 400, message: 'Group is full' };
    }

    const userDoc = await User.findById(userId).select('username name profilePicture');
    const userName = userDoc?.username || userDoc?.name || 'A new member';

    group.members.push({
        userId,
        role: 'member',
        joinedAt: new Date(),
        addedBy: group.createdBy
    });

    await group.save();
    await createSystemMessage(group._id, `${userName} joined using an invite link`, io);

    const populated = await Group.findById(group._id)
        .populate('members.userId', 'username name profilePicture isOnline lastSeen')
        .populate('createdBy', 'username name profilePicture')
        .lean();

    if (io) {
        io.to(`group:${group._id}`).emit('group:member-added', {
            groupId: group._id,
            addedMembers: [userDoc],
            group: populated
        });
        io.to(`user:${userId}`).to(userId.toString()).emit('group:created', populated);
    }

    return populated;
};

/**
 * 12. Delete group (owner only)
 */
const deleteGroup = async (groupId, ownerId, io = null) => {
    const group = await Group.findById(groupId);
    if (!group) throw { status: 404, message: 'Group not found' };

    if (group.createdBy.toString() !== ownerId.toString()) {
        throw { status: 403, message: 'Only group owner can delete group' };
    }

    await Group.findByIdAndDelete(groupId);
    await Message.deleteMany({ groupId });

    if (io) {
        io.to(`group:${groupId}`).emit('group:deleted', { groupId });
    }

    return { success: true, message: 'Group deleted successfully' };
};

/**
 * 13. Send group message
 */
const sendGroupMessage = async (groupId, senderId, { content, type = 'text', replyTo, mentions = [], mediaUrl, fileName, fileSize }, io = null) => {
    const group = await Group.findById(groupId);
    if (!group) throw { status: 404, message: 'Group not found' };

    const membership = group.members.find((m) => m.userId.toString() === senderId.toString());
    if (!membership) throw { status: 403, message: 'Not a member of this group' };

    // Check setting whoCanSend
    if (group.settings.whoCanSend === 'admins' && membership.role !== 'admin' && membership.role !== 'owner') {
        throw { status: 403, message: 'Only admins can send messages in this group' };
    }

    const newMessage = new Message({
        groupId,
        senderId,
        message: content,
        type,
        contentType: type,
        image: type === 'image' ? mediaUrl : undefined,
        video: type === 'video' ? mediaUrl : undefined,
        audio: type === 'audio' ? mediaUrl : undefined,
        fileUrl: type === 'file' ? mediaUrl : undefined,
        fileName,
        fileSize,
        replyTo,
        mentions,
        deliveredTo: [{ user: senderId, deliveredAt: new Date() }],
        readBy: [{ user: senderId, readAt: new Date() }],
        messageStatus: 'sent'
    });

    await newMessage.save();

    group.lastMessage = newMessage._id;
    await group.save();

    const populated = await Message.findById(newMessage._id)
        .populate('senderId', 'username name profilePicture')
        .populate('mentions', 'username name')
        .lean();

    if (io) {
        io.to(`group:${groupId}`).emit('message:new', populated);
    }

    return populated;
};

/**
 * 14. Get group messages with cursor pagination
 */
const getGroupMessages = async (groupId, userId, cursor = null, limit = 50) => {
    const group = await Group.findById(groupId);
    if (!group) throw { status: 404, message: 'Group not found' };

    const isMember = group.members.some((m) => m.userId.toString() === userId.toString());
    if (!isMember) throw { status: 403, message: 'Not a group member' };

    const query = {
        groupId,
        deletedFor: { $ne: userId }
    };

    if (cursor) {
        query._id = { $lt: cursor };
    }

    const messages = await Message.find(query)
        .populate('senderId', 'username name profilePicture')
        .populate('mentions', 'username name')
        .sort({ _id: -1 })
        .limit(Number(limit) || 50)
        .lean();

    // Reverse to chronological order (oldest to newest)
    const ordered = messages.reverse();
    const nextCursor = messages.length > 0 ? messages[0]._id : null;

    return {
        messages: ordered,
        nextCursor,
        hasMore: messages.length === (Number(limit) || 50)
    };
};

/**
 * 15. Mark group message as read
 */
const markGroupMessagesRead = async (groupId, userId, messageId = null, io = null) => {
    const group = await Group.findById(groupId);
    if (!group) throw { status: 404, message: 'Group not found' };

    const member = group.members.find((m) => m.userId.toString() === userId.toString());
    if (!member) return;

    if (messageId) {
        member.lastReadMessageId = messageId;
        await group.save();

        await Message.updateMany(
            { groupId, _id: { $lte: messageId }, 'readBy.user': { $ne: userId } },
            { $push: { readBy: { user: userId, readAt: new Date() } } }
        );

        if (io) {
            io.to(`group:${groupId}`).emit('message:read', {
                groupId,
                userId: userId.toString(),
                messageId
            });
        }
    }

    return { success: true };
};

/**
 * 16. Get message read/delivered info
 */
const getMessageInfo = async (messageId, userId) => {
    const msg = await Message.findById(messageId)
        .populate('deliveredTo.user', 'username name profilePicture')
        .populate('readBy.user', 'username name profilePicture')
        .lean();

    if (!msg) throw { status: 404, message: 'Message not found' };

    return {
        messageId: msg._id,
        deliveredTo: msg.deliveredTo || [],
        readBy: msg.readBy || []
    };
};

module.exports = {
    createGroup,
    getMyGroups,
    getGroupDetails,
    updateGroup,
    addMembers,
    removeMember,
    leaveGroup,
    changeRole,
    transferOwnership,
    generateOrResetInviteLink,
    joinViaInvite,
    deleteGroup,
    sendGroupMessage,
    getGroupMessages,
    markGroupMessagesRead,
    getMessageInfo,
    createSystemMessage
};

