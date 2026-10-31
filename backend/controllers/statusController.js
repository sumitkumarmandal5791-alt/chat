const { z } = require('zod');
const Status = require('../models/Status');
const StatusMute = require('../models/StatusMute');
const User = require('../models/User');
const Conversation = require('../models/conversation');
const Message = require('../models/Message');
const { generateUploadSignature, verifyAndGetResource, destroyResource } = require('../src/cloudaniry');
const { canViewStatus } = require('../utils/statusPrivacy');

// Validation Schemas
const createStatusSchema = z.object({
    type: z.enum(['text', 'image', 'video']),
    text: z.string().max(700).optional(),
    backgroundColor: z.string().max(50).optional(),
    fontStyle: z.string().max(50).optional(),
    publicId: z.string().optional(),
    caption: z.string().max(700).optional(),
    resourceType: z.enum(['image', 'video']).optional(),
    privacy: z.object({
        mode: z.enum(['contacts', 'contacts_except', 'only_share']),
        userIds: z.array(z.string()).optional().default([])
    }).optional()
});

const replyStatusSchema = z.object({
    message: z.string().min(1, 'Message cannot be empty').max(2000)
});

const statusPrivacySchema = z.object({
    mode: z.enum(['contacts', 'contacts_except', 'only_share']),
    userIds: z.array(z.string()).optional().default([])
});

/**
 * GET /api/status/upload-signature
 * Return signed Cloudinary upload params so client uploads directly to Cloudinary
 */
exports.getUploadSignature = async (req, res) => {
    try {
        const folder = process.env.CLOUDINARY_STATUS_FOLDER || 'whatsapp_status';
        const signatureData = generateUploadSignature(folder);
        return res.status(200).json({
            success: true,
            data: signatureData
        });
    } catch (error) {
        console.error('Error generating upload signature:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to generate upload signature' });
    }
};

/**
 * POST /api/status
 * Create a new text or media status
 */
