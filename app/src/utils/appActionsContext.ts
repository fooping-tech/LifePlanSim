import { createContext, useContext } from 'react'

export type EditorMode = 'wizard' | 'detail'
export type EditorTab = 'list' | 'form'

export type OpenEditorOptions = {
  mode?: EditorMode
  tab?: EditorTab
}

export type AppActions = {
  openEditor: (options?: OpenEditorOptions) => void
}

const AppActionsContext = createContext<AppActions | null>(null)

export const AppActionsProvider = AppActionsContext.Provider

export const useAppActions = (): AppActions => {
  const value = useContext(AppActionsContext)
  if (!value) {
    throw new Error('useAppActions must be used within AppActionsProvider')
  }
  return value
}
