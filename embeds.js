const { EmbedBuilder } = require("discord.js");

/**
 * Create welcome embed for whitelist application
 * @returns {EmbedBuilder}
 */
function createWelcomeEmbed() {
  return new EmbedBuilder()
    .setTitle("🎮 Whitelist Application")
    .setDescription("Click the button below to apply for whitelist access.")
    .setColor("#00ff00")
    .setTimestamp();
}

/**
 * Create embed for already whitelisted users
 * @returns {EmbedBuilder}
 */
function createAlreadyWhitelistedEmbed() {
  return new EmbedBuilder()
    .setTitle("✅ Already Whitelisted")
    .setDescription(
      "You are already whitelisted! You have access to the server."
    )
    .setColor("#00ff00");
}

/**
 * Create embed for rejected users
 * @returns {EmbedBuilder}
 */
function createRejectedEmbed() {
  return new EmbedBuilder()
    .setTitle("❌ Application Rejected")
    .setDescription(
      "Your whitelist application has been rejected. Please contact an administrator if you believe this is an error."
    )
    .setColor("#ff0000");
}

/**
 * Create embed for users who already applied
 * @param {string} steamId - User's Steam ID
 * @returns {EmbedBuilder}
 */
function createAlreadyAppliedEmbed(steamId) {
  return new EmbedBuilder()
    .setTitle("❌ Already Applied")
    .setDescription(
      `You have already been whitelisted with Steam ID: **${steamId}**\n\nRejoin bypass protection is active!`
    )
    .setColor("#ff0000");
}

/**
 * Create embed for invalid Steam ID
 * @returns {EmbedBuilder}
 */
function createInvalidSteamIdEmbed() {
  return new EmbedBuilder()
    .setTitle("❌ Invalid Steam ID")
    .setDescription(
      "Please enter a valid Steam ID 64 (17 digits, numbers only)."
    )
    .addFields({
      name: "How to find your Steam ID 64",
      value:
        "1. Go to your Steam profile\n2. Copy the URL\n3. Use a Steam ID converter website\n4. Or enable developer console in Steam client",
      inline: false,
    })
    .setColor("#ff0000");
}

/**
 * Create embed for duplicate Steam ID
 * @returns {EmbedBuilder}
 */
function createDuplicateSteamIdEmbed() {
  return new EmbedBuilder()
    .setTitle("❌ Steam ID Already Used")
    .setDescription(
      "This Steam ID has already been whitelisted by another user."
    )
    .setColor("#ff0000");
}

/**
 * Create embed for successful application
 * @param {string} steamId - User's Steam ID
 * @param {string} userTag - User's Discord tag
 * @returns {EmbedBuilder}
 */
function createSuccessEmbed(steamId, userTag) {
  return new EmbedBuilder()
    .setTitle("✅ Steam ID Submitted")
    .setDescription(
      `Your Steam ID **${steamId}** has been submitted for whitelist processing.`
    )
    .addFields(
      { name: "Steam ID 64", value: steamId, inline: true },
      { name: "User", value: userTag, inline: true },
      { name: "Status", value: "Protected from rejoin bypass", inline: true }
    )
    .setColor("#00ff00")
    .setTimestamp();
}

/**
 * Create embed for system errors
 * @param {string} message - Error message
 * @returns {EmbedBuilder}
 */
function createErrorEmbed(
  message = "An unexpected error occurred. Please try again later."
) {
  return new EmbedBuilder()
    .setTitle("❌ System Error")
    .setDescription(message)
    .setColor("#ff0000");
}

module.exports = {
  createWelcomeEmbed,
  createAlreadyWhitelistedEmbed,
  createRejectedEmbed,
  createAlreadyAppliedEmbed,
  createInvalidSteamIdEmbed,
  createDuplicateSteamIdEmbed,
  createSuccessEmbed,
  createErrorEmbed,
};
