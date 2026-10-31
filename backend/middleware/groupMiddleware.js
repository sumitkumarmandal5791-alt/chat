const Group = require('../models/Group');

const isGroupMember = async (req, res, next) => {
    try {
        const groupId = req.params.id || req.params.groupId || req.body.groupId;
        const userId = req.user._id.toString();

        if (!groupId) {
            return res.status(400).json({ success: false, message: 'Group ID is required' });
        }

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ success: false, message: 'Group not found' });
        }

        const membership = group.members.find(
            (m) => m.userId.toString() === userId
        );

        if (!membership) {
            return res.status(403).json({ success: false, message: 'You are not a member of this group' });
        }

        req.group = group;
        req.membership = membership;
        next();
    } catch (error) {
        console.error('Error in isGroupMember middleware:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error in group authorization' });
    }
};

const isGroupAdmin = async (req, res, next) => {
    try {
        if (!req.group || !req.membership) {
            return isGroupMember(req, res, () => {
                if (req.membership.role !== 'admin' && req.membership.role !== 'owner') {
                    return res.status(403).json({ success: false, message: 'Only group admins can perform this action' });
                }
                next();
            });
        }

        if (req.membership.role !== 'admin' && req.membership.role !== 'owner') {
            return res.status(403).json({ success: false, message: 'Only group admins can perform this action' });
        }

        next();
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal server error in admin authorization' });
    }
};

const isGroupOwner = async (req, res, next) => {
    try {
        if (!req.group || !req.membership) {
            return isGroupMember(req, res, () => {
                if (req.membership.role !== 'owner') {
                    return res.status(403).json({ success: false, message: 'Only the group owner can perform this action' });
                }
                next();
            });
        }

        if (req.membership.role !== 'owner') {
            return res.status(403).json({ success: false, message: 'Only the group owner can perform this action' });
        }

        next();
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal server error in owner authorization' });
    }
};

module.exports = {
    isGroupMember,
    isGroupAdmin,
    isGroupOwner
};