exports.createStatus = async (req, res) => {
    try {
        const parsed = createStatusSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: 'Invalid request data',
                errors: parsed.error.issues
            });
        }

        const { type, text, backgroundColor, fontStyle, publicId, caption, resourceType, privacy } = parsed.data;
        const userId = req.user._id;

        // Determine privacy config: use request privacy or user's default statusPrivacy
        let finalPrivacy = privacy;
        if (!finalPrivacy) {
            const currentUser = await User.findById(userId).select('statusPrivacy').lean();
            finalPrivacy = currentUser?.statusPrivacy || { mode: 'contacts', userIds: [] };
        }

        let mediaData = null;

        if (type === 'text') {
            if (!text || !text.trim()) {
                return res.status(400).json({ success: false, message: 'Text is required for text status' });
            }
        } else if (type === 'image' || type === 'video') {
            if (!publicId) {
                return res.status(400).json({ success: false, message: 'publicId is required for media status' });
            }

            // Verify the asset directly on Cloudinary
            let resource;
            try {
                resource = await verifyAndGetResource(publicId, resourceType || type);
            } catch (err) {
                return res.status(400).json({ success: false, message: 'Cloudinary asset verification failed' });
            }

            // Server-side limits enforcement
            // 1. Image limits: max 10MB, formats: jpg, jpeg, png, webp
            if (type === 'image') {
                const maxImageBytes = 10 * 1024 * 1024; // 10MB
                if (resource.bytes > maxImageBytes) {
                    await destroyResource(publicId, 'image');
                    return res.status(400).json({ success: false, message: 'Image size exceeds maximum limit of 10MB' });
                }
                const allowedFormats = ['jpg', 'jpeg', 'png', 'webp'];
                if (resource.format && !allowedFormats.includes(resource.format.toLowerCase())) {
                    await destroyResource(publicId, 'image');
                    return res.status(400).json({ success: false, message: 'Invalid image format. Allowed: JPG, PNG, WEBP' });
                }
            }

            // 2. Video limits: max 30 seconds, max 50MB, formats: mp4, webm, mov
            if (type === 'video') {
                const maxVideoBytes = 50 * 1024 * 1024; // 50MB
                if (resource.bytes > maxVideoBytes) {
                    await destroyResource(publicId, 'video');
                    return res.status(400).json({ success: false, message: 'Video size exceeds maximum limit of 50MB' });
                }
                // Allow a small grace margin (31s) for encoding variance
                if (resource.duration && resource.duration > 31) {
                    await destroyResource(publicId, 'video');
                    return res.status(400).json({ success: false, message: 'Video duration exceeds maximum limit of 30 seconds' });
                }
                const allowedFormats = ['mp4', 'webm', 'mov', 'quicktime'];
                if (resource.format && !allowedFormats.includes(resource.format.toLowerCase())) {
                    await destroyResource(publicId, 'video');
                    return res.status(400).json({ success: false, message: 'Invalid video format. Allowed: MP4, WEBM, MOV' });
                }
            }

            mediaData = {
                url: resource.secure_url,
                publicId: resource.public_id,
                resourceType: type,
                width: resource.width,
                height: resource.height,
                durationInSeconds: resource.duration ? Math.round(resource.duration) : 0,
                bytes: resource.bytes
            };
        }

        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const newStatus = new Status({
            user: userId,
            type,
            text: type === 'text' ? text.trim() : undefined,
            backgroundColor: backgroundColor || '#075E54',
            fontStyle: fontStyle || 'sans',
            media: mediaData,
            caption: caption ? caption.trim() : undefined,
            privacy: finalPrivacy,
            expiresAt
        });

        await newStatus.save();

        const populated = await Status.findById(newStatus._id)
            .populate('user', 'username name profilePicture')
            .lean();

        // Real-time socket emission
        if (req.io) {
            // Find users who have muted this creator
            const mutedDocs = await StatusMute.find({ mutedUser: userId }).select('user').lean();
            const mutedUserIds = new Set(mutedDocs.map((d) => d.user.toString()));

            const socketPayload = {
                ownerId: userId.toString(),
                statusId: newStatus._id.toString(),
                type: newStatus.type,
                createdAt: newStatus.createdAt
            };

            // If socketUserMap is available, target online users
            if (req.socketUserMap) {
                for (const [connectedUserId] of req.socketUserMap.entries()) {
                    if (connectedUserId !== userId.toString()) {
                        if (canViewStatus(connectedUserId, newStatus) && !mutedUserIds.has(connectedUserId)) {
                            req.io.to(connectedUserId).to(`user:${connectedUserId}`).emit('status:new', socketPayload);
                        }
                    }
                }
            } else {
                req.io.emit('status:new', socketPayload);
            }
        }

        return res.status(201).json({
            success: true,
            message: 'Status created successfully',
            data: populated
        });
    } catch (error) {
        console.error('Error creating status:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to create status' });
    }
};

/**
 * GET /api/status/feed
 * Grouped feed: my status group, contact groups (unviewed first), and muted groups
 */
exports.getFeed = async (req, res) => {
    try {
        const currentUserId = req.user._id.toString();
        const now = new Date();

        // Find all active statuses
        const activeStatuses = await Status.find({
            expiresAt: { $gt: now }
        })
            .populate('user', 'username name profilePicture')
            .sort({ createdAt: 1 })
            .lean();

        // Users muted by the current user
        const mutedRecords = await StatusMute.find({ user: req.user._id }).select('mutedUser').lean();
        const mutedUserSet = new Set(mutedRecords.map((m) => m.mutedUser.toString()));

        let myStatuses = [];
        const contactMap = new Map(); // userId -> { user, statuses, hasUnviewed, latestAt }
        const mutedMap = new Map();

        for (const status of activeStatuses) {
            const ownerId = status.user?._id?.toString() || status.user?.toString();

            // Check if current user is allowed to view
            if (!canViewStatus(currentUserId, status)) {
                continue;
            }

            const isMyStatus = ownerId === currentUserId;
            const hasViewed = status.viewers?.some(
                (v) => (v.user?._id || v.user)?.toString() === currentUserId
            );

            if (isMyStatus) {
                // Owner gets full status info including viewer count and viewers list
                myStatuses.push({
                    ...status,
                    viewCount: status.viewers?.length || 0
                });
            } else {
                // Non-owners DO NOT get the viewers array (privacy projection)
                const sanitizedStatus = {
                    _id: status._id,
                    user: status.user,
                    type: status.type,
                    text: status.text,
                    backgroundColor: status.backgroundColor,
                    fontStyle: status.fontStyle,
                    media: status.media,
                    caption: status.caption,
                    createdAt: status.createdAt,
                    expiresAt: status.expiresAt,
                    hasViewed: !!hasViewed
                };

                const isMuted = mutedUserSet.has(ownerId);
                const targetMap = isMuted ? mutedMap : contactMap;

                if (!targetMap.has(ownerId)) {
                    targetMap.set(ownerId, {
                        user: status.user,
                        statuses: [],
                        hasUnviewed: false,
                        latestAt: status.createdAt,
                        isMuted
                    });
                }

                const group = targetMap.get(ownerId);
                group.statuses.push(sanitizedStatus);
                if (!hasViewed) {
                    group.hasUnviewed = true;
                }
                if (new Date(status.createdAt) > new Date(group.latestAt)) {
                    group.latestAt = status.createdAt;
                }
            }
        }

        // Sort contact groups: unviewed first, then by latestAt descending
        const contacts = Array.from(contactMap.values()).sort((a, b) => {
            if (a.hasUnviewed && !b.hasUnviewed) return -1;
            if (!a.hasUnviewed && b.hasUnviewed) return 1;
            return new Date(b.latestAt) - new Date(a.latestAt);
        });

        const muted = Array.from(mutedMap.values()).sort(
            (a, b) => new Date(b.latestAt) - new Date(a.latestAt)
        );

        const myGroup = myStatuses.length > 0 ? {
            user: {
                _id: req.user._id,
                username: req.user.username,
                name: req.user.name,
                profilePicture: req.user.profilePicture
            },
            statuses: myStatuses,
            latestAt: myStatuses[myStatuses.length - 1]?.createdAt || null,
            totalViews: myStatuses.reduce((acc, curr) => acc + (curr.viewCount || 0), 0)
        } : null;

        return res.status(200).json({
            success: true,
            data: {
                myStatus: myGroup,
                contacts,
                muted
            }
        });
    } catch (error) {
        console.error('Error fetching status feed:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch status feed' });
    }
};

/**
 * GET /api/status/mine
 * Return active statuses of logged-in user with full viewer details
 */
exports.getMyStatuses = async (req, res) => {
    try {
        const statuses = await Status.find({
            user: req.user._id,
            expiresAt: { $gt: new Date() }
        })
            .populate('viewers.user', 'username name profilePicture')
            .sort({ createdAt: 1 })
            .lean();

        return res.status(200).json({
            success: true,
            data: statuses
        });
    } catch (error) {
        console.error('Error fetching my statuses:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch active statuses' });
    }
};

/**
 * POST /api/status/:id/view
 * Mark status as viewed (idempotent, never counts owner)
 */
