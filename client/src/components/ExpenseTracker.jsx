import React, { useState } from 'react';
import axios from 'axios';
import { Plus, DollarSign, Wallet, ArrowUpRight, TrendingUp, Loader2 } from 'lucide-react';

function ExpenseTracker({ trip, userRole, fetchTripDetails, socket }) {
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Other');
  const [loading, setLoading] = useState(false);

  const isViewer = userRole === 'viewer';

  // Calculate totals
  const totalSpent = trip.expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!desc.trim() || !amount) return;
    setLoading(true);
    try {
      await axios.post(`http://localhost:5000/api/trips/${trip.id}/expenses`, {
        description: desc,
        amount: parseFloat(amount),
        category,
      });
      setDesc('');
      setAmount('');
      setCategory('Other');
      await fetchTripDetails(trip.id);
      if (socket) socket.emit('trip-updated', { tripId: trip.id });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (cat) => {
    switch (cat) {
      case 'Transport': return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'Accommodation': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Food': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Activities': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Shopping': return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <div className="space-y-8">
      {/* Spent Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 border border-white/5 bg-gray-900/20 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <Wallet size={24} />
          </div>
          <div>
            <span className="text-xs text-gray-400 block uppercase tracking-wider font-semibold">Total Spent</span>
            <span className="text-3xl font-bold text-white mt-1 block">${totalSpent.toFixed(2)}</span>
          </div>
        </div>

        <div className="glass-panel p-6 border border-white/5 bg-gray-900/20 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-400">
            <TrendingUp size={24} />
          </div>
          <div>
            <span className="text-xs text-gray-400 block uppercase tracking-wider font-semibold">Average Expense</span>
            <span className="text-3xl font-bold text-white mt-1 block">
              ${trip.expenses?.length ? (totalSpent / trip.expenses.length).toFixed(2) : '0.00'}
            </span>
          </div>
        </div>
      </div>

      {/* Add Expense and Logs split view */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form panel */}
        {!isViewer && (
          <div className="lg:col-span-1 glass-panel p-6 border border-white/5 bg-gray-900/20 self-start">
            <h4 className="font-bold text-white text-base mb-6 flex items-center gap-2">
              <DollarSign size={18} className="text-indigo-400" />
              Log Expense
            </h4>

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Description</label>
                <input
                  type="text"
                  required
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="e.g. Uber to hotel"
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-950 border border-white/10 text-white focus:outline-none focus:border-indigo-500 transition-all text-sm"
                >
                  <option value="Transport">Transport</option>
                  <option value="Accommodation">Accommodation</option>
                  <option value="Food">Food</option>
                  <option value="Activities">Activities</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm transition-all flex items-center justify-center gap-1.5 shadow-lg hover:shadow-indigo-500/10 disabled:opacity-50"
              >
                {loading && <Loader2 className="animate-spin w-4 h-4" />}
                Log Transaction
              </button>
            </form>
          </div>
        )}

        {/* Logs List panel */}
        <div className={`lg:col-span-${isViewer ? '3' : '2'} glass-panel p-6 border border-white/5 bg-gray-900/30 flex flex-col`}>
          <h4 className="font-bold text-white text-base mb-6">Expense Ledger</h4>
          
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {trip.expenses && trip.expenses.length > 0 ? (
              trip.expenses.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-bold text-white">
                      ${exp.amount.toFixed(0)}
                    </div>
                    <div>
                      <h5 className="font-bold text-white text-sm">{exp.description}</h5>
                      <span className="text-[10px] text-gray-500 mt-0.5 block">
                        Paid by {exp.paidBy?.name} on {new Date(exp.date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className={`text-xs px-2.5 py-1 rounded-lg font-semibold border ${getCategoryColor(exp.category)}`}>
                    {exp.category}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-sm text-gray-500">
                No expense transactions logged for this trip yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExpenseTracker;
