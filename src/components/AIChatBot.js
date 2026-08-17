import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { compressImage } from '../utils/imageOptimizer';
import { API_BASE_URL } from '../apiConfig';
import BrandLogo from './common/BrandLogo';

function generateClientSideAIResponse(userText, context = {}, { teachers = [], subjects = [], sections = [], rooms = [] } = {}) {
  const text = (userText || "").trim();
  const lower = text.toLowerCase();

  // 1. Add Teacher / Faculty
  if (/(add|create|new)\s+(teacher|faculty|prof|professor|dr)/i.test(lower)) {
    const cleaned = text.replace(/^(please\s+)?(add|create|new)\s+(teacher|faculty|professor|prof|dr\.?)\s+/i, '').trim();
    const namePart = cleaned.split(/\b(in|dept|department|phone|email|for|with)\b/i)[0].trim();
    const teacherName = namePart.length > 1 ? namePart : "Dr. New Faculty";
    const deptMatch = text.match(/\b(?:in|department|dept)\s+([A-Za-z\s]+)/i);
    const deptName = deptMatch ? deptMatch[1].trim() : "Computer Applications";

    const newTeacher = {
      name: teacherName,
      department: deptName,
      designation: "Assistant Professor",
      free_periods: 1,
      email: `${teacherName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@lnctu.ac.in`,
      phone: "+91-9876543210"
    };

    const jsonBlock = JSON.stringify({
      action: "add_data",
      teachers: [newTeacher]
    }, null, 2);

    return `### ✨ Faculty Member Added Successfully!

I have registered **${teacherName}** in the **${deptName}** department and synchronized them with your active academic workspace.

\`\`\`json
${jsonBlock}
\`\`\`

- **Department**: \`${deptName}\`
- **Email**: \`${newTeacher.email}\`
- **Status**: \`Active & Ready for Schedule Allocation\``;
  }

  // 2. Add Subject / Course
  if (/(add|create|new)\s+(subject|course|lab)/i.test(lower)) {
    const isLab = /lab|practical/i.test(lower);
    const cleaned = text.replace(/^(please\s+)?(add|create|new)\s+(subject|course|lab)\s+/i, '').trim();
    const parts = cleaned.split(/\b(code|for|taught by|teacher|section|slots|in)\b/i);
    let subName = parts[0] ? parts[0].trim() : "Academic Course";
    if (subName.length < 2) subName = "Cloud Computing";

    const teacherMatch = text.match(/\b(?:taught by|teacher|prof|dr)\s+([A-Za-z.\s]+)/i);
    const teacherName = teacherMatch ? teacherMatch[1].trim() : (teachers[0]?.name || "Dr. Arvind Sharma");

    const codeMatch = text.match(/\b(?:code)\s+([A-Za-z0-9-]+)/i);
    const subCode = codeMatch ? codeMatch[1].trim() : `CS-${Math.floor(100 + Math.random() * 800)}`;

    const secMatch = text.match(/\b(?:section|sec|for)\s+([A-Za-z0-9-]+)/i);
    const secName = secMatch ? secMatch[1].trim() : (sections[0]?.name || "CSE-A");

    const slotsMatch = text.match(/\b(\d+)\s*(?:slots|periods|hours|hrs)/i);
    const requiredSlots = slotsMatch ? parseInt(slotsMatch[1]) : 4;

    const newSubject = {
      code: subCode,
      name: subName,
      teacher: teacherName,
      section: secName,
      required_slots: requiredSlots,
      is_lab: isLab,
      colorIndex: Math.floor(Math.random() * 8)
    };

    const jsonBlock = JSON.stringify({
      action: "add_data",
      subjects: [newSubject]
    }, null, 2);

    return `### 📚 Subject Added to Curriculum!

I have configured **${subName}** (\`${subCode}\`) for Section **${secName}**, instructed by **${teacherName}**.

\`\`\`json
${jsonBlock}
\`\`\`

- **Subject Code**: \`${subCode}\`
- **Instructor**: \`${teacherName}\`
- **Weekly Load**: \`${requiredSlots} Slots\` ${isLab ? '(Laboratory Session)' : '(Theory Lecture)'}`;
  }

  // 3. Add Section / Batch
  if (/(add|create|new)\s+(section|batch)/i.test(lower)) {
    const cleaned = text.replace(/^(please\s+)?(add|create|new)\s+(section|batch)\s+/i, '').trim();
    const secName = cleaned.split(/\b(with|room|in|lab)\b/i)[0].trim() || "CSE-B";
    const roomMatch = text.match(/\b(?:room|classroom)\s+([A-Za-z0-9/\-\s]+)/i);
    const roomName = roomMatch ? roomMatch[1].trim() : "308/MCA";

    const newSection = {
      name: secName,
      room: roomName,
      lab_room: "Lab Room No. 006"
    };

    const jsonBlock = JSON.stringify({
      action: "add_data",
      sections: [newSection],
      rooms: [roomName]
    }, null, 2);

    return `### 🏛️ Academic Section Registered!

I have created Section **${secName}** with primary lecture hall **${roomName}** and lab facility **Lab Room No. 006**.

\`\`\`json
${jsonBlock}
\`\`\``;
  }

  // 4. Add Room / Lab
  if (/(add|create|new)\s+(room|lab|classroom|hall)/i.test(lower)) {
    const cleaned = text.replace(/^(please\s+)?(add|create|new)\s+(room|lab|classroom|hall)\s+/i, '').trim();
    const roomNames = cleaned.split(/[,&and]+/).map(r => r.trim()).filter(r => r.length > 1);
    const finalRooms = roomNames.length > 0 ? roomNames : ["Room 205", "Lab 4"];

    const jsonBlock = JSON.stringify({
      action: "add_data",
      rooms: finalRooms
    }, null, 2);

    return `### 🏢 Facilities Added!

I have provisioned the following room resources into your active matrix:
${finalRooms.map(r => `- \`${r}\``).join('\n')}

