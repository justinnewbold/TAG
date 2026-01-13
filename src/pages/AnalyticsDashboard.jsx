/**
 * Advanced Analytics Dashboard
 * Real-time monitoring, trends, geographic analytics, and engagement metrics
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

// Time range options
const TIME_RANGES = [
  { value: '1h', label: 'Last Hour' },
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
];

export function AnalyticsDashboard() {
  const [range, setRange] = useState('24h');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [trendsData, setTrendsData] = useState(null);
  const [realTimeData, setRealTimeData] = useState(null);
  const [engagementData, setEngagementData] = useState(null);
  const [geoData, setGeoData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await api.request(`/analytics/v2/dashboard?range=${range}`);
      setDashboardData(response);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    }
  }, [range]);

  // Fetch trends data
  const fetchTrendsData = useCallback(async () => {
    try {
      const response = await api.request(`/analytics/v2/trends?range=${range}`);
      setTrendsData(response);
    } catch (err) {
      console.error('Failed to fetch trends data:', err);
    }
  }, [range]);

  // Fetch real-time data
  const fetchRealTimeData = useCallback(async () => {
    try {
      const response = await api.request('/analytics/v2/realtime');
      setRealTimeData(response);
    } catch (err) {
      console.error('Failed to fetch real-time data:', err);
    }
  }, []);

  // Fetch engagement data
  const fetchEngagementData = useCallback(async () => {
    try {
      const response = await api.request(`/analytics/v2/engagement?range=${range}`);
      setEngagementData(response);
    } catch (err) {
      console.error('Failed to fetch engagement data:', err);
    }
  }, [range]);

  // Fetch geographic data
  const fetchGeoData = useCallback(async () => {
    try {
      const response = await api.request(`/analytics/v2/geographic?range=${range}`);
      setGeoData(response);
    } catch (err) {
      console.error('Failed to fetch geographic data:', err);
    }
  }, [range]);

  // Initial load
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([
          fetchDashboardData(),
          fetchTrendsData(),
          fetchRealTimeData(),
          fetchEngagementData(),
          fetchGeoData(),
        ]);
      } catch (err) {
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [fetchDashboardData, fetchTrendsData, fetchRealTimeData, fetchEngagementData, fetchGeoData]);

  // Real-time refresh
  useEffect(() => {
    const interval = setInterval(fetchRealTimeData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchRealTimeData]);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner} />
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <span>⚠️</span>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} style={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Analytics Dashboard</h1>
          <p style={styles.subtitle}>Real-time game insights and trends</p>
        </div>
        <div style={styles.controls}>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            style={styles.select}
          >
            {TIME_RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {['overview', 'trends', 'engagement', 'geographic', 'realtime'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              ...styles.tab,
              ...(activeTab === tab ? styles.activeTab : {}),
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && dashboardData && (
        <div style={styles.content}>
          {/* Summary Cards */}
          <div style={styles.cardGrid}>
            <MetricCard
              title="Total Events"
              value={dashboardData.summary.totalEvents.toLocaleString()}
              change={dashboardData.summary.eventChange}
              icon="📊"
            />
            <MetricCard
              title="Active Users"
              value={dashboardData.summary.uniqueUsers.toLocaleString()}
              change={dashboardData.summary.userChange}
              icon="👥"
            />
            <MetricCard
              title="Games Started"
              value={dashboardData.summary.gamesStarted.toLocaleString()}
              icon="🎮"
            />
            <MetricCard
              title="Tags Made"
              value={dashboardData.summary.tagsMade.toLocaleString()}
              icon="🏷️"
            />
            <MetricCard
              title="New Users"
              value={dashboardData.summary.newUsers.toLocaleString()}
              icon="🆕"
            />
          </div>

          {/* Event Breakdown */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Event Breakdown</h3>
            <div style={styles.eventList}>
              {dashboardData.eventBreakdown.map((event) => (
                <div key={event.event_name} style={styles.eventRow}>
                  <span style={styles.eventName}>{event.event_name}</span>
                  <div style={styles.eventBar}>
                    <div
                      style={{
                        ...styles.eventBarFill,
                        width: `${(event.count / dashboardData.summary.totalEvents) * 100}%`,
                      }}
                    />
                  </div>
                  <span style={styles.eventCount}>{parseInt(event.count).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Trends Tab */}
      {activeTab === 'trends' && trendsData && (
        <div style={styles.content}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>
              {trendsData.type === 'hourly' ? 'Hourly' : 'Daily'} Activity
            </h3>
            <div style={styles.chart}>
              {trendsData.data.map((point, index) => (
                <div key={index} style={styles.chartBar}>
                  <div
                    style={{
                      ...styles.chartBarFill,
                      height: `${Math.min((point.count / Math.max(...trendsData.data.map(d => d.count))) * 100, 100)}%`,
                    }}
                  />
                  <span style={styles.chartLabel}>
                    {trendsData.type === 'hourly' ? `${point.hour}:00` : point.date?.split('-')[2]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Engagement Tab */}
      {activeTab === 'engagement' && engagementData && (
        <div style={styles.content}>
          <div style={styles.cardGrid}>
            <MetricCard
              title="Total Games"
              value={engagementData.metrics.totalGames.toLocaleString()}
              icon="🎯"
            />
            <MetricCard
              title="Total Tags"
              value={engagementData.metrics.totalTags.toLocaleString()}
              icon="✋"
            />
            <MetricCard
              title="Unique Players"
              value={engagementData.metrics.uniquePlayers.toLocaleString()}
              icon="🎮"
            />
            <MetricCard
              title="Avg Game Duration"
              value={`${engagementData.metrics.avgGameDuration} min`}
              icon="⏱️"
            />
            <MetricCard
              title="Avg Tags/Game"
              value={engagementData.metrics.avgTagsPerGame.toFixed(1)}
              icon="📈"
            />
            <MetricCard
              title="Games/Player"
              value={engagementData.metrics.gamesPerPlayer.toFixed(1)}
              icon="🔄"
            />
          </div>
        </div>
      )}

      {/* Geographic Tab */}
      {activeTab === 'geographic' && geoData && (
        <div style={styles.content}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Tag Hotspots</h3>
            <p style={styles.cardSubtitle}>
              {geoData.totalLocations} location-tagged events
            </p>

            {geoData.topCities.length > 0 ? (
              <div style={styles.cityList}>
                {geoData.topCities.map((city, index) => (
                  <div key={city.name} style={styles.cityRow}>
                    <span style={styles.cityRank}>#{index + 1}</span>
                    <span style={styles.cityName}>{city.name}</span>
                    <span style={styles.cityCount}>{city.count} tags</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={styles.noData}>No location data available yet</p>
            )}
          </div>

          {geoData.heatMap.length > 0 && (
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Heat Map Data</h3>
              <p style={styles.cardSubtitle}>
                {geoData.heatMap.length} active zones
              </p>
              <div style={styles.heatMapGrid}>
                {geoData.heatMap.slice(0, 20).map((point, index) => (
                  <div
                    key={index}
                    style={{
                      ...styles.heatMapPoint,
                      backgroundColor: `rgba(0, 245, 255, ${Math.min(point.count / 10, 1)})`,
                    }}
                    title={`${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}: ${point.count} events`}
                  >
                    {point.count}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Real-time Tab */}
      {activeTab === 'realtime' && realTimeData && (
        <div style={styles.content}>
          <div style={styles.cardGrid}>
            <MetricCard
              title="Active Users (5m)"
              value={realTimeData.activeUsers.toLocaleString()}
              icon="👤"
              live
            />
            <MetricCard
              title="Events/Minute"
              value={realTimeData.eventsPerMinute.toLocaleString()}
              icon="⚡"
              live
            />
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>
              Live Activity Feed
              <span style={styles.liveIndicator}>● LIVE</span>
            </h3>
            <div style={styles.activityFeed}>
              {realTimeData.recentActivity.map((activity, index) => (
                <div key={index} style={styles.activityItem}>
                  <span style={styles.activityType}>{activity.type}</span>
                  <span style={styles.activityUser}>User {activity.userId}...</span>
                  <span style={styles.activityTime}>
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Metric Card Component
function MetricCard({ title, value, change, icon, live }) {
  const isPositive = change > 0;
  const isNegative = change < 0;

  return (
    <div style={styles.metricCard}>
      <div style={styles.metricHeader}>
        <span style={styles.metricIcon}>{icon}</span>
        {live && <span style={styles.liveIndicator}>● LIVE</span>}
      </div>
      <div style={styles.metricValue}>{value}</div>
      <div style={styles.metricTitle}>{title}</div>
      {change !== undefined && (
        <div
          style={{
            ...styles.metricChange,
            color: isPositive ? '#10b981' : isNegative ? '#ef4444' : '#6b7280',
          }}
        >
          {isPositive ? '↑' : isNegative ? '↓' : '→'} {Math.abs(change)}%
        </div>
      )}
    </div>
  );
}

// Styles
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0a0a0f',
    padding: '24px',
    color: '#fff',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '400px',
    color: '#9ca3af',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #1f2937',
    borderTop: '3px solid #00f5ff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  error: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '400px',
    color: '#ef4444',
    gap: '16px',
  },
  retryButton: {
    padding: '8px 16px',
    backgroundColor: '#00f5ff',
    color: '#0a0a0f',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 600,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    margin: 0,
    color: '#00f5ff',
  },
  subtitle: {
    fontSize: '14px',
    color: '#9ca3af',
    margin: '4px 0 0 0',
  },
  controls: {
    display: 'flex',
    gap: '12px',
  },
  select: {
    padding: '8px 16px',
    backgroundColor: '#1f2937',
    color: '#fff',
    border: '1px solid #374151',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    borderBottom: '1px solid #374151',
    paddingBottom: '8px',
  },
  tab: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: '#9ca3af',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  activeTab: {
    backgroundColor: '#1f2937',
    color: '#00f5ff',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  card: {
    backgroundColor: '#1f2937',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #374151',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#fff',
    margin: '0 0 16px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  cardSubtitle: {
    fontSize: '13px',
    color: '#9ca3af',
    margin: '-12px 0 16px 0',
  },
  metricCard: {
    backgroundColor: '#1f2937',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #374151',
  },
  metricHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  metricIcon: {
    fontSize: '24px',
  },
  metricValue: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#fff',
  },
  metricTitle: {
    fontSize: '14px',
    color: '#9ca3af',
    marginTop: '4px',
  },
  metricChange: {
    fontSize: '13px',
    marginTop: '8px',
    fontWeight: 500,
  },
  liveIndicator: {
    fontSize: '12px',
    color: '#10b981',
    fontWeight: 500,
  },
  eventList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  eventRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  eventName: {
    width: '180px',
    fontSize: '13px',
    color: '#d1d5db',
  },
  eventBar: {
    flex: 1,
    height: '8px',
    backgroundColor: '#374151',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  eventBarFill: {
    height: '100%',
    backgroundColor: '#00f5ff',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  eventCount: {
    width: '80px',
    textAlign: 'right',
    fontSize: '13px',
    color: '#9ca3af',
  },
  chart: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '4px',
    height: '200px',
    padding: '16px 0',
  },
  chartBar: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    height: '100%',
    gap: '8px',
  },
  chartBarFill: {
    width: '100%',
    backgroundColor: '#00f5ff',
    borderRadius: '4px 4px 0 0',
    transition: 'height 0.3s ease',
    marginTop: 'auto',
  },
  chartLabel: {
    fontSize: '10px',
    color: '#9ca3af',
    whiteSpace: 'nowrap',
  },
  cityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  cityRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px',
    backgroundColor: '#374151',
    borderRadius: '6px',
  },
  cityRank: {
    fontSize: '12px',
    color: '#00f5ff',
    fontWeight: 600,
    width: '30px',
  },
  cityName: {
    flex: 1,
    fontSize: '14px',
    color: '#fff',
  },
  cityCount: {
    fontSize: '13px',
    color: '#9ca3af',
  },
  heatMapGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(50px, 1fr))',
    gap: '8px',
  },
  heatMapPoint: {
    aspectRatio: '1',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 600,
    color: '#0a0a0f',
  },
  activityFeed: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '400px',
    overflowY: 'auto',
  },
  activityItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 12px',
    backgroundColor: '#374151',
    borderRadius: '6px',
    fontSize: '13px',
  },
  activityType: {
    color: '#00f5ff',
    fontWeight: 500,
    width: '150px',
  },
  activityUser: {
    color: '#9ca3af',
    flex: 1,
  },
  activityTime: {
    color: '#6b7280',
    fontSize: '12px',
  },
  noData: {
    color: '#6b7280',
    textAlign: 'center',
    padding: '40px',
    fontSize: '14px',
  },
};

export default AnalyticsDashboard;
