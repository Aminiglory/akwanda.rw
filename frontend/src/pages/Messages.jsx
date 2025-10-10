import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Messages() {
  const [searchParams] = useSearchParams();
  const prefillTo = searchParams.get('to') || '';
  const prefillBookingId = searchParams.get('bookingId') || '';

  const [threads, setThreads] = useState([]);
  const [active, setActive] = useState(null);
  const [history, setHistory] = useState([]);
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingTimerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const socket = useMemo(() => io(API_URL, { withCredentials: true }), []);

  useEffect(() => {
    // Load threads
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/messages/threads`, { credentials: 'include' });
        const data = await res.json();
        if (res.ok) setThreads(data.threads || []);
      } catch (e) {
        // ignore if endpoint not available
      } finally { setLoading(false); }
    })();

    // Socket listeners
    socket.on('message:new', (msg) => {
      if (active && (msg.from === active.userId || msg.to === active.userId)) {
        setHistory(h => [...h, msg]);
        scrollToBottom();
      }
    });
    socket.on('typing', (payload) => {
      // booking-scoped typing indicator
      if (active?.context?.bookingId && payload?.bookingId === active.context.bookingId) {
        setIsOtherTyping(!!payload.typing);
        if (payload.typing) {
          // auto-clear after a few seconds in case no stop event arrives
          setTimeout(() => setIsOtherTyping(false), 3000);
        }
      }
    });
    return () => { socket.disconnect(); };
  }, []);

  useEffect(() => {
    // Prefill open chat
    if (prefillTo) {
      openChat({ userId: prefillTo, name: 'User', context: { bookingId: prefillBookingId } });
    }
  }, [prefillTo, prefillBookingId]);

  function scrollToBottom() {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 0);
  }

  async function openChat(thread) {
    setActive(thread);
    setHistory([]);
    try {
      const qs = new URLSearchParams();
      if (thread.userId) qs.set('userId', thread.userId);
      if (thread.context?.bookingId) qs.set('bookingId', thread.context.bookingId);
      const res = await fetch(`${API_URL}/api/messages/history?${qs.toString()}`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setHistory(data.messages || []);
      // Mark as read for booking threads
      if (thread.context?.bookingId) {
        try {
          await fetch(`${API_URL}/api/messages/booking/${thread.context.bookingId}/read`, { method: 'PATCH', credentials: 'include' });
        } catch (_) {}
        // Join booking room for realtime features (typing, new messages)
        socket.emit('join_booking', { bookingId: thread.context.bookingId });
      }
      scrollToBottom();
    } catch (e) {
      // ignore if endpoint not available
    }
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!text.trim() || !active?.userId) return;
    const payload = { to: active.userId, text: text.trim(), bookingId: active.context?.bookingId || undefined };
    // If there are files, upload first
    let attachments = [];
    if (files && files.length) {
      const fd = new FormData();
      Array.from(files).forEach(f => fd.append('files', f));
      try {
        const upRes = await fetch(`${API_URL}/api/messages/upload`, { method: 'POST', credentials: 'include', body: fd });
        const upData = await upRes.json();
        if (upRes.ok) attachments = upData.attachments || [];
      } catch (_) {}
    }
    // Try REST first
    try {
      const res = await fetch(`${API_URL}/api/messages/send`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, attachments })
      });
      if (!res.ok) throw new Error('REST send failed');
    } catch (_) {
      // Fallback to socket
      socket.emit('message:send', { ...payload, attachments });
    }
    setHistory(h => [...h, { ...payload, attachments, createdAt: new Date().toISOString(), fromMe: true }]);
    setText('');
    setFiles([]);
    scrollToBottom();
  }

  function handleTextChange(e) {
    const value = e.target.value;
    setText(value);
    // Emit typing only for booking-scoped chats so backend can route event
    if (active?.context?.bookingId) {
      try {
        socket.emit('typing', { bookingId: active.context.bookingId, typing: true });
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => {
          socket.emit('typing', { bookingId: active.context.bookingId, typing: false });
        }, 1000);
      } catch (_) { /* ignore */ }
    }
  }

  function handleChooseFiles(ev) {
    const chosen = Array.from(ev.target.files || []);
    setFiles(prev => [...prev, ...chosen]);
  }

  function removeFileAt(index) {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-120px)]">
        {/* Threads */}
        <div className="lg:col-span-1 modern-card-elevated p-6 animate-fade-in-up">
          <div className="text-xl font-bold mb-6 uppercase tracking-wide text-gray-900 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">💬</span>
            </div>
            CONVERSATIONS
          </div>
          {loading ? (
            <div className="animate-pulse text-center py-8">
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-auto">
              {threads.map(t => (
                <button 
                  key={t.id || t.userId} 
                  onClick={() => openChat(t)} 
                  className={`w-full text-left p-4 rounded-xl transition-all duration-300 hover:scale-105 ${
                    active?.userId === t.userId 
                      ? 'bg-blue-600 text-white shadow-lg transform scale-105' 
                      : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <div className="font-semibold text-sm uppercase tracking-wide">{t.name || t.userId}</div>
                  {t.lastMessage && (
                    <div className="text-xs opacity-75 truncate mt-1">
                      {t.lastMessage.text}
                    </div>
                  )}
                </button>
              ))}
              {threads.length === 0 && (
                <div className="text-sm text-gray-500 text-center py-8 uppercase font-semibold">
                  NO CONVERSATIONS YET
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chat */}
        <div className="lg:col-span-3 modern-card-elevated flex flex-col animate-fade-in-up-delayed">
          <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-xl">
            <div className="font-bold text-lg uppercase tracking-wide">{active?.name || 'SELECT A CONVERSATION'}</div>
            {active?.context?.bookingId && (
              <div className="text-xs opacity-90 font-semibold mt-1">
                BOOKING: {active.context.bookingId}
              </div>
            )}
            {isOtherTyping && (
              <div className="text-xs mt-2 font-semibold animate-pulse flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                TYPING…
              </div>
            )}
          </div>
          
          <div className="flex-1 p-6 space-y-4 overflow-auto bg-gray-50" style={{ minHeight: '50vh' }}>
            {history.map((m, i) => (
              <div 
                key={i} 
                className={`max-w-[80%] px-4 py-3 rounded-2xl transition-all duration-300 hover:scale-105 ${
                  m.fromMe 
                    ? 'ml-auto bg-blue-600 text-white shadow-lg' 
                    : 'bg-white border border-gray-200 shadow-md'
                }`}
              >
                <div className="text-sm whitespace-pre-wrap font-medium">{m.text || m.message}</div>
                {Array.isArray(m.attachments) && m.attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {m.attachments.map((a, ai) => (
                      <a 
                        key={ai} 
                        href={a.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className={`block text-xs font-semibold underline hover:no-underline transition-all duration-300 ${
                          m.fromMe ? 'text-white hover:text-blue-200' : 'text-blue-700 hover:text-blue-900'
                        }`}
                      >
                        📎 {a.name || a.url}
                      </a>
                    ))}
                  </div>
                )}
                <div className="text-[10px] opacity-70 mt-2 font-semibold">
                  {m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          
          <form onSubmit={sendMessage} className="p-6 bg-white border-t border-gray-200 space-y-4">
            {files && files.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {files.map((f, idx) => (
                  <span key={idx} className="inline-flex items-center gap-2 px-3 py-2 text-xs bg-gray-100 rounded-lg border">
                    <span className="max-w-[160px] truncate font-semibold">📎 {f.name}</span>
                    <button 
                      type="button" 
                      onClick={() => removeFileAt(idx)} 
                      className="text-gray-500 hover:text-red-600 font-bold hover:scale-110 transition-all duration-300"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <input 
                value={text} 
                onChange={handleTextChange} 
                className="md:col-span-4 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300" 
                placeholder="Type your message..." 
              />
              <div className="md:col-span-1 flex items-center">
                <label className="w-full text-center bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl cursor-pointer font-semibold tracking-wide transition-all duration-300 hover:scale-105">
                  📎 ATTACH
                  <input type="file" multiple className="hidden" onChange={handleChooseFiles} />
                </label>
              </div>
              <button className="md:col-span-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-semibold tracking-wide transition-all duration-300 hover:scale-105 shadow-lg">
                SEND
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
