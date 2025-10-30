from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import uuid
from openai import AsyncOpenAI
import json

load_dotenv()

app = FastAPI(title="Home Food Management System")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client.food_management

# DeepSeek client
deepseek_client = AsyncOpenAI(
    api_key=os.environ.get('DEEPSEEK_API_KEY'),
    base_url=os.environ.get('DEEPSEEK_BASE_URL')
)

# Pydantic Models
class FoodItemCreate(BaseModel):
    name: str
    category: Optional[str] = None
    quantity: float = 1.0
    unit: str = "each"
    storage_condition: str = "pantry"
    purchase_date: Optional[str] = None
    notes: Optional[str] = None
    emoji: Optional[str] = None

class FoodItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: str
    quantity: float
    unit: str
    storage_condition: str
    purchase_date: str
    expiration_date: str
    current_state: str = "raw"
    notes: Optional[str] = None
    emoji: Optional[str] = None
    storage_tips: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Organic Bananas",
                "category": "produce",
                "quantity": 2.5,
                "unit": "lbs"
            }
        }

class NotificationItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    food_item_id: str
    food_name: str
    notification_type: str
    message: str
    priority: str
    is_read: bool = False
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class CalendarEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    food_item_id: str
    food_name: str
    event_type: str
    event_date: str
    title: str
    description: str
    color: str
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

# Helper function to use DeepSeek AI
# START: Modified function signature to accept storage_condition
async def analyze_food_with_ai(food_name: str, category: Optional[str] = None, storage_condition: Optional[str] = "pantry"):
    """Use DeepSeek to analyze food item and suggest category, shelf life, and emoji."""
    try:
        # START: Updated prompt to use the storage_condition for shelf_life calculation
        prompt = f"""Analyze this food item based on its intended storage condition and provide structured information:
Food: {food_name}
Intended Storage: {storage_condition}
{f"Suggested Category: {category}" if category else ""}

Return a JSON object with:
{{
    "category": "produce|dairy|meat|packaged|frozen|other",
    "shelf_life_days": <number of days, **specifically for the given 'Intended Storage'**>,
    "storage_recommendation": "pantry|refrigerated|frozen|room_temp",
    "emoji": "<single most appropriate emoji for this food>",
    "tips": "brief storage tip"
}}

Example: If Food is "Chicken Breast" and Intended Storage is "frozen", shelf_life_days should be 90-365. If Intended Storage is "refrigerated", it should be 1-2.

Be concise and accurate. The 'shelf_life_days' MUST match the 'Intended Storage' provided."""
        # END: Updated prompt

        response = await deepseek_client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": "You are a food safety and storage expert. Provide accurate, concise information in JSON format only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=500
        )
        
        content = response.choices[0].message.content.strip()
        
        # Try to extract JSON from the response
        if '```json' in content:
            content = content.split('```json')[1].split('```')[0].strip()
        elif '```' in content:
            content = content.split('```')[1].split('```')[0].strip()
            
        result = json.loads(content)
        return result
        
    except Exception as e:
        print(f"AI analysis failed: {e}")
        # Return default values
        return {
            "category": category or "other",
            "shelf_life_days": 7,
            "storage_recommendation": storage_condition or "pantry", # START: Use passed-in storage
            "emoji": "🍽️",
            "tips": "Store in a cool, dry place"
        }
# END: Modified function

def calculate_expiration_date(purchase_date: str, shelf_life_days: int) -> str:
    """Calculate expiration date based on purchase date and shelf life."""
    purchase_dt = datetime.fromisoformat(purchase_date)
    expiration_dt = purchase_dt + timedelta(days=shelf_life_days)
    return expiration_dt.isoformat()

