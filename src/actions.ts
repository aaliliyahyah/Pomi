import { AllowanceWarning, changeNotebook } from "./db";
import type { Notebook } from "./model";

export async function commit(
  change: (book: Notebook) => Notebook,
  confirmAllowance: (message: string) => Promise<boolean>,
): Promise<boolean> {
  try {
    await changeNotebook(change);
    return true;
  } catch (error) {
    if (!(error instanceof AllowanceWarning)) throw error;
    if (!(await confirmAllowance(error.message))) return false;
    await changeNotebook(change, true);
    return true;
  }
}
