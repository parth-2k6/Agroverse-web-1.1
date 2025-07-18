
"use client"

// Inspired by react-hot-toast library
import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast" // Correct path

const TOAST_LIMIT = 3 // Allow more toasts
const TOAST_REMOVE_DELAY = 5000 // Auto-remove after 5 seconds

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    clearTimeout(toastTimeouts.get(toastId)); // Clear existing timeout if exists
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      // Clear timeout for the toast being added if it exists (e.g., rapid updates)
      if (toastTimeouts.has(action.toast.id)) {
        clearTimeout(toastTimeouts.get(action.toast.id));
        toastTimeouts.delete(action.toast.id);
      }
      // Add new toast and start its remove timer
      addToRemoveQueue(action.toast.id);
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
       // When updating, reset the timer for the specific toast
       if (action.toast.id && toastTimeouts.has(action.toast.id)) {
           clearTimeout(toastTimeouts.get(action.toast.id));
           addToRemoveQueue(action.toast.id);
       }
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
         // Clear timeout when dismissing manually
         if (toastTimeouts.has(toastId)) {
             clearTimeout(toastTimeouts.get(toastId));
             toastTimeouts.delete(toastId);
         }
         // Still trigger REMOVE_TOAST after animation completes (or immediately if needed)
         // For now, let REMOVE_TOAST handle the removal from state
         dispatch({ type: "REMOVE_TOAST", toastId });
      } else {
        state.toasts.forEach((toast) => {
          // Clear all timeouts
           if (toastTimeouts.has(toast.id)) {
             clearTimeout(toastTimeouts.get(toast.id));
             toastTimeouts.delete(toast.id);
           }
        });
         // Remove all toasts from state
         dispatch({ type: "REMOVE_TOAST" });
      }

      // Set open to false for animation, REMOVE_TOAST will clean up state
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      // Clear timeout just in case it's still running (e.g., called directly)
      if (action.toastId && toastTimeouts.has(action.toastId)) {
          clearTimeout(toastTimeouts.get(action.toastId));
          toastTimeouts.delete(action.toastId);
      }

      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, "id">

function toast({ ...props }: Toast) {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss() // Dismiss when closed manually or by timeout via onOpenChange
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }
