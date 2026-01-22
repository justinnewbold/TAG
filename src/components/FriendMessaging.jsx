/**
 * Friend Messaging System Component
 * Direct messages between friends with real-time chat
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  MessageCircle,
  Send,
  Search,
  Phone,
  Video,
  MoreVertical,
  Image,
  Smile,
  Paperclip,
  Check,
  CheckCheck,
  Clock,
  Circle,
  ArrowLeft,
  Bell,
  BellOff,
  Trash2,
  Flag,
  Ban,
  X,
  ChevronDown,
  Pin,
  Star,
  Archive,
  Users,
  Gamepad2,
  MapPin,
} from 'lucide-react';

// Message status icons
const MESSAGE_STATUS = {
  sending: { icon: Clock, color: 'text-gray-500' },
  sent: { icon: Check, color: 'text-gray-500' },
  delivered: { icon: CheckCheck, color: 'text-gray-500' },
  read: { icon: CheckCheck, color: 'text-cyan-400' },
};

// Quick emoji reactions
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

// Format message timestamp
function formatMessageTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Format last seen time
function formatLastSeen(timestamp) {
  if (!timestamp) return 'Offline';

  const date = new Date(timestamp);
  const now = new Date();
  const diffMinutes = Math.floor((now - date) / (1000 * 60));

  if (diffMinutes < 1) return 'Online';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
  return formatMessageTime(timestamp);
}

// Online status indicator
function OnlineStatus({ isOnline, lastSeen, size = 'md' }) {
  const sizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  return (
    <div
      className={`${sizes[size]} rounded-full ${
        isOnline ? 'bg-green-500' : 'bg-gray-500'
      }`}
      title={isOnline ? 'Online' : formatLastSeen(lastSeen)}
    />
  );
}

// Conversation list item
function ConversationItem({ conversation, isActive, onClick, currentUserId }) {
  const otherUser = conversation.participants.find((p) => p.id !== currentUserId);
  const lastMessage = conversation.lastMessage;
  const unreadCount = conversation.unreadCount || 0;

  return (
    <button
      onClick={() => onClick(conversation)}
      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
        isActive
          ? 'bg-cyan-500/20 border border-cyan-500'
          : 'hover:bg-gray-800/50 border border-transparent'
      }`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-2xl">
          {otherUser?.avatar || '👤'}
        </div>
        <div className="absolute -bottom-0.5 -right-0.5">
          <OnlineStatus isOnline={otherUser?.isOnline} lastSeen={otherUser?.lastSeen} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between">
          <span className="font-medium text-white truncate">{otherUser?.name || 'Unknown'}</span>
          <span className="text-xs text-gray-500">
            {lastMessage ? formatMessageTime(lastMessage.timestamp) : ''}
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-sm text-gray-400 truncate">
            {lastMessage?.senderId === currentUserId && (
              <span className="text-gray-500">You: </span>
            )}
            {lastMessage?.text || 'No messages yet'}
          </p>
          {unreadCount > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-cyan-500 text-white text-xs rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
      </div>

      {/* Pinned indicator */}
      {conversation.isPinned && (
        <Pin className="w-4 h-4 text-gray-500 flex-shrink-0" />
      )}
    </button>
  );
}

