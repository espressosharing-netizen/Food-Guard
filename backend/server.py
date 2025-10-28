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
async def analyze_food_with_ai(food_name: str, category: Optional[str] = None):
    """Use DeepSeek to analyze food item and suggest category, shelf life, and emoji."""
    try:
        prompt = f"""Analyze this food item and provide structured information:
Food: {food_name}
{f"Suggested Category: {category}" if category else ""}

Return a JSON object with:
{{
    "category": "produce|dairy|meat|packaged|frozen|other",
    "shelf_life_days": <number of days>,
    "storage_recommendation": "pantry|refrigerated|frozen|room_temp",
    "emoji": "<single most appropriate emoji for this food>",
    "tips": "brief storage tip"
}}

Be concise and accurate. Choose the most representative emoji for the food item."""

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
            "storage_recommendation": "pantry",
            "emoji": "🍽️",
            "tips": "Store in a cool, dry place"
        }

def calculate_expiration_date(purchase_date: str, shelf_life_days: int) -> str:
    """Calculate expiration date based on purchase date and shelf life."""
    purchase_dt = datetime.fromisoformat(purchase_date)
    expiration_dt = purchase_dt + timedelta(days=shelf_life_days)
    return expiration_dt.isoformat()

async def create_calendar_events(food_item: dict):
    """Create calendar events for food expiration reminders."""
    expiration_date = datetime.fromisoformat(food_item['expiration_date'])
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
            if hours_until_event <= 24:
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
        # Use AI to analyze the food item
        ai_analysis = await analyze_food_with_ai(item.name, item.category)
        
        # Use AI suggestions if not provided
        category = item.category or ai_analysis.get('category', 'other')
        storage = item.storage_condition
        if not item.storage_condition or item.storage_condition == "pantry":
            storage = ai_analysis.get('storage_recommendation', 'pantry')
        
        # Use user-provided emoji or AI-suggested emoji
        emoji = item.emoji or ai_analysis.get('emoji', '🍽️')
        
        # Extract storage tips from AI analysis
        storage_tips = ai_analysis.get('tips', None)
        
        # Calculate dates
        purchase_date = item.purchase_date or datetime.utcnow().isoformat()
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
            expiration_date = datetime.fromisoformat(item['expiration_date'])
            days_until_expiry = (expiration_date - now).days
            
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
    result = await db.food_items.update_one(
        {"id": item_id},
        {"$set": updates}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Food item not found")
    
    item = await db.food_items.find_one({"id": item_id})
    item.pop('_id', None)
    return item

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
    expiring_soon = await db.food_items.count_documents({
        "expiration_date": {"$lte": three_days_from_now}
    })
    
    # Count expired items
    now = datetime.utcnow().isoformat()
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
