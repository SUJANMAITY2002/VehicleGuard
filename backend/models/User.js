const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },

    name: {
        type: String,
        required: true
    },

    phone: {
        type: String,
        required: true
    },

    password: {
        type: String,
        required: true
    },

    isAdmin: {
        type: Boolean,
        default: false
    }

    // Read/Write feature currently disabled — kept here, commented,
    // in case it needs to be switched back on later.
    // canRead: {
    //     type: Boolean,
    //     default: false
    // },

    // canWrite: {
    //     type: Boolean,
    //     default: false
    // }
});

const User = mongoose.model("User", userSchema);

// ─────────────────────────────────────────────────────────────────
// Self-heal: an older version of this schema used to have a unique
// "email" field. That index can survive in MongoDB even though the
// field was removed from the schema, and it enforces uniqueness on
// email: null — which breaks every user creation after the first one
// with:
//   E11000 duplicate key error ... index: email_1 dup key: { email: null }
//
// This runs once per server start, against whichever connection this
// model is actually using, and silently does nothing once the index
// is gone.
// ─────────────────────────────────────────────────────────────────
mongoose.connection.once("open", async () => {
    try {
        const collection = mongoose.connection.collection("users");
        const indexes = await collection.indexes();
        const staleEmailIndex = indexes.find((i) => i.name === "email_1");

        if (staleEmailIndex) {
            await collection.dropIndex("email_1");
            console.log('[User model] Dropped stale "email_1" index.');
        }
    } catch (err) {
        // Not fatal — log it so it's visible, but don't crash the server.
        console.error("[User model] Could not check/drop email_1 index:", err.message);
    }
});

module.exports = User;