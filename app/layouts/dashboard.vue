<script lang="ts" setup>
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()
const router = useRouter()
const { loggedIn, user, clear } = useUserSession()
const settingsStore = useSettingsStore()

const appTitle = computed(() => {
  const value = settingsStore.getSetting('app:title')
  return value ? String(value) : $t('title.dashboard')
})

const overviewNav = computed<NavigationMenuItem[]>(() => [
  {
    label: $t('title.dashboard'),
    icon: 'lucide:layout-dashboard',
    to: '/dashboard',
  },
])

const contentNav = computed<NavigationMenuItem[]>(() => [
  {
    label: $t('title.photos'),
    icon: 'lucide:image',
    to: '/dashboard/photos',
  },
  {
    label: $t('title.albums'),
    icon: 'lucide:images',
    to: '/dashboard/albums',
  },
  {
    label: $t('title.storageImport'),
    icon: 'lucide:folder-input',
    to: '/dashboard/import',
  },
])

const operationsNav = computed<NavigationMenuItem[]>(() => [
  {
    label: $t('title.queue'),
    icon: 'lucide:list-checks',
    to: '/dashboard/queue',
  },
  {
    label: $t('title.logs'),
    icon: 'lucide:file-clock',
    to: '/dashboard/logs',
  },
  {
    label: $t('title.backup'),
    icon: 'lucide:archive-restore',
    to: '/dashboard/backup',
  },
])

const settingsNav = computed<NavigationMenuItem[]>(() => [
  {
    label: $t('title.siteAdministration'),
    icon: 'lucide:sliders-horizontal',
    defaultOpen: route.path.startsWith('/dashboard/settings'),
    children: [
      {
        label: $t('title.generalSettings'),
        icon: 'lucide:sliders-horizontal',
        to: '/dashboard/settings/general',
      },
      {
        label: $t('title.publishingSettings'),
        icon: 'lucide:rss',
        to: '/dashboard/settings/publishing',
      },
      {
        label: $t('title.storageSettings'),
        icon: 'lucide:database',
        to: '/dashboard/settings/storage',
      },
      {
        label: $t('title.privacySettings'),
        icon: 'lucide:shield-check',
        to: '/dashboard/settings/privacy',
      },
      {
        label: '安全与登录',
        icon: 'lucide:fingerprint',
        to: '/dashboard/settings/security',
      },
      {
        label: $t('title.mapAndLocation'),
        icon: 'lucide:map-pin',
        to: '/dashboard/settings/map',
      },
      {
        label: $t('title.systemSettings'),
        icon: 'lucide:cpu',
        to: '/dashboard/settings/system',
      },
    ],
  },
])

useHead({
  title: $t('title.dashboard'),
  titleTemplate: (title) => `${title ? `${title} | ` : ''}${appTitle.value}`,
})

const handleLogin = () => {
  router.push({
    path: '/signin',
    query: { redirect: route.fullPath },
  })
}

const handleLogout = async () => {
  await $fetch('/api/logout')
  await clear()
  await router.push('/signin')
}

const userMenuItems = computed(() => [
  {
    label: $t('ui.action.home.tooltip'),
    icon: 'lucide:external-link',
    to: '/',
  },
  {
    label: $t('ui.action.logout.tooltip'),
    icon: 'lucide:log-out',
    color: 'error' as const,
    onSelect: handleLogout,
  },
])
</script>

