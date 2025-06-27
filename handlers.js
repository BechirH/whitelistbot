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
  hasAdminPermission,
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
    // Register slash commands
    const { registerCommands } = require("./commands");
    const guild = client.guilds.cache.first();
    await registerCommands(client.user.id, guild?.id);

    // Initialize database from server roles
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

    // REMOVED: Steam ID duplication check - now allowing shared Steam IDs
    // Multiple users can now share the same Steam ID

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
 * Clean up existing whitelist data for user (but allow shared Steam IDs)
 * @param {string} discordId - Discord user ID
 * @param {string} steamId - Steam ID
 */
async function cleanupExistingWhitelistData(discordId, steamId) {
  const db = require("./database");
  const whitelistDB = db.whitelistDB || {};

  if (!whitelistDB.users) whitelistDB.users = {};
  if (!whitelistDB.steamids) whitelistDB.steamids = [];
  if (!whitelistDB.whitelistedUsers) whitelistDB.whitelistedUsers = [];

  // Only remove the user's previous Steam ID if they had a different one
  const existingSteamId = whitelistDB.users[discordId];
  if (existingSteamId && existingSteamId !== steamId) {
    // Check if any other user has this old Steam ID
    const otherUserWithOldSteamId = Object.keys(whitelistDB.users).find(
      (uid) => uid !== discordId && whitelistDB.users[uid] === existingSteamId
    );

    // If no other user has this old Steam ID, remove it from steamids array
    if (!otherUserWithOldSteamId) {
      const steamIdIndex = whitelistDB.steamids.indexOf(existingSteamId);
      if (steamIdIndex > -1) {
        whitelistDB.steamids.splice(steamIdIndex, 1);
      }
    }
  }

  // Save changes
  db.saveDatabase();
}

/**
 * Process whitelist operation - Now allows shared Steam IDs
 * @param {Interaction} interaction - Discord interaction
 * @param {string} discordId - Discord user ID
 * @param {string} steamId - Steam ID
 */
async function processWhitelist(interaction, discordId, steamId) {
  try {
    // Clean up only the user's previous data (but allow shared Steam IDs)
    await cleanupExistingWhitelistData(discordId, steamId);

    // Add to whitelist database
    addToWhitelist(discordId, steamId);

    // Try to manage roles - but don't fail if user isn't in server
    try {
      const guild = interaction.guild;
      const member = guild.members.cache.get(discordId);

      if (member) {
        // User is in cache, manage roles
        await member.roles.add(CONFIG.WHITELISTED_ROLE_ID);
        if (member.roles.cache.has(CONFIG.REJECTED_ROLE_ID)) {
          await member.roles.remove(CONFIG.REJECTED_ROLE_ID);
        }
        console.log(`✅ Managed roles for ${member.user.tag}`);
      } else {
        // User not in cache - they might not be in server or not cached
        console.log(
          `⚠️ User ${discordId} not found in member cache - roles will be applied when they rejoin`
        );
      }
    } catch (roleError) {
      console.error("❌ Error managing roles:", roleError);
    }

    // Send whitelist commands to configured channels
    await sendWhitelistCommands(interaction.client, steamId);

    const successEmbed = createAdminSuccessEmbed(
      "Whitelist",
      `<@${discordId}>`,
      steamId
    );

    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({
        embeds: [successEmbed],
        components: [],
      });
    } else {
      await interaction.reply({
        embeds: [successEmbed],
        ephemeral: true,
      });
    }

    console.log(
      `🛠️ Slash whitelist: User ${discordId} - Steam ID: ${steamId} by ${interaction.user.tag}`
    );
  } catch (error) {
    console.error("❌ Error processing whitelist:", error);
    const errorResponse = {
      embeds: [
        createAdminErrorEmbed(
          "An error occurred while processing the whitelist."
        ),
      ],
      components: [],
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.editReply(errorResponse);
    } else {
      await interaction.reply({ ...errorResponse, ephemeral: true });
    }
  }
}

/**
 * Process rejection operation - Optimized for large servers
 * @param {Interaction} interaction - Discord interaction
 * @param {string} discordId - Discord user ID
 * @param {string} steamId - Steam ID (can be null)
 */
