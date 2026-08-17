# Make.com (Integromat) Integration Guide for Plannify.exe

This guide explains how to connect your Plannify.exe instance to **Make.com** for automated faculty notifications, WhatsApp broadcasts, and scheduled timetable distribution.

---

## 1. Setup in Make.com

1. Log into your [Make.com](https://make.com) account and create a new **Scenario**.
2. Click **Add a new module** and choose **Custom Webhook** (under Webhooks).
3. Click **Create a webhook**, assign a name (e.g. `Plannify Timetable Automation`), and copy the generated **Webhook URL** (e.g., `https://hook.eu1.make.com/xxxxxxxxxxxxxxxx`).
4. Add subsequent modules:
   - **Iterator**: To iterate through individual faculty members (`data.teachers`).
   - **Email / Gmail / Microsoft 365**: To email personalized timetable attachments.
   - **WhatsApp Business Cloud / Twilio**: For real-time WhatsApp substitute alerts.
   - **Supabase / Google Sheets**: For audit logging and reporting.

---

## 2. Configure Environment Variables

Add your Make webhook URL to `.env` (root) and `backend/.env`:

```env
MAKE_WEBHOOK_URL=https://hook.eu1.make.com/your-custom-webhook-id
MAKE_SECRET=your_optional_secret
```

---

## 3. Dispatched Automated Events

The backend automatically dispatches structured JSON payloads to Make for the following events:

| Event Name | Trigger Action | Payload Data |
|------------|----------------|--------------|
| `timetable.generated` | Clicking "Generate AI Timetable" | Full optimization request + generated assignments grid |
| `timetable.rescheduled` | Using the Proxy / Reschedule engine | Blocked faculty slots + new optimized substitution schedule |
| `timetable.proxy_assigned` | Assigning a substitute teacher | Original teacher, substitute teacher, room & section |
| `timetable.saved` | Saving timetable to cloud | Saved timetable ID, name, and complete schedule |
| `bulk_email_trigger` | Clicking "Dispatch Broadcast" | Base64-encoded personalized Excel sheets per teacher |
| `manual_test` | Clicking "⚡ Ping Make Webhook" | Heartbeat test payload with server timestamp |

---

## 4. Make Scenario Setup for Faculty Emails (Excel Attachments)

When you trigger bulk schedule broadcast from the Operations tab:

1. **Custom Webhook**: Receives the `bulk_email_trigger` payload.
2. **Iterator Module**:
   - Array: `{{1.data.teachers}}`
3. **Tools (Convert Base64 to Binary)**:
   - Base64 string: `{{2.excel_base64}}`
   - File Name: `{{2.filename}}`
4. **Gmail / Email Module**:
   - To: `{{2.email}}`
   - Subject: `Your Weekly Academic Schedule - Plannify.exe`
   - Content: `Dear {{2.name}},\n\nPlease find your updated timetable schedule attached.`
   - Attachment: Select output from Convert Base64 tool.

---

## 5. Verification & Testing

1. In the Plannify dashboard, navigate to **Operations -> Automation & Broadcast**.
2. Click **⚡ Ping Make Webhook** to send an instant test event.
3. In Make.com, verify that the webhook received the test data and execution history shows status `200 OK`.
