const jwt = require("jsonwebtoken")

const authMiddleWare = (req, res, next) => {
   
    const authToken = req.cookies?.jwt;

    if (!authToken) {
        return res.status(401).json({ message: "no token is present" });
    }

    try {
        const decode = jwt.verify(authToken, process.env.JWT_SECRET_KEY)
        req.user = decode;
        next();
    }
    catch (error) {
        return res.status(401).json({ message: "invalid expired token" });
    }
}
module.exports = { authMiddleWare }