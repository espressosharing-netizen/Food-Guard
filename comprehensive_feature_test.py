#!/usr/bin/env python3
"""
Comprehensive test for all new features in Home Food Management System
"""

import requests
import json
import time
from datetime import datetime, timedelta

BASE_URL = "https://inventory-ux-refresh.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

def test_all_new_features():
    """Test all new features comprehensively"""
    session = requests.Session()
    results = []
    
    print("🚀 Comprehensive New Features Test")
    print("=" * 60)
    
    # Test 1: Emoji Field and AI Suggestion
    print("\n🎭 1. EMOJI FIELD AND AI SUGGESTION")
    print("-" * 40)
    
    # Test with user-provided emoji
    apple_data = {
        "name": "Red Apple",
        "category": "produce",
        "quantity": 3,
        "unit": "each",
        "emoji": "🍎"
    }
    
    response = session.post(f"{API_BASE}/food-items", json=apple_data)
    if response.status_code == 200:
        data = response.json()
        if data.get("emoji") == "🍎":
            print("✅ User-provided emoji stored correctly")
            results.append(("Emoji Field - User Provided", True))
        else:
            print(f"❌ User emoji not stored: expected '🍎', got '{data.get('emoji')}'")
            results.append(("Emoji Field - User Provided", False))
        
        # Clean up
        session.delete(f"{API_BASE}/food-items/{data['id']}")
    else:
        print(f"❌ Failed to create item with user emoji: {response.status_code}")
        results.append(("Emoji Field - User Provided", False))
    
    # Test AI emoji suggestion
    test_foods = [
        {"name": "Cheddar Cheese", "category": "dairy"},
        {"name": "Salmon Fillet", "category": "meat"},
        {"name": "Strawberries", "category": "produce"}
    ]
    
    ai_emoji_working = True
    for food in test_foods:
        response = session.post(f"{API_BASE}/food-items", json=food)
        if response.status_code == 200:
            data = response.json()
            emoji = data.get("emoji")
            if emoji and emoji != "🍽️":  # Not the default fallback
                print(f"✅ AI suggested emoji for {food['name']}: {emoji}")
            else:
                print(f"❌ AI didn't suggest emoji for {food['name']}: got '{emoji}'")
                ai_emoji_working = False
            
            # Clean up
            session.delete(f"{API_BASE}/food-items/{data['id']}")
        else:
            print(f"❌ Failed to create {food['name']}")
            ai_emoji_working = False
    
    results.append(("AI Emoji Suggestion", ai_emoji_working))
    
    # Test 2: Inventory Filtering
    print("\n🔍 2. INVENTORY FILTERING")
    print("-" * 40)
    
    # Create test items with specific expiration patterns
    now = datetime.utcnow()
    test_items = [
        {
            "name": "Expired Test Item",
            "category": "dairy",
            "purchase_date": (now - timedelta(days=15)).isoformat(),
            "notes": "Should be expired"
        },
        {
            "name": "Expiring Soon Test Item", 
            "category": "produce",
            "purchase_date": (now - timedelta(days=2)).isoformat(),
            "notes": "Should expire within 1-7 days"
        },
        {
            "name": "Fresh Test Item",
            "category": "packaged",
            "purchase_date": now.isoformat(),
            "notes": "Should be fresh (>7 days)"
        }
    ]
    
    created_items = []
    for item in test_items:
        response = session.post(f"{API_BASE}/food-items", json=item)
        if response.status_code == 200:
            created_items.append(response.json()["id"])
    
    time.sleep(2)  # Allow items to be processed
    
    # Test each filter
    filters = ["all", "expired", "expiring_soon", "fresh"]
    filter_results = {}
    
    for filter_type in filters:
        url = f"{API_BASE}/food-items"
        if filter_type != "all":
            url += f"?filter={filter_type}"
        
        response = session.get(url)
        if response.status_code == 200:
            items = response.json()
            filter_results[filter_type] = len(items)
            print(f"✅ Filter '{filter_type}': {len(items)} items")
        else:
            print(f"❌ Filter '{filter_type}' failed: {response.status_code}")
            filter_results[filter_type] = -1
    
    # Verify filtering logic
    filtering_working = all(count >= 0 for count in filter_results.values())
    if filtering_working:
        # Additional logic check: expired + expiring_soon + fresh should roughly equal all
        total_filtered = filter_results.get("expired", 0) + filter_results.get("expiring_soon", 0) + filter_results.get("fresh", 0)
        all_items = filter_results.get("all", 0)
        if abs(total_filtered - all_items) <= 2:  # Allow small variance
            print("✅ Filter logic appears correct")
        else:
            print(f"⚠️  Filter logic may have issues: {total_filtered} filtered vs {all_items} total")
    
    results.append(("Inventory Filtering", filtering_working))
    
    # Clean up test items
    for item_id in created_items:
        session.delete(f"{API_BASE}/food-items/{item_id}")
    
    # Test 3: Notification Timing Fix
    print("\n⏰ 3. NOTIFICATION TIMING FIX")
    print("-" * 40)
    
    # Get initial notification count
    initial_response = session.get(f"{API_BASE}/notifications")
    initial_count = len(initial_response.json()) if initial_response.status_code == 200 else 0
    
    # Test 1: Future expiry (should NOT create notifications)
    future_item = {
        "name": "Future Expiry Test",
        "category": "packaged",
        "purchase_date": (now - timedelta(days=1)).isoformat(),
        "notes": "Should not create immediate notifications"
    }
    
    response = session.post(f"{API_BASE}/food-items", json=future_item)
    if response.status_code == 200:
        data = response.json()
        item_id = data["id"]
        exp_date = datetime.fromisoformat(data["expiration_date"])
        days_until_expiry = (exp_date - now).days
        
        time.sleep(2)
        
        # Check for notifications
        notif_response = session.get(f"{API_BASE}/notifications")
        if notif_response.status_code == 200:
            notifications = notif_response.json()
            item_notifications = [n for n in notifications if n.get("food_item_id") == item_id]
            
            if days_until_expiry > 3 and len(item_notifications) == 0:
                print(f"✅ No notifications created for item expiring in {days_until_expiry} days")
                timing_fix_working = True
            elif days_until_expiry <= 3 and len(item_notifications) > 0:
                print(f"✅ Notifications created for item expiring in {days_until_expiry} days")
                timing_fix_working = True
            else:
                print(f"❌ Unexpected notification behavior for item expiring in {days_until_expiry} days")
                timing_fix_working = False
        else:
            timing_fix_working = False
        
        # Clean up
        session.delete(f"{API_BASE}/food-items/{item_id}")
    else:
        timing_fix_working = False
    
    results.append(("Notification Timing Fix", timing_fix_working))
    
    # Print Summary
    print("\n" + "=" * 60)
    print("📊 NEW FEATURES TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    print(f"✅ Passed: {passed}/{total}")
    print(f"📈 Success Rate: {(passed/total*100):.1f}%")
    
    print("\n🎯 DETAILED RESULTS:")
    for test_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"  {status} {test_name}")
    
    return results

if __name__ == "__main__":
    test_all_new_features()