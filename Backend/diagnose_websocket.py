#!/usr/bin/env python
"""
WebSocket Configuration Diagnostic Script
Run this to check if your Django WebSocket setup is correct
"""

import os
import sys

def print_section(title):
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60)

def check_file_exists(filepath, description):
    if os.path.exists(filepath):
        print(f"✅ {description}: FOUND")
        return True
    else:
        print(f"❌ {description}: NOT FOUND")
        print(f"   Expected at: {filepath}")
        return False

def check_file_content(filepath, search_string, description):
    try:
        with open(filepath, 'r') as f:
            content = f.read()
            if search_string in content:
                print(f"✅ {description}: CONFIGURED")
                return True
            else:
                print(f"❌ {description}: NOT CONFIGURED")
                print(f"   Missing: {search_string}")
                return False
    except FileNotFoundError:
        print(f"❌ {description}: FILE NOT FOUND")
        return False

def main():
    print_section("Django WebSocket Configuration Diagnostic")
    
    all_checks_passed = True
    
    # Check 1: Project structure
    print_section("1. Checking Project Structure")
    
    if not check_file_exists("manage.py", "Django project"):
        print("\n⚠️  Run this script from your Django project root directory")
        sys.exit(1)
    
    check_file_exists("Backend/settings.py", "Settings file")
    check_file_exists("Backend/asgi.py", "ASGI configuration")
    routing_exists = check_file_exists("api/routing.py", "WebSocket routing")
    check_file_exists("api/consumers.py", "WebSocket consumers")
    
    # Check 2: settings.py configuration
    print_section("2. Checking settings.py Configuration")
    
    all_checks_passed &= check_file_content(
        "Backend/settings.py",
        "'daphne'",
        "Daphne in INSTALLED_APPS"
    )
    
    all_checks_passed &= check_file_content(
        "Backend/settings.py",
        "'channels'",
        "Channels in INSTALLED_APPS"
    )
    
    all_checks_passed &= check_file_content(
        "Backend/settings.py",
        "ASGI_APPLICATION",
        "ASGI_APPLICATION setting"
    )
    
    all_checks_passed &= check_file_content(
        "Backend/settings.py",
        "CHANNEL_LAYERS",
        "Channel layers configuration"
    )
    
    # Check 3: routing.py
    print_section("3. Checking WebSocket Routing")
    
    if routing_exists:
        all_checks_passed &= check_file_content(
            "api/routing.py",
            "websocket_urlpatterns",
            "WebSocket URL patterns defined"
        )
        
        all_checks_passed &= check_file_content(
            "api/routing.py",
            "ChatConsumer",
            "ChatConsumer imported"
        )
    else:
        print("❌ api/routing.py must be created!")
        all_checks_passed = False
    
    # Check 4: asgi.py
    print_section("4. Checking ASGI Configuration")
    
    all_checks_passed &= check_file_content(
        "Backend/asgi.py",
        "ProtocolTypeRouter",
        "ProtocolTypeRouter imported"
    )
    
    all_checks_passed &= check_file_content(
        "Backend/asgi.py",
        "websocket_urlpatterns",
        "WebSocket patterns imported"
    )
    
    all_checks_passed &= check_file_content(
        "Backend/asgi.py",
        '"websocket"',
        "WebSocket protocol configured"
    )
    
    # Check 5: requirements.txt
    print_section("5. Checking Dependencies")
    
    if check_file_exists("requirements.txt", "Requirements file"):
        all_checks_passed &= check_file_content(
            "requirements.txt",
            "channels",
            "Channels package"
        )
        
        all_checks_passed &= check_file_content(
            "requirements.txt",
            "daphne",
            "Daphne package"
        )
        
        all_checks_passed &= check_file_content(
            "requirements.txt",
            "channels-redis",
            "Channels-Redis package"
        )
    
    # Check 6: Try importing
    print_section("6. Testing Python Imports")
    
    try:
        sys.path.insert(0, os.getcwd())
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Backend.settings')
        
        try:
            import django
            django.setup()
            print("✅ Django setup successful")
        except Exception as e:
            print(f"❌ Django setup failed: {e}")
            all_checks_passed = False
        
        try:
            from channels.routing import ProtocolTypeRouter
            print("✅ Channels imported successfully")
        except ImportError:
            print("❌ Channels not installed (pip install channels)")
            all_checks_passed = False
        
        try:
            from api.routing import websocket_urlpatterns
            print("✅ WebSocket routing imported successfully")
            print(f"   Routes: {websocket_urlpatterns}")
        except ImportError as e:
            print(f"❌ Cannot import websocket_urlpatterns: {e}")
            all_checks_passed = False
        
        try:
            from api.consumers import ChatConsumer
            print("✅ ChatConsumer imported successfully")
        except ImportError as e:
            print(f"❌ Cannot import ChatConsumer: {e}")
            all_checks_passed = False
            
    except Exception as e:
        print(f"❌ Import test failed: {e}")
        all_checks_passed = False
    
    # Summary
    print_section("Diagnostic Summary")
    
    if all_checks_passed:
        print("✅ All checks PASSED!")
        print("\nYour WebSocket configuration looks correct.")
        print("\nNext steps:")
        print("1. Run locally: daphne -b 0.0.0.0 -p 8000 Backend.asgi:application")
        print("2. Test: wscat -c 'ws://localhost:8000/ws/chat/TEST/?token=TOKEN'")
        print("3. Deploy to Render with start command:")
        print("   daphne -b 0.0.0.0 -p $PORT Backend.asgi:application")
    else:
        print("❌ Some checks FAILED!")
        print("\nFollow the steps in FIX_404_WEBSOCKET_ERROR.md to fix the issues.")
        print("\nMost common fixes:")
        print("1. Create api/routing.py with WebSocket URL patterns")
        print("2. Update Backend/asgi.py to import routing")
        print("3. Add 'daphne' and 'channels' to INSTALLED_APPS in settings.py")
        print("4. Set ASGI_APPLICATION in settings.py")
        print("5. Install: pip install channels daphne channels-redis")
    
    print("\n" + "="*60 + "\n")

if __name__ == "__main__":
    main()
