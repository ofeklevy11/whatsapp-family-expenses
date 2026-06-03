import { Card } from "./card";

export function NoFamilyState() {
  return (
    <Card className="p-8 text-center">
      <h2 className="text-lg font-semibold text-slate-800">
        עדיין אין משפחה במערכת
      </h2>
      <p className="mt-2 text-sm text-slate-500">
        הרץ את הפקודות הבאות כדי ליצור משפחה ראשונית ונתוני בסיס:
      </p>
      <pre dir="ltr" className="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-3 text-left text-sm text-emerald-300">
        npm run db:migrate{"\n"}npm run db:seed
      </pre>
    </Card>
  );
}

export function EmptyRow({ message, cols }: { message: string; cols: number }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-8 text-center text-sm text-slate-400">
        {message}
      </td>
    </tr>
  );
}
