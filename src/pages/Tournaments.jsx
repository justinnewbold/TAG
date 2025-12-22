import React, { useState, useEffect } from 'react';
import { 
  Trophy, Users, Calendar, Clock, ChevronRight, 
  Plus, Crown, Medal, Target, MapPin, Play,
  Lock, Globe, CheckCircle, Circle, X
} from 'lucide-react';
import { api } from '../services/api';
import { useStore } from '../store';

function Tournaments() {
  const { user } = useStore();
  const [tournaments, setTournaments] = useState([]);
  const [myTournaments, setMyTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('browse'); // browse, my, create

  // Create tournament form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTournament, setNewTournament] = useState({
    name: '',
    type: 'single-elimination',
    maxParticipants: 16,
    startsAt: '',
    prizePool: ''
  });

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const data = await api.request('/social/tournaments');
      setTournaments(data.tournaments || []);
      
      if (user) {
        const myData = await api.request('/social/tournaments/my');
        setMyTournaments(myData.tournaments || []);
      }
    } catch (err) {
      console.error('Failed to fetch tournaments:', err);
    } finally {
      setLoading(false);
    }
  };

  const createTournament = async () => {
    try {
      await api.request('/social/tournaments', {
        method: 'POST',
        body: JSON.stringify(newTournament)
      });
      setShowCreateModal(false);
      fetchTournaments();
    } catch (err) {
      console.error('Failed to create tournament:', err);
      alert(err.message);
    }
  };

  const joinTournament = async (tournamentId) => {
    try {
      await api.request(`/social/tournaments/${tournamentId}/join`, {
        method: 'POST'
      });
      fetchTournaments();
    } catch (err) {
      console.error('Failed to join tournament:', err);
      alert(err.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming':
        return 'text-yellow-400 bg-yellow-400/10';
      case 'active':
        return 'text-green-400 bg-green-400/10';
      case 'completed':
        return 'text-white/40 bg-white/10';
      default:
        return 'text-white/40 bg-white/10';
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const renderTournamentCard = (tournament) => {
    const isJoined = myTournaments.some(t => t.id === tournament.id);
    const isFull = tournament.participant_count >= tournament.max_participants;

    return (
      <div
        key={tournament.id}
        className="bg-dark-800 border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-colors"
      >
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(tournament.status)}`}>
                  {tournament.status}
                </span>
                <span className="text-xs text-white/40 uppercase">
                  {tournament.type?.replace('-', ' ')}
                </span>
              </div>
              <h3 className="font-bold text-white text-lg">{tournament.name}</h3>
            </div>
            <Trophy className={`w-8 h-8 ${
              tournament.status === 'active' ? 'text-yellow-400' : 'text-white/20'
            }`} />
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="flex items-center gap-2 text-sm text-white/60">
              <Users className="w-4 h-4" />
              <span>{tournament.participant_count || 0}/{tournament.max_participants}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-white/60">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(tournament.starts_at)}</span>
            </div>
          </div>

          {tournament.prize_pool && (
            <div className="mt-3 p-2 bg-yellow-400/10 rounded-lg">
              <p className="text-xs text-yellow-400/60">Prize Pool</p>
              <p className="text-yellow-400 font-bold">{tournament.prize_pool}</p>
            </div>
          )}
        </div>

        <div className="border-t border-white/10 p-3 flex gap-2">
          <button
            onClick={() => setSelectedTournament(tournament)}
            className="flex-1 py-2 bg-dark-700 text-white text-sm font-medium rounded-lg hover:bg-dark-600 transition-colors"
          >
            View Details
          </button>
          {tournament.status === 'upcoming' && !isJoined && !isFull && (
            <button
              onClick={() => joinTournament(tournament.id)}
              className="flex-1 py-2 bg-gradient-to-r from-neon-cyan to-neon-purple text-white text-sm font-bold rounded-lg"
            >
              Join
            </button>
          )}
          {isJoined && (
            <div className="flex-1 py-2 flex items-center justify-center gap-2 text-green-400 text-sm">
              <CheckCircle className="w-4 h-4" />
              Joined
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderBracket = (tournament) => {
    const bracket = tournament.bracket || {};
    const rounds = Object.keys(bracket).length;

    if (!rounds) {
      return (
        <div className="text-center py-8 text-white/40">
          <Trophy className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>Bracket not yet generated</p>
          <p className="text-sm">Tournament starts {formatDate(tournament.starts_at)}</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-6 min-w-max">
          {Object.entries(bracket).map(([roundName, matches], roundIndex) => (
            <div key={roundName} className="flex flex-col gap-4">
              <h4 className="text-sm font-medium text-white/60 text-center">
                {roundName}
              </h4>
              <div className="flex flex-col gap-4 justify-center" style={{
                marginTop: roundIndex > 0 ? `${Math.pow(2, roundIndex) * 24}px` : 0
              }}>
                {matches.map((match, matchIndex) => (
                  <div
                    key={matchIndex}
                    className="bg-dark-700 rounded-lg overflow-hidden w-48"
                  >
                    <div className={`flex items-center justify-between p-3 border-b border-white/10 ${
                      match.winner === match.player1?.id ? 'bg-green-500/10' : ''
                    }`}>
                      <span className="text-white truncate">
                        {match.player1?.name || 'TBD'}
                      </span>
                      <span className="text-white/60 font-mono">
                        {match.score1 ?? '-'}
                      </span>
                    </div>
                    <div className={`flex items-center justify-between p-3 ${
                      match.winner === match.player2?.id ? 'bg-green-500/10' : ''
                    }`}>
                      <span className="text-white truncate">
                        {match.player2?.name || 'TBD'}
                      </span>
                      <span className="text-white/60 font-mono">
                        {match.score2 ?? '-'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-dark-900 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-dark-800 to-dark-900 p-6 border-b border-white/10">
        <h1 className="text-2xl font-bold text-white mb-2">Tournaments</h1>
        <p className="text-white/60 text-sm">Compete in organized competitions</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setView('browse')}
          className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
            view === 'browse'
              ? 'text-neon-cyan border-b-2 border-neon-cyan'
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          Browse
        </button>
        <button
          onClick={() => setView('my')}
          className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
            view === 'my'
              ? 'text-neon-cyan border-b-2 border-neon-cyan'
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          My Tournaments
        </button>
      </div>

      {/* Create Button */}
      <div className="p-4">
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full flex items-center justify-center gap-2 p-4 bg-gradient-to-r from-neon-cyan/20 to-neon-purple/20 border border-neon-cyan/30 rounded-xl text-neon-cyan hover:from-neon-cyan/30 hover:to-neon-purple/30 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Tournament
        </button>
      </div>

      {/* Tournament List */}
      <div className="px-4 space-y-4">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-dark-800/50 rounded-xl animate-pulse" />
          ))
        ) : (
          <>
            {view === 'browse' && tournaments.length > 0 && (
              <div className="space-y-4">
                {tournaments.map(renderTournamentCard)}
              </div>
            )}
            {view === 'my' && myTournaments.length > 0 && (
              <div className="space-y-4">
                {myTournaments.map(renderTournamentCard)}
              </div>
            )}
            {((view === 'browse' && tournaments.length === 0) || 
              (view === 'my' && myTournaments.length === 0)) && (
              <div className="text-center py-12">
                <Trophy className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/40">No tournaments found</p>
                <p className="text-white/20 text-sm">
                  {view === 'browse' ? 'Create one to get started!' : 'Join a tournament to see it here'}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Tournament Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-dark-800 rounded-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-dark-800">
              <h2 className="text-lg font-bold text-white">Create Tournament</h2>
              <button onClick={() => setShowCreateModal(false)}>
                <X className="w-6 h-6 text-white/40" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm text-white/60 mb-1 block">Tournament Name</label>
                <input
                  type="text"
                  value={newTournament.name}
                  onChange={(e) => setNewTournament({ ...newTournament, name: e.target.value })}
                  placeholder="e.g., Weekly TAG Championship"
                  className="w-full p-3 bg-dark-700 border border-white/10 rounded-xl text-white placeholder:text-white/40"
                  maxLength={64}
                />
              </div>

              <div>
                <label className="text-sm text-white/60 mb-1 block">Format</label>
                <div className="grid grid-cols-2 gap-2">
                  {['single-elimination', 'double-elimination', 'round-robin', 'swiss'].map(type => (
                    <button
                      key={type}
                      onClick={() => setNewTournament({ ...newTournament, type })}
                      className={`p-3 rounded-xl border text-sm font-medium transition-colors ${
                        newTournament.type === type
                          ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan'
                          : 'bg-dark-700 border-white/10 text-white/60 hover:border-white/30'
                      }`}
                    >
                      {type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-white/60 mb-1 block">Max Participants</label>
                <div className="grid grid-cols-4 gap-2">
                  {[8, 16, 32, 64].map(num => (
                    <button
                      key={num}
                      onClick={() => setNewTournament({ ...newTournament, maxParticipants: num })}
                      className={`p-3 rounded-xl border text-sm font-medium transition-colors ${
                        newTournament.maxParticipants === num
                          ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan'
                          : 'bg-dark-700 border-white/10 text-white/60 hover:border-white/30'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-white/60 mb-1 block">Start Date & Time</label>
                <input
                  type="datetime-local"
                  value={newTournament.startsAt}
                  onChange={(e) => setNewTournament({ ...newTournament, startsAt: e.target.value })}
                  className="w-full p-3 bg-dark-700 border border-white/10 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="text-sm text-white/60 mb-1 block">Prize Pool (optional)</label>
                <input
                  type="text"
                  value={newTournament.prizePool}
                  onChange={(e) => setNewTournament({ ...newTournament, prizePool: e.target.value })}
                  placeholder="e.g., 1000 XP + Custom Badge"
                  className="w-full p-3 bg-dark-700 border border-white/10 rounded-xl text-white placeholder:text-white/40"
                />
              </div>
            </div>
            <div className="p-4 border-t border-white/10">
              <button
                onClick={createTournament}
                disabled={!newTournament.name || !newTournament.startsAt}
                className="w-full py-3 bg-gradient-to-r from-neon-cyan to-neon-purple text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Tournament
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tournament Details Modal */}
      {selectedTournament && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-dark-800 rounded-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-dark-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(selectedTournament.status)}`}>
                    {selectedTournament.status}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white">{selectedTournament.name}</h2>
              </div>
              <button onClick={() => setSelectedTournament(null)}>
                <X className="w-6 h-6 text-white/40" />
              </button>
            </div>

            <div className="p-4 border-b border-white/10">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">
                    {selectedTournament.participant_count || 0}/{selectedTournament.max_participants}
                  </p>
                  <p className="text-xs text-white/40">Players</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-neon-cyan">
                    {selectedTournament.type?.split('-').map(w => w.charAt(0).toUpperCase()).join('')}
                  </p>
                  <p className="text-xs text-white/40">Format</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-neon-purple">
                    {selectedTournament.current_round || 0}
                  </p>
                  <p className="text-xs text-white/40">Current Round</p>
                </div>
              </div>
            </div>

            <div className="p-4">
              <h3 className="font-bold text-white mb-4">Bracket</h3>
              {renderBracket(selectedTournament)}
            </div>

            {selectedTournament.participants && selectedTournament.participants.length > 0 && (
              <div className="p-4 border-t border-white/10">
                <h3 className="font-bold text-white mb-4">Participants</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {selectedTournament.participants.map(p => (
                    <div key={p.id} className="flex items-center gap-2 p-2 bg-dark-700 rounded-lg">
                      <div className="w-8 h-8 bg-dark-600 rounded-full flex items-center justify-center text-lg">
                        {p.avatar || '😀'}
                      </div>
                      <span className="text-sm text-white truncate">{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Tournaments;
