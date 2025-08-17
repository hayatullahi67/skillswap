'use client'

import { useState } from 'react'

export type ModalType = 'info' | 'warning' | 'error' | 'success' | 'confirm'

export interface ModalState {
  isOpen: boolean
  title: string
  message: string
  type: ModalType
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
    type: ModalType = 'info',
    onConfirm?: () => void,
    confirmText?: string,
    cancelText?: string
  ) => {
    setModalState({
      isOpen: true,
      title,
      message,
      type,
      onConfirm,
      confirmText,
      cancelText
    })
  }

  const showInfo = (title: string, message: string) => {
    showModal(title, message, 'info')
  }

  const showWarning = (title: string, message: string) => {
    showModal(title, message, 'warning')
  }

  const showError = (title: string, message: string) => {
    showModal(title, message, 'error')
  }

  const showSuccess = (title: string, message: string) => {
    showModal(title, message, 'success')
  }

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText: string = 'Confirm',
    cancelText: string = 'Cancel'
  ) => {
    showModal(title, message, 'confirm', onConfirm, confirmText, cancelText)
  }

  const closeModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }))
  }

  return {
    modalState,
    showModal,
    showInfo,
    showWarning,
    showError,
    showSuccess,
    showConfirm,
    closeModal
  }
}