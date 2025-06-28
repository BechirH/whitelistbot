const { EmbedBuilder } = require("discord.js");

/**
 * Create welcome embed for whitelist application
 * @returns {EmbedBuilder}
 */
function createWelcomeEmbed() {
  return new EmbedBuilder()
    .setTitle("Get access to join our server!")
    .setDescription(
      "\n**• Click the button below & enter Your SteamID 64\nto apply for whitelist access!**\n\n<:spoke_info:1123418760993312799> [**Steam ID tutoriel **](https://www.youtube.com/watch?v=Vp4tfpNyzI4) **Or** <:spoke_info:1385973465777045574>  [**Steam ID Finder**](https://steamid.xyz) "
    )
    .setColor("#ffffff")
    .setImage(
      "https://cdn.discordapp.com/attachments/1290548822350757899/1385962271917998090/whitelist.gif?ex=685fe273&is=685e90f3&hm=188d73ad222faf96fe2bbdca5e626b7167f100643a3901aacabb020d69c125c0&"
    )
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
      { name: "Status", value: "Whitelisted & Protected", inline: true }
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

/**
 * Create embed for admin command success
 * @param {string} action - Action performed (Whitelist/Reject)
 * @param {string} userTag - User's Discord tag
 * @param {string} steamId - Steam ID (N/A for reject)
 * @returns {EmbedBuilder}
 */
function createAdminSuccessEmbed(action, userTag, steamId) {
  const embed = new EmbedBuilder()
    .setTitle(`✅ Manual ${action} Successful`)
    .setDescription(`User **${userTag}** has been ${action.toLowerCase()}ed.`)
    .addFields(
      { name: "User", value: userTag, inline: true },
      { name: "Action", value: action, inline: true }
    )
    .setColor("#00ff00")
    .setTimestamp();

  if (steamId !== "N/A") {
    embed.addFields({ name: "Steam ID", value: steamId, inline: true });
  }

  return embed;
}

/**
 * Create embed for admin command errors
 * @param {string} message - Error message
 * @returns {EmbedBuilder}
 */
function createAdminErrorEmbed(message) {
  return new EmbedBuilder()
    .setTitle("❌ Admin Command Error")
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
  createAdminSuccessEmbed,
  createAdminErrorEmbed,
};