async function processRejection(interaction, discordId, steamId) {
  try {
    // Add to rejected database (this also cleans up whitelist data)
    addToRejected(discordId);

    // Try to manage roles - but don't fail if user isn't in server
    try {
      const guild = interaction.guild;
      const member = guild.members.cache.get(discordId);

      if (member) {
        // User is in cache, manage roles
        await member.roles.add(CONFIG.REJECTED_ROLE_ID);
        if (member.roles.cache.has(CONFIG.WHITELISTED_ROLE_ID)) {
          await member.roles.remove(CONFIG.WHITELISTED_ROLE_ID);
        }
        console.log(`✅ Managed roles for ${member.user.tag}`);
      } else {
        // User not in cache - they might not be in server or not cached
        console.log(
          `⚠️ User ${discordId} not found in member cache - roles will be applied when they rejoin`
        );
      }
    } catch (roleError) {
      console.error("❌ Error managing roles:", roleError);
    }

    const successEmbed = createAdminSuccessEmbed(
      "Reject",
      `<@${discordId}>`,
      steamId || "N/A"
    );

    await interaction.reply({
      embeds: [successEmbed],
      ephemeral: true,
    });

    console.log(
      `🛠️ Slash reject: User ${discordId} - Steam ID: ${steamId || "N/A"} by ${
        interaction.user.tag
      }`
    );
  } catch (error) {
    console.error("❌ Error processing rejection:", error);
    await interaction.reply({
      embeds: [
        createAdminErrorEmbed(
          "An error occurred while processing the rejection."
        ),
      ],
      ephemeral: true,
    });
  }
}

/**
 * Handle slash command for manual whitelist - Now allows shared Steam IDs
 * @param {ChatInputCommandInteraction} interaction - Discord slash command interaction
 */
async function handleSlashWhitelist(interaction) {
  try {
    const discordId = interaction.options.getString("discord_id");
    const steamId = interaction.options.getString("steam_id");

    // Validate Steam ID
    if (!isValidSteamID64(steamId)) {
      return await interaction.reply({
        embeds: [
          createAdminErrorEmbed("Invalid Steam ID format. Must be 17 digits."),
        ],
        ephemeral: true,
      });
    }

    // Check only for user already having a different Steam ID
    const existingSteamIdForUser = getUserSteamId(discordId);

    if (existingSteamIdForUser && existingSteamIdForUser !== steamId) {
      // Create confirmation buttons for overwriting user's existing Steam ID
      const confirmButton = new ButtonBuilder()
        .setCustomId(`confirm_whitelist_${discordId}_${steamId}`)
        .setLabel("Overwrite")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("⚠️");

      const cancelButton = new ButtonBuilder()
        .setCustomId("cancel_whitelist")
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Secondary);

      const row = new ActionRowBuilder().addComponents(
        confirmButton,
        cancelButton
      );

      const duplicateMessage = `⚠️ User <@${discordId}> is already whitelisted with Steam ID ${existingSteamIdForUser}\n\nDo you want to overwrite with the new Steam ID ${steamId}?`;

      const duplicateEmbed = createAdminErrorEmbed(duplicateMessage).setTitle(
        "⚠️ User Already Has Different Steam ID"
      );

      return await interaction.reply({
        embeds: [duplicateEmbed],
        components: [row],
        ephemeral: true,
      });
    }

    // No conflicts, proceed with whitelisting
    await processWhitelist(interaction, discordId, steamId);
  } catch (error) {
    console.error("❌ Error handling slash whitelist:", error);
    await interaction.reply({
      embeds: [
        createAdminErrorEmbed(
          "An error occurred while processing the whitelist."
        ),
      ],
      ephemeral: true,
    });
  }
}

/**
 * Handle slash command for manual reject
 * @param {ChatInputCommandInteraction} interaction - Discord slash command interaction
 */
