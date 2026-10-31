const { z } = require('zod');
const groupService = require('../services/groupService');
const { uploadFileTocloudinary } = require('../src/cloudaniry');

const createGroupSchema = z.object({
    name: z.string().trim().min(1, 'Group name is required').max(100, 'Group name cannot exceed 100 characters'),
    description: z.string().max(500, 'Description cannot exceed 500 characters').optional().default(''),
    avatar: z.string().optional().default(''),
    memberIds: z.union([z.array(z.string()), z.string()]).transform((val) => {
        if (typeof val === 'string') {
            try {
                const parsed = JSON.parse(val);
                return Array.isArray(parsed) ? parsed : [val];
            } catch {
                return [val];
            }
        }
        return val || [];
    }).optional().default([])
});

const updateGroupSchema = z.object({
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    avatar: z.string().optional(),
    settings: z.object({
        whoCanSend: z.enum(['all', 'admins']).optional(),
        whoCanEditInfo: z.enum(['all', 'admins']).optional(),
        inviteLinkEnabled: z.boolean().optional()
    }).optional()
});

const addMembersSchema = z.object({
    memberIds: z.array(z.string().min(1)).min(1, 'At least one member ID is required')
});

const changeRoleSchema = z.object({
    role: z.enum(['admin', 'member'], { errorMap: () => ({ message: 'Role must be admin or member' }) })
});

const transferOwnershipSchema = z.object({
    newOwnerId: z.string().min(1, 'New owner ID is required')
});

const sendMessageSchema = z.object({
    message: z.string().optional().default(''),
    contentType: z.enum(['text', 'image', 'file', 'video', 'audio']).optional().default('text'),
    fileUrl: z.string().optional(),
    fileName: z.string().optional(),
    fileSize: z.number().optional(),
    replyTo: z.string().optional().nullable(),
    mentions: z.array(z.string()).optional().default([])
});

// Helper for error formatting
const handleError = (res, error) => {
    if (error instanceof z.ZodError) {
        return res.status(400).json({
            message: error.errors[0]?.message || 'Validation error',
            errors: error.errors
        });
    }
    const status = error.status || 500;
    const message = error.message || 'Internal server error';
    return res.status(status).json({ message });
};

/**
 * POST /api/groups
 */
exports.createGroup = async (req, res) => {
    try {
        const body = createGroupSchema.parse(req.body);
        let avatar = body.avatar;
        if (req.file) {
            try {
                const uploadResult = await uploadFileTocloudinary(req.file);
                if (uploadResult?.secure_url) {
                    avatar = uploadResult.secure_url;
                }
            } catch (upErr) {
                console.warn('Avatar upload fallback:', upErr.message);
            }
        }

        const group = await groupService.createGroup(
            req.user._id,
            { ...body, avatar },
            req.io
        );
        return res.status(201).json({ success: true, group });
    } catch (err) {
        return handleError(res, err);
    }
};

/**
 * GET /api/groups
 */
exports.getMyGroups = async (req, res) => {
    try {
        const groups = await groupService.getMyGroups(req.user._id);
        return res.status(200).json({ success: true, groups });
    } catch (err) {
        return handleError(res, err);
    }
};

/**
 * GET /api/groups/:id
 */
exports.getGroupDetails = async (req, res) => {
    try {
        const group = await groupService.getGroupDetails(req.params.id, req.user._id);
        return res.status(200).json({ success: true, group });
    } catch (err) {
        return handleError(res, err);
    }
};

/**
 * PATCH /api/groups/:id
 */
exports.updateGroup = async (req, res) => {
    try {
        const body = updateGroupSchema.parse(req.body);
        let avatar = body.avatar;
        if (req.file) {
            try {
                const uploadResult = await uploadFileTocloudinary(req.file);
                if (uploadResult?.secure_url) {
                    avatar = uploadResult.secure_url;
                }
            } catch (upErr) {
                console.warn('Avatar upload fallback:', upErr.message);
            }
        }
        const updates = { ...body };
        if (avatar) updates.avatar = avatar;

        const group = await groupService.updateGroup(req.params.id, req.user._id, updates, req.io);
        return res.status(200).json({ success: true, group });
    } catch (err) {
        return handleError(res, err);
    }
};

/**
 * POST /api/groups/:id/members
 */
exports.addMembers = async (req, res) => {
    try {
        const body = addMembersSchema.parse(req.body);
        const group = await groupService.addMembers(req.params.id, req.user._id, body.memberIds, req.io);
        return res.status(200).json({ success: true, group });
    } catch (err) {
        return handleError(res, err);
    }
};

/**
 * DELETE /api/groups/:id/members/:userId
 */
