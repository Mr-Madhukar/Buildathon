import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { Send, MessageSquare, Loader2 } from 'lucide-react';

function InlineComments({ tripId, dayNumber, activityId, user, socket }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const chatEndRef = useRef(null);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const query = dayNumber ? `dayNumber=${dayNumber}` : `activityId=${activityId}`;
      const res = await axios.get(`${API_URL}/api/trips/${tripId}/comments?${query}`);
      setComments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [tripId, dayNumber, activityId]);

  useEffect(() => {
    if (!socket) return;
    const handleNewComment = (comment) => {
      const matchesScope = dayNumber 
        ? comment.dayNumber === dayNumber 
        : comment.activityId === activityId;
      if (matchesScope) {
        setComments((prev) => [...prev, comment]);
      }
    };
    socket.on('new-comment', handleNewComment);
    return () => socket.off('new-comment', handleNewComment);
  }, [socket, dayNumber, activityId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmitLoading(true);
    try {
      const payload = { text: newComment };
      if (dayNumber) payload.dayNumber = dayNumber;
      if (activityId) payload.activityId = activityId;
      
      const res = await axios.post(`${API_URL}/api/trips/${tripId}/comments`, payload);
      setComments((prev) => [...prev, res.data]);
      setNewComment('');
      if (socket) {
        socket.emit('new-comment', { tripId, comment: res.data });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="mt-4 p-4 rounded-xl border border-white/5 bg-gray-950/40 relative">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 mb-3 pb-2 border-b border-white/5">
        <MessageSquare size={13} className="text-indigo-400" />
        <span>Discussion Thread</span>
      </div>

      <div className="space-y-3 max-h-40 overflow-y-auto mb-3 pr-1">
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="animate-spin text-indigo-500 w-4 h-4" /></div>
        ) : comments.length > 0 ? (
          comments.map((c) => {
            const isMe = c.authorId === user.id;
            return (
              <div key={c.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <span className="text-[9px] text-gray-500 mb-0.5 px-1">{c.author?.name}</span>
                <div className={`px-3 py-1.5 rounded-xl text-xs max-w-[85%] border ${
                  isMe 
                    ? 'bg-indigo-600/20 border-indigo-500/20 text-indigo-200 rounded-tr-none' 
                    : 'bg-white/5 border-white/10 text-gray-300 rounded-tl-none'
                }`}>
                  {c.text}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-[10px] text-gray-600 text-center py-4 select-none">No comments here yet.</div>
        )}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={handleSendComment} className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write inline comment..."
          className="flex-1 px-3 py-1.5 rounded-lg bg-gray-950 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={submitLoading || !newComment.trim()}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs disabled:opacity-50 flex items-center justify-center"
        >
          {submitLoading ? <Loader2 className="animate-spin w-3 h-3" /> : <Send size={12} />}
        </button>
      </form>
    </div>
  );
}

export default InlineComments;
