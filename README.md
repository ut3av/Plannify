<div align="center">
  <img src="public/readme_assets/hero.png" width="800" alt="Planify.exe Hero Banner">
  
  # 🚀 Planify.exe | Academic OS
  
  **The ultimate AI-powered academic scheduling platform.**  
  *Generate conflict-free, optimized timetables in seconds using Google OR-Tools and LLM-assisted logic.*

  [![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
  [![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
  [![OR-Tools](https://img.shields.io/badge/Google%20OR--Tools-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://developers.google.com/optimization)

</div>

---

## ✨ Overview

Planify.exe (ai-timetablex) is a high-performance, premium academic scheduling engine designed to solve the "Timetable NP-Hard" problem with elegance and speed. Built for modern educational institutions, it combines the mathematical precision of **Constraint Programming (CP-SAT)** with the intuitive assistance of **Large Language Models (Groq Ai)**.

> [!TIP]
> **Planify isn't just a scheduler—it's an Academic OS.** It manages teachers, sections, labs, and rooms with real-time cloud synchronization and automated workflow triggers.

---

## 🔥 Key Features

- **🧠 AI-Optimized Solver**: Powered by **Google OR-Tools**, our engine handles hundreds of constraints (room capacity, teacher free periods, back-to-back limits) to find the absolute mathematical optimum.
- **⚡ "Genius" Error Handling**: When a schedule is logically impossible, **Groq AI (Llama 3)** analyzes the bottlenecks and provides human-readable suggestions to fix your inputs.
- **🧪 Lab-Aware Logic**: Automatically schedules continuous 2-period lab blocks with specialized room requirements.
- **☁️ Real-time Cloud Sync**: Integrated with **Supabase** for instant auto-saving, multi-device persistence, and secure authentication.
- **📊 Interactive Analytics**: Visualize teacher loads, room utilization, and scheduling efficiency through a sleek **Recharts** dashboard.
- **📥 Professional Exports**: One-click **Excel Export** generates multi-sheet workbooks formatted for both class sections and individual teacher schedules.
- **🤖 AI Chat Assistant**: An integrated AI companion to help you navigate constraints and manage your academic data.
- **🔗 n8n Automation**: Webhook support to trigger external workflows (Email/Slack/Discord) whenever a schedule is finalized or changed.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Tailwind CSS, Spline 3D (Interactive UI)
- **Backend**: FastAPI (Python 3.10+), Uvicorn
- **Constraint Solver**: Google OR-Tools (CP-SAT)
- **Database/Auth**: Supabase (PostgreSQL)
- **AI Engine**: Groq API (Llama-3.3-70B)
- **Automation**: n8n Webhooks

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- Supabase Account (Optional, for Cloud Sync)
- Groq API Key (Optional, for AI Suggestions)

### 2. Installation

Clone the repository:
```bash
git clone https://github.com/your-repo/ai-timetablex.git
cd ai-timetablex
```

**Frontend Setup:**
```bash
npm install
```

**Backend Setup:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Or .venv\Scripts\activate on Windows
pip install -r requirements.txt
cd ..
```

### 3. Configuration
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

### 4. Run the Application

**Start the API Server:**
```bash
npm run api
```

**Start the Frontend Dashboard:**
```bash
npm start
```
*Access the dashboard at `http://localhost:3000`*

---

## 📸 Dashboard Preview

| **Section Management** | **AI Timetable Grid** |
|:---:|:---:|
| Interactive forms for Teachers & Rooms | Drag-and-drop logic & Conflict highlights |
| *Visualizing high-fidelity dark mode* | *Powered by OR-Tools* |

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

<div align="center">
  <p>Built with Excessive 💖 by the Plannify Team</p>
  <p><i>"Scheduling the future, one period at a time."</i></p>
</div>
