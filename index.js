const { Client, GatewayIntentBits } = require("discord.js");
const { CONFIG, validateConfig } = require("./config");
const { loadDatabase } = require("./database");
const {
  handleReady,
  handleInteraction,
  handleManualWhitelist,
  handleManualReject,
} = require("./handlers");

// Validate configuration on startup
try {
  validateConfig();
  console.log("✅ Configuration validated successfully");
} catch (error) {
  console.error("❌ Configuration error:", error.message);
  process.exit(1);
}

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// Load database on startup
loadDatabase();

// Bot ready event
client.once("ready", () => handleReady(client));

// Handle interactions
client.on("interactionCreate", (interaction) =>
  handleInteraction(interaction, client)
);

// Handle admin commands
client.on("messageCreate", async (message) => {
  // Ignore messages from bots
  if (message.author.bot) return;

  // Check if message starts with command prefix
  if (!message.content.startsWith("!")) return;

  // Check if user has administrator permissions or admin role
  const hasAdminPerms = message.member.permissions.has("Administrator");
  const hasAdminRole = CONFIG.ADMIN_ROLE_ID
    ? message.member.roles.cache.has(CONFIG.ADMIN_ROLE_ID)
    : false;

  if (!hasAdminPerms && !hasAdminRole) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  switch (command) {
    case "whitelist":
      await handleManualWhitelist(message, args);
      break;
    case "reject":
      await handleManualReject(message, args);
      break;
    default:
      // Ignore other commands
      break;
  }
});

// Error handling
client.on("error", (error) => {
  console.error("❌ Discord client error:", error);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled promise rejection:", error);
});

// Handle process termination
process.on("SIGINT", () => {
  console.log("\n🛑 Bot is shutting down...");
  client.destroy();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Bot is shutting down...");
  client.destroy();
  process.exit(0);
});

// Login to Discord
client.login(CONFIG.BOT_TOKEN).catch((error) => {
  console.error("❌ Failed to login:", error);
  process.exit(1);
});

// Export for module usage
module.exports = { client, CONFIG };
