import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 mb-8">
          <ArrowLeft size={20} />
          Back to Game
        </Link>

        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          Terms of Service
        </h1>

        <div className="prose prose-invert prose-indigo max-w-none space-y-6">
          <p className="text-slate-300">Last updated: December 2025</p>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">1. Acceptance of Terms</h2>
            <p className="text-slate-300">
              By accessing or using TAG! GPS Hunt Game ("the Service"), you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">2. Description of Service</h2>
            <p className="text-slate-300">
              TAG! is a location-based mobile game that uses GPS technology to enable users to play tag with friends 
              in real-world locations. The Service requires access to your device's location services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">3. User Responsibilities</h2>
            <ul className="list-disc pl-6 text-slate-300 space-y-2">
              <li>You must be at least 13 years old to use this Service</li>
              <li>You are responsible for maintaining the security of your account</li>
              <li>You agree to play safely and be aware of your surroundings at all times</li>
              <li>You will not trespass on private property while playing</li>
              <li>You will not use the Service while driving or operating machinery</li>
              <li>You will respect other users and not engage in harassment</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">4. Safety Guidelines</h2>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <p className="text-amber-200">
                <strong>⚠️ Important:</strong> Always prioritize your safety. Be aware of your surroundings, 
                do not play in dangerous areas, and never put yourself at risk to tag another player.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">5. Privacy</h2>
            <p className="text-slate-300">
              Your use of the Service is also governed by our <Link to="/privacy" className="text-indigo-400 hover:underline">Privacy Policy</Link>. 
              Location data is only shared with players in your active game session.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">6. Limitation of Liability</h2>
            <p className="text-slate-300">
              TAG! and its creators are not liable for any injuries, accidents, or damages that occur while using 
              the Service. Users play at their own risk and are solely responsible for their physical safety.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">7. Modifications</h2>
            <p className="text-slate-300">
              We reserve the right to modify these terms at any time. Continued use of the Service after changes 
              constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">8. Contact</h2>
            <p className="text-slate-300">
              For questions about these Terms, contact us at: <a href="mailto:support@newbold.cloud" className="text-indigo-400 hover:underline">support@newbold.cloud</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
