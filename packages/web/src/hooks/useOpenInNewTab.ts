import { useUser } from '@/components/UserProvider'

/**
 * Whether clicking a bookmark opens it in a new tab (the user's
 * "Open bookmarks in a new tab" setting), plus the matching link props.
 */
export const useOpenInNewTab = () => {
  const { profile } = useUser()
  const openInNewTab = profile?.settings_open_in_new_tab ?? false

  return {
    linkProps: openInNewTab
      ? { rel: 'noopener noreferrer', target: '_blank' }
      : {},
    openInNewTab,
  }
}
