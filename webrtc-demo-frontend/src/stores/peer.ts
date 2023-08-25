import { ref } from 'vue'
import { defineStore } from 'pinia'
import { Peer, type MediaConnection } from 'peerjs'
import router from '@/router'

type Participant = {
  peerId: string,
  call?: MediaConnection,
  stream?: MediaStream,
}

export const usePeerStore = defineStore('peer', () => {
  const ws: WebSocket = new WebSocket('ws://localhost:8080');
  let peer: Peer | null = null;

  const myId = ref<string | null>(null);
  const myStream = ref<MediaStream | null>(null);

  const currentRoomId = ref<string | null>(null);
  const participants = ref<Participant[]>([]);

  const myStreamPromise = navigator.mediaDevices.getUserMedia({ audio: true, video: true});
  const initializeMyStream = async () => {
    myStream.value = await myStreamPromise;
  };
  initializeMyStream();

  const createRoom = () => {
    ws.send(JSON.stringify({ type: 'createRoom' }));
  };

  ws.onmessage = (message) => {
    const { type, payload } = JSON.parse(message.data);

    if (type === 'roomCreated') {
      const roomId = payload.roomId;
      console.log("Going to room: " + roomId);
      router.push(`/${roomId}`);
    } else if (type === 'roomJoined') {
      payload.participants.forEach((participantData: any) => {
        addParticipant(participantData);
      });
    } else if (type === 'participantJoined') {
      addParticipant(payload.participant);
    } else if (type === 'participantLeft') {
      removeParticipant(payload.peerId);
    }
  };

  const joinRoom = (roomId: string) => {
    resetState();

    peer = new Peer();
    currentRoomId.value = roomId;

    peer.on('open', async (id) => {
      myId.value = id;
      // Hacky way to make sure we only join once our local stream is ready
      await myStreamPromise;
      ws.send(JSON.stringify({ type: 'joinRoom', payload: { roomId, participant: { peerId: myId.value } } }));
    });

    peer.on('call', (call) => {
      call.answer(myStream.value!);
      addCall(call);
    });

    peer.on('error', (error) => {
      console.error(error);
    });
  };

  const resetState = () => {
    if (!peer) return;
    peer.destroy();
    peer = null;
    myId.value = null;
    const currentPeerIds = participants.value.map((p) => p.peerId);
    currentPeerIds.forEach((peerId) => removeParticipant(peerId));
    participants.value = [];
  };

  const addParticipant = (participantData: any) => {
    const { peerId } = participantData;

    if (findParticipantByPeerId(peerId)) return;

    const newParticipant: Participant = {
      peerId,
    };
    participants.value.push(newParticipant);

    if (peerId < myId.value!) {
      if (!myStream.value) { throw "Connected before local stream was ready" }
      const call = peer!.call(peerId, myStream.value);
      console.log(`calling ${peerId} returned ${ call ? "something" : "nothing"}`);
      addCall(call);
    }
  };

  const addCall = (call: MediaConnection) => {
    const participant = findParticipantByPeerId(call.peer);
    if (!participant) return;

    if (participant.call) {
      call.close();
    }

    participant.call = call;
    call.addListener('stream', (stream) => {
      participant.stream = stream;
    });
  };

  const findParticipantByPeerId = (peerId: string) => {
    return participants.value.find((p) => p.peerId === peerId);
  };

  const removeParticipant = (peerId: string) => {
    const participant = findParticipantByPeerId(peerId);
    if (!participant) return;

    participant.call?.close();
    participants.value = participants.value.filter((p) => p.peerId !== peerId);
  };

  const leaveRoom = () => {
    ws.send(JSON.stringify({ type: 'leaveRoom' }));
    console.log("leaving");
  };

  return { createRoom, joinRoom, leaveRoom, currentRoomId, myId, myStream, participants };
})