async def create_calendar_events(food_item: dict):
    """Create calendar events for food expiration reminders."""
    try:
        expiration_date = datetime.fromisoformat(food_item['expiration_date'])
    except (ValueError, TypeError):
        print(f"Invalid expiration date for item {food_item.get('id')}. Skipping calendar events.")
        return # Skip event creation if date is invalid
        
    events = []
    current_time = datetime.utcnow()
    
    # Event configurations: (days_before, type, color, priority)
    event_configs = [
        (3, "warning", "#FFA500", "medium"),
        (1, "urgent", "#FF4444", "high"),
        (0, "expires_today", "#FF0000", "critical")
    ]
    
    for days_before, event_type, color, priority in event_configs:
        event_date = expiration_date - timedelta(days=days_before)
        
        # Only create calendar event if event_date is in the future
        if event_date >= current_time:
            event = CalendarEvent(
                food_item_id=food_item['id'],
                food_name=food_item['name'],
                event_type=event_type,
                event_date=event_date.isoformat(),
                title=f"{food_item['name']} - {event_type.replace('_', ' ').title()}",
                description=f"{food_item['name']} expires on {expiration_date.strftime('%Y-%m-%d')}",
                color=color
            )
            events.append(event.model_dump())
            
            # Only create notification if it's the actual day (within 24 hours of event_date)
            # Check if today is the day when notification should be sent
            time_until_event = event_date - current_time
            hours_until_event = time_until_event.total_seconds() / 3600
            
            # Only create notification if event is happening today (within next 24 hours)
            if 0 <= hours_until_event <= 24: # START: Ensure it's not in the past
                notification = NotificationItem(
                    food_item_id=food_item['id'],
                    food_name=food_item['name'],
                    notification_type=event_type,
                    message=f"{food_item['name']} {'expires today' if days_before == 0 else f'expires in {days_before} day(s)'}!",
                    priority=priority
                )
                await db.notifications.insert_one(notification.model_dump())
    
    if events:
        await db.calendar_events.insert_many(events)

# API Endpoints
@app.get("/")
async def root():
    return {"message": "Home Food Management System API", "status": "running"}

@app.post("/api/food-items", response_model=FoodItem)
async def create_food_item(item: FoodItemCreate):
    """Create a new food item with AI-powered analysis."""
    try:
        # START: Pass storage_condition to the AI
        ai_analysis = await analyze_food_with_ai(item.name, item.category, item.storage_condition)
        # END: Pass storage_condition
        
        # Use AI suggestions if not provided
        category = item.category or ai_analysis.get('category', 'other')
        
        # START: Logic to set storage. User's choice is primary.
        # AI can only override if user chose the default 'pantry' and AI has a better idea.
        storage = item.storage_condition 
        if item.storage_condition == "pantry":
            storage = ai_analysis.get('storage_recommendation', 'pantry')
        # END: Logic to set storage
        
        # Use user-provided emoji or AI-suggested emoji
        emoji = item.emoji or ai_analysis.get('emoji', '🍽️')
        
        # Extract storage tips from AI analysis
        storage_tips = ai_analysis.get('tips', None)
        
        # Calculate dates
        purchase_date = item.purchase_date or datetime.utcnow().isoformat()
        # Shelf life is now correctly based on the intended storage
        shelf_life_days = ai_analysis.get('shelf_life_days', 7)
        expiration_date = calculate_expiration_date(purchase_date, shelf_life_days)
        
        # Create food item
        food_item = FoodItem(
            name=item.name,
            category=category,
            quantity=item.quantity,
            unit=item.unit,
            storage_condition=storage,
            purchase_date=purchase_date,
            expiration_date=expiration_date,
            notes=item.notes,
            emoji=emoji,
            storage_tips=storage_tips
        )
        
        # Save to database
        food_dict = food_item.model_dump()
        await db.food_items.insert_one(food_dict)
        
        # Create calendar events and notifications
        await create_calendar_events(food_dict)
        
        return food_item
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create food item: {str(e)}")

@app.get("/api/food-items", response_model=List[FoodItem])
async def get_food_items(filter: Optional[str] = None):
    """Get all food items with optional filtering by expiration status.
    
    Filter options:
    - expired: Items that have already expired
    - expiring_soon: Items expiring within 1-7 days
    - fresh: Items expiring in more than 7 days
    - all or None: All items
    """
    items = await db.food_items.find().to_list(length=None)
    
    # Apply filtering if requested
    if filter and filter != "all":
        now = datetime.utcnow()
        filtered_items = []
        
        for item in items:
            try:
                expiration_date = datetime.fromisoformat(item['expiration_date'])
                days_until_expiry = (expiration_date - now).days
            except (ValueError, TypeError):
                days_until_expiry = -999 # Treat invalid dates as expired
            
            if filter == "expired" and days_until_expiry < 0:
                filtered_items.append(item)
            elif filter == "expiring_soon" and 0 <= days_until_expiry <= 7:
                filtered_items.append(item)
            elif filter == "fresh" and days_until_expiry > 7:
                filtered_items.append(item)
        
        items = filtered_items
    
    for item in items:
        item.pop('_id', None)
    return items

