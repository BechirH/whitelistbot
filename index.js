const { Client, GatewayIntentBits } = require("discord.js");
const { CONFIG, validateConfig } = require("./config");
const { loadDatabase } = require("./database");
const { handleReady, handleInteraction } = require("./handlers");

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
