import React, { useState, useEffect, useRef } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Brush
} from 'recharts';
import EquityCurveChart from '../components/charts/EquityCurveChart';
import RMultipleHistogram from '../components/charts/RMultipleHistogram';
import VolatilityDurationHeatmap from '../components/charts/VolatilityDurationHeatmap';
import SymbolBoxplot from '../components/charts/SymbolBoxplot';
import CalendarPnLHeatmap from '../components/charts/CalendarPnLHeatmap';
import ClusterScatterPlot from '../components/charts/ClusterScatterPlot';
import SymbolPnLHeatmap from '../components/charts/SymbolPnLHeatmap';

// Helper functions for dynamic metric colors
const getProfitColor = (value) => {
  if (value > 0) return '#00e676'; // green
  if (value < 0) return '#ff5252'; // red
  return '#ffeb3b'; // yellow (breakeven)
};
const getWinRateColor = (value) => {
  if (value >= 60) return '#00e676'; // green
  if (value >= 40) return '#ffeb3b'; // yellow
  return '#ff5252'; // red
};
const getRMultipleColor = (value) => {
  if (value > 0.5) return '#00e676'; // green
  if (value >= 0) return '#ffeb3b'; // yellow
  return '#ff5252'; // red
};
const getDurationColor = (value) => {
  if (value < 60 || value > 240) return '#ffeb3b'; // yellow (too short/long)
  return '#00e676'; // green (good range)
};
const getDrawdownColor = (value) => {
  if (value > 0.10) return '#ff5252'; // red
  if (value > 0.05) return '#ffeb3b'; // yellow
  return '#00e676'; // green
};
const getVolatilityColor = (value) => {
  if (value > 0.8) return '#ff5252'; // red
  if (value > 0.4) return '#ffeb3b'; // yellow
  return '#00e676'; // green
};
const metricStyles = {
  label: {
    color: '#b0b0b0',
    fontWeight: 500,
    fontSize: '1.05rem',
    marginBottom: 2,
  },
  value: {
    fontWeight: 700,
    fontSize: '2rem',
    lineHeight: 1.1,
    marginBottom: 0,
  },
  trades: { color: '#fff' },
};

const tradeColumns = [
  { key: 'id', label: 'Trade ID' },
  { key: 'symbol', label: 'Symbol' },
  { key: 'entry_time', label: 'Entry Time' },
  { key: 'exit_time', label: 'Exit Time' },
  { key: 'entry_price', label: 'Entry Price' },
  { key: 'exit_price', label: 'Exit Price' },
  { key: 'profit_loss', label: 'PnL' },
  { key: 'r_multiple', label: 'R-Multiple' },
  { key: 'volatility', label: 'Volatility' },
  { key: 'drawdown', label: 'Drawdown' },
  { key: 'duration', label: 'Duration (min)' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'win', label: 'Win' },
];

const defaultColumnWidths = {
  id: 80,
  symbol: 100,
  entry_time: 170,
  exit_time: 170,
  entry_price: 110,
  exit_price: 110,
  profit_loss: 100,
  r_multiple: 110,
  volatility: 110,
  drawdown: 110,
  duration: 120,
  quantity: 100,
  win: 80,
};

const metricOptions = [
  { key: 'entry_time', label: 'Entry Time' },
  { key: 'exit_time', label: 'Exit Time' },
  { key: 'entry_price', label: 'Entry Price' },
  { key: 'exit_price', label: 'Exit Price' },
  { key: 'profit_loss', label: 'Profit/Loss' },
  { key: 'r_multiple', label: 'R-Multiple' },
  { key: 'volatility', label: 'Volatility' },
  { key: 'drawdown', label: 'Drawdown' },
  { key: 'duration', label: 'Duration (min)' },
  { key: 'quantity', label: 'Quantity' },
];

// Custom tooltip for scatter plot
const CustomScatterTooltip = ({ active, payload, label, xAxisMetric, yAxisMetric, metricOptions }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  const xLabel = metricOptions.find(opt => opt.key === xAxisMetric)?.label || xAxisMetric;
  const yLabel = metricOptions.find(opt => opt.key === yAxisMetric)?.label || yAxisMetric;
  return (
    <div style={{ background: '#232346', color: '#fff', border: '1px solid #4caf50', borderRadius: 8, padding: 12, fontSize: '1rem', minWidth: 220 }}>
      <div><b>Trade ID:</b> {data.tradeId}</div>
      <div><b>Entry Time:</b> {data.entry_time ? new Date(data.entry_time).toLocaleString() : ''}</div>
      <div><b>Exit Time:</b> {data.exit_time ? new Date(data.exit_time).toLocaleString() : ''}</div>
      <div><b>{xLabel}:</b> {xAxisMetric.includes('time') ? new Date(data.x).toLocaleString() : data.x}</div>
      <div><b>{yLabel}:</b> {yAxisMetric.includes('time') ? new Date(data.y).toLocaleString() : data.y}</div>
    </div>
  );
};

