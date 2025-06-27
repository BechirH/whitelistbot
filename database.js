const fs = require("fs");
const path = require("path");
const { CONFIG } = require("./config");

// Database structure
let whitelistDB = {
  steamids: [], // Array of whitelisted Steam IDs
  users: {}, // Object mapping Discord User ID to Steam ID
};

// Database file path
const DB_FILE = path.join(__dirname, CONFIG.DB_FILE);

/**
 * Load database from file
 */
function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf8");
      whitelistDB = JSON.parse(data);
      console.log(
        `📁 Loaded ${whitelistDB.steamids.length} whitelisted Steam IDs from database`
      );
    } else {
      console.log("📁 Database file not found, starting with empty database");
      saveDatabase(); // Create initial file
    }
  } catch (error) {
    console.error("❌ Error loading database:", error);
    // Reset to default structure on error
    whitelistDB = { steamids: [], users: {} };
  }
}

/**
 * Save database to file
 */
function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(whitelistDB, null, 2));
    console.log("💾 Database saved successfully");
  } catch (error) {
    console.error("❌ Error saving database:", error);
  }
}

/**
 * Check if Steam ID is already whitelisted
 * @param {string} steamid - Steam ID to check
 * @returns {boolean}
 */
function isSteamIdWhitelisted(steamid) {
  return whitelistDB.steamids.includes(steamid);
}

/**
 * Check if user is already whitelisted (by Discord ID)
 * @param {string} userId - Discord user ID
 * @returns {boolean}
 */
function isUserWhitelisted(userId) {
  return whitelistDB.users.hasOwnProperty(userId);
}

/**
 * Add user to whitelist
 * @param {string} userId - Discord user ID
 * @param {string} steamid - Steam ID
 */
function addToWhitelist(userId, steamid) {
  if (!whitelistDB.steamids.includes(steamid)) {
    whitelistDB.steamids.push(steamid);
  }
  whitelistDB.users[userId] = steamid;
  saveDatabase();
}

/**
 * Get user's Steam ID
 * @param {string} userId - Discord user ID
 * @returns {string|null}
 */
function getUserSteamId(userId) {
  return whitelistDB.users[userId] || null;
}

/**
 * Get database statistics
 * @returns {object}
 */
function getDatabaseStats() {
  return {
    totalSteamIds: whitelistDB.steamids.length,
    totalUsers: Object.keys(whitelistDB.users).length,
  };
}

module.exports = {
  loadDatabase,
  saveDatabase,
  isSteamIdWhitelisted,
  isUserWhitelisted,
  addToWhitelist,
  getUserSteamId,
  getDatabaseStats,
};
