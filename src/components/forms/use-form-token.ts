"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { issueFormToken } from "@/server/inquiries/actions";

/**
 * The signed, timestamped token the server asks every public form to carry. The pages are static,
 * so it is requested once the form is on screen and again after any refused submission (a token
 * that was too fresh or too old is replaced by one that is neither by the time the visitor retries).
 * While no token could be fetched it is empty and the server answers with a retry message.
 */
export function useFormToken(): { token: string; refresh: () => void } {
  const [token, setToken] = useState("");
  const mounted = useRef(true);

  const refresh = useCallback(() => {
    issueFormToken()
      .then((next) => {
        if (mounted.current) setToken(next);
      })
      .catch(() => {
        if (mounted.current) setToken("");
      });
  }, []);

  useEffect(() => {
    mounted.current = true;
    refresh();
    return () => {
      mounted.current = false;
    };
  }, [refresh]);

  return { token, refresh };
}
