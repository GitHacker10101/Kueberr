
import fs from 'fs';

const BASE_URL = 'http://localhost:3001/api';
const LOG_FILE = 'test_output.txt';

function log(msg) {
    console.log(msg);
    fs.appendFileSync(LOG_FILE, msg + '\n');
}

async function testPortfolio() {
    log('Testing Portfolio Persistence...');

    // 1. Get initial portfolio
    try {
        const res1 = await fetch(`${BASE_URL}/portfolio`);
        if (!res1.ok) throw new Error(`Failed to fetch portfolio: ${res1.statusText}`);
        const data1 = await res1.json();
        const initialCount = data1.holdings.length;
        log(`Initial holdings count: ${initialCount}`);

        // 2. Add holding (RELIANCE)
        const stocksRes = await fetch(`${BASE_URL}/market/stocks`);
        const stocks = await stocksRes.json();
        const reliance = stocks.find(s => s.symbol === 'RELIANCE');

        if (!reliance) {
            log('Could not find RELIANCE asset');
            return;
        }

        const addRes = await fetch(`${BASE_URL}/portfolio`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                assetId: reliance.id,
                quantity: 10,
                price: 2500
            })
        });

        if (!addRes.ok) {
            log(`Failed to add holding: ${await addRes.text()}`);
            return;
        }
        const addedHolding = await addRes.json();
        log(`Added holding: ${addedHolding.id}`);

        // 3. Verify addition
        const res2 = await fetch(`${BASE_URL}/portfolio`);
        const data2 = await res2.json();
        log(`Holdings count after add: ${data2.holdings.length}`);

        if (data2.holdings.length !== initialCount + 1) {
            log('ERROR: Portfolio count did not increase correctly');
        }

        // 4. Remove holding
        const delRes = await fetch(`${BASE_URL}/portfolio/${addedHolding.id}`, {
            method: 'DELETE'
        });

        if (!delRes.ok) {
            log(`Failed to delete holding: ${await delRes.text()}`);
        }
        log('Deleted holding');

        // 5. Verify removal
        const res3 = await fetch(`${BASE_URL}/portfolio`);
        const data3 = await res3.json();
        log(`Holdings count after delete: ${data3.holdings.length}`);

        if (data3.holdings.length !== initialCount) {
            log('ERROR: Portfolio count not back to initial');
        }
    } catch (e) {
        log(`Error in testPortfolio: ${e.message}`);
        throw e;
    }
}

async function testWatchlist() {
    log('\nTesting Watchlist Persistence...');

    try {
        // 1. Get initial watchlist
        const res1 = await fetch(`${BASE_URL}/watchlist`);
        const data1 = await res1.json();
        const initialCount = data1.assets.length;
        log(`Initial watchlist count: ${initialCount}`);

        // 2. Add to watchlist (TCS)
        const stocksRes = await fetch(`${BASE_URL}/market/stocks`);
        const stocks = await stocksRes.json();
        const tcs = stocks.find(s => s.symbol === 'TCS');

        if (!tcs) {
            log('Could not find TCS asset');
            return;
        }

        const addRes = await fetch(`${BASE_URL}/watchlist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assetId: tcs.id })
        });

        if (!addRes.ok) {
            log(`Failed to add to watchlist: ${await addRes.text()}`);
            return;
        }

        const addedItem = await addRes.json();
        log(`Added to watchlist: ${addedItem.id}`);

        // 3. Verify addition
        const res2 = await fetch(`${BASE_URL}/watchlist`);
        const data2 = await res2.json();
        log(`Watchlist count after add: ${data2.assets.length}`);

        if (data2.assets.length !== initialCount + 1) {
            log('ERROR: Watchlist count did not increase');
        }

        // 4. Remove from watchlist
        const delRes = await fetch(`${BASE_URL}/watchlist/${tcs.id}`, {
            method: 'DELETE'
        });

        if (!delRes.ok) {
            log(`Failed to delete from watchlist: ${await delRes.text()}`);
        }
        log('Deleted from watchlist');

        // 5. Verify removal
        const res3 = await fetch(`${BASE_URL}/watchlist`);
        const data3 = await res3.json();
        log(`Watchlist count after delete: ${data3.assets.length}`);

        if (data3.assets.length !== initialCount) {
            log('ERROR: Watchlist count not back to initial');
        }
    } catch (e) {
        log(`Error in testWatchlist: ${e.message}`);
        throw e;
    }
}

async function run() {
    fs.writeFileSync(LOG_FILE, 'Starting test...\n');
    try {
        await testPortfolio();
        await testWatchlist();
        log('All tests completed.');
    } catch (err) {
        log('Test suite failed: ' + err.stack);
    }
}

run();
