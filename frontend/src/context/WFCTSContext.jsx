/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import {
  createIndustrySessionRequest,
  createSubstituteEntryRequest,
  createTaskRequest,
  createWorkEntryRequest,
  getBootstrapRequest,
  getSubstituteSettlementsRequest,
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
  settlementPlan: {
    generatedAt: '',
    totalPendingLinkedCredits: 0,
    unsettledTeachers: 0,
    balances: [],
    settlements: [],
  },
}

export function WFCTSProvider({ children }) {
  const { authReady, isAuthenticated, token, logout } = useAuth()
  const [substituteEntries, setSubstituteEntries] = useState(initialState.substituteEntries)
  const [workEntries, setWorkEntries] = useState(initialState.workEntries)
  const [tasks, setTasks] = useState(initialState.tasks)
  const [teacherDirectory, setTeacherDirectory] = useState(initialState.teacherDirectory)
  const [industrySessions, setIndustrySessions] = useState(initialState.industrySessions)
  const [settlementPlan, setSettlementPlan] = useState(initialState.settlementPlan)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const resetData = useCallback(() => {
    setSubstituteEntries(initialState.substituteEntries)
    setWorkEntries(initialState.workEntries)
    setTasks(initialState.tasks)
    setTeacherDirectory(initialState.teacherDirectory)
    setIndustrySessions(initialState.industrySessions)
    setSettlementPlan(initialState.settlementPlan)
  }, [])

  const refreshSettlementPlan = useCallback(async () => {
    if (!token) return initialState.settlementPlan

    try {
      const data = await getSubstituteSettlementsRequest(token)
      const nextPlan = {
        generatedAt: data.generatedAt || '',
        totalPendingLinkedCredits: data.totalPendingLinkedCredits || 0,
        unsettledTeachers: data.unsettledTeachers || 0,
        balances: data.balances || [],
        settlements: data.settlements || [],
      }
      setSettlementPlan(nextPlan)
      return nextPlan
    } catch {
      return initialState.settlementPlan
    }
  }, [token])

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
      await refreshSettlementPlan()
    } catch (err) {
      setError(err.message || 'Unable to load application data.')
      if (err.status === 401) {
        logout()
      }
    } finally {
      setIsLoading(false)
    }
  }, [authReady, isAuthenticated, token, resetData, logout, refreshSettlementPlan])

  useEffect(() => {
    refreshData()
  }, [refreshData])

  const addSubstituteEntry = useCallback(async (entry) => {
    const response = await createSubstituteEntryRequest(token, entry)
    setSubstituteEntries((prev) => [response.substituteEntry, ...prev])
    await refreshSettlementPlan()
    return response.substituteEntry
  }, [token, refreshSettlementPlan])

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
        settlementPlan,
        isLoading,
        error,
        addSubstituteEntry,
        addWorkEntry,
        addTask,
        markTaskComplete,
        addIndustrySession,
        refreshData,
        refreshSettlementPlan,
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
