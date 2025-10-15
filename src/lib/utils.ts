import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Performs a shallow comparison between two arrays of objects by checking their IDs.
 * This is a performance optimization to prevent unnecessary re-renders.
 * @param a The first array.
 * @param b The second array.
 * @returns True if the arrays are shallowly equal, false otherwise.
 */
export function shallowEqualArray(a: any[], b: any[]): boolean {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i].id !== b[i].id) {
            return false;
        }
    }
    return true;
}