@app.get("/api/food-items/{item_id}", response_model=FoodItem)
async def get_food_item(item_id: str):
    """Get a specific food item."""
    item = await db.food_items.find_one({"id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Food item not found")
    item.pop('_id', None)
    return item

@app.put("/api/food-items/{item_id}", response_model=FoodItem)
async def update_food_item(item_id: str, updates: dict):
    """Update a food item."""
    
    # START: Ensure expiration_date is in correct ISO format if present
    if 'expiration_date' in updates and updates['expiration_date']:
        try:
            # This handles both 'YYYY-MM-DD' and full ISO strings
            updates['expiration_date'] = datetime.fromisoformat(updates['expiration_date']).isoformat()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid expiration_date format. Use YYYY-MM-DD.")
    # END: Date formatting
            
    result = await db.food_items.update_one(
        {"id": item_id},
        {"$set": updates}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Food item not found")
    
    item = await db.food_items.find_one({"id": item_id})
    
    # START: Handle re-calculating calendar events if expiration date changed
    if 'expiration_date' in updates:
        # Delete old events for this item
        await db.calendar_events.delete_many({"food_item_id": item_id})
        await db.notifications.delete_many({"food_item_id": item_id})
        
        # Create new events based on the new date
        await create_calendar_events(item)
    # END: Handle re-calculating events
    
    item.pop('_id', None)
    return item

@app.post("/api/food-items/{item_id}/ai-update")
async def ai_update_food_item(item_id: str, request: dict):
    """Use AI to update food item based on natural language instruction."""
    try:
        # Get the current food item
        item = await db.food_items.find_one({"id": item_id})
        if not item:
            raise HTTPException(status_code=404, detail="Food item not found")
        
        instruction = request.get("instruction", "")
        if not instruction:
            raise HTTPException(status_code=400, detail="Instruction is required")
        
        # START: Get current date and format expiration date for AI
        current_date = datetime.utcnow()
        current_date_iso = current_date.isoformat().split('T')[0] # YYYY-MM-DD
        
        current_expiration_date_str = item.get("expiration_date", "")
        if current_expiration_date_str:
            try:
                current_expiration_date_obj = datetime.fromisoformat(current_expiration_date_str)
                current_expiration_date_iso = current_expiration_date_obj.isoformat().split('T')[0]
            except ValueError:
                current_expiration_date_iso = "" # Handle invalid date in DB
        else:
            current_expiration_date_iso = ""
        # END: Get current date

        # Prepare current item data for AI
        current_data = {
            "name": item.get("name"),
            "category": item.get("category"),
            "quantity": item.get("quantity"),
            "unit": item.get("unit"),
            "storage_condition": item.get("storage_condition"),
            "expiration_date": current_expiration_date_iso, # Pass YYYY-MM-DD
            "notes": item.get("notes", ""),
            "emoji": item.get("emoji", "")
        }
        
        # START: Create dynamic example for "add 2 days"
        try:
            example_add_date = (datetime.fromisoformat(current_expiration_date_iso + 'T00:00:00') + timedelta(days=2)).isoformat().split('T')[0]
        except ValueError:
            example_add_date = (current_date + timedelta(days=2)).isoformat().split('T')[0] # Fallback
        # END: Create dynamic example

        # Create prompt for AI
        prompt = f"""You are helping update a food item based on a user's instruction.

Current Date: {current_date_iso}

Current food item data:
- Name: {current_data['name']}
- Category: {current_data['category']}
- Quantity: {current_data['quantity']}
- Unit: {current_data['unit']}
- Storage Condition: {current_data['storage_condition']}
- Expiration Date: {current_data['expiration_date']}
- Notes: {current_data['notes']}
- Emoji: {current_data['emoji']}

User instruction: "{instruction}"

Based on this instruction, calculate and return ONLY the updated values that should change. Return a JSON object with the fields that need updating.
**Important**: For `expiration_date`, always return the new, absolute date in **`YYYY-MM-DD`** format. Calculate it based on the **Current Date** ({current_date_iso}).

Examples:
- "I only ate half of this" → {{"quantity": {current_data['quantity'] / 2}}}
- "Move this to the freezer" → {{"storage_condition": "frozen"}}
- "Change name to leftover chicken" → {{"name": "leftover chicken"}}
- "This expires in 3 days" → {{"expiration_date": "{(current_date + timedelta(days=3)).isoformat().split('T')[0]}"}}
- "This expires tomorrow" → {{"expiration_date": "{(current_date + timedelta(days=1)).isoformat().split('T')[0]}"}}
- "This is rotten" or "It expired yesterday" → {{"expiration_date": "{(current_date - timedelta(days=1)).isoformat().split('T')[0]}"}}
- "Add 2 days to the expiration date" → {{"expiration_date": "{example_add_date}"}}

Available categories: produce, dairy, meat, packaged, frozen, other
Available storage conditions: pantry, refrigerated, frozen, room_temp
Available units: each, lbs, oz, kg, g, gallon, liter

Return ONLY a JSON object with the fields to update. Do not include fields that don't need to change."""

        response = await deepseek_client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that interprets food-related instructions and returns JSON updates. Always respond with valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=500
        )
        
        content = response.choices[0].message.content.strip()
        
        # Extract JSON from response
        if '```json' in content:
            content = content.split('```json')[1].split('```')[0].strip()
        elif '```' in content:
            content = content.split('```')[1].split('```')[0].strip()
        
        updated_fields = json.loads(content)
        
        # Return the updated fields (frontend will apply them)
        return {
            "success": True,
            "updated_fields": updated_fields,
            "message": "AI analysis complete"
        }
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse AI response")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI update failed: {str(e)}")

