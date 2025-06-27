# Discord Whitelist Bot

A modular Discord bot for managing game server whitelist applications with role-based access control.

## Features

- **Role-based responses**: Different messages for whitelisted and rejected users
- **Bypass protection**: Prevents users from reapplying after initial submission
- **Modular architecture**: Clean separation of concerns across multiple files
- **Environment configuration**: All settings managed through `.env` file
- **Steam ID validation**: Ensures valid Steam ID 64 format
- **Duplicate prevention**: Prevents same Steam ID from being used multiple times
- **Multi-channel commands**: Sends whitelist commands to multiple channels

## File Structure

```
├── index.js          # Main bot file
├── config.js         # Configuration management
├── database.js       # Database operations
├── utils.js          # Utility functions
├── embeds.js         # Discord embed messages
├── handlers.js       # Event handlers
├── .env              # Environment variables
├── package.json      # Dependencies
└── README.md         # This file
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the `.env` template and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your Discord bot configuration:

```env
# Discord Bot Configuration
DISCORD_BOT_TOKEN=your_bot_token_here

# Channel IDs
WELCOME_CHANNEL_ID=your_welcome_channel_id_here
COMMAND_CHANNELS=channel_id_1,channel_id_2,channel_id_3,channel_id_4

# Role IDs
WHITELISTED_ROLE_ID=your_whitelisted_role_id_here
REJECTED_ROLE_ID=your_rejected_role_id_here

# Database settings (optional)
DB_FILE=whitelist_db.json
```

### 3. Get Required IDs

#### Bot Token
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application or select existing one
3. Go to "Bot" section
4. Copy the token

#### Channel IDs
1. Enable Developer Mode in Discord (User Settings > Advanced > Developer Mode)
2. Right-click on channels and select "Copy ID"

#### Role IDs
1. Right-click on roles in Server Settings > Roles
2. Select "Copy ID"

### 4. Bot Permissions

Your bot needs the following permissions:
- Send Messages
- Use Slash Commands
- Read Message History
- Manage Messages (for clearing old messages)
- View Channels

### 5. Run the Bot

```bash
# Production
npm start

# Development (with auto-restart)
npm run dev
```

## Role System

The bot now supports two specific roles:

### Whitelisted Role
- Users with this role receive: "✅ Already Whitelisted - You are already whitelisted! You have access to the server."
- These users cannot apply again

### Rejected Role  
- Users with this role receive: "❌ Application Rejected - Your whitelist application has been rejected. Please contact an administrator if you believe this is an error."
- These users cannot apply

### No Special Role
- Users without either role can apply for whitelist normally

## Database

The bot uses a JSON file (`whitelist_db.json`) to store:
- Array of whitelisted Steam IDs
- Mapping of Discord User IDs to Steam IDs (for bypass protection)

## Error Handling

- Configuration validation on startup
- Graceful error handling for all interactions
- Automatic database file creation
- Process termination handling

## Development

### Adding New Features

1. **New embeds**: Add to `embeds.js`
2. **New utilities**: Add to `utils.js`  
3. **New handlers**: Add to `handlers.js`
4. **Configuration**: Update `config.js` and `.env`

### Code Style

- Use meaningful variable names
- Add JSDoc comments for functions
- Handle errors gracefully
- Log important events

## Troubleshooting

### Common Issues

1. **Bot not responding**
   - Check bot token is correct
   - Verify bot has required permissions
   - Check console for error messages

2. **Configuration errors**
   - Ensure all required environment variables are set
   - Verify channel and role IDs are correct
   - Check `.env` file format

3. **Database issues**
   - Check file permissions for database file
   - Verify JSON format is valid

### Logs

The bot provides detailed console logging:
- ✅ Success messages (green)
- ❌ Error messages (red)  
- 📁 Database operations
- 🎮 Whitelist applications
- 🤖 Bot status

## License

MIT License - feel free to modify and distribute.