const CHART_TYPES = {
  EQUITY_CURVE: 'Equity Curve',
  R_MULTIPLE_HISTOGRAM: 'R-Multiple Histogram',
  VOLATILITY_DURATION_HEATMAP: 'Volatility vs Duration Heatmap',
  SYMBOL_BOXPLOT: 'Symbol-wise Boxplot',
  CALENDAR_PNL_HEATMAP: 'Calendar PnL Heatmap',
  CLUSTER_SCATTER_PLOT: 'Cluster Scatter Plot',
  SYMBOL_PNL_HEATMAP: 'Symbol P&L Heatmap',
};

const PatternsPage = () => {
  const [clusters, setClusters] = useState([]);
  const [selectedClusterId, setSelectedClusterId] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loadingClusters, setLoadingClusters] = useState(true);
  const [loadingAI, setLoadingAI] = useState(false);
  const [error, setError] = useState('');
  // New state for toggling topics and subtopics
  const [openTopics, setOpenTopics] = useState({}); // { [mainTopic]: true/false }
  const [openSubtopics, setOpenSubtopics] = useState({}); // { [mainTopic]: subtopicName | null }
  const [columnWidths, setColumnWidths] = useState(defaultColumnWidths);
  const resizingCol = useRef(null);
  const [symbolFilter, setSymbolFilter] = useState('ALL');
  const [winFilter, setWinFilter] = useState('ALL');
  const [xAxisMetric, setXAxisMetric] = useState('entry_time');
  const [yAxisMetric, setYAxisMetric] = useState('profit_loss');
  const [charts, setCharts] = useState([]);
  const [selectedChartType, setSelectedChartType] = useState('');

  // Add CSS for scrollbar styling
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .trades-table-container::-webkit-scrollbar {
        height: 12px;
        background-color: #181828;
      }
      .trades-table-container::-webkit-scrollbar-track {
        background: #232346;
        border-radius: 6px;
      }
      .trades-table-container::-webkit-scrollbar-thumb {
        background: #4caf50;
        border-radius: 6px;
      }
      .trades-table-container::-webkit-scrollbar-thumb:hover {
        background: #45a049;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    const fetchClusters = async () => {
      setLoadingClusters(true);
      setError('');
      try {
        const res = await fetch('/api/patterns');
        const data = await res.json();
        setClusters(data);
      } catch (err) {
        setError('Failed to fetch clusters.');
      }
      setLoadingClusters(false);
    };
    fetchClusters();
  }, []);

  const selectedCluster = clusters.find(c => c.cluster_id === selectedClusterId);

  const handleClusterSelect = (clusterId) => {
    setSelectedClusterId(clusterId);
    setAiAnalysis(null);
    setOpenTopics({});
    setOpenSubtopics({});
  };

  const handleGenerateAI = async () => {
    if (selectedClusterId === null) return;
    setLoadingAI(true);
    setError('');
    setAiAnalysis(null);
    setOpenTopics({});
    setOpenSubtopics({});
    try {
      const res = await fetch(`/api/patterns/${selectedClusterId}/analysis`);
      const data = await res.json();
      setAiAnalysis(data.analysis);
    } catch (err) {
      setError('Failed to generate AI analysis.');
    }
    setLoadingAI(false);
  };

  // Toggle main topic open/close
  const toggleTopic = (mainTopic) => {
    setOpenTopics((prev) => ({ ...prev, [mainTopic]: !prev[mainTopic] }));
    setOpenSubtopics((prev) => ({ ...prev, [mainTopic]: null })); // close subtopic when toggling topic
  };

  // Toggle subtopic open/close
  const toggleSubtopic = (mainTopic, subtopic) => {
    setOpenSubtopics((prev) => ({
      ...prev,
      [mainTopic]: prev[mainTopic] === subtopic ? null : subtopic
    }));
  };

  // Helper to extract recommendations from a main topic's subtopics (if any)
  const extractRecommendations = (subtopics) => {
    // Try to find a subtopic with 'recommendation' in the name
    const recKey = Object.keys(subtopics).find(
      (k) => k.toLowerCase() === 'recommendations'
    );
    if (recKey) return subtopics[recKey];
    // Otherwise, show a default message
    return 'No recommendations available for this topic.';
  };

  // Helper to render nested AI analysis with toggles and only one Recommendations subtopic button
  const renderAnalysis = (analysis) => {
    if (!analysis || typeof analysis !== 'object') return null;
    return (
      <div>
        {Object.entries(analysis).map(([mainTopic, subtopics]) => {
          // Check if Recommendations already exists as a subtopic
          const hasRecommendations = Object.keys(subtopics).some(
            (k) => k.toLowerCase() === 'recommendations'
          );
          return (
            <div key={mainTopic} style={{ marginBottom: 18 }}>
              <button
                onClick={() => toggleTopic(mainTopic)}
                style={{
                  background: openTopics[mainTopic] ? '#ff9800' : '#232346',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 18px',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  marginBottom: 6,
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  transition: 'background 0.2s',
                }}
              >
                {mainTopic}
              </button>
              {openTopics[mainTopic] && subtopics && typeof subtopics === 'object' && (
                <div style={{ marginLeft: 16, marginTop: 8 }}>
                  {Object.entries(subtopics).map(([sub, content]) => (
                    <div key={sub} style={{ marginBottom: 8 }}>
                      <button
                        onClick={() => toggleSubtopic(mainTopic, sub)}
                        style={{
                          background: openSubtopics[mainTopic] === sub ? '#4caf50' : '#2d3545',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          padding: '7px 16px',
                          fontSize: '1rem',
                          fontWeight: 500,
                          marginBottom: 2,
                          cursor: 'pointer',
                          width: '100%',
                          textAlign: 'left',
                          transition: 'background 0.2s',
                        }}
                      >
                        {sub}
                      </button>
                      {openSubtopics[mainTopic] === sub && (
                        <div style={{ color: '#b0b0b0', background: '#181828', borderRadius: 6, padding: 12, marginTop: 2, fontSize: '1.05rem', whiteSpace: 'pre-wrap' }}>{content}</div>
                      )}
                    </div>
                  ))}
                  {/* Only show Recommendations button if it does NOT already exist as a subtopic */}
                  {!hasRecommendations && (
                    <div style={{ marginBottom: 8 }}>
                      <button
                        onClick={() => toggleSubtopic(mainTopic, '__RECOMMENDATIONS__')}
                        style={{
                          background: openSubtopics[mainTopic] === '__RECOMMENDATIONS__' ? '#4caf50' : '#2d3545',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          padding: '7px 16px',
                          fontSize: '1rem',
                          fontWeight: 500,
                          marginBottom: 2,
                          cursor: 'pointer',
                          width: '100%',
                          textAlign: 'left',
                          transition: 'background 0.2s',
                        }}
                      >
                        Recommendations
                      </button>
                      {openSubtopics[mainTopic] === '__RECOMMENDATIONS__' && (
                        <div style={{ color: '#b0b0b0', background: '#181828', borderRadius: 6, padding: 12, marginTop: 2, fontSize: '1.05rem', whiteSpace: 'pre-wrap' }}>
                          {extractRecommendations(subtopics)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Mouse event handlers for resizing
  const handleMouseDown = (e, colKey) => {
    resizingCol.current = { colKey, startX: e.clientX, startWidth: columnWidths[colKey] };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!resizingCol.current) return;
    const { colKey, startX, startWidth } = resizingCol.current;
    const delta = e.clientX - startX;
    setColumnWidths((prev) => ({
      ...prev,
      [colKey]: Math.max(60, startWidth + delta),
    }));
  };

  const handleMouseUp = () => {
    resizingCol.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleAddChart = () => {
    if (selectedChartType && !charts.includes(selectedChartType)) {
      setCharts([...charts, selectedChartType]);
      setSelectedChartType('');
    }
  };

  const handleRemoveChart = (type) => {
    setCharts(charts.filter(c => c !== type));
  };

  return (
    <div style={{ padding: '40px', background: '#121212', minHeight: '100vh', color: '#fff' }}>
      <h2>Patterns Page</h2>
      {/* Widget 1: Cluster Group Buttons */}
      <div style={{ background: '#1e1e2f', borderRadius: 12, padding: 24, marginBottom: 32, boxShadow: '0 4px 16px rgba(0,0,0,0.18)', display: 'flex', gap: 16 }}>
        {loadingClusters ? (
          <span>Loading clusters...</span>
        ) : (
          clusters.map((cluster) => (
            <button
              key={cluster.cluster_id}
              onClick={() => handleClusterSelect(cluster.cluster_id)}
              style={{
                background: selectedClusterId === cluster.cluster_id ? '#4caf50' : '#232346',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '12px 28px',
                fontSize: '1.1rem',
                cursor: 'pointer',
                fontWeight: selectedClusterId === cluster.cluster_id ? 'bold' : 'normal',
                boxShadow: selectedClusterId === cluster.cluster_id ? '0 2px 8px #4caf5040' : 'none',
                transition: 'background 0.2s',
              }}
            >
              {cluster.name}
            </button>
          ))
        )}
      </div>

      {/* Widget 2: AI Analysis */}
      <div style={{ background: '#1e1e2f', borderRadius: 12, padding: 24, marginBottom: 32, boxShadow: '0 4px 16px rgba(0,0,0,0.18)', minHeight: 180 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <button
            onClick={handleGenerateAI}
            disabled={selectedClusterId === null || loadingAI}
            style={{
              background: '#ff9800',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 24px',
              fontSize: '1.1rem',
              cursor: selectedClusterId === null || loadingAI ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              marginRight: 16,
            }}
          >
            {loadingAI ? 'Generating...' : 'Generate AI Cluster Analysis'}
          </button>
          {error && <span style={{ color: '#ff5252', marginLeft: 16 }}>{error}</span>}
        </div>
        {loadingAI && <div>Loading AI analysis...</div>}
        {aiAnalysis && (
          <div style={{ marginTop: 12 }}>{renderAnalysis(aiAnalysis)}</div>
        )}
      </div>

      {/* Widget 3: Cluster Metrics and Trades */}
      <div style={{ background: '#1e1e2f', borderRadius: 12, padding: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.18)' }}>
        {selectedCluster ? (
          <>
            <div style={{ marginBottom: 32 }}>
              <div style={{
                background: '#232b3b',
                borderRadius: 10,
                padding: '24px 24px 18px 24px',
                marginBottom: 18,
              }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 6 }}>Pattern Analysis</div>
                <div style={{ background: '#2d3545', borderRadius: 8, padding: '16px 18px', marginBottom: 18 }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 2 }}>{selectedCluster.name}</div>
                  <div style={{ color: '#b0b0b0', fontSize: '1.05rem' }}>{selectedCluster.description}</div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32 }}>
                  <div>
                    <div style={metricStyles.label}>Win Rate</div>
                    <div style={{ ...metricStyles.value, color: getWinRateColor(selectedCluster.win_rate) }}>{selectedCluster.win_rate?.toFixed(1)}%</div>
                  </div>
                  <div>
                    <div style={metricStyles.label}>R-Multiple</div>
                    <div style={{ ...metricStyles.value, color: getRMultipleColor(selectedCluster.r_multiple) }}>{selectedCluster.r_multiple?.toFixed(2)}</div>
                  </div>
                  <div>
                    <div style={metricStyles.label}>Duration</div>
                    <div style={{ ...metricStyles.value, color: getDurationColor(selectedCluster.duration) }}>{selectedCluster.duration?.toFixed(2)} min</div>
                  </div>
                  <div>
                    <div style={metricStyles.label}>Trades</div>
                    <div style={{ ...metricStyles.value, ...metricStyles.trades }}>{selectedCluster.trade_count}</div>
                  </div>
                  <div>
                    <div style={metricStyles.label}>Avg Profit</div>
                    <div style={{ ...metricStyles.value, color: getProfitColor(selectedCluster.avg_profit) }}>${selectedCluster.avg_profit?.toFixed(2)}</div>
                  </div>
                  <div>
                    <div style={metricStyles.label}>Drawdown</div>
                    <div style={{ ...metricStyles.value, color: getDrawdownColor(selectedCluster.drawdown) }}>{(selectedCluster.drawdown * 100).toFixed(1)}%</div>
                  </div>
                  <div>
                    <div style={metricStyles.label}>Volatility</div>
                    <div style={{ ...metricStyles.value, color: getVolatilityColor(selectedCluster.volatility) }}>{(selectedCluster.volatility * 100).toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            </div>
            {selectedCluster && selectedCluster.trades.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
                  <select
                    value={selectedChartType}
                    onChange={e => setSelectedChartType(e.target.value)}
                    style={{ padding: 8, borderRadius: 6, minWidth: 200 }}
                  >
                    <option value="" disabled>Select chart type...</option>
                    {Object.entries(CHART_TYPES).map(([key, label]) => (
                      <option key={key} value={key} disabled={charts.includes(key)}>{label}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAddChart}
                    disabled={!selectedChartType}
                    style={{ padding: '8px 18px', borderRadius: 6, background: '#4caf50', color: '#fff', fontWeight: 600, border: 'none', cursor: selectedChartType ? 'pointer' : 'not-allowed' }}
                  >
                    + Add Chart
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {charts.map(type => (
                    <div key={type} style={{ background: '#1c1c2e', borderRadius: 16, padding: 20, marginBottom: 0, position: 'relative' }}>
                      <button
                        onClick={() => handleRemoveChart(type)}
                        style={{ position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', color: '#ff5252', fontSize: 22, cursor: 'pointer', fontWeight: 700 }}
                        title="Remove chart"
                      >✕</button>
                      {type === 'EQUITY_CURVE' && <EquityCurveChart data={selectedCluster.trades} />}
                      {type === 'R_MULTIPLE_HISTOGRAM' && <RMultipleHistogram data={selectedCluster.trades} />}
                      {type === 'VOLATILITY_DURATION_HEATMAP' && <VolatilityDurationHeatmap data={selectedCluster.trades} />}
                      {type === 'SYMBOL_BOXPLOT' && <SymbolBoxplot data={selectedCluster.trades} />}
                      {type === 'CALENDAR_PNL_HEATMAP' && <CalendarPnLHeatmap data={selectedCluster.trades} />}
                      {type === 'CLUSTER_SCATTER_PLOT' && <ClusterScatterPlot data={selectedCluster.trades} />}
                      {type === 'SYMBOL_PNL_HEATMAP' && <SymbolPnLHeatmap data={selectedCluster.trades} />}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <h4>Trades in Cluster</h4>
              <div className="trades-table-container" style={{ 
                maxHeight: 300, 
                overflowY: 'auto', 
                overflowX: 'scroll',
                border: '1px solid #333',
                borderRadius: 8,
                background: '#181828',
                width: '100%'
              }}>
                <div style={{ 
                  minWidth: '1200px',
                  width: '100%'
                }}>
                  <table style={{ 
                    width: '100%', 
                    color: '#fff', 
                    borderCollapse: 'collapse', 
                    fontSize: '0.98rem', 
                    whiteSpace: 'nowrap',
                    tableLayout: 'fixed'
                  }}>
                    <thead>
                      <tr style={{ background: '#232346' }}>
                        {tradeColumns.map((col, idx) => (
                          <th
                            key={col.key}
                            style={{
                              padding: 8,
                              borderBottom: '1px solid #333',
                              minWidth: 60,
                              width: columnWidths[col.key],
                              maxWidth: columnWidths[col.key],
                              position: 'relative',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              userSelect: 'none',
                              borderRight: idx !== tradeColumns.length - 1 ? '2px solid #181828' : undefined,
                            }}
                          >
                            {col.label}
                            <span
                              onMouseDown={e => handleMouseDown(e, col.key)}
                              style={{
                                position: 'absolute',
                                right: 0,
                                top: 0,
                                height: '100%',
                                width: 8,
                                cursor: 'col-resize',
                                zIndex: 2,
                                background: 'rgba(24,24,40,0.7)',
                                display: 'inline-block',
                                borderRight: '2px solid #232346',
                              }}
                            />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCluster.trades.map((trade) => (
                        <tr key={trade.id} style={{ background: trade.profit_loss > 0 ? '#1e2f1e' : '#2f1e1e' }}>
                          {tradeColumns.map((col, idx) => (
                            <td
                              key={col.key}
                              style={{
                                padding: 8,
                                minWidth: 60,
                                width: columnWidths[col.key],
                                maxWidth: columnWidths[col.key],
                                overflow: col.key === 'entry_time' || col.key === 'exit_time' ? 'hidden' : undefined,
                                textOverflow: col.key === 'entry_time' || col.key === 'exit_time' ? 'ellipsis' : undefined,
                                whiteSpace: 'nowrap',
                                borderRight: idx !== tradeColumns.length - 1 ? '2px solid #181828' : undefined,
                              }}
                            >
                              {col.key === 'win'
                                ? (trade.win === true ? '✅' : trade.win === false ? '❌' : '')
                                : (col.key === 'entry_time' || col.key === 'exit_time') && typeof trade[col.key] === 'string'
                                  ? trade[col.key].replace('T', ' ').slice(0, 16)
                                  : typeof trade[col.key] === 'number' && col.key !== 'id' && col.key !== 'quantity' && col.key !== 'duration'
                                    ? trade[col.key].toFixed(2)
                                    : trade[col.key]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div style={{ color: '#b0b0b0' }}>Select a cluster to view metrics and trades.</div>
        )}
      </div>
    </div>
  );
};

export default PatternsPage; 