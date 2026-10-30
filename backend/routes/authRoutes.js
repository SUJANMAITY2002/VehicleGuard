const express = require("express");
const router = express.Router();

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const { verifyToken, requireAdmin } = require("../middleware/auth");


// SIGNIN
router.post("/Signin", async (req, res) => {

    try {

        const { userId, password } = req.body;

        if (!userId || !password) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        const user = await User.findOne({ userId });

        if (!user) {
            return res.status(400).json({
                message: "User not found"
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({
                message: "Invalid Password"
            });
        }

        const token = jwt.sign(
            {
                id: user._id,
                name: user.name
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        res.status(200).json({
            message: "Login Successful",
            token,
            user: {
                userId: user.userId,
                name: user.name,
                phone: user.phone,
                isAdmin: user.isAdmin
                // canRead: user.canRead,   // Read/Write feature currently disabled
                // canWrite: user.canWrite  // Read/Write feature currently disabled
            }
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: "Server Error"
        });

    }

});


// ADMIN-EXISTS
// Public. Tells the frontend whether the one-time first-admin setup
// screen should still be shown.
router.get("/admin-exists", async (req, res) => {

    try {

        const exists = await User.exists({ isAdmin: true });

        res.status(200).json({
            exists: !!exists
        });

    } catch (error) {

        res.status(500).json({
            message: "Server Error"
        });

    }

});


// CREATE FIRST ADMIN
// Public, but only works once — locks itself as soon as any admin exists.
router.post("/create-first-admin", async (req, res) => {

    try {

        const { userId, name, phone, password } = req.body;

        if (!userId || !name || !phone || !password) {
            return res.status(400).json({
                message: "Please fill in all fields"
            });
        }

        const adminAlreadyExists = await User.exists({ isAdmin: true });

        if (adminAlreadyExists) {
            return res.status(403).json({
                message: "An admin already exists. This setup step is locked"
            });
        }

        const existingUser = await User.findOne({ userId });

        if (existingUser) {
            return res.status(400).json({
                message: "A user with that User ID already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newAdmin = new User({
            userId,
            name,
            phone,
            password: hashedPassword,
            isAdmin: true
            // canRead: true,  // Read/Write feature currently disabled
            // canWrite: true  // Read/Write feature currently disabled
        });

        await newAdmin.save();

        res.status(201).json({
            message: "Admin account created"
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

});


// ADD USER
// Admin-only. Creates any subsequent user, with whichever
// admin flag was chosen on the form.
router.post("/add-user", verifyToken, requireAdmin, async (req, res) => {

    try {

        const { userId, name, phone, password, isAdmin /*, canRead, canWrite */ } = req.body;

        if (!userId || !name || !phone || !password) {
            return res.status(400).json({
                message: "Please fill in all fields"
            });
        }

        const existingUser = await User.findOne({ userId });

        if (existingUser) {
            return res.status(400).json({
                message: "A user with that User ID already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            userId,
            name,
            phone,
            password: hashedPassword,
            isAdmin: !!isAdmin
            // Admins always get full access, regardless of what was checked
            // canRead: isAdmin ? true : !!canRead,   // Read/Write feature currently disabled
            // canWrite: isAdmin ? true : !!canWrite  // Read/Write feature currently disabled
        });

        await newUser.save();

        res.status(201).json({
            message: "User created successfully"
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

});


// UPDATE USER
// Admin-only. Edits an existing user's details/permissions.
// Password is optional — only hashed & changed if a new one is supplied.
router.put("/users/:id", verifyToken, requireAdmin, async (req, res) => {

    try {

        const { id } = req.params;
        const { name, phone, isAdmin, password /*, canRead, canWrite */ } = req.body;

        if (!name || !phone) {
            return res.status(400).json({
                message: "Name and phone are required"
            });
        }

        const targetUser = await User.findById(id);

        if (!targetUser) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        // Prevent an admin from stripping their own admin rights by accident,
        // which could lock everyone out.
        if (targetUser._id.toString() === req.user._id.toString() && !isAdmin) {
            return res.status(400).json({
                message: "You cannot remove admin rights from your own account"
            });
        }

        // If demoting an admin to a normal user, make sure at least one
        // admin remains in the system.
        if (targetUser.isAdmin && !isAdmin) {
            const adminCount = await User.countDocuments({ isAdmin: true });
            if (adminCount <= 1) {
                return res.status(400).json({
                    message: "Cannot remove the last remaining admin"
                });
            }
        }

        targetUser.name = name;
        targetUser.phone = phone;
        targetUser.isAdmin = !!isAdmin;
        // Admins always get full access, regardless of what was checked
        // targetUser.canRead = isAdmin ? true : !!canRead;   // Read/Write feature currently disabled
        // targetUser.canWrite = isAdmin ? true : !!canWrite; // Read/Write feature currently disabled

        if (password) {
            targetUser.password = await bcrypt.hash(password, 10);
        }

        await targetUser.save();

        const { password: _pw, ...safeUser } = targetUser.toObject();

        res.status(200).json({
            message: "User updated successfully",
            user: safeUser
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

});


// DELETE USER
// Admin-only. Removes a user permanently.
router.delete("/users/:id", verifyToken, requireAdmin, async (req, res) => {

    try {

        const { id } = req.params;

        if (req.user._id.toString() === id) {
            return res.status(400).json({
                message: "You cannot delete your own account"
            });
        }

        const targetUser = await User.findById(id);

        if (!targetUser) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        if (targetUser.isAdmin) {
            const adminCount = await User.countDocuments({ isAdmin: true });
            if (adminCount <= 1) {
                return res.status(400).json({
                    message: "Cannot delete the last remaining admin"
                });
            }
        }

        await User.findByIdAndDelete(id);

        res.status(200).json({
            message: "User deleted successfully"
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

});


// LIST USERS
// Admin-only. Feeds the System Users table.
router.get("/users", verifyToken, requireAdmin, async (req, res) => {

    try {

        const users = await User.find().select("-password");

        res.status(200).json({
            users
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

});

module.exports = router;