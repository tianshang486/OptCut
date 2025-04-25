<template>
  <div class="w-full h-full flex items-start justify-center bg-transparent">
    <div role="alert" :class="[
      'flex items-center gap-2.5 w-full px-4 py-3 rounded-xl shadow-lg', 
      notificationType === 'success' 
        ? 'bg-success/90 text-success-content backdrop-blur-sm' 
        : 'bg-error/90 text-error-content backdrop-blur-sm'
    ]">
      <svg v-if="notificationType === 'success'" xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <svg v-else-if="notificationType === 'error'" xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span class="text-base font-medium whitespace-nowrap">{{ notificationMessage }}{{ notificationType === 'success' ? ' 😊' : ' 😅' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

const notificationMessage = ref('')
const notificationType = ref('success')

onMounted(() => {
  const params = new URLSearchParams(window.location.hash.split('?')[1])
  notificationMessage.value = decodeURIComponent(params.get('message') || '')
  notificationType.value = params.get('type') || 'success'
})
</script>

<style scoped>
div[role="alert"] {
  animation: slide-in 0.3s ease;
}

@keyframes slide-in {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style> 