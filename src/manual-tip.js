const { ethers } = require('ethers');
const readline = require('readline');
require('dotenv').config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function processTweet(tweetText) {
    try {
        // Initialize Ethereum provider and wallet
        const provider = new ethers.JsonRpcProvider(process.env.STORY_RPC_URL);
        const wallet = new ethers.Wallet(process.env.STORY_WALLET_PRIVATE_KEY, provider);

        // Extract transaction hash
        const txMatch = tweetText.match(/https:\/\/aeneid\.storyscan\.xyz\/tx\/(0x[a-fA-F0-9]{64})/);
        if (!txMatch) {
            console.log('No Story Protocol transaction found in tweet text');
            return;
        }

        const txHash = txMatch[1];
        console.log('Found transaction hash:', txHash);

        // Get transaction details
        const tx = await provider.getTransaction(txHash);
        if (!tx) {
            console.log('Transaction not found');
            return;
        }

        const walletAddress = tx.from;
        console.log('Found wallet address:', walletAddress);

        // Confirm before sending tip
        const tipAmount = process.env.TIP_AMOUNT || "1";
        console.log(`\nReady to send ${tipAmount} tokens to ${walletAddress}`);
        
        const confirm = await new Promise(resolve => {
            rl.question('Do you want to proceed? (yes/no): ', answer => {
                resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
            });
        });

        if (!confirm) {
            console.log('Transaction cancelled');
            return;
        }

        // Send tip
        const tipTx = await wallet.sendTransaction({
            to: walletAddress,
            value: ethers.parseEther(tipAmount)
        });

        console.log('Sending tip transaction...');
        const receipt = await tipTx.wait();
        
        if (receipt?.hash) {
            console.log(`\nTip sent successfully!`);
            console.log(`Transaction hash: ${receipt.hash}`);
            console.log(`View on StoryScan: https://aeneid.storyscan.xyz/tx/${receipt.hash}`);
        }

    } catch (error) {
        console.error('Error processing transaction:', error);
    }
}

async function main() {
    try {
        console.log('Story Protocol Manual Tipper');
        console.log('---------------------------');
        console.log('Enter a tweet text or URL containing a Story Protocol transaction.');
        console.log('Type "exit" to quit.\n');

        while (true) {
            const tweetText = await new Promise(resolve => {
                rl.question('Enter tweet text: ', resolve);
            });

            if (tweetText.toLowerCase() === 'exit') {
                break;
            }

            await processTweet(tweetText);
            console.log('\n---\n');
        }

    } catch (error) {
        console.error('Fatal error:', error);
    } finally {
        rl.close();
    }
}

// Start the script
main().catch(console.error);
