const jwt = require("jsonwebtoken");
const User = require("../models/User")

const generateJsonWebToken = (_id, email) => {
    return jwt.sign({ _id: _id, email: email }, process.env.JWT_SECRET_KEY, { expiresIn: "1d" });
}
module.exports = generateJsonWebToken;