exports.viewStatus = async (req, res) => {
    try {
        const statusId = req.params.id;
        const currentUserId = req.user._id.toString();

        const status = await Status.findById(statusId);
        if (!status) {
            return res.status(404).json({ success: false, message: 'Status not found' });
        }

        if (new Date() >= new Date(status.expiresAt)) {
            return res.status(410).json({ success: false, message: 'Status has expired' });
        }

        // Verify privacy permission
        if (!canViewStatus(currentUserId, status)) {
            return res.status(403).json({ success: false, message: 'Not authorized to view this status' });
        }

        const ownerId = status.user.toString();

        // Viewing own status does not record as a viewer
        if (ownerId === currentUserId) {
            return res.status(200).json({ success: true, message: 'Owner viewed own status', viewCount: status.viewers.length });
        }

        const alreadyViewed = status.viewers.some((v) => v.user.toString() === currentUserId);

        if (!alreadyViewed) {
            const viewedAt = new Date();
            status.viewers.push({
                user: req.user._id,
                viewedAt
            });
            await status.save();

            // Emit status:viewed live update to owner
            if (req.io) {
                const viewerInfo = {
                    _id: req.user._id,
                    username: req.user.username,
                    name: req.user.name,
                    profilePicture: req.user.profilePicture
                };
                req.io.to(ownerId).to(`user:${ownerId}`).emit('status:viewed', {
                    statusId: status._id.toString(),
                    viewer: viewerInfo,
                    viewedAt,
                    viewCount: status.viewers.length
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Status marked as viewed',
            viewCount: status.viewers.length
        });
    } catch (error) {
        console.error('Error viewing status:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to mark status as viewed' });
    }
};

/**
 * GET /api/status/:id/viewers
 * Owner-only: List of viewers with viewedAt, newest first
 */
exports.getViewers = async (req, res) => {
    try {
        const statusId = req.params.id;
        const currentUserId = req.user._id.toString();

        const status = await Status.findById(statusId)
            .populate('viewers.user', 'username name profilePicture')
            .lean();

        if (!status) {
            return res.status(404).json({ success: false, message: 'Status not found' });
        }

        if (status.user.toString() !== currentUserId) {
            return res.status(403).json({ success: false, message: 'Forbidden: only the owner can view status viewers' });
        }

        const sortedViewers = (status.viewers || []).slice().sort((a, b) => new Date(b.viewedAt) - new Date(a.viewedAt));

        return res.status(200).json({
            success: true,
            data: {
                statusId: status._id,
                viewCount: sortedViewers.length,
                viewers: sortedViewers
            }
        });
    } catch (error) {
        console.error('Error fetching status viewers:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch status viewers' });
    }
};

/**
 * DELETE /api/status/:id
 * Owner-only: Deletes the record and Cloudinary asset
 */
