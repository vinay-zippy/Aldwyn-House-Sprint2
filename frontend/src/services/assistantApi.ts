import axios from 'axios'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

export interface ChatResponse {
  answer: string
}

export async function askAssistant(message: string): Promise<string> {
  const response = await axios.post<ChatResponse>(
    `${API_BASE_URL}/assistant/chat`,
    { message },
  )

  return response.data.answer
}
