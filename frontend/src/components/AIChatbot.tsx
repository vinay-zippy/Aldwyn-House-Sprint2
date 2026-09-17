import { useEffect, useRef, useState } from 'react'
import { Bot, Send, X } from 'lucide-react'
import { askAssistant, type ChatMessage } from '../services/api'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

export function AIChatbot() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Hello! I’m the Aldwyn House AI Concierge. How can I help you?',
    },
  ])

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    })
  }, [messages, loading])

  async function handleSend() {
    const message = input.trim()

    if (!message || loading) return

    const history: ChatMessage[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    setMessages((current) => [
      ...current,
      { role: 'user', content: message },
    ])

    setInput('')
    setLoading(true)

    try {
      const answer = await askAssistant(message, history)

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
            'Sorry, I could not connect to the AI Concierge right now.',
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
    <>
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[520px] w-[380px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-xl border border-[#d9d5cc] bg-[#ffffff] shadow-2xl">
          <div className="flex shrink-0 items-center justify-between bg-[#101c2c] px-4 py-3 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dce6f0] text-[#172a46]">
                <Bot size={20} />
              </div>

              <div>
                <p className="text-sm font-semibold">AI Concierge</p>
                <p className="text-xs text-[#d8ded9]">
                  Aldwyn House Assistant
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
              aria-label="Close AI Concierge"
            >
              <X size={18} />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#f4f1ea] p-4">
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
                  className={`max-w-[82%] break-words rounded-2xl px-3 py-2 text-sm leading-5 ${
                    message.role === 'user'
                      ? 'bg-[#101c2c] text-white'
                      : 'border border-[#d9d5cc] bg-white text-[#17202a]'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-[#d9d5cc] bg-white px-3 py-2 text-sm text-[#4b5563]">
                  Thinking...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="shrink-0 border-t border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about the hotel..."
                disabled={loading}
                className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
              />

              <button
                type="button"
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#101c2c] text-white transition hover:bg-[#172a46] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send message"
              >
                <Send size={17} />
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#101c2c] text-white shadow-lg transition hover:scale-105 hover:bg-[#172a46]"
        aria-label={open ? 'Close AI Concierge' : 'Open AI Concierge'}
      >
        {open ? <X size={24} /> : <Bot size={24} />}
      </button>
    </>
  )
}