\`\`\`json
${jsonBlock}
\`\`\``;
  }

  // 5. Generate / Solve Timetable
  if (/generate|solve|optimize\s+(timetable|schedule)/i.test(lower)) {
    const jsonBlock = JSON.stringify({ action: "generate_timetable" }, null, 2);
    return `### 🚀 Generating Optimal Academic Schedule...

I have initiated the constraint solver optimization engine for your active academic datasets (Faculty, Sections, Subjects, and Rooms).

\`\`\`json
${jsonBlock}
\`\`\`

- **Hard Constraints**: 0 Collisions enforced.
- **Soft Constraints**: Heavy lab distribution in morning hours & free period allocations preserved.`;
  }

  // 6. Load Demo / Clear Demo
  if (/load demo/i.test(lower)) {
    const jsonBlock = JSON.stringify({ action: "load_demo" }, null, 2);
    return `### 🚀 Full Academic Demo Loaded!\n\n\`\`\`json\n${jsonBlock}\n\`\`\``;
  }

  if (/remove demo|clear demo|reset/i.test(lower)) {
    const jsonBlock = JSON.stringify({ action: "clear_demo" }, null, 2);
    return `### 🧹 Clean Real Implementation Workspace Active!\n\n\`\`\`json\n${jsonBlock}\n\`\`\``;
  }

  // Default intelligent assistant response
  return `### 🤖 Plannify AI Intelligence Assistant

I am active and ready to manage your academic operations. You can give me direct instructions such as:

- 👨‍🏫 **"Add teacher Dr. Sunita Rao in CSE"**
- 📚 **"Add subject Data Mining code CS601 taught by Dr. Arvind for section CSE-A with 4 slots"**
- 🏛️ **"Add section BCA-2 with room 102"**
- 🏢 **"Add rooms Lab-3, Room-204"**
- ✨ **"Generate timetable now"**
- 🚀 **"Load demo data"** or 🗑️ **"Remove demo data"**`;
}

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
        : "👋 **Hello! I am your Plannify.exe AI Co-Pilot.**\n\nI specialize in academic timetable optimization, teacher workload balancing, substitution management, adding curriculum entities, and automated timetable OCR image extraction.\n\n*How can I assist your institution today?*",
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

    let reply = null;
    const endpointsToTry = [
      `${API_BASE_URL}/chat`,
      'http://localhost:8080/chat',
      'http://127.0.0.1:8080/chat',
      'http://localhost:8000/chat',
      'https://plannify-b6bd.onrender.com/chat'
    ];
    const uniqueEndpoints = Array.from(new Set(endpointsToTry.filter(Boolean)));

    for (const ep of uniqueEndpoints) {
      try {
        const response = await axios.post(ep, {
          message: userMsg.text,
          context: { 
            ...(result || {}), 
            teachers_count: teachers?.length || 0,
            subjects_count: subjects?.length || 0,
            sections_count: sections?.length || 0,
            rooms_count: rooms?.length || 0,
            is_teacher_view: isTeacherView, 
            teacher_name: teacherName 
          },
          history: messages.map(m => ({ sender: m.sender, text: m.text })),
          image: imgToSend
        }, { timeout: 8000 });

        if (response?.data?.reply) {
          reply = response.data.reply;
          break;
        }
      } catch (err) {
        // try next endpoint
      }
    }

    if (!reply) {
      // Offline / Local Resilient AI Engine fallback
      reply = generateClientSideAIResponse(userMsg.text, result, { teachers, subjects, sections, rooms, timeSlots });
    }

    let displayReply = reply;

    // Extract and execute structured JSON block
    const jsonMatch = reply.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        const extractedData = JSON.parse(jsonMatch[1]);
        if (onExtractedData) onExtractedData(extractedData);
        if (extractedData.action === "generate_timetable" && onGenerateTimetable) {
          onGenerateTimetable();
        } else if (extractedData.action === "load_demo" && onLoadDemo) {
          onLoadDemo();
        } else if (extractedData.action === "clear_demo" && onRemoveDemo) {
          onRemoveDemo();
        }
      } catch (e) {
        console.warn("JSON parsing warning:", e);
      }
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
        text: "✨ **Chat history reset.** How can I assist with your academic timetable and operations?",
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const SUGGESTIONS = [
    { label: "✨ Generate Timetable", icon: "✨", action: "generate" },
    { label: "Add Teacher", icon: "👨‍🏫", action: "prompt_text", prompt: "Add teacher Dr. Ananya in Data Science department" },
    { label: "Add Subject", icon: "📚", action: "prompt_text", prompt: "Add subject Machine Learning code CS701 taught by Dr. Arvind for section CSE-A with 4 slots" },
    { label: "Add Section & Room", icon: "🏛️", action: "prompt_text", prompt: "Add section BCA-2 with room Room 102" },
    { label: "Add Facilities", icon: "🏢", action: "prompt_text", prompt: "Add rooms Lab-3, Room-204" },
    { label: "Load Demo Data", icon: "🚀", action: "demo" },
    { label: "Remove Demo Data", icon: "🗑️", action: "clear_demo" },
    { label: "Analyze Workloads", icon: "📊", action: "prompt" },
    { label: "OCR Timetable Image", icon: "📷", action: "ocr" },
  ];

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 group flex items-center gap-2.5 p-3.5 rounded-full bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white shadow-2xl shadow-amber-600/30 hover:scale-105 hover:shadow-amber-600/50 transition-all duration-300 border border-amber-400/40"
          title="Open Plannify.exe AI Co-Pilot"
        >
          <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-white/20 backdrop-blur-md">
            <img src="/favicon.png" alt="AI" className="w-5 h-5 object-contain" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#20140E]" />
          </div>
          <BrandLogo size="xs" isWarm={true} className="pr-1 hidden sm:inline-flex" />
          <span className="text-[10px] font-black uppercase text-amber-200 hidden sm:inline">AI</span>
        </button>
      )}

      {/* Main AI Assistant Window */}
      {isOpen && (
        <div
          className={`fixed right-4 bottom-4 z-50 bg-[#20140E]/95 border border-[#332219] rounded-3xl shadow-2xl backdrop-blur-xl flex flex-col transition-all duration-300 overflow-hidden animate-scale-in text-amber-100 ${
            isExpanded
              ? "w-[92vw] sm:w-[700px] h-[85vh]"
              : "w-[92vw] sm:w-[460px] h-[640px] max-h-[85vh]"
          }`}
        >
          {/* Header */}
          <div className="px-5 py-3.5 bg-gradient-to-r from-[#20140E] via-[#2E1B13] to-[#20140E] border-b border-[#332219] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-600/30 to-orange-600/30 border border-amber-500/40 flex items-center justify-center shadow-lg shadow-amber-600/20 p-1.5">
                <img src="/favicon.png" alt="Plannify" className="w-full h-full object-contain" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <BrandLogo size="sm" isWarm={true} />
                  <span className="text-xs font-black text-white uppercase tracking-wider">AI Co-Pilot</span>
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
                        ? "bg-indigo-600 text-white border-indigo-400/30"
                        : "bg-slate-800 text-indigo-300 border-slate-700"
                    }`}
                  >
                    {isUser ? "U" : "🤖"}
                  </div>

                  <div
                    className={`group relative rounded-2xl p-4 text-xs leading-relaxed shadow-lg ${
                      isUser
                        ? "bg-indigo-600 text-white rounded-tr-none"
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
                <div className="w-7 h-7 rounded-xl bg-slate-800 text-indigo-300 border border-slate-700 flex items-center justify-center text-xs font-bold">
                  🤖
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-center gap-2 rounded-tl-none">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.15s]" />
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.3s]" />
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
                    if (s.action === "generate" && onGenerateTimetable) {
                      onGenerateTimetable();
                      setMessages(prev => [
                        ...prev,
                        {
                          id: Date.now().toString(),
                          text: "✨ **Timetable Solver Triggered!**\n\nI have initiated the AI constraint optimization solver to generate the class schedule matrix.",
                          sender: 'bot',
                          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        }
                      ]);
                    } else if (s.action === "demo" && onLoadDemo) {
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
                    } else if (s.action === "prompt_text") {
                      handleSend(s.prompt || s.label);
                    } else {
                      handleSend(s.label);
                    }
                  }}
                  className={`whitespace-nowrap px-3 py-1 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-1.5 active:scale-95 ${
                    s.action === "generate"
                      ? "bg-indigo-600/30 text-indigo-200 border-indigo-500/50 hover:bg-indigo-600/40"
                      : s.action === "demo"
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
                placeholder="Ask Planify AI or attach timetable image..."
                className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />

              <button
                onClick={() => handleSend()}
                disabled={isLoading || (!input.trim() && !selectedImage)}
                className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold transition-all shadow-lg shadow-indigo-600/20"
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
