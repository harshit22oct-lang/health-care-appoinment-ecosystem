import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, X, Send, Sparkles, Brain, Bot, ArrowRight, User, Pill, MapPin, Stethoscope, FileText, HeartPulse } from 'lucide-react';
import { api } from '../../services/api';

const QUICK_QUESTIONS = [
  '💊 Medicine prices & Jan Aushadhi generics',
  '🏪 24/7 Pharmacies in Bhopal',
  '🦷 Dentist in Bhopal & Root Canal cost',
  '❤️ Cardiologists in Bhopal',
  '🧪 Lab test costs (CBC, Lipid, Thyroid)',
  '🩺 How to book an appointment?',
];

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "👋 Hello! I am **HealthSync AI Super Assistant**, your clinical advisor powered by Gemini.\n\nAsk me about:\n- **Medicine Prices & Generic (Jan Aushadhi) Savings**\n- **24/7 Pharmacies & Where to Buy Nearby**\n- **Real Doctors, Dentists & Hospitals in your City**\n- **Symptoms, Diagnosis & Lab Test Guidance**",
      suggestedActions: [
        { label: 'Browse Doctors', action: '/patient/doctors' },
        { label: 'Find Bhopal Clinics', action: '/patient/doctors?city=Bhopal' },
      ],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (textToSend) => {
    const msg = textToSend || input;
    if (!msg.trim() || loading) return;

    const userMessage = { role: 'user', content: msg };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const historyPayload = messages.map(m => ({ role: m.role, content: m.content }));
      const res = await api.ai.chat({
        message: msg,
        history: historyPayload,
      });

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: res.data.reply,
          suggestedActions: res.data.suggestedActions || [],
        },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: "I'm currently unable to connect to the AI engine. You can still browse our verified doctors and book appointments directly on the platform!",
          suggestedActions: [{ label: 'Browse Doctors', action: '/patient/doctors' }],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Helper to render markdown-like formatting cleanly
  const renderFormattedText = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={i} style={{ height: '6px' }} />;

      // Header 3 or 4
      if (trimmed.startsWith('####')) {
        return <h5 key={i} style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', marginTop: '8px', marginBottom: '4px' }}>{trimmed.replace(/^####\s*/, '')}</h5>;
      }
      if (trimmed.startsWith('###')) {
        return <h4 key={i} style={{ fontSize: '14px', fontWeight: 800, color: '#0284C7', marginTop: '10px', marginBottom: '6px' }}>{trimmed.replace(/^###\s*/, '')}</h4>;
      }

      // Horizontal rule
      if (trimmed === '---') {
        return <hr key={i} style={{ margin: '8px 0', border: 'none', borderTop: '1px solid #E2E8F0' }} />;
      }

      // Bullet points
      const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ');
      const content = isBullet ? trimmed.substring(2) : trimmed;

      // Replace **text** with strong
      const parts = content.split(/(\*\*.*?\*\*)/g);
      const formatted = parts.map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={j} style={{ color: '#0F172A', fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      if (isBullet) {
        return (
          <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', marginBottom: '4px', lineHeight: 1.5 }}>
            <span style={{ color: '#0284C7', fontWeight: 'bold' }}>•</span>
            <span style={{ flex: 1, color: '#334155' }}>{formatted}</span>
          </div>
        );
      }

      return (
        <p key={i} style={{ marginBottom: '6px', lineHeight: 1.55, color: '#334155' }}>
          {formatted}
        </p>
      );
    });
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 999 }}>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          id="ai-chatbot-launcher"
          onClick={() => setIsOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 22px',
            borderRadius: 'var(--radius-full)',
            background: 'linear-gradient(135deg, #0284C7, #0D9488)',
            color: 'white',
            border: 'none',
            boxShadow: '0 8px 24px rgba(2, 132, 199, 0.35)',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: 'var(--text-sm)',
            transition: 'all 0.25s ease',
          }}
        >
          <div style={{
            width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Sparkles size={16} color="white" />
          </div>
          <span>Ask HealthSync AI</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="animate-scaleIn" style={{
          width: '420px',
          maxWidth: 'calc(100vw - 32px)',
          height: '580px',
          maxHeight: 'calc(100vh - 80px)',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '20px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #005E83, #0284C7)',
            padding: '14px 18px',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '10px',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
              }}>
                <Bot size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'white', margin: 0 }}>HealthSync Super AI</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34D399' }} />
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>Clinical Intelligence Active</span>
                </div>
              </div>
            </div>
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => setIsOpen(false)}
              style={{ color: 'white', background: 'rgba(255,255,255,0.15)', border: 'none', padding: '6px', borderRadius: '50%' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Quick Pill Filter Bar */}
          <div style={{ padding: '8px 12px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', gap: '6px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  borderRadius: '16px',
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#0F172A',
                  cursor: 'pointer',
                  fontWeight: 600,
                  flexShrink: 0,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Messages Container */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            background: '#F8FAFC',
          }}>
            {messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  gap: '8px',
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '90%',
                }}
              >
                {m.role === 'assistant' && (
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #0284C7, #0D9488)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px', color: 'white'
                  }}>
                    <Sparkles size={14} />
                  </div>
                )}

                <div style={{
                  background: m.role === 'user' ? '#0284C7' : '#FFFFFF',
                  color: m.role === 'user' ? '#FFFFFF' : '#1E293B',
                  padding: '12px 16px',
                  borderRadius: '16px',
                  fontSize: '13px',
                  border: m.role === 'user' ? 'none' : '1px solid #E2E8F0',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                }}>
                  {renderFormattedText(m.content)}

                  {/* Suggested action buttons inside response */}
                  {m.suggestedActions?.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #E2E8F0' }}>
                      {m.suggestedActions.map((act, actIdx) => (
                        <button
                          key={actIdx}
                          onClick={() => { setIsOpen(false); navigate(act.action); }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 12px',
                            background: '#F0FDF4',
                            border: '1px solid #86EFAC',
                            borderRadius: '16px',
                            color: '#166534',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {act.label} <ArrowRight size={11} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {loading && (
              <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-start', alignItems: 'center' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0284C7, #0D9488)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                }}>
                  <Sparkles size={14} />
                </div>
                <div style={{
                  background: '#FFFFFF',
                  padding: '10px 16px',
                  borderRadius: '16px',
                  display: 'flex',
                  gap: '6px',
                  alignItems: 'center',
                  border: '1px solid #E2E8F0',
                }}>
                  <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Gemini is analyzing...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            style={{
              padding: '12px 14px',
              background: '#FFFFFF',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              gap: '8px',
            }}
          >
            <input
              id="ai-chatbot-input"
              className="form-input"
              style={{ fontSize: '13px', padding: '10px 14px', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '12px', color: '#0F172A' }}
              placeholder="Ask about medicine prices, nearest pharmacy, doctors..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button
              id="ai-chatbot-send-btn"
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={loading || !input.trim()}
              style={{ padding: '10px 16px', borderRadius: '12px', background: '#0284C7' }}
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
