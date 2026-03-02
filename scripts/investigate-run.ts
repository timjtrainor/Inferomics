import { getFirestore } from '../src/lib/firebase-admin';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function findRun() {
    const db = getFirestore();
    const runId = 'run_1772478884682';

    console.log(`--- Searching for ${runId} ---`);

    const objSnap = await db.collection('objectives').get();
    let found = false;

    for (const objDoc of objSnap.docs) {
        const runDoc = await objDoc.ref.collection('runs').doc(runId).get();
        if (runDoc.exists) {
            console.log(`Found in objective: ${objDoc.id}`);
            console.log('Run Data:', JSON.stringify(runDoc.data(), null, 2));
            found = true;

            // If found, check for results in models
            const modelsSnap = await objDoc.ref.collection('models').get();
            for (const modelDoc of modelsSnap.docs) {
                const resultsSnap = await modelDoc.ref.collection('results').where('run_id', '==', runId).get();
                if (!resultsSnap.empty) {
                    console.log(`Model ${modelDoc.id} has ${resultsSnap.size} results for this run.`);
                }
            }
        }
    }

    if (!found) {
        console.log('Run NOT found anywhere.');

        // List last 5 runs in default objective
        console.log('\n--- Status of last 5 runs in "default" objective ---');
        const lastRuns = await db.collection('objectives').doc('default').collection('runs')
            .orderBy('updated_at', 'desc')
            .limit(5)
            .get();

        lastRuns.forEach(d => {
            console.log(`${d.id} | Status: ${d.data().status} | Updated: ${d.data().updated_at?.toDate()?.toISOString()}`);
        });
    }
}

findRun();
