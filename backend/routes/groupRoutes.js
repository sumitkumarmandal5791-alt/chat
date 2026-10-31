const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const { authMiddleWare } = require('../middleware/authmiddleware');
const { isGroupMember, isGroupAdmin, isGroupOwner } = require('../middleware/groupMiddleware');
const { multerMiddleWare } = require('../src/cloudaniry');

// 1. Group CRUD & listings
router.post('/', authMiddleWare, multerMiddleWare, groupController.createGroup);
router.get('/', authMiddleWare, groupController.getMyGroups);
router.get('/:id', authMiddleWare, isGroupMember, groupController.getGroupDetails);
router.patch('/:id', authMiddleWare, isGroupMember, multerMiddleWare, groupController.updateGroup);
router.delete('/:id', authMiddleWare, isGroupOwner, groupController.deleteGroup);

// 2. Member management
router.post('/:id/members', authMiddleWare, isGroupAdmin, groupController.addMembers);
router.delete('/:id/members/:userId', authMiddleWare, isGroupAdmin, groupController.removeMember);
router.patch('/:id/members/:userId/role', authMiddleWare, isGroupAdmin, groupController.changeRole);
router.post('/:id/transfer-ownership', authMiddleWare, isGroupOwner, groupController.transferOwnership);
router.post('/:id/leave', authMiddleWare, isGroupMember, groupController.leaveGroup);

// 3. Invites
router.post('/:id/invite-link', authMiddleWare, isGroupAdmin, groupController.generateInviteLink);
router.post('/join/:inviteCode', authMiddleWare, groupController.joinViaInvite);

// 4. Messages & read receipts
router.get('/:id/messages', authMiddleWare, isGroupMember, groupController.getGroupMessages);
router.post('/:id/messages', authMiddleWare, isGroupMember, multerMiddleWare, groupController.sendGroupMessage);
router.post('/:id/read', authMiddleWare, isGroupMember, groupController.markAsRead);
router.get('/messages/:messageId/info', authMiddleWare, groupController.getMessageInfo);

module.exports = router;