// Single message component
function Message({ message, isOwn, showAvatar, onReaction, onReply }) {
  const [showReactions, setShowReactions] = useState(false);
  const status = MESSAGE_STATUS[message.status] || MESSAGE_STATUS.sent;
  const StatusIcon = status.icon;

  return (
    <div
      className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''} group`}
      onMouseLeave={() => setShowReactions(false)}
    >
      {/* Avatar */}
      {!isOwn && showAvatar && (
        <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-lg flex-shrink-0">
          {message.senderAvatar || '👤'}
        </div>
      )}
      {!isOwn && !showAvatar && <div className="w-8 flex-shrink-0" />}

      {/* Message bubble */}
      <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
        <div
          className={`relative px-4 py-2 rounded-2xl ${
            isOwn
              ? 'bg-cyan-500 text-white rounded-br-sm'
              : 'bg-gray-800 text-white rounded-bl-sm'
          }`}
        >
          {/* Reply preview */}
          {message.replyTo && (
            <div
              className={`mb-2 pl-2 border-l-2 text-xs ${
                isOwn ? 'border-white/50 text-white/70' : 'border-gray-600 text-gray-400'
              }`}
            >
              <div className="font-medium">{message.replyTo.senderName}</div>
              <div className="truncate">{message.replyTo.text}</div>
            </div>
          )}

          {/* Message content */}
          {message.type === 'text' && <p className="text-sm">{message.text}</p>}

          {message.type === 'image' && (
            <img
              src={message.imageUrl}
              alt="Shared image"
              className="rounded-lg max-w-full"
            />
          )}

          {message.type === 'game_invite' && (
            <div className="flex items-center gap-3 p-2 bg-black/20 rounded-lg">
              <Gamepad2 className="w-8 h-8" />
              <div>
                <div className="font-medium">Game Invite</div>
                <div className="text-xs opacity-80">{message.gameName}</div>
              </div>
            </div>
          )}

          {message.type === 'location' && (
            <div className="flex items-center gap-3 p-2 bg-black/20 rounded-lg">
              <MapPin className="w-8 h-8" />
              <div>
                <div className="font-medium">Location Shared</div>
                <div className="text-xs opacity-80">{message.locationName}</div>
              </div>
            </div>
          )}

          {/* Reactions */}
          {message.reactions?.length > 0 && (
            <div
              className={`absolute -bottom-3 ${
                isOwn ? 'right-2' : 'left-2'
              } flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-700 rounded-full text-xs`}
            >
              {message.reactions.map((reaction, i) => (
                <span key={i}>{reaction.emoji}</span>
              ))}
              {message.reactions.length > 1 && (
                <span className="text-gray-400 ml-0.5">{message.reactions.length}</span>
              )}
            </div>
          )}
        </div>

        {/* Time and status */}
        <div
          className={`flex items-center gap-1 mt-1 text-xs text-gray-500 ${
            isOwn ? 'justify-end' : 'justify-start'
          }`}
        >
          <span>{formatMessageTime(message.timestamp)}</span>
          {isOwn && <StatusIcon className={`w-3 h-3 ${status.color}`} />}
        </div>

        {/* Quick reactions (on hover) */}
        <div
          className={`absolute ${isOwn ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'}
            top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity`}
        >
          <button
            onClick={() => setShowReactions(!showReactions)}
            className="p-1.5 bg-gray-700 rounded-full hover:bg-gray-600"
          >
            <Smile className="w-4 h-4 text-gray-400" />
          </button>

          {showReactions && (
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 flex gap-1 p-1 bg-gray-800 rounded-full shadow-lg">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onReaction?.(message.id, emoji);
                    setShowReactions(false);
                  }}
                  className="w-8 h-8 flex items-center justify-center hover:bg-gray-700 rounded-full text-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Date separator
function DateSeparator({ date }) {
  return (
    <div className="flex items-center gap-4 my-4">
      <div className="flex-1 h-px bg-gray-700" />
      <span className="text-xs text-gray-500">{date}</span>
      <div className="flex-1 h-px bg-gray-700" />
    </div>
  );
}

// Typing indicator
function TypingIndicator({ userName }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-400">
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>{userName} is typing...</span>
    </div>
  );
}

// Chat header
function ChatHeader({ conversation, currentUserId, onBack, onCall, onVideoCall, onMore }) {
  const otherUser = conversation.participants.find((p) => p.id !== currentUserId);

  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-700">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 hover:bg-white/10 rounded-lg md:hidden"
        >
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </button>

        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-xl">
            {otherUser?.avatar || '👤'}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5">
            <OnlineStatus isOnline={otherUser?.isOnline} lastSeen={otherUser?.lastSeen} size="sm" />
          </div>
        </div>

        <div>
          <h3 className="font-medium text-white">{otherUser?.name || 'Unknown'}</h3>
          <p className="text-xs text-gray-400">
            {otherUser?.isOnline ? 'Online' : formatLastSeen(otherUser?.lastSeen)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onCall}
          className="p-2 hover:bg-white/10 rounded-lg"
          title="Voice call"
        >
          <Phone className="w-5 h-5 text-gray-400" />
        </button>
        <button
          onClick={onVideoCall}
          className="p-2 hover:bg-white/10 rounded-lg"
          title="Video call"
        >
          <Video className="w-5 h-5 text-gray-400" />
        </button>
        <button
          onClick={onMore}
          className="p-2 hover:bg-white/10 rounded-lg"
        >
          <MoreVertical className="w-5 h-5 text-gray-400" />
        </button>
      </div>
    </div>
  );
}

// Message input
function MessageInput({ onSend, onTyping, disabled }) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const inputRef = useRef(null);

  const handleSend = () => {
    if (!text.trim()) return;
    onSend({ type: 'text', text: text.trim() });
    setText('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e) => {
    setText(e.target.value);
    onTyping?.();
  };

  return (
    <div className="p-4 border-t border-gray-700">
      <div className="flex items-end gap-2">
        {/* Attachment buttons */}
        <div className="flex gap-1">
          <button className="p-2 hover:bg-white/10 rounded-lg" title="Attach file">
            <Paperclip className="w-5 h-5 text-gray-400" />
          </button>
          <button className="p-2 hover:bg-white/10 rounded-lg" title="Send image">
            <Image className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Input field */}
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={disabled}
            rows={1}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none max-h-32"
          />
          <button
            onClick={() => setShowEmoji(!showEmoji)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-lg"
          >
            <Smile className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          className="p-3 bg-cyan-500 rounded-xl hover:bg-cyan-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  );
}

// Main FriendMessaging component
export default function FriendMessaging({
  currentUserId,
  friends = [],
  socket,
  onStartGame,
  className = '',
}) {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Filter conversations by search
  const filteredConversations = useMemo(() => {
    if (!searchQuery) return conversations;
    return conversations.filter((conv) => {
      const otherUser = conv.participants.find((p) => p.id !== currentUserId);
      return otherUser?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [conversations, searchQuery, currentUserId]);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups = [];
    let currentDate = null;

    messages.forEach((msg) => {
      const msgDate = new Date(msg.timestamp).toDateString();
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ type: 'date', date: formatMessageTime(msg.timestamp) });
      }
      groups.push({ type: 'message', message: msg });
    });

    return groups;
  }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      const response = await fetch(`/api/messages/conversations`);
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  }, []);

  // Load messages for a conversation
  const loadMessages = useCallback(async (conversationId) => {
    try {
      const response = await fetch(`/api/messages/conversations/${conversationId}/messages`);
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  }, []);

  // Select conversation
  const selectConversation = useCallback((conversation) => {
    setActiveConversation(conversation);
    loadMessages(conversation.id);
    setShowMobileChat(true);

    // Mark as read
    socket?.emit('messages:markRead', { conversationId: conversation.id });
  }, [loadMessages, socket]);

  // Send message
  const sendMessage = useCallback((messageData) => {
    if (!activeConversation) return;

    const message = {
      id: `temp-${Date.now()}`,
      conversationId: activeConversation.id,
      senderId: currentUserId,
      timestamp: Date.now(),
      status: 'sending',
      ...messageData,
    };

    setMessages((prev) => [...prev, message]);

    socket?.emit('messages:send', {
      conversationId: activeConversation.id,
      ...messageData,
    });
  }, [activeConversation, currentUserId, socket]);

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (!activeConversation) return;

    socket?.emit('messages:typing', { conversationId: activeConversation.id });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      socket?.emit('messages:stopTyping', { conversationId: activeConversation.id });
    }, 2000);
  }, [activeConversation, socket]);

  // Add reaction to message
  const handleReaction = useCallback((messageId, emoji) => {
    socket?.emit('messages:react', {
      conversationId: activeConversation?.id,
      messageId,
      emoji,
    });
  }, [activeConversation, socket]);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data) => {
      if (data.conversationId === activeConversation?.id) {
        setMessages((prev) => [...prev, data.message]);
      }
      // Update conversation list
      loadConversations();
    };

    const handleMessageStatus = (data) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.messageId ? { ...msg, status: data.status } : msg
        )
      );
    };

    const handleTypingStart = (data) => {
      if (data.conversationId === activeConversation?.id) {
        setIsTyping(data.userName);
      }
    };

    const handleTypingStop = (data) => {
      if (data.conversationId === activeConversation?.id) {
        setIsTyping(null);
      }
    };

    const handleReaction = (data) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.messageId
            ? { ...msg, reactions: [...(msg.reactions || []), data.reaction] }
            : msg
        )
      );
    };

    socket.on('messages:new', handleNewMessage);
    socket.on('messages:status', handleMessageStatus);
    socket.on('messages:typing', handleTypingStart);
    socket.on('messages:stopTyping', handleTypingStop);
    socket.on('messages:reaction', handleReaction);

    return () => {
      socket.off('messages:new', handleNewMessage);
      socket.off('messages:status', handleMessageStatus);
      socket.off('messages:typing', handleTypingStart);
      socket.off('messages:stopTyping', handleTypingStop);
      socket.off('messages:reaction', handleReaction);
    };
  }, [socket, activeConversation, loadConversations]);

  // Start new conversation
  const startConversation = useCallback(async (friendId) => {
    try {
      const response = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: friendId }),
      });
      const data = await response.json();
      setConversations((prev) => [data.conversation, ...prev]);
      selectConversation(data.conversation);
    } catch (err) {
      console.error('Failed to start conversation:', err);
    }
  }, [selectConversation]);

  // Invite to game
  const inviteToGame = useCallback(() => {
    if (!activeConversation) return;

    sendMessage({
      type: 'game_invite',
      gameName: 'Quick Match',
      gameId: 'new',
    });

    onStartGame?.(activeConversation.participants.find((p) => p.id !== currentUserId));
  }, [activeConversation, currentUserId, sendMessage, onStartGame]);

  return (
    <div className={`bg-gray-900/95 backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-700 ${className}`}>
      <div className="flex h-[600px]">
        {/* Conversation list */}
        <div
          className={`w-80 border-r border-gray-700 flex flex-col ${
            showMobileChat ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-cyan-400" />
                Messages
              </h2>
              <button className="p-2 hover:bg-white/10 rounded-lg" title="New message">
                <Users className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs mt-1">Start chatting with your friends!</p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isActive={activeConversation?.id === conv.id}
                  onClick={selectConversation}
                  currentUserId={currentUserId}
                />
              ))
            )}
          </div>
        </div>

        {/* Chat area */}
        <div
          className={`flex-1 flex flex-col ${
            !showMobileChat ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeConversation ? (
            <>
              {/* Chat header */}
              <ChatHeader
                conversation={activeConversation}
                currentUserId={currentUserId}
                onBack={() => setShowMobileChat(false)}
                onCall={() => console.log('Voice call')}
                onVideoCall={() => console.log('Video call')}
                onMore={() => console.log('More options')}
              />

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {groupedMessages.map((item, index) => {
                  if (item.type === 'date') {
                    return <DateSeparator key={`date-${index}`} date={item.date} />;
                  }

                  const msg = item.message;
                  const isOwn = msg.senderId === currentUserId;
                  const prevMsg = messages[index - 1];
                  const showAvatar = !isOwn && (!prevMsg || prevMsg.senderId !== msg.senderId);

                  return (
                    <Message
                      key={msg.id}
                      message={msg}
                      isOwn={isOwn}
                      showAvatar={showAvatar}
                      onReaction={handleReaction}
                    />
                  );
                })}

                {/* Typing indicator */}
                {isTyping && <TypingIndicator userName={isTyping} />}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick actions */}
              <div className="px-4 pb-2 flex gap-2">
                <button
                  onClick={inviteToGame}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-full text-sm text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                >
                  <Gamepad2 className="w-4 h-4" />
                  Invite to Game
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-full text-sm text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
                  <MapPin className="w-4 h-4" />
                  Share Location
                </button>
              </div>

              {/* Message input */}
              <MessageInput onSend={sendMessage} onTyping={handleTyping} />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Select a conversation</p>
                <p className="text-sm mt-1">Choose a friend to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Hook for unread message count
export function useUnreadMessages(socket, userId) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!socket) return;

    const handleUnreadUpdate = (data) => {
      setUnreadCount(data.count);
    };

    socket.on('messages:unreadCount', handleUnreadUpdate);

    // Request initial count
    socket.emit('messages:getUnreadCount');

    return () => {
      socket.off('messages:unreadCount', handleUnreadUpdate);
    };
  }, [socket]);

  return unreadCount;
}
