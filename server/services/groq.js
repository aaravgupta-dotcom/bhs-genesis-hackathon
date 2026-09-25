// server/services/groq.js
// High-Speed Groq Engine with Qwen 3.8 27B & OpenAI GPT OSS 120B
import OpenAI from 'openai';

let groqClient = null;

function getGroqClient() {
  const apiKey = (process.env.GROQ_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured in environment');
  }
  if (!groqClient) {
    groqClient = new OpenAI({
      apiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    });
  }
  return groqClient;
}

export const GROQ_MODELS = {
  PRIMARY: 'openai/gpt-oss-120b',
  FAST: 'openai/gpt-oss-20b',
  QWEN: 'qwen/qwen3.8-27b',
};

/**
 * Call Groq API with low reasoning effort, structured output, and automatic model failover
 */
export async function callGroq(system, user, opts = {}) {
  let {
    model = GROQ_MODELS.PRIMARY,
    temperature = 0.4,
    max_tokens = 1400,
    json_mode = false,
    timeoutMs = 35000,
  } = opts;

  // Build model fallback sequence for Groq
  const modelsToAttempt = [
    model,
    ...(model === GROQ_MODELS.PRIMARY ? [GROQ_MODELS.FAST] : []),
    ...(model !== GROQ_MODELS.QWEN ? [GROQ_MODELS.QWEN] : []),
  ];

  const client = getGroqClient();
  let lastError = null;

  for (const candidateModel of modelsToAttempt) {
    let tokens = max_tokens;
    // Clamp tokens to stay well below rate limit thresholds
    if (candidateModel.includes('qwen') && tokens > 850) {
      tokens = 850;
    } else if (tokens > 1500) {
      tokens = 1500;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const messages = [];
      if (system && system.trim()) {
        messages.push({ role: 'system', content: system });
      }
      messages.push({ role: 'user', content: user });

      const requestPayload = {
        model: candidateModel,
        messages,
        temperature,
        max_tokens: tokens,
        ...(json_mode ? { response_format: { type: 'json_object' } } : {}),
      };

      // For reasoning models, set reasoning_effort to low so tokens are not consumed by internal thought
      if (candidateModel.includes('gpt-oss')) {
        requestPayload.reasoning_effort = 'low';
      }

      console.log(`[Groq] Querying ${candidateModel} (max_tokens: ${tokens}, json: ${json_mode})...`);
      const completion = await client.chat.completions.create(requestPayload, { signal: controller.signal });
      clearTimeout(timer);

      const content = completion.choices?.[0]?.message?.content || '';
      if (content && content.trim().length > 0) {
        console.log(`[Groq] ✓ ${candidateModel} returned ${content.length} characters`);
        return content.trim();
      }

      console.warn(`[Groq] ${candidateModel} returned empty content, trying next fallback...`);
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      const isRateLimit = err.status === 429 || err.message?.includes('429') || err.message?.includes('Rate limit') || err.message?.includes('TPM');
      if (isRateLimit) {
        console.warn(`[Groq] ${candidateModel} hit rate limit (429): ${err.message.slice(0, 120)}. Switching to next Groq model...`);
        continue;
      }
      // Non-rate-limit error: log and try next
      console.warn(`[Groq] ${candidateModel} failed: ${err.message.slice(0, 100)}`);
    }
  }

  throw lastError || new Error('All Groq models failed');
}
