import axios from "axios";

// Backend URL for local development and production
export const API_ORIGIN = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? "http://localhost:20757"
    : "https://gpt-clone-1-ttsy.onrender.com")
).replace(/\/+$/, "");

// All API requests use the /api prefix
const api = axios.create({
  baseURL: `${API_ORIGIN}/api`,
});

export const errorMessage = (error) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.code === "ERR_NETWORK") {
    return "Cannot reach the server. Check your connection.";
  }

  return error.message || "Something went wrong";
};

export default api;
