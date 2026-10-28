import React, { useState, useEffect, useRef } from 'react';
import api from '../api';

export default function ChatbotWidget({ currentUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const [lang, setLang] = useState('en'); // 'en' | 'ta'
  const [messages, setMessages] = useState([
    {
      id: 'msg_welcome',
      role: 'assistant',
      text: currentUser
        ? `Hello ${currentUser.name}! I am your AI Housing Assistant. Ask me about your live application status, waitlists, documents, or scheme eligibility.`
        : 'Hello! I am your AI Housing Assistant. Ask me about eligibility, waitlists, documents, or your live application status.',
      source: 'TNHB Official Portal',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Update greeting when language changes
  const switchLanguage = (newLang) => {
    setLang(newLang);
    const greeting = newLang === 'ta'
      ? 'வணக்கம்! நான் உங்கள் வீட்டு வசதி வாரிய AI உதவியாளர். திட்ட தகுதி, காத்திருப்பு பட்டியல், ஆவணங்கள் அல்லது உங்கள் விண்ணப்ப நிலை குறித்து கேளுங்கள்.'
      : 'Hello! I am your AI Housing Assistant. Ask me about eligibility, waitlists, documents, or your live application status.';
    
    setMessages(prev => [
      ...prev,
      {
        id: `msg_lang_${Date.now()}`,
        role: 'assistant',
        text: greeting,
        source: newLang === 'ta' ? 'தமிழ்நாடு வீட்டு வசதி வாரியம்' : 'TNHB Official Portal',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleSend = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const userMsg = {
      id: `usr_${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const res = await api.sendChatMessage(text, lang);
      const botMsg = {
        id: `bot_${Date.now()}`,
        role: 'assistant',
        text: res.reply,
        source: res.source,
        ticketOffered: res.ticketOffered,
        appData: res.applicationData,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error("Chatbot query error:", err);
      setMessages(prev => [
        ...prev,
        {
          id: `bot_err_${Date.now()}`,
          role: 'assistant',
          text: lang === 'ta' 
            ? 'மன்னிக்கவும், தகவலைப் பெற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.' 
            : 'Sorry, I could not retrieve information at the moment. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // Voice Input using Web Speech API
  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(lang === 'ta' ? 'உங்கள் உலாவியில் குரல் உள்ளீடு ஆதரிக்கப்படவில்லை.' : 'Speech Recognition is not supported by your browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang === 'ta' ? 'ta-IN' : 'en-IN';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
      handleSend(transcript);
    };

    recognition.start();
  };

  const handleRaiseTicket = async (promptQuery) => {
    try {
      await api.createSupportTicket(promptQuery || inputText || "Escalation requested via chat", lang);
      setTicketSuccess(lang === 'ta' ? 'அதிகாரிக்கு கோரிக்கை அனுப்பப்பட்டது!' : 'Officer escalation ticket generated!');
      setTimeout(() => setTicketSuccess(''), 4000);
      setMessages(prev => [
        ...prev,
        {
          id: `tkt_${Date.now()}`,
          role: 'assistant',
          text: lang === 'ta'
            ? '✅ உங்கள் கோரிக்கை எண் பதிவு செய்யப்பட்டு அதிகாரிக்கு அனுப்பப்பட்டுள்ளது. விரைவில் தகவல் தெரிவிக்கப்படும்.'
            : '✅ Your request has been logged and assigned to a housing desk officer. You will receive an update in notifications.',
          source: 'TNHB Citizen Support Cell',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (e) {
      console.error("Support ticket error:", e);
      alert("Failed to raise support ticket");
    }
  };

  const suggestionChips = lang === 'ta' ? [
    'என் விண்ணப்ப நிலை என்ன?',
    'வருமான வரம்புகள் மற்றும் தகுதி என்ன?',
    'முன்னுரிமை மதிப்பெண் எப்படி கணக்கிடப்படுகிறது?',
    'என்னென்ன ஆவணங்கள் தேவை?'
  ] : [
    'Check my application status',
    'What are the income eligibility limits?',
    'How is priority score calculated?',
    'What documents are required?'
  ];

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}>
      {/* Floating launcher button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
            color: '#fff',
            border: 'none',
            borderRadius: '50px',
            padding: '14px 22px',
            fontSize: '15px',
            fontWeight: '600',
            boxShadow: '0 8px 24px rgba(30, 64, 175, 0.4)',
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <span style={{ fontSize: '20px' }}>🤖</span>
          <span>Housing AI (EN / தமிழ்)</span>
          <span style={{
            background: '#10b981',
            borderRadius: '50%',
            width: '10px',
            height: '10px',
            display: 'inline-block'
          }} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div style={{
          width: '380px',
          maxWidth: '92vw',
          height: '560px',
          maxHeight: '85vh',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          animation: 'fadeIn 0.25s ease-out'
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #0f172a, #1e293b)',
            color: '#ffffff',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #334155'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                background: '#3b82f6',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px'
              }}>
                🏛️
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '15px', letterSpacing: '-0.3px' }}>
                  TNHB AI Assistant
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Bilingual RAG • English / தமிழ்
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Language toggle */}
              <div style={{
                background: '#334155',
                borderRadius: '20px',
                padding: '2px',
                display: 'flex'
              }}>
                <button
                  onClick={() => switchLanguage('en')}
                  style={{
                    border: 'none',
                    background: lang === 'en' ? '#3b82f6' : 'transparent',
                    color: '#fff',
                    padding: '3px 8px',
                    borderRadius: '16px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: lang === 'en' ? '700' : '400'
                  }}
                >
                  EN
                </button>
                <button
                  onClick={() => switchLanguage('ta')}
                  style={{
                    border: 'none',
                    background: lang === 'ta' ? '#3b82f6' : 'transparent',
                    color: '#fff',
                    padding: '3px 8px',
                    borderRadius: '16px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: lang === 'ta' ? '700' : '400'
                  }}
                >
                  தமிழ்
                </button>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Quick chip container */}
          <div style={{
            background: '#f8fafc',
            padding: '8px 12px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            whiteSpace: 'nowrap'
          }}>
            {suggestionChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(chip)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  color: '#334155',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#cbd5e1'}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Messages Thread */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            background: '#f8fafc'
          }}>
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%'
                }}
              >
                <div style={{
                  background: m.role === 'user' ? '#1e40af' : '#ffffff',
                  color: m.role === 'user' ? '#ffffff' : '#1e293b',
                  padding: '10px 14px',
                  borderRadius: m.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  fontSize: '13px',
                  lineHeight: '1.45',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                  border: m.role === 'user' ? 'none' : '1px solid #e2e8f0'
                }}>
                  {m.text}

                  {/* Grounded data card if attached */}
                  {m.appData && (
                    <div style={{
                      marginTop: '8px',
                      background: '#eff6ff',
                      padding: '8px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      border: '1px solid #bfdbfe'
                    }}>
                      <div><strong>App ID:</strong> {m.appData.id}</div>
                      <div><strong>Status:</strong> {m.appData.status}</div>
                      {m.appData.rank && <div><strong>Waitlist Rank:</strong> {m.appData.rank}</div>}
                      {m.appData.score !== undefined && <div><strong>Priority Score:</strong> {m.appData.score} pts</div>}
                    </div>
                  )}

                  {/* Citation tag */}
                  {m.source && (
                    <div style={{
                      marginTop: '6px',
                      fontSize: '10px',
                      color: m.role === 'user' ? '#bfdbfe' : '#64748b',
                      fontStyle: 'italic',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span>📖</span> {m.source}
                    </div>
                  )}

                  {/* Officer escalation fallback button */}
                  {m.ticketOffered && (
                    <div style={{ marginTop: '8px' }}>
                      <button
                        onClick={() => handleRaiseTicket(m.text)}
                        style={{
                          background: '#f59e0b',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        {lang === 'ta' ? '📞 அதிகாரியிடம் பேச கோரிக்கை வை' : '📞 Talk to Officer / Raise Query'}
                      </button>
                    </div>
                  )}
                </div>
                <div style={{
                  fontSize: '9px',
                  color: '#94a3b8',
                  marginTop: '2px',
                  textAlign: m.role === 'user' ? 'right' : 'left'
                }}>
                  {m.timestamp}
                </div>
              </div>
            ))}

            {isTyping && (
              <div style={{
                alignSelf: 'flex-start',
                background: '#ffffff',
                padding: '8px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                color: '#64748b',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>Retrieving Board guidelines...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Status toast if ticket raised */}
          {ticketSuccess && (
            <div style={{
              background: '#10b981',
              color: '#fff',
              fontSize: '11px',
              padding: '6px 12px',
              textAlign: 'center',
              fontWeight: '600'
            }}>
              {ticketSuccess}
            </div>
          )}

          {/* Footer input form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{
              padding: '10px 12px',
              background: '#ffffff',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <input
              type="text"
              placeholder={lang === 'ta' ? 'கேள்வி கேட்கவும்...' : 'Ask question in English or Tamil...'}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              style={{
                flex: 1,
                padding: '9px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '20px',
                fontSize: '13px',
                outline: 'none'
              }}
            />

            {/* Voice input button */}
            <button
              type="button"
              onClick={handleVoiceInput}
              title="Voice Input (Speech recognition)"
              style={{
                background: isListening ? '#ef4444' : '#f1f5f9',
                color: isListening ? '#ffffff' : '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px'
              }}
            >
              🎤
            </button>

            {/* Send button */}
            <button
              type="submit"
              style={{
                background: '#1e40af',
                color: '#ffffff',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px'
              }}
            >
              ➔
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
