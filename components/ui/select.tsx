import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

// Context to share state between all Select components
const SelectContext = React.createContext<{
  value: string
  onValueChange: (value: string) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
} | null>(null)

const useSelectContext = () => {
  const context = React.useContext(SelectContext)
  if (!context) {
    throw new Error('Select components must be used within a Select')
  }
  return context
}

interface SelectProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
}

const Select = ({ value, onValueChange, children }: SelectProps) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const selectRef = React.useRef<HTMLDivElement>(null)
  
  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])
  
  return (
    <SelectContext.Provider value={{ value, onValueChange, isOpen, setIsOpen }}>
      <div ref={selectRef} className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

const SelectTrigger = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const { isOpen, setIsOpen } = useSelectContext()
  
  return (
    <button
      type="button"
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      onClick={() => setIsOpen(!isOpen)}
    >
      {children}
      <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
    </button>
  )
}

const SelectValue = ({ placeholder }: { placeholder?: string }) => {
  const { value } = useSelectContext()
  
  // Map values to display text
  const getDisplayText = (val: string) => {
    switch (val) {
      case 'beginner':
        return 'Just Starting - New to this topic'
      case 'intermediate':
        return 'Some Experience - I know the basics'
      case 'advanced':
        return 'Experienced - Want to go deeper'
      default:
        return val
    }
  }
  
  return (
    <span className="block truncate text-left">
      {value ? getDisplayText(value) : (
        <span className="text-gray-500">{placeholder}</span>
      )}
    </span>
  )
}

const SelectContent = ({ children }: { children: React.ReactNode }) => {
  const { isOpen } = useSelectContext()
  
  if (!isOpen) return null
  
  return (
    <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-md border bg-white text-gray-900 shadow-lg">
      <div className="p-1">
        {children}
      </div>
    </div>
  )
}

const SelectItem = ({ value: itemValue, children }: { value: string; children: React.ReactNode }) => {
  const { value: selectedValue, onValueChange, setIsOpen } = useSelectContext()
  const isSelected = selectedValue === itemValue
  
  return (
    <div
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 pl-2 pr-2 text-sm outline-none transition-colors",
        isSelected 
          ? "bg-blue-100 text-blue-900 font-medium" 
          : "hover:bg-gray-100 hover:text-gray-900"
      )}
      onClick={() => {
        onValueChange(itemValue)
        setIsOpen(false)
      }}
    >
      {children}
    </div>
  )
}

export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
}