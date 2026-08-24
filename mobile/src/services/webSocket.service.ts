import AsyncStorage from '@react-native-async-storage/async-storage';

type MessageHandler = (data: any) => void;

class WebSocketService {
    private static instance: WebSocketService;
    private socket: WebSocket | null = null;
    private messageHandlers: Map<string, MessageHandler[]> = new Map();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 3000;

    public static getInstance(): WebSocketService {
        if (!WebSocketService.instance) {
            WebSocketService.instance = new WebSocketService();
        }
        return WebSocketService.instance;
    }

    public async connect() {
        if (this.socket) return;

        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) throw new Error('No token available');

            const url = `ws://api.indexx.ai/api/chat/ws?token=${encodeURIComponent(token)}`;
            this.socket = new WebSocket(url);

            this.socket.onopen = () => {
                console.log('WebSocket connected');
                this.reconnectAttempts = 0;
            };

            this.socket.onmessage = (event) => {
                this.handleMessage(event.data);
            };

            this.socket.onclose = (event) => {
                console.log('WebSocket disconnected:', event.code, event.reason);
                this.handleDisconnect();
            };

            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.handleDisconnect();
            };

        } catch (error) {
            console.error('WebSocket connection error:', error);
            this.handleDisconnect();
        }
    }

    public disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }

    private handleMessage(data: string) {
        try {
            const message = JSON.parse(data);
            const handlers = this.messageHandlers.get(message.type) || [];
            handlers.forEach(handler => handler(message));
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    }

    private handleDisconnect() {
        this.socket = null;
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
                this.reconnectAttempts++;
                this.connect();
            }, this.reconnectDelay);
        }
    }

    public send(message: any) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket not connected, message not sent:', message);
        }
    }

    public subscribe(type: string, handler: MessageHandler) {
        const handlers = this.messageHandlers.get(type) || [];
        this.messageHandlers.set(type, [...handlers, handler]);
        return () => this.unsubscribe(type, handler);
    }

    public unsubscribe(type: string, handler: MessageHandler) {
        const handlers = this.messageHandlers.get(type) || [];
        this.messageHandlers.set(type, handlers.filter(h => h !== handler));
    }

    public joinGroup(groupName: string) {
        this.send({
            type: 'JOIN_GROUP',
            groupName
        });
    }

    public leaveGroup(groupName: string) {
        this.send({
            type: 'LEAVE_GROUP',
            groupName
        });
    }

    public sendGroupMessage(groupName: string, text: string) {
        this.send({
            type: 'SEND_MESSAGE',
            message: {
                text,
                groupName
            }
        });
    }

    public sendTypingIndicator(groupName: string, isTyping: boolean) {
        this.send({
            type: 'TYPING',
            groupName,
            isTyping
        });
    }
}

export default WebSocketService.getInstance();