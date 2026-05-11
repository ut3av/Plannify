import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

export default function AIChatBot({ result, onExtractedData, onLoadDemo }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: "Hi! I'm your 7Seas AI Co-Pilot. I can suggest ways to optimize your timetable or extract data from images using OCR. Generate a timetable first, or upload an image!", sender: 'bot' }
  ]);
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
        const base64String = reader.result.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
        setSelectedImage(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if (!input.trim() && !selectedImage) return;
    
    const userText = input || "Please analyze this image.";
    const newMsg = { 
      text: userText, 
      sender: 'user',
      image: previewUrl
    };
    
    setMessages(prev => [...prev, newMsg]);
    setInput("");
    const imgToSend = selectedImage;
    setSelectedImage(null);
    setPreviewUrl(null);
    setIsLoading(true);
    
    try {
        const response = await axios.post(`${API_BASE_URL}/chat`, {
            message: newMsg.text,
            context: result || {},
            history: messages,
            image: imgToSend
        });
        
        const reply = response.data.reply;
        let displayReply = reply;
        
        // Extract JSON block if Groq sent structured data
        const jsonMatch = reply.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
            try {
                const extractedData = JSON.parse(jsonMatch[1]);
                if (extractedData.teachers || extractedData.subjects || extractedData.timeSlots) {
                   if (onExtractedData) onExtractedData(extractedData);
                   // Replace JSON block with a friendly success message in the chat
                   displayReply = reply.replace(/```(?:json)?\s*[\s\S]*?\s*```/, "\n\n✅ *I have extracted the timetable data and seamlessly updated your dashboard!*");
                }
            } catch (e) {
                console.error("Failed to parse Groq JSON output", e);
            }
        }

        setMessages(prev => [...prev, { text: displayReply, sender: 'bot' }]);
    } catch (error) {
        setMessages(prev => [...prev, { text: "Sorry, I couldn't reach the Groq AI backend.", sender: 'bot' }]);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full shadow-lg shadow-emerald-500/30 flex items-center justify-center hover:scale-105 transition-transform z-50 ${isOpen ? 'hidden' : ''}`}
      >
        <span className="text-3xl font-black italic text-white drop-shadow-md pb-1 pr-1">7</span>
      </button>

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 sm:w-[450px] h-[600px] max-h-[80vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col z-50 animate-scale-in overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4 flex justify-between items-center shadow-md">
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                 <span className="text-xl font-black italic text-white drop-shadow-md pb-0.5 pr-0.5">7</span>
               </div>
               <div>
                 <h3 className="text-white font-bold text-sm">7Seas AI Co-Pilot</h3>
                 <p className="text-emerald-100 text-[10px] uppercase tracking-wider font-semibold">Llama 3.3 70B & Vision</p>
               </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white transition-colors bg-white/10 p-1.5 rounded-lg hover:bg-white/20">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          
          <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4 bg-slate-900/50 custom-scrollbar">
            {messages.map((msg, i) => (
              <div key={i} className={`max-w-[85%] rounded-2xl p-4 text-sm shadow-md ${msg.sender === 'user' ? 'bg-emerald-600 text-white self-end rounded-br-none' : 'bg-slate-800 text-slate-200 border border-slate-700 self-start rounded-bl-none'}`}>
                 {msg.image && (
                   <img src={msg.image} alt="uploaded" className="max-w-full rounded-lg mb-2 border border-white/20" />
                 )}
                 <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-700">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.text}
                    </ReactMarkdown>
                 </div>
              </div>
            ))}
            {isLoading && (
              <div className="max-w-[85%] rounded-xl p-3 text-sm bg-slate-800 text-slate-200 border border-slate-700 self-start rounded-bl-none">
                 <div className="flex gap-1 items-center">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></span>
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                 </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* AI Suggestions Row */}
          <div className="px-4 pb-2 bg-slate-900/50">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1.5 ml-1">Try asking:</p>
            <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
              {[
                { label: "Optimize schedule", icon: "✨" },
                { label: "Check workloads", icon: "📊" },
                { label: "Find proxies", icon: "👤" },
                { label: "Load Demo Data", icon: "🚀", primary: true }
              ].map((s, i) => (
                <button 
                  key={i} 
                  onClick={() => {
                    if (s.label === "Load Demo Data" && onLoadDemo) {
                      onLoadDemo();
                      setMessages(prev => [...prev, { text: "🚀 **Demo data loaded successfully!**\n\nI've populated the dashboard with 10 teachers, 3 sections, and a complete curriculum. The AI solver is now generating an optimized timetable for you.", sender: 'bot' }]);
                    } else {
                      setInput(s.label);
                    }
                  }}
                  className={`whitespace-nowrap text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all duration-200 border flex items-center gap-1.5 hover:-translate-y-0.5 active:scale-95 ${
                    s.primary 
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/40 hover:border-amber-500/50 shadow-lg shadow-amber-500/10" 
                    : "bg-slate-800/80 text-slate-300 border-slate-700/50 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  <span className="text-xs">{s.icon}</span>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-slate-700 bg-slate-900/80 backdrop-blur-md">
            {previewUrl && (
              <div className="relative inline-block w-20 h-20 mb-1">
                <img src={previewUrl} alt="preview" className="w-full h-full object-cover rounded-lg border border-slate-600" />
                <button onClick={() => { setPreviewUrl(null); setSelectedImage(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <input 
                type="file" 
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-slate-700 text-slate-300 p-2 rounded-lg hover:bg-slate-600 transition-colors"
                title="Upload Image for OCR"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              </button>
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask 7Seas Co-Pilot or upload timetable image..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
              <button onClick={handleSend} disabled={isLoading || (!input.trim() && !selectedImage)} className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
