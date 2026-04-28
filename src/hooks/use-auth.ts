import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuthStore } from "@/stores/auth";
import { useUserStore } from "@/stores/user";

export function useRequireAuth() {
  const navigate = useNavigate();
  const accessToken = useAuthStore((s) => s.accessToken);
  const ensureAuthenticated = useAuthStore((s) => s.ensureAuthenticated);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    ensureAuthenticated().then((ok) => {
      if (!ok) navigate("/session", { replace: true });
      else setChecked(true);
    });
  }, [ensureAuthenticated, navigate, accessToken]);

  return checked;
}

export function useRequireGuest() {
  const navigate = useNavigate();
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (accessToken) navigate("/home", { replace: true });
  }, [accessToken, navigate]);

  return !accessToken;
}

export function useInitUser() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const fetchProfile = useUserStore((s) => s.fetchProfile);
  const fetchStorage = useUserStore((s) => s.fetchStorage);

  useEffect(() => {
    if (accessToken) {
      fetchProfile();
      fetchStorage();
    }
  }, [accessToken, fetchProfile, fetchStorage]);
}
