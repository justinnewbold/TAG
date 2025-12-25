import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, MapPin, Users, Bell, Trash2 } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 mb-8">
          <ArrowLeft size={20} />
          Back to Game
        </Link>

        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          Privacy Policy
        </h1>

        <div className="prose prose-invert prose-indigo max-w-none space-y-6">
          <p className="text-slate-300">Last updated: December 2025</p>

          <div className="grid gap-4 md:grid-cols-2 my-8">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <Shield className="w-8 h-8 text-green-400 mb-2" />
              <h3 className="font-semibold text-white">Your Data is Protected</h3>
              <p className="text-sm text-slate-400">We use encryption and secure servers</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <MapPin className="w-8 h-8 text-indigo-400 mb-2" />
              <h3 className="font-semibold text-white">Location Only When Playing</h3>
              <p className="text-sm text-slate-400">GPS data is only shared during active games</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <Users className="w-8 h-8 text-purple-400 mb-2" />
              <h3 className="font-semibold text-white">Shared With Friends Only</h3>
              <p className="text-sm text-slate-400">Your location is only visible to game participants</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <Trash2 className="w-8 h-8 text-red-400 mb-2" />
              <h3 className="font-semibold text-white">Delete Anytime</h3>
              <p className="text-sm text-slate-400">Request complete data deletion at any time</p>
            </div>
          </div>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">1. Information We Collect</h2>
            
            <h3 className="text-xl font-medium text-indigo-300 mt-6 mb-3">Account Information</h3>
            <ul className="list-disc pl-6 text-slate-300 space-y-2">
              <li>Username and display name</li>
              <li>Email address (for account recovery)</li>
              <li>Profile avatar (optional)</li>
            </ul>

            <h3 className="text-xl font-medium text-indigo-300 mt-6 mb-3">Location Data</h3>
            <ul className="list-disc pl-6 text-slate-300 space-y-2">
              <li>GPS coordinates during active game sessions</li>
              <li>Location is only collected while you are actively playing a game</li>
              <li>Location data is not stored permanently and is deleted after games end</li>
            </ul>

            <h3 className="text-xl font-medium text-indigo-300 mt-6 mb-3">Game Statistics</h3>
            <ul className="list-disc pl-6 text-slate-300 space-y-2">
              <li>Games played, wins, and achievements</li>
              <li>Tag counts and survival times</li>
              <li>Leaderboard rankings</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">2. How We Use Your Information</h2>
            <ul className="list-disc pl-6 text-slate-300 space-y-2">
              <li>Enable real-time gameplay with other players</li>
              <li>Display your position on the game map to other players in your session</li>
              <li>Calculate distances for tagging mechanics</li>
              <li>Track achievements and leaderboard standings</li>
              <li>Send game notifications (if enabled)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">3. Data Sharing</h2>
            <p className="text-slate-300">
              We do <strong>not</strong> sell your personal information. Your location is only shared with:
            </p>
            <ul className="list-disc pl-6 text-slate-300 space-y-2 mt-4">
              <li>Other players in your current active game session</li>
              <li>No third-party advertising networks</li>
              <li>No data brokers or marketing companies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">4. Data Retention</h2>
            <ul className="list-disc pl-6 text-slate-300 space-y-2">
              <li>Real-time location data is deleted immediately after a game ends</li>
              <li>Account information is retained while your account is active</li>
              <li>Game statistics are retained for leaderboard purposes</li>
              <li>You can request complete data deletion at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">5. Your Rights</h2>
            <ul className="list-disc pl-6 text-slate-300 space-y-2">
              <li><strong>Access:</strong> Request a copy of your data</li>
              <li><strong>Correction:</strong> Update inaccurate information</li>
              <li><strong>Deletion:</strong> Request complete account and data deletion</li>
              <li><strong>Portability:</strong> Export your game statistics</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">6. Security</h2>
            <p className="text-slate-300">
              We implement industry-standard security measures including:
            </p>
            <ul className="list-disc pl-6 text-slate-300 space-y-2 mt-4">
              <li>HTTPS encryption for all data transmission</li>
              <li>Secure WebSocket connections for real-time data</li>
              <li>JWT-based authentication</li>
              <li>Regular security audits</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">7. Children's Privacy</h2>
            <p className="text-slate-300">
              TAG! is not intended for children under 13. We do not knowingly collect personal information 
              from children under 13. If you believe a child has provided us with personal information, 
              please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">8. Contact Us</h2>
            <p className="text-slate-300">
              For privacy-related inquiries or data requests:<br />
              Email: <a href="mailto:privacy@newbold.cloud" className="text-indigo-400 hover:underline">privacy@newbold.cloud</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
