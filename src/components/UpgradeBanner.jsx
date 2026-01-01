import { Link } from 'react-router-dom';
import { useStore } from '../store';

export default function UpgradeBanner() {
  const { user } = useStore();

  // Only show for anonymous users
  if (!user?.isAnonymous) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-4 mb-4 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="text-3xl">⚡</div>
        <div className="flex-1">
          <h3 className="font-bold text-white">Playing as Guest</h3>
          <p className="text-white/80 text-sm">Upgrade to save your progress forever!</p>
        </div>
        <Link 
          to="/upgrade"
          className="bg-white text-orange-600 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-orange-50 transition-colors"
        >
          Upgrade
        </Link>
      </div>
    </div>
  );
}
