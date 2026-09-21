
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { askCopilot, CopilotMessage } from '../../utils/geminiService';
import { 
  Sparkles, 
  Send, 
  X, 
  Key, 
  Cpu, 
  Bot, 
  User, 
  RotateCcw,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';

export const AICopilotModal: React.FC = () => {
  const { isCopilotOpen, setIsCopilotOpen, apiKey, setApiKey, student } = useApp();
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'm-init',
      sender: 'assistant',
      text: `Hello ${student.name}! I am your **S.P.A.R.K. AI Copilot** (Smart Platform for Academia–Industry Readiness and Knowledge).\n\nI have evaluated your verified competencies for **${student.targetRole}** (Current Readiness: **${student.readinessScore}%**). How can I assist your career roadmap, technical interview prep, or institutional collaboration today?`,
      timestamp: 'Just now',
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    'How do I bridge my critical Cloud & Kubernetes gap?',
    'What are the key guidelines for an Industry-Academia MoU?',
    'How can I optimize my resume for top-tier hiring?',
    'What are the NEP 2020 internship credit rules?'
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isCopilotOpen) {
      scrollToBottom();
    }
  }, [messages, isCopilotOpen]);

  if (!isCopilotOpen) return null;

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: CopilotMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!queryText) setInput('');
    setLoading(true);

    try {
      const reply = await askCopilot(textToSend, apiKey);
      const botMsg: CopilotMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl h-[620px] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
        
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-yellow-300 shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm">S.P.A.R.K. AI Copilot</h3>
                <span className="text-[10px] bg-amber-400 text-slate-950 font-extrabold px-1.5 py-0.5 rounded">
                  Active
                </span>
              </div>
              <p className="text-[11px] text-blue-200">
                Context: {student.targetRole} • Skill Readiness {student.readinessScore}%
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowKeyInput(!showKeyInput)}
              className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Optional Gemini API Key"
            >
              <Key className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsCopilotOpen(false)}
              className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Optional API Key banner */}
        {showKeyInput && (
          <div className="p-3 bg-slate-100 border-b border-slate-200 text-xs flex items-center gap-2">
            <Key className="w-4 h-4 text-slate-500 shrink-0" />
            <input
              type="password"
              placeholder="Paste Google Gemini API Key (Optional - Smart local AI active by default)"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-[10px] text-slate-500 font-medium">Auto-saved</span>
          </div>
        )}

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
          {messages.map((msg) => {
            const isBot = msg.sender === 'assistant';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isBot ? 'items-start' : 'items-start flex-row-reverse'}`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  isBot ? 'bg-blue-600 text-white' : 'bg-slate-800 text-white'
                }`}>
                  {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                <div className={`max-w-[82%] rounded-2xl p-3.5 text-xs sm:text-[13px] leading-relaxed shadow-xs ${
                  isBot
                    ? 'bg-white text-slate-800 border border-slate-200/90 whitespace-pre-wrap'
                    : 'bg-blue-600 text-white font-medium'
                }`}>
                  {msg.text}
                  <p className={`text-[10px] mt-1.5 ${isBot ? 'text-slate-400' : 'text-blue-200 text-right'}`}>
                    {msg.timestamp}
                  </p>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-3 text-xs text-slate-500 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <span>AI Copilot analyzing competencies & benchmarks...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts */}
        <div className="p-2.5 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto">
          {quickPrompts.map((qp, qIdx) => (
            <button
              key={qIdx}
              onClick={() => handleSend(qp)}
              className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-[11px] font-medium shrink-0 border border-slate-200 transition-colors"
            >
              {qp}
            </button>
          ))}
        </div>

        {/* Chat Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3 bg-white border-t border-slate-200 flex gap-2"
        >
          <input
            type="text"
            placeholder="Ask anything about skill gaps, courses, MoUs, or placement prep..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="flex-1 text-xs sm:text-sm px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center shadow-xs"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
};
