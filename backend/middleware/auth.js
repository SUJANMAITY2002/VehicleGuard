const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Verifies the Bearer token and attaches the user to req.user
const verifyToken = async (req, res, next) => {

    try {

        const header = req.headers.authorization || "";
        const token = header.startsWith("Bearer ") ? header.slice(7) : null;

        if (!token) {
            return res.status(401).json({ message: "No token provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({ message: "User no longer exists" });
        }

        req.user = user;
        next();

    } catch (error) {

        res.status(401).json({ message: "Invalid or expired token" });

    }

};

// Must be used after verifyToken
const requireAdmin = (req, res, next) => {

    if (!req.user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
    }

    next();

};

module.exports = { verifyToken, requireAdmin };