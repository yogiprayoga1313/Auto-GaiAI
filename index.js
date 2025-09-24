require('dotenv').config();
const axios = require('axios');
const { ethers } = require('ethers');
const chalk = require('chalk').default;
const Table = require('cli-table3');
const readline = require('readline');

const {
    PRIVATE_KEY,
    ADDRESS,
    API_BASE = 'https://api.metagaia.io',
    NAME = 'okx',
    INVITE_CODE = 'VCM1MZ'
} = process.env;

if (!PRIVATE_KEY || !ADDRESS) {
    console.error(chalk.red('ERROR: Please set PRIVATE_KEY and ADDRESS in .env'));
    process.exit(1);
}

const http = axios.create({
    baseURL: API_BASE,
    headers: {
        Accept: 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        Origin: 'https://www.gaiai.io',
        Referer: 'https://www.gaiai.io/'
    },
    timeout: 20000
});

// ===== Helper =====
async function fetchNonce(address) {
    const ts = Date.now();
    const res = await http.get(`/api/v2/gaiai-login/wallet-nonce`, {
        params: { address },
        headers: { signature: String(ts) }
    });
    return res.data?.data?.nonce || res.data?.nonce;
}

async function walletLogin(address, signature, nonce) {
    const payload = { address, signature, message: nonce, name: NAME };
    if (INVITE_CODE) payload.inviteCode = INVITE_CODE;
    const ts = Date.now();
    const res = await http.post(`/api/v2/gaiai-login/wallet`, payload, {
        headers: { signature: String(ts) }
    });
    return res.data;
}

async function callAuthGet(path, token) {
    const res = await http.get(path, {
        headers: { signature: String(Date.now()), token }
    });
    return res.data;
}

async function callAuthPost(path, token, data = {}) {
    const res = await http.post(path, data, {
        headers: { signature: String(Date.now()), token }
    });
    return res.data;
}

// ===== Retry helper =====
async function retryRequest(fn, retries = 3, delay = 5000) {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (err) {
            console.log(chalk.yellow(`Attempt ${i + 1} failed: ${err.message}. Retrying in ${delay/1000}s...`));
            await new Promise(r => setTimeout(r, delay));
        }
    }
    throw new Error(`All ${retries} retries failed`);
}

// ===== Terminal input untuk prompt =====
async function askPrompt(defaultPrompt = 'jokowi') {
    return new Promise(resolve => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question(`Masukkan prompt untuk generate AI task (default: "${defaultPrompt}"): `, (answer) => {
            rl.close();
            resolve(answer && answer.trim() !== '' ? answer.trim() : defaultPrompt);
        });
    });
}

// ===== Profile & Collection =====
function printProfile(profile) {
    const table = new Table({ head: ['Field', 'Value'], colWidths: [20, 40] });
    table.push(
        ['ID', profile.id],
        ['Username', profile.username || '-'],
        ['Address', profile.address.address],
        ['Wallet Name', profile.address.name],
        ['Creations', profile.creations],
        ['Followers', profile.fllowers],
        ['Following', profile.fllowing],
        ['gPoints', profile.gPoints]
    );
    console.log(chalk.blue('\n=== Profile ==='));
    console.log(table.toString());
}

function printCreations(creations) {
    if (!creations || creations.length === 0) {
        console.log(chalk.yellow('No creations found today.'));
        return;
    }
    const table = new Table({
        head: ['#', 'Prompt', 'Model', 'Image URL', 'Created At'],
        colWidths: [5, 20, 10, 60, 20]
    });
    creations.forEach((c, i) => {
        table.push([
            i + 1,
            c.aiTaskDetail.prompt,
            c.modelName,
            c.imageUrl,
            c.createdAt
        ]);
    });
    console.log(chalk.green('\n=== Today\'s AI Creations ==='));
    console.log(table.toString());
}

// ===== Create-task otomatis dengan retry + fetch ulang =====
async function createTaskWithCheck(token, prompt, retries = 3, delay = 5000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(chalk.cyan(`\nCreating AI task (attempt ${attempt})...`));
            const res = await callAuthPost('/api/v2/gaiai-ai/create-task', token, {
                type: "1",
                prompt,
                width: "1024",
                height: "1024",
                aspectRatio: "1"
            });

            if (res?.code === 0 || res?.code === 1) {
                console.log(chalk.green('✅ AI task created successfully.'));
                return true;
            } else {
                console.log(chalk.red('❌ Failed to create AI task:', res.message));
            }
        } catch (err) {
            console.log(chalk.yellow(`Attempt ${attempt} failed: ${err.message}. Retrying in ${delay/1000}s...`));
            await new Promise(r => setTimeout(r, delay));
        }

        // fetch creations lagi setelah gagal
        console.log(chalk.cyan('Checking if task actually got created...'));
        const creationsRes = await callAuthGet('/api/v2/gaiai-user/creations?page=1&pageSize=99999', token);
        const creations = creationsRes?.data || [];
        if (creations.length > 0) {
            console.log(chalk.green('✅ AI task detected after failure!'));
            printCreations(creations);
            return true;
        }
    }

    console.log(chalk.red('❌ All retries failed and no creations found.'));
    return false;
}

// ===== Main Flow =====
async function runFlow() {
    console.log(chalk.cyan('1) Fetching nonce...'));
    const nonce = await fetchNonce(ADDRESS);
    if (!nonce) throw new Error('Nonce not found from server');
    console.log(chalk.yellow('Nonce:'), nonce);

    console.log(chalk.cyan('\n2) Signing nonce with wallet...'));
    const wallet = new ethers.Wallet(PRIVATE_KEY);
    const signature = await wallet.signMessage(nonce);
    console.log(chalk.yellow('Signature:'), signature);

    const recovered = ethers.verifyMessage(nonce, signature);
    console.log(chalk.green('Recovered address:'), recovered);
    if (recovered.toLowerCase() !== ADDRESS.toLowerCase()) {
        throw new Error('Local signature verification failed: address mismatch');
    }

    console.log(chalk.green('✅ Signature verified locally. Logging in...'));
    const loginRes = await walletLogin(ADDRESS, signature, nonce);
    const token = loginRes?.data?.token || loginRes?.token || loginRes?.accessToken;
    if (!token) throw new Error('Server rejected signature or token not found.');
    console.log(chalk.green('✅ Login successful! Token acquired.'));

    console.log(chalk.cyan('\n3) Fetching profile...'));
    const profileRes = await callAuthGet('/api/v2/gaiai-user/profile', token);
    if (profileRes?.data) printProfile(profileRes.data);

    console.log(chalk.cyan('\n4) Daily check-in...'));
    const dailyRes = await callAuthPost('/api/v1/gaiai-sign', token, {});
    console.log(chalk.green(`✅ Daily check-in: ${dailyRes?.data?.gPoints || '-'} gPoints`));

    console.log(chalk.cyan('\n5) Fetching today\'s creations...'));
    let creationsRes = await callAuthGet('/api/v2/gaiai-user/creations?page=1&pageSize=99999', token);
    let creations = creationsRes?.data || [];

    // tanya user untuk prompt sebelum create-task
    if (creations.length === 0) {
        const userPrompt = await askPrompt('jokowi');
        await createTaskWithCheck(token, userPrompt, 3, 5000);

        // fetch ulang creations untuk menampilkan
        creationsRes = await callAuthGet('/api/v2/gaiai-user/creations?page=1&pageSize=99999', token);
        creations = creationsRes?.data || [];
    }

    printCreations(creations);
}

runFlow().catch(err => {
    console.error(chalk.red('Error:'), err.message || err);
    process.exit(1);
});
