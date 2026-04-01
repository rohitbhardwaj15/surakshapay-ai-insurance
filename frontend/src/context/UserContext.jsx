import { createContext, useContext, useMemo, useState } from "react";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [userId, setUserId] = useState(localStorage.getItem("suraksha_user_id") || "");
  const [city, setCity] = useState(localStorage.getItem("suraksha_city") || "");

  const saveUser = (id, selectedCity) => {
    setUserId(id);
    setCity(selectedCity);
    localStorage.setItem("suraksha_user_id", id);
    localStorage.setItem("suraksha_city", selectedCity);
  };

  const clearUser = () => {
    setUserId("");
    setCity("");
    localStorage.removeItem("suraksha_user_id");
    localStorage.removeItem("suraksha_city");
  };

  const value = useMemo(() => ({ userId, city, saveUser, clearUser }), [userId, city]);
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used inside UserProvider");
  return context;
}
