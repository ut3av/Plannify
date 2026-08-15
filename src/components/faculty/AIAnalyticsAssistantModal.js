import React, { useState } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || "http://localhost:8080";

export default function AIAnalyticsAssistantModal({ rangeKey, departmentId, onClose }) {
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hello! I am your **AI Operational Analytics Assistant** for Planify.exe. Ask me any question about faculty attendance, substitution patterns, workload distribution, or department operational history.",
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const samplePrompts = [
    "How has the Computer Science department performed this month?",
    "Which faculty members have unusually high workload?",
    "Why did substitution activity increase this month?",
    "Show me faculty members whose punctuality has declined.",
  ];

  const handleSend = async (textToSend) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMsg = { sender: "user", text: query };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post(`${API}/analytics/ai-chat`, {
        message: query,
        range_key: rangeKey,
        department_id: departmentId,
        history: messages,
      });

      const replyText = res.data.reply || "Sorry, I could not process your query.";
      setMessages(prev => [...prev, { sender: "bot", text: replyText }]);
    } catch (e) {
      console.error("AI Analytics Assistant error:", e);
      setMessages(prev => [...prev, { sender: "bot", text: "⚠️ Error contacting AI Analytics service. Please verify your backend server status." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-6 bg-slate-900 border border-indigo-500/30 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2z"/><path d="M12 6v6l4 2"/></svg>
          </div>
          <div>
            <h3 className="font-bold text-white text-base">AI Operational Analytics Assistant</h3>
            <p className="text-[11px] text-slate-400">Powered by verified database metrics (Groq LLaMA 3.3 / Gemini)</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm font-bold">✕</button>
        )}
      </div>

      {/* Suggested Prompts */}
      <div className="flex flex-wrap gap-2">
        {samplePrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 hover:border-indigo-500/40 hover:bg-slate-800 text-[11px] text-indigo-300 transition-all text-left"
          >
            💬 "{prompt}"
          </button>
        ))}
      </div>

      {/* Chat Messages */}
      <div className="h-80 overflow-y-auto p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4 text-xs">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3.5 rounded-2xl ${
              m.sender === 'user'
                ? 'bg-indigo-600 text-white rounded-tr-none'
                : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-none whitespace-pre-wrap leading-relaxed'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="p-3 rounded-2xl bg-slate-800 text-slate-400 italic text-xs animate-pulse">
              Analyzing verified database records...
            </div>
          </div>
        )}
      </div>

      {/* Chat Input */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about faculty attendance, substitutions, or workload..."
          className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
        <button type="submit" disabled={loading} className="btn-primary px-5 py-2.5 text-xs font-bold gap-2">
          Send
        </button>
      </form>
    </div>
  );
}
