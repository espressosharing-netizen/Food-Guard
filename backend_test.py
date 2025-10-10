#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Home Food Management System
Tests all endpoints with realistic food data
"""

import requests
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any

# Configuration
BASE_URL = "https://inventory-ux-refresh.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class FoodManagementTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.created_items = []  # Track created items for cleanup
        
    def log_test(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat(),
            "response_data": response_data
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {details}")
        
    def test_root_endpoint(self):
        """Test GET / - API status"""
        try:
            response = self.session.get(BASE_URL)
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "status" in data:
                    self.log_test("Root Endpoint", True, f"API running: {data['message']}", data)
                else:
                    self.log_test("Root Endpoint", False, f"Unexpected response format: {data}")
            else:
                self.log_test("Root Endpoint", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Root Endpoint", False, f"Request failed: {str(e)}")
    
    def test_create_food_items(self):
        """Test POST /api/food-items with various food categories"""
        test_foods = [
            {
                "name": "Fresh Avocados",
                "category": "produce",
                "quantity": 4,
                "unit": "each",
                "storage_condition": "refrigerated",
                "notes": "Organic from local farm"
            },
            {
                "name": "Whole Milk",
                "category": "dairy",
                "quantity": 1,
                "unit": "gallon",
                "storage_condition": "refrigerated"
            },
            {
                "name": "Ground Beef",
                "category": "meat",
                "quantity": 2,
                "unit": "lbs",
                "storage_condition": "refrigerated",
                "notes": "85% lean"
            },
            {
                "name": "Frozen Blueberries",
                "category": "frozen",
                "quantity": 1,
                "unit": "bag",
                "storage_condition": "frozen"
            },
            {
                "name": "Pasta Sauce",
                "category": "packaged",
                "quantity": 2,
                "unit": "jars",
                "storage_condition": "pantry"
            }
        ]
        
        for food_data in test_foods:
            try:
                response = self.session.post(f"{API_BASE}/food-items", json=food_data)
                if response.status_code == 200:
                    data = response.json()
                    # Verify required fields are present
                    required_fields = ["id", "name", "category", "expiration_date", "created_at"]
                    missing_fields = [field for field in required_fields if field not in data]
                    
                    if not missing_fields:
                        self.created_items.append(data["id"])
                        # Check if AI analysis worked (category should be set)
                        ai_worked = data.get("category") and data.get("expiration_date")
                        ai_status = "AI analysis worked" if ai_worked else "AI analysis may have failed"
                        self.log_test(f"Create Food Item: {food_data['name']}", True, 
                                    f"Created successfully. {ai_status}", data)
                    else:
                        self.log_test(f"Create Food Item: {food_data['name']}", False, 
                                    f"Missing fields: {missing_fields}")
                else:
                    self.log_test(f"Create Food Item: {food_data['name']}", False, 
                                f"Status {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test(f"Create Food Item: {food_data['name']}", False, f"Request failed: {str(e)}")
    
    def test_get_all_food_items(self):
        """Test GET /api/food-items"""
        try:
            response = self.session.get(f"{API_BASE}/food-items")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    item_count = len(data)
                    # Check if we have the expected items (2 existing + newly created)
                    expected_min = 2  # Original items mentioned in request
                    self.log_test("Get All Food Items", True, 
                                f"Retrieved {item_count} items (expected at least {expected_min})", 
                                {"count": item_count, "items": data[:3]})  # Show first 3 items
                else:
                    self.log_test("Get All Food Items", False, f"Expected list, got: {type(data)}")
            else:
                self.log_test("Get All Food Items", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Get All Food Items", False, f"Request failed: {str(e)}")
    
    def test_get_specific_food_item(self):
        """Test GET /api/food-items/{id}"""
        if not self.created_items:
            self.log_test("Get Specific Food Item", False, "No items created to test with")
            return
            
        item_id = self.created_items[0]
        try:
            response = self.session.get(f"{API_BASE}/food-items/{item_id}")
            if response.status_code == 200:
                data = response.json()
                if data.get("id") == item_id:
                    self.log_test("Get Specific Food Item", True, f"Retrieved item {item_id}", data)
                else:
                    self.log_test("Get Specific Food Item", False, f"ID mismatch: expected {item_id}, got {data.get('id')}")
            else:
                self.log_test("Get Specific Food Item", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Get Specific Food Item", False, f"Request failed: {str(e)}")
    
    def test_update_food_item(self):
        """Test PUT /api/food-items/{id}"""
        if not self.created_items:
            self.log_test("Update Food Item", False, "No items created to test with")
            return
            
        item_id = self.created_items[0]
        update_data = {
            "quantity": 5.0,
            "notes": "Updated quantity after testing"
        }
        
        try:
            response = self.session.put(f"{API_BASE}/food-items/{item_id}", json=update_data)
            if response.status_code == 200:
                data = response.json()
                if data.get("quantity") == 5.0 and "Updated quantity" in data.get("notes", ""):
                    self.log_test("Update Food Item", True, f"Updated item {item_id}", data)
                else:
                    self.log_test("Update Food Item", False, f"Update not reflected in response: {data}")
            else:
                self.log_test("Update Food Item", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Update Food Item", False, f"Request failed: {str(e)}")
    
    def test_notifications(self):
        """Test notification endpoints"""
        # Test GET /api/notifications
        try:
            response = self.session.get(f"{API_BASE}/notifications")
            if response.status_code == 200:
                notifications = response.json()
                if isinstance(notifications, list):
                    self.log_test("Get Notifications", True, 
                                f"Retrieved {len(notifications)} notifications", 
                                {"count": len(notifications)})
                    
                    # Test unread count
                    unread_response = self.session.get(f"{API_BASE}/notifications/unread")
                    if unread_response.status_code == 200:
                        unread_data = unread_response.json()
                        if "unread_count" in unread_data:
                            self.log_test("Get Unread Count", True, 
                                        f"Unread count: {unread_data['unread_count']}", unread_data)
                            
                            # Test marking notification as read (if we have notifications)
                            if notifications and len(notifications) > 0:
                                notif_id = notifications[0].get("id")
                                if notif_id:
                                    read_response = self.session.put(f"{API_BASE}/notifications/{notif_id}/read")
                                    if read_response.status_code == 200:
                                        self.log_test("Mark Notification Read", True, 
                                                    f"Marked notification {notif_id} as read")
                                    else:
                                        self.log_test("Mark Notification Read", False, 
                                                    f"Status {read_response.status_code}: {read_response.text}")
                        else:
                            self.log_test("Get Unread Count", False, f"Missing unread_count in response: {unread_data}")
                    else:
                        self.log_test("Get Unread Count", False, f"Status {unread_response.status_code}: {unread_response.text}")
                else:
                    self.log_test("Get Notifications", False, f"Expected list, got: {type(notifications)}")
            else:
                self.log_test("Get Notifications", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Get Notifications", False, f"Request failed: {str(e)}")
    
    def test_calendar_events(self):
        """Test GET /api/calendar-events"""
        try:
            response = self.session.get(f"{API_BASE}/calendar-events")
            if response.status_code == 200:
                events = response.json()
                if isinstance(events, list):
                    self.log_test("Get Calendar Events", True, 
                                f"Retrieved {len(events)} calendar events", 
                                {"count": len(events), "sample": events[:2] if events else []})
                else:
                    self.log_test("Get Calendar Events", False, f"Expected list, got: {type(events)}")
            else:
                self.log_test("Get Calendar Events", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Get Calendar Events", False, f"Request failed: {str(e)}")
    
    def test_dashboard_stats(self):
        """Test GET /api/dashboard/stats"""
        try:
            response = self.session.get(f"{API_BASE}/dashboard/stats")
            if response.status_code == 200:
                stats = response.json()
                required_fields = ["total_items", "expiring_soon", "expired", "category_breakdown"]
                missing_fields = [field for field in required_fields if field not in stats]
                
                if not missing_fields:
                    self.log_test("Get Dashboard Stats", True, 
                                f"Stats: {stats['total_items']} total, {stats['expiring_soon']} expiring soon, {stats['expired']} expired", 
                                stats)
                else:
                    self.log_test("Get Dashboard Stats", False, f"Missing fields: {missing_fields}")
            else:
                self.log_test("Get Dashboard Stats", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Get Dashboard Stats", False, f"Request failed: {str(e)}")
    
    def test_emoji_field_and_ai_suggestion(self):
        """Test emoji field storage and AI suggestion functionality"""
        print("\n🎭 Testing Emoji Field and AI Suggestion...")
        
        # Test 1: Create food item WITH emoji provided
        food_with_emoji = {
            "name": "Fresh Apple",
            "category": "produce",
            "quantity": 3,
            "unit": "each",
            "emoji": "🍎"
        }
        
        try:
            response = self.session.post(f"{API_BASE}/food-items", json=food_with_emoji)
            if response.status_code == 200:
                data = response.json()
                if data.get("emoji") == "🍎":
                    self.created_items.append(data["id"])
                    self.log_test("Emoji Field - User Provided", True, 
                                f"User emoji '🍎' stored correctly", data)
                else:
                    self.log_test("Emoji Field - User Provided", False, 
                                f"Expected '🍎', got '{data.get('emoji')}'")
            else:
                self.log_test("Emoji Field - User Provided", False, 
                            f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Emoji Field - User Provided", False, f"Request failed: {str(e)}")
        
        # Test 2: Create food items WITHOUT emoji - test AI suggestion
        test_foods_for_ai = [
            {"name": "Whole Milk", "category": "dairy"},
            {"name": "Chicken Breast", "category": "meat"},
            {"name": "Banana", "category": "produce"},
            {"name": "Bread", "category": "packaged"}
        ]
        
        for food_data in test_foods_for_ai:
            try:
                response = self.session.post(f"{API_BASE}/food-items", json=food_data)
                if response.status_code == 200:
                    data = response.json()
                    emoji = data.get("emoji")
                    if emoji and emoji != "🍽️":  # Default fallback emoji
                        self.created_items.append(data["id"])
                        self.log_test(f"AI Emoji Suggestion - {food_data['name']}", True, 
                                    f"AI suggested emoji: '{emoji}'", {"emoji": emoji})
                    elif emoji == "🍽️":
                        self.created_items.append(data["id"])
                        self.log_test(f"AI Emoji Suggestion - {food_data['name']}", False, 
                                    f"Got default emoji '{emoji}' - AI may not be working")
                    else:
                        self.log_test(f"AI Emoji Suggestion - {food_data['name']}", False, 
                                    f"No emoji returned: {data}")
                else:
                    self.log_test(f"AI Emoji Suggestion - {food_data['name']}", False, 
                                f"Status {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test(f"AI Emoji Suggestion - {food_data['name']}", False, f"Request failed: {str(e)}")
        
        # Test 3: Verify emoji field is returned in GET requests
        try:
            response = self.session.get(f"{API_BASE}/food-items")
            if response.status_code == 200:
                items = response.json()
                items_with_emoji = [item for item in items if item.get("emoji")]
                if items_with_emoji:
                    self.log_test("Emoji Field in GET Response", True, 
                                f"Found {len(items_with_emoji)} items with emoji field", 
                                {"sample_emojis": [item.get("emoji") for item in items_with_emoji[:3]]})
                else:
                    self.log_test("Emoji Field in GET Response", False, 
                                "No items found with emoji field")
            else:
                self.log_test("Emoji Field in GET Response", False, 
                            f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Emoji Field in GET Response", False, f"Request failed: {str(e)}")

    def test_inventory_filtering(self):
        """Test inventory filtering functionality"""
        print("\n🔍 Testing Inventory Filtering...")
        
        # First, create test items with specific expiration dates for filtering
        now = datetime.utcnow()
        test_items = [
            {
                "name": "Expired Yogurt",
                "category": "dairy",
                "purchase_date": (now - timedelta(days=10)).isoformat(),
                "notes": "Should be expired"
            },
            {
                "name": "Expiring Soon Bread",
                "category": "packaged", 
                "purchase_date": (now - timedelta(days=2)).isoformat(),
                "notes": "Should expire within 1-7 days"
            },
            {
                "name": "Fresh Carrots",
                "category": "produce",
                "purchase_date": now.isoformat(),
                "notes": "Should be fresh (>7 days)"
            }
        ]
        
        created_test_items = []
        for item_data in test_items:
            try:
                response = self.session.post(f"{API_BASE}/food-items", json=item_data)
                if response.status_code == 200:
                    data = response.json()
                    created_test_items.append(data["id"])
                    self.created_items.append(data["id"])
            except Exception as e:
                print(f"Failed to create test item {item_data['name']}: {e}")
        
        time.sleep(1)  # Allow items to be created
        
        # Test filter options
        filter_tests = [
            ("all", "All Items"),
            ("expired", "Expired Items"),
            ("expiring_soon", "Expiring Soon Items"),
            ("fresh", "Fresh Items")
        ]
        
        for filter_value, test_name in filter_tests:
            try:
                url = f"{API_BASE}/food-items"
                if filter_value != "all":
                    url += f"?filter={filter_value}"
                
                response = self.session.get(url)
                if response.status_code == 200:
                    items = response.json()
                    if isinstance(items, list):
                        self.log_test(f"Filter - {test_name}", True, 
                                    f"Retrieved {len(items)} items with filter '{filter_value}'", 
                                    {"count": len(items), "filter": filter_value})
                    else:
                        self.log_test(f"Filter - {test_name}", False, 
                                    f"Expected list, got {type(items)}")
                else:
                    self.log_test(f"Filter - {test_name}", False, 
                                f"Status {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test(f"Filter - {test_name}", False, f"Request failed: {str(e)}")

    def test_notification_timing_fix(self):
        """Test notification timing fix - notifications should only be created within 24 hours of event"""
        print("\n⏰ Testing Notification Timing Fix...")
        
        # Get initial notification count
        initial_notif_count = 0
        try:
            response = self.session.get(f"{API_BASE}/notifications")
            if response.status_code == 200:
                initial_notif_count = len(response.json())
        except:
            pass
        
        # Test 1: Create item expiring in 10 days - should NOT create notifications immediately
        now = datetime.utcnow()
        future_item = {
            "name": "Future Expiry Item",
            "category": "produce",
            "purchase_date": now.isoformat(),
            "notes": "Expires in 10+ days - should not create notifications yet"
        }
        
        try:
            response = self.session.post(f"{API_BASE}/food-items", json=future_item)
            if response.status_code == 200:
                data = response.json()
                self.created_items.append(data["id"])
                
                # Check expiration date is indeed far in future
                exp_date = datetime.fromisoformat(data["expiration_date"])
                days_until_expiry = (exp_date - now).days
                
                if days_until_expiry >= 7:
                    # Wait a moment then check notifications
                    time.sleep(2)
                    notif_response = self.session.get(f"{API_BASE}/notifications")
                    if notif_response.status_code == 200:
                        current_notif_count = len(notif_response.json())
                        if current_notif_count == initial_notif_count:
                            self.log_test("Notification Timing - Future Item", True, 
                                        f"No notifications created for item expiring in {days_until_expiry} days (correct behavior)")
                        else:
                            self.log_test("Notification Timing - Future Item", False, 
                                        f"Notifications were created immediately for future item (bug not fixed)")
                    else:
                        self.log_test("Notification Timing - Future Item", False, 
                                    "Could not verify notification count")
                else:
                    self.log_test("Notification Timing - Future Item", False, 
                                f"Item expires too soon ({days_until_expiry} days) for this test")
            else:
                self.log_test("Notification Timing - Future Item", False, 
                            f"Failed to create test item: {response.status_code}")
        except Exception as e:
            self.log_test("Notification Timing - Future Item", False, f"Request failed: {str(e)}")
        
        # Test 2: Create item expiring in 3 days - should create notifications (within 24h of 3-day warning)
        near_future_item = {
            "name": "Near Expiry Item",
            "category": "dairy",
            "purchase_date": (now - timedelta(days=1)).isoformat(),  # Purchased yesterday, will expire soon
            "notes": "Should create notifications as it's close to expiry warnings"
        }
        
        try:
            response = self.session.post(f"{API_BASE}/food-items", json=near_future_item)
            if response.status_code == 200:
                data = response.json()
                self.created_items.append(data["id"])
                
                # Check expiration date
                exp_date = datetime.fromisoformat(data["expiration_date"])
                days_until_expiry = (exp_date - now).days
                
                # Wait a moment then check notifications
                time.sleep(2)
                notif_response = self.session.get(f"{API_BASE}/notifications")
                if notif_response.status_code == 200:
                    notifications = notif_response.json()
                    # Look for notifications related to this item
                    item_notifications = [n for n in notifications if n.get("food_item_id") == data["id"]]
                    
                    if item_notifications:
                        self.log_test("Notification Timing - Near Expiry", True, 
                                    f"Created {len(item_notifications)} notifications for item expiring in {days_until_expiry} days")
                    else:
                        # This might be expected if the item doesn't expire within the notification window
                        if days_until_expiry <= 3:
                            self.log_test("Notification Timing - Near Expiry", False, 
                                        f"No notifications created for item expiring in {days_until_expiry} days")
                        else:
                            self.log_test("Notification Timing - Near Expiry", True, 
                                        f"No notifications created for item expiring in {days_until_expiry} days (correct - too far)")
                else:
                    self.log_test("Notification Timing - Near Expiry", False, 
                                "Could not verify notifications")
            else:
                self.log_test("Notification Timing - Near Expiry", False, 
                            f"Failed to create test item: {response.status_code}")
        except Exception as e:
            self.log_test("Notification Timing - Near Expiry", False, f"Request failed: {str(e)}")

    def test_delete_food_item(self):
        """Test DELETE /api/food-items/{id}"""
        if not self.created_items:
            self.log_test("Delete Food Item", False, "No items created to test with")
            return
            
        # Delete the last created item
        item_id = self.created_items.pop()
        try:
            response = self.session.delete(f"{API_BASE}/food-items/{item_id}")
            if response.status_code == 200:
                data = response.json()
                if "deleted successfully" in data.get("message", "").lower():
                    self.log_test("Delete Food Item", True, f"Deleted item {item_id}", data)
                    
                    # Verify item is actually deleted
                    verify_response = self.session.get(f"{API_BASE}/food-items/{item_id}")
                    if verify_response.status_code == 404:
                        self.log_test("Verify Deletion", True, f"Item {item_id} properly deleted")
                    else:
                        self.log_test("Verify Deletion", False, f"Item still exists after deletion")
                else:
                    self.log_test("Delete Food Item", False, f"Unexpected response: {data}")
            else:
                self.log_test("Delete Food Item", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Delete Food Item", False, f"Request failed: {str(e)}")
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Home Food Management System Backend Tests")
        print(f"🔗 Testing against: {BASE_URL}")
        print("=" * 60)
        
        # Test in logical order - prioritize new features first
        self.test_root_endpoint()
        time.sleep(0.5)  # Small delay between tests
        
        # HIGH PRIORITY NEW FEATURES
        print("\n🎯 TESTING NEW HIGH PRIORITY FEATURES")
        print("=" * 50)
        
        self.test_emoji_field_and_ai_suggestion()
        time.sleep(1)
        
        self.test_inventory_filtering()
        time.sleep(1)
        
        self.test_notification_timing_fix()
        time.sleep(1)
        
        # EXISTING FUNCTIONALITY TESTS
        print("\n🔧 TESTING EXISTING FUNCTIONALITY")
        print("=" * 50)
        
        self.test_create_food_items()
        time.sleep(0.5)
        
        self.test_get_all_food_items()
        time.sleep(0.5)
        
        self.test_get_specific_food_item()
        time.sleep(0.5)
        
        self.test_update_food_item()
        time.sleep(0.5)
        
        self.test_notifications()
        time.sleep(0.5)
        
        self.test_calendar_events()
        time.sleep(0.5)
        
        self.test_dashboard_stats()
        time.sleep(0.5)
        
        self.test_delete_food_item()
        
        # Print summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        failed = len(self.test_results) - passed
        
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"📈 Success Rate: {(passed/len(self.test_results)*100):.1f}%")
        
        if failed > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  ❌ {result['test']}: {result['details']}")
        
        print("\n🎯 KEY FINDINGS:")
        # Check for AI integration
        ai_tests = [r for r in self.test_results if "AI analysis" in r.get("details", "")]
        if ai_tests:
            ai_working = any("AI analysis worked" in r["details"] for r in ai_tests)
            print(f"  🤖 DeepSeek AI Integration: {'✅ Working' if ai_working else '❌ Issues detected'}")
        
        # Check for automatic features
        calendar_test = next((r for r in self.test_results if r["test"] == "Get Calendar Events"), None)
        if calendar_test and calendar_test["success"]:
            event_count = calendar_test.get("response_data", {}).get("count", 0)
            print(f"  📅 Calendar Events: {'✅ Auto-generated' if event_count > 0 else '⚠️ None found'}")
        
        notification_test = next((r for r in self.test_results if r["test"] == "Get Notifications"), None)
        if notification_test and notification_test["success"]:
            notif_count = notification_test.get("response_data", {}).get("count", 0)
            print(f"  🔔 Notifications: {'✅ Auto-generated' if notif_count > 0 else '⚠️ None found'}")

if __name__ == "__main__":
    tester = FoodManagementTester()
    tester.run_all_tests()