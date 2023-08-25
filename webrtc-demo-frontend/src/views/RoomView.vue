<template>
  <ul>
    <li v-for="participant in peerStore.participants" :key="participant.peerId">
      {{ participant.peerId }}
      <video v-if="participant.stream" :srcObject.prop="participant.stream" autoplay playsinline></video>
    </li>
    <li>
      This is you:
      <br>
      {{ peerStore.myId }}
      <video v-if="peerStore.myStream" :srcObject.prop="peerStore.myStream" autoplay playsinline muted></video>
    </li>
  </ul>

  <button @click="leaveRoom()">Leave Room</button>
</template>

<script setup lang="ts">
import router from '@/router';
import { usePeerStore } from '@/stores/peer';
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';

const roomId = useRoute().params.roomId;
if (typeof roomId !== 'string') throw new Error("Invalid room id");

const peerStore = usePeerStore();

onMounted(() => {
  peerStore.joinRoom(roomId)
});

const leaveRoom = () => {
  peerStore.leaveRoom();
  router.push("/");
};
</script>

<style scoped>
video {
  display: block;
  width: 450px;
}
</style>
