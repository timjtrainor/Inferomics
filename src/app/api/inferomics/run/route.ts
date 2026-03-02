import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { getFirestore } from '@/lib/firebase-admin';
import { getModels, type StandardizedModel } from '@/lib/models';
import OpenAI from 'openai';

const BUCKET_NAME = process.env.GOOGLE_CLOUD_STORAGE_BUCKET || 'inferomics-c01tx-datastore';
const NEBIUS_API_KEY = process.env.NEBIUS_API_KEY;
const NEBIUS_BASE_URL = 'https://api.tokenfactory.nebius.com/v1/';

// ... interfaces omitted for brevity ... (Assuming they stay the same or are imported if moved)
interface EngineMetrics {
    accuracy: number;
    reliability: number;
    avg_latency: number;
    total_cost: number;
    tei: number;
    cost_per_1m: number;
    processed_count: number;
    ies?: number;
}

interface LoggedSample {
    raw: string;
    extracted: string;
    ground: string;
    match: 'Y' | 'N';
}

/**
 * Baseline Discovery Engine Route
 * POST /api/inferomics/run
 */
export async function POST(request: NextRequest) {
    if (!NEBIUS_API_KEY) {
        return NextResponse.json({ error: 'NEBIUS_API_KEY not configured' }, { status: 500 });
    }

    try {
        const { objectiveId, runId, selectedModels, datasetId, accuracy } = await request.json();

        if (!objectiveId || !runId || !selectedModels || !Array.isArray(selectedModels)) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const firestore = getFirestore();
        const objDoc = await firestore.collection('objectives').doc(objectiveId).get();
        if (!objDoc.exists) return NextResponse.json({ error: 'Objective not found' }, { status: 404 });

        const objData = objDoc.data() || {};
        const effectiveDatasetId = datasetId || objData.selected_dataset_id;
        const effectiveAccuracy = accuracy || objData.accuracy || 'Standard';

        // Kick off the background process immediately
        runDiscoveryTask(objectiveId, runId, selectedModels, effectiveDatasetId, effectiveAccuracy, objData.master_prompt)
            .catch(err => console.error(`Background Discovery Run ${runId} failed:`, err));

        // Return immediately with success
        return NextResponse.json({ success: true, runId });

    } catch (error: unknown) {
        console.error('Discovery Engine trigger failure:', error);
        return NextResponse.json({ error: 'Failed to trigger discovery run' }, { status: 500 });
    }
}

/**
 * Background Discovery Task
 */
