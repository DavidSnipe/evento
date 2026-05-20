export type BudgetItem = {
  id: string;
  event_id: string;
  category: string;
  title: string;
  estimated_cost: number;
  actual_cost: number;
  paid_amount: number;
  due_date: string | null;
  created_at: string;
};
