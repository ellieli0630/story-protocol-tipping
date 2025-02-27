# Story Protocol Tipping Bot 🤖

A Twitter bot that automatically tips users who register their IP on Story Protocol. The bot monitors Twitter for mentions containing Story Protocol transaction URLs and sends token tips to the associated wallet addresses.

## Features 🌟

- Tips $IP to fan creation registed IP work

## Setup 🛠️

1. Clone the repository:
```bash
git clone https://github.com/yourusername/story-protocol-tipping.git
cd story-protocol-tipping
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:

```env
# Story Protocol RPC URL (Aeneid testnet)
STORY_RPC_URL=https://rpc.aeneid.network

# Wallet private key for sending tips
STORY_WALLET_PRIVATE_KEY=your_private_key_here

# Amount to tip in tokens
TIP_AMOUNT=1

# Twitter API credentials
TWITTER_APP_KEY=your_app_key_here
TWITTER_APP_SECRET=your_app_secret_here
TWITTER_ACCESS_TOKEN=your_access_token_here
TWITTER_ACCESS_SECRET=your_access_secret_here
TWITTER_BEARER_TOKEN=your_bearer_token_here
```

## Usage 🚀

### Automated Bot Mode
Run the bot to automatically monitor Twitter and send tips:
```bash
npm start
```

### Manual Testing Mode
Test the tipping functionality with a specific tweet:
```bash
node src/manual-tip.js
```

## How It Works 🔄

1. **Tweet Monitoring**: The bot monitors Twitter for mentions containing Story Protocol transaction URLs.

2. **Transaction Processing**: When a valid transaction is found, the bot:
   - Extracts the transaction hash
   - Retrieves the wallet address
   - Sends the specified tip amount

3. **Confirmation**: After sending the tip, the bot:
   - Posts a reply tweet with the tip confirmation
   - Includes the transaction hash for verification

## Error Handling 🛡️

The bot includes robust error handling for:
- Twitter API rate limits
- Network connectivity issues
- Invalid transactions
- Failed tip transfers

## Contributing 🤝

Contributions are welcome! Please feel free to submit a Pull Request.

## License 📄

MIT License - feel free to use this code for your own projects!
