// Admin React contexts live in their own module on purpose: if they were
// declared next to UI components, editing those components during development
// would hot-reload a second copy of each context and disconnect providers from
// consumers ("Cannot read properties of null"). Keep this file tiny and stable.
import { createContext } from 'react';

export const ToastContext = createContext(() => {});
export const LookupsContext = createContext({ data: null, error: null, loading: true, reload: () => {} });
export const ConfirmContext = createContext(async () => false);
