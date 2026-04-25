import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuthStore } from "@/stores/auth";
import { useUserStore } from "@/stores/user";

export function useRequireAuth() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const ensureAuthenticated = useAuthStore((s) => s.ensureAuthenticated);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    ensureAuthenticated().then((ok) => {
      if (!ok) navigate("/session", { replace: true });
      else setChecked(true);
    });
  }, [ensureAuthenticated, navigate, isAuthenticated]);

  return checked;
}

export function useRequireGuest() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  useEffect(() => {
    if (isAuthenticated) navigate("/home", { replace: true });
  }, [isAuthenticated, navigate]);

  return !isAuthenticated;
}

export function useInitUser() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const fetchProfile = useUserStore((s) => s.fetchProfile);
  const fetchStorage = useUserStore((s) => s.fetchStorage);
  const checkAdmin = useUserStore((s) => s.checkAdmin);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
      fetchStorage();
      checkAdmin();
    }
  }, [isAuthenticated, fetchProfile, fetchStorage, checkAdmin]);
}
