const { CONFIG } = require("./config");

/**
 * Steam ID 64 validation function
 * @param {string} steamid - Steam ID to validate
 * @returns {boolean}
 */
function isValidSteamID64(steamid) {
  // Steam ID 64 should be 17 digits long and contain only numbers
  const steamidPattern = /^[0-9]{17}$/;
  return steamidPattern.test(steamid);
}

/**
 * Check if user has whitelisted role
 * @param {GuildMember} member - Discord guild member
 * @returns {boolean}
 */
function hasWhitelistedRole(member) {
  return member.roles.cache.has(CONFIG.WHITELISTED_ROLE_ID);
}

/**
 * Check if user has rejected role
 * @param {GuildMember} member - Discord guild member
 * @returns {boolean}
 */
function hasRejectedRole(member) {
  return member.roles.cache.has(CONFIG.REJECTED_ROLE_ID);
}

/**
 * Get user's role status
 * @param {GuildMember} member - Discord guild member
 * @returns {string} - 'whitelisted', 'rejected', or 'none'
 */
function getUserRoleStatus(member) {
  if (hasWhitelistedRole(member)) {
    return "whitelisted";
  }
  if (hasRejectedRole(member)) {
    return "rejected";
  }
  return "none";
}

/**
 * Send whitelist commands to all configured channels
 * @param {Client} client - Discord client
 * @param {string} steamid - Steam ID to whitelist
 */
async function sendWhitelistCommands(client, steamid) {
  const command = `!com wl.add ${steamid}`;

  for (const channelId of CONFIG.COMMAND_CHANNELS) {
    try {
      const channel = await client.channels.fetch(channelId);
      if (channel) {
        await channel.send(command);
        console.log(`✅ Command sent to channel ${channelId}: ${command}`);
      } else {
        console.error(`❌ Channel not found: ${channelId}`);
      }
    } catch (error) {
      console.error(`❌ Error sending command to channel ${channelId}:`, error);
    }
  }
}

/**
 * Clear bot messages from a channel
 * @param {TextChannel} channel - Discord channel
 * @param {string} botId - Bot's user ID
 * @param {number} limit - Number of messages to check
 */
async function clearBotMessages(channel, botId, limit = 10) {
  try {
    const messages = await channel.messages.fetch({ limit });
    const botMessages = messages.filter((msg) => msg.author.id === botId);
    if (botMessages.size > 0) {
      await channel.bulkDelete(botMessages);
    }
  } catch (error) {
    console.error("❌ Error clearing bot messages:", error);
  }
}

module.exports = {
  isValidSteamID64,
  hasWhitelistedRole,
  hasRejectedRole,
  getUserRoleStatus,
  sendWhitelistCommands,
  clearBotMessages,
};
