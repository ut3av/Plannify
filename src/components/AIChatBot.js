import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

export default function AIChatBot({ result }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: "Hi! I'm your AI scheduling assistant. I can suggest ways to optimize your timetable. Generate a timetable first, then ask me anything!", sender: 'bot' }
  ]);
  const [input, setInput] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    const newMsg = { text: input, sender: 'user' };
    setMessages(prev => [...prev, newMsg]);
    setInput("");
    setIsLoading(true);
    
    try {
        const response = await axios.post(`${API_BASE_URL}/chat`, {
            message: newMsg.text,
            context: result || {},
            history: messages
        });
        setMessages(prev => [...prev, { text: response.data.reply, sender: 'bot' }]);
    } catch (error) {
        setMessages(prev => [...prev, { text: "Sorry, I couldn't reach the AI backend.", sender: 'bot' }]);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full shadow-lg shadow-violet-500/30 flex items-center justify-center hover:scale-105 transition-transform z-50 ${isOpen ? 'hidden' : ''}`}
      >
        <span className="text-2xl">✨</span>
      </button>

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 sm:w-[450px] h-[600px] max-h-[80vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col z-50 animate-scale-in overflow-hidden">
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-4 flex justify-between items-center shadow-md">
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                 <span className="text-xl">✨</span>
               </div>
               <div>
                 <h3 className="text-white font-bold text-sm">Gemini AI Assistant</h3>
                 <p className="text-violet-200 text-[10px] uppercase tracking-wider font-semibold">Gemini 2.5 Pro</p>
               </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white transition-colors bg-white/10 p-1.5 rounded-lg hover:bg-white/20">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          
          <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4 bg-slate-900/50 custom-scrollbar">
            {messages.map((msg, i) => (
              <div key={i} className={`max-w-[85%] rounded-2xl p-4 text-sm shadow-md ${msg.sender === 'user' ? 'bg-violet-600 text-white self-end rounded-br-none' : 'bg-slate-800 text-slate-200 border border-slate-700 self-start rounded-bl-none'}`}>
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
                    <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></span>
                    <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                 </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="p-3 bg-slate-800 border-t border-slate-700 flex gap-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask for optimization tips..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
            />
            <button onClick={handleSend} disabled={isLoading} className="bg-violet-600 text-white p-2 rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
