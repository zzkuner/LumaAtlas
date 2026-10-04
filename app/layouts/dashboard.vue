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

const navItems = computed<NavigationMenuItem[][]>(() => [
  [
    {
      label: $t('title.dashboard'),
      icon: 'tabler:dashboard',
      to: '/dashboard',
    },
    {
      label: $t('title.photos'),
      icon: 'tabler:photo-cog',
      to: '/dashboard/photos',
    },
    {
      label: $t('title.albums'),
      icon: 'tabler:album',
      to: '/dashboard/albums',
    },
    {
      label: $t('title.queue'),
      icon: 'tabler:list-check',
      to: '/dashboard/queue',
    },
    {
      label: $t('title.logs'),
      icon: 'tabler:file-text',
      to: '/dashboard/logs',
    },
    {
      label: $t('title.siteAdministration'),
      icon: 'tabler:settings',
      defaultOpen: route.path.startsWith('/dashboard/settings'),
      children: [
        {
          label: $t('title.generalSettings'),
          icon: 'tabler:settings-2',
          to: '/dashboard/settings/general',
        },
        {
          label: $t('title.storageSettings'),
          icon: 'tabler:database',
          to: '/dashboard/settings/storage',
        },
        {
          label: $t('title.privacySettings'),
          icon: 'tabler:shield-lock',
          to: '/dashboard/settings/privacy',
        },
        {
          label: $t('title.mapAndLocation'),
          icon: 'tabler:map-pin',
          to: '/dashboard/settings/map',
        },
        {
          label: $t('title.systemSettings'),
          icon: 'tabler:cpu',
          to: '/dashboard/settings/system',
        },
      ],
    },
  ],
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
    class="h-svh flex flex-col gap-4 items-center justify-center px-4"
  >
    <Icon
      name="tabler:alert-triangle"
      class="size-12 text-primary"
    />
    <p class="text-gray-500 text-center">
      {{
        !user?.isAdmin
          ? 'Please login to view dashboard'
          : 'Sorry, you do not have access to this page.'
      }}
    </p>
    <UButton @click="handleLogin">Sign In</UButton>
  </div>
  <UDashboardGroup v-else>
    <UDashboardSidebar
      id="cframe-dashboard-sidebar"
      resizable
      collapsible
      mode="drawer"
      :min-size="8"
      :max-size="12"
      :ui="{ footer: 'border-t border-default' }"
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
              class="text-lg font-medium line-clamp-1"
            >
              {{ appTitle }}
            </NuxtLink>
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
        <UNavigationMenu
          :collapsed="collapsed"
          :items="navItems[0]"
          orientation="vertical"
        />
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

<style scoped></style>
