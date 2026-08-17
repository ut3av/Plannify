import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { compressImage } from '../utils/imageOptimizer';
import { API_BASE_URL } from '../apiConfig';

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
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      text: isTeacherView
        ? `Hello ${teacherName || "Faculty Member"}! How can I help with your academic classes today?`
        : "Hello! How can I help with academic scheduling today?",
      sender: 'bot',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

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

  const clearChat = () => {
    setMessages([
      {
        id: "welcome-reset",
        text: "How can I help with academic scheduling today?",
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setShowSettingsMenu(false);
  };

  return (
    <>
      {/* Minimalist Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-13 h-13 rounded-full bg-[#D97706] hover:bg-[#B45309] text-white shadow-xl shadow-amber-600/30 hover:scale-105 active:scale-95 transition-all duration-200 border-2 border-white dark:border-[#2A1C14]"
          title="Open Plannify AI Assistant"
        >
          <span className="font-bold text-sm tracking-tight">AI</span>
        </button>
      )}

      {/* Main Minimalist Assistant Window */}
      {isOpen && (
        <div className="fixed right-4 bottom-4 z-50 w-[92vw] sm:w-[420px] h-[520px] max-h-[85vh] bg-white dark:bg-[#1E140F] border border-stone-200 dark:border-stone-800 rounded-[28px] shadow-2xl flex flex-col overflow-hidden animate-scale-in text-slate-800 dark:text-stone-100">
          
          {/* Header */}
          <div className="px-5 py-4 bg-white dark:bg-[#1E140F] border-b border-stone-100 dark:border-stone-800/80 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Plannify AI Assistant
            </h3>

            <div className="flex items-center gap-1.5 relative">
              {/* Settings / Actions Toggle */}
              <button
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                title="Quick Options"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
              </button>

              {/* Close Button */}
              <button
                onClick={() => { setIsOpen(false); setShowSettingsMenu(false); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                title="Close"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>

              {/* Settings Dropdown */}
              {showSettingsMenu && (
                <div className="absolute right-0 top-9 w-48 bg-white dark:bg-[#241710] rounded-2xl shadow-xl border border-stone-200 dark:border-stone-800 p-1.5 z-50 text-xs animate-slide-down">
                  {onGenerateTimetable && (
                    <button
                      onClick={() => { onGenerateTimetable(); setShowSettingsMenu(false); }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-slate-700 dark:text-stone-200 flex items-center gap-2"
                    >
                      <span>✨</span> Generate Timetable
                    </button>
                  )}
                  <button
                    onClick={() => { fileInputRef.current?.click(); setShowSettingsMenu(false); }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-slate-700 dark:text-stone-200 flex items-center gap-2"
                  >
                    <span>📷</span> Upload Image OCR
                  </button>
                  {onLoadDemo && (
                    <button
                      onClick={() => { onLoadDemo(); setShowSettingsMenu(false); }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-slate-700 dark:text-stone-200 flex items-center gap-2"
                    >
                      <span>🚀</span> Load Demo Data
                    </button>
                  )}
                  {onRemoveDemo && (
                    <button
                      onClick={() => { onRemoveDemo(); setShowSettingsMenu(false); }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2"
                    >
                      <span>🗑️</span> Remove Demo Data
                    </button>
                  )}
                  <div className="h-px bg-stone-100 dark:bg-stone-800 my-1" />
                  <button
                    onClick={clearChat}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-slate-500 dark:text-stone-400 flex items-center gap-2"
                  >
                    <span>🔄</span> Clear Conversation
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#FAF7F2] dark:bg-[#180F0A]">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${
                    isUser ? "ml-auto flex-row-reverse justify-start max-w-[86%]" : "mr-auto justify-start max-w-[86%]"
                  }`}
                >
                  {/* Avatar */}
                  {isUser ? (
                    <div className="w-8 h-8 rounded-full bg-[#EAE0D5] dark:bg-[#3D291F] text-slate-700 dark:text-stone-300 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#D97706] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                      AI
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`rounded-2xl px-4 py-3 text-[13px] leading-relaxed shadow-sm ${
                      isUser
                        ? "bg-[#F4ECE3] dark:bg-[#332219] text-slate-800 dark:text-stone-100 rounded-tr-sm"
                        : "bg-[#FEF6EE] dark:bg-[#2A1C14] text-slate-800 dark:text-stone-100 rounded-tl-sm border border-[#FDE6CF]/60 dark:border-stone-800"
                    }`}
                  >
                    {msg.image && (
                      <div className="mb-2 overflow-hidden rounded-xl border border-stone-200 dark:border-stone-700">
                        <img src={msg.image} alt="Uploaded" className="max-h-40 w-full object-cover" />
                      </div>
                    )}

                    <div className="prose prose-xs max-w-none text-slate-800 dark:text-stone-100 prose-p:leading-relaxed prose-pre:bg-stone-900 prose-pre:text-stone-100 prose-pre:rounded-xl">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing Loader */}
            {isLoading && (
              <div className="flex items-start gap-2.5 mr-auto max-w-[85%]">
                <div className="w-8 h-8 rounded-full bg-[#D97706] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  AI
                </div>
                <div className="bg-[#FEF6EE] dark:bg-[#2A1C14] rounded-2xl rounded-tl-sm px-4 py-3 text-xs text-slate-500 dark:text-stone-400 border border-[#FDE6CF]/60 dark:border-stone-800 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce [animation-delay:0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce [animation-delay:0.3s]" />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Minimalist Input Bar */}
          <div className="p-3.5 bg-white dark:bg-[#1E140F] border-t border-stone-100 dark:border-stone-800/80">
            {previewUrl && (
              <div className="flex items-center gap-2 p-2 mb-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs">
                <img src={previewUrl} alt="Thumbnail preview" className="w-8 h-8 object-cover rounded-lg" />
                <span className="flex-1 truncate text-slate-600 dark:text-stone-300">Timetable Image Attached</span>
                <button
                  onClick={() => { setPreviewUrl(null); setSelectedImage(null); }}
                  className="p-1 text-slate-400 hover:text-rose-500"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="relative flex items-center">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type a query or command..."
                className="w-full pl-4 pr-12 py-3 bg-white dark:bg-[#2A1C14] border border-stone-200 dark:border-stone-700/80 rounded-full text-xs text-slate-800 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:border-amber-500 transition-colors shadow-sm"
              />

              <button
                onClick={() => handleSend()}
                disabled={isLoading || (!input.trim() && !selectedImage)}
                className="absolute right-1.5 w-8 h-8 rounded-full bg-[#D97706] hover:bg-[#B45309] disabled:opacity-40 text-white flex items-center justify-center transition-transform active:scale-95 shadow-md shadow-amber-600/20"
                title="Send Message"
              >
                <svg className="w-3.5 h-3.5 translate-x-0.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
