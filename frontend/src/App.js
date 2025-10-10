import React, { useState, useEffect } from 'react';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [foodItems, setFoodItems] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    quantity: 1,
    unit: 'each',
    storage_condition: 'pantry',
    notes: '',
    emoji: ''
  });

  // Fetch data on component mount
  useEffect(() => {
    fetchAllData();
    // Refresh data every 30 seconds
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAllData = async () => {
    try {
      await Promise.all([
        fetchFoodItems(),
        fetchNotifications(),
        fetchCalendarEvents(),
        fetchDashboardStats(),
        fetchUnreadCount()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchFoodItems = async (filter = 'all') => {
    try {
      const url = filter && filter !== 'all' 
        ? `${BACKEND_URL}/api/food-items?filter=${filter}`
        : `${BACKEND_URL}/api/food-items`;
      const response = await fetch(url);
      const data = await response.json();
      
      // Sort items by expiration date (closest to expiration first)
      const sortedData = data.sort((a, b) => {
        const dateA = new Date(a.expiration_date);
        const dateB = new Date(b.expiration_date);
        return dateA - dateB;
      });
      
      setFoodItems(sortedData);
    } catch (error) {
      console.error('Error fetching food items:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/notifications`);
      const data = await response.json();
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchCalendarEvents = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/calendar-events`);
      const data = await response.json();
      setCalendarEvents(data);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/dashboard/stats`);
      const data = await response.json();
      setDashboardStats(data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/notifications/unread`);
      const data = await response.json();
      setUnreadCount(data.unread_count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/food-items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        // Reset form
        setFormData({
          name: '',
          category: '',
          quantity: 1,
          unit: 'each',
          storage_condition: 'pantry',
          notes: '',
          emoji: ''
        });
        setShowEmojiPicker(false);

        // Refresh data
        await fetchAllData();
        alert('Food item added successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error adding food item:', error);
      alert('Failed to add food item');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (itemId) => {
    setItemToDelete(itemId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/food-items/${itemToDelete}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchAllData();
        alert('Food item deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting food item:', error);
      alert('Failed to delete food item');
    } finally {
      setShowDeleteConfirm(false);
      setItemToDelete(null);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await fetch(`${BACKEND_URL}/api/notifications/${notificationId}/read`, {
        method: 'PUT',
      });
      await fetchNotifications();
      await fetchUnreadCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getDaysUntilExpiration = (expirationDate) => {
    const now = new Date();
    const expiry = new Date(expirationDate);
    const diffTime = expiry - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpirationStatus = (expirationDate) => {
    const days = getDaysUntilExpiration(expirationDate);
    if (days < 0) return { label: 'Expired', color: 'bg-red-100 text-red-800' };
    if (days === 0) return { label: 'Expires Today', color: 'bg-red-100 text-red-800' };
    if (days <= 3) return { label: `${days} days left`, color: 'bg-orange-100 text-orange-800' };
    if (days <= 7) return { label: `${days} days left`, color: 'bg-yellow-100 text-yellow-800' };
    return { label: `${days} days left`, color: 'bg-green-100 text-green-800' };
  };

  const getCategoryIcon = (category) => {
    const icons = {
      produce: '🥬',
      dairy: '🥛',
      meat: '🥩',
      packaged: '📦',
      frozen: '❄️',
      other: '🍽️'
    };
    return icons[category] || '🍽️';
  };

  const getStorageIcon = (storage_condition) => {
    const icons = {
      frozen: '❄️',
      refrigerated: '🥛',
      pantry: '📦',
      room_temp: '🌡️'
    };
    return icons[storage_condition] || '📦';
  };

  // Dashboard Component
  const Dashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="stat-card bg-gradient-to-br from-blue-500 to-blue-600">
          <div className="stat-icon">📊</div>
          <div className="stat-value">{dashboardStats.total_items || 0}</div>
          <div className="stat-label">Total Items</div>
        </div>

        <div className="stat-card bg-gradient-to-br from-orange-500 to-orange-600">
          <div className="stat-icon">⚠️</div>
          <div className="stat-value">{dashboardStats.expiring_soon || 0}</div>
          <div className="stat-label">Expiring Soon</div>
        </div>

        <div className="stat-card bg-gradient-to-br from-red-500 to-red-600">
          <div className="stat-icon">🚫</div>
          <div className="stat-value">{dashboardStats.expired || 0}</div>
          <div className="stat-label">Expired</div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-xl font-bold mb-4 text-gray-800">Category Breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(dashboardStats.category_breakdown || {}).map(([category, count]) => (
            <div key={category} className="category-badge">
              <span className="text-2xl">{getCategoryIcon(category)}</span>
              <div className="ml-3">
                <div className="font-semibold capitalize text-gray-800">{category}</div>
                <div className="text-sm text-gray-600">{count} items</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="text-xl font-bold mb-4 text-gray-800">Recent Items</h3>
        <div className="space-y-2">
          {[...foodItems].reverse().slice(0, 5).map((item) => {
            const status = getExpirationStatus(item.expiration_date);
            return (
              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{item.emoji || getCategoryIcon(item.category)}</span>
                  <div>
                    <div className="font-semibold text-gray-800">{item.name}</div>
                    <div className="text-sm text-gray-600">{item.quantity} {item.unit}</div>
                  </div>
                </div>
                <span className={`badge ${status.color}`}>{status.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Add Food Form Component
  const AddFoodForm = () => (
    <div className="card">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Add New Food Item</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Food Name *
          </label>
          <input
            type="text"
            required
            className="input"
            placeholder="e.g., Organic Bananas"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity *
            </label>
            <input
              type="number"
              step="0.1"
              required
              className="input"
              value={formData.quantity}
              onChange={(e) => handleInputChange('quantity', parseFloat(e.target.value) || 0)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Unit
            </label>
            <select
              className="input"
              value={formData.unit}
              onChange={(e) => handleInputChange('unit', e.target.value)}
            >
              <option value="each">Each</option>
              <option value="lbs">Pounds (lbs)</option>
              <option value="oz">Ounces (oz)</option>
              <option value="kg">Kilograms (kg)</option>
              <option value="g">Grams (g)</option>
              <option value="gallon">Gallon</option>
              <option value="liter">Liter</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category (Optional)
            </label>
            <select
              className="input"
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
            >
              <option value="">Auto-detect</option>
              <option value="produce">Produce</option>
              <option value="dairy">Dairy</option>
              <option value="meat">Meat</option>
              <option value="packaged">Packaged</option>
              <option value="frozen">Frozen</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Storage
            </label>
            <select
              className="input"
              value={formData.storage_condition}
              onChange={(e) => handleInputChange('storage_condition', e.target.value)}
            >
              <option value="pantry">Pantry</option>
              <option value="refrigerated">Refrigerated</option>
              <option value="frozen">Frozen</option>
              <option value="room_temp">Room Temperature</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (Optional)
          </label>
          <textarea
            className="input"
            rows="3"
            placeholder="Any additional notes..."
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Emoji (Optional - AI will choose if not selected)
            </label>
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showEmojiPicker ? '▼ Hide' : '▶ Show Emoji Options'}
            </button>
          </div>
          
          {formData.emoji && (
            <div className="mb-2 p-2 bg-gray-50 rounded flex items-center justify-between">
              <span className="text-2xl">{formData.emoji}</span>
              <button
                type="button"
                onClick={() => handleInputChange('emoji', '')}
                className="text-xs text-red-600 hover:text-red-800"
              >
                Clear
              </button>
            </div>
          )}
          
          {showEmojiPicker && (
            <div className="p-4 border border-gray-300 rounded-lg bg-gray-50 grid grid-cols-8 gap-2">
              {['🍎', '🍌', '🍊', '🍇', '🥕', '🥦', '🥬', '🥒', 
                '🍅', '🥔', '🧅', '🧄', '🥛', '🧀', '🥩', '🍗',
                '🐟', '🍤', '🥚', '🍞', '🥐', '🥖', '🥯', '🍕',
                '🍝', '🍜', '🍚', '🥫', '🍯', '🧂', '🧈', '🥤',
                '☕', '🍵', '🧃', '🧊', '🍪', '🍰', '🧁', '🍫',
                '🍬', '🍭', '🥜', '🌰', '🍿', '🧇', '🥞', '🧆'].map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    handleInputChange('emoji', emoji);
                    setShowEmojiPicker(false);
                  }}
                  className="text-2xl hover:bg-gray-200 rounded p-1 transition"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full"
        >
          {loading ? 'Adding...' : '✨ Add Food Item (AI-Powered)'}
        </button>
      </form>
    </div>
  );

  // Inventory Component
  const Inventory = () => {
    const handleFilterChange = async (newFilter) => {
      setFilterStatus(newFilter);
      await fetchFoodItems(newFilter);
    };

    return (
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Food Inventory</h2>
          <div className="flex gap-2">
            <button
              onClick={() => handleFilterChange('all')}
              className={`px-3 py-1 rounded text-sm font-medium transition ${
                filterStatus === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleFilterChange('expired')}
              className={`px-3 py-1 rounded text-sm font-medium transition ${
                filterStatus === 'expired'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Expired
            </button>
            <button
              onClick={() => handleFilterChange('expiring_soon')}
              className={`px-3 py-1 rounded text-sm font-medium transition ${
                filterStatus === 'expiring_soon'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Expiring Soon (1-7 days)
            </button>
            <button
              onClick={() => handleFilterChange('fresh')}
              className={`px-3 py-1 rounded text-sm font-medium transition ${
                filterStatus === 'fresh'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Fresh (&gt;7 days)
            </button>
          </div>
        </div>
        
        {foodItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🍽️</div>
            <p className="text-gray-600">
              {filterStatus === 'all' ? 'No food items yet. Add your first item!' : `No ${filterStatus.replace('_', ' ')} items found.`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {foodItems.map((item) => {
              const status = getExpirationStatus(item.expiration_date);
              return (
                <div key={item.id} className="food-item">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <span className="text-3xl">{item.emoji || getCategoryIcon(item.category)}</span>
                      <div className="flex-1">
                        <div className="font-bold text-lg text-gray-800">{item.name}</div>
                        <div className="text-sm text-gray-600 space-y-1 mt-1">
                          <div>📊 {item.quantity} {item.unit} • {getStorageIcon(item.storage_condition)} {item.storage_condition}</div>
                          <div>🗓️ Added: {formatDate(item.purchase_date)}</div>
                          <div>⏰ Expires: {formatDate(item.expiration_date)}</div>
                          {item.notes && <div>📝 {item.notes}</div>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`badge ${status.color}`}>{status.label}</span>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="btn-icon btn-danger"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Calendar Component
  const Calendar = () => {
    const groupedEvents = {};
    
    calendarEvents.forEach(event => {
      const date = formatDate(event.event_date);
      if (!groupedEvents[date]) {
        groupedEvents[date] = [];
      }
      groupedEvents[date].push(event);
    });

    return (
      <div className="card">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Expiration Calendar</h2>
        
        {calendarEvents.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📅</div>
            <p className="text-gray-600">No upcoming events</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedEvents).map(([date, events]) => (
              <div key={date} className="calendar-day">
                <div className="calendar-date">{date}</div>
                <div className="space-y-2">
                  {events.map(event => (
                    <div
                      key={event.id}
                      className="calendar-event"
                      style={{ borderLeftColor: event.color }}
                    >
                      <div className="font-semibold text-gray-800">{event.title}</div>
                      <div className="text-sm text-gray-600">{event.description}</div>
                      <span className="text-xs text-gray-500 capitalize">{event.event_type.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Notification Panel
  const NotificationPanel = () => (
    <div className={`notification-panel ${showNotifications ? 'show' : ''}`}>
      <div className="notification-header">
        <h3 className="text-lg font-bold">Notifications</h3>
        <button
          onClick={() => setShowNotifications(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      <div className="notification-list">
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🔔</div>
            <p>No notifications</p>
          </div>
        ) : (
          notifications.map(notif => (
            <div
              key={notif.id}
              className={`notification-item ${notif.is_read ? 'read' : 'unread'}`}
              onClick={() => !notif.is_read && markAsRead(notif.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">{notif.food_name}</div>
                  <div className="text-sm text-gray-600">{notif.message}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(notif.created_at).toLocaleString()}
                  </div>
                </div>
                {!notif.is_read && <span className="unread-dot"></span>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <h1 className="header-title">🏠 Home Food Management</h1>
          <button
            className="notification-bell"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            🔔
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </button>
        </div>
      </header>

      {/* Navigation */}
      <nav className="nav">
        <button
          className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button
          className={`nav-btn ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => setActiveTab('add')}
        >
          ➕ Add Food
        </button>
        <button
          className={`nav-btn ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          📦 Inventory
        </button>
        <button
          className={`nav-btn ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          📅 Calendar
        </button>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'add' && <AddFoodForm />}
        {activeTab === 'inventory' && <Inventory />}
        {activeTab === 'calendar' && <Calendar />}
      </main>

      {/* Notification Panel */}
      <NotificationPanel />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Confirm Delete</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this item? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setItemToDelete(null);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Overlay */}
      {showNotifications && (
        <div
          className="overlay"
          onClick={() => setShowNotifications(false)}
        />
      )}
    </div>
  );
}

export default App;