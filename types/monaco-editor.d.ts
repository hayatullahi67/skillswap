declare module '@monaco-editor/react' {
  import { ComponentType } from 'react'
  
  export interface EditorProps {
    height?: string | number
    width?: string | number
    language?: string
    value?: string
    defaultValue?: string
    theme?: string
    options?: any
    onChange?: (value: string | undefined, event: any) => void
    onMount?: (editor: any, monaco: any) => void
    beforeMount?: (monaco: any) => void
    onValidate?: (markers: any[]) => void
    loading?: string | ComponentType
    className?: string
  }
  
  export const Editor: ComponentType<EditorProps>
  export const DiffEditor: ComponentType<any>
  export const useMonaco: () => any
  export const loader: any
}