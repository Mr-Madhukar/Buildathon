import React, { useState } from 'react';
import axios from 'axios';
import { Plus, Check, Trash2, ListTodo, CheckSquare, Loader2 } from 'lucide-react';

function ChecklistSection({ trip, userRole, fetchTripDetails, socket }) {
  const [newCategoryTitle, setNewCategoryTitle] = useState('');
  const [newItemTexts, setNewItemTexts] = useState({}); // { checklistId: text }
  const [loading, setLoading] = useState(false);

  const isViewer = userRole === 'viewer';

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryTitle.trim()) return;
    setLoading(true);
    try {
      await axios.post(`http://localhost:5000/api/trips/${trip.id}/checklists`, {
        title: newCategoryTitle,
      });
      setNewCategoryTitle('');
      await fetchTripDetails(trip.id);
      if (socket) socket.emit('trip-updated', { tripId: trip.id });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e, checklistId) => {
    e.preventDefault();
    const text = newItemTexts[checklistId];
    if (!text || !text.trim()) return;
    try {
      await axios.post(`http://localhost:5000/api/trips/${trip.id}/checklists/${checklistId}/items`, {
        text,
      });
      setNewItemTexts({ ...newItemTexts, [checklistId]: '' });
      await fetchTripDetails(trip.id);
      if (socket) socket.emit('trip-updated', { tripId: trip.id });
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleItem = async (checklistId, itemId, currentCompleted) => {
    try {
      await axios.put(`http://localhost:5000/api/trips/${trip.id}/checklists/${checklistId}/items/${itemId}`, {
        completed: !currentCompleted,
      });
      await fetchTripDetails(trip.id);
      if (socket) socket.emit('trip-updated', { tripId: trip.id });
    } catch (err) {
      console.error(err);
    }
  };

  const calculateProgress = (items) => {
    if (!items || items.length === 0) return 0;
    const completed = items.filter((i) => i.completed).length;
    return Math.round((completed / items.length) * 100);
  };

  return (
    <div className="space-y-8">
      {/* Create Category Block */}
      {!isViewer && (
        <form onSubmit={handleAddCategory} className="glass-panel p-6 border border-white/5 bg-gray-900/20 flex gap-4 items-center">
          <ListTodo className="text-indigo-400" size={24} />
          <div className="flex-1">
            <h4 className="font-bold text-sm text-white mb-1">Create Checklist Category</h4>
            <input
              type="text"
              required
              value={newCategoryTitle}
              onChange={(e) => setNewCategoryTitle(e.target.value)}
              placeholder="e.g. Packing Essentials, Documents Checklist"
              className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-all text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all flex items-center gap-1.5 self-end"
          >
            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Plus size={16} />}
            Create
          </button>
        </form>
      )}

      {/* Render Checklists */}
      {trip.checklists && trip.checklists.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {trip.checklists.map((list) => {
            const progress = calculateProgress(list.items);
            return (
              <div key={list.id} className="glass-panel p-6 border border-white/5 bg-gray-900/30 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h5 className="font-bold text-white text-base flex items-center gap-2">
                      <CheckSquare size={16} className="text-indigo-400" />
                      {list.title}
                    </h5>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold">
                      {progress}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-white/5 rounded-full h-1.5 mb-6 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-indigo-500 to-violet-500 h-1.5 rounded-full transition-all duration-500" 
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>

                  {/* Checklist Items list */}
                  <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
                    {list.items && list.items.length > 0 ? (
                      list.items.map((item) => (
                        <div 
                          key={item.id}
                          onClick={() => handleToggleItem(list.id, item.id, item.completed)}
                          className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-all cursor-pointer group"
                        >
                          <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-all ${
                            item.completed 
                              ? 'bg-emerald-600 border-emerald-500 text-white' 
                              : 'border-white/20 group-hover:border-indigo-500'
                          }`}>
                            {item.completed && <Check size={10} strokeWidth={3} />}
                          </div>
                          <div className="flex-1">
                            <span className={`text-sm transition-all ${item.completed ? 'line-through text-gray-500' : 'text-gray-300'}`}>
                              {item.text}
                            </span>
                            {item.completed && item.completedBy && (
                              <span className="text-[10px] text-gray-500 block mt-0.5 select-none">
                                Completed by {item.completedBy.name}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-xs text-gray-500">
                        No checklist items logged.
                      </div>
                    )}
                  </div>
                </div>

                {/* Add Item form */}
                {!isViewer && (
                  <form 
                    onSubmit={(e) => handleAddItem(e, list.id)} 
                    className="flex gap-2 border-t border-white/5 pt-4 mt-auto"
                  >
                    <input
                      type="text"
                      required
                      value={newItemTexts[list.id] || ''}
                      onChange={(e) => setNewItemTexts({ ...newItemTexts, [list.id]: e.target.value })}
                      placeholder="Add task item..."
                      className="flex-1 px-3 py-1.5 rounded-lg bg-gray-950 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-all text-xs"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white text-indigo-400 text-xs font-semibold transition-all"
                    >
                      Add
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-panel p-12 text-center border border-white/5 bg-gray-900/10">
          <p className="text-gray-400 text-sm">No checklist categories created yet.</p>
        </div>
      )}
    </div>
  );
}

export default ChecklistSection;
