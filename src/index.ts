import { TwitterApi } from 'twitter-api-v2';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

// Initialize Twitter client
const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_APP_KEY!,
  appSecret: process.env.TWITTER_APP_SECRET!,
  accessToken: process.env.TWITTER_ACCESS_TOKEN!,
  accessSecret: process.env.TWITTER_ACCESS_SECRET!,
});

// Initialize Ethereum provider and wallet
const provider = new ethers.JsonRpcProvider(process.env.STORY_RPC_URL);
const wallet = new ethers.Wallet('0x597fa3f7539561851646fef14178a92288b404d27aa2f5f06468aff7fac151b5', provider);

// Extract username from Twitter URL if needed
const TWITTER_ACCOUNT = 'ToDaMoon_Ava';

async function extractStoryScanTx(tweetText: string): Promise<string | null> {
  // Look for storyscan URL in the tweet
  const urlMatch = tweetText.match(/https:\/\/aeneid\.storyscan\.xyz\/tx\/(0x[a-fA-F0-9]{64})/);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }
  
  // Fallback: look for direct transaction hash
  const txMatch = tweetText.match(/0x[a-fA-F0-9]{64}/);
  return txMatch ? txMatch[0] : null;
}

async function getWalletFromTx(txHash: string): Promise<string | null> {
  try {
    const tx = await provider.getTransaction(txHash);
    if (!tx) {
      console.log('Transaction not found:', txHash);
      return null;
    }
    return tx.from;
  } catch (error) {
    console.error('Error getting transaction:', error);
    return null;
  }
}

async function sendTip(toAddress: string): Promise<string | null> {
  try {
    // For now, we'll just send a native token transfer
    const tipAmount = ethers.parseEther(process.env.TIP_AMOUNT || "1");
    
    const tx = await wallet.sendTransaction({
      to: toAddress,
      value: tipAmount
    });
    
    const receipt = await tx.wait();
    return receipt?.hash || null;
  } catch (error) {
    console.error('Error sending tip:', error);
    return null;
  }
}

async function startTwitterStream() {
  const rules = await twitterClient.v2.streamRules();
  
  // Clear existing rules
  if (rules.data?.length) {
    await twitterClient.v2.updateStreamRules({
      delete: { ids: rules.data.map(rule => rule.id) }
    });
  }

  // Add new rule to monitor mentions of our account
  await twitterClient.v2.updateStreamRules({
    add: [
      { 
        value: `@${TWITTER_ACCOUNT}`,
        tag: 'ip_registration_mentions' 
      }
    ]
  });

  console.log(`Monitoring mentions for @${TWITTER_ACCOUNT}`);

  const stream = await twitterClient.v2.searchStream({
    'tweet.fields': ['referenced_tweets', 'author_id', 'text', 'entities'],
    'expansions': ['entities.mentions']
  });

  stream.on('data', async tweet => {
    try {
      console.log('Received tweet:', tweet.data.text);
      
      // Check if the tweet contains a storyscan URL
      const txHash = await extractStoryScanTx(tweet.data.text);
      if (!txHash) {
        console.log('No Story Protocol transaction found in tweet');
        return;
      }

      console.log('Found transaction hash:', txHash);

      // Get the wallet address from the transaction
      const walletAddress = await getWalletFromTx(txHash);
      if (!walletAddress) {
        console.log('Could not get wallet address from transaction');
        return;
      }

      console.log('Found wallet address:', walletAddress);

      // Send the tip
      const tipTxHash = await sendTip(walletAddress);
      if (tipTxHash) {
        // Reply to the tweet
        await twitterClient.v2.reply(
          `Thanks for registering your IP! I've sent you a tip of ${process.env.TIP_AMOUNT} tokens. Transaction: https://aeneid.storyscan.xyz/tx/${tipTxHash}`,
          tweet.data.id
        );
        console.log('Tip sent and reply posted:', tipTxHash);
      }
    } catch (error) {
      console.error('Error processing tweet:', error);
    }
  });

  stream.on('error', error => {
    console.error('Stream error:', error);
  });
}

// Start the bot
console.log('Starting Story Protocol Tipper Bot...');
startTwitterStream().catch(console.error);
