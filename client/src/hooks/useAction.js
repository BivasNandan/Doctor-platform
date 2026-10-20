import { useCallback } from "react";
import { useToast } from "../context/ToastContext.jsx";

/**
 * Runs a mutation and reports the outcome as a toast.
 *
 *   const run = useAction();
 *   await run(() => adminService.deactivateDoctor(id), { success: (doctor) => `${doctor.name} deactivated.` });
 *
 * Resolves with the mutation result, or `undefined` when it failed
 * (the error message has already been shown).
 */
export function useAction() {
  const { notify } = useToast();
  return useCallback(
    async (mutation, { success } = {}) => {
      try {
        const result = await mutation();
        if (success) notify(typeof success === "function" ? success(result) : success);
        return result;
      } catch (error) {
        notify(error.message || "Something went wrong. Please try again.");
        return undefined;
      }
    },
    [notify],
  );
}
