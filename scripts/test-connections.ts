import { Firestore } from '@google-cloud/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local manually to ensure they are available
// Next.js loads these automatically, but for a standalone script we need to do it or use dotenv
const loadEnv = () => {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf-8');
        envConfig.split('\n').forEach(line => {
            const match = line.match(/^([^#\s][^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                let value = match[2].trim();
                // Remove surrounding quotes if present
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
                    value = value.substring(1, value.length - 1);
                }
                if (!process.env[key]) {
                    process.env[key] = value;
                }
            }
        });
    } else {
        console.warn('⚠️  .env.local not found in the current directory.');
    }
};

loadEnv();

async function testFirestore() {
    console.log('\n--- 1. Testing Firestore Persistence ---');
    try {
        const firestore = new Firestore();
        const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || 'auto-detected';
        console.log(`Initialized Firestore client for Project ID: ${projectId}...`);

        const docRef = firestore.collection('objectives').doc('connection_test');

        // Write
        console.log('Attempting to write document...');
        await docRef.set({ status: 'verified', timestamp: new Date() });

        // Read
        console.log('Attempting to read document back...');
        const doc = await docRef.get();
        if (!doc.exists) {
            throw new Error('Document was written but could not be read back.');
        }
        const data = doc.data();
        if (data?.status !== 'verified') {
            throw new Error(`Status mismatch. Expected 'verified', got '${data?.status}'`);
        }

        // Delete
        console.log('Attempting to delete document...');
        await docRef.delete();

        console.log(`\n🟢 Firestore: Success (Project ID: ${projectId})`);
    } catch (error: any) {
        console.error(`\n🔴 Firestore: Failure`);
        if (error.code) {
            console.error(`Error Code: ${error.code}`);
        }
        console.error(`Error Message: ${error.message}`);

        console.log('\nSuggested Fixes:');
        if (error.message.includes('Could not load the default credentials') || error.message.includes('client_email is not set')) {
            console.log('- Ensure GOOGLE_APPLICATION_CREDENTIALS in .env.local points to a valid JSON key file.');
            console.log('- Check if the JSON key file exists, is readable, and properly formatted.');
        } else if (error.code === 7 || error.message.includes('PERMISSION_DENIED')) {
            console.log('- Verify that the service account has Firestore read/write permissions (e.g., Cloud Datastore User role).');
        } else {
            console.log('- Check your network connection and GCP project status.');
        }
    }
}

async function testNebius() {
    console.log('\n--- 2. Testing Nebius API Handshake ---');
    const apiKey = process.env.NEBIUS_API_KEY;
    const model = 'google/gemma-2-2b-it'; // Using specific model from the objective

    if (!apiKey) {
        console.error('🔴 Nebius: Failure');
        console.error('Error: NEBIUS_API_KEY is not defined in the environment.');
        console.log('Suggested Fix: Add NEBIUS_API_KEY=your_api_key to .env.local');
        return;
    }

    try {
        console.log(`Sending ping request to Nebius API using model: ${model}...`);
        // Note: The base url might be https://api.studio.nebius.ai/v1 or just api.nebius.ai, going with the standard assumption
        const response = await fetch('https://api.tokenfactory.nebius.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: 'ping' }],
                max_tokens: 5
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status} ${response.statusText}: ${errorText}`);
        }

        const data = await response.json();

        if (data.choices && data.choices.length > 0 && typeof data.choices[0].message?.content === 'string') {
            console.log(`\n🟢 Nebius: Success (Model: ${model})`);
            console.log(`Response received: "${data.choices[0].message.content.trim()}"`);
        } else {
            throw new Error('Invalid response structure returned from Nebius API.');
        }

    } catch (error: any) {
        console.error(`\n🔴 Nebius: Failure (Model: ${model})`);
        console.error(`Error Message: ${error.message}`);

        console.log('\nSuggested Fixes:');
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            console.log('- Verify that NEBIUS_API_KEY is correct and active in .env.local.');
        } else if (error.message.includes('404')) {
            console.log('- The endpoint URL might be incorrect or the model is not available. Check Nebius documentation for exact base URL.');
        } else {
            console.log('- Check your network connectivity.');
            console.log('- Ensure the Nebius Studio API is reachable from your environment.');
        }
    }
}

async function runTests() {
    await testFirestore();
    await testNebius();
}

runTests();
