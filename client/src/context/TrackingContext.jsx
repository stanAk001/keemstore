// Lets deeply nested affiliate buttons know which guide/category they sit in.
import { createContext, useContext } from 'react';

const TrackingContext = createContext({});

export function TrackingScope({ guideId, categoryId, children }) {
  const parent = useContext(TrackingContext);
  return <TrackingContext.Provider value={{ ...parent, guideId, categoryId }}>{children}</TrackingContext.Provider>;
}

export const useTrackingScope = () => useContext(TrackingContext);
