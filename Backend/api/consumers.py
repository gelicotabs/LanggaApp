import json
from channels.generic.websocket import AsyncWebsocketConsumer
from urllib.parse import parse_qs
import re
from jwt import decode, InvalidTokenError
from bson import ObjectId
from datetime import datetime
from asgiref.sync import sync_to_async
from django.conf import settings
from pymongo import MongoClient
import os
from dotenv import load_dotenv
import logging

# Setup logging
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# MongoDB Connection
client = MongoClient(os.getenv('MONGODB_URI'))
db = client['LoveConnect']
users_collection = db['users']

# Secret Key for JWT
JWT_SECRET = 'loveconnect'
JWT_ALGORITHM = 'HS256'

class ChatConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        """Handle WebSocket connection"""
        self.pair_code = self.scope['url_route']['kwargs']['pair_code']
        self.user_email = None

        logger.info(f"🔌 New WebSocket connection attempt for pair_code: {self.pair_code}")

        # Step 1: Extract token from query string
        query_string = self.scope['query_string'].decode()
        logger.info(f"📋 Query string: {query_string}")
        
        query_params = parse_qs(query_string)
        token = query_params.get('token', [None])[0]

        if not token:
            logger.error(f"❌ No token found in query string for pair_code: {self.pair_code}")
            await self.close(code=4001)  # Custom close code for auth error
            return

        logger.info(f"🔑 Token extracted (first 20 chars): {token[:20]}...")

        # Step 2: Decode JWT
        try:
            payload = decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            self.user_email = payload.get('email')
            logger.info(f"✅ JWT decoded successfully. User email: {self.user_email}")
        except InvalidTokenError as e:
            logger.error(f"❌ Invalid JWT token for pair_code {self.pair_code}: {str(e)}")
            await self.close(code=4002)  # Custom close code for invalid token
            return
        except Exception as e:
            logger.error(f"❌ Unexpected error decoding JWT: {str(e)}")
            await self.close(code=4003)
            return

        # Step 3: Verify user exists and has correct pair code
        try:
            user = await sync_to_async(users_collection.find_one)({'email': self.user_email})
            if not user:
                logger.error(f"❌ User not found: {self.user_email}")
                await self.close(code=4004)
                return
            
            if user.get('partnerCode') != self.pair_code:
                logger.error(f"❌ Pair code mismatch. User's pair code: {user.get('partnerCode')}, Requested: {self.pair_code}")
                await self.close(code=4005)
                return
            
            logger.info(f"✅ User verified: {self.user_email} for pair_code: {self.pair_code}")
        except Exception as e:
            logger.error(f"❌ Database error during user verification: {str(e)}")
            await self.close(code=4006)
            return

        # Step 4: Connect to channel group
        self.room_group_name = f"chat_{self.pair_code}"

        try:
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            logger.info(f"✅ Added to group: {self.room_group_name}")
        except Exception as e:
            logger.error(f"❌ Error adding to channel group: {str(e)}")
            await self.close(code=4007)
            return

        # Step 5: Accept the connection
        await self.accept()
        logger.info(f"✅ WebSocket connection accepted for {self.user_email}")

        # Step 6: Send previous messages
        try:
            await self.send_previous_messages()
        except Exception as e:
            logger.error(f"⚠️ Error sending previous messages: {str(e)}")
            # Don't close connection, just log the error

    async def mark_messages_as_seen(self):
        """Mark all messages not sent by this user as seen"""
        try:
            logger.info(f"👁️ Marking messages as seen for user: {self.user_email} in pair: {self.pair_code}")
            
            # Update messages where senderEmail is not the current user
            result = await sync_to_async(db['conversations'].update_one)(
                {
                    'pairCode': self.pair_code
                },
                {
                    '$set': {
                        'messages.$[msg].seen': True,
                        'lastMessageAt': datetime.utcnow().isoformat()
                    }
                },
                array_filters=[{
                    'msg.senderEmail': {'$ne': self.user_email},
                    'msg.seen': False
                }]
            )

            logger.info(f"✅ Mark as seen result: modified_count={result.modified_count}")

            # If messages were updated, broadcast the updated messages
            if result.modified_count > 0:
                conversation = await sync_to_async(db['conversations'].find_one)(
                    {'pairCode': self.pair_code}
                )
                if conversation and 'messages' in conversation:
                    for message in conversation['messages']:
                        if message.get('seen', False) and message['senderEmail'] != self.user_email:
                            message_id = str(message.get('_id', ''))
                            logger.info(f"📤 Broadcasting seen_update for message: {message_id}")
                            await self.channel_layer.group_send(
                                self.room_group_name,
                                {
                                    'type': 'seen_update',
                                    'message_id': message_id,
                                    'seen': True
                                }
                            )
        except Exception as e:
            logger.error(f"❌ Error marking messages as seen: {str(e)}")

    async def send_previous_messages(self):
        """Send all previous messages from this conversation to the newly connected user"""
        try:
            logger.info(f"📜 Fetching previous messages for pair_code: {self.pair_code}")
            
            # Fetch conversation from database
            conversation = await sync_to_async(db['conversations'].find_one)(
                {'pairCode': self.pair_code}
            )
            
            if conversation and 'messages' in conversation:
                message_count = len(conversation['messages'])
                logger.info(f"📨 Sending {message_count} previous messages")
                
                # Send each message to the connected user
                for idx, message in enumerate(conversation['messages']):
                    await self.send(text_data=json.dumps({
                        'id': str(message.get('_id', idx)),
                        'pairCode': self.pair_code,
                        'senderEmail': message['senderEmail'],
                        'type': message['type'],
                        'content': message['content'],
                        'timestamp': message['timestamp'],
                        'seen': message.get('seen', False),
                        'isHistorical': True
                    }))
                
                logger.info(f"✅ Successfully sent {message_count} previous messages")
            else:
                logger.info(f"ℹ️ No previous messages found for pair_code: {self.pair_code}")
        except Exception as e:
            logger.error(f"❌ Error sending previous messages: {str(e)}")
            raise

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        logger.info(f"🔌 WebSocket disconnecting. Code: {close_code}, User: {self.user_email}")
        
        if hasattr(self, "room_group_name"):
            try:
                await self.channel_layer.group_discard(
                    self.room_group_name,
                    self.channel_name
                )
                logger.info(f"✅ Removed from group: {self.room_group_name}")
            except Exception as e:
                logger.error(f"❌ Error removing from group: {str(e)}")

    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(text_data)
            msg_type = data.get('type', 'text')
            
            logger.info(f"📩 Received message. Type: {msg_type}, From: {self.user_email}")

            if msg_type == 'mark_seen':
                await self.mark_messages_as_seen()
                return

            content = data.get('content', '')
            if not content:
                logger.warning(f"⚠️ Empty content received from {self.user_email}")
                return

            # Create message object
            message_id = str(ObjectId())
            message = {
                '_id': ObjectId(message_id),
                'senderEmail': self.user_email,
                'type': msg_type,
                'content': content,
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'seen': False
            }

            # Update or create conversation document for this pair
            result = await sync_to_async(db['conversations'].update_one)(
                {'pairCode': self.pair_code},
                {
                    '$push': {'messages': message},
                    '$setOnInsert': {
                        'pairCode': self.pair_code,
                        'createdAt': datetime.utcnow().isoformat()
                    },
                    '$set': {
                        'lastMessageAt': datetime.utcnow().isoformat()
                    }
                },
                upsert=True
            )

            logger.info(f"✅ Message saved to database. Modified: {result.modified_count}, Upserted: {result.upserted_id}")

            # Create message for WebSocket broadcast
            websocket_message = {
                'id': message_id,
                'pairCode': self.pair_code,
                'senderEmail': self.user_email,
                'type': msg_type,
                'content': content,
                'timestamp': message['timestamp'],
                'seen': False
            }

            # Broadcast to group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': websocket_message
                }
            )
            
            logger.info(f"📤 Message broadcasted to group: {self.room_group_name}")

        except json.JSONDecodeError as e:
            logger.error(f"❌ Invalid JSON received: {str(e)}")
        except Exception as e:
            logger.error(f"❌ Error in receive: {str(e)}")

    async def chat_message(self, event):
        """Send chat message to WebSocket"""
        try:
            await self.send(text_data=json.dumps(event["message"]))
            logger.info(f"📨 Sent message to WebSocket client")
        except Exception as e:
            logger.error(f"❌ Error sending chat message: {str(e)}")

    async def reminder_alert(self, event):
        """Send reminder alert to WebSocket"""
        try:
            await self.send(text_data=json.dumps({
                "type": "reminder_alert",
                "reminder": event["reminder"]
            }))
            logger.info(f"🔔 Sent reminder alert to WebSocket client")
        except Exception as e:
            logger.error(f"❌ Error sending reminder alert: {str(e)}")

    async def seen_update(self, event):
        """Send seen status update to WebSocket"""
        try:
            await self.send(text_data=json.dumps({
                "type": "seen_update",
                "message_id": event["message_id"],
                "seen": event["seen"]
            }))
            logger.info(f"✅ Sent seen_update to WebSocket client")
        except Exception as e:
            logger.error(f"❌ Error sending seen_update: {str(e)}")