@app.delete("/api/food-items/{item_id}")
async def delete_food_item(item_id: str):
    """Delete a food item."""
    result = await db.food_items.delete_one({"id": item_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Food item not found")
    
    # Also delete related calendar events and notifications
    await db.calendar_events.delete_many({"food_item_id": item_id})
    await db.notifications.delete_many({"food_item_id": item_id})
    
    return {"message": "Food item deleted successfully"}

@app.get("/api/notifications", response_model=List[NotificationItem])
async def get_notifications():
    """Get all notifications."""
    notifications = await db.notifications.find().sort("created_at", -1).to_list(length=None)
    for notif in notifications:
        notif.pop('_id', None)
    return notifications

@app.get("/api/notifications/unread")
async def get_unread_count():
    """Get count of unread notifications."""
    count = await db.notifications.count_documents({"is_read": False})
    return {"unread_count": count}

@app.put("/api/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    """Mark a notification as read."""
    result = await db.notifications.update_one(
        {"id": notification_id},
        {"$set": {"is_read": True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification marked as read"}

@app.get("/api/calendar-events", response_model=List[CalendarEvent])
async def get_calendar_events():
    """Get all calendar events."""
    events = await db.calendar_events.find().sort("event_date", 1).to_list(length=None)
    for event in events:
        event.pop('_id', None)
    return events

@app.get("/api/dashboard/stats")
async def get_dashboard_stats():
    """Get dashboard statistics."""
    total_items = await db.food_items.count_documents({})
    
    # Count expiring soon (within 3 days)
    three_days_from_now = (datetime.utcnow() + timedelta(days=3)).isoformat()
    now = datetime.utcnow().isoformat()
    
    expiring_soon = await db.food_items.count_documents({
        "expiration_date": {"$lte": three_days_from_now, "$gte": now} # START: Changed logic
    })
    
    # Count expired items
    expired = await db.food_items.count_documents({
        "expiration_date": {"$lt": now}
    })
    
    # Count by category
    pipeline = [
        {"$group": {"_id": "$category", "count": {"$sum": 1}}}
    ]
    categories = await db.food_items.aggregate(pipeline).to_list(length=None)
    category_breakdown = {item['_id']: item['count'] for item in categories}
    
    return {
        "total_items": total_items,
        "expiring_soon": expiring_soon,
        "expired": expired,
        "category_breakdown": category_breakdown
    }

@app.post("/api/meal-suggestions")
async def get_meal_suggestions(request: dict):
    """Generate meal suggestions based on available inventory and user preferences."""
    try:
        # Get user preferences
        meal_type = request.get("type", "")
        style = request.get("style", "")
        max_time = request.get("max_time", 60)
        servings = request.get("servings", 2)
        additional_prefs = request.get("additional_preferences", "")
        
        # Fetch all food items
        items = await db.food_items.find().to_list(length=None)
        
        # Filter out expired items and calculate days until expiration
        now = datetime.utcnow()
        available_items = []
        
        for item in items:
            try:
                expiration_date = datetime.fromisoformat(item['expiration_date'])
                days_left = (expiration_date - now).days
            except (ValueError, TypeError):
                days_left = -1 # Treat invalid dates as expired
            
            # START: Modified to include 'inventory_item_id'
            if days_left > 0 and item.get('quantity', 0) > 0:
                available_items.append({
                    'inventory_item_id': item['id'], # <-- CRITICAL ADDITION
                    'name': item['name'],
                    'quantity': item['quantity'],
                    'unit': item['unit'],
                    'category': item['category'],
                    'days_left': days_left
                })
            # END: Modified
        
        # Sort by expiration date (items expiring soonest first)
        available_items.sort(key=lambda x: x['days_left'])
        
        if not available_items:
            return {
                "success": False,
                "message": "No available ingredients in inventory",
                "recipes": []
            }
        
        # START: Modified to include the new 'inventory_item_id' in the prompt
        inventory_text = "\n".join([
            f"- [id: {item['inventory_item_id']}] {item['name']} ({item['quantity']} {item['unit']}) - expires in {item['days_left']} days"
            for item in available_items[:15]  # Limit to top 15 items
        ])
        # END: Modified
        
        # START: Updated AI prompt for full recipe details
        prompt = f"""You are a creative chef assistant. Based on the available ingredients, suggest 3 delicious recipes.

Available Ingredients (prioritized by expiration date):
{inventory_text}

User Preferences:
- Meal Type: {meal_type if meal_type else "Any"}
- Style/Cuisine: {style if style else "Any"}
- Max Cooking Time: {max_time} minutes
- Servings: {servings} people
- Additional Preferences: {additional_prefs if additional_prefs else "None"}

Requirements:
1. Prioritize using ingredients that expire soonest from the "Available Ingredients" list.
2. Each recipe should use at least 2-3 ingredients from the available list.
3. Recipes must match the user's preferences and not exceed the "Max Cooking Time".
4. Provide a *full* list of all ingredients required (both from inventory and new ones like oil, spices).
5. Provide step-by-step cooking instructions.

Return EXACTLY 3 recipe suggestions in this JSON format:
{{
  "recipes": [
    {{
      "name": "Recipe Name",
      "servings": {servings},
      "prep_time": <number in minutes>,
      "cook_time": <number in minutes>,
      "total_time": <prep_time + cook_time>,
      "description": "Brief 1-sentence description",
      "ingredients_used": ["name of ingredient1 from inventory", "name of ingredient2 from inventory"],
      "ingredients": [
        {{
          "name": "Full ingredient name",
          "quantity_required": <numeric amount>,
          "unit": "e.g., g, ml, tbsp, each",
          "inventory_item_id": "<The 'id' from the Available Ingredients list IF this item is from the inventory, otherwise null>"
        }}
      ],
      "instructions": [
        "Step 1 as a string.",
        "Step 2 as a string.",
        "..."
      ]
    }}
  ]
}}

Example for 'ingredients' list:
- If inventory has "[id: 123-abc] Chicken Breast", a recipe ingredient should be:
  {{"name": "Chicken Breast", "quantity_required": 200, "unit": "g", "inventory_item_id": "123-abc"}}
- If the recipe needs Olive Oil (which is not in the inventory list):
  {{"name": "Olive Oil", "quantity_required": 1, "unit": "tbsp", "inventory_item_id": null}}

Important: Total time must not exceed {max_time} minutes. Return ONLY valid JSON."""
        # END: Updated AI prompt

        response = await deepseek_client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": "You are a creative chef that suggests recipes based on available ingredients. Always respond with valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=2500 # Increased max tokens to handle long instructions
        )
        
        content = response.choices[0].message.content.strip()
        
        # Extract JSON from response
        if '```json' in content:
            content = content.split('```json')[1].split('```')[0].strip()
        elif '```' in content:
            content = content.split('```')[1].split('```')[0].strip()
        
        result = json.loads(content)
        recipes = result.get("recipes", [])
        
        return {
            "success": True,
            "recipes": recipes,
            "available_items_count": len(available_items)
        }
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse AI response")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Meal suggestion failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
