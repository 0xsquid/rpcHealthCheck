const axios = require('axios');
const fs = require('fs').promises;

// Store failing RPCs
let failingRpcs = {
    evm: [],
    cosmos: []
};

// Check EVM RPCs
async function checkEvmRpc(rpcUrl) {
    try {
        const response = await axios.post(rpcUrl, {
            jsonrpc: "2.0",
            method: "eth_blockNumber",
            params: [],
            id: 1
        });
        if (response.data.result) {
            console.log(`EVM RPC ${rpcUrl} is healthy. Latest block: ${parseInt(response.data.result, 16)}`);
        } else {
            console.log(`EVM RPC ${rpcUrl} returned an invalid response.`);
            failingRpcs.evm.push(rpcUrl);
        }
    } catch (error) {
        console.log(`EVM RPC ${rpcUrl} failed: ${error.message}`);
        failingRpcs.evm.push(rpcUrl);
    }
}

// Check Cosmos RPCs
async function checkCosmosRpc(rpcUrl) {
    try {
        const response = await axios.get(`${rpcUrl}/status`);
        if (response.data && response.data.result) {
            console.log(`Cosmos RPC ${rpcUrl} is healthy. Latest block: ${response.data.result.sync_info.latest_block_height}`);
        } else {
            console.log(`Cosmos RPC ${rpcUrl} returned an invalid response.`);
            failingRpcs.cosmos.push(rpcUrl);
        }
    } catch (error) {
        console.log(`Cosmos RPC ${rpcUrl} failed: ${error.message}`);
        failingRpcs.cosmos.push(rpcUrl);
    }
}

// Function to load the RPC list from the JSON file
async function loadRpcList() {
    try {
        const data = await fs.readFile('rpcLinks.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading RPC links file:", error);
        throw error;
    }
}

// Main function to check all RPCs in parallel and log the failing ones
async function checkRpcHealth() {
    try {
        const rpcList = await loadRpcList();

        console.log("Checking EVM RPCs in parallel...");
        const evmPromises = rpcList.evm.map(evmRpc => checkEvmRpc(evmRpc)); // Check all EVM RPCs in parallel

        console.log("Checking Cosmos RPCs in parallel...");
        const cosmosPromises = rpcList.cosmos.map(cosmosRpc => checkCosmosRpc(cosmosRpc)); // Check all Cosmos RPCs in parallel

        // Wait for all checks to complete
        await Promise.all([...evmPromises, ...cosmosPromises]);

        // Log failing RPCs
        console.log("\n--- Summary of Failing RPCs ---");
        if (failingRpcs.evm.length > 0) {
            console.log("Failing EVM RPCs:");
            failingRpcs.evm.forEach(url => console.log(url));
        } else {
            console.log("No failing EVM RPCs.");
        }

        if (failingRpcs.cosmos.length > 0) {
            console.log("Failing Cosmos RPCs:");
            failingRpcs.cosmos.forEach(url => console.log(url));
        } else {
            console.log("No failing Cosmos RPCs.");
        }
    } catch (error) {
        console.error("Error during the RPC health check process:", error);
    }
}

// Run the health check
checkRpcHealth();