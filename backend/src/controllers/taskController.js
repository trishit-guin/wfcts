const Task = require('../models/Task')
const User = require('../models/User')
const { isTeacher, toDate } = require('../utils/routeHelpers')

async function createTask(req, res, next) {
  try {
    const { title, description, assignTo, deadline } = req.body || {}

    if (!title || !description || !assignTo || !deadline) {
      const error = new Error('Title, description, assignee, and deadline are required')
      error.statusCode = 400
      throw error
    }

    const assignee = await User.findOne({ _id: assignTo, role: 'TEACHER' })
    if (!assignee) {
      const error = new Error('Assigned teacher was not found')
      error.statusCode = 404
      throw error
    }

    const task = await Task.create({
      title: String(title).trim(),
      description: String(description).trim(),
      assignedBy: req.user.name,
      assignTo: assignee._id,
      deadline: toDate(deadline, 'deadline'),
      status: 'Pending',
    })

    res.status(201).json({ task: task.toJSON() })
  } catch (error) {
    next(error)
  }
}

async function updateTask(req, res, next) {
  try {
    const task = await Task.findById(req.params.taskId)
    if (!task) {
      const error = new Error('Task not found')
      error.statusCode = 404
      throw error
    }

    if (req.body?.title !== undefined) {
      const value = String(req.body.title).trim()
      if (!value) { const e = new Error('Title cannot be empty'); e.statusCode = 400; throw e }
      task.title = value
    }

    if (req.body?.description !== undefined) {
      const value = String(req.body.description).trim()
      if (!value) { const e = new Error('Description cannot be empty'); e.statusCode = 400; throw e }
      task.description = value
    }

    if (req.body?.deadline !== undefined) task.deadline = toDate(req.body.deadline, 'deadline')

    if (req.body?.assignTo !== undefined) {
      const assignee = await User.findOne({ _id: req.body.assignTo, role: 'TEACHER' })
      if (!assignee) {
        const error = new Error('Assigned teacher was not found')
        error.statusCode = 404
        throw error
      }
      task.assignTo = assignee._id
    }

    if (req.body?.status !== undefined) {
      const status = String(req.body.status)
      if (!['Pending', 'Completed', 'Cancelled'].includes(status)) {
        const error = new Error('Invalid task status')
        error.statusCode = 400
        throw error
      }
      task.status = status
    }

    await task.save()
    res.json({ task: task.toJSON() })
  } catch (error) {
    next(error)
  }
}

async function cancelTask(req, res, next) {
  try {
    const task = await Task.findById(req.params.taskId)
    if (!task) {
      const error = new Error('Task not found')
      error.statusCode = 404
      throw error
    }
    task.status = 'Cancelled'
    await task.save()
    res.json({ task: task.toJSON() })
  } catch (error) {
    next(error)
  }
}

async function completeTask(req, res, next) {
  try {
    const task = await Task.findById(req.params.taskId)
    if (!task) {
      const error = new Error('Task not found')
      error.statusCode = 404
      throw error
    }

    const isOwner = String(task.assignTo) === String(req.user._id)
    const isManager = !isTeacher(req.user)
    if (!isOwner && !isManager) {
      const error = new Error('You can only complete your own tasks')
      error.statusCode = 403
      throw error
    }

    task.status = 'Completed'
    await task.save()
    res.json({ task: task.toJSON() })
  } catch (error) {
    next(error)
  }
}

module.exports = { createTask, updateTask, cancelTask, completeTask }
