// server/utils/logger.js
// SSE-based per-job event emitter for real-time log streaming

const jobs = new Map(); // jobId -> { clients: Set<res>, log: string[] }

export function initJob(jobId) {
  jobs.set(jobId, { clients: new Set(), log: [] });
}

export function registerClient(jobId, res) {
  const job = jobs.get(jobId);
  if (!job) return;
  job.clients.add(res);
}

export function unregisterClient(jobId, res) {
  const job = jobs.get(jobId);
  if (!job) return;
  job.clients.delete(res);
}

/**
 * Emit a log event to all connected SSE clients for a job
 * @param {string} jobId
 * @param {string} type - 'info' | 'success' | 'error' | 'warning' | 'stage' | 'patch' | 'test'
 * @param {string} message
 * @param {object} [data] - Optional extra data
 */
export function emit(jobId, type, message, data = {}) {
  const job = jobs.get(jobId);
  if (!job) return;

  const event = {
    ts: Date.now(),
    type,
    message,
    ...data,
  };

  const payload = `data: ${JSON.stringify(event)}\n\n`;
  job.log.push(event);

  for (const res of job.clients) {
    try {
      res.write(payload);
    } catch (e) {
      job.clients.delete(res);
    }
  }
}

export function getLog(jobId) {
  return jobs.get(jobId)?.log || [];
}

export function cleanupJob(jobId) {
  const job = jobs.get(jobId);
  if (job) {
    for (const res of job.clients) {
      try {
        res.end();
      } catch {}
    }
    jobs.delete(jobId);
  }
}
