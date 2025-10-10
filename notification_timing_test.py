#!/usr/bin/env python3
"""
Specific test for notification timing fix
"""

import requests
import json
import time
from datetime import datetime, timedelta

BASE_URL = "https://inventory-ux-refresh.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

def test_notification_timing():
    """Test the notification timing fix specifically"""
    session = requests.Session()
    
    print("🔍 Testing Notification Timing Fix...")
    
    # Get initial notification count
    initial_response = session.get(f"{API_BASE}/notifications")
    initial_count = len(initial_response.json()) if initial_response.status_code == 200 else 0
    print(f"Initial notification count: {initial_count}")
    
    # Test 1: Create item that will expire far in the future (should NOT create notifications)
    now = datetime.utcnow()
    future_purchase_date = (now - timedelta(days=1)).isoformat()  # Purchased yesterday
    
    future_item = {
        "name": "Long Shelf Life Item",
        "category": "packaged",
        "quantity": 1,
        "unit": "each",
        "purchase_date": future_purchase_date,
        "notes": "This should have a long shelf life and not create immediate notifications"
    }
    
    print(f"\n1. Creating item with purchase date: {future_purchase_date}")
    response = session.post(f"{API_BASE}/food-items", json=future_item)
    
    if response.status_code == 200:
        data = response.json()
        item_id = data["id"]
        exp_date = datetime.fromisoformat(data["expiration_date"])
        days_until_expiry = (exp_date - now).days
        
        print(f"   Item created: {data['name']}")
        print(f"   Expiration date: {data['expiration_date']}")
        print(f"   Days until expiry: {days_until_expiry}")
        
        # Wait a moment for any notifications to be created
        time.sleep(3)
        
        # Check notifications
        notif_response = session.get(f"{API_BASE}/notifications")
        if notif_response.status_code == 200:
            current_notifications = notif_response.json()
            current_count = len(current_notifications)
            
            # Look for notifications related to this specific item
            item_notifications = [n for n in current_notifications if n.get("food_item_id") == item_id]
            
            print(f"   Total notifications after creation: {current_count}")
            print(f"   Notifications for this item: {len(item_notifications)}")
            
            if len(item_notifications) == 0:
                print("   ✅ PASS: No notifications created immediately (correct behavior)")
            else:
                print("   ❌ FAIL: Notifications were created immediately (bug not fixed)")
                for notif in item_notifications:
                    print(f"      - {notif.get('notification_type')}: {notif.get('message')}")
        
        # Clean up
        session.delete(f"{API_BASE}/food-items/{item_id}")
    
    # Test 2: Create item that expires very soon (should create notifications)
    print(f"\n2. Creating item that expires very soon...")
    
    # Create an item with a very short shelf life by manipulating purchase date
    old_purchase_date = (now - timedelta(days=6)).isoformat()  # Purchased 6 days ago
    
    soon_expiry_item = {
        "name": "Short Shelf Life Item",
        "category": "dairy",  # Dairy typically has shorter shelf life
        "quantity": 1,
        "unit": "each",
        "purchase_date": old_purchase_date,
        "notes": "This should expire soon and create notifications"
    }
    
    print(f"   Purchase date set to: {old_purchase_date}")
    response = session.post(f"{API_BASE}/food-items", json=soon_expiry_item)
    
    if response.status_code == 200:
        data = response.json()
        item_id = data["id"]
        exp_date = datetime.fromisoformat(data["expiration_date"])
        days_until_expiry = (exp_date - now).days
        
        print(f"   Item created: {data['name']}")
        print(f"   Expiration date: {data['expiration_date']}")
        print(f"   Days until expiry: {days_until_expiry}")
        
        # Wait a moment for any notifications to be created
        time.sleep(3)
        
        # Check notifications
        notif_response = session.get(f"{API_BASE}/notifications")
        if notif_response.status_code == 200:
            current_notifications = notif_response.json()
            
            # Look for notifications related to this specific item
            item_notifications = [n for n in current_notifications if n.get("food_item_id") == item_id]
            
            print(f"   Notifications for this item: {len(item_notifications)}")
            
            if days_until_expiry <= 3:  # Should create notifications if expiring within 3 days
                if len(item_notifications) > 0:
                    print("   ✅ PASS: Notifications created for soon-expiring item")
                    for notif in item_notifications:
                        print(f"      - {notif.get('notification_type')}: {notif.get('message')}")
                else:
                    print("   ❌ FAIL: No notifications created for soon-expiring item")
            else:
                if len(item_notifications) == 0:
                    print("   ✅ PASS: No notifications created (item doesn't expire soon enough)")
                else:
                    print("   ⚠️  UNEXPECTED: Notifications created for item not expiring soon")
        
        # Clean up
        session.delete(f"{API_BASE}/food-items/{item_id}")
    
    print("\n🎯 Notification Timing Test Complete")

if __name__ == "__main__":
    test_notification_timing()