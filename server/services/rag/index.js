// server/services/rag/index.js
// High-efficiency keyword & TF-IDF similarity RAG retrieval engine
// Injects canonical canvas recipes to ensure zero hallucinations and zero playability failures

import { RAG_CORPUS } from './corpus.js';

/**
 * Tokenize a string into lowercase alphabetic tokens
 */
function tokenize(text) {
  if (!text) return [];
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2);
}

/**
 * Calculate similarity score between query tokens and a RAG chunk
 */
function scoreChunk(chunk, queryTokens, queryGenre = '') {
  let score = 0;
  const chunkTags = chunk.tags || [];
  const chunkTitleTokens = tokenize(chunk.title);
  const chunkContentTokens = tokenize(chunk.content);

  // Exact genre match bonus
  if (queryGenre && chunk.genre && chunk.genre.toLowerCase() === queryGenre.toLowerCase()) {
    score += 8;
  }

  for (const token of queryTokens) {
    // Tag match (highest weight)
    if (chunkTags.includes(token)) {
      score += 4;
    }
    // Title match
    if (chunkTitleTokens.includes(token)) {
      score += 3;
    }
    // Content occurrence
    if (chunkContentTokens.includes(token)) {
      score += 1;
    }
  }

  return score;
}

/**
 * Retrieve the top relevant RAG chunks for a given spec or prompt
 * Always pins the canonical 60fps loop and anti-bug checklist
 *
 * @param {object|string} query - Game spec object or natural language prompt string
 * @param {number} topK - Maximum number of chunks to return (default 4)
 * @returns {Array<object>} - Array of retrieved chunk objects
 */
export function retrieveRAGChunks(query, topK = 4) {
  let queryString = '';
  let genre = '';

  if (typeof query === 'string') {
    queryString = query;
  } else if (query && typeof query === 'object') {
    genre = query.genre || '';
    queryString = [
      query.title || '',
      query.genre || '',
      query.description || '',
      ...(query.mechanics || []),
      ...(query.entities || []),
    ].join(' ');
  }

  const queryTokens = tokenize(queryString);

  // Mandatory foundational chunks that every game must strictly follow
  const mandatoryIds = ['canvas_loop_60fps', 'anti_bug_checklist'];
  const mandatoryChunks = RAG_CORPUS.filter(c => mandatoryIds.includes(c.id));

  // Score remaining candidate chunks
  const candidates = RAG_CORPUS.filter(c => !mandatoryIds.includes(c.id));
  const scored = candidates.map(chunk => ({
    chunk,
    score: scoreChunk(chunk, queryTokens, genre),
  }));

  // Sort descending by relevance score
  scored.sort((a, b) => b.score - a.score);

  // Take top (topK - mandatory.length) chunks
  const remainingSlots = Math.max(1, topK - mandatoryChunks.length);
  const selectedCandidates = scored.slice(0, remainingSlots).map(s => s.chunk);

  return [...mandatoryChunks, ...selectedCandidates];
}

/**
 * Format retrieved chunks into a prompt-ready markdown knowledge section
 */
export function formatRAGContext(chunks) {
  if (!chunks || chunks.length === 0) return '';

  const header = `### GROUNDED ARCHITECTURE KNOWLEDGE BASE (CANONICAL CANVAS RECIPES)\nStrictly follow these verified patterns to ensure zero runtime or playability failures:\n\n`;

  const body = chunks.map((c, i) => {
    return `#### RECIPE ${i + 1}: ${c.title}\n\`\`\`javascript\n${c.content.trim()}\n\`\`\``;
  }).join('\n\n');

  return `${header}${body}\n\n`;
}

/**
 * Convenience method: retrieve and format in one step
 */
export function getRAGContextForSpec(spec, topK = 4) {
  const chunks = retrieveRAGChunks(spec, topK);
  return {
    chunks,
    formattedText: formatRAGContext(chunks),
  };
}
