import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col items-center justify-center p-6 text-center">
      <div className="text-8xl mb-4 bg-gradient-to-r from-neon-cyan to-neon-purple bg-clip-text text-transparent font-bold">
        404
      </div>
      <h1 className="text-2xl font-bold text-white mb-2">Page Not Found</h1>
      <p className="text-gray-400 mb-8">
        Looks like you wandered outside the game boundaries!
      </p>
      <div className="flex gap-4">
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-3 bg-dark-800 text-white rounded-lg border border-gray-700 hover:bg-dark-700 transition-colors"
        >
          Go Back
        </button>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-gradient-to-r from-neon-cyan to-neon-purple text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
        >
          Home
        </button>
      </div>
    </div>
  );
}
