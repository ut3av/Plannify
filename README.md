# AI-Powered Timetable Scheduler

Full-stack hackathon-ready timetable scheduler using:

- Frontend: React.js + Tailwind CSS
- Backend: FastAPI
- AI engine: Google OR-Tools CP-SAT
- API: REST
- Data: in-memory JSON

## Folder Structure

```text
ai-timetablex/
  backend/
    main.py
    requirements.txt
  public/
    index.html
  src/
    components/
      ReschedulePanel.js
      SchedulerForm.js
      TimetableGrid.js
    App.js
    App.test.js
    index.css
    index.js
  package.json
  tailwind.config.js
```

## Run The App

Install frontend dependencies:

```bash
npm install
```

Install backend dependencies:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

Start the backend:

```bash
npm run api
```

Start the frontend in a second terminal:

```bash
npm start
```

Open `http://localhost:3000`. The API runs at `http://127.0.0.1:8000`.

## n8n Integration

Create an n8n workflow with a Webhook trigger, then set the webhook URL in `.env`:

```env
N8N_WEBHOOK_URL=https://your-n8n-host/webhook/your-workflow-id
```

Restart the backend after changing `.env`. The admin dashboard includes an `n8n` tab where you can check the integration status and send a manual test event.

The backend sends these events when the webhook is configured:

- `timetable.generated`
- `timetable.rescheduled`
- `timetable.proxy_assigned`
- `timetable.saved`
- `manual_test`

## API Endpoints

### `POST /generate`

Generates a conflict-free weekly timetable.

Example request:

```json
{
  "teachers": ["Asha Rao", "Ben Thomas", "Chen Lee"],
  "subjects": [
    { "name": "Mathematics", "teacher": "Asha Rao", "required_slots": 4 },
    { "name": "Physics", "teacher": "Ben Thomas", "required_slots": 3 },
    { "name": "Chemistry", "teacher": "Chen Lee", "required_slots": 3 }
  ],
  "rooms": ["Room 101", "Room 102"],
  "time_slots": ["9-10", "10-11", "11-12", "12-1", "2-3"]
}
```

### `POST /reschedule`

Marks a teacher unavailable and regenerates the timetable while preserving hard constraints.

Example request:

```json
{
  "teacher": "Asha Rao",
  "day": "Mon",
  "slots": ["9-10", "10-11"]
}
```

Leave `slots` empty to block the selected teacher for the whole day.

## Example Output

```json
{
  "days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
  "time_slots": ["9-10", "10-11", "11-12", "12-1", "2-3"],
  "timetable": {
    "Mon": {
      "9-10": [
        {
          "subject": "Mathematics",
          "teacher": "Asha Rao",
          "room": "Room 101"
        }
      ]
    }
  },
  "assignments": [
    {
      "day": "Mon",
      "slot": "9-10",
      "subject": "Mathematics",
      "teacher": "Asha Rao",
      "room": "Room 101"
    }
  ],
  "solver_status": "OPTIMAL",
  "objective_score": 2
}
```

## How Constraints Are Applied

Hard constraints:

- Each subject is assigned exactly its required number of slots.
- A teacher can teach at most one class in the same day and time slot.
- A classroom can host at most one class in the same day and time slot.
- The same subject is not duplicated in the same time slot.
- Rescheduling blocks the selected teacher from the requested day and slot combinations.

Soft constraints:

- Teacher idle gaps are penalized.
- Three back-to-back classes for one teacher are penalized.
- Subject slots are spread across the week where possible.

The backend uses OR-Tools CP-SAT boolean decision variables for subject occurrence, day, slot, and room combinations, then minimizes the soft-constraint penalty score.

## Useful Commands

```bash
npm run build
npm test -- --watchAll=false --runInBand
python -m py_compile backend/main.py
```