async function handleSlashReject(interaction) {
  try {
    const discordId = interaction.options.getString("discord_id");
    const steamId = interaction.options.getString("steam_id");

    // Validate that at least one parameter is provided
    if (!discordId && !steamId) {
      return await interaction.reply({
        embeds: [
          createAdminErrorEmbed(
            "You must provide either Discord ID or Steam ID (or both)."
          ),
        ],
        ephemeral: true,
      });
    }

    // Validate Steam ID if provided
    if (steamId && !isValidSteamID64(steamId)) {
      return await interaction.reply({
        embeds: [
          createAdminErrorEmbed("Invalid Steam ID format. Must be 17 digits."),
        ],
        ephemeral: true,
      });
    }

    let targetDiscordId = discordId;
    let targetSteamId = steamId;

    // If only Steam ID provided, find the Discord ID(s) - now multiple users can have same Steam ID
    if (!discordId && steamId) {
      const db = require("./database");
      const whitelistDB = db.whitelistDB || {};

      const usersWithSteamId = Object.keys(whitelistDB.users || {}).filter(
        (uid) => whitelistDB.users[uid] === steamId
      );

      if (usersWithSteamId.length === 0) {
        return await interaction.reply({
          embeds: [createAdminErrorEmbed("No user found with that Steam ID.")],
          ephemeral: true,
        });
      }

      if (usersWithSteamId.length > 1) {
        const userList = usersWithSteamId.map((uid) => `<@${uid}>`).join(", ");
        return await interaction.reply({
          embeds: [
            createAdminErrorEmbed(
              `Multiple users found with Steam ID ${steamId}: ${userList}\n\nPlease specify the Discord ID to reject a specific user.`
            ),
          ],
          ephemeral: true,
        });
      }

      targetDiscordId = usersWithSteamId[0];
    }

    // If only Discord ID provided, get the Steam ID
    if (discordId && !steamId) {
      targetSteamId = getUserSteamId(discordId);
    }

    // Check if user is already rejected
    if (isUserInRejectedList(targetDiscordId)) {
      return await interaction.reply({
        embeds: [createAdminErrorEmbed("User is already rejected.")],
        ephemeral: true,
      });
    }

    // Process rejection
    await processRejection(interaction, targetDiscordId, targetSteamId);
  } catch (error) {
    console.error("❌ Error handling slash reject:", error);
    await interaction.reply({
      embeds: [
        createAdminErrorEmbed(
          "An error occurred while processing the rejection."
        ),
      ],
      ephemeral: true,
    });
  }
}

/**
 * Handle confirmation buttons for overwrite operations
 * @param {ButtonInteraction} interaction - Discord button interaction
 */
async function handleConfirmationButtons(interaction) {
  try {
    if (interaction.customId.startsWith("confirm_whitelist_")) {
      const [, , discordId, steamId] = interaction.customId.split("_");
      await processWhitelist(interaction, discordId, steamId);
    } else if (interaction.customId === "cancel_whitelist") {
      await interaction.update({
        embeds: [createAdminErrorEmbed("Operation cancelled.")],
        components: [],
      });
    }
  } catch (error) {
    console.error("❌ Error handling confirmation buttons:", error);
    await interaction.update({
      embeds: [createAdminErrorEmbed("An error occurred.")],
      components: [],
    });
  }
}

/**
 * Handle all slash command interactions
 * @param {ChatInputCommandInteraction} interaction - Discord slash command interaction
 */
async function handleSlashCommands(interaction) {
  // Check permissions using the new utility function
  if (!hasAdminPermission(interaction.member)) {
    return await interaction.reply({
      embeds: [
        createAdminErrorEmbed("You don't have permission to use this command."),
      ],
      ephemeral: true,
    });
  }

  try {
    switch (interaction.commandName) {
      case "whitelist":
        await handleSlashWhitelist(interaction);
        break;
      case "reject":
        await handleSlashReject(interaction);
        break;
      default:
        await interaction.reply({
          embeds: [createAdminErrorEmbed("Unknown command.")],
          ephemeral: true,
        });
    }
  } catch (error) {
    console.error("❌ Error handling slash command:", error);
    const errorResponse = {
      embeds: [
        createAdminErrorEmbed(
          "An error occurred while processing the command."
        ),
      ],
      ephemeral: true,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.editReply(errorResponse);
    } else {
      await interaction.reply(errorResponse);
    }
  }
}

/**
 * Handle all interactions (buttons and modals)
 * @param {Interaction} interaction - Discord interaction
 * @param {Client} client - Discord client
 */
async function handleInteraction(interaction, client) {
  try {
    if (interaction.isChatInputCommand()) {
      await handleSlashCommands(interaction);
    } else if (interaction.isButton()) {
      if (interaction.customId === "whitelist_apply") {
        await handleWhitelistButton(interaction);
      } else if (
        interaction.customId.startsWith("confirm_whitelist_") ||
        interaction.customId === "cancel_whitelist"
      ) {
        await handleConfirmationButtons(interaction);
      }
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
  handleSlashCommands,
  handleConfirmationButtons,
  handleSlashWhitelist,
  handleSlashReject,
  processWhitelist,
  processRejection,
  cleanupExistingWhitelistData,
  sendWelcomeMessage,
  handleWhitelistButton,
  handleSteamIdModal,
};
