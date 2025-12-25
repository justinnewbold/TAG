import { Link } from 'react-router-dom';
import { MapPin, Users, Trophy, Zap, Smartphone, Shield, Play, Star } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-40 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>
        
        <nav className="relative z-10 max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            TAG!
          </div>
          <div className="flex gap-4">
            <Link to="/login" className="px-4 py-2 text-slate-300 hover:text-white transition">
              Login
            </Link>
            <Link to="/register" className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full font-semibold hover:opacity-90 transition">
              Play Now
            </Link>
          </div>
        </nav>

        <div className="relative z-10 max-w-7xl mx-auto px-4 py-20 text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Hunt Your Friends
            </span>
            <br />
            <span className="text-white">In Real Life</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-10">
            The ultimate GPS-based tag game. Create games, invite friends, and chase them down using real-time location tracking. Who will be "it" last?
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full text-lg font-semibold hover:opacity-90 transition shadow-lg shadow-indigo-500/25">
              <Play size={24} />
              Start Playing Free
            </Link>
            <a href="#features" className="inline-flex items-center gap-2 px-8 py-4 border border-slate-600 rounded-full text-lg font-semibold hover:bg-slate-800 transition">
              Learn More
            </a>
          </div>
        </div>
      </header>

      {/* Features Grid */}
      <section id="features" className="max-w-7xl mx-auto px-4 py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
          Everything You Need to Play
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            icon={MapPin}
            title="Real-Time GPS Tracking"
            description="See everyone's position on the map with configurable update intervals from 5 seconds to 1 minute."
            color="indigo"
          />
          <FeatureCard
            icon={Users}
            title="7 Game Modes"
            description="Classic Tag, Freeze Tag, Infection, Team Tag, Manhunt, Hot Potato, and Hide & Seek."
            color="purple"
          />
          <FeatureCard
            icon={Trophy}
            title="Achievements & Leaderboards"
            description="Earn 10 unique badges and compete on global leaderboards for wins, tags, and survival."
            color="pink"
          />
          <FeatureCard
            icon={Zap}
            title="Instant Invites"
            description="Share game codes or QR codes to get friends playing in seconds. No app download required!"
            color="amber"
          />
          <FeatureCard
            icon={Smartphone}
            title="Works Everywhere"
            description="Play in any browser or install as an app. Native mobile apps coming soon to iOS and Android."
            color="green"
          />
          <FeatureCard
            icon={Shield}
            title="Privacy First"
            description="Your location is only shared during active games and with your game participants only."
            color="blue"
          />
        </div>
      </section>

      {/* Game Modes Section */}
      <section className="bg-slate-800/30 py-20">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            7 Ways to Play
          </h2>
          <p className="text-slate-400 text-center mb-16 max-w-2xl mx-auto">
            From classic tag to epic manhunts, choose your game mode and start the chase.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <GameModeCard name="Classic Tag" emoji="🏃" description="One person is 'it' and must tag others" />
            <GameModeCard name="Freeze Tag" emoji="🥶" description="Tagged players freeze until freed" />
            <GameModeCard name="Infection" emoji="🦠" description="Tagged players join the hunting team" />
            <GameModeCard name="Team Tag" emoji="👥" description="Two teams compete to tag each other" />
            <GameModeCard name="Manhunt" emoji="🎯" description="Hunters vs runners with roles" />
            <GameModeCard name="Hot Potato" emoji="🥔" description="Pass the 'it' status before time runs out" />
            <GameModeCard name="Hide & Seek" emoji="👀" description="Hide then survive the hunt" />
            <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl p-6 border border-indigo-500/30 flex items-center justify-center">
              <span className="text-slate-400">More modes coming soon!</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-3xl p-12 border border-slate-700">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Play?</h2>
          <p className="text-slate-400 mb-8 max-w-xl mx-auto">
            Join thousands of players already hunting their friends. It's free to play!
          </p>
          <Link to="/register" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full text-lg font-semibold hover:opacity-90 transition shadow-lg shadow-indigo-500/25">
            <Star size={24} />
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              TAG!
            </div>
            <div className="flex gap-6 text-slate-400">
              <Link to="/terms" className="hover:text-white transition">Terms of Service</Link>
              <Link to="/privacy" className="hover:text-white transition">Privacy Policy</Link>
              <a href="mailto:support@newbold.cloud" className="hover:text-white transition">Support</a>
            </div>
            <div className="text-slate-500">
              © 2025 Newbold Cloud. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, color }) {
  const colors = {
    indigo: 'from-indigo-500/20 border-indigo-500/30 text-indigo-400',
    purple: 'from-purple-500/20 border-purple-500/30 text-purple-400',
    pink: 'from-pink-500/20 border-pink-500/30 text-pink-400',
    amber: 'from-amber-500/20 border-amber-500/30 text-amber-400',
    green: 'from-green-500/20 border-green-500/30 text-green-400',
    blue: 'from-blue-500/20 border-blue-500/30 text-blue-400',
  };
  
  return (
    <div className={`bg-gradient-to-br ${colors[color].split(' ')[0]} to-transparent rounded-xl p-6 border ${colors[color].split(' ')[1]}`}>
      <Icon className={`w-10 h-10 ${colors[color].split(' ')[2]} mb-4`} />
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-slate-400">{description}</p>
    </div>
  );
}

function GameModeCard({ name, emoji, description }) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 hover:border-indigo-500/50 transition">
      <span className="text-3xl mb-3 block">{emoji}</span>
      <h3 className="font-semibold text-white mb-1">{name}</h3>
      <p className="text-sm text-slate-400">{description}</p>
    </div>
  );
}