<template>
  <!-- TODO: unified error page -->
  <div
    v-if="!loggedIn || !user?.isAdmin"
    class="flex h-svh flex-col items-center justify-center gap-4 bg-neutral-50 px-4 dark:bg-neutral-950"
  >
    <Icon
      name="lucide:triangle-alert"
      class="size-12 text-primary"
    />
    <p class="text-center text-neutral-500">
      {{ !loggedIn ? '请登录后进入管理后台' : '当前账号没有后台管理权限' }}
    </p>
    <div class="flex items-center gap-2">
      <UButton
        v-if="!loggedIn"
        @click="handleLogin"
      >
        登录
      </UButton>
      <template v-else>
        <UButton
          to="/"
          color="neutral"
          variant="outline"
          icon="lucide:arrow-left"
        >
          返回首页
        </UButton>
        <UButton
          color="neutral"
          variant="ghost"
          icon="lucide:log-out"
          @click="handleLogout"
        >
          退出登录
        </UButton>
      </template>
    </div>
  </div>
  <UDashboardGroup
    v-else
    class="lumaatlas-dashboard bg-neutral-50 dark:bg-neutral-950"
  >
    <UDashboardSidebar
      id="cframe-dashboard-sidebar"
      resizable
      collapsible
      mode="drawer"
      :min-size="8"
      :max-size="12"
      class="bg-white dark:bg-neutral-950"
      :ui="{
        header: 'h-16 border-b border-neutral-200 dark:border-neutral-800',
        body: 'py-4',
        footer: 'border-t border-neutral-200 dark:border-neutral-800',
      }"
      :toggle="{
        color: 'neutral',
        variant: 'ghost',
        class: 'rounded-md',
      }"
    >
      <template #toggle>
        <UDashboardSidebarToggle variant="soft" />
      </template>

      <template #header="{ collapsed }">
        <div
          v-if="!collapsed"
          class="flex items-center gap-2"
        >
          <span
            class="flex size-8 shrink-0 items-center justify-center border border-neutral-900 text-neutral-900 dark:border-white dark:text-white"
          >
            <Icon
              name="lucide:aperture"
              class="size-4"
            />
          </span>
          <div class="flex flex-col overflow-hidden">
            <NuxtLink
              to="/"
              class="font-brand line-clamp-1 text-xl font-semibold"
            >
              {{ appTitle }}
            </NuxtLink>
            <span class="text-xs text-neutral-500">管理后台</span>
          </div>
        </div>
        <span
          v-else
          class="mx-auto flex size-8 items-center justify-center border border-neutral-900 text-neutral-900 dark:border-white dark:text-white"
        >
          <Icon
            name="lucide:aperture"
            class="size-4"
          />
        </span>
      </template>

      <template #default="{ collapsed }">
        <div class="space-y-5">
          <UNavigationMenu
            :collapsed="collapsed"
            :items="overviewNav"
            orientation="vertical"
          />

          <div>
            <p
              v-if="!collapsed"
              class="mb-1.5 px-2 text-xs font-medium text-neutral-400"
            >
              内容
            </p>
            <div
              v-else
              class="mx-2 mb-3 border-t border-neutral-200 dark:border-neutral-800"
            />
            <UNavigationMenu
              :collapsed="collapsed"
              :items="contentNav"
              orientation="vertical"
            />
          </div>

          <div>
            <p
              v-if="!collapsed"
              class="mb-1.5 px-2 text-xs font-medium text-neutral-400"
            >
              运行
            </p>
            <div
              v-else
              class="mx-2 mb-3 border-t border-neutral-200 dark:border-neutral-800"
            />
            <UNavigationMenu
              :collapsed="collapsed"
              :items="operationsNav"
              orientation="vertical"
            />
          </div>

          <div>
            <p
              v-if="!collapsed"
              class="mb-1.5 px-2 text-xs font-medium text-neutral-400"
            >
              系统
            </p>
            <div
              v-else
              class="mx-2 mb-3 border-t border-neutral-200 dark:border-neutral-800"
            />
            <UNavigationMenu
              :collapsed="collapsed"
              :items="settingsNav"
              orientation="vertical"
            />
          </div>
        </div>
      </template>

      <template #footer="{ collapsed }">
        <UDropdownMenu
          :items="userMenuItems"
          :content="{ side: 'top', align: 'start' }"
        >
          <UButton
            :avatar="{
              src: user?.avatar || '',
              alt: user?.username || user?.email || 'User Avatar',
              icon: 'lucide:user-round',
            }"
            :label="collapsed ? undefined : user?.username || 'User'"
            :trailing-icon="collapsed ? undefined : 'lucide:chevrons-up-down'"
            size="lg"
            color="neutral"
            variant="ghost"
            class="w-full rounded-md"
            :block="collapsed"
          />
        </UDropdownMenu>
      </template>
    </UDashboardSidebar>

    <NuxtPage />
  </UDashboardGroup>
</template>

<style>
.lumaatlas-dashboard [data-slot='header'] {
  flex-shrink: 0;
}

.lumaatlas-dashboard [data-slot='body'] {
  scrollbar-gutter: stable;
}

.lumaatlas-dashboard [data-slot='base'] {
  letter-spacing: 0;
}
</style>
