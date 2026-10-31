const cron = require('node-cron');
const Status = require('../models/Status');
const { destroyResource } = require('../src/cloudaniry');

/**
 * Cleanup expired status assets from Cloudinary
 * Runs every 15 minutes. Also safe to call manually.
 */
const cleanupExpiredStatuses = async () => {
    try {
        const now = new Date();
        // Look for statuses that have reached or passed expiry
        const expiredStatuses = await Status.find({
            expiresAt: { $lte: now },
            'media.publicId': { $exists: true, $ne: null }
        }).lean();

        if (expiredStatuses.length > 0) {
            console.log(`[Status Cleanup] Found ${expiredStatuses.length} expired statuses with Cloudinary assets.`);

            for (const status of expiredStatuses) {
                if (status.media && status.media.publicId) {
                    try {
                        const resType = status.media.resourceType || (status.type === 'video' ? 'video' : 'image');
                        await destroyResource(status.media.publicId, resType);
                        console.log(`[Status Cleanup] Cleaned up asset: ${status.media.publicId}`);
                    } catch (err) {
                        console.error(`[Status Cleanup Error] Could not destroy asset ${status.media.publicId}:`, err.message);
                    }
                }
            }
        }
    } catch (error) {
        console.error('[Status Cleanup] Unexpected error during cleanup run:', error.message);
    }
};

const initStatusCleanupJob = () => {
    // Schedule to run every 15 minutes: '*/15 * * * *'
    cron.schedule('*/15 * * * *', async () => {
        console.log('[Cron] Running status cleanup job...');
        await cleanupExpiredStatuses();
    });
    console.log('[Cron] Status cleanup job scheduled (every 15m).');
};

module.exports = {
    initStatusCleanupJob,
    cleanupExpiredStatuses
};

