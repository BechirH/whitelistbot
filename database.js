const fs = require("fs");
const path = require("path");
const { CONFIG } = require("./config");

// Database structure
let whitelistDB = {
  steamids: [], // Array of whitelisted Steam IDs
  users: {}, // Object mapping Discord User ID to Steam ID
  whitelistedUsers: [], // Array of Discord IDs with whitelisted role
  rejectedUsers: [], // Array of Discord IDs with rejected role
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
      const loadedData = JSON.parse(data);

      // Merge with default structure to ensure all properties exist
      whitelistDB = {
        steamids: loadedData.steamids || [],
        users: loadedData.users || {},
        whitelistedUsers: loadedData.whitelistedUsers || [],
        rejectedUsers: loadedData.rejectedUsers || [],
      };

      console.log(
        `📁 Loaded database: ${whitelistDB.steamids.length} Steam IDs, ${whitelistDB.whitelistedUsers.length} whitelisted users, ${whitelistDB.rejectedUsers.length} rejected users`
      );
    } else {
      console.log("📁 Database file not found, starting with empty database");
      saveDatabase(); // Create initial file
    }
  } catch (error) {
    console.error("❌ Error loading database:", error);
    // Reset to default structure on error
    whitelistDB = {
      steamids: [],
      users: {},
      whitelistedUsers: [],
      rejectedUsers: [],
    };
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
 * Check if user is in whitelisted users list
 * @param {string} userId - Discord user ID
 * @returns {boolean}
 */
function isUserInWhitelistedList(userId) {
  return whitelistDB.whitelistedUsers.includes(userId);
}

/**
 * Check if user is in rejected users list
 * @param {string} userId - Discord user ID
 * @returns {boolean}
 */
function isUserInRejectedList(userId) {
  return whitelistDB.rejectedUsers.includes(userId);
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

  // Add to whitelisted users list if not already there
  if (!whitelistDB.whitelistedUsers.includes(userId)) {
    whitelistDB.whitelistedUsers.push(userId);
  }

  // Remove from rejected users list if present
  const rejectedIndex = whitelistDB.rejectedUsers.indexOf(userId);
  if (rejectedIndex > -1) {
    whitelistDB.rejectedUsers.splice(rejectedIndex, 1);
  }

  saveDatabase();
}

/**
 * Add user to rejected list
 * @param {string} userId - Discord user ID
 */
function addToRejected(userId) {
  // Add to rejected users list if not already there
  if (!whitelistDB.rejectedUsers.includes(userId)) {
    whitelistDB.rejectedUsers.push(userId);
  }

  // Remove from whitelisted users list if present
  const whitelistedIndex = whitelistDB.whitelistedUsers.indexOf(userId);
  if (whitelistedIndex > -1) {
    whitelistDB.whitelistedUsers.splice(whitelistedIndex, 1);
  }

  // Remove from users and steamids if present
  if (whitelistDB.users[userId]) {
    const steamid = whitelistDB.users[userId];
    delete whitelistDB.users[userId];

    // Remove steamid if no other user has it
    const isUsedByOther = Object.values(whitelistDB.users).includes(steamid);
    if (!isUsedByOther) {
      const steamidIndex = whitelistDB.steamids.indexOf(steamid);
      if (steamidIndex > -1) {
        whitelistDB.steamids.splice(steamidIndex, 1);
      }
    }
  }

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
    whitelistedUsers: whitelistDB.whitelistedUsers.length,
    rejectedUsers: whitelistDB.rejectedUsers.length,
  };
}

/**
 * Find user by Discord ID
 * @param {string} discordId - Discord user ID
 * @returns {Object|null} User information object or null if not found
 */
function findUserByDiscordId(discordId) {
  const steamId = whitelistDB.users[discordId];

  if (!steamId) {
    // Check if user is in rejected list only
    if (whitelistDB.rejectedUsers.includes(discordId)) {
      return {
        found: true,
        users: [
          {
            discordId: discordId,
            steamId: null,
            status: "❌ Rejected",
          },
        ],
      };
    }
    return { found: false };
  }

  // Get user status
  let status = "⚪ Unknown";
  if (whitelistDB.whitelistedUsers.includes(discordId)) {
    status = "✅ Whitelisted";
  } else if (whitelistDB.rejectedUsers.includes(discordId)) {
    status = "❌ Rejected";
  }

  // Find other users with same Steam ID
  const usersWithSameSteamId = Object.keys(whitelistDB.users).filter(
    (uid) => uid !== discordId && whitelistDB.users[uid] === steamId
  );

  return {
    found: true,
    users: [
      {
        discordId: discordId,
        steamId: steamId,
        status: status,
      },
    ],
    additionalSteamUsers:
      usersWithSameSteamId.length > 0 ? usersWithSameSteamId : null,
  };
}

/**
 * Find users by Steam ID
 * @param {string} steamId - Steam ID to search for
 * @returns {Object|null} User information object or null if not found
 */
function findUsersBySteamId(steamId) {
  // Find all users with this Steam ID
  const usersWithSteamId = Object.keys(whitelistDB.users).filter(
    (uid) => whitelistDB.users[uid] === steamId
  );

  if (usersWithSteamId.length === 0) {
    return { found: false };
  }

  const users = usersWithSteamId.map((uid) => {
    let status = "⚪ Unknown";
    if (whitelistDB.whitelistedUsers.includes(uid)) {
      status = "✅ Whitelisted";
    } else if (whitelistDB.rejectedUsers.includes(uid)) {
      status = "❌ Rejected";
    }

    return {
      discordId: uid,
      steamId: steamId,
      status: status,
    };
  });

  return {
    found: true,
    users: users,
    multiple: users.length > 1,
  };
}

/**
 * Comprehensive user search function
 * @param {string} discordId - Discord user ID (optional)
 * @param {string} steamId - Steam ID (optional)
 * @returns {Object} Search results
 */
function findUser(discordId = null, steamId = null) {
  if (discordId && steamId) {
    // Both provided - verify they match
    const userSteamId = getUserSteamId(discordId);
    if (userSteamId === steamId) {
      return findUserByDiscordId(discordId);
    } else {
      return {
        found: false,
        error: "Discord ID and Steam ID do not match in database",
      };
    }
  } else if (discordId) {
    // Only Discord ID provided
    return findUserByDiscordId(discordId);
  } else if (steamId) {
    // Only Steam ID provided
    return findUsersBySteamId(steamId);
  } else {
    return {
      found: false,
      error: "No search parameters provided",
    };
  }
}

module.exports = {
  loadDatabase,
  saveDatabase,
  initializeDatabaseFromServer,
  isSteamIdWhitelisted,
  isUserWhitelisted,
  isUserInWhitelistedList,
  isUserInRejectedList,
  addToWhitelist,
  addToRejected,
  getUserSteamId,
  getDatabaseStats,
  findUserByDiscordId,
  findUsersBySteamId,
  findUser,
};
