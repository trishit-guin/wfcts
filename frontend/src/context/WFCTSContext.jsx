/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import {
  createIndustrySessionRequest,
  createSubstituteEntryRequest,
  createTaskRequest,
  createWorkEntryRequest,
  getBootstrapRequest,
  markTaskCompleteRequest,
} from '../utils/api'
import { useAuth } from './AuthContext'

const WFCTSContext = createContext(null)

const initialState = {
  substituteEntries: [],
  workEntries: [],
  tasks: [],
  teacherDirectory: [],
  industrySessions: [],
}

export function WFCTSProvider({ children }) {
  const { authReady, isAuthenticated, token, logout } = useAuth()
  const [substituteEntries, setSubstituteEntries] = useState(initialState.substituteEntries)
  const [workEntries, setWorkEntries] = useState(initialState.workEntries)
  const [tasks, setTasks] = useState(initialState.tasks)
  const [teacherDirectory, setTeacherDirectory] = useState(initialState.teacherDirectory)
  const [industrySessions, setIndustrySessions] = useState(initialState.industrySessions)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const resetData = useCallback(() => {
    setSubstituteEntries(initialState.substituteEntries)
    setWorkEntries(initialState.workEntries)
    setTasks(initialState.tasks)
    setTeacherDirectory(initialState.teacherDirectory)
    setIndustrySessions(initialState.industrySessions)
  }, [])

  const refreshData = useCallback(async () => {
    if (!authReady) return

    if (!isAuthenticated || !token) {
      resetData()
      setIsLoading(false)
      setError('')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const data = await getBootstrapRequest(token)
      setSubstituteEntries(data.substituteEntries || [])
      setWorkEntries(data.workEntries || [])
      setTasks(data.tasks || [])
      setTeacherDirectory(data.teacherDirectory || [])
      setIndustrySessions(data.industrySessions || [])
    } catch (err) {
      setError(err.message || 'Unable to load application data.')
      if (err.status === 401) {
        logout()
      }
    } finally {
      setIsLoading(false)
    }
  }, [authReady, isAuthenticated, token, resetData, logout])

  useEffect(() => {
    refreshData()
  }, [refreshData])

  const addSubstituteEntry = useCallback(async (entry) => {
    const response = await createSubstituteEntryRequest(token, entry)
    setSubstituteEntries((prev) => [response.substituteEntry, ...prev])
    return response.substituteEntry
  }, [token])

  const addWorkEntry = useCallback(async (entry) => {
    const response = await createWorkEntryRequest(token, entry)
    setWorkEntries((prev) => [response.workEntry, ...prev])
    return response.workEntry
  }, [token])

  const addTask = useCallback(async (task) => {
    const response = await createTaskRequest(token, task)
    setTasks((prev) => [response.task, ...prev])
    return response.task
  }, [token])

  const markTaskComplete = useCallback(async (taskId) => {
    const response = await markTaskCompleteRequest(token, taskId)
    setTasks((prev) => prev.map((task) => (task.id === taskId ? response.task : task)))
    return response.task
  }, [token])

  const addIndustrySession = useCallback(async (session) => {
    const response = await createIndustrySessionRequest(token, session)
    setIndustrySessions((prev) => [response.industrySession, ...prev])
    return response.industrySession
  }, [token])

  return (
    <WFCTSContext.Provider
      value={{
        substituteEntries,
        workEntries,
        tasks,
        teacherDirectory,
        industrySessions,
        isLoading,
        error,
        addSubstituteEntry,
        addWorkEntry,
        addTask,
        markTaskComplete,
        addIndustrySession,
        refreshData,
      }}
    >
      {children}
    </WFCTSContext.Provider>
  )
}

export function useWFCTS() {
  const ctx = useContext(WFCTSContext)
  if (!ctx) throw new Error('useWFCTS must be used inside WFCTSProvider')
  return ctx
}
