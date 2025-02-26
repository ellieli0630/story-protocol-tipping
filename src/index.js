const { TwitterApi } = require('twitter-api-v2');
const { ethers } = require('ethers');
require('dotenv').config();

// Keep track of processed tweets to avoid duplicates
const processedTweets = new Set();

async function main() {
    try {
        // Initialize Twitter clients
        const readClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);
        const writeClient = new TwitterApi({
            appKey: process.env.TWITTER_APP_KEY,
            appSecret: process.env.TWITTER_APP_SECRET,
            accessToken: process.env.TWITTER_ACCESS_TOKEN,
            accessSecret: process.env.TWITTER_ACCESS_SECRET,
        });
        
        // Initialize Ethereum provider and wallet
        const provider = new ethers.JsonRpcProvider(process.env.STORY_RPC_URL);
        const wallet = new ethers.Wallet('0x597fa3f7539561851646fef14178a92288b404d27aa2f5f06468aff7fac151b5', provider);

        // Twitter account to monitor
        const TWITTER_ACCOUNT = 'ToDaMoon_Ava';
        console.log(`Starting bot to monitor @${TWITTER_ACCOUNT}...`);

        async function checkMentions() {
            try {
                // Use recent search endpoint to find mentions
                const query = `@${TWITTER_ACCOUNT} url:storyscan`;
                const result = await readClient.v2.search(query, {
                    'tweet.fields': ['author_id', 'created_at', 'text'],
                    'max_results': 10
                });

                if (!result.data || result.data.length === 0) {
                    console.log('No new mentions found');
                    return;
                }

                console.log(`Found ${result.data.length} tweets to process`);

                for (const tweet of result.data) {
                    // Skip if we've already processed this tweet
                    if (processedTweets.has(tweet.id)) {
                        console.log('Tweet already processed:', tweet.id);
                        continue;
                    }

                    console.log('Processing tweet:', tweet.text);

                    // Extract transaction hash
                    const txMatch = tweet.text.match(/https:\/\/aeneid\.storyscan\.xyz\/tx\/(0x[a-fA-F0-9]{64})/);
                    if (!txMatch) {
                        console.log('No Story Protocol transaction found in tweet');
                        processedTweets.add(tweet.id);
                        continue;
                    }

                    const txHash = txMatch[1];
                    console.log('Found transaction hash:', txHash);

                    try {
                        // Get transaction details
                        const tx = await provider.getTransaction(txHash);
                        if (!tx) {
                            console.log('Transaction not found');
                            processedTweets.add(tweet.id);
                            continue;
                        }

                        const walletAddress = tx.from;
                        console.log('Found wallet address:', walletAddress);

                        // Send tip
                        const tipAmount = ethers.parseEther(process.env.TIP_AMOUNT || "1");
                        const tipTx = await wallet.sendTransaction({
                            to: walletAddress,
                            value: tipAmount
                        });

                        console.log('Sending tip transaction...');
                        const receipt = await tipTx.wait();
                        
                        if (receipt?.hash) {
                            // Reply to tweet
                            const replyText = `Thanks for registering your IP! I've sent you a tip of ${process.env.TIP_AMOUNT} tokens. Transaction: https://aeneid.storyscan.xyz/tx/${receipt.hash}`;
                            
                            try {
                                await writeClient.v2.reply(replyText, tweet.id);
                                console.log('Tip sent and reply posted:', receipt.hash);
                            } catch (tweetError) {
                                console.error('Error posting reply tweet:', tweetError);
                                // Try alternative reply method
                                try {
                                    await writeClient.v2.tweet(replyText, {
                                        reply: { in_reply_to_tweet_id: tweet.id }
                                    });
                                    console.log('Tip sent and reply posted (alternative method):', receipt.hash);
                                } catch (altError) {
                                    console.error('Error posting reply tweet (alternative method):', altError);
                                }
                            }
                        }
                    } catch (error) {
                        console.error('Error processing transaction:', error);
                    }

                    // Mark tweet as processed
                    processedTweets.add(tweet.id);
                }
            } catch (error) {
                console.error('Error checking mentions:', error);
            }
        }

        // Initial check
        await checkMentions();

        // Poll every 30 seconds
        setInterval(checkMentions, 30000);

        console.log('Bot is running and checking for mentions every 30 seconds...');

    } catch (error) {
        console.error('Error setting up bot:', error);
        throw error;
    }
}

// Clean up old processed tweets periodically (keep last 1000)
setInterval(() => {
    const tweets = Array.from(processedTweets);
    if (tweets.length > 1000) {
        const toRemove = tweets.slice(0, tweets.length - 1000);
        toRemove.forEach(id => processedTweets.delete(id));
    }
}, 3600000); // Clean up every hour

// Start the bot
console.log('Initializing Story Protocol Tipper Bot...');
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
