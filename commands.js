// commands.js - Slash command definitions and registration
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { REST, Routes } = require("discord.js");
const { CONFIG } = require("./config");

const commands = [
  new SlashCommandBuilder()
    .setName("whitelist")
    .setDescription("Manually whitelist a user")
    .addStringOption((option) =>
      option
        .setName("discord_id")
        .setDescription("Discord User ID")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("steam_id").setDescription("Steam ID 64").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName("reject")
    .setDescription("Manually reject a user")
    .addStringOption((option) =>
      option
        .setName("discord_id")
        .setDescription("Discord User ID")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("steam_id")
        .setDescription("Steam ID 64")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName("find")
    .setDescription("Find user information by Discord ID or Steam ID")
    .addStringOption((option) =>
      option
        .setName("discord_id")
        .setDescription("Discord User ID to search for")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("steam_id")
        .setDescription("Steam ID 64 to search for")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
];

/**
 * Register slash commands with Discord
 * @param {string} clientId - Bot's client ID
 * @param {string} guildId - Guild ID (optional, for guild-specific commands)
 */
async function registerCommands(clientId, guildId = null) {
  const rest = new REST({ version: "10" }).setToken(CONFIG.BOT_TOKEN);

  try {
    console.log("🔄 Started refreshing application (/) commands.");

    const route = guildId
      ? Routes.applicationGuildCommands(clientId, guildId)
      : Routes.applicationCommands(clientId);

    await rest.put(route, { body: commands });

    console.log("✅ Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error("❌ Error registering slash commands:", error);
  }
}

module.exports = { registerCommands };
