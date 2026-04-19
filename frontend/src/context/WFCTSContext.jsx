/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import {
  cancelTaskRequest,
  createTimetableSlotRequest,
  createIndustrySessionRequest,
  createSubstituteEntryRequest,
  createTaskRequest,
  createWorkEntryRequest,
  deleteTimetableSlotRequest,
  getAvailableTeachersRequest,
  getBootstrapRequest,
  getSubstituteSettlementsRequest,
  getTimetableSlotsRequest,
  markTaskCompleteRequest,
  updateIndustrySessionRequest,
  updateTaskRequest,
  updateTimetableSlotRequest,
  updateWorkEntryRequest,
  getCalendarEventsRequest,
  createCalendarEventRequest,
  updateCalendarEventRequest,
  approveCalendarEventRequest,
  rejectCalendarEventRequest,
  completeCalendarEventRequest,
  substituteCalendarEventRequest,
  cancelCalendarEventRequest,
  getWeeklyProgressRequest,
  getWeeklyProgressHistoryRequest,
  snapshotWeeklyProgressRequest,
} from '../utils/api'
import { useAuth } from './AuthContext'

const WFCTSContext = createContext(null)

const initialState = {
  substituteEntries: [],
  workEntries: [],
  tasks: [],
  teacherDirectory: [],
  industrySessions: [],
  timetableSlots: [],
  availableTeachers: [],
  calendarEvents: [],
  weeklyProgress: null,
  weeklyProgressHistory: [],
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
  const [timetableSlots, setTimetableSlots] = useState(initialState.timetableSlots)
  const [availableTeachers, setAvailableTeachers] = useState(initialState.availableTeachers)
  const [calendarEvents, setCalendarEvents] = useState(initialState.calendarEvents)
  const [weeklyProgress, setWeeklyProgress] = useState(initialState.weeklyProgress)
  const [weeklyProgressHistory, setWeeklyProgressHistory] = useState(initialState.weeklyProgressHistory)
  const [settlementPlan, setSettlementPlan] = useState(initialState.settlementPlan)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const resetData = useCallback(() => {
    setSubstituteEntries(initialState.substituteEntries)
    setWorkEntries(initialState.workEntries)
    setTasks(initialState.tasks)
    setTeacherDirectory(initialState.teacherDirectory)
    setIndustrySessions(initialState.industrySessions)
    setTimetableSlots(initialState.timetableSlots)
    setAvailableTeachers(initialState.availableTeachers)
    setCalendarEvents(initialState.calendarEvents)
    setWeeklyProgress(initialState.weeklyProgress)
    setWeeklyProgressHistory(initialState.weeklyProgressHistory)
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
      setTimetableSlots(data.timetableSlots || [])
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

  const updateWorkEntry = useCallback(async (entryId, updates) => {
    const response = await updateWorkEntryRequest(token, entryId, updates)
    setWorkEntries((prev) => prev.map((entry) => (entry.id === entryId ? response.workEntry : entry)))
    return response.workEntry
  }, [token])

  const addTask = useCallback(async (task) => {
    const response = await createTaskRequest(token, task)
    setTasks((prev) => [response.task, ...prev])
    return response.task
  }, [token])

  const updateTask = useCallback(async (taskId, updates) => {
    const response = await updateTaskRequest(token, taskId, updates)
    setTasks((prev) => prev.map((task) => (task.id === taskId ? response.task : task)))
    return response.task
  }, [token])

  const markTaskComplete = useCallback(async (taskId) => {
    const response = await markTaskCompleteRequest(token, taskId)
    setTasks((prev) => prev.map((task) => (task.id === taskId ? response.task : task)))
    return response.task
  }, [token])

  const cancelTask = useCallback(async (taskId) => {
    const response = await cancelTaskRequest(token, taskId)
    setTasks((prev) => prev.map((task) => (task.id === taskId ? response.task : task)))
    return response.task
  }, [token])

  const addIndustrySession = useCallback(async (session) => {
    const response = await createIndustrySessionRequest(token, session)
    setIndustrySessions((prev) => [response.industrySession, ...prev])
    return response.industrySession
  }, [token])

  const updateIndustrySession = useCallback(async (sessionId, updates) => {
    const response = await updateIndustrySessionRequest(token, sessionId, updates)
    setIndustrySessions((prev) => prev.map((session) => (
      session.id === sessionId ? response.industrySession : session
    )))
    return response.industrySession
  }, [token])

  const refreshTimetableSlots = useCallback(async (filters = {}) => {
    const response = await getTimetableSlotsRequest(token, filters)
    setTimetableSlots(response.timetableSlots || [])
    return response.timetableSlots || []
  }, [token])

  const addTimetableSlot = useCallback(async (slot) => {
    const response = await createTimetableSlotRequest(token, slot)
    setTimetableSlots((prev) => {
      const next = [response.timetableSlot, ...prev]
      return next.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime))
    })
    return response.timetableSlot
  }, [token])

  const updateTimetableSlot = useCallback(async (slotId, updates) => {
    const response = await updateTimetableSlotRequest(token, slotId, updates)
    setTimetableSlots((prev) => prev.map((slot) => (slot.id === slotId ? response.timetableSlot : slot)))
    return response.timetableSlot
  }, [token])

  const deleteTimetableSlot = useCallback(async (slotId) => {
    await deleteTimetableSlotRequest(token, slotId)
    setTimetableSlots((prev) => prev.filter((slot) => slot.id !== slotId))
    return true
  }, [token])

  const fetchAvailableTeachers = useCallback(async (query) => {
    const response = await getAvailableTeachersRequest(token, query)
    setAvailableTeachers(response.availableTeachers || [])
    return response.availableTeachers || []
  }, [token])

  // ─── Calendar Events ────────────────────────────────────────────────────────

  const sortEvents = (events) =>
    [...events].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))

  const fetchCalendarEvents = useCallback(async (params = {}) => {
    const response = await getCalendarEventsRequest(token, params)
    const events = response.calendarEvents || []
    setCalendarEvents(sortEvents(events))
    return events
  }, [token])

  const addCalendarEvent = useCallback(async (payload) => {
    const response = await createCalendarEventRequest(token, payload)
    setCalendarEvents((prev) => sortEvents([...prev, response.calendarEvent]))
    return response.calendarEvent
  }, [token])

  const updateCalendarEvent = useCallback(async (id, payload) => {
    const response = await updateCalendarEventRequest(token, id, payload)
    setCalendarEvents((prev) => prev.map((e) => (e.id === id ? response.calendarEvent : e)))
    return response.calendarEvent
  }, [token])

  const approveCalendarEvent = useCallback(async (id) => {
    const response = await approveCalendarEventRequest(token, id)
    setCalendarEvents((prev) => prev.map((e) => (e.id === id ? response.calendarEvent : e)))
    return response.calendarEvent
  }, [token])

  const rejectCalendarEvent = useCallback(async (id) => {
    const response = await rejectCalendarEventRequest(token, id)
    setCalendarEvents((prev) => prev.map((e) => (e.id === id ? response.calendarEvent : e)))
    return response.calendarEvent
  }, [token])

  const completeCalendarEvent = useCallback(async (id) => {
    const response = await completeCalendarEventRequest(token, id)
    setCalendarEvents((prev) => prev.map((e) => (e.id === id ? response.calendarEvent : e)))
    if (response.workEntry) {
      setWorkEntries((prev) => [response.workEntry, ...prev])
    }
    return response
  }, [token])

  const substituteCalendarEvent = useCallback(async (id, substituteTeacherId) => {
    const response = await substituteCalendarEventRequest(token, id, substituteTeacherId)
    setCalendarEvents((prev) => {
      const updated = prev.map((e) => (e.id === id ? response.calendarEvent : e))
      if (response.substituteEvent) {
        updated.push(response.substituteEvent)
      }
      return sortEvents(updated)
    })
    if (response.substituteEntry) {
      setSubstituteEntries((prev) => [response.substituteEntry, ...prev])
      await refreshSettlementPlan()
    }
    return response
  }, [token, refreshSettlementPlan])

  const cancelCalendarEvent = useCallback(async (id) => {
    const response = await cancelCalendarEventRequest(token, id)
    setCalendarEvents((prev) => prev.map((e) => (e.id === id ? response.calendarEvent : e)))
    return response.calendarEvent
  }, [token])

  // ─── Weekly Progress ────────────────────────────────────────────────────────

  const fetchWeeklyProgress = useCallback(async (weekId) => {
    const response = await getWeeklyProgressRequest(token, weekId)
    setWeeklyProgress(response.progress || null)
    return response.progress
  }, [token])

  const fetchWeeklyProgressHistory = useCallback(async (limit = 12) => {
    const response = await getWeeklyProgressHistoryRequest(token, limit)
    const history = response.history || []
    setWeeklyProgressHistory(history)
    return history
  }, [token])

  const snapshotWeeklyProgress = useCallback(async (weekId) => {
    const response = await snapshotWeeklyProgressRequest(token, weekId)
    return response.snapshot
  }, [token])

  return (
    <WFCTSContext.Provider
      value={{
        substituteEntries,
        workEntries,
        tasks,
        teacherDirectory,
        industrySessions,
        timetableSlots,
        availableTeachers,
        settlementPlan,
        isLoading,
        error,
        addSubstituteEntry,
        addWorkEntry,
        updateWorkEntry,
        addTask,
        updateTask,
        markTaskComplete,
        cancelTask,
        addIndustrySession,
        updateIndustrySession,
        addTimetableSlot,
        updateTimetableSlot,
        deleteTimetableSlot,
        refreshTimetableSlots,
        fetchAvailableTeachers,
        calendarEvents,
        fetchCalendarEvents,
        addCalendarEvent,
        updateCalendarEvent,
        approveCalendarEvent,
        rejectCalendarEvent,
        completeCalendarEvent,
        substituteCalendarEvent,
        cancelCalendarEvent,
        weeklyProgress,
        weeklyProgressHistory,
        fetchWeeklyProgress,
        fetchWeeklyProgressHistory,
        snapshotWeeklyProgress,
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
