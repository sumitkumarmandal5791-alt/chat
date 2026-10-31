const express = require('express');
const statusController = require('../controllers/statusController');
const { authMiddleWare } = require('../middleware/authmiddleware');

const router = express.Router();

// Direct Cloudinary upload signature
router.get('/upload-signature', authMiddleWare, statusController.getUploadSignature);

// Status CRUD & Feed
router.post('/', authMiddleWare, statusController.createStatus);
router.get('/feed', authMiddleWare, statusController.getFeed);
router.get('/mine', authMiddleWare, statusController.getMyStatuses);

// Views and Viewers
router.post('/:id/view', authMiddleWare, statusController.viewStatus);
router.get('/:id/viewers', authMiddleWare, statusController.getViewers);

// Delete Status
router.delete('/:id', authMiddleWare, statusController.deleteStatus);

// Reply to Status (creates 1:1 message)
router.post('/:id/reply', authMiddleWare, statusController.replyStatus);

// Status Muting
router.post('/mute/:userId', authMiddleWare, statusController.muteUser);
router.delete('/mute/:userId', authMiddleWare, statusController.unmuteUser);

// Status Privacy Defaults
router.patch('/privacy', authMiddleWare, statusController.updateStatusPrivacy);

module.exports = router;