exports.removeMember = async (req, res) => {
    try {
        const group = await groupService.removeMember(req.params.id, req.user._id, req.params.userId, req.io);
        return res.status(200).json({ success: true, group });
    } catch (err) {
        return handleError(res, err);
    }
};

/**
 * POST /api/groups/:id/leave
 */
exports.leaveGroup = async (req, res) => {
    try {
        const result = await groupService.leaveGroup(req.params.id, req.user._id, req.io);
        return res.status(200).json({ success: true, ...result });
    } catch (err) {
        return handleError(res, err);
    }
};

/**
 * PATCH /api/groups/:id/members/:userId/role
 */
exports.changeRole = async (req, res) => {
    try {
        const body = changeRoleSchema.parse(req.body);
        const group = await groupService.changeRole(req.params.id, req.user._id, req.params.userId, body.role, req.io);
        return res.status(200).json({ success: true, group });
    } catch (err) {
        return handleError(res, err);
    }
};

/**
 * POST /api/groups/:id/transfer-ownership
 */
exports.transferOwnership = async (req, res) => {
    try {
        const body = transferOwnershipSchema.parse(req.body);
        const group = await groupService.transferOwnership(req.params.id, req.user._id, body.newOwnerId, req.io);
        return res.status(200).json({ success: true, group });
    } catch (err) {
        return handleError(res, err);
    }
};

/**
 * POST /api/groups/:id/invite-link (also reset)
 */
exports.generateInviteLink = async (req, res) => {
    try {
        const reset = req.query.reset === 'true' || req.body.reset === true;
        const result = await groupService.generateOrResetInviteLink(req.params.id, req.user._id, reset);
        return res.status(200).json({ success: true, ...result });
    } catch (err) {
        return handleError(res, err);
    }
};

/**
 * POST /api/groups/join/:inviteCode
 */
exports.joinViaInvite = async (req, res) => {
    try {
        const group = await groupService.joinViaInvite(req.params.inviteCode, req.user._id, req.io);
        return res.status(200).json({ success: true, group });
    } catch (err) {
        return handleError(res, err);
    }
};

/**
 * DELETE /api/groups/:id
 */
exports.deleteGroup = async (req, res) => {
    try {
        const result = await groupService.deleteGroup(req.params.id, req.user._id, req.io);
        return res.status(200).json({ success: true, ...result });
    } catch (err) {
        return handleError(res, err);
    }
};

/**
 * GET /api/groups/:id/messages?cursor=&limit=
 */
exports.getGroupMessages = async (req, res) => {
    try {
        const { cursor, limit } = req.query;
        const result = await groupService.getGroupMessages(req.params.id, req.user._id, { cursor, limit });
        return res.status(200).json({ success: true, ...result });
    } catch (err) {
        return handleError(res, err);
    }
};

/**
 * POST /api/groups/:id/messages
 */
exports.sendGroupMessage = async (req, res) => {
    try {
        let payload = { ...req.body };
        if (req.file) {
            try {
                const uploadResult = await uploadFileTocloudinary(req.file);
                if (uploadResult?.secure_url) {
                    payload.fileUrl = uploadResult.secure_url;
                    payload.fileName = req.file.originalname;
                    payload.fileSize = req.file.size;
                    if (!payload.contentType || payload.contentType === 'text') {
                        payload.contentType = req.file.mimetype.startsWith('image/')
                            ? 'image'
                            : req.file.mimetype.startsWith('video/')
                            ? 'video'
                            : 'file';
                    }
                }
            } catch (upErr) {
                console.warn('File upload fallback:', upErr.message);
            }
        }
        if (typeof payload.mentions === 'string') {
            try {
                payload.mentions = JSON.parse(payload.mentions);
            } catch {
                payload.mentions = [];
            }
        }

        const validated = sendMessageSchema.parse(payload);
        const message = await groupService.sendGroupMessage(req.params.id, req.user._id, validated, req.io);
        return res.status(201).json({ success: true, message });
    } catch (err) {
        return handleError(res, err);
    }
};

/**
 * POST /api/groups/:id/read
 */
exports.markAsRead = async (req, res) => {
    try {
        const { messageId } = req.body;
        const result = await groupService.markGroupMessagesRead(req.params.id, req.user._id, messageId, req.io);
        return res.status(200).json({ success: true, ...result });
    } catch (err) {
        return handleError(res, err);
    }
};

/**
 * GET /api/groups/messages/:messageId/info
 */
exports.getMessageInfo = async (req, res) => {
    try {
        const info = await groupService.getMessageInfo(req.params.messageId, req.user._id);
        return res.status(200).json({ success: true, ...info });
    } catch (err) {
        return handleError(res, err);
    }
};