exports.deleteStatus = async (req, res) => {
    try {
        const statusId = req.params.id;
        const currentUserId = req.user._id.toString();

        const status = await Status.findById(statusId);
        if (!status) {
            return res.status(404).json({ success: false, message: 'Status not found' });
        }

        if (status.user.toString() !== currentUserId) {
            return res.status(403).json({ success: false, message: 'Forbidden: only the owner can delete this status' });
        }

        // Delete asset from Cloudinary if media
        if (status.media && status.media.publicId) {
            try {
                const resType = status.media.resourceType || (status.type === 'video' ? 'video' : 'image');
                await destroyResource(status.media.publicId, resType);
            } catch (destroyErr) {
                console.error('Error deleting Cloudinary asset:', destroyErr.message);
            }
        }

        await Status.findByIdAndDelete(statusId);

        // Emit real-time deletion
        if (req.io) {
            req.io.emit('status:deleted', {
                statusId: statusId.toString(),
                ownerId: currentUserId
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Status deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting status:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to delete status' });
    }
};

/**
 * POST /api/status/:id/reply
 * Reply to a status: creates a normal chat message in the 1:1 chat with the owner,
 * with a replyTo reference to the status, and emits normal chat message events.
 */
exports.replyStatus = async (req, res) => {
    try {
        const statusId = req.params.id;
        const currentUserId = req.user._id;

        const parsed = replyStatusSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: 'Invalid reply data',
                errors: parsed.error.issues
            });
        }

        const { message } = parsed.data;

        const status = await Status.findById(statusId).populate('user', 'username name profilePicture');
        if (!status) {
            return res.status(404).json({ success: false, message: 'Status not found' });
        }

        if (new Date() >= new Date(status.expiresAt)) {
            return res.status(410).json({ success: false, message: 'Cannot reply to an expired status' });
        }

        if (!canViewStatus(currentUserId, status)) {
            return res.status(403).json({ success: false, message: 'Not authorized to reply to this status' });
        }

        const targetOwnerId = status.user._id;
        const participants = [currentUserId, targetOwnerId].sort();

        let conversation = await Conversation.findOne({ participants });
        if (!conversation) {
            conversation = new Conversation({ participants, messages: [] });
            await conversation.save();
        }

        const quoteText = status.type === 'text' ? status.text : (status.caption || 'Status update');
        const quoteMediaUrl = status.media?.url || null;

        const newMessage = new Message({
            conversationId: conversation._id,
            senderId: currentUserId,
            receiverId: targetOwnerId,
            message: message.trim(),
            contentType: 'text',
            replyTo: {
                statusId: status._id,
                senderName: status.user.username || status.user.name || 'Status',
                text: quoteText,
                mediaUrl: quoteMediaUrl,
                contentType: status.type
            },
            messageStatus: 'sent'
        });

        await newMessage.save();

        conversation.lastMessage = newMessage._id;
        conversation.messages.push(newMessage._id);
        conversation.unreadCount = (conversation.unreadCount || 0) + 1;
        await conversation.save();

        const populatedMessage = await Message.findById(newMessage._id)
            .populate('senderId', 'username name profilePicture')
            .populate('receiverId', 'username name profilePicture');

        // Emit through existing chat socket events
        if (req.io) {
            const receiverStr = targetOwnerId.toString();
            req.io.to(receiverStr).to(`user:${receiverStr}`).emit('newMessage', populatedMessage);
            req.io.to(receiverStr).to(`user:${receiverStr}`).emit('receive_message', populatedMessage);
        }

        return res.status(201).json({
            success: true,
            message: 'Status reply sent successfully',
            data: populatedMessage
        });
    } catch (error) {
        console.error('Error replying to status:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to reply to status' });
    }
};

/**
 * POST /api/status/mute/:userId
 * Mute a user's status updates
 */
exports.muteUser = async (req, res) => {
    try {
        const mutedUserId = req.params.userId;
        const currentUserId = req.user._id;

        if (mutedUserId === currentUserId.toString()) {
            return res.status(400).json({ success: false, message: 'Cannot mute yourself' });
        }

        await StatusMute.findOneAndUpdate(
            { user: currentUserId, mutedUser: mutedUserId },
            { user: currentUserId, mutedUser: mutedUserId },
            { upsert: true, new: true }
        );

        return res.status(200).json({ success: true, message: 'User status muted successfully' });
    } catch (error) {
        console.error('Error muting status:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to mute user' });
    }
};

/**
 * DELETE /api/status/mute/:userId
 * Unmute a user's status updates
 */
exports.unmuteUser = async (req, res) => {
    try {
        const mutedUserId = req.params.userId;
        const currentUserId = req.user._id;

        await StatusMute.findOneAndDelete({ user: currentUserId, mutedUser: mutedUserId });

        return res.status(200).json({ success: true, message: 'User status unmuted successfully' });
    } catch (error) {
        console.error('Error unmuting status:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to unmute user' });
    }
};

/**
 * PATCH /api/users/me/status-privacy
 * Update user default status privacy setting
 */
exports.updateStatusPrivacy = async (req, res) => {
    try {
        const parsed = statusPrivacySchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: 'Invalid privacy settings',
                errors: parsed.error.issues
            });
        }

        const { mode, userIds } = parsed.data;
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { statusPrivacy: { mode, userIds: userIds || [] } },
            { new: true }
        ).select('statusPrivacy');

        return res.status(200).json({
            success: true,
            message: 'Status privacy settings updated successfully. Changes apply to future status updates.',
            data: user.statusPrivacy
        });
    } catch (error) {
        console.error('Error updating status privacy:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to update status privacy' });
    }
};
