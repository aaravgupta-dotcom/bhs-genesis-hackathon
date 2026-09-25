// server/services/llm.js
// Enterprise Multi-Provider LLM client: Google Gemini + NVIDIA NIM with automated failover
// API keys are strictly read server-side from process.env — never leaked to client

import OpenAI from 'openai';
import { callGemini } from './gemini.js';
import { callGroq, GROQ_MODELS } from './groq.js';

let keyIndex = 0;
function getApiKeys() {
  const keysStr = process.env.NVIDIA_API_KEYS || process.env.NVIDIA_API_KEY || '';
  const list = keysStr.split(',').map(k => k.trim()).filter(Boolean);
  return list.length > 0 ? list : [''];
}

function getNextApiKey() {
  const keys = getApiKeys();
  const key = keys[keyIndex % keys.length];
  keyIndex++;
  return key;
}

const clients = new Map();
function getClient(apiKey) {
  const key = apiKey || getNextApiKey();
  if (!key) {
    throw new Error('NVIDIA_API_KEY is not set in environment variables');
  }
  if (!clients.has(key)) {
    clients.set(key, new OpenAI({
      apiKey: key,
      baseURL: 'https://integrate.api.nvidia.com/v1',
    }));
  }
  return clients.get(key);
}

const FALLBACK_MODELS = [
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-120b',
  'meta/llama-3.2-11b-vision-instruct',
  'gemini-3.8-flash',
];

export async function callLLM(system, user, opts = {}) {
  const defaultModel = process.env.GROQ_API_KEY
    ? GROQ_MODELS.PRIMARY
    : (process.env.GEMINI_API_KEY ? 'gemini-3.8-flash' : (process.env.NVIDIA_MODEL || 'meta/llama-3.2-11b-vision-instruct'));

  const {
    model = defaultModel,
    temperature = 0.4,
    max_tokens = 2500,
    json_mode = false,
    timeoutMs = 60000,
    maxModelAttempts = 2,
  } = opts;

  // Determine provider routing
  const isGroqModel = model.startsWith('qwen/') || model.startsWith('openai/gpt-oss') || model.startsWith('groq/');
  const isExplicitNvidia = model.startsWith('meta/') ||
                           model.startsWith('moonshotai/') ||
                           model.startsWith('deepseek') ||
                           model.startsWith('mistralai/') ||
                           model.startsWith('nvidia/');
  const isGeminiModel = model.toLowerCase().includes('gemini');

  // ── BRANCH 0: Groq High-Speed Engine (Qwen 3.8 27B / GPT OSS 120B) ──
  const wantsGroq = (isGroqModel || (!isExplicitNvidia && !isGeminiModel && Boolean(process.env.GROQ_API_KEY))) && !opts.forceNvidia && !opts.forceGemini;
  if (wantsGroq) {
    const groqModelName = isGroqModel ? model : GROQ_MODELS.PRIMARY;
    try {
      console.log(`[callLLM] Routing to Groq Engine (model: ${groqModelName}, json: ${json_mode})...`);
      const groqResult = await callGroq(system, user, {
        model: groqModelName,
        temperature,
        max_tokens,
        json_mode,
        timeoutMs,
      });
      if (groqResult && groqResult.trim().length > 0) {
        console.log(`[callLLM] ✓ Groq responded successfully (${groqResult.length} chars)`);
        return groqResult;
      }
    } catch (groqErr) {
      console.warn(`[callLLM] Groq call failed (${groqErr.message}). Failing over to secondary provider...`);
    }
  }

  // ── BRANCH 1: Google Gemini ──
  const wantsGemini = (isGeminiModel || (!isExplicitNvidia && Boolean(process.env.GEMINI_API_KEY))) && !opts.forceNvidia;
  if (wantsGemini) {
    try {
      const geminiModel = isGeminiModel ? model : 'gemini-3.8-flash';
      console.log(`[callLLM] Routing to Google Gemini API (model: ${geminiModel})...`);
      const geminiResult = await callGemini(system, user, {
        model: geminiModel,
        temperature,
        max_tokens,
        json_mode,
        timeoutMs,
      });
      if (geminiResult && geminiResult.trim().length > 0) {
        console.log(`[callLLM] ✓ Google Gemini responded successfully (${geminiResult.length} chars)`);
        return geminiResult;
      }
    } catch (geminiErr) {
      console.warn(`[callLLM] Google Gemini call failed (${geminiErr.message}). Falling back to NVIDIA NIM...`);
    }
  }

  // ── BRANCH 2: NVIDIA NIM ──
  const apiKey = getNextApiKey();
  const c = getClient(apiKey);

  const executeCall = async (modelName, currentTimeoutMs, useJson) => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      console.warn(`[callLLM] Timed out after ${currentTimeoutMs}ms for "${modelName}"`);
      controller.abort();
    }, currentTimeoutMs);

    try {
      const response = await c.chat.completions.create(
        {
          model: modelName,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          temperature,
          max_tokens,
          ...(useJson ? { response_format: { type: 'json_object' } } : {}),
        },
        { signal: controller.signal }
      );
      clearTimeout(timer);
      return response.choices[0]?.message?.content || '';
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  };

  const nvidiaPrimary = isExplicitNvidia ? model : 'meta/llama-3.2-11b-vision-instruct';
  const modelsToTry = [
    nvidiaPrimary,
    ...(nvidiaPrimary !== 'meta/llama-3.2-11b-vision-instruct' ? ['meta/llama-3.2-11b-vision-instruct'] : ['moonshotai/kimi-k3']),
  ].slice(0, Math.max(1, maxModelAttempts));

  let lastError = new Error('No models attempted');

  for (const modelName of modelsToTry) {
    for (const useJson of json_mode ? [true, false] : [false]) {
      try {
        console.log(`[callLLM] Trying NVIDIA NIM model "${modelName}" json=${useJson}`);
        const result = await executeCall(modelName, timeoutMs, useJson);
        if (result && result.trim().length > 0) {
          return result;
        }
      } catch (err) {
        lastError = err;
        console.warn(`[callLLM] "${modelName}" failed: ${err.message}`);
      }
    }
  }

  // Final fallback to Gemini if not tried already
  if (process.env.GEMINI_API_KEY && !model.toLowerCase().includes('gemini')) {
    try {
      console.log('[callLLM] Attempting emergency fallback to Gemini...');
      return await callGemini(system, user, { temperature, max_tokens, json_mode, timeoutMs });
    } catch (e) {
      console.warn('[callLLM] Emergency Gemini fallback failed:', e.message);
    }
  }

  throw new Error(`All LLM models failed. Last error: ${lastError.message}`);
}
