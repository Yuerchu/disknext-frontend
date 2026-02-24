<script setup lang="ts">
const props = defineProps<{
  src: string
  accessToken: string
  accessTokenTtl: number
}>()

const iframeName = 'wopi-editor-frame'

onMounted(() => {
  // Build and submit the form programmatically to guarantee
  // access_token / access_token_ttl values are set before submit.
  // Using Vue template :value binding with defineAsyncComponent can
  // race – the DOM property may not yet reflect the prop when
  // onMounted + nextTick fires inside the async-loaded component.
  const form = document.createElement('form')
  form.action = props.src
  form.method = 'POST'
  form.target = iframeName
  form.style.display = 'none'

  const tokenInput = document.createElement('input')
  tokenInput.type = 'hidden'
  tokenInput.name = 'access_token'
  tokenInput.value = props.accessToken
  form.appendChild(tokenInput)

  const ttlInput = document.createElement('input')
  ttlInput.type = 'hidden'
  ttlInput.name = 'access_token_ttl'
  ttlInput.value = String(props.accessTokenTtl)
  form.appendChild(ttlInput)

  document.body.appendChild(form)
  form.submit()
  document.body.removeChild(form)
})
</script>

<template>
  <iframe
    :name="iframeName"
    class="w-full h-full border-0"
    allow="fullscreen; clipboard-read; clipboard-write"
  />
</template>
