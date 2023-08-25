<template>
  <main>
    <h1>Hello! 🤙 Create a room to make a call!</h1>

    <p>
      <button @click="createRoom">Create a room</button>
    </p>
  </main>
</template>

<script setup lang="ts">
import { usePeerStore } from '@/stores/peer';

const peerStore = usePeerStore();

const createRoom = () => {
  peerStore.createRoom();
};
</script>

<style scoped>
main {
  padding: 24px;
}
</style>
