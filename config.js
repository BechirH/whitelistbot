require("dotenv").config();

const CONFIG = {
  // Bot token
  BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,

  // Channel IDs
  WELCOME_CHANNEL_ID: process.env.WELCOME_CHANNEL_ID,
  COMMAND_CHANNELS: process.env.COMMAND_CHANNELS?.split(",") || [],

  // Role IDs
  WHITELISTED_ROLE_ID: process.env.WHITELISTED_ROLE_ID,
  REJECTED_ROLE_ID: process.env.REJECTED_ROLE_ID,
  // Support multiple admin roles - comma-separated list
  ADMIN_ROLE_IDS: process.env.ADMIN_ROLE_IDS?.split(",") || [],

  // Database settings
  DB_FILE: process.env.DB_FILE || "whitelist_db.json",
};

// Validate required configuration
function validateConfig() {
  const required = [
    "BOT_TOKEN",
    "WELCOME_CHANNEL_ID",
    "COMMAND_CHANNELS",
    "WHITELISTED_ROLE_ID",
    "REJECTED_ROLE_ID",
  ];

  const missing = required.filter((key) => !CONFIG[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  if (CONFIG.COMMAND_CHANNELS.length === 0) {
    throw new Error("COMMAND_CHANNELS must contain at least one channel ID");
  }

  // Log admin roles configuration
  if (CONFIG.ADMIN_ROLE_IDS.length > 0) {
    console.log(
      `✅ Admin roles configured: ${CONFIG.ADMIN_ROLE_IDS.length} roles`
    );
  } else {
    console.log(
      "⚠️ No admin roles configured - only users with Administrator permission can use commands"
    );
  }
}

module.exports = { CONFIG, validateConfig };
