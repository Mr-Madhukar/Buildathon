import React, { useState } from 'react';
import { Calendar, Plus, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import ActivityCard from './ActivityCard';
import InlineComments from './InlineComments';

function ItineraryDay({ day, onAddActivity, onEditActivity, onDeleteActivity, userRole, socket, tripId, allDays, onReorderActivities, user }) {
  const [isOpen, setIsOpen] = useState(true);
  const [showComments, setShowComments] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const isViewer = userRole === 'viewer';

  return (
    <div className="glass-panel border border-white/5 bg-gray-900/20 overflow-hidden mb-4">
      {/* Header */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-white/5 transition-colors select-none"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center font-bold text-indigo-400">
            D{day.dayNumber}
          </div>
          <div>
            <h4 className="font-bold text-white text-lg">Day {day.dayNumber}</h4>
            {day.date && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                <Calendar size={12} />
                <span>{formatDate(day.date)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isViewer && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddActivity(day.id, day.dayNumber);
              }}
              className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5 text-xs transition-all"
            >
              <Plus size={14} />
              Add Activity
            </button>
          )}
          <div className="text-gray-400">
            {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>
      </div>

      {/* Activities List */}
      {isOpen && (
        <div className="px-6 pb-6 pt-2 border-t border-white/5 space-y-4">
          <div className="flex justify-between items-center bg-white/5 px-3 py-1.5 rounded-lg text-xs mt-2 select-none">
            <span className="text-gray-400 font-semibold">Day Discussion</span>
            <button
              onClick={() => setShowComments(!showComments)}
              className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition-colors"
            >
              <MessageSquare size={12} />
              <span>{showComments ? 'Hide Comments' : 'Show Comments'}</span>
            </button>
          </div>

          {showComments && (
            <InlineComments
              tripId={tripId}
              dayNumber={day.dayNumber}
              user={user}
              socket={socket}
            />
          )}

          {day.activities && day.activities.length > 0 ? (
            day.activities.map((activity, idx) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                onEdit={onEditActivity}
                onDelete={onDeleteActivity}
                userRole={userRole}
                socket={socket}
                tripId={tripId}
                index={idx}
                totalCount={day.activities.length}
                allDays={allDays}
                dayId={day.id}
                onReorder={onReorderActivities}
                user={user}
              />
            ))
          ) : (
            <div className="text-center py-6 text-sm text-gray-500">
              No activities planned for this day yet. Click "Add Activity" to plan your schedule.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ItineraryDay;
