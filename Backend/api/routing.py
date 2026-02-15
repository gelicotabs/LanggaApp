"""
WebSocket URL routing configuration
This file defines the WebSocket URL patterns for the application
"""

from django.urls import re_path
from . import consumers

# WebSocket URL patterns
websocket_urlpatterns = [
    # Chat WebSocket endpoint
    # Matches: ws://domain/ws/chat/PAIRCODE/?token=JWT
    re_path(r'ws/chat/(?P<pair_code>\w+)/$', consumers.ChatConsumer.as_asgi()),
]
