const {
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

const { CONFIG } = require("./config");
const {
  isValidSteamID64,
  getUserRoleStatus,
  sendWhitelistCommands,
  clearBotMessages,
} = require("./utils");
const {
  isSteamIdWhitelisted,
  isUserWhitelisted,
  addToWhitelist,
  getUserSteamId,
} = require("./database");
const {
  createWelcomeEmbed,
  createAlreadyWhitelistedEmbed,
  createRejectedEmbed,
  createAlreadyAppliedEmbed,
  createInvalidSteamIdEmbed,
  createDuplicateSteamIdEmbed,
  createSuccessEmbed,
  createErrorEmbed,
} = require("./embeds");

/**
 * Send welcome message with button to specified channel
 * @param {TextChannel} channel - Discord channel
 */
async function sendWelcomeMessage(channel) {
  const welcomeEmbed = createWelcomeEmbed();

  const button = new ButtonBuilder()
    .setCustomId("whitelist_apply")
    .setLabel("Apply for Whitelist")
    .setStyle(ButtonStyle.Primary)
    .setEmoji("✅");

  const row = new ActionRowBuilder().addComponents(button);

  await channel.send({
    embeds: [welcomeEmbed],
    components: [row],
  });
}

/**
 * Handle bot ready event
 * @param {Client} client - Discord client
 */
async function handleReady(client) {
  console.log(`🤖 Bot is ready! Logged in as ${client.user.tag}`);

  try {
    const welcomeChannel = await client.channels.fetch(
      CONFIG.WELCOME_CHANNEL_ID
    );
    if (welcomeChannel) {
      // Clear previous bot messages
      await clearBotMessages(welcomeChannel, client.user.id);

      // Send new welcome message
      await sendWelcomeMessage(welcomeChannel);
      console.log("✅ Welcome message sent successfully");
    } else {
      console.error(
        `❌ Welcome channel not found: ${CONFIG.WELCOME_CHANNEL_ID}`
      );
    }
  } catch (error) {
    console.error("❌ Error sending welcome message:", error);
  }
}

/**
 * Handle whitelist application button click
 * @param {ButtonInteraction} interaction - Discord button interaction
 */
async function handleWhitelistButton(interaction) {
  try {
    const member = interaction.member;
    const userId = interaction.user.id;
    const roleStatus = getUserRoleStatus(member);

    // Check user's role status
    switch (roleStatus) {
      case "whitelisted":
        return await interaction.reply({
          embeds: [createAlreadyWhitelistedEmbed()],
          ephemeral: true,
        });

      case "rejected":
        return await interaction.reply({
          embeds: [createRejectedEmbed()],
          ephemeral: true,
        });
    }

    // Check if user already applied (bypass protection)
    if (isUserWhitelisted(userId)) {
      const existingSteamId = getUserSteamId(userId);
      return await interaction.reply({
        embeds: [createAlreadyAppliedEmbed(existingSteamId)],
        ephemeral: true,
      });
    }

    // Show Steam ID input modal
    const modal = new ModalBuilder()
      .setCustomId("steamid_modal")
      .setTitle("Steam ID Verification");

    const steamidInput = new TextInputBuilder()
      .setCustomId("steamid_input")
      .setLabel("Enter your Steam ID 64")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("76561198000000000")
      .setRequired(true)
      .setMaxLength(17)
      .setMinLength(17);

    const row = new ActionRowBuilder().addComponents(steamidInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
  } catch (error) {
    console.error("❌ Error handling whitelist button:", error);
    await interaction.reply({
      embeds: [createErrorEmbed()],
      ephemeral: true,
    });
  }
}

/**
 * Handle Steam ID modal submission
 * @param {ModalSubmitInteraction} interaction - Discord modal interaction
 * @param {Client} client - Discord client
 */
async function handleSteamIdModal(interaction, client) {
  try {
    const steamid = interaction.fields
      .getTextInputValue("steamid_input")
      .trim();
    const userId = interaction.user.id;

    // Validate Steam ID 64
    if (!isValidSteamID64(steamid)) {
      return await interaction.reply({
        embeds: [createInvalidSteamIdEmbed()],
        ephemeral: true,
      });
    }

    // Check if Steam ID is already whitelisted by another user
    if (isSteamIdWhitelisted(steamid)) {
      return await interaction.reply({
        embeds: [createDuplicateSteamIdEmbed()],
        ephemeral: true,
      });
    }

    // Add to whitelist database
    addToWhitelist(userId, steamid);

    // Send confirmation to user
    await interaction.reply({
      embeds: [createSuccessEmbed(steamid, interaction.user.tag)],
      ephemeral: true,
    });

    // Send whitelist commands to configured channels
    await sendWhitelistCommands(client, steamid);

    console.log(
      `🎮 Whitelist application: ${interaction.user.tag} (${userId}) - Steam ID: ${steamid}`
    );
  } catch (error) {
    console.error("❌ Error handling Steam ID modal:", error);
    await interaction.reply({
      embeds: [createErrorEmbed()],
      ephemeral: true,
    });
  }
}

/**
 * Handle all interactions (buttons and modals)
 * @param {Interaction} interaction - Discord interaction
 * @param {Client} client - Discord client
 */
async function handleInteraction(interaction, client) {
  try {
    if (interaction.isButton() && interaction.customId === "whitelist_apply") {
      await handleWhitelistButton(interaction);
    } else if (
      interaction.isModalSubmit() &&
      interaction.customId === "steamid_modal"
    ) {
      await handleSteamIdModal(interaction, client);
    }
  } catch (error) {
    console.error("❌ Error handling interaction:", error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        embeds: [createErrorEmbed()],
        ephemeral: true,
      });
    }
  }
}

module.exports = {
  handleReady,
  handleInteraction,
  sendWelcomeMessage,
};
