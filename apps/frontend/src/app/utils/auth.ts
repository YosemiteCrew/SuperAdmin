export const isAuthenticated = () => {
  if (typeof window !== "undefined") {
    return !!localStorage.getItem("token"); // Replace with real token logic
  }
  return false;
};