require('dotenv').config({ path: './config/.env' });
const express = require('express');
const path = require('path');
const { Vonage } = require('@vonage/server-sdk');

const app = express();
app.use(express.json());

const DEBUG = process.env.DEBUG === 'true';
const log = (label, data) => {
  if (!DEBUG) return;
  console.log(`\n[DEBUG] ${label}`);
  console.log(JSON.stringify(data, null, 2));
};

const vonage = new Vonage({
  applicationId: process.env.VONAGE_APPLICATION_ID,
  privateKey: path.join(__dirname, 'config', 'private.key'),
});

// POST /start
// Body: { channel, to, from_email, timeout, code_length, brand }
// Returns: { request_id }
app.post('/start', async (req, res) => {
  const { channel, to, from_email, timeout, code_length, brand } = req.body;

  log('POST /start — incoming body', req.body);

  if (!channel || !to || !brand) {
    return res.status(400).json({ error: 'channel, to, and brand are required' });
  }

  if (!['sms', 'voice', 'email'].includes(channel)) {
    return res.status(400).json({ error: 'channel must be one of: sms, voice, email' });
  }

  if (code_length !== undefined && (code_length < 4 || code_length > 10)) {
    return res.status(400).json({ error: 'code_length must be between 4 and 10' });
  }

  const allowFilter = process.env.ALLOW_FILTER;
  if (allowFilter && (channel === 'sms' || channel === 'voice') && !to.startsWith(allowFilter)) {
    log('POST /start — rejected by ALLOW_FILTER', { to, allowFilter });
    return res.status(403).json({ error: `Request rejected: 'to' number must begin with '${allowFilter}'` });
  }

  const workflowEntry = (channel === 'email' && from_email)
    ? { channel, to, from: from_email }
    : { channel, to };

  const request = {
    brand,
    workflow: [workflowEntry],
  };

  if (timeout !== undefined) request.channel_timeout = timeout;
  if (code_length !== undefined) request.code_length = code_length;

  log('POST /start — Vonage request payload', request);

  try {
    const { requestId } = await vonage.verify2.newRequest(request);
    log('POST /start — Vonage response', { requestId });
    return res.status(200).json({ request_id: requestId });
  } catch (err) {
    const status = err.response?.status || 500;
    log('POST /start — Vonage error', {
      status,
      message: err.message,
    });
    return res.status(status).json({ error: err.message });
  }
});

// POST /validate
// Body: { request_id, code }
// Returns: { status }
app.post('/validate', async (req, res) => {
  const { request_id, code } = req.body;

  log('POST /validate — incoming body', req.body);

  if (!request_id || !code) {
    return res.status(400).json({ error: 'request_id and code are required' });
  }

  log('POST /validate — Vonage request payload', { request_id, code });

  try {
    const response = await vonage.verify2.checkCode(request_id, code);
    log('POST /validate — Vonage response', response);
    return res.status(200).json(response);
  } catch (err) {
    const status = err.response?.status || 500;
    log('POST /validate — Vonage error', {
      status,
      message: err.message,
    });
    return res.status(status).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`OTP service running on port ${PORT}`));
