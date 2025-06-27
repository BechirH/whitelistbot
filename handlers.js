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
  isUserInWhitelistedList,
  isUserInRejectedList,
  addToWhitelist,
  addToRejected,
  getUserSteamId,
  initializeDatabaseFromServer,
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
  createAdminSuccessEmbed,
  createAdminErrorEmbed,
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
    // Initialize database from server roles
    const guild = client.guilds.cache.first();
    if (guild) {
      await initializeDatabaseFromServer(guild);
    }

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
    console.error("❌ Error in ready handler:", error);
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

    // Check user's role status first
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

    // Check database for existing status
    if (isUserInWhitelistedList(userId)) {
      return await interaction.reply({
        embeds: [createAlreadyWhitelistedEmbed()],
        ephemeral: true,
      });
    }

    if (isUserInRejectedList(userId)) {
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
    const member = interaction.member;

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

    // Assign whitelisted role
    try {
      await member.roles.add(CONFIG.WHITELISTED_ROLE_ID);
      console.log(`✅ Assigned whitelisted role to ${interaction.user.tag}`);
    } catch (roleError) {
      console.error("❌ Error assigning whitelisted role:", roleError);
    }

    // Remove rejected role if present
    try {
      if (member.roles.cache.has(CONFIG.REJECTED_ROLE_ID)) {
        await member.roles.remove(CONFIG.REJECTED_ROLE_ID);
        console.log(`✅ Removed rejected role from ${interaction.user.tag}`);
      }
    } catch (roleError) {
      console.error("❌ Error removing rejected role:", roleError);
    }

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
 * Handle manual whitelist command
 * @param {Message} message - Discord message
 * @param {Array} args - Command arguments [discordId, steamId]
 */
async function handleManualWhitelist(message, args) {
  try {
    if (args.length !== 2) {
      return await message.reply({
        embeds: [
          createAdminErrorEmbed("Usage: !whitelist <discord_id> <steam_id>"),
        ],
      });
    }

    const [discordId, steamId] = args;

    // Validate Steam ID
    if (!isValidSteamID64(steamId)) {
      return await message.reply({
        embeds: [
          createAdminErrorEmbed("Invalid Steam ID format. Must be 17 digits."),
        ],
      });
    }

    // Check if Steam ID is already used by another user
    if (isSteamIdWhitelisted(steamId)) {
      const existingUser = Object.keys(
        require("./database").whitelistDB.users
      ).find((uid) => require("./database").whitelistDB.users[uid] === steamId);
      if (existingUser && existingUser !== discordId) {
        return await message.reply({
          embeds: [
            createAdminErrorEmbed("Steam ID is already used by another user."),
          ],
        });
      }
    }

    // Get guild member
    const member = await message.guild.members
      .fetch(discordId)
      .catch(() => null);
    if (!member) {
      return await message.reply({
        embeds: [createAdminErrorEmbed("User not found in server.")],
      });
    }

    // Add to whitelist database
    addToWhitelist(discordId, steamId);

    // Assign whitelisted role and remove rejected role
    try {
      await member.roles.add(CONFIG.WHITELISTED_ROLE_ID);
      if (member.roles.cache.has(CONFIG.REJECTED_ROLE_ID)) {
        await member.roles.remove(CONFIG.REJECTED_ROLE_ID);
      }
    } catch (roleError) {
      console.error("❌ Error managing roles:", roleError);
    }

    // Send whitelist commands to configured channels
    await sendWhitelistCommands(message.client, steamId);

    await message.reply({
      embeds: [createAdminSuccessEmbed("Whitelist", member.user.tag, steamId)],
    });

    console.log(
      `🛠️ Manual whitelist: ${member.user.tag} (${discordId}) - Steam ID: ${steamId} by ${message.author.tag}`
    );
  } catch (error) {
    console.error("❌ Error handling manual whitelist:", error);
    await message.reply({
      embeds: [
        createAdminErrorEmbed(
          "An error occurred while processing the whitelist."
        ),
      ],
    });
  }
}

/**
 * Handle manual reject command
 * @param {Message} message - Discord message
 * @param {Array} args - Command arguments [discordId]
 */
async function handleManualReject(message, args) {
  try {
    if (args.length !== 1) {
      return await message.reply({
        embeds: [createAdminErrorEmbed("Usage: !reject <discord_id>")],
      });
    }

    const [discordId] = args;

    // Get guild member
    const member = await message.guild.members
      .fetch(discordId)
      .catch(() => null);
    if (!member) {
      return await message.reply({
        embeds: [createAdminErrorEmbed("User not found in server.")],
      });
    }

    // Add to rejected database
    addToRejected(discordId);

    // Assign rejected role and remove whitelisted role
    try {
      await member.roles.add(CONFIG.REJECTED_ROLE_ID);
      if (member.roles.cache.has(CONFIG.WHITELISTED_ROLE_ID)) {
        await member.roles.remove(CONFIG.WHITELISTED_ROLE_ID);
      }
    } catch (roleError) {
      console.error("❌ Error managing roles:", roleError);
    }

    await message.reply({
      embeds: [createAdminSuccessEmbed("Reject", member.user.tag, "N/A")],
    });

    console.log(
      `🛠️ Manual reject: ${member.user.tag} (${discordId}) by ${message.author.tag}`
    );
  } catch (error) {
    console.error("❌ Error handling manual reject:", error);
    await message.reply({
      embeds: [
        createAdminErrorEmbed(
          "An error occurred while processing the rejection."
        ),
      ],
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
  handleManualWhitelist,
  handleManualReject,
  sendWelcomeMessage,
};