async function runDiscoveryTask(
    objectiveId: string,
    runId: string,
    selectedModels: string[],
    datasetId: string,
    accuracy: string,
    masterPrompt: string
) {
    const firestore = getFirestore();
    const runRef = firestore.collection('objectives').doc(objectiveId).collection('runs').doc(runId);

    try {
        // 1. GCS Ingestion
        const storage = new Storage();
        const bucket = storage.bucket(BUCKET_NAME);
        const sampleFileName = `samples/${datasetId.replace('.jsonl', '')}-${accuracy.toLowerCase()}.json`;
        const [content] = await bucket.file(sampleFileName).download();
        const samples = JSON.parse(content.toString('utf-8')).sample || [];

        // 2. Fetch Dynamic Pricing (Internal call refactored to direct import)
        const availableModels = await getModels();

        const client = new OpenAI({ apiKey: NEBIUS_API_KEY, baseURL: NEBIUS_BASE_URL });
        const BATCH_SIZE = 10;
        const modelResults: Record<string, EngineMetrics> = {};

        const objDoc = await firestore.collection('objectives').doc(objectiveId).get();
        const objData = objDoc.data() || {};
        const projectedVolume = objData.economic_levers?.volume || 10000;
        const errorRiskCost = objData.economic_levers?.error_cost || 25.0;

        for (const modelId of selectedModels) {
            const modelInfo = availableModels.find((m: StandardizedModel) => m.id === modelId);
            const nebiusSlug = modelInfo?.id || modelId;

            let modelTotalLatency = 0, modelTotalPromptTokens = 0, modelTotalCompletionTokens = 0;
            let modelSuccessCount = 0, modelReliabilityCount = 0, processedCount = 0;
            const samplesLogged: LoggedSample[] = [];

            for (let i = 0; i < samples.length; i += BATCH_SIZE) {
                const batch = samples.slice(i, i + BATCH_SIZE);
                const firestoreBatch = firestore.batch();

                const batchPromises = batch.map(async (item: Record<string, string>) => {
                    const startTime = Date.now();
                    try {
                        const completion = await client.chat.completions.create({
                            model: nebiusSlug,
                            messages: [
                                { role: 'system', content: masterPrompt || 'You are a helpful assistant.' },
                                { role: 'user', content: item.prompt }
                            ],
                            temperature: 0.1, max_tokens: 512,
                        });

                        const latencyMs = Date.now() - startTime;
                        const output = completion.choices[0]?.message?.content || '';
                        const groundTruth = item.completion || '';

                        const hasBrackets = output.includes('[[') && output.includes(']]');
                        if (hasBrackets) modelReliabilityCount++;

                        let extractedLabel = output;
                        const bracketMatch = output.match(/\[\[(.*?)\]\]/);
                        if (bracketMatch) extractedLabel = bracketMatch[1].trim();

                        const isCorrect = extractedLabel.toLowerCase() === groundTruth.toLowerCase();
                        if (isCorrect) modelSuccessCount++;

                        if (samplesLogged.length < 3) {
                            samplesLogged.push({
                                raw: output.substring(0, 100) + (output.length > 100 ? '...' : ''),
                                extracted: extractedLabel, ground: groundTruth, match: isCorrect ? 'Y' : 'N'
                            });
                        }

                        modelTotalLatency += latencyMs;
                        modelTotalPromptTokens += completion.usage?.prompt_tokens || 0;
                        modelTotalCompletionTokens += completion.usage?.completion_tokens || 0;
                        processedCount++;

                        // Batch Firestore writes
                        const responseId = `resp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                        const safeModelId = modelId.replace(/\//g, '_');
                        const respRef = firestore.collection('objectives').doc(objectiveId).collection('models').doc(safeModelId).collection('results').doc(responseId);

                        firestoreBatch.set(respRef, {
                            model_id: modelId, nebius_slug: nebiusSlug, input_text: item.prompt,
                            raw_output: output, ground_truth: groundTruth, extracted_label: extractedLabel,
                            latency_ms: latencyMs, usage: completion.usage, is_correct: isCorrect,
                            is_reliable: hasBrackets, run_id: runId, timestamp: new Date(),
                        });

                    } catch (e) { console.error(`Inference error:`, e); }
                });

                await Promise.all(batchPromises);
                await firestoreBatch.commit();
            }

            const priceIn = modelInfo?.priceIn || 0, priceOut = modelInfo?.priceOut || 0;
            const totalTokenCost = ((modelTotalPromptTokens / 1000000) * priceIn) + ((modelTotalCompletionTokens / 1000000) * priceOut);
            const accuracy = processedCount > 0 ? (modelSuccessCount / processedCount) : 0;
            const reliability = processedCount > 0 ? (modelReliabilityCount / processedCount) : 0;
            const avgLatency = processedCount > 0 ? (modelTotalLatency / processedCount) : 0;
            const tei = totalTokenCost + ((1 - accuracy) * projectedVolume * errorRiskCost);

            modelResults[modelId] = {
                accuracy: Math.round(accuracy * 10000) / 100, reliability: Math.round(reliability * 10000) / 100,
                avg_latency: Math.round(avgLatency), total_cost: totalTokenCost, tei: Math.round(tei * 100) / 100,
                cost_per_1m: Math.round(((totalTokenCost / (processedCount || 1)) * 1000000) * 100) / 100,
                processed_count: processedCount
            };
        }

        // IES Calculation & Model Persistence
        const maxLatency = Math.max(...Object.values(modelResults).map(m => m.avg_latency)) || 1;
        const maxCostPer1M = Math.max(...Object.values(modelResults).map(m => m.cost_per_1m)) || 0.01;

        for (const modelId in modelResults) {
            const m = modelResults[modelId];
            const ies = (((m.accuracy / 100) * 0.7) + ((m.reliability / 100) * 0.3)) / ((m.avg_latency / maxLatency) + (m.cost_per_1m / maxCostPer1M) + 0.001);
            m.ies = Math.round(ies * 100) / 100;

            const safeModelId = modelId.replace(/\//g, '_');
            await firestore.collection('objectives').doc(objectiveId).collection('models').doc(safeModelId).set({
                id: modelId, cumulative_metrics: m, last_run_id: runId, last_run_at: new Date(), updated_at: new Date(),
            }, { merge: true });
        }

        await runRef.update({ status: 'COMPLETE', metrics: modelResults, updated_at: new Date() });

    } catch (error) {
        console.error('Background Discovery Engine failure:', error);
        await runRef.update({ status: 'ERROR', updated_at: new Date() });
    }
}
