import api from '../../lib/api';

export async function login(username, password) {
  const { data } = await api.post('/auth/login', { username, password });
  return data; // { token, tokenType, expiresIn, user }
}

export async function fetchMe() {
  const { data } = await api.get('/auth/me');
  return data;
}
