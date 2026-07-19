import React from 'react';
import { Calendar, Users, ChevronRight, Trash2 } from 'lucide-react';

function TripCard({ trip, onSelect, onDelete, userId }) {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isOwner = trip.ownerId === userId;

  return (
    <div 
      onClick={() => onSelect(trip.id)}
      className="glass-panel glass-panel-hover p-6 cursor-pointer relative overflow-hidden group flex flex-col justify-between h-48 border border-white/5 bg-gray-900/40"
    >
      {/* Decorative gradient overlay */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all"></div>

      <div>
        <div className="flex justify-between items-start gap-4 mb-2">
          <h3 className="text-xl font-bold tracking-tight text-white group-hover:text-indigo-400 transition-colors line-clamp-1">
            {trip.title}
          </h3>
          {isOwner && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Are you sure you want to delete this trip?')) {
                  onDelete(trip.id);
                }
              }}
              className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-rose-500/10 hover:border-rose-500/20 text-gray-400 hover:text-rose-400 transition-all"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
        <p className="text-gray-400 text-sm line-clamp-2 mb-4">
          {trip.description || 'No description provided.'}
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-white/5 pt-4 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-indigo-400" />
          <span>{formatDate(trip.startDate)} - {formatDate(trip.endDate)}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Users size={14} className="text-violet-400" />
            <span>{trip.members?.length || 1}</span>
          </div>
          <ChevronRight size={16} className="text-gray-500 group-hover:text-white transition-colors" />
        </div>
      </div>
    </div>
  );
}

export default TripCard;
