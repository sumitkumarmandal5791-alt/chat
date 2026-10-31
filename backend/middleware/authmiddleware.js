const jwt = require('jsonwebtoken');
const { verifyAccessToken } = require('../utils/tokenService');

const authMiddleWare = (req, res, next) => {
    try {
        let token = null;

        // 1. Check Authorization Bearer header
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }

        // 2. Check cookies
        if (!token && req.cookies) {
            token = req.cookies.accessToken || req.cookies.jwt;
        }

        if (!token) {
            return res.status(401).json({
                message: 'Unauthorized: Authentication required',
                code: 'NO_TOKEN'
            });
        }

        // Verify token
        try {
            const decoded = verifyAccessToken(token);
            req.user = decoded;
            req.userId = decoded._id;
            return next();
        } catch (jwtErr) {
            if (jwtErr.name === 'TokenExpiredError') {
                return res.status(401).json({
                    message: 'Access token expired',
                    code: 'TOKEN_EXPIRED'
                });
            }
            return res.status(401).json({
                message: 'Invalid access token',
                code: 'INVALID_TOKEN'
            });
        }
    } catch (error) {
        return res.status(500).json({
            message: 'Internal server error in authentication middleware'
        });
    }
};

module.exports = { authMiddleWare };
