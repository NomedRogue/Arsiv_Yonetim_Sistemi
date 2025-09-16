import React, { ReactNode, useMemo } from 'react';
import { ArchiveContext } from './ArchiveContext';
import { useArchiveState } from '../hooks/useArchiveState';
import { useArchiveSSE } from '../hooks/useArchiveSSE';
import { useArchiveActions } from '../hooks/useArchiveActions';

export const ArchiveProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { state, dispatch, refresh } = useArchiveState();
  useArchiveSSE(dispatch);
  const actions = useArchiveActions(state, dispatch);

  const contextValue = useMemo(
    () => ({
      ...state,
      refresh,
      ...actions,
    }),
    [state, refresh, actions]
  );

  return (
    <ArchiveContext.Provider value={contextValue}>
      {children}
    </ArchiveContext.Provider>
  );
};
