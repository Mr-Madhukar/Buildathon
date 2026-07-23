import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { API_URL } from '../config';
import { Clock, MapPin, Notebook, Key, Edit3, Trash2, FileText, ExternalLink, Image as ImageIcon, Upload, ArrowUp, ArrowDown, MessageSquare } from 'lucide-react';
import InlineComments from './InlineComments';

function ActivityCard({ activity, onEdit, onDelete, userRole, socket, tripId, index, totalCount, allDays, dayId, onReorder }) {
  const { user } = useContext(AuthContext);
  const [editingUser, setEditingUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showComments, setShowComments] = useState(false);

  // Edit fields
  const [title, setTitle] = useState(activity.title);
  const [description, setDescription] = useState(activity.description || '');
  const [time, setTime] = useState(activity.time || '');
  const [location, setLocation] = useState(activity.location || '');
  const [notes, setNotes] = useState(activity.notes || '');
  const [reservationCode, setReservationCode] = useState(activity.reservationCode || '');

  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('activityId', activity.id);
    try {
      await axios.post(`${API_URL}/api/trips/${tripId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // Refresh current details using onEdit dummy change
      await onEdit(activity.id, { title });
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const isViewer = userRole === 'viewer';

  useEffect(() => {
    if (!socket) return;

    const handleUserEditing = ({ activityId, userName }) => {
      if (activityId === activity.id) {
        setEditingUser(userName);
      }
    };

    const handleUserStopEditing = ({ activityId }) => {
      if (activityId === activity.id) {
        setEditingUser(null);
      }
    };

    socket.on('user-editing', handleUserEditing);
    socket.on('user-stop-editing', handleUserStopEditing);

    return () => {
      socket.off('user-editing', handleUserEditing);
      socket.off('user-stop-editing', handleUserStopEditing);
    };
  }, [socket, activity.id]);

  const handleMoveUp = (e) => {
    e.stopPropagation();
    if (index === 0) return;
    const currentDay = allDays?.find(d => d.id === dayId);
    if (!currentDay) return;
    const list = [...currentDay.activities];
    const temp = list[index];
    list[index] = list[index - 1];
    list[index - 1] = temp;
    
    const payload = list.map((act, idx) => ({
      id: act.id,
      dayId: currentDay.id,
      position: idx
    }));
    onReorder(payload);
  };

  const handleMoveDown = (e) => {
    e.stopPropagation();
    if (index === totalCount - 1) return;
    const currentDay = allDays?.find(d => d.id === dayId);
    if (!currentDay) return;
    const list = [...currentDay.activities];
    const temp = list[index];
    list[index] = list[index + 1];
    list[index + 1] = temp;

    const payload = list.map((act, idx) => ({
      id: act.id,
      dayId: currentDay.id,
      position: idx
    }));
    onReorder(payload);
  };

  const handleMoveToDay = (e, targetDayId) => {
    e.stopPropagation();
    if (!targetDayId || targetDayId === dayId || !allDays) return;
    
    const payload = [];
    allDays.forEach(d => {
      if (d.id === dayId) {
        const filtered = (d.activities || []).filter(a => a.id !== activity.id);
        filtered.forEach((act, idx) => {
          payload.push({ id: act.id, dayId: d.id, position: idx });
        });
      } else if (d.id === targetDayId) {
        const existing = d.activities || [];
        existing.forEach((act, idx) => {
          payload.push({ id: act.id, dayId: d.id, position: idx });
        });
        payload.push({ id: activity.id, dayId: targetDayId, position: existing.length });
      } else {
        const existing = d.activities || [];
        existing.forEach((act, idx) => {
          payload.push({ id: act.id, dayId: d.id, position: idx });
        });
      }
    });
    onReorder(payload);
  };

  const openEditModal = () => {
    if (isViewer || editingUser) return;
    setIsModalOpen(true);
    if (socket) {
      socket.emit('editing-activity', { tripId, activityId: activity.id, userName: user.name });
    }
  };

  const closeEditModal = () => {
    setIsModalOpen(false);
    if (socket) {
      socket.emit('stop-editing-activity', { tripId, activityId: activity.id });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    await onEdit(activity.id, {
      title,
      description,
      time,
      location,
      notes,
      reservationCode,
    });
    closeEditModal();
  };

  return (
    <>
      <div 
        onClick={openEditModal}
        className={`glass-panel p-5 relative overflow-hidden transition-all duration-300 ${
          editingUser 
            ? 'border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.25)]' 
            : 'border-white/5 bg-gray-900/30 hover:border-white/10 hover:bg-gray-900/50'
        } ${!isViewer && !editingUser ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {/* Editing indicator */}
        {editingUser && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-violet-600/20 border border-violet-500/30 text-[10px] text-violet-300 font-semibold tracking-wide animate-pulse flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping"></span>
            {editingUser} is editing
          </div>
        )}

        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              {time && (
                <div className="flex items-center gap-1 text-xs text-indigo-400 font-semibold bg-indigo-500/10 px-2 py-1 rounded-lg">
                  <Clock size={12} />
                  <span>{time}</span>
                </div>
              )}
              <h5 className="font-bold text-white text-base leading-tight line-clamp-1">{activity.title}</h5>
            </div>

            {activity.description && (
              <p className="text-gray-400 text-sm line-clamp-2">{activity.description}</p>
            )}

            <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1 text-xs text-gray-400">
              {activity.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin size={12} className="text-indigo-400" />
                  <span>{activity.location}</span>
                </div>
              )}
              {activity.reservationCode && (
                <div className="flex items-center gap-1.5">
                  <Key size={12} className="text-amber-400" />
                  <span>Code: {activity.reservationCode}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 mt-2 border-t border-white/5 select-none" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setShowComments(!showComments)}
                className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <MessageSquare size={13} />
                <span>{showComments ? 'Hide Comments' : 'Show Comments'}</span>
              </button>
            </div>

            {showComments && (
              <div onClick={(e) => e.stopPropagation()}>
                <InlineComments
                  tripId={tripId}
                  activityId={activity.id}
                  user={user}
                  socket={socket}
                />
              </div>
            )}

            {!isViewer && !editingUser && (
              <div className="flex items-center gap-2 pt-2 border-t border-white/5 mt-2" onClick={(e) => e.stopPropagation()}>
                <button 
                  disabled={index === 0}
                  onClick={handleMoveUp}
                  className="p-1 rounded bg-white/5 border border-white/10 hover:bg-indigo-500/20 text-gray-400 hover:text-indigo-400 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center"
                  title="Move Up"
                >
                  <ArrowUp size={12} />
                </button>
                <button 
                  disabled={index === totalCount - 1}
                  onClick={handleMoveDown}
                  className="p-1 rounded bg-white/5 border border-white/10 hover:bg-indigo-500/20 text-gray-400 hover:text-indigo-400 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center"
                  title="Move Down"
                >
                  <ArrowDown size={12} />
                </button>
                <span className="text-[10px] text-gray-500 ml-1">Move to:</span>
                <select
                  value={dayId}
                  onChange={(e) => handleMoveToDay(e, e.target.value)}
                  className="px-1.5 py-0.5 rounded bg-gray-950 border border-white/10 text-[10px] text-gray-300 focus:outline-none focus:border-indigo-500 font-semibold cursor-pointer"
                >
                  {allDays?.map(d => (
                    <option key={d.id} value={d.id}>Day {d.dayNumber}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Attachments List */}
            {activity.attachments && activity.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {activity.attachments.map((file) => (
                  <a
                    key={file.id}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-xs text-gray-300"
                  >
                    {file.fileType === 'pdf' ? <FileText size={12} className="text-red-400" /> : <ImageIcon size={12} className="text-emerald-400" />}
                    <span className="line-clamp-1 max-w-[100px]">{file.name}</span>
                    <ExternalLink size={10} className="text-gray-500" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {!isViewer && !editingUser && (
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={(e) => { e.stopPropagation(); openEditModal(); }}
                className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-indigo-500/10 hover:border-indigo-500/20 text-gray-400 hover:text-indigo-400 transition-all"
              >
                <Edit3 size={12} />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Are you sure you want to delete this activity?')) {
                    onDelete(activity.id);
                  }
                }}
                className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-rose-500/10 hover:border-rose-500/20 text-gray-400 hover:text-rose-400 transition-all"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Activity Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg glass-panel p-6 border border-white/10 relative z-10 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-6">Modify Activity</h3>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Activity Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Dinner at Beachside Grill"
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Time</label>
                  <input
                    type="text"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="e.g. 7:00 PM"
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Maui, Hawaii"
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the activity..."
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Reservation / Confirmation Code</label>
                <input
                  type="text"
                  value={reservationCode}
                  onChange={(e) => setReservationCode(e.target.value)}
                  placeholder="e.g. LH1234"
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Additional Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Internal comments or travel notes..."
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Upload Attachments (PDF/Image)</label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-white/20 hover:border-indigo-500 bg-gray-950 text-gray-400 hover:text-white cursor-pointer transition-all text-sm font-semibold">
                    <Upload size={16} />
                    <span>{uploading ? 'Uploading attachment...' : 'Choose File'}</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold shadow-lg hover:shadow-indigo-500/10 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default ActivityCard;
