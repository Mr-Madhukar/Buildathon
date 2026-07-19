import React, { useState, useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import { LogOut, MapPin, Calendar, Users, Eye, EyeOff, Loader2 } from 'lucide-react';

function App() {
  const { user, loading, login, register, logout } = useContext(AuthContext);
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

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
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-gray-900/60 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
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

  // Dashboard Hub (Placeholder until Task 5)
  return (
    <div className="min-h-screen bg-gray-950 text-white font-outfit p-8 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-950/20 to-transparent pointer-events-none"></div>

      <header className="max-w-6xl mx-auto flex items-center justify-between mb-12 relative z-10">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            Voyager
          </h1>
          <p className="text-gray-400 text-sm mt-1">Logged in as {user.name}</p>
        </div>
        <button
          onClick={logout}
          className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center gap-2 text-sm text-gray-300 hover:text-white"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </header>

      <main className="max-w-6xl mx-auto relative z-10">
        <div className="glass-panel p-12 text-center border border-white/10 max-w-2xl mx-auto mt-16">
          <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-6 text-indigo-400">
            <MapPin size={32} />
          </div>
          <h2 className="text-2xl font-bold mb-3">No Journeys Plotted Yet</h2>
          <p className="text-gray-400 text-sm mb-8 max-w-md mx-auto">
            Create a trip and invite your companions to build day-wise itineraries, split budgets, and coordinate check-in lists together in real time.
          </p>
          <button className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 font-semibold shadow-lg hover:shadow-indigo-500/10 transition-all text-sm">
            Craft New Journey
          </button>
        </div>
      </main>
    </div>
  );
}

export default App;
