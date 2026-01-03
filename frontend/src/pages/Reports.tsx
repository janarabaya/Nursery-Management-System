import { useState, useEffect } from 'react';
import { useRequireRole } from '../utils/useAuth';
import { API_BASE_URL } from '../config/api';
import './Reports.css';

interface SalesData {
  totalSales: number;
  totalOrders: number;
  dailySales: Array<{ date: string; total: number; count: number }>;
  salesByStatus: Array<{ status: string; total: number; count: number }>;
  dateRange: {
    start: string;
    end: string;
  };
}

interface OrdersData {
  totalOrders: number;
  ordersByStatus: Array<{ status: string; count: number }>;
  ordersByDate: Array<{ date: string; count: number }>;
  dateRange: {
    start: string;
    end: string;
  };
}

interface TopSellingPlant {
  plant_id: number;
  plant_name: string;
  total_sold: number;
  total_revenue: number;
  order_count: number;
}

type ReportType = 'sales' | 'orders' | 'top-selling';

export function Reports() {
  const { user, isLoading, hasAccess } = useRequireRole(['manager', 'agricultural_engineer']);
  const [selectedReport, setSelectedReport] = useState<ReportType>('sales');
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [ordersData, setOrdersData] = useState<OrdersData | null>(null);
  const [topSellingPlants, setTopSellingPlants] = useState<TopSellingPlant[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [period, setPeriod] = useState<'daily' | 'monthly'>('daily');

  useEffect(() => {
    if (!isLoading && hasAccess) {
      fetchReports();
    }
  }, [isLoading, hasAccess, selectedReport, dateRange, period]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');

      if (selectedReport === 'sales') {
        const response = await fetch(
          `${API_BASE_URL}/reports/sales-detailed?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setSalesData(data);
        } else {
          // Mock data
          setSalesData({
            totalSales: 45230,
            totalOrders: 156,
            dailySales: [
              { date: '2024-01-15', total: 5200, count: 12 },
              { date: '2024-01-16', total: 6800, count: 15 },
              { date: '2024-01-17', total: 4500, count: 10 },
            ],
            salesByStatus: [
              { status: 'completed', total: 40000, count: 133 },
              { status: 'pending', total: 5230, count: 23 },
            ],
            dateRange: {
              start: dateRange.startDate,
              end: dateRange.endDate,
            },
          });
        }
      } else if (selectedReport === 'orders') {
        const response = await fetch(
          `${API_BASE_URL}/reports/orders-detailed?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setOrdersData(data);
        } else {
          // Mock data
          setOrdersData({
            totalOrders: 156,
            ordersByStatus: [
              { status: 'completed', count: 133 },
              { status: 'pending', count: 23 },
            ],
            ordersByDate: [
              { date: '2024-01-15', count: 12 },
              { date: '2024-01-16', count: 15 },
              { date: '2024-01-17', count: 10 },
            ],
            dateRange: {
              start: dateRange.startDate,
              end: dateRange.endDate,
            },
          });
        }
      } else if (selectedReport === 'top-selling') {
        const response = await fetch(
          `${API_BASE_URL}/reports/top-selling?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setTopSellingPlants(data);
        } else {
          // Mock data
          setTopSellingPlants([
            { plant_id: 1, plant_name: 'Tomato Seedling', total_sold: 150, total_revenue: 1200, order_count: 45 },
            { plant_id: 2, plant_name: 'Olive Seedling', total_sold: 120, total_revenue: 1800, order_count: 38 },
            { plant_id: 3, plant_name: 'Strawberry Seedling', total_sold: 95, total_revenue: 1140, order_count: 32 },
          ]);
        }
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMaxValue = (data: number[]) => {
    return Math.max(...data, 1);
  };

  const renderBarChart = (data: Array<{ date: string; total?: number; count?: number }>, type: 'sales' | 'orders') => {
    const values = data.map(d => type === 'sales' ? (d.total || 0) : (d.count || 0));
    const maxValue = getMaxValue(values);

    return (
      <div className="bar-chart">
        {data.map((item, index) => {
          const value = type === 'sales' ? (item.total || 0) : (item.count || 0);
          const height = (value / maxValue) * 100;
          const date = new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

          return (
            <div key={index} className="bar-item">
              <div className="bar-wrapper">
                <div
                  className="bar"
                  style={{ height: `${height}%` }}
                  title={`${date}: ${type === 'sales' ? `₪${value.toLocaleString()}` : `${value} orders`}`}
                >
                  <span className="bar-value">{type === 'sales' ? `₪${(value / 1000).toFixed(0)}k` : value}</span>
                </div>
              </div>
              <span className="bar-label">{date}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderPieChart = (data: Array<{ status: string; total?: number; count?: number }>, type: 'sales' | 'orders') => {
    const total = data.reduce((sum, item) => sum + (type === 'sales' ? (item.total || 0) : (item.count || 0)), 0);
    let currentAngle = 0;
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

    return (
      <div className="pie-chart">
        <svg viewBox="0 0 200 200" className="pie-svg">
          {data.map((item, index) => {
            const value = type === 'sales' ? (item.total || 0) : (item.count || 0);
            const percentage = (value / total) * 100;
            const angle = (percentage / 100) * 360;
            const startAngle = currentAngle;
            currentAngle += angle;

            const x1 = 100 + 80 * Math.cos((startAngle - 90) * (Math.PI / 180));
            const y1 = 100 + 80 * Math.sin((startAngle - 90) * (Math.PI / 180));
            const x2 = 100 + 80 * Math.cos((currentAngle - 90) * (Math.PI / 180));
            const y2 = 100 + 80 * Math.sin((currentAngle - 90) * (Math.PI / 180));
            const largeArc = angle > 180 ? 1 : 0;

            return (
              <path
                key={index}
                d={`M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`}
                fill={colors[index % colors.length]}
                className="pie-segment"
              />
            );
          })}
        </svg>
        <div className="pie-legend">
          {data.map((item, index) => (
            <div key={index} className="legend-item">
              <span className="legend-color" style={{ backgroundColor: colors[index % colors.length] }}></span>
              <span className="legend-label">{item.status}</span>
              <span className="legend-value">
                {type === 'sales' ? `₪${(item.total || 0).toLocaleString()}` : `${item.count || 0} orders`}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="reports-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="reports">
      <div className="reports-content">
        <header className="reports-header">
          <div className="header-left">
            <h1>Sales and Orders Reports</h1>
            <p className="welcome-text">View detailed sales, orders, and top-selling plants reports</p>
          </div>
        </header>

        <div className="reports-controls">
          <div className="report-type-selector">
            <button
              className={`report-type-btn ${selectedReport === 'sales' ? 'active' : ''}`}
              onClick={() => setSelectedReport('sales')}
            >
              Sales Report
            </button>
            <button
              className={`report-type-btn ${selectedReport === 'orders' ? 'active' : ''}`}
              onClick={() => setSelectedReport('orders')}
            >
              Orders Report
            </button>
            <button
              className={`report-type-btn ${selectedReport === 'top-selling' ? 'active' : ''}`}
              onClick={() => setSelectedReport('top-selling')}
            >
              Top Selling Plants
            </button>
          </div>

          <div className="date-range-filters">
            <div className="filter-group">
              <label>Start Date:</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              />
            </div>
            <div className="filter-group">
              <label>End Date:</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              />
            </div>
            <div className="filter-group">
              <label>Period:</label>
              <select value={period} onChange={(e) => setPeriod(e.target.value as 'daily' | 'monthly')}>
                <option value="daily">Daily</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <button className="refresh-btn" onClick={fetchReports}>
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner-small"></div>
            <p>Loading report data...</p>
          </div>
        ) : (
          <>
            {selectedReport === 'sales' && salesData && (
              <div className="report-content">
                <div className="dashboard-section">
                  <div className="section-header">
                    <div className="section-header-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="1" x2="12" y2="23"></line>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                      </svg>
                    </div>
                    <h2>Sales Report</h2>
                  </div>

                  <div className="report-summary">
                    <div className="summary-card">
                      <h3>Total Sales</h3>
                      <p className="summary-value">₪{salesData.totalSales.toLocaleString()}</p>
                    </div>
                    <div className="summary-card">
                      <h3>Total Orders</h3>
                      <p className="summary-value">{salesData.totalOrders}</p>
                    </div>
                    <div className="summary-card">
                      <h3>Average Order Value</h3>
                      <p className="summary-value">
                        ₪{salesData.totalOrders > 0 ? (salesData.totalSales / salesData.totalOrders).toFixed(2) : 0}
                      </p>
                    </div>
                  </div>

                  <div className="chart-section">
                    <h3>Daily Sales Trend</h3>
                    {renderBarChart(salesData.dailySales, 'sales')}
                  </div>

                  <div className="chart-section">
                    <h3>Sales by Status</h3>
                    {renderPieChart(salesData.salesByStatus, 'sales')}
                  </div>

                  <div className="table-section">
                    <h3>Daily Sales Breakdown</h3>
                    <div className="report-table-container">
                      <table className="report-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Total Sales</th>
                            <th>Number of Orders</th>
                            <th>Average Order</th>
                          </tr>
                        </thead>
                        <tbody>
                          {salesData.dailySales.map((item, index) => (
                            <tr key={index}>
                              <td>{new Date(item.date).toLocaleDateString()}</td>
                              <td>₪{parseFloat(item.total.toString()).toLocaleString()}</td>
                              <td>{item.count}</td>
                              <td>₪{item.count > 0 ? (parseFloat(item.total.toString()) / item.count).toFixed(2) : 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedReport === 'orders' && ordersData && (
              <div className="report-content">
                <div className="dashboard-section">
                  <div className="section-header">
                    <div className="section-header-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path>
                        <path d="M3 6h18"></path>
                        <path d="M16 10a4 4 0 0 1-8 0"></path>
                      </svg>
                    </div>
                    <h2>Orders Report</h2>
                  </div>

                  <div className="report-summary">
                    <div className="summary-card">
                      <h3>Total Orders</h3>
                      <p className="summary-value">{ordersData.totalOrders}</p>
                    </div>
                    {ordersData.ordersByStatus.map((status, index) => (
                      <div key={index} className="summary-card">
                        <h3>{status.status.charAt(0).toUpperCase() + status.status.slice(1)} Orders</h3>
                        <p className="summary-value">{status.count}</p>
                      </div>
                    ))}
                  </div>

                  <div className="chart-section">
                    <h3>Orders Trend</h3>
                    {renderBarChart(ordersData.ordersByDate, 'orders')}
                  </div>

                  <div className="chart-section">
                    <h3>Orders by Status</h3>
                    {renderPieChart(ordersData.ordersByStatus, 'orders')}
                  </div>

                  <div className="table-section">
                    <h3>Orders Breakdown</h3>
                    <div className="report-table-container">
                      <table className="report-table">
                        <thead>
                          <tr>
                            <th>Status</th>
                            <th>Number of Orders</th>
                            <th>Percentage</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ordersData.ordersByStatus.map((item, index) => (
                            <tr key={index}>
                              <td>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</td>
                              <td>{item.count}</td>
                              <td>
                                {ordersData.totalOrders > 0
                                  ? ((item.count / ordersData.totalOrders) * 100).toFixed(1)
                                  : 0}
                                %
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedReport === 'top-selling' && (
              <div className="report-content">
                <div className="dashboard-section">
                  <div className="section-header">
                    <div className="section-header-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                      </svg>
                    </div>
                    <h2>Top Selling Plants</h2>
                  </div>

                  {topSellingPlants.length === 0 ? (
                    <div className="empty-state">
                      <p>No sales data available for the selected period.</p>
                    </div>
                  ) : (
                    <>
                      <div className="table-section">
                        <div className="report-table-container">
                          <table className="report-table">
                            <thead>
                              <tr>
                                <th>Rank</th>
                                <th>Plant Name</th>
                                <th>Total Sold</th>
                                <th>Total Revenue</th>
                                <th>Number of Orders</th>
                                <th>Average Price</th>
                              </tr>
                            </thead>
                            <tbody>
                              {topSellingPlants.map((plant, index) => (
                                <tr key={plant.plant_id}>
                                  <td>
                                    <span className="rank-badge">{index + 1}</span>
                                  </td>
                                  <td className="plant-name">{plant.plant_name}</td>
                                  <td>{plant.total_sold || 0} units</td>
                                  <td>₪{(plant.total_revenue || 0).toLocaleString()}</td>
                                  <td>{plant.order_count || 0}</td>
                                  <td>
                                    ₪
                                    {plant.total_sold > 0 && plant.total_revenue
                                      ? (plant.total_revenue / plant.total_sold).toFixed(2)
                                      : 0}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="chart-section">
                        <h3>Top Selling Plants Revenue</h3>
                        <div className="bar-chart horizontal">
                          {topSellingPlants.map((plant, index) => {
                            const maxRevenue = getMaxValue(topSellingPlants.map(p => p.total_revenue || 0));
                            const revenue = plant.total_revenue || 0;
                            const width = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;

                            return (
                              <div key={plant.plant_id} className="bar-item horizontal">
                                <span className="bar-label">{plant.plant_name}</span>
                                <div className="bar-wrapper horizontal">
                                  <div
                                    className="bar horizontal"
                                    style={{ width: `${width}%` }}
                                    title={`₪${revenue.toLocaleString()}`}
                                  >
                                    <span className="bar-value">₪{revenue.toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

