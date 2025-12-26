import React from 'react';
import { Briefcase, Moon, Coffee, Home, BookOpen, Church, Plus } from 'lucide-react';

const PRESETS = [
  {
    id: 'work',
    name: 'Work Hours',
    icon: Briefcase,
    description: 'Mon-Fri 9AM-5PM',
    schedule: {
      name: 'Work Hours',
      startTime: '09:00',
      endTime: '17:00',
      days: [1, 2, 3, 4, 5]
    }
  },
  {
    id: 'sleep',
    name: 'Sleep Time',
    icon: Moon,
    description: 'Every night 11PM-7AM',
    schedule: {
      name: 'Sleep Time',
      startTime: '23:00',
      endTime: '07:00',
      days: [0, 1, 2, 3, 4, 5, 6]
    }
  },
  {
    id: 'school',
    name: 'School Hours',
    icon: BookOpen,
    description: 'Mon-Fri 8AM-3PM',
    schedule: {
      name: 'School Hours',
      startTime: '08:00',
      endTime: '15:00',
      days: [1, 2, 3, 4, 5]
    }
  },
  {
    id: 'dinner',
    name: 'Dinner Time',
    icon: Coffee,
    description: 'Every day 6PM-7PM',
    schedule: {
      name: 'Dinner Time',
      startTime: '18:00',
      endTime: '19:00',
      days: [0, 1, 2, 3, 4, 5, 6]
    }
  },
  {
    id: 'weekend_morning',
    name: 'Weekend Mornings',
    icon: Home,
    description: 'Sat-Sun until noon',
    schedule: {
      name: 'Weekend Mornings',
      startTime: '00:00',
      endTime: '12:00',
      days: [0, 6]
    }
  },
  {
    id: 'church',
    name: 'Church/Worship',
    icon: Church,
    description: 'Sunday morning',
    schedule: {
      name: 'Church Time',
      startTime: '09:00',
      endTime: '12:00',
      days: [0]
    }
  }
];

export default function NoTagPresets({ onAddPreset, existingSchedules = [] }) {
  const isPresetAdded = (presetId) => {
    const preset = PRESETS.find(p => p.id === presetId);
    return existingSchedules.some(s => s.name === preset?.schedule.name);
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-400">Quick Add Presets</h4>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {PRESETS.map((preset) => {
          const Icon = preset.icon;
          const added = isPresetAdded(preset.id);
          
          return (
            <button
              key={preset.id}
              onClick={() => !added && onAddPreset(preset.schedule)}
              disabled={added}
              className={`p-3 rounded-lg border text-left transition-all ${
                added
                  ? 'bg-green-500/10 border-green-500/30 cursor-not-allowed'
                  : 'bg-gray-800/50 border-gray-700 hover:border-indigo-500/50 hover:bg-indigo-500/5'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${added ? 'text-green-400' : 'text-indigo-400'}`} />
                <span className={`text-sm font-medium ${added ? 'text-green-400' : 'text-white'}`}>
                  {preset.name}
                </span>
              </div>
              <p className="text-xs text-gray-500">{preset.description}</p>
              {added && (
                <span className="text-xs text-green-400 mt-1 block">✓ Added</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
