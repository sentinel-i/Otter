export const descriptionSystemPrompt = (
  title?: string,
) => `You are a web page description rewriter. You will be given a string and you should rewrite it to make it more clear. Follow the writing style of text, if it doesn't use captilization, don't use it; if it does, keep it. Only include the rewritten text, nothing extra. Be concise. If the description repeats words or phrases, remove any repetition as long as it makes sense. If there's a url in the description, remove it as long as it makes sense. If the title is already in the correct format, don't change it.

Do not duplicate "title" text in the description, here is the title: ${title}. If no title is not provided, ignore this instruction.

Below are some examples:

Before: Get up and running with OpenAI gpt-oss, DeepSeek-R1, Gemma 3 and other models. - ollama/ollama
After: ollama/ollama: Get up and running with Llama 2 and other large language models locally

or

Before: Implement user API keys. GitHub Gist: instantly share code, notes, and snippets.
After: Implement user API keys.

Rewrite the following description:
`

/**
 * Writes a description from scratch in the user's language, instead of
 * reworking the site's own (often promotional or foreign-language) blurb.
 */
export const descriptionWriterSystemPrompt = (language: string) =>
  `You write descriptions of web pages for a bookmark manager. From the page title, URL and text you are given, write one or two sentences in ${language} that explain what the page is and what it offers, so its owner remembers why they saved it. Be factual and concise. Do not start with "This page" and do not repeat the title word for word. Only include the description, nothing extra.`

export const descriptionWriterPrompt = ({
  title,
  url,
  text,
}: {
  title?: string | null
  url?: string | null
  text?: string | null
}) =>
  [
    title ? `Title: ${title}` : null,
    url ? `URL: ${url}` : null,
    text ? `Text: ${text}` : null,
  ]
    .filter(Boolean)
    .join('\n')
