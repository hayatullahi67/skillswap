import { useState } from 'react'

interface ModalState {
  isOpen: boolean
  title: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  onConfirm?: () => void
  confirmText?: string
  cancelText?: string
}

export function useModal() {
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  })

  const showModal = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info',
    options?: {
      onConfirm?: () => void
      confirmText?: string
      cancelText?: string
    }
  ) => {
    setModalState({
      isOpen: true,
      title,
      message,
      type,
      ...options
    })
  }

  const showSuccess = (title: string, message: string) => {
    showModal(title, message, 'success')
  }

  const showError = (title: string, message: string) => {
    showModal(title, message, 'error')
  }

  const showWarning = (title: string, message: string) => {
    showModal(title, message, 'warning')
  }

  const showInfo = (title: string, message: string) => {
    showModal(title, message, 'info')
  }

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText: string = 'Confirm',
    cancelText: string = 'Cancel'
  ) => {
    showModal(title, message, 'warning', {
      onConfirm,
      confirmText,
      cancelText
    })
  }

  const closeModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }))
  }

  return {
    modalState,
    showModal,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirm,
    closeModal
  }
}