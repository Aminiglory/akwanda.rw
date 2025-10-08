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

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Threads */}
      <div className="bg-white rounded-lg shadow p-3">
        <div className="text-lg font-semibold mb-2">Conversations</div>
        {loading ? <div>Loading...</div> : (
          <div className="space-y-2 max-h-[70vh] overflow-auto">
            {threads.map(t => (
              <button key={t.id || t.userId} onClick={() => openChat(t)} className={`w-full text-left px-3 py-2 rounded ${active?.userId === t.userId ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                <div className="font-medium">{t.name || t.userId}</div>
                {t.lastMessage && <div className="text-xs text-gray-600 truncate">{t.lastMessage.text}</div>}
              </button>
            ))}
            {threads.length === 0 && <div className="text-sm text-gray-500">No conversations yet</div>}
          </div>
        )}
      </div>

      {/* Chat */}
      <div className="md:col-span-2 bg-white rounded-lg shadow flex flex-col overflow-y-scroll">
        <div className="px-4 py-3 border-b">
          <div className="font-semibold">{active?.name || 'Select a conversation'}</div>
          {active?.context?.bookingId && <div className="text-xs text-gray-600">Booking: {active.context.bookingId}</div>}
        </div>
        <div className="flex-1 p-4 space-y-2 overflow-auto" style={{ minHeight: '50vh' }}>
          {history.map((m, i) => (
            <div key={i} className={`max-w-[80%] px-3 py-2 rounded ${m.fromMe ? 'ml-auto bg-blue-600 text-white' : 'bg-gray-100'}`}>
              <div className="text-sm whitespace-pre-wrap">{m.text || m.message}</div>
              {Array.isArray(m.attachments) && m.attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {m.attachments.map((a, ai) => (
                    <a key={ai} href={a.url} target="_blank" rel="noreferrer" className={`block text-xs underline ${m.fromMe ? 'text-white' : 'text-blue-700'}`}>{a.name || a.url}</a>
                  ))}
                </div>
              )}
              <div className="text-[10px] opacity-70 mt-1">{m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}</div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={sendMessage} className="p-3 border-t grid grid-cols-1 md:grid-cols-6 gap-2">
          <input value={text} onChange={e => setText(e.target.value)} className="md:col-span-4 px-3 py-2 border rounded" placeholder="Type a message" />
          <input type="file" multiple onChange={e => setFiles(e.target.files)} className="md:col-span-1 px-3 py-2 border rounded" />
          <button className="md:col-span-1 px-4 py-2 bg-blue-600 text-white rounded">Send</button>
        </form>
      </div>
    </div>
  );
}
