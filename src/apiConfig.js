// Centralized API Configuration for Local Development and Production (Render)
export const API_BASE_URL = (
  process.env.REACT_APP_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? 'https://planify-i39c.onrender.com'
    : 'http://localhost:8080')
).replace(/\/+$/, '');

export default API_BASE_URL;
