const CHAT_BOTS = /discordbot|twitterbot|telegrambot|slackbot|whatsapp|facebookexternalhit|linkedinbot|redditbot/i

// Chat apps skip embeds on non-2xx responses, so they get the 404 page (with its embed meta) as a 200.
// Browsers and search engines still get the real 404.
export const onRequest = async ({ request, next }) => {
    const response = await next()
    if (response.status !== 404) return response
    if (! CHAT_BOTS.test(request.headers.get("user-agent") ?? "")) return response

    const headers = new Headers(response.headers)
    headers.set("Cache-Control", "private, no-store")
    return new Response(response.body, { status: 200, headers })
}
