import { useState } from 'react'
import { askAssistant } from '../services/assistantApi'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

export function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Hello! I’m the Aldwyn House AI Concierge. Ask me about hotel policies, amenities, services, and operating hours.',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSend() {
    const message = input.trim()

    if (!message || loading) return

    setMessages((current) => [
      ...current,
      { role: 'user', content: message },
    ])
    setInput('')
    setLoading(true)

    try {
      const answer = await askAssistant(message)

      setMessages((current) => [
        ...current,
        { role: 'assistant', content: answer },
      ])
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content:
            'Sorry, I could not connect to the AI Concierge right now. Please try again.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      handleSend()
    }
  }

  return (
    <div className="h-[calc(100vh-80px)] p-4">
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

        <div className="shrink-0 border-b border-gray-200 px-5 py-4">
          <h1 className="text-xl font-semibold text-gray-900">
            AI Concierge
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Ask about hotel policies, amenities and services.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-gray-50 px-5 py-4">
          <div className="mx-auto max-w-3xl space-y-3">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${
                  message.role === 'user'
                    ? 'justify-end'
                    : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[70%] break-words rounded-2xl px-4 py-2.5 text-sm leading-6 ${
                    message.role === 'user'
                      ? 'bg-gray-900 text-white'
                      : 'border border-gray-200 bg-white text-gray-800'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-500">
                  Thinking...
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-gray-200 bg-white p-3">
          <div className="mx-auto flex max-w-3xl gap-2">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about the spa, restaurant, pool..."
              disabled={loading}
              className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-500"
            />

            <button
              type="button"
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="shrink-0 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
