<script lang="ts" setup>
import { startAuthentication } from '@simplewebauthn/browser'
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser'

useHead({
  title: $t('auth.form.signin.title'),
})

const { fetch: fetchUserSession } = useUserSession()
const config = useRuntimeConfig()
const settingsStore = useSettingsStore()
const toast = useToast()
const route = useRoute()
const router = useRouter()

const isLoading = ref(false)
const isPasskeyLoading = ref(false)
const requiresTwoFactor = ref(false)
const twoFactorCode = ref('')
const pendingCredentials = ref<{ email: string; password: string } | null>(null)
const passkeySupported = ref(false)

onMounted(() => {
  passkeySupported.value = 'PublicKeyCredential' in window
})

const githubOauthEnabled = computed(() => {
  const settingsValue = settingsStore.getSetting('system:auth.github.enabled')
  if (typeof settingsValue === 'boolean') {
    return settingsValue
  }

  return Boolean(config.public.oauth.github.enabled)
})

const onAuthSubmit = async (event: any) => {
  isLoading.value = true
  const credentials = {
    email: event.data.email,
    password: event.data.password,
  }
  pendingCredentials.value = credentials
  await $fetch<{ authenticated?: boolean; requiresTwoFactor?: boolean }>(
    '/api/login',
    {
      method: 'POST',
      body: credentials,
    },
  )
    .then(async (result) => {
      if (result.requiresTwoFactor) {
        requiresTwoFactor.value = true
        return
      }
      await fetchUserSession()
      router.push(route.query.redirect?.toString() || '/')
    })
    .catch((error) => {
      console.error('Login error:', error)
      toast.add({
        color: 'error',
        title: $t('auth.messages.loginFailed.title'),
        description:
          error?.data?.message || $t('auth.messages.loginFailed.description'),
      })
    })
    .finally(() => {
      isLoading.value = false
    })
}

const submitTwoFactor = async () => {
  if (!pendingCredentials.value || !twoFactorCode.value.trim()) return
  isLoading.value = true
  try {
    await $fetch('/api/login', {
      method: 'POST',
      body: {
        ...pendingCredentials.value,
        twoFactorCode: twoFactorCode.value.trim(),
      },
    })
    await fetchUserSession()
    await router.push(route.query.redirect?.toString() || '/')
  } catch (error: any) {
    toast.add({
      color: 'error',
      title: '验证码无效',
      description: error?.data?.message || '请检查验证器代码或恢复码。',
    })
  } finally {
    isLoading.value = false
  }
}

const signInWithPasskey = async () => {
  isPasskeyLoading.value = true
  try {
    const result = await $fetch<{
      options: PublicKeyCredentialRequestOptionsJSON
      challengeId: string
    }>('/api/security/passkeys/authenticate/options', { method: 'POST' })
    const response = await startAuthentication({ optionsJSON: result.options })
    await $fetch('/api/security/passkeys/authenticate/verify', {
      method: 'POST',
      body: { challengeId: result.challengeId, response },
    })
    await fetchUserSession()
    await router.push(route.query.redirect?.toString() || '/')
  } catch (error: any) {
    if (error?.name === 'NotAllowedError') return
    toast.add({
      color: 'error',
      title: 'Passkey 登录失败',
      description: error?.data?.message || error?.message,
    })
  } finally {
    isPasskeyLoading.value = false
  }
}
</script>

<template>
  <div
    class="w-full min-h-svh flex flex-col items-center justify-center p-4 pb-12"
  >
    <div
      v-if="requiresTwoFactor"
      class="w-full max-w-sm space-y-6"
    >
      <UButton
        icon="lucide:arrow-left"
        variant="link"
        color="neutral"
        size="xs"
        @click="requiresTwoFactor = false"
      >
        返回密码登录
      </UButton>
      <div>
        <Icon
          name="lucide:shield-check"
          class="size-8"
        />
        <h1 class="mt-4 text-2xl font-semibold">两步验证</h1>
        <p class="mt-2 text-sm leading-6 text-neutral-500">
          输入验证器中的 6 位代码，或使用一枚未使用的恢复码。
        </p>
      </div>
      <UForm
        class="space-y-4"
        @submit="submitTwoFactor"
      >
        <UFormField label="验证码或恢复码">
          <UInput
            v-model="twoFactorCode"
            class="w-full"
            autocomplete="one-time-code"
            autofocus
            placeholder="000000"
          />
        </UFormField>
        <UButton
          type="submit"
          block
          color="neutral"
          icon="lucide:shield-check"
          :loading="isLoading"
        >
          验证并登录
        </UButton>
      </UForm>
    </div>

    <AuthForm
      v-else
      :title="$t('auth.form.signin.title')"
      :subtitle="$t('auth.form.signin.subtitle', [config.public.app.title])"
      :loading="isLoading"
      :providers="[
        githubOauthEnabled && {
          icon: 'tabler:brand-github',
          size: 'lg',
          color: 'neutral',
          variant: 'subtle',
          block: true,
          label: 'GitHub',
          to: '/api/auth/github',
          external: true,
        },
      ]"
      @submit="onAuthSubmit"
    />

    <UButton
      v-if="!requiresTwoFactor && passkeySupported"
      class="mt-4 w-full max-w-sm"
      block
      color="neutral"
      variant="outline"
      icon="lucide:fingerprint"
      :loading="isPasskeyLoading"
      @click="signInWithPasskey"
    >
      使用 Passkey 登录
    </UButton>
  </div>
</template>

<style scoped></style>
