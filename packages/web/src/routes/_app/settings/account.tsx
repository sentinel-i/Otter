import { createFileRoute } from '@tanstack/react-router'
import { CodeBlock } from '@/components/CodeBlock'
import { UpdateInfoForm } from '@/components/UpdateInfoForm'
import { useUser } from '@/components/UserProvider'
import { getSession } from '@/utils/fetching/user'

export const Route = createFileRoute('/_app/settings/account')({
  component: RouteComponent,
  head: () => ({
    meta: [
      {
        title: 'Account settings',
      },
    ],
  }),
  loader: async () => {
    const session = await getSession()
    return session?.user ?? null
  },
})

const OpenInNewTabSetting = () => {
  const { profile, handleUpdateUISettings } = useUser()

  return (
    <label className="flex items-center gap-2xs">
      <input
        type="checkbox"
        className="size-5 shrink-0 cursor-pointer accent-accent9"
        checked={profile?.settings_open_in_new_tab ?? false}
        onChange={(event) =>
          handleUpdateUISettings({
            payload: event.target.checked,
            type: 'settings_open_in_new_tab',
          })
        }
      />
      Open bookmarks in a new tab
    </label>
  )
}

const TranslateDescriptionsSetting = () => {
  const { profile, handleUpdateUISettings } = useUser()

  return (
    <label className="flex items-center gap-2xs">
      <input
        type="checkbox"
        className="size-5 shrink-0 cursor-pointer accent-accent9"
        checked={profile?.settings_description_language === 'French'}
        onChange={(event) =>
          handleUpdateUISettings({
            payload: event.target.checked ? 'French' : null,
            type: 'settings_description_language',
          })
        }
      />
      Translate scraped descriptions into French
    </label>
  )
}

function RouteComponent() {
  const user = Route.useLoaderData()

  return (
    <article className="flow">
      <h3>User info</h3>
      Account ID: <CodeBlock>{user?.id}</CodeBlock>
      <h3>Update account</h3>
      <UpdateInfoForm user={user} />
      <h3>Preferences</h3>
      <OpenInNewTabSetting />
      <p className="text-step--1 text-theme10">
        The &ldquo;More&rdquo; menu on each bookmark always offers the other
        option.
      </p>
      <TranslateDescriptionsSetting />
      <p className="text-step--1 text-theme10">
        Applies to &ldquo;Scrape this URL&rdquo;, the bulk Scrape action and the
        AI description rewrite.
      </p>
    </article>
  )
}
