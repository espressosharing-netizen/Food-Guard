import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard'); // Changed default to dashboard
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
  
  // Edit Food mode state
  const [addFoodMode, setAddFoodMode] = useState('add'); // 'add' or 'edit'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemForEdit, setSelectedItemForEdit] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    category: '',
    quantity: 1,
    unit: 'each',
    storage_condition: 'pantry',
    notes: '',
    emoji: '',
    expiration_date: '' // START: Added expiration date
  });
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Meal Suggestions state
  const [mealType, setMealType] = useState('');
  const [mealStyle, setMealStyle] = useState('');
  const [maxTime, setMaxTime] = useState(60);
  const [servings, setServings] = useState(2);
  const [additionalPreferences, setAdditionalPreferences] = useState('');
  const [suggestedRecipes, setSuggestedRecipes] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // START: Added for Recipe Display Screen
  const [recipeDisplayMode, setRecipeDisplayMode] = useState(false);
  const [recipeQuantities, setRecipeQuantities] = useState({});

  const [profileLoading, setProfileLoading] = useState(false);
  const [allergies, setAllergies] = useState({
    nuts: false,
    dairy: false,
    gluten: false,
    shellfish: false,
    soy: false,
    egg: false,
  });
  const [diets, setDiets] = useState({
    vegan: false,
    vegetarian: false,
    keto: false,
    paleo: false,
    low_fodmap: false,
    pescatarian: false,
  });
  const [healthGoals, setHealthGoals] = useState({
    low_sugar: false,
    high_protein: false,
    low_sodium: false,
    heart_healthy: false,
    weight_loss: false,
    build_muscle: false,
  });
  const [dislikedIngredients, setDislikedIngredients] = useState([]);
  const [newDislikedIngredient, setNewDislikedIngredient] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    quantity: 1,
    unit: 'each',
    storage_condition: 'pantry',
    notes: '',
    emoji: '',
    expiration_date: ''
  });

  // Fetch data on component mount
  useEffect(() => {
    fetchAllData();
    // Refresh data every 30 seconds, but not when in Add tab to prevent form issues
    const interval = setInterval(() => {
      if (activeTab !== 'add') {
        fetchAllData();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [activeTab]);

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

const fetchProfileData = async () => {
    // TODO: Replace with actual backend fetch
    console.log("Fetching profile data...");
    try {
      // const response = await fetch(`${BACKEND_URL}/api/profile`);
      // if (response.ok) {
      //   const data = await response.json();
      //   setAllergies(data.allergies || { nuts: false, dairy: false, gluten: false, shellfish: false, soy: false, egg: false });
      //   setDiets(data.diets || { vegan: false, vegetarian: false, keto: false, paleo: false, low_fodmap: false, pescatarian: false });
      //   setHealthGoals(data.healthGoals || { low_sugar: false, high_protein: false, low_sodium: false, heart_healthy: false, weight_loss: false, build_muscle: false });
      //   setDislikedIngredients(data.dislikedIngredients || []);
      // }
    } catch (error) {
      console.error('Error fetching profile data:', error);
    }
  };

  const handleSaveProfile = async () => {
    setProfileLoading(true);
    // TODO: Replace with actual backend save
    console.log("Saving profile data...", { allergies, diets, healthGoals, dislikedIngredients });
    try {
      const profileData = {
        allergies,
        diets,
        healthGoals,
        dislikedIngredients,
      };
      // const response = await fetch(`${BACKEND_URL}/api/profile`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(profileData),
      // });
      // if (response.ok) {
      //   alert('Profile saved successfully!');
      // } else {
      //   alert('Failed to save profile.');
      // }
      
      // Simulating network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Profile saved successfully! (Mocked)');
      
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleProfileCheckboxChange = (setState, key) => {
    setState(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleAddDislikedIngredient = (e) => {
    e.preventDefault();
    const ingredient = newDislikedIngredient.trim().toLowerCase();
    if (ingredient && !dislikedIngredients.includes(ingredient)) {
      setDislikedIngredients(prev => [...prev, ingredient]);
      setNewDislikedIngredient('');
    }
  };

  const handleRemoveDislikedIngredient = (ingredientToRemove) => {
    setDislikedIngredients(prev => prev.filter(ing => ing !== ingredientToRemove));
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

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

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
          emoji: '',
          expiration_date: ''
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

// REPLACE the old deleteItemAfterQuantityZero function with this new one:
  const checkAndCleanUpZeroQuantityItems = async () => {
    // 1. Find all items with quantity 0 or less
    const itemsToDelete = foodItems.filter(item => item.quantity <= 0);

    // 2. If no items are found, do nothing
    if (itemsToDelete.length === 0) {
      return;
    }

    // 3. Create a list of names for the confirmation message
    const itemNames = itemsToDelete.map(item => `• ${item.name}`).join('\n');
    const shouldDelete = window.confirm(
      `The following items are at 0 quantity:\n\n` +
      `${itemNames}\n\n` +
      `Would you like to delete them from your inventory?`
    );

    // 4. If user confirms, delete all of them
    if (shouldDelete) {
      setLoading(true);
      try {
        const deletePromises = itemsToDelete.map(item =>
          fetch(`${BACKEND_URL}/api/food-items/${item.id}`, {
            method: 'DELETE',
          })
        );
        
        await Promise.all(deletePromises);
        alert('Successfully cleaned up 0-quantity items!');
        await fetchAllData(); // Refresh data one last time
      } catch (error) {
        console.error('Error cleaning up items:', error);
        alert('Failed to clean up all 0-quantity items.');
      } finally {
        setLoading(false);
      }
    }
  };

  // Edit Food Functions
  const handleSelectItemForEdit = async (item) => {
    // The 0-quantity check that was here has been REMOVED.
    // We now proceed directly to editing.
    
    setSelectedItemForEdit(item);
    setEditFormData({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      storage_condition: item.storage_condition,
      notes: item.notes || '',
      emoji: item.emoji || '',
      expiration_date: formatDateForInput(item.expiration_date) // START: Populate expiration date
    });
    setAiInstruction('');
  };

  const handleEditFromInventory = async (item) => {
    // Switch to edit mode
    setAddFoodMode('edit');
    // Pre-select the item for editing (or delete it)
    await handleSelectItemForEdit(item); // Added await
    // Navigate to the add tab
    setActiveTab('add');
  };

 // REPLACE this function to remove the 0-quantity check while typing
  const handleEditInputChange = (field, value) => {
    setEditFormData(prev => {
      const newState = { ...prev, [field]: value };
      
      // The immediate 0-quantity check that was here has been REMOVED.
      
      // Always return the new state for React to set
      return newState;
    });
  };


  const handleAiUpdate = async () => {
    if (!aiInstruction.trim() || !selectedItemForEdit) return;
    
    setAiLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/food-items/${selectedItemForEdit.id}/ai-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction: aiInstruction })
      });

      if (response.ok) {
        const data = await response.json();
        const updatedFields = data.updated_fields;
        
        // START: Check if AI returned an expiration date and format it
        if (updatedFields.expiration_date) {
          updatedFields.expiration_date = formatDateForInput(updatedFields.expiration_date);
        }
        // END: Check

        // Apply AI-suggested updates to the edit form
        setEditFormData(prev => ({
          ...prev,
          ...updatedFields
        }));
        
        alert('✨ AI has updated the fields! Review and click Save Changes to confirm.');
        setAiInstruction(''); // Clear instruction after successful update
      } else {
        const error = await response.json();
        alert(`AI Update Error: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error with AI update:', error);
      alert('Failed to get AI suggestions');
    } finally {
      setAiLoading(false);
    }
  };

  // REPLACE this function to call the new cleanup logic
  const handleSaveEditedItem = async (e) => {
    e.preventDefault();
    if (!selectedItemForEdit) return;

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/food-items/${selectedItemForEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      });

      if (response.ok) {
        await fetchAllData(); // 1. Refresh all data first
        alert('Food item updated successfully!'); // 2. Tell user it saved
        
        // 3. Reset edit mode (this returns to the search screen)
        setSelectedItemForEdit(null);
        setEditFormData({
          name: '',
          category: '',
          quantity: 1,
          unit: 'each',
          storage_condition: 'pantry',
          notes: '',
          emoji: '',
          expiration_date: ''
        });
        setAiInstruction('');
        
        // 4. AFTER saving and resetting, run the cleanup check
        await checkAndCleanUpZeroQuantityItems();
        
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error updating food item:', error);
      alert('Failed to update food item');
    } finally {
      setLoading(false);
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

  // Meal Suggestions Function
  const handleGetMealSuggestions = async () => {
    setSuggestionsLoading(true);
    setSuggestedRecipes([]);
    setSelectedRecipe(null);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/meal-suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: mealType,
          style: mealStyle,
          max_time: maxTime,
          servings: servings,
          additional_preferences: additionalPreferences,
          allergies: allergies,
          diets: diets,
          health_goals: healthGoals,
          disliked_ingredients: dislikedIngredients
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.recipes.length > 0) {
          setSuggestedRecipes(data.recipes);
        } else {
          alert('No recipes found. Try adjusting your preferences or add more items to your inventory.');
        }
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error fetching meal suggestions:', error);
      alert('Failed to get meal suggestions');
    } finally {
      setSuggestionsLoading(false);
    }
  };

const handleProceedWithRecipe = () => {
    if (!selectedRecipe || !selectedRecipe.ingredients) {
      alert("Error: No recipe selected or recipe has no ingredients.");
      return;
    }

    // Initialize the quantities state
    const initialQuantities = {};
    selectedRecipe.ingredients.forEach(ingredient => {
      // Check if the ingredient is linked to an inventory item
      if (ingredient.inventory_item_id) {
        // Pre-fill the state with the *required* amount.
        initialQuantities[ingredient.inventory_item_id] = ingredient.quantity_required;
      }
    });

    setRecipeQuantities(initialQuantities);
    setRecipeDisplayMode(true); 
  };

  const handleRecipeQuantityChange = (itemId, quantity) => {
    setRecipeQuantities(prev => ({
      ...prev,
      [itemId]: parseFloat(quantity) || 0 // Ensure it's a number
    }));
  };

  const handleCancelCooking = () => {
    setRecipeDisplayMode(false);
    setRecipeQuantities({});
    // We stay on the 'meals' tab, so the user is back at the filter/results screen
  };

  // REPLACE this function to call the new cleanup logic
  const handleFinishedCooking = async () => {
    setLoading(true);
    
    // ... (all the logic to build updatePromises is correct, no change there) ...
    const updatePromises = [];
    
    for (const itemId in recipeQuantities) {
      const quantityToSubtract = recipeQuantities[itemId];
      const itemToUpdate = foodItems.find(item => item.id === itemId);
      
      if (itemToUpdate) {
        const newQuantity = itemToUpdate.quantity - quantityToSubtract;
        const updatedItemPayload = {
          name: itemToUpdate.name,
          category: itemToUpdate.category,
          quantity: newQuantity < 0 ? 0 : newQuantity,
          unit: itemToUpdate.unit,
          storage_condition: itemToUpdate.storage_condition,
          notes: itemToUpdate.notes || '',
          emoji: itemToUpdate.emoji || '',
          expiration_date: formatDateForInput(itemToUpdate.expiration_date)
        };

        const promise = fetch(`${BACKEND_URL}/api/food-items/${itemId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedItemPayload)
        });
        
        updatePromises.push(promise);
        
      } else {
        console.warn(`Item with ID ${itemId} not found in inventory.`);
      }
    }

    try {
      const responses = await Promise.all(updatePromises);
      const allOk = responses.every(res => res.ok);
      
      if (allOk) {
        alert('Inventory updated successfully!');
        await fetchAllData(); // 1. Refresh all data
        
        // 2. Run the cleanup check
        await checkAndCleanUpZeroQuantityItems();
        
        // 3. Reset state and navigate
        setRecipeDisplayMode(false);
        setRecipeQuantities({});
        setSelectedRecipe(null);
        setActiveTab('inventory');
      } else {
        alert('Some items failed to update. Please check your inventory manually.');
        await fetchAllData();
      }
      
    } catch (error) {
      console.error('Error finishing cooking:', error);
      alert('Failed to update inventory.');
    } finally {
-      setLoading(false);
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

  // START: Added helper function to format date for <input type="date">
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    try {
      // Create date object. Handles ISO strings correctly.
      const date = new Date(dateString);
      
      // Get components in local time (which is what a user expects)
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error formatting date for input:', dateString, error);
      return ''; // Return empty string on error
    }
  };
  // END: Added helper function

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
  const renderDashboard = () => (
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
                {/* Q7: Increased text size */}
                <div className="text-base text-gray-600">{count} items</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="text-xl font-bold mb-4 text-gray-800">Recent Items</h3>
        <div className="space-y-2">
          {[...foodItems]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5)
            .map((item) => {
              const status = getExpirationStatus(item.expiration_date);
              return (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{item.emoji || getCategoryIcon(item.category)}</span>
                    <div>
                      <div className="font-semibold text-gray-800">{item.name}</div>
                      {/* Q7: Increased text size */}
                      <div className="text-base text-gray-600">{item.quantity} {item.unit}</div>
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
  const renderAddFoodForm = () => {
    // Filter food items based on search query
    const filteredItems = foodItems.filter(item => {
      const query = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.storage_condition.toLowerCase().includes(query) ||
        (item.notes && item.notes.toLowerCase().includes(query))
      );
    });

    return (
      <div className="card">
        {/* Mode Selector */}
        <div className="mb-6">
          <div className="flex gap-2 border-b border-gray-200">
            <button
              type="button"
              onClick={() => {
                setAddFoodMode('add');
                setSelectedItemForEdit(null);
                setSearchQuery('');
              }}
              className={`px-6 py-3 font-semibold transition-colors ${
                addFoodMode === 'add'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              ➕ Add New Food
            </button>
            <button
              type="button"
              onClick={() => {
                setAddFoodMode('edit');
                setSelectedItemForEdit(null);
                setSearchQuery('');
              }}
              className={`px-6 py-3 font-semibold transition-colors ${
                addFoodMode === 'edit'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              ✏️ Edit Existing Food
            </button>
          </div>
        </div>

        {/* Add New Food Mode */}
        {addFoodMode === 'add' && (
          <>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Add New Food Item</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          {/* Q7: Increased text size */}
          <label className="block text-base font-medium text-gray-700 mb-2">
            Food Name *
          </label>
          <input
            key="food-name-input"
            type="text"
            required
            className="input text-base" // Q7: Added text-base
            placeholder="e.g., Organic Bananas"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
          />
        </div>

<div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-base font-medium text-gray-700">
              Expiration Date (Optional)
            </label>
            <button
              type="button"
              onClick={() => handleInputChange('expiration_date', '')}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Clear
            </button>
          </div>
          <input
            type="date"
            className="input text-base"
            value={formData.expiration_date}
            onChange={(e) => handleInputChange('expiration_date', e.target.value)}
          />
        </div>

        {/* Q5: Kept 2-column grid */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            {/* Q7: Increased text size */}
            <label className="block text-base font-medium text-gray-700 mb-2">
              Quantity *
            </label>
            <input
              type="number"
              step="0.1"
              required
              className="input text-base" // Q7: Added text-base
              value={formData.quantity}
              onChange={(e) => handleInputChange('quantity', parseFloat(e.target.value) || 0)}
            />
          </div>

          <div>
            {/* Q7: Increased text size */}
            <label className="block text-base font-medium text-gray-700 mb-2">
              Unit
            </label>
            <select
              className="input text-base" // Q7: Added text-base
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

        {/* Q5: Kept 2-column grid */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            {/* Q7: Increased text size */}
            <label className="block text-base font-medium text-gray-700 mb-2">
              Category (Optional)
            </label>
            <select
              className="input text-base" // Q7: Added text-base
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
            {/* Q7: Increased text size */}
            <label className="block text-base font-medium text-gray-700 mb-2">
              Storage
            </label>
            <select
              className="input text-base" // Q7: Added text-base
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
          {/* Q7: Increased text size */}
          <label className="block text-base font-medium text-gray-700 mb-2">
            Notes (Optional)
          </label>
          <textarea
            key="food-notes-input"
            className="input text-base" // Q7: Added text-base
            rows="3"
            placeholder="Any additional notes..."
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-base font-medium text-gray-700"> {/* Q7: Increased text size */}
              Emoji (Optional - AI will choose if not selected)
            </label>
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="text-base text-blue-600 hover:text-blue-800" // Q7: Increased text size
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
          
          {/* Q6: Kept grid-cols-8 */}
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
          </>
        )}

        {/* Edit Existing Food Mode */}
        {addFoodMode === 'edit' && (
          <>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Edit Existing Food Item</h2>
            
            {/* Search Bar */}
            {!selectedItemForEdit && (
              <>
                <div className="mb-4">
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Search Food Items
                  </label>
                  <input
                    type="search"
                    className="input text-base"
                    placeholder="Search by name, category, storage, or notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Search Results */}
                {searchQuery && (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredItems.length > 0 ? (
                      filteredItems.map(item => (
                        <div
                          key={item.id}
                          onClick={() => handleSelectItemForEdit(item)}
                          className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 cursor-pointer transition"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-3xl">{item.emoji || '🍽️'}</span>
                              <div>
                                <h3 className="font-semibold text-gray-800">{item.name}</h3>
                                <p className="text-sm text-gray-600">
                                  {item.quantity} {item.unit} • {item.category} • {item.storage_condition}
                                </p>
                              </div>
                            </div>
                            <span className="text-blue-600">→</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4">No items found matching "{searchQuery}"</p>
                    )}
                  </div>
                )}

                {!searchQuery && (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-lg">👆 Start typing to search for a food item to edit</p>
                  </div>
                )}
              </>
            )}

            {/* Edit Form */}
            {selectedItemForEdit && (
              <div className="space-y-6">
                {/* Back Button */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedItemForEdit(null);
                    setSearchQuery('');
                    setAiInstruction('');
                  }}
                  className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
                >
                  ← Back to Search
                </button>

                {/* Selected Item Info */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{selectedItemForEdit.emoji || '🍽️'}</span>
                    <div>
                      <h3 className="font-bold text-lg text-gray-800">Editing: {selectedItemForEdit.name}</h3>
                      <p className="text-sm text-gray-600">
                        Current: {selectedItemForEdit.quantity} {selectedItemForEdit.unit}
                      </p>
                    </div>
                  </div>
                </div>

                {/* AI Editing Section */}
                <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <span>✨</span> AI-Powered Editing
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Describe what changed (e.g., "I ate half", "move to freezer", "added olive oil", "expires 3 days later")
                  </p>
                  <textarea
                    className="input text-base mb-3"
                    rows="2"
                    placeholder='e.g., "I only ate half of this" or "Move this to the freezer"'
                    value={aiInstruction}
                    onChange={(e) => setAiInstruction(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleAiUpdate}
                    disabled={aiLoading || !aiInstruction.trim()}
                    className="btn btn-primary w-full"
                  >
                    {aiLoading ? 'AI Processing...' : '✨ Update with AI'}
                  </button>
                </div>

                {/* Manual Edit Form */}
                <form onSubmit={handleSaveEditedItem} className="space-y-4">
                  <h3 className="font-semibold text-gray-800">Manual Editing Fields</h3>
                  
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-2">
                      Food Name *
                    </label>
                    <input
                      type="text"
                      required
                      className="input text-base"
                      placeholder="e.g., Organic Bananas"
                      value={editFormData.name}
                      onChange={(e) => handleEditInputChange('name', e.target.value)}
                    />
                  </div>

                  {/* START: Added Expiration Date Field */}
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-2">
                      Expiration Date *
                    </label>
                    <input
                      type="date"
                      required
                      className="input text-base"
                      value={editFormData.expiration_date}
                      onChange={(e) => handleEditInputChange('expiration_date', e.target.value)}
                    />
                  </div>
                  {/* END: Added Expiration Date Field */}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-2">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        className="input text-base"
                        value={editFormData.quantity}
                        onChange={(e) => handleEditInputChange('quantity', parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-2">
                        Unit
                      </label>
                      <select
                        className="input text-base"
                        value={editFormData.unit}
                        onChange={(e) => handleEditInputChange('unit', e.target.value)}
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
                      <label className="block text-base font-medium text-gray-700 mb-2">
                        Category
                      </label>
                      <select
                        className="input text-base"
                        value={editFormData.category}
                        onChange={(e) => handleEditInputChange('category', e.target.value)}
                      >
                        <option value="produce">Produce</option>
                        <option value="dairy">Dairy</option>
                        <option value="meat">Meat</option>
                        <option value="packaged">Packaged</option>
                        <option value="frozen">Frozen</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-2">
                        Storage
                      </label>
                      <select
                        className="input text-base"
                        value={editFormData.storage_condition}
                        onChange={(e) => handleEditInputChange('storage_condition', e.target.value)}
                      >
                        <option value="pantry">Pantry</option>
                        <option value="refrigerated">Refrigerated</option>
                        <option value="frozen">Frozen</option>
                        <option value="room_temp">Room Temperature</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      className="input text-base"
                      rows="3"
                      placeholder="Any additional notes..."
                      value={editFormData.notes}
                      onChange={(e) => handleEditInputChange('notes', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-2">
                      Emoji (Optional)
                    </label>
                    {editFormData.emoji && (
                      <div className="mb-2 p-2 bg-gray-50 rounded flex items-center justify-between">
                        <span className="text-2xl">{editFormData.emoji}</span>
                        <button
                          type="button"
                          onClick={() => handleEditInputChange('emoji', '')}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Clear
                        </button>
                      </div>
                    )}
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
                          onClick={() => handleEditInputChange('emoji', emoji)}
                          className="text-2xl hover:bg-gray-200 rounded p-1 transition"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedItemForEdit(null);
                        setSearchQuery('');
                        setAiInstruction('');
                      }}
                      className="btn bg-gray-500 text-white hover:bg-gray-600 flex-1"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn btn-primary flex-1"
                    >
                      {loading ? 'Saving...' : '💾 Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}
    </div>
  );
  };

  // Inventory Component
  // Inventory Component
  const renderInventory = () => {
    const handleFilterChange = async (newFilter) => {
      setFilterStatus(newFilter);
      await fetchFoodItems(newFilter);
    };

    return (
      <div className="card">
        {/* Q2: Changed layout to stack on mobile */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 md:mb-0">Food Inventory</h2>
          
          {/* Filter Container */}
          <div>
            {/* Q2: Mobile Dropdown */}
            <div className="block md:hidden">
              <label htmlFor="filter-select" className="sr-only">Filter items</label>
              <select
                id="filter-select"
                value={filterStatus}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="input text-base w-full" // Q7: Added text-base
              >
                <option value="all">All</option>
                <option value="expired">Expired</option>
                <option value="expiring_soon">Expiring (1-7d)</option> {/* Q2: Abbreviated */}
                <option value="fresh">Fresh (+7d)</option> {/* Q2: Abbreviated */}
              </select>
            </div>
            
            {/* Q2: Desktop Buttons */}
            <div className="hidden md:flex gap-2">
              <button
                onClick={() => handleFilterChange('all')}
                className={`px-3 py-1 rounded text-base font-medium transition ${ // Q7: text-base
                  filterStatus === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All
              </button>
              <button
                onClick={() => handleFilterChange('expired')}
                className={`px-3 py-1 rounded text-base font-medium transition ${ // Q7: text-base
                  filterStatus === 'expired'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Expired
              </button>
              <button
                onClick={() => handleFilterChange('expiring_soon')}
                className={`px-3 py-1 rounded text-base font-medium transition ${ // Q7: text-base
                  filterStatus === 'expiring_soon'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Expiring (1-7d) {/* Q2: Abbreviated */}
              </button>
              <button
                onClick={() => handleFilterChange('fresh')}
                className={`px-3 py-1 rounded text-base font-medium transition ${ // Q7: text-base
                  filterStatus === 'fresh'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Fresh (+7d) {/* Q2: Abbreviated */}
              </button>
            </div>
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
            {/* Q3: Reworked food item card layout */}
            {foodItems.map((item) => {
              const status = getExpirationStatus(item.expiration_date);
              return (
                <div key={item.id} className="food-item">
                  {/* Row 1: Emoji, Name, Status, Delete */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3 flex-1"> {/* Container for Emoji + (Name+Badge) */}
                      <span className="text-3xl">{item.emoji || getCategoryIcon(item.category)}</span>
                      
                      {/* New container for Name + Badge */}
                      {/* I've added flex-wrap and gaps to handle wrapping on small screens */}
                      <div className="flex items-center flex-wrap gap-x-3 gap-y-1"> 
                        <div className="font-bold text-lg text-gray-800">{item.name}</div>
                        {/* MOVED BADGE HERE */}
                        <span className={`badge ${status.color}`}>{status.label}</span>
                      </div>

                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditFromInventory(item)}
                        className="btn-icon bg-blue-500 hover:bg-blue-600 text-white"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="btn-icon btn-danger"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  
                  {/* Row 2: Details (indented) */}
                  <div className="mt-2 pl-10"> {/* Indent past the emoji (approx 2.5rem) */}
                    <div className="text-base text-gray-600 space-y-1"> {/* Q7: Increased from text-sm */}
                      {/* BADGE REMOVED FROM HERE */}
                      <div>📊 {item.quantity} {item.unit} • {getStorageIcon(item.storage_condition)} {item.storage_condition}</div>
                      <div>🗓️ Added: {formatDate(item.purchase_date)}</div>
                      <div>⏰ Expires: {formatDate(item.expiration_date)}</div>
                      {item.storage_tips && <div>📌 {item.storage_tips}</div>}
                      {item.notes && <div>📝 {item.notes}</div>}
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

  // Meal Suggestions Component
  const renderMealSuggestions = () => (
    <div className="card">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">🍽️ Meal Suggestions</h2>
      <p className="text-gray-600 mb-6">Get AI-powered meal suggestions based on your available ingredients</p>

      {/* Filters Section */}
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Meal Type */}
          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              Meal Type
            </label>
            <select
              className="input text-base"
              value={mealType}
              onChange={(e) => setMealType(e.target.value)}
            >
              <option value="">Any</option>
              <option value="Starters">Starters</option>
              <option value="Main Course">Main Course</option>
              <option value="Desserts">Desserts</option>
              <option value="Soup">Soup</option>
              <option value="Salads">Salads</option>
              <option value="Beverages">Beverages</option>
              <option value="Breakfast">Breakfast</option>
              <option value="Snacks">Snacks</option>
            </select>
          </div>

          {/* Style/Cuisine */}
          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              Style/Cuisine
            </label>
            <select
              className="input text-base"
              value={mealStyle}
              onChange={(e) => setMealStyle(e.target.value)}
            >
              <option value="">Any</option>
              <option value="Italian">Italian</option>
              <option value="Mexican">Mexican</option>
              <option value="Asian">Asian</option>
              <option value="Chinese">Chinese</option>
              <option value="Japanese">Japanese</option>
              <option value="Indian">Indian</option>
              <option value="Mediterranean">Mediterranean</option>
              <option value="American">American</option>
              <option value="French">French</option>
              <option value="Thai">Thai</option>
              <option value="Vegan">Vegan</option>
              <option value="Vegetarian">Vegetarian</option>
              <option value="Keto">Keto</option>
              <option value="Paleo">Paleo</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Max Time */}
          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              Max Cooking Time: {maxTime} minutes
            </label>
            <input
              type="range"
              min="15"
              max="120"
              step="5"
              value={maxTime}
              onChange={(e) => setMaxTime(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>15 min</span>
              <span>120 min</span>
            </div>
          </div>

          {/* Servings */}
          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              Number of Servings
            </label>
            <input
              type="number"
              min="1"
              max="12"
              value={servings}
              onChange={(e) => setServings(parseInt(e.target.value) || 1)}
              className="input text-base"
            />
          </div>
        </div>

        {/* Additional Preferences */}
        <div>
          <label className="block text-base font-medium text-gray-700 mb-2">
            Additional Preferences (Optional)
          </label>
          <input
            type="text"
            className="input text-base"
            placeholder='e.g., "no nuts", "spicy", "low-carb", "gluten-free"'
            value={additionalPreferences}
            onChange={(e) => setAdditionalPreferences(e.target.value)}
          />
        </div>

        {/* Suggest Button */}
        <button
          onClick={handleGetMealSuggestions}
          disabled={suggestionsLoading}
          className="btn btn-primary w-full"
        >
          {suggestionsLoading ? '🤖 AI Thinking...' : '✨ Suggest Meals'}
        </button>
      </div>

      {/* Results Area */}
      {suggestedRecipes.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Recipe Suggestions:</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {suggestedRecipes.map((recipe, index) => (
              <div
                key={index}
                onClick={() => setSelectedRecipe(recipe)}
                className={`cursor-pointer p-4 border-2 rounded-lg transition-all ${
                  selectedRecipe === recipe
                    ? 'border-blue-600 bg-blue-50 shadow-lg'
                    : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-bold text-lg text-gray-800 flex-1">{recipe.name}</h4>
                  {selectedRecipe === recipe && (
                    <span className="text-blue-600 text-xl">✓</span>
                  )}
                </div>
                
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <span>👥</span>
                    <span>Serves {recipe.servings}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>⏱️</span>
                    <span>{recipe.total_time || (recipe.prep_time + recipe.cook_time)} min</span>
                  </div>
                  {recipe.prep_time && recipe.cook_time && (
                    <div className="text-xs text-gray-500">
                      (Prep: {recipe.prep_time}m, Cook: {recipe.cook_time}m)
                    </div>
                  )}
                </div>
                
                {recipe.description && (
                  <p className="mt-2 text-sm text-gray-600 italic">{recipe.description}</p>
                )}
                
                {recipe.ingredients_used && recipe.ingredients_used.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs font-semibold text-gray-700 mb-1">Uses from inventory:</p>
                    <div className="flex flex-wrap gap-1">
                      {recipe.ingredients_used.slice(0, 3).map((ing, i) => (
                        <span key={i} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          ✓ {ing}
                        </span>
                      ))}
                      {recipe.ingredients_used.length > 3 && (
                        <span className="text-xs text-gray-500">+{recipe.ingredients_used.length - 3} more</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Proceed Button */}
          {selectedRecipe && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-gray-700 mb-3">
                <strong>Selected:</strong> {selectedRecipe.name}
              </p>
              <button
                className="btn btn-primary w-full md:w-auto"
                onClick={handleProceedWithRecipe} // <-- CHANGED THIS LINE
              >
                📋 Proceed with Recipe
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!suggestionsLoading && suggestedRecipes.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-lg">👨‍🍳 Set your preferences and click "Suggest Meals" to get started!</p>
        </div>
      )}
    </div>
  );

const renderRecipeDisplayScreen = () => {
    if (!selectedRecipe) return null; 

    // Helper to find the inventory item for a given ingredient
    const getInventoryItem = (ingredient) => {
      if (!ingredient.inventory_item_id) return null;
      return foodItems.find(item => item.id === ingredient.inventory_item_id);
    };

    return (
      <div className="card space-y-6">
        {/* 1. Recipe Title */}
        <h2 className="text-3xl font-bold text-gray-800 text-center">{selectedRecipe.name}</h2>
        
        {/* 2. Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Section 1: Ingredients */}
          <div className="bg-gray-50 p-6 rounded-lg shadow-inner">
            <h3 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">Ingredients</h3>
            <div className="space-y-4">
              {selectedRecipe.ingredients && selectedRecipe.ingredients.map((ing, index) => {
                const inventoryItem = getInventoryItem(ing);
                
                if (inventoryItem) {
                  // Item is AVAILABLE
                  const status = getExpirationStatus(inventoryItem.expiration_date);
                  const quantityToUse = recipeQuantities[inventoryItem.id] || 0;
                  
                  return (
                    <div key={inventoryItem.id} className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex items-center justify-between">
                        {/* Food Item Card (Name, Emoji, Expiry) */}
                        <div className="flex items-center space-x-3">
                          <span className="text-3xl">{inventoryItem.emoji || getCategoryIcon(inventoryItem.category)}</span>
                          <div>
                            <div className="font-bold text-gray-800">{inventoryItem.name}</div>
                            <span className={`badge ${status.color}`}>{status.label}</span>
                          </div>
                        </div>
                        
                        {/* Quantity Input Field */}
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            step="0.1"
                            value={quantityToUse}
                            onChange={(e) => handleRecipeQuantityChange(inventoryItem.id, e.target.value)}
                            className="w-20 text-right input text-base"
                          />
                          <span className="text-gray-600 w-10 text-left">{inventoryItem.unit}</span>
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-500 mt-1" style={{paddingRight: '4.5rem'}}>
                        (Available: {inventoryItem.quantity} {inventoryItem.unit})
                      </div>
                    </div>
                  );
                } else {
                  // Item is NOT AVAILABLE (Shopping List Item)
                  return (
                    <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-gray-800">{ing.name}</div>
                          <div className="text-sm text-red-600">Not in inventory</div>
                        </div>
                        <div className="text-gray-700 font-medium">
                          {ing.quantity_required} {ing.unit}
                        </div>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </div>

          {/* Section 2: Cooking Steps */}
          <div className="bg-blue-50 p-6 rounded-lg shadow-inner">
            <h3 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">Cooking Steps</h3>
            {/* Check if instructions is an array or a string */}
            {Array.isArray(selectedRecipe.instructions) ? (
              <ol className="list-decimal list-inside space-y-3 text-gray-700">
                {selectedRecipe.instructions.map((step, index) => (
                  <li key={index} className="leading-relaxed">{step}</li>
                ))}
              </ol>
            ) : (
              // Fallback for single string instructions (split by newline)
              <div className="text-gray-700 whitespace-pre-line leading-relaxed">
                {selectedRecipe.instructions}
              </div>
            )}
          </div>
        </div>

        {/* 3. Buttons */}
        <div className="flex justify-between items-center pt-4 border-t">
          {/* Cancel Button */}
          <button
            onClick={handleCancelCooking}
            disabled={loading}
            className="btn bg-gray-500 text-white hover:bg-gray-600"
          >
            Cancel Cooking
          </button>
          
          {/* Finished Button */}
          <button
            onClick={handleFinishedCooking}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? 'Updating Inventory...' : '✅ Finished Cooking'}
          </button>
        </div>
      </div>
    );
  };

  // Calendar Component
  const renderCalendar = () => {
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
                      {/* Q7: Increased text size */}
                      <div className="text-base text-gray-600">{event.description}</div>
                      {/* Q7: Increased text size */}
                      <span className="text-sm text-gray-500 capitalize">{event.event_type.replace('_', ' ')}</span>
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

const renderProfile = () => {
    
    const renderCheckboxGrid = (title, state, setState) => (
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-3 text-gray-800">{title}</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.keys(state).map((key) => (
            <label
              key={key}
              className={`flex items-center space-x-2 p-3 rounded-lg border-2 cursor-pointer transition ${
                state[key]
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <input
                type="checkbox"
                checked={state[key]}
                onChange={() => handleProfileCheckboxChange(setState, key)}
                className="form-checkbox h-5 w-5 text-blue-600 rounded"
              />
              <span className="text-base font-medium text-gray-700 capitalize">
                {key.replace('_', ' ')}
              </span>
            </label>
          ))}
        </div>
      </div>
    );

    return (
      <div className="card">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">👤 Dietary Profile</h2>
        <p className="text-gray-600 mb-6 -mt-4">
          Help the AI understand your preferences for better meal suggestions.
        </p>

        {/* Allergies */}
        {renderCheckboxGrid('Allergies (Hard Rules)', allergies, setAllergies)}

        {/* Diets */}
        {renderCheckboxGrid('Diets', diets, setDiets)}

        {/* Health Goals */}
        {renderCheckboxGrid('Health Goals', healthGoals, setHealthGoals)}

        {/* Disliked Ingredients */}
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-3 text-gray-800">Never Show Me This</h3>
          <p className="text-gray-600 mb-3 text-sm">
            Add ingredients you hate (e.g., mushrooms, cilantro, olives).
          </p>
          <form onSubmit={handleAddDislikedIngredient} className="flex gap-2 mb-3">
            <input
              type="text"
              value={newDislikedIngredient}
              onChange={(e) => setNewDislikedIngredient(e.target.value)}
              placeholder="e.g., Mushrooms"
              className="input text-base flex-1"
            />
            <button type="submit" className="btn btn-primary">
              Add
            </button>
          </form>
          <div className="flex flex-wrap gap-2">
            {dislikedIngredients.length === 0 ? (
              <p className="text-gray-500 text-sm">No disliked ingredients added yet.</p>
            ) : (
              dislikedIngredients.map((ing) => (
                <span
                  key={ing}
                  className="flex items-center gap-2 bg-red-100 text-red-800 text-sm font-medium px-3 py-1 rounded-full"
                >
                  <span className="capitalize">{ing}</span>
                  <button
                  s   type="button"
                    onClick={() => handleRemoveDislikedIngredient(ing)}
                    className="text-red-600 hover:text-red-800 font-bold"
                  >
                    ✖
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="border-t pt-4">
          <button
            onClick={handleSaveProfile}
            disabled={profileLoading}
            className="btn btn-primary w-full"
          >
            {profileLoading ? 'Saving...' : '💾 Save Profile'}
          </button>
        </div>
      </div>
    );
  };

  // Notification Panel
  const renderNotificationPanel = () => (
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
                  {/* Q7: Increased text size */}
                  <div className="text-base text-gray-600">{notif.message}</div>
                  {/* Q7: Increased text size */}
                  <div className="text-sm text-gray-500 mt-1">
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

      {/* Q4: Desktop Navigation (hidden on mobile) */}
      {/* REORDERED TABS */}
      <nav className="nav hidden md:flex">
        <button
          className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button
          className={`nav-btn ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          📦 Inventory
        </button>
        <button
          className={`nav-btn ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => setActiveTab('add')}
        >
          ➕ Add Food
        </button>
        <button
          className={`nav-btn ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          📅 Calendar
        </button>
        <button
          className={`nav-btn ${activeTab === 'meals' ? 'active' : ''}`}
          onClick={() => setActiveTab('meals')}
        >
          🍽️ Meal Suggestions
        </button>
        <button
          className={`nav-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          👤 Profile
        </button>
      </nav>

      {/* Main Content */}
      {/* Q4: Added padding-bottom for mobile nav */}
      <main className="main-content pb-16 md:pb-0">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'add' && renderAddFoodForm()}
        {activeTab === 'inventory' && renderInventory()}
        {activeTab === 'calendar' && renderCalendar()}
        
        {activeTab === 'meals' && !recipeDisplayMode && renderMealSuggestions()}
        {activeTab === 'meals' && recipeDisplayMode && renderRecipeDisplayScreen()}
        {activeTab === 'profile' && renderProfile()}
      </main>

      {/* Q4: Mobile Bottom Navigation (hidden on desktop) */}
      {/* REORDERED TABS */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-around items-center bg-white border-t border-gray-200 h-16 md:hidden">
        <button
          className={`flex flex-col items-center justify-center p-2 w-1/6 ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <span className="text-2xl">📊</span>
          <span className="text-xs mt-1">Dashboard</span>
        </button>
        <button
          className={`flex flex-col items-center justify-center p-2 w-1/6 ${activeTab === 'inventory' ? 'text-blue-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab('inventory')}
        >
          <span className="text-2xl">📦</span>
          <span className="text-xs mt-1">Inventory</span>
        </button>
        <button
          className={`flex flex-col items-center justify-center p-2 w-1/6 ${activeTab === 'add' ? 'text-blue-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab('add')}
        >
          <span className="text-2xl">➕</span>
          <span className="text-xs mt-1">Add</span>
        </button>
        <button
          className={`flex flex-col items-center justify-center p-2 w-1/6 ${activeTab === 'calendar' ? 'text-blue-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab('calendar')}
        >
          <span className="text-2xl">📅</span>
          <span className="text-xs mt-1">Calendar</span>
        </button>
        <button
          className={`flex flex-col items-center justify-center p-2 w-1/6 ${activeTab === 'meals' ? 'text-blue-600' : 'text-gray-600'}`}
Opening save dialog
          onClick={() => setActiveTab('meals')}
        >
          <span className="text-2xl">🍽️</span>
          <span className="text-xs mt-1">Meals</span>
        </button>
        <button
          className={`flex flex-col items-center justify-center p-2 w-1/6 ${activeTab === 'profile' ? 'text-blue-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab('profile')}
        >
          <span className="text-2xl">👤</span>
          <span className="text-xs mt-1">Profile</span>
        </button>
      </nav>

      {/* Notification Panel */}
      {renderNotificationPanel()}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Confirm Delete</h3>
              {/* Q7: Added text-base */}
              <p className="text-gray-600 mb-6 text-base">
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
