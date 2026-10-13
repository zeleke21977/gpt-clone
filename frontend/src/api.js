import axios from "axios";

// Where the backend lives:
//  - development: http://localhost:3130
//  - production, backend serves the frontend: same origin ("")
//  - production, separate hosts: set VITE_API_URL at build time
export const API_ORIGIN = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:3130" : "")
).replace(/\/$/, "");

const api = axios.create({ baseURL: `${API_ORIGIN}/api` });

export const errorMessage = (error) => {
  if (error.response?.data?.message) return error.response.data.message;
  if (error.code === "ERR_NETWORK") {
    return "Cannot reach the server. Check your connection.";
  }
  return error.message || "Something went wrong";
};

export default api;
