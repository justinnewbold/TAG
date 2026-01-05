/**
 * Report Manager Component
 * Phase 7: Admin dashboard - User report management
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

const REPORT_REASONS = {
  cheating: { label: 'Cheating', icon: '🎮', severity: 'high' },
  harassment: { label: 'Harassment', icon: '💬', severity: 'high' },
  inappropriate_name: { label: 'Inappropriate Name', icon: '📝', severity: 'medium' },
  griefing: { label: 'Griefing', icon: '😈', severity: 'medium' },
  spam: { label: 'Spam', icon: '📧', severity: 'low' },
  other: { label: 'Other', icon: '❓', severity: 'low' },
};

const REPORT_STATUS = {
  pending: { label: 'Pending', color: 'yellow' },
  investigating: { label: 'Investigating', color: 'blue' },
  resolved: { label: 'Resolved', color: 'green' },
  dismissed: { label: 'Dismissed', color: 'gray' },
};

function ReportCard({ report, onAction }) {
  const reason = REPORT_REASONS[report.reason] || REPORT_REASONS.other;
  const status = REPORT_STATUS[report.status] || REPORT_STATUS.pending;

  const severityColors = {
    high: 'border-red-500/50 bg-red-500/10',
    medium: 'border-yellow-500/50 bg-yellow-500/10',
    low: 'border-blue-500/50 bg-blue-500/10',
  };

  return (
    <div className={`p-4 rounded-xl border ${severityColors[reason.severity]}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{reason.icon}</span>
          <div>
            <p className="font-semibold text-white">{reason.label}</p>
            <p className="text-xs text-white/50">
              {new Date(report.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            status.color === 'yellow'
              ? 'bg-yellow-500/20 text-yellow-400'
              : status.color === 'blue'
              ? 'bg-blue-500/20 text-blue-400'
              : status.color === 'green'
              ? 'bg-green-500/20 text-green-400'
              : 'bg-gray-500/20 text-gray-400'
          }`}
        >
          {status.label}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex gap-4 text-sm">
          <div>
            <span className="text-white/50">Reporter:</span>{' '}
            <span className="text-white">{report.reporterName}</span>
          </div>
          <div>
            <span className="text-white/50">Reported:</span>{' '}
            <span className="text-white">{report.reportedName}</span>
          </div>
        </div>
        {report.details && (
          <p className="text-sm text-white/70 bg-dark-700 p-2 rounded">
            {report.details}
          </p>
        )}
        {report.gameId && (
          <p className="text-xs text-white/50">
            Game: {report.gameId}
          </p>
        )}
      </div>

      {report.status === 'pending' && (
        <div className="flex gap-2">
          <button
            onClick={() => onAction(report.id, 'investigate')}
            className="flex-1 px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30 transition-colors"
          >
            Investigate
          </button>
          <button
            onClick={() => onAction(report.id, 'dismiss')}
            className="flex-1 px-3 py-2 bg-gray-500/20 text-gray-400 rounded-lg text-sm hover:bg-gray-500/30 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {report.status === 'investigating' && (
        <div className="flex gap-2">
          <button
            onClick={() => onAction(report.id, 'warn')}
            className="flex-1 px-3 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm hover:bg-yellow-500/30 transition-colors"
          >
            Warn
          </button>
          <button
            onClick={() => onAction(report.id, 'ban')}
            className="flex-1 px-3 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
          >
            Ban
          </button>
          <button
            onClick={() => onAction(report.id, 'dismiss')}
            className="flex-1 px-3 py-2 bg-gray-500/20 text-gray-400 rounded-lg text-sm hover:bg-gray-500/30 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

export function ReportManager() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    loadReports();
  }, [filter]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await api.request(`/admin/reports?status=${filter}`);
      setReports(data.reports || []);
    } catch (error) {
      console.error('Failed to load reports:', error);
      // Mock data
      setReports([
        {
          id: '1',
          reason: 'cheating',
          reporterName: 'Player123',
          reporterId: 'u1',
          reportedName: 'SuspectPlayer',
          reportedId: 'u2',
          details: 'This player was moving way too fast, definitely using a speed hack.',
          gameId: 'g123',
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          reason: 'harassment',
          reporterName: 'CoolGamer',
          reporterId: 'u3',
          reportedName: 'ToxicDude',
          reportedId: 'u4',
          details: 'Sending threatening messages in chat.',
          gameId: 'g124',
          status: 'investigating',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: '3',
          reason: 'inappropriate_name',
          reporterName: 'NicePlayer',
          reporterId: 'u5',
          reportedName: 'BadName123',
          reportedId: 'u6',
          status: 'pending',
          createdAt: new Date(Date.now() - 7200000).toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (reportId, action) => {
    try {
      await api.request(`/admin/reports/${reportId}/${action}`, {
        method: 'POST',
      });
      loadReports();
    } catch (error) {
      console.error(`Failed to ${action} report:`, error);
      // Update locally for demo
      setReports(prev =>
        prev.map(r =>
          r.id === reportId
            ? {
                ...r,
                status:
                  action === 'investigate'
                    ? 'investigating'
                    : action === 'dismiss'
                    ? 'dismissed'
                    : 'resolved',
              }
            : r
        )
      );
    }
  };

  const pendingCount = reports.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {Object.entries(REPORT_STATUS).map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
              filter === key
                ? 'bg-neon-cyan text-dark-900 font-medium'
                : 'bg-dark-700 text-white/70 hover:bg-dark-600'
            }`}
          >
            {label}
            {key === 'pending' && pendingCount > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Reports list */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 bg-dark-700 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-4xl mb-4 block">✅</span>
          <p className="text-white/70">No {filter} reports</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <ReportCard key={report.id} report={report} onAction={handleAction} />
          ))}
        </div>
      )}
    </div>
  );
}

export default ReportManager;
