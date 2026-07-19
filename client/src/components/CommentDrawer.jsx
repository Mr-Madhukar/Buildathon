import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, MessageSquare, Loader2 } from 'lucide-react';

function CommentDrawer({ trip, user, fetchTripDetails, socket }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  
  const chatEndRef = useRef(null);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/trips/${trip.id}/comments`);
      setComments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [trip.id]);

  useEffect(() => {
    if (!socket) return;

    const handleNewComment = (comment) => {
      setComments((prev) => [...prev, comment]);
    };

    socket.on('new-comment', handleNewComment);

    return () => {
      socket.off('new-comment', handleNewComment);
    };
  }, [socket]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmitLoading(true);
    try {
      const res = await axios.post(`http://localhost:5000/api/trips/${trip.id}/comments`, {
        text: newComment,
      });
      setComments([...comments, res.data]);
      setNewComment('');
      if (socket) {
        socket.emit('new-comment', { tripId: trip.id, comment: res.data });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="glass-panel border border-white/5 bg-gray-900/30 flex flex-col h-[500px]">
      <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
        <MessageSquare size={16} className="text-indigo-400" />
        <h4 className="font-bold text-white text-sm">Trip Discussion</h4>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="animate-spin text-indigo-500 w-6 h-6" />
          </div>
        ) : comments.length > 0 ? (
          comments.map((comment) => {
            const isMe = comment.authorId === user.id;
            return (
              <div key={comment.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <span className="text-[10px] text-gray-500 mb-1 px-1">{comment.author?.name}</span>
                <div className={`px-4 py-2.5 rounded-2xl text-sm max-w-[80%] border ${
                  isMe 
                    ? 'bg-indigo-600/20 border-indigo-500/20 text-indigo-200 rounded-tr-none' 
                    : 'bg-white/5 border-white/10 text-gray-300 rounded-tl-none'
                }`}>
                  {comment.text}
                </div>
              </div>
            );
          })
        ) : (
          <div className="h-full flex items-center justify-center text-center text-sm text-gray-500">
            No comments yet. Start the conversation by sending a message below!
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Send Input */}
      <form onSubmit={handleSendComment} className="p-4 border-t border-white/5 bg-gray-950 flex gap-2 rounded-b-2xl">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Share your thoughts..."
          className="flex-1 px-4 py-2.5 rounded-xl bg-gray-900 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-all text-sm"
        />
        <button
          type="submit"
          disabled={submitLoading || !newComment.trim()}
          className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all disabled:opacity-50"
        >
          {submitLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <Send size={16} />}
        </button>
      </form>
    </div>
  );
}

export default CommentDrawer;
