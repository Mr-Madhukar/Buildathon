import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import socket from './utils/socket';
import axios from 'axios';
import { API_URL } from './config';
import { LogOut, MapPin, Calendar, Users, ChevronRight, Plus, Loader2, ArrowLeft, Send, CheckSquare, DollarSign, MessageSquare, PlusCircle, Check } from 'lucide-react';
import TripCard from './components/TripCard';
import ItineraryDay from './components/ItineraryDay';
import ChecklistSection from './components/ChecklistSection';
import ExpenseTracker from './components/ExpenseTracker';
import CommentDrawer from './components/CommentDrawer';

function App() {
  const { user, token, loading, login, register, logout } = useContext(AuthContext);
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Auth Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Trips lists
  const [trips, setTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [tripDetailLoading, setTripDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('itinerary'); // 'itinerary' | 'checklist' | 'budget' | 'comments'
  const [onlineUsers, setOnlineUsers] = useState([]);

  // Create Trip modal fields
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [tripTitle, setTripTitle] = useState('');
  const [tripDesc, setTripDesc] = useState('');
  const [tripStart, setTripStart] = useState('');
  const [tripEnd, setTripEnd] = useState('');

  // Add Activity modal fields
  const [isAddActivityOpen, setIsAddActivityOpen] = useState(false);
  const [activityDayId, setActivityDayId] = useState('');
  const [activityDayNum, setActivityDayNum] = useState(1);
  const [actTitle, setActTitle] = useState('');
  const [actDesc, setActDesc] = useState('');
  const [actTime, setActTime] = useState('');
  const [actLoc, setActLoc] = useState('');
  const [actNotes, setActNotes] = useState('');
  const [actCode, setActCode] = useState('');

  // Invite Collaborator fields
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  // Fetch Trips
  const fetchTrips = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/trips`);
      setTrips(res.data);
    } catch {
      setError('Failed to fetch trips');
    } finally {
      setTripsLoading(false);
    }
  };

  useEffect(() => {
    if (user && token) {
      fetchTrips();
    }
  }, [user, token]);

  // Fetch Trip Details
  const fetchTripDetails = async (id) => {
    setTripDetailLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/trips/${id}`);
      setSelectedTrip(res.data);
    } catch {
      setError('Failed to load trip details');
      setSelectedTripId(null);
    } finally {
      setTripDetailLoading(false);
    }
  };

  // Socket triggers
  useEffect(() => {
    if (!selectedTripId || !user) return;

    socket.connect();
    socket.emit('join-trip', { tripId: selectedTripId, user: { id: user.id, name: user.name } });

    const handlePresenceUpdate = (users) => {
      setOnlineUsers(users);
    };

    const handleTripBroadcastUpdate = () => {
      // Refresh current details
      fetchTripDetails(selectedTripId);
    };

    socket.on('presence-update', handlePresenceUpdate);
    socket.on('trip-updated', handleTripBroadcastUpdate);

    return () => {
      socket.emit('leave-trip', { tripId: selectedTripId, userId: user.id });
      socket.off('presence-update', handlePresenceUpdate);
      socket.off('trip-updated', handleTripBroadcastUpdate);
      socket.disconnect();
    };
  }, [selectedTripId, user]);

  const handleTripSelect = (id) => {
    setSelectedTripId(id);
    fetchTripDetails(id);
  };

  const handleBackToDashboard = () => {
    setSelectedTripId(null);
    setSelectedTrip(null);
    setActiveTab('itinerary');
    fetchTrips();
  };

  const handleCreateTrip = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/api/trips`, {
        title: tripTitle,
        description: tripDesc,
        startDate: tripStart,
        endDate: tripEnd,
      });
      setTrips([res.data, ...trips]);
      setIsCreateModalOpen(false);
      setTripTitle('');
      setTripDesc('');
      setTripStart('');
      setTripEnd('');
    } catch {
      setError('Failed to create trip');
    }
  };

  const handleDeleteTrip = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/trips/${id}`);
      setTrips(trips.filter(t => t.id !== id));
    } catch {
      setError('Failed to delete trip');
    }
  };

  const handleAddActivity = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/trips/${selectedTripId}/itinerary/activities`, {
        dayId: activityDayId,
        title: actTitle,
        description: actDesc,
        time: actTime,
        location: actLoc,
        notes: actNotes,
        reservationCode: actCode,
      });
      setIsAddActivityOpen(false);
      setActTitle('');
      setActDesc('');
      setActTime('');
      setActLoc('');
      setActNotes('');
      setActCode('');
      
      // Reload & broadcast
      await fetchTripDetails(selectedTripId);
      socket.emit('trip-updated', { tripId: selectedTripId });
    } catch {
      setError('Failed to add activity');
    }
  };

  const handleEditActivity = async (activityId, updatedFields) => {
    try {
      await axios.put(`${API_URL}/api/trips/${selectedTripId}/itinerary/activities/${activityId}`, updatedFields);
      await fetchTripDetails(selectedTripId);
      socket.emit('trip-updated', { tripId: selectedTripId });
    } catch {
      setError('Failed to edit activity');
    }
  };

  const handleDeleteActivity = async (activityId) => {
    try {
      await axios.delete(`${API_URL}/api/trips/${selectedTripId}/itinerary/activities/${activityId}`);
      await fetchTripDetails(selectedTripId);
      socket.emit('trip-updated', { tripId: selectedTripId });
    } catch {
      setError('Failed to delete activity');
    }
  };

  const handleReorderActivities = async (updatedActivities) => {
    try {
      await axios.put(`${API_URL}/api/trips/${selectedTripId}/itinerary/reorder`, {
        activities: updatedActivities
      });
      await fetchTripDetails(selectedTripId);
      socket.emit('trip-updated', { tripId: selectedTripId });
    } catch {
      setError('Failed to reorder activities');
    }
  };

  const handleInviteCollaborator = async (e) => {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess('');
    try {
      await axios.post(`${API_URL}/api/trips/${selectedTripId}/members`, {
        email: inviteEmail,
        role: inviteRole,
      });
      setInviteSuccess('Collaborator added successfully!');
      setInviteEmail('');
      await fetchTripDetails(selectedTripId);
    } catch (err) {
      setInviteError(err.response?.data?.message || 'Failed to add collaborator');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFormLoading(true);
    try {
      if (isRegister) {
        if (!name) throw new Error('Name is required');
        await register(name, email, password);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Authentication failed');
    } finally {
      setFormLoading(false);
    }
  };

  const getUserRole = () => {
    if (!selectedTrip || !user) return 'viewer';
    if (selectedTrip.ownerId === user.id) return 'owner';
    const member = selectedTrip.members?.find(m => m.userId === user.id);
    return member ? member.role : 'viewer';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white font-outfit">
        <Loader2 className="animate-spin text-indigo-500 w-10 h-10" />
      </div>
    );
  }

  // Auth Portal View
  if (!user) {
    return (
      <div className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden bg-gray-950 font-outfit">
        {/* Decorative blur blobs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-indigo-600/10 blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-violet-600/10 blur-3xl animate-pulse delay-700"></div>

        <div className="w-full max-w-md glass-panel p-8 relative z-10 border border-white/10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Voyager
            </h1>
            <p className="text-gray-400 mt-2 text-sm">
              {isRegister ? 'Begin crafting your shared journeys' : 'Rejoin your collaborative itineraries'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegister && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 rounded-xl bg-gray-900/60 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl bg-gray-900/60 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-gray-900/60 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={formLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold transition-all shadow-lg hover:shadow-indigo-500/20 flex items-center justify-center gap-2 text-sm mt-2 disabled:opacity-50"
            >
              {formLoading && <Loader2 className="animate-spin w-4 h-4" />}
              {isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-400">
              {isRegister ? 'Already have an account? ' : "New to Voyager? "}
            </span>
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
              className="text-indigo-400 hover:text-indigo-300 font-semibold underline transition-all"
            >
              {isRegister ? 'Sign In' : 'Create one now'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Trip Workspace View
  if (selectedTripId) {
    const userRole = getUserRole();
    const isViewer = userRole === 'viewer';

    return (
      <div className="min-h-screen bg-gray-950 text-white font-outfit p-8 relative overflow-hidden flex flex-col">
        {/* Workspace background glow */}
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-900/10 to-transparent pointer-events-none"></div>

        {/* Header */}
        <header className="max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-white/5 pb-6 relative z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToDashboard}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              {selectedTrip ? (
                <>
                  <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                    {selectedTrip.title}
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 capitalize">
                      {userRole}
                    </span>
                  </h1>
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                    <Calendar size={12} />
                    {new Date(selectedTrip.startDate).toLocaleDateString()} - {new Date(selectedTrip.endDate).toLocaleDateString()}
                  </p>
                </>
              ) : (
                <div className="h-6 w-48 bg-white/5 animate-pulse rounded"></div>
              )}
            </div>
          </div>

          {/* Sockets Active Presence row */}
          <div className="flex items-center gap-4">
            {onlineUsers.length > 0 && (
              <div className="flex items-center gap-1 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block mr-1.5 animate-pulse"></span>
                <span className="text-gray-400 mr-2">Online:</span>
                <div className="flex -space-x-1.5">
                  {onlineUsers.map((ou, idx) => (
                    <div 
                      key={ou.id || idx} 
                      title={ou.name}
                      className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-[10px] font-bold border border-gray-950 select-none cursor-help"
                    >
                      {ou.name.charAt(0)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Workspace Hub Panel layout */}
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-4 gap-8 flex-1 relative z-10">
          {/* Left panel switcher */}
          <div className="lg:col-span-1 space-y-2">
            <button
              onClick={() => setActiveTab('itinerary')}
              className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-semibold transition-all border ${
                activeTab === 'itinerary' 
                  ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-400' 
                  : 'bg-white/5 border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Calendar size={18} />
              Itinerary
            </button>
            <button
              onClick={() => setActiveTab('checklist')}
              className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-semibold transition-all border ${
                activeTab === 'checklist' 
                  ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-400' 
                  : 'bg-white/5 border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <CheckSquare size={18} />
              Checklists
            </button>
            <button
              onClick={() => setActiveTab('budget')}
              className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-semibold transition-all border ${
                activeTab === 'budget' 
                  ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-400' 
                  : 'bg-white/5 border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <DollarSign size={18} />
              Budget & Expenses
            </button>
            <button
              onClick={() => setActiveTab('comments')}
              className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-semibold transition-all border ${
                activeTab === 'comments' 
                  ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-400' 
                  : 'bg-white/5 border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <MessageSquare size={18} />
              Comments Thread
            </button>

            {/* Invite Members Box */}
            {userRole === 'owner' && (
              <div className="glass-panel p-4 border border-white/5 bg-gray-900/20 mt-6">
                <h5 className="font-bold text-sm mb-3">Invite Companions</h5>
                <form onSubmit={handleInviteCollaborator} className="space-y-3">
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="companion@email.com"
                    className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-all text-xs"
                  />
                  <div className="flex gap-2">
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-gray-950 border border-white/10 text-white focus:outline-none focus:border-indigo-500 text-xs"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                    </select>
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all flex items-center gap-1"
                    >
                      Invite
                    </button>
                  </div>
                  {inviteError && <div className="text-[10px] text-rose-400 mt-1">{inviteError}</div>}
                  {inviteSuccess && <div className="text-[10px] text-emerald-400 mt-1">{inviteSuccess}</div>}
                </form>
              </div>
            )}
          </div>

          {/* Main workspace container */}
          <div className="lg:col-span-3">
            {tripDetailLoading ? (
              <div className="h-64 flex items-center justify-center">
                <Loader2 className="animate-spin text-indigo-500 w-8 h-8" />
              </div>
            ) : selectedTrip ? (
              <>
                {activeTab === 'itinerary' && (
                  <div className="space-y-6">
                    {selectedTrip.itinerary && selectedTrip.itinerary.length > 0 ? (
                      selectedTrip.itinerary.map((day) => (
                        <ItineraryDay
                          key={day.id}
                          day={day}
                          onAddActivity={(dayId, dayNum) => {
                            setActivityDayId(dayId);
                            setActivityDayNum(dayNum);
                            setIsAddActivityOpen(true);
                          }}
                          onEditActivity={handleEditActivity}
                          onDeleteActivity={handleDeleteActivity}
                          userRole={userRole}
                          socket={socket}
                          tripId={selectedTripId}
                          allDays={selectedTrip.itinerary}
                          onReorderActivities={handleReorderActivities}
                          user={user}
                        />
                      ))
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        No days logged in the itinerary.
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'checklist' && (
                  <ChecklistSection
                    trip={selectedTrip}
                    userRole={userRole}
                    fetchTripDetails={() => fetchTripDetails(selectedTripId)}
                    socket={socket}
                  />
                )}

                {activeTab === 'budget' && (
                  <ExpenseTracker
                    trip={selectedTrip}
                    userRole={userRole}
                    fetchTripDetails={() => fetchTripDetails(selectedTripId)}
                    socket={socket}
                  />
                )}

                {activeTab === 'comments' && (
                  <CommentDrawer
                    trip={selectedTrip}
                    user={user}
                    fetchTripDetails={() => fetchTripDetails(selectedTripId)}
                    socket={socket}
                  />
                )}
              </>
            ) : null}
          </div>
        </div>

        {/* Add Activity Modal */}
        {isAddActivityOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-lg glass-panel p-6 border border-white/10 relative z-10 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-white mb-6">Add Itinerary Activity (Day {activityDayNum})</h3>
              
              <form onSubmit={handleAddActivity} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Activity Title *</label>
                  <input
                    type="text"
                    required
                    value={actTitle}
                    onChange={(e) => setActTitle(e.target.value)}
                    placeholder="e.g. Flight to Oahu"
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Time</label>
                    <input
                      type="text"
                      value={actTime}
                      onChange={(e) => setActTime(e.target.value)}
                      placeholder="e.g. 10:00 AM"
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Location</label>
                    <input
                      type="text"
                      value={actLoc}
                      onChange={(e) => setActLoc(e.target.value)}
                      placeholder="e.g. Airport terminal"
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Description</label>
                  <textarea
                    value={actDesc}
                    onChange={(e) => setActDesc(e.target.value)}
                    placeholder="Brief description..."
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Reservation Code</label>
                  <input
                    type="text"
                    value={actCode}
                    onChange={(e) => setActCode(e.target.value)}
                    placeholder="e.g. Booking serial, ticket code"
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Internal Travel Notes</label>
                  <textarea
                    value={actNotes}
                    onChange={(e) => setActNotes(e.target.value)}
                    placeholder="Notes for the team..."
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsAddActivityOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 text-sm font-semibold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold shadow-lg hover:shadow-indigo-500/10 transition-all"
                  >
                    Create Activity
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Dashboard Hub View
  return (
    <div className="min-h-screen bg-gray-950 text-white font-outfit p-8 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-950/20 to-transparent pointer-events-none"></div>

      <header className="max-w-6xl mx-auto flex items-center justify-between mb-12 relative z-10">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            Voyager
          </h1>
          <p className="text-gray-400 text-xs mt-1">Logged in as {user.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 font-semibold shadow-lg hover:shadow-indigo-500/10 transition-all text-sm flex items-center gap-1.5"
          >
            <Plus size={16} />
            Craft New Journey
          </button>
          <button
            onClick={logout}
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center gap-2 text-sm text-gray-300 hover:text-white"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto relative z-10">
        {tripsLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="animate-spin text-indigo-500 w-8 h-8" />
          </div>
        ) : trips.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                userId={user.id}
                onSelect={handleTripSelect}
                onDelete={handleDeleteTrip}
              />
            ))}
          </div>
        ) : (
          <div className="glass-panel p-12 text-center border border-white/10 max-w-2xl mx-auto mt-16 bg-gray-900/20">
            <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-6 text-indigo-400">
              <MapPin size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-3">No Journeys Plotted Yet</h2>
            <p className="text-gray-400 text-sm mb-8 max-w-md mx-auto">
              Create a trip and invite your companions to build day-wise itineraries, split budgets, and coordinate check-in lists together in real time.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 font-semibold shadow-lg hover:shadow-indigo-500/10 transition-all text-sm"
            >
              Craft New Journey
            </button>
          </div>
        )}
      </main>

      {/* Create Trip Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md glass-panel p-6 border border-white/10 relative z-10">
            <h3 className="text-xl font-bold text-white mb-6">Craft New Journey</h3>
            
            <form onSubmit={handleCreateTrip} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Trip Title *</label>
                <input
                  type="text"
                  required
                  value={tripTitle}
                  onChange={(e) => setTripTitle(e.target.value)}
                  placeholder="e.g. Summer in Maui"
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Description</label>
                <textarea
                  value={tripDesc}
                  onChange={(e) => setTripDesc(e.target.value)}
                  placeholder="Short description of the adventure..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={tripStart}
                    onChange={(e) => setTripStart(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-white/10 text-white scheme-dark focus:outline-none focus:border-indigo-500 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">End Date *</label>
                  <input
                    type="date"
                    required
                    value={tripEnd}
                    onChange={(e) => setTripEnd(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-white/10 text-white scheme-dark focus:outline-none focus:border-indigo-500 transition-all text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold shadow-lg hover:shadow-indigo-500/10 transition-all"
                >
                  Plan Journey
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
