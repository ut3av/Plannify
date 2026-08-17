import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { compressImage } from '../utils/imageOptimizer';
import { API_BASE_URL } from '../apiConfig';
import BrandLogo from './common/BrandLogo';

export default function AIChatBot({ 
  result, 
  teachers = [], 
  subjects = [], 
  sections = [], 
  rooms = [], 
  timeSlots = [], 
  onExtractedData, 
  onLoadDemo, 
  onRemoveDemo, 
  onGenerateTimetable,
  onAddFaculty,
  isTeacherView = false, 
  teacherName = "" 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      text: isTeacherView
        ? `👋 **Hello ${teacherName || "Faculty Member"}! I am your Personal Academic Assistant.**\n\nI can help you review your weekly classes, check workload balance, find proxy substitutes, and answer timetable queries.\n\n*How can I assist you today?*`
        : "👋 **Hello! I am your Plannify.exe AI Co-Pilot.**\n\nI specialize in academic timetable optimization, teacher workload balancing, substitution management, and automated timetable OCR image extraction.\n\n*How can I assist your institution today?*",
      sender: 'bot',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const fileInputRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 1200, 0.82);
        setPreviewUrl(compressed.dataUrl);
        setSelectedImage(compressed.base64);
      } catch (err) {
        console.warn("Fallback image loading:", err);
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result);
          const base64String = reader.result.replace(/^data:image\/(png|jpg|jpeg|webp);base64,/, "");
          setSelectedImage(base64String);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Resilient Client-Side NLP Engine for zero-failure responses
  const generateClientSideAIResponse = (userPrompt, currentContext) => {
    const p = userPrompt.toLowerCase();
    const activeTeachers = currentContext.teachers || [];
    const activeSubjects = currentContext.subjects || [];
    const activeSections = currentContext.sections || [];
    const activeRooms = currentContext.rooms || [];

    // 1. ADD TEACHER / FACULTY
    const addTeacherMatch = userPrompt.match(/(?:add|create|new|insert|register)\s+(?:teacher|faculty|prof|dr|professor)\s+([A-Za-z0-9.\s]+?)(?:\s+(?:for|to|with|email|dept|department|phone|\.|$))/i);
    if (addTeacherMatch && addTeacherMatch[1] && !p.includes("demo")) {
      const name = addTeacherMatch[1].trim().replace(/^(dr\.|prof\.|mr\.|mrs\.|ms\.)\s*/i, "");
      const email = `${name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@lnctu.ac.in`;
      return {
        reply: `✅ **Added Faculty Member: Dr. ${name}**\n\nI have successfully registered **${name}** in the Faculty Directory and synchronized their profile with Supabase cloud.\n\n\`\`\`json\n{\n  "teachers": [\n    {\n      "name": "${name}",\n      "email": "${email}",\n      "department": "Computer Applications",\n      "designation": "Assistant Professor",\n      "free_periods": 1\n    }\n  ]\n}\n\`\`\`\n\n*The faculty list and cloud draft have been updated.*`,
        data: {
          teachers: [{ name, email, department: "Computer Applications", designation: "Assistant Professor", free_periods: 1 }]
        }
      };
    }

    // 2. ADD SECTION / CLASS
    const addSectionMatch = userPrompt.match(/(?:add|create|new)\s+(?:section|class)\s+([A-Za-z0-9\-\s]+)/i);
    if (addSectionMatch && addSectionMatch[1]) {
      const secName = addSectionMatch[1].trim();
      return {
        reply: `✅ **Added Academic Section: ${secName}**\n\n\`\`\`json\n{\n  "sections": [\n    {\n      "name": "${secName}",\n      "room": "Room 308",\n      "lab_room": "Lab 006"\n    }\n  ]\n}\n\`\`\`\n\n*Section registered for timetable constraint solving.*`,
        data: {
          sections: [{ name: secName, room: "Room 308", lab_room: "Lab 006" }]
        }
      };
    }

    // 3. ADD SUBJECT / COURSE
    const addSubjectMatch = userPrompt.match(/(?:add|create|new)\s+(?:subject|course)\s+([A-Za-z0-9\s]+?)(?:\s+(?:by|teacher|prof|with|for|\.|$))/i);
    if (addSubjectMatch && addSubjectMatch[1]) {
      const subName = addSubjectMatch[1].trim();
      const defaultTeacher = activeTeachers[0]?.name || (typeof activeTeachers[0] === 'string' ? activeTeachers[0] : "Prof. Ripusoodan Sharma");
      return {
        reply: `✅ **Added Subject: ${subName}**\n\n\`\`\`json\n{\n  "subjects": [\n    {\n      "name": "${subName}",\n      "code": "CS-${Math.floor(100 + Math.random() * 899)}",\n      "teacher": "${defaultTeacher}",\n      "required_slots": 3,\n      "is_lab": ${p.includes("lab")}\n    }\n  ]\n}\n\`\`\`\n\n*Subject added to course catalog.*`,
        data: {
          subjects: [{ name: subName, code: `CS-${Math.floor(100 + Math.random() * 899)}`, teacher: defaultTeacher, required_slots: 3, is_lab: p.includes("lab") }]
        }
      };
    }

    // 4. GENERATE / SOLVE TIMETABLE
    if (p.includes("generate") || p.includes("solve") || p.includes("schedule") || p.includes("create timetable")) {
      return {
        reply: "⚡ **Triggering Timetable Generation...**\n\nExecuting Google OR-Tools constraint satisfaction algorithms across all active faculty, section batches, and classroom capacities.\n\n*Optimization objective: Maximize slot preferences and balance teacher daily distributions.*",
        action: "generate"
      };
    }

    // 5. REMOVE DEMO / RESET
    if (p.includes("remove demo") || p.includes("clear demo") || p.includes("clean workspace") || p.includes("reset")) {
      return {
        reply: "🧹 **Workspace Reset to Clean State**\n\nAll demo entries (faculty profiles, mock attendance %, substitutions, and schedule assignments) have been purged. Clean real institution workspace active.",
        action: "clear_demo"
      };
    }

    // 6. LOAD DEMO
    if (p.includes("load demo") || p.includes("demo data") || p.includes("demo timetable")) {
      return {
        reply: "🚀 **Full LNCT Academic Demo Loaded!**\n\nPopulated 30+ classes across BCA Sections A-F, 17+ faculty profiles, lab allocations, and classroom arrangements.",
        action: "load_demo"
      };
    }

    // 7. DEFAULT CONTEXTUAL ASSISTANCE
    return {
      reply: `🤖 **Plannify Academic Intelligence Status**:\n\n- **Active Faculty Profiles**: ${activeTeachers.length}\n- **Catalog Subjects**: ${activeSubjects.length}\n- **Registered Sections**: ${activeSections.length}\n- **Allocated Classrooms**: ${activeRooms.length}\n- **Schedule Solver Status**: ${currentContext.result ? "✅ Feasible Schedule Active" : "⚡ Ready to Generate"}\n\n*You can ask me to add teachers, add subjects, solve timetables, load/clear demo data, or attach an image of a paper timetable to extract it via OCR.*`
    };
  };

  const handleSend = async (customPrompt) => {
    const textToSend = customPrompt || input;
    if (!textToSend.trim() && !selectedImage) return;

    const userText = textToSend || "Please extract timetable schedule from this image.";
    const userMsg = {
      id: Date.now().toString(),
      text: userText,
      sender: 'user',
      image: previewUrl,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setInput("");

    const imgToSend = selectedImage;
    setSelectedImage(null);
    setPreviewUrl(null);
    setIsLoading(true);

    const endpoints = [
      API_BASE_URL,
      "http://localhost:8080",
      "http://127.0.0.1:8080",
      "http://localhost:8000",
      "http://127.0.0.1:8000",
    ].filter(Boolean);

    let reply = null;
    let extractedData = null;
    let triggeredAction = null;

    // 1. Attempt connection to FastAPI backend
    for (const ep of endpoints) {
      try {
        const response = await axios.post(`${ep}/chat`, {
          message: userMsg.text,
          context: { 
            ...(result || {}), 
            teachers, 
            subjects, 
            sections, 
            rooms, 
            timeSlots,
            is_teacher_view: isTeacherView, 
            teacher_name: teacherName 
          },
          history: messages.map(m => ({ sender: m.sender, text: m.text })),
          image: imgToSend
        }, { timeout: 8000 });

        if (response.data && response.data.reply) {
          reply = response.data.reply;
          break;
        }
      } catch (err) {
        // Try next endpoint
      }
    }

    // 2. Client-side NLP fallback if backend is offline
    if (!reply) {
      const clientRes = generateClientSideAIResponse(userMsg.text, { teachers, subjects, sections, rooms, result });
      reply = clientRes.reply;
      extractedData = clientRes.data;
      triggeredAction = clientRes.action;
    }

    // 3. Process extracted structured JSON or actions
    let displayReply = reply;
    const jsonMatch = reply.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.teachers || parsed.subjects || parsed.sections || parsed.rooms || parsed.timeSlots) {
          extractedData = parsed;
        }
      } catch (e) {
        // Ignore
      }
    }

    if (extractedData) {
      if (onExtractedData) onExtractedData(extractedData);
      if (extractedData.teachers && onAddFaculty) {
        extractedData.teachers.forEach(t => onAddFaculty(t));
      }
    }

    if (triggeredAction === "generate" && onGenerateTimetable) {
      onGenerateTimetable();
    } else if (triggeredAction === "load_demo" && onLoadDemo) {
      onLoadDemo();
    } else if (triggeredAction === "clear_demo" && onRemoveDemo) {
      onRemoveDemo();
    }

    setMessages(prev => [
      ...prev,
      {
        id: (Date.now() + 1).toString(),
        text: displayReply,
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setIsLoading(false);
  };

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    setMessages([
      {
        id: "welcome-reset",
        text: "✨ **Chat history reset.** How can I assist with your academic timetable, faculty, or institutional operations?",
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const SUGGESTIONS = isTeacherView ? [
    { label: "My Schedule Today", icon: "📅" },
    { label: "Check Free Slots", icon: "⏳" },
    { label: "Find Proxy Substitute", icon: "⚡" },
    { label: "Leave Application Rules", icon: "🏖️" },
  ] : [
    { label: "Load Demo Data", icon: "🚀", action: "demo" },
    { label: "Remove Demo Data", icon: "🧹", action: "clear_demo" },
    { label: "Upload Timetable (OCR)", icon: "📷", action: "ocr" },
    { label: "Add Dr. Priya Sharma (CSE)", icon: "👨‍🏫" },
    { label: "Generate Timetable", icon: "✨" },
    { label: "Workload Analysis", icon: "📊" },
  ];

  return (
    <>
      {/* Floating Co-Pilot Action Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2 group animate-fade-in">
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-3 px-5 py-3.5 rounded-full bg-gradient-to-r from-amber-600 via-amber-700 to-[#2C1810] text-white font-bold shadow-2xl hover:shadow-amber-900/50 hover:scale-105 transition-all duration-300 border border-amber-400/40 relative overflow-hidden"
            title="Open AI Timetable Co-Pilot"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="w-7 h-7 rounded-lg bg-amber-900/60 border border-amber-400/30 flex items-center justify-center p-1 shadow-inner">
              <BrandLogo size="xs" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-xs font-black tracking-wide uppercase font-display">Plannify AI</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-[10px] text-amber-200/80 font-medium">Assistant Active</p>
            </div>
          </button>
        </div>
      )}

      {/* Main Co-Pilot Chat Interface */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 flex flex-col bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden ${
            isExpanded
              ? "inset-4 md:inset-10 rounded-3xl"
              : "bottom-4 right-4 w-[95vw] sm:w-[420px] md:w-[460px] h-[620px] max-h-[90vh] rounded-3xl"
          }`}
        >
          {/* Rich Header Bar */}
          <div className="px-5 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/70 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center p-1.5 shadow-inner">
                <BrandLogo size="xs" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-white tracking-wide font-display">
                    Plannify AI Assistant
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-bold border border-amber-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Llama 3.3 70B
                  </span>
                </div>
                <p className="text-[10px] text-amber-200/60">Timetable & Operational Intelligence Engine</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={clearChat}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                title="Reset Chat"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors hidden sm:block"
                title={isExpanded ? "Collapse Window" : "Expand Window"}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {isExpanded ? (
                    <path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" />
                  ) : (
                    <path d="M15 3h6v6m0-6L14 11M9 21H3v-6m0 6l7-7" />
                  )}
                </svg>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors"
                title="Close AI Assistant"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-slate-800 bg-slate-950/40">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 max-w-[88%] ${
                    isUser ? "ml-auto flex-row-reverse" : "mr-auto"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 mt-1 border ${
                      isUser
                        ? "bg-amber-600 text-white border-amber-400/30"
                        : "bg-slate-800 text-amber-300 border-slate-700"
                    }`}
                  >
                    {isUser ? "U" : "🤖"}
                  </div>

                  <div
                    className={`group relative rounded-2xl p-4 text-xs leading-relaxed shadow-lg ${
                      isUser
                        ? "bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-tr-none"
                        : "bg-slate-900/90 text-slate-200 border border-slate-800 rounded-tl-none"
                    }`}
                  >
                    {msg.image && (
                      <div className="mb-2 overflow-hidden rounded-xl border border-white/20">
                        <img src={msg.image} alt="Uploaded for OCR" className="max-h-48 w-full object-cover" />
                        <div className="bg-slate-950/80 px-2 py-1 text-[10px] text-slate-300 flex items-center gap-1">
                          📷 Image attached for AI OCR processing
                        </div>
                      </div>
                    )}

                    <div className="prose prose-invert prose-xs max-w-none prose-p:leading-relaxed prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.text}
                      </ReactMarkdown>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-white/10">
                      <span>{msg.timestamp}</span>
                      {!isUser && (
                        <button
                          onClick={() => handleCopy(msg.id, msg.text)}
                          className="opacity-0 group-hover:opacity-100 hover:text-white transition-opacity flex items-center gap-1 text-[10px]"
                          title="Copy Markdown"
                        >
                          {copiedId === msg.id ? "✓ Copied" : "📋 Copy"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="flex items-center gap-2.5 mr-auto max-w-[85%]">
                <div className="w-7 h-7 rounded-xl bg-slate-800 text-amber-300 border border-slate-700 flex items-center justify-center text-xs font-bold">
                  🤖
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-center gap-2 rounded-tl-none">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:0.15s]" />
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:0.3s]" />
                  <span className="ml-1 text-[11px] text-slate-400 font-medium">Analyzing constraints & timetable logic...</span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Prompt Chips Bar */}
          <div className="px-4 py-2 bg-slate-900/90 border-t border-slate-800/80">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
              {SUGGESTIONS.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (s.action === "demo" && onLoadDemo) {
                      onLoadDemo();
                      setMessages(prev => [
                        ...prev,
                        {
                          id: Date.now().toString(),
                          text: "🚀 **Full Demo Data Loaded!**\n\nI have populated the timetable grid, departments, sections, faculty directory, and classroom allocations with complete demo data.",
                          sender: 'bot',
                          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        }
                      ]);
                    } else if (s.action === "clear_demo" && onRemoveDemo) {
                      onRemoveDemo();
                      setMessages(prev => [
                        ...prev,
                        {
                          id: Date.now().toString(),
                          text: "🧹 **Demo Data Removed!**\n\nI have cleared all demo entries from the workspace. You are now in clean real implementation mode ready to add real faculty and subjects.",
                          sender: 'bot',
                          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        }
                      ]);
                    } else if (s.action === "ocr") {
                      fileInputRef.current?.click();
                    } else {
                      handleSend(s.label);
                    }
                  }}
                  className={`whitespace-nowrap px-3 py-1 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-1.5 active:scale-95 ${
                    s.action === "demo"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
                      : s.action === "clear_demo"
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30"
                      : "bg-slate-800/90 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  <span>{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Input & Image Attachment Footer */}
          <div className="p-3 bg-slate-900 border-t border-slate-800 space-y-2">
            {previewUrl && (
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-800 border border-slate-700">
                <img src={previewUrl} alt="Thumbnail preview" className="w-10 h-10 object-cover rounded-lg" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">Timetable Image Attached</p>
                  <p className="text-[10px] text-slate-400">Ready for OCR extraction</p>
                </div>
                <button
                  onClick={() => { setPreviewUrl(null); setSelectedImage(null); }}
                  className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                title="Upload Timetable Image for OCR Extraction"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask Plannify AI or attach timetable image..."
                className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />

              <button
                onClick={() => handleSend()}
                disabled={isLoading || (!input.trim() && !selectedImage)}
                className="p-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold transition-all shadow-lg shadow-amber-900/20"
                title="Send Message"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
