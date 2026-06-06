"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Input, Button } from "@/components/ds/controls";
import { addMemberAction, type AddMemberState } from "@/app/(dashboard)/family/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button variant="primary" icon="user-plus" type="submit" disabled={pending}>
      {pending ? "מוסיף…" : "הזמן"}
    </Button>
  );
}

const initialState: AddMemberState = {};

export function AddMemberForm() {
  const [state, formAction] = useActionState(addMemberAction, initialState);

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 140 }}>
          <Input name="name" placeholder="שם (לדוגמה: דנה)" icon="user" />
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <Input name="phone" placeholder="972501234567" icon="phone" />
        </div>
        <SubmitButton />
      </div>
      <p style={{ fontSize: 11.5, color: "var(--fg-4)" }}>
        הזינו את המספר עם קידומת המדינה ללא + (לדוגמה 972501234567). מרגע ההוספה הבוט יעבד הודעות מהמספר.
      </p>
      {state.error && <p style={{ fontSize: 13, color: "var(--fg-danger)" }}>{state.error}</p>}
      {state.success && <p style={{ fontSize: 13, color: "var(--fg-success)" }}>{state.success}</p>}
    </form>
  );
}
