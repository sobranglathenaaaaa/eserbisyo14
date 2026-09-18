"use client";

import { useState, useRef, useCallback } from "react";
export function useProtectedSubmit<Args extends any[], ReturnVal>(
  submitFn: (...args: Args) => Promise<ReturnVal>
) {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const isLockedRef = useRef<boolean>(false);

  const handleSubmit = useCallback(
    async (...args: Args): Promise<ReturnVal | undefined> => {
      // 🛑 Synchronous Ref Guard: Block duplicate calls immediately
      if (isLockedRef.current) {
        console.warn("[useProtectedSubmit] Rapid consecutive submit ignored.");
        return undefined;
      }

      // Lock execution immediately
      isLockedRef.current = true;
      setIsSubmitting(true);

      try {
        const result = await submitFn(...args);
        return result;
      } finally {
        // Always release lock when finished (success or error)
        isLockedRef.current = false;
        setIsSubmitting(false);
      }
    },
    [submitFn]
  );

  const resetSubmitState = useCallback(() => {
    isLockedRef.current = false;
    setIsSubmitting(false);
  }, []);

  return {
    handleSubmit,
    isSubmitting,
    resetSubmitState,
  };
}
