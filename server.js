require('dotenv').config({ path: './config/.env' });
const express = require('express');
const path = require('path');
const { Vonage } = require('@vonage/server-sdk');

const app = express();
app.use(express.json());

const vonage = new Vonage({
  applicationId: process.env.VONAGE_APPLICATION_ID,
  privateKey: path.join(__dirname, 'config', 'private.key'),
});

const FROM_EMAIL = process.env.VONAGE_FROM_EMAIL;

// POST /start
// Body: { channel, to, timeout, code_length, brand }
// Returns: { request_id }
app.post('/start', async (req, res) => {
  const { channel, to, timeout, code_length, brand } = req.body;

  if (!channel || !to || !brand) {
    return res.status(400).json({ error: 'channel, to, and brand are required' });
  }

  if (!['sms', 'voice', 'email'].includes(channel)) {
    return res.status(400).json({ error: 'channel must be one of: sms, voice, email' });
  }

  if (code_length !== undefined && (code_length < 4 || code_length > 10)) {
    return res.status(400).json({ error: 'code_length must be between 4 and 10' });
  }

  if (channel === 'email' && !FROM_EMAIL) {
    return res.status(500).json({ error: 'VONAGE_FROM_EMAIL is not set in config' });
  }

  const workflowEntry = channel === 'email'
    ? { channel, to, from: FROM_EMAIL }
    : { channel, to };

  const request = {
    brand,
    workflow: [workflowEntry],
  };

  if (timeout !== undefined) request.channel_timeout = timeout;
  if (code_length !== undefined) request.code_length = code_length;

  try {
    const { requestId } = await vonage.verify2.newRequest(request);
    return res.status(200).json({ request_id: requestId });
  } catch (err) {
    const status = err.response?.status || 500;
    const detail = err.response?.data ?? err.message;
    return res.status(status).json({ error: detail });
  }
});

// POST /validate
// Body: { request_id, code }
// Returns: { status }
app.post('/validate', async (req, res) => {
  const { request_id, code } = req.body;

  if (!request_id || !code) {
    return res.status(400).json({ error: 'request_id and code are required' });
  }

  try {
    const response = await vonage.verify2.checkCode(request_id, code);
    return res.status(200).json({ status: response.status });
  } catch (err) {
    const status = err.response?.status || 500;
    const detail = err.response?.data ?? err.message;
    return res.status(status).json({ error: detail });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`OTP service running on port ${PORT}`));
