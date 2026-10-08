<script setup lang="ts">
import {
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
} from '@simplewebauthn/browser'

definePageMeta({ layout: 'dashboard' })
useHead({ title: '安全与登录' })

type SecurityStatus = {
  totpEnabled: boolean
  recoveryCodes: number
  passkeyCount: number
}

type PasskeyItem = {
  id: number
  name: string
  deviceType: string | null
  backedUp: boolean
  createdAt: string
  lastUsedAt: string | null
}

type SessionItem = {
  id: string
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  lastSeenAt: string
  expiresAt: string
  revokedAt: string | null
  current: boolean
}

const toast = useToast()
const router = useRouter()
const { clear } = useUserSession()
const { data: status, refresh: refreshStatus } = await useFetch<SecurityStatus>(
  '/api/security/status',
)
const { data: passkeys, refresh: refreshPasskeys } = await useFetch<
  PasskeyItem[]
>('/api/security/passkeys')
const { data: sessions, refresh: refreshSessions } = await useFetch<
  SessionItem[]
>('/api/security/sessions')

const totpSetup = ref<{
  secret: string
  uri: string
  qrCodeDataUrl: string
} | null>(null)
const setupCode = ref('')
const actionCode = ref('')
const recoveryCodes = ref<string[]>([])
const totpLoading = ref(false)
const passkeyLoading = ref(false)
const passkeySupported = ref(false)

onMounted(() => {
  passkeySupported.value = 'PublicKeyCredential' in window
})

const startTotpSetup = async () => {
  totpLoading.value = true
  try {
    totpSetup.value = await $fetch('/api/security/totp/setup', {
      method: 'POST',
    })
    setupCode.value = ''
    recoveryCodes.value = []
  } finally {
    totpLoading.value = false
  }
}

const verifyTotpSetup = async () => {
  if (!setupCode.value.trim()) return
  totpLoading.value = true
  try {
    const result = await $fetch<{ recoveryCodes: string[] }>(
      '/api/security/totp/verify',
      { method: 'POST', body: { code: setupCode.value.trim() } },
    )
    recoveryCodes.value = result.recoveryCodes
    totpSetup.value = null
    setupCode.value = ''
    await refreshStatus()
    toast.add({ title: '两步验证已启用', color: 'success' })
  } catch (error: any) {
    toast.add({
      title: '验证码无效',
      description: error?.data?.message || error?.message,
      color: 'error',
    })
  } finally {
    totpLoading.value = false
  }
}

const disableTotp = async () => {
  if (!actionCode.value.trim()) return
  totpLoading.value = true
  try {
    await $fetch('/api/security/totp/disable', {
      method: 'DELETE',
      body: { code: actionCode.value.trim() },
    })
    actionCode.value = ''
    recoveryCodes.value = []
    await refreshStatus()
    toast.add({ title: '两步验证已关闭', color: 'success' })
  } catch (error: any) {
    toast.add({
      title: '无法关闭两步验证',
      description: error?.data?.message || error?.message,
      color: 'error',
    })
  } finally {
    totpLoading.value = false
  }
}

const regenerateRecoveryCodes = async () => {
  if (!actionCode.value.trim()) return
  totpLoading.value = true
  try {
    const result = await $fetch<{ recoveryCodes: string[] }>(
      '/api/security/totp/recovery',
      { method: 'POST', body: { code: actionCode.value.trim() } },
    )
    recoveryCodes.value = result.recoveryCodes
    actionCode.value = ''
    await refreshStatus()
    toast.add({ title: '恢复码已重新生成', color: 'success' })
  } catch (error: any) {
    toast.add({
      title: '无法生成恢复码',
      description: error?.data?.message || error?.message,
      color: 'error',
    })
  } finally {
    totpLoading.value = false
  }
}

const copyRecoveryCodes = async () => {
  await navigator.clipboard.writeText(recoveryCodes.value.join('\n'))
  toast.add({ title: '恢复码已复制', color: 'success' })
}

const addPasskey = async () => {
  passkeyLoading.value = true
  try {
    const result = await $fetch<{
      options: PublicKeyCredentialCreationOptionsJSON
      challengeId: string
    }>('/api/security/passkeys/register/options', { method: 'POST' })
    const response = await startRegistration({ optionsJSON: result.options })
    await $fetch('/api/security/passkeys/register/verify', {
      method: 'POST',
      body: {
        challengeId: result.challengeId,
        response,
        name: `Passkey ${new Date().toLocaleDateString()}`,
      },
    })
    await Promise.all([refreshPasskeys(), refreshStatus()])
    toast.add({ title: 'Passkey 已添加', color: 'success' })
  } catch (error: any) {
    if (error?.name === 'NotAllowedError') return
    toast.add({
      title: '无法添加 Passkey',
      description: error?.data?.message || error?.message,
      color: 'error',
    })
  } finally {
    passkeyLoading.value = false
  }
}

