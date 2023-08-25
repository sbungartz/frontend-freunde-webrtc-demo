import { WebSocket, WebSocketServer } from 'ws';
import crypto from 'node:crypto';

type Room = {
  id: string,
  participants: Participant[],
}

type Participant = {
  peerId: string,
  ws: WebSocket,
};

const webSocketServer = new WebSocketServer({ port: 8080 });

const rooms: {[id: string]: Room} = {};

webSocketServer.on('connection', (ws) => {
  let room: Room | null = null;
  let participant: Participant | null = null;

  ws.on('error', console.error);

  ws.on('message', (data) => {
    const { type, payload } = JSON.parse(data as unknown as string);

    if (type === 'createRoom') {
      const newRoomId = createNewRoom();

      ws.send(JSON.stringify({
        type: 'roomCreated',
        payload: {
          roomId: newRoomId,
        },
      }));
    } else if (type === 'joinRoom') {
      const { roomId } = payload;

      const result = addParticipantToRoom(ws, roomId, payload.participant.peerId);
      participant = result.participant;
      room = result.room;

      participant.ws.send(JSON.stringify({
        type: 'roomJoined',
        payload: {
          roomId,
          participants: room.participants.filter(p => p.peerId !== participant!.peerId).map(p => ({
            peerId: p.peerId,
          })),
        },
      }));

      room.participants.filter(p => p.peerId !== participant!.peerId).forEach(p => {
        p.ws.send(JSON.stringify({
          type: 'participantJoined',
          payload: {
            participant: {
              peerId: participant!.peerId,
            }
          }
        }));
      });
    } else if (type === 'leaveRoom') {
      if (!room || !participant) return;

      removeParticipantFromRoom(room, participant);

      room.participants.forEach(p => {
        p.ws.send(JSON.stringify({
          type: 'participantLeft',
          payload: {
            peerId: participant!.peerId,
          }
        }));
      });

      room = null;
      participant = null;
    } else {
      console.error(`Unknown message type: ${type}`);
    }
  });
});

const createNewRoom = () => {
  const newRoomId = crypto.randomUUID();

  rooms[newRoomId] = {
    id: newRoomId,
    participants: [],
  };

  return newRoomId;
};

const addParticipantToRoom = (ws: WebSocket, roomId: string, peerId: string) => {
  const room = rooms[roomId];

  if (!room) {
    throw new Error(`Unknown room id: ${roomId}`);
  }

  let participant = room.participants.find(p => p.peerId === peerId) || null;
  if (!participant) {
    participant = {
      peerId,
      ws,
    };
    room.participants.push(participant);
  }

  participant.ws = ws;

  return {
    room,
    participant,
  }
};

const removeParticipantFromRoom = (room: Room, participant: Participant) => {
  room.participants = room.participants.filter(p => p.peerId !== participant!.peerId);
};
