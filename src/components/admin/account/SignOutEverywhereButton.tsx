"use client";

import { useRef, useState } from "react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { signOutEverywhereAction } from "@/server/admin/account/actions";

/** Ends every session of this account, including the current one, and returns to the login page. */
export function SignOutEverywhereButton() {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <form ref={formRef} action={signOutEverywhereAction} className="hidden" />
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        trigger={<Button variant="outline">Sign out everywhere</Button>}
        title="Sign out everywhere"
        description="Ends every session of your account on every device, including this one. You will need to sign in again."
        confirmLabel="Sign out everywhere"
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </>
  );
}
