import { getJob } from '../services/indexingService.js';

export function getStatus(req, res) {
  const { jobId } = req.params;
  const sessionId = req.headers["x-session-id"];

  if (!sessionId) {
    return res.status(400).json({ error: "Missing session ID" });
  }

  const job = getJob(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  if (job.sessionId !== sessionId) {
    return res.status(403).json({ error: 'Unauthorized session' });
  }

  res.json(job);
}
