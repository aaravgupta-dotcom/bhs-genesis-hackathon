// server/services/gemini.js
// Official Gemini Client with auto-detection for query key vs Bearer token & retry handling

const GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-2.5-flash',
  'gemini-1.5-flash',
];

/**
 * Call Gemini API using Google Generative Language endpoints
 * Automatically tests query parameter (?key=) and Bearer token formats with retries on 503
 */
export async function callGemini(system, user, opts = {}) {
  const {
    model = 'gemini-3.8-flash',
    temperature = 0.4,
    max_tokens = 2200,
    json_mode = false,
    timeoutMs = 60000,
  } = opts;

  const apiKey = (opts.apiKey || process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in server environment');
  }

  const promptText = system ? `${system}\n\n${user}` : user;

  // Normalize model name
  let targetModel = model;
  if (targetModel === 'gemini-2.0-flash' || !targetModel.startsWith('gemini-')) {
    targetModel = 'gemini-3.8-flash';
  }

  const modelsToTry = [
    targetModel,
    ...GEMINI_MODELS.filter(m => m !== targetModel),
  ];

  let lastError = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: promptText }] }],
          generationConfig: {
            temperature,
            maxOutputTokens: max_tokens,
            ...(json_mode ? { responseMimeType: 'application/json' } : {}),
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim().length > 0) {
          console.log(`[Gemini] ✓ Successfully generated response with model "${targetModel}"`);
          return text.trim();
        }
      }

      const errorBody = await res.text();
      console.warn(`[Gemini] ${targetModel} HTTP ${res.status}: ${errorBody.slice(0, 180)}`);

      if (res.status === 429) {
        // Quota exhausted: fail fast so fallback engine can take over immediately
        throw new Error(`Gemini Quota Exceeded (HTTP 429): ${errorBody.slice(0, 80)}`);
      }

      if (res.status === 503) {
        // 503 spike: wait 800ms before one quick retry
        if (attempt === 0) {
          await new Promise(r => setTimeout(r, 800));
          continue;
        }
      }

      lastError = new Error(`HTTP ${res.status}: ${errorBody.slice(0, 100)}`);
      break;
    } catch (err) {
      clearTimeout(timer);
      if (err.message.includes('429')) throw err;
      lastError = err;
      break;
    }
  }

  // Method 2: OpenAI-compatible endpoint fallback
  try {
    const OpenAI = (await import('openai')).default;
    const client = new OpenAI({
      apiKey,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    });

    const res = await client.chat.completions.create(
      {
        model: 'gemini-3.8-flash',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature,
        max_tokens,
        ...(json_mode ? { response_format: { type: 'json_object' } } : {}),
      },
      { timeout: timeoutMs }
    );

    const content = res.choices?.[0]?.message?.content;
    if (content && content.trim().length > 0) {
      return content.trim();
    }
  } catch (e3) {
    lastError = e3;
  }

  throw new Error(`Gemini API unavailable (${lastError?.message || 'Unknown error'})`);
}
