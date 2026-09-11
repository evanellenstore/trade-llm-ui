import api from './api';

export async function sendMessage(message: string) {
  const response = await api.post('/ai/intent', { command: message });
  return response.data;
}
