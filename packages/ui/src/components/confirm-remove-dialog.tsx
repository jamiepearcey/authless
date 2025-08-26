import React from "react";
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
} from "./alert-dialog";
import { Button } from "./button";
import { Trash2 } from "lucide-react";

interface ConfirmRemoveDialogProps {
  title: string;
  description: string;
  actionText: string;
  onConfirm: () => void;
  trigger?: React.ReactNode;
  children?: React.ReactNode;
}

export function ConfirmRemoveDialog({
  title,
  description,
  actionText,
  onConfirm,
  trigger,
  children,
}: ConfirmRemoveDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            {actionText}
          </AlertDialogAction>
        </AlertDialogFooter>
        {children}
      </AlertDialogContent>
    </AlertDialog>
  );
}
