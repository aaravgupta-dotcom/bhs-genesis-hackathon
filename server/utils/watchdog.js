// server/utils/watchdog.js
// Infrastructure-level watchdog wrapper applied uniformly to any async operation

export class PipelineTimeoutError extends Error {
  constructor(stepName, timeoutMs) {
    super(`Watchdog timeout: "${stepName}" exceeded maximum allotted time of ${timeoutMs}ms`);
    this.name = 'PipelineTimeoutError';
    this.stepName = stepName;
    this.timeoutMs = timeoutMs;
    this.timestamp = Date.now();
  }
}

/**
 * Universal watchdog wrapper for any async function or promise.
 * Ensures no stage or sub-operation hangs indefinitely.
 * 
 * @template T
 * @param {Promise<T> | (() => Promise<T>)} target - Promise or async function to execute
 * @param {number} timeoutMs - Timeout limit in milliseconds
 * @param {string} stepName - Descriptive name of the step for error logging
 * @returns {Promise<T>}
 */
export async function withWatchdog(target, timeoutMs, stepName = 'Operation') {
  let timerId;

  const timeoutPromise = new Promise((_, reject) => {
    timerId = setTimeout(() => {
      reject(new PipelineTimeoutError(stepName, timeoutMs));
    }, timeoutMs);
  });

  const executionPromise = typeof target === 'function' ? target() : target;

  try {
    const result = await Promise.race([executionPromise, timeoutPromise]);
    clearTimeout(timerId);
    return result;
  } catch (err) {
    clearTimeout(timerId);
    throw err;
  }
}
