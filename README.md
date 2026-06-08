# OTP Service

A lightweight 2FA service built on [Vonage Verify v2](https://developer.vonage.com/en/api/verify.v2). Exposes two endpoints to send and validate one-time passwords via SMS, voice call, or email.

## Requirements

- Node.js 18+
- A Vonage application with Verify v2 enabled
- `config/` directory containing:
  - `.env`
  - `private.key`

## Configuration

`config/.env`:
```
VONAGE_API_KEY=your_api_key
VONAGE_API_SECRET=your_api_secret
VONAGE_APPLICATION_ID=your_application_id
VONAGE_APPLICATION_PRIVATE_KEY_PATH=private.key
PORT=3000
```

> `config/` is gitignored — credentials never leave your machine.

## Install & Run

```bash
npm install
npm start
```

---

## API

### `POST /start`

Sends an OTP to the user via the specified channel.

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `channel` | string | Yes | `sms`, `voice`, or `email` |
| `to` | string | Yes | Phone number (E.164) or email address |
| `brand` | string | Yes | Name shown to the recipient (e.g. `"MyApp"`) |
| `timeout` | number | No | Seconds before the code expires |
| `code_length` | number | No | OTP digit count, 4–10 (default: 4) |
| `from_email` | string | Email only | Sender address — required when `channel` is `email` |

**Success response `200`:**
```json
{ "request_id": "c8d2f8d0-4b3e-4e1a-9c2b-abc123456789" }
```

**Error response:**
```json
{ "error": "..." }
```

---

### `POST /validate`

Checks a submitted OTP code against an active request.

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `request_id` | string | Yes | The `request_id` returned by `/start` |
| `code` | string | Yes | The OTP the user submitted |

**Success response `200`:**
```json
{ "status": "completed" }
```

**Error response:**
```json
{ "error": "..." }
```

---

## Example

```bash
# Send an OTP via SMS
curl -X POST http://localhost:3000/start \
  -H "Content-Type: application/json" \
  -d '{ "channel": "sms", "to": "+14155551234", "brand": "MyApp", "timeout": 300, "code_length": 6 }'

# Validate the code
curl -X POST http://localhost:3000/validate \
  -H "Content-Type: application/json" \
  -d '{ "request_id": "c8d2f8d0-4b3e-4e1a-9c2b-abc123456789", "code": "483921" }'
```
