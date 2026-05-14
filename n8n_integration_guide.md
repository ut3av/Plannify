# n8n Integration Guide for AI TimetableX

This guide explains how to connect your AI TimetableX instance to n8n for automated scheduling workflows.

## 1. Setup in n8n

1. Create a new workflow in your n8n instance.
2. Add a **Webhook** node.
3. Set the **HTTP Method** to `POST`.
4. Copy the **Production URL** (or Test URL for development).
5. Add subsequent nodes (e.g., Twilio for WhatsApp, Gmail for Email, or Supabase for Logging).

## 2. Configure Environment Variables

Open your `.env` file (either in the root or `backend/` folder) and add your webhook URL:

```env
N8N_WEBHOOK_URL=https://your-instance.app.n8n.cloud/webhook/planify-timetable
```

*Note: The backend also supports `N9N_WEBHOOK_URL` as a fallback typo.*

## 3. Triggering Events

The following events are automatically sent to n8n:

| Event | Trigger | Payload Contents |
|-------|---------|------------------|
| `timetable.generated` | Clicking "Generate" | Full request body + Generated assignments |
| `timetable.rescheduled` | Using the Proxy tool | Blocked times + New optimized assignments |
| `bulk_email_trigger` | Clicking "Email All Teachers" | List of all teacher schedules |
| `manual_test` | Clicking "Send Test Event" | Basic heartbeat data |

## 4. Automated Gmail Attachments (Excel)

When you trigger "Email All Teachers", the backend sends a list of teachers with their specific timetables as base64-encoded Excel files.

### Recommended n8n Workflow for Emails:

1.  **Webhook Node**: Set to `POST`.
2.  **Split Out Node**: Select the field `data.teachers`. This creates one item per teacher.
3.  **Base64 to Binary Node**:
    *   **Operation**: `Base64 to Binary`
    *   **Source Key**: `excel_base64`
    *   **Destination Key**: `data` (or any name you prefer)
    *   **File Name**: `{{ $json.filename }}`
4.  **Gmail Node**:
    *   **Resource**: `Message`
    *   **Operation**: `Send`
    *   **To**: `{{ $json.email }}`
    *   **Subject**: `Your Academic Timetable`
    *   **Body**: `Hi {{ $json.name }}, please find your weekly timetable attached.`
    *   **Attachments**: Toggle "Append" and select the binary property you created (e.g., `data`).

## 5. Verification

1. Go to the **Integrations** section in the AI TimetableX dashboard.
2. Click **Refresh** to check if the backend detects your URL.
3. Click **Send Test Event** and check your n8n execution log.

## 5. Troubleshooting

- **404 Not Found**: Ensure your workflow is **Active** in n8n if using the Production URL.
- **Timeout**: The backend waits up to 15 seconds for n8n. If your workflow is complex, consider using a "Respond to Webhook" node early in the flow.
- **Environment Not Loading**: Ensure you restart the backend after changing the `.env` file.
