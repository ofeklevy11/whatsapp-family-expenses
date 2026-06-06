"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Input, Button } from "@/components/ds/controls";
import { addCategoryAction, type AddCategoryState } from "@/app/(dashboard)/family/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button variant="primary" icon="plus" type="submit" disabled={pending}>
      {pending ? "מוסיף…" : "הוסף"}
    </Button>
  );
}

const initialState: AddCategoryState = {};

export function AddCategoryForm() {
  const [state, formAction] = useActionState(addCategoryAction, initialState);

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <Input name="name" placeholder="קטגוריה חדשה" icon="tag" />
        <SubmitButton />
      </div>
      {state.error && <p style={{ fontSize: 13, color: "var(--fg-danger)" }}>{state.error}</p>}
      {state.success && <p style={{ fontSize: 13, color: "var(--fg-success)" }}>{state.success}</p>}
    </form>
  );
}