const deletePasskey = async (id: number) => {
  await $fetch(`/api/security/passkeys/${id}`, { method: 'DELETE' })
  await Promise.all([refreshPasskeys(), refreshStatus()])
  toast.add({ title: 'Passkey 已删除', color: 'success' })
}

const revokeSession = async (item: SessionItem) => {
  const result = await $fetch<{ current: boolean }>(
    `/api/security/sessions/${item.id}`,
    { method: 'DELETE' },
  )
  if (result.current) {
    await clear()
    await router.push('/signin')
    return
  }
  await refreshSessions()
  toast.add({ title: '会话已撤销', color: 'success' })
}

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleString() : '从未使用'

const describeDevice = (userAgent: string | null) => {
  if (!userAgent) return '未知设备'
  const browser = userAgent.includes('Edg/')
    ? 'Edge'
    : userAgent.includes('Chrome/')
      ? 'Chrome'
      : userAgent.includes('Firefox/')
        ? 'Firefox'
        : userAgent.includes('Safari/')
          ? 'Safari'
          : '浏览器'
  const os = userAgent.includes('Windows')
    ? 'Windows'
    : userAgent.includes('Mac OS')
      ? 'macOS'
      : userAgent.includes('Android')
        ? 'Android'
        : /iPhone|iPad/.test(userAgent)
          ? 'iOS'
          : '未知系统'
  return `${browser} · ${os}`
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="安全与登录" />
    </template>

    <template #body>
      <div class="mx-auto w-full max-w-5xl space-y-6">
        <section
          class="space-y-2 border-b border-neutral-200 pb-4 dark:border-neutral-800"
        >
          <h2
            class="text-xl font-semibold text-neutral-900 dark:text-neutral-100"
          >
            安全与登录
          </h2>
          <p class="text-sm text-neutral-600 dark:text-neutral-400">
            管理两步验证、Passkey、恢复码和已经登录的设备。
          </p>
        </section>

        <section
          class="rounded-md border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950"
        >
          <header
            class="flex items-center justify-between gap-4 border-b border-neutral-200 px-5 py-4 dark:border-neutral-800"
          >
            <div>
              <h3 class="text-base font-semibold">验证器两步验证</h3>
              <p class="mt-1 text-sm text-neutral-500">
                登录密码之后，再验证一次动态代码。
              </p>
            </div>
            <UBadge
              :color="status?.totpEnabled ? 'success' : 'neutral'"
              variant="soft"
            >
              {{ status?.totpEnabled ? '已启用' : '未启用' }}
            </UBadge>
          </header>

          <div class="space-y-5 px-5 py-5">
            <template v-if="!status?.totpEnabled">
              <div
                v-if="!totpSetup"
                class="flex items-center justify-between gap-4"
              >
                <p
                  class="text-sm leading-6 text-neutral-600 dark:text-neutral-400"
                >
                  可使用 1Password、Google Authenticator、Microsoft
                  Authenticator 等应用。
                </p>
                <UButton
                  class="shrink-0"
                  icon="lucide:qr-code"
                  color="neutral"
                  :loading="totpLoading"
                  @click="startTotpSetup"
                >
                  开始设置
                </UButton>
              </div>

              <div
                v-else
                class="grid items-start gap-6 md:grid-cols-[280px_1fr]"
              >
                <img
                  :src="totpSetup.qrCodeDataUrl"
                  alt="TOTP QR code"
                  class="size-[280px] max-w-full border border-neutral-200 dark:border-neutral-800"
                />
                <div class="space-y-4">
                  <div>
                    <p class="text-sm font-medium">扫描二维码</p>
                    <p class="mt-1 text-sm leading-6 text-neutral-500">
                      无法扫描时，可手动输入下面的密钥。
                    </p>
                    <code
                      class="mt-2 block break-all border-y border-neutral-200 py-2 text-xs dark:border-neutral-800"
                    >
                      {{ totpSetup.secret }}
                    </code>
                  </div>
                  <UFormField label="验证器中的 6 位代码">
                    <UInput
                      v-model="setupCode"
                      class="w-full max-w-xs"
                      autocomplete="one-time-code"
                      placeholder="000000"
                    />
                  </UFormField>
                  <div class="flex gap-2">
                    <UButton
                      color="neutral"
                      :loading="totpLoading"
                      @click="verifyTotpSetup"
                    >
                      验证并启用
                    </UButton>
                    <UButton
                      color="neutral"
                      variant="ghost"
                      @click="totpSetup = null"
                    >
                      取消
                    </UButton>
                  </div>
                </div>
              </div>
            </template>

            <template v-else>
              <div class="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                <UFormField label="当前动态验证码">
                  <UInput
                    v-model="actionCode"
                    class="w-full"
                    autocomplete="one-time-code"
                    placeholder="000000"
                  />
                </UFormField>
                <UButton
                  color="neutral"
                  variant="outline"
                  icon="lucide:refresh-cw"
                  :loading="totpLoading"
                  @click="regenerateRecoveryCodes"
                >
                  重置恢复码
                </UButton>
                <UButton
                  color="error"
                  variant="soft"
                  icon="lucide:shield-off"
                  :loading="totpLoading"
                  @click="disableTotp"
                >
                  关闭两步验证
                </UButton>
              </div>
              <p class="text-xs text-neutral-500">
                尚有 {{ status?.recoveryCodes || 0 }} 枚未使用恢复码。
              </p>
            </template>

            <div
              v-if="recoveryCodes.length"
              class="border-t border-neutral-200 pt-5 dark:border-neutral-800"
            >
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-sm font-semibold">保存恢复码</p>
                  <p class="mt-1 text-sm text-neutral-500">
                    每枚只能使用一次，离开本页后将不再显示。
                  </p>
                </div>
                <UButton
                  icon="lucide:copy"
                  color="neutral"
                  variant="outline"
                  size="sm"
                  @click="copyRecoveryCodes"
                >
                  复制全部
                </UButton>
              </div>
              <div
                class="mt-4 grid gap-x-8 gap-y-2 font-mono text-sm sm:grid-cols-2"
              >
                <code
                  v-for="code in recoveryCodes"
                  :key="code"
                  >{{ code }}</code
                >
              </div>
            </div>
          </div>
        </section>

        <section
          class="rounded-md border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950"
        >
          <header
            class="flex items-center justify-between gap-4 border-b border-neutral-200 px-5 py-4 dark:border-neutral-800"
          >
            <div>
              <h3 class="text-base font-semibold">Passkey</h3>
              <p class="mt-1 text-sm text-neutral-500">
                使用 Windows Hello、Touch ID 或手机解锁，无需输入密码。
              </p>
            </div>
            <UButton
              icon="lucide:fingerprint"
              color="neutral"
              :disabled="!passkeySupported"
              :loading="passkeyLoading"
              @click="addPasskey"
            >
              添加 Passkey
            </UButton>
          </header>
          <div
            v-if="passkeys?.length"
            class="divide-y divide-neutral-200 dark:divide-neutral-800"
          >
            <div
              v-for="passkey in passkeys"
              :key="passkey.id"
              class="flex items-center gap-4 px-5 py-4"
            >
              <Icon
                name="lucide:key-round"
                class="size-5 text-neutral-500"
              />
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium">{{ passkey.name }}</p>
                <p class="mt-1 text-xs text-neutral-500">
                  {{
                    passkey.deviceType === 'multiDevice' ? '可同步' : '此设备'
                  }}
                  · 最近使用 {{ formatDate(passkey.lastUsedAt) }}
                </p>
              </div>
              <UButton
                icon="lucide:trash-2"
                color="error"
                variant="ghost"
                :aria-label="`删除 ${passkey.name}`"
                @click="deletePasskey(passkey.id)"
              />
            </div>
          </div>
          <p
            v-else
            class="px-5 py-8 text-center text-sm text-neutral-500"
          >
            尚未添加 Passkey。
          </p>
        </section>

        <section
          class="rounded-md border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950"
        >
          <header
            class="border-b border-neutral-200 px-5 py-4 dark:border-neutral-800"
          >
            <h3 class="text-base font-semibold">活动会话</h3>
            <p class="mt-1 text-sm text-neutral-500">
              撤销不认识的设备后，该设备下一次请求会立即退出。
            </p>
          </header>
          <div
            v-if="sessions?.length"
            class="divide-y divide-neutral-200 dark:divide-neutral-800"
          >
            <div
              v-for="item in sessions"
              :key="item.id"
              class="flex items-center gap-4 px-5 py-4"
              :class="item.revokedAt ? 'opacity-50' : ''"
            >
              <Icon
                name="lucide:monitor-smartphone"
                class="size-5 text-neutral-500"
              />
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <p class="truncate text-sm font-medium">
                    {{ describeDevice(item.userAgent) }}
                  </p>
                  <UBadge
                    v-if="item.current"
                    color="success"
                    variant="soft"
                    size="sm"
                  >
                    当前设备
                  </UBadge>
                  <UBadge
                    v-if="item.revokedAt"
                    color="neutral"
                    variant="soft"
                    size="sm"
                  >
                    已撤销
                  </UBadge>
                </div>
                <p class="mt-1 text-xs text-neutral-500">
                  {{ item.ipAddress || '未知地址' }} · 最近活动
                  {{ formatDate(item.lastSeenAt) }}
                </p>
              </div>
              <UButton
                v-if="!item.revokedAt"
                color="error"
                variant="ghost"
                icon="lucide:log-out"
                :aria-label="item.current ? '退出当前设备' : '撤销此设备'"
                @click="revokeSession(item)"
              />
            </div>
          </div>
          <p
            v-else
            class="px-5 py-8 text-center text-sm text-neutral-500"
          >
            当前会话是在此功能启用前创建的，下一次登录后会显示在这里。
          </p>
        </section>
      </div>
    </template>
  </UDashboardPanel>
</template>
