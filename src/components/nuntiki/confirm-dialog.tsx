"use client";

import * as React from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { confirmDialogContentVariants } from "@/lib/nuntiki/variants";

export type ConfirmDialogProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "default";
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  confirmLabel = "Confirmă",
  cancelLabel = "Anulează",
  variant = "default",
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  async function handleConfirm() {
    await onConfirm();
    onOpenChange?.(false);
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger> : null}
      <AlertDialogContent
        className={cn(
          confirmDialogContentVariants(),
          "gap-0 overflow-hidden p-0 sm:max-w-md [&>button]:top-4 [&>button]:right-4"
        )}
      >
        <div className="border-b border-border-rose-18/20 px-5 pb-4 pt-5">
          <AlertDialogHeader className="place-items-start text-left sm:text-left">
            <AlertDialogTitle className="font-serif text-lg font-bold">
              {title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-text-secondary">
              {description}
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>
        <AlertDialogFooter className="px-5 py-4 sm:justify-end">
          <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant={variant === "destructive" ? "destructive" : "default"}
            disabled={loading}
            onClick={(e) => {
              e.preventDefault();
              void handleConfirm();
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "default";
};

export function useConfirmDialog() {
  const [state, setState] = React.useState<{
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);
  const [loading, setLoading] = React.useState(false);

  const confirm = React.useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ options, resolve });
    });
  }, []);

  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open && state) {
        state.resolve(false);
        setState(null);
        setLoading(false);
      }
    },
    [state]
  );

  const handleConfirm = React.useCallback(async () => {
    if (!state) return;
    setLoading(true);
    state.resolve(true);
    setState(null);
    setLoading(false);
  }, [state]);

  const dialog = state ? (
    <ConfirmDialog
      open
      onOpenChange={handleOpenChange}
      title={state.options.title}
      description={state.options.description}
      confirmLabel={state.options.confirmLabel}
      cancelLabel={state.options.cancelLabel}
      variant={state.options.variant}
      loading={loading}
      onConfirm={handleConfirm}
    />
  ) : null;

  return { confirm, dialog, isOpen: Boolean(state) };
}
