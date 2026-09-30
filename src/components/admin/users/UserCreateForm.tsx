"use client";

import { useRouter } from "next/navigation";
import { ActionField } from "@/components/admin/ActionField";
import { ActionForm } from "@/components/admin/ActionForm";
import { ActionSubmit } from "@/components/admin/ActionSubmit";
import { RolesFieldset } from "@/components/admin/users/RolesFieldset";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { createUser } from "@/server/admin/users/actions";

/** The "New user" form. The admin sets the initial password and communicates it out of band. */
export function UserCreateForm({ actorIsSuperAdmin }: { actorIsSuperAdmin: boolean }) {
  const router = useRouter();

  return (
    <ActionForm
      action={createUser}
      successMessage="User created."
      onSuccess={(data) => router.push(`/admin/users/${data.id}`)}
      className="grid max-w-xl gap-5"
    >
      <ActionField name="name" label="Full name" required>
        <Input autoComplete="off" maxLength={120} />
      </ActionField>
      <ActionField name="email" label="Email address" required>
        <Input type="email" autoComplete="off" maxLength={254} />
      </ActionField>
      <ActionField
        name="password"
        label="Initial password"
        required
        hint="12–128 characters, mixing at least two kinds of character. Share it with the user outside this system."
      >
        <Input type="password" autoComplete="new-password" maxLength={128} />
      </ActionField>
      <RolesFieldset
        defaultSelected={[]}
        locked={actorIsSuperAdmin ? {} : { SUPER_ADMIN: "Only a Super Admin can grant this role." }}
      />
      {!actorIsSuperAdmin ? (
        <Alert variant="info">Only a Super Admin can grant the Super Admin role.</Alert>
      ) : null}
      <div>
        <ActionSubmit pendingLabel="Creating…">Create user</ActionSubmit>
      </div>
    </ActionForm>
  );
}
