/** The app doesn't install @types/react-dom (it never renders to the DOM itself); this is all the studio uses. */
declare module 'react-dom/client' {
  import type { ReactNode } from 'react';
  export function createRoot(el: Element): { render(node: ReactNode): void };
}
