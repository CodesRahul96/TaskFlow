const Task = require("../models/Task");
const Notification = require("../models/Notification");
const logAudit = require("../utils/audit");
const crypto = require("crypto");

/**
 * Task Management Controller
 * Handles CRUD operations, status transitions, and collaborative task orchestration.
 */

/**
 * Retrieves tasks with support for filtering, searching, and custom sorting.
 * Implements access control to ensure users only retrieve tasks they own or are assigned to.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters for filtering (status, priority, tag, search, sort)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.getTasks = async (req, res, next) => {
  try {
    const { status, priority, tag, search, sort = "order" } = req.query;
    
    // Authorization filter: owner or assignee
    const filter = {
      $or: [{ owner: req.user._id }, { assignedTo: req.user._id }],
    };

    // Ensure unique result set by aggregating potential overlaps
    const taskIds = await Task.find(filter).distinct("_id");
    const uniqueFilter = { _id: { $in: taskIds } };
    
    // Apply optional business logic filters
    if (status) uniqueFilter.status = status;
    if (priority) uniqueFilter.priority = priority;
    if (tag) uniqueFilter.tags = tag;
    if (search) uniqueFilter.title = { $regex: search, $options: "i" };

    let tasks;
    // Handle complex priority-based sorting vs standard field sorting
    if (sort === "priority" || sort === "-priority") {
      const allTasks = await Task.find(uniqueFilter)
        .populate("owner", "name email")
        .populate("assignedTo", "name email");
      
      const dir = sort.startsWith("-") ? -1 : 1;
      const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };
      
      tasks = allTasks.sort(
        (a, b) =>
          dir *
          ((PRIORITY_ORDER[a.priority] ?? 99) -
            (PRIORITY_ORDER[b.priority] ?? 99)),
      );
    } else {
      const allowedSorts = ["-createdAt", "createdAt", "-deadline", "deadline", "order"];
      const sortField = allowedSorts.includes(sort) ? sort : "-createdAt";
      
      tasks = await Task.find(uniqueFilter)
        .sort(sortField)
        .populate("owner", "name email")
        .populate("assignedTo", "name email");
    }

    res.json({ tasks });
  } catch (err) {
    next(err);
  }
};

/**
 * Creates a new task and initializes audit trails.
 * Broadcasts the creation event to the owner's socket room.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Task properties (title, description, etc.)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.createTask = async (req, res, next) => {
  try {
    const task = await Task.create({ ...req.body, owner: req.user._id });
    
    const populatedTask = await Task.findById(task._id)
      .populate("owner", "name email")
      .populate("assignedTo", "name email");

    await logAudit(req.user._id, req.user.name, "task_created", populatedTask._id, {
      title: populatedTask.title,
    });

    const io = req.app.get("io");
    io.to(req.user._id.toString()).emit("task-created", { task: populatedTask });
    
    res.status(201).json({ task: populatedTask });
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieves a single task by ID with strict access validation.
 * Supports deep population of subtask completion metadata.
 * 
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Task ID
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.getTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate("owner", "name email")
      .populate("assignedTo", "name email")
      .populate("subtasks.completedBy", "name");

    if (!task) return res.status(404).json({ message: "Task not found" });

    // Access Control: Owner or explicit Assignee only
    const canAccess =
      task.owner._id.toString() === req.user._id.toString() ||
      task.assignedTo.some((u) => (u._id || u).toString() === req.user._id.toString());

    if (!canAccess) return res.status(403).json({ message: "Not authorised" });
    
    res.json({ task });
  } catch (err) {
    next(err);
  }
};

/**
 * Updates task properties and synchronizes changes across collaborative sessions.
 * Implements "Safe Injection" to prevent overwriting embedded arrays like subtasks.
 * Triggers notifications for newly assigned collaborators.
 * 
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Task ID
 * @param {Object} req.body - Updated properties
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.updateTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    // Authorization: Members of the collaborative room only
    const canEdit =
      task.owner.toString() === req.user._id.toString() ||
      task.assignedTo.some((u) => (u._id || u).toString() === req.user._id.toString());

    if (!canEdit) return res.status(403).json({ message: "Not authorised" });

    const io = req.app.get("io");
    const prevStatus = task.status;
    const prevAssigned = (task.assignedTo || []).map((id) => id.toString());

    // Sanitize input: decouple embedded arrays from generic updates
    const { subtasks, timeBlocks, owner, ...safe } = req.body; 
    Object.assign(task, safe);
    await task.save();

    const newAssigned = (task.assignedTo || []).map((id) => id.toString());
    const assigneesChanged = JSON.stringify(prevAssigned.sort()) !== JSON.stringify(newAssigned.sort());

    // Process new collaborator invitations
    if (assigneesChanged) {
      await logAudit(req.user._id, req.user.name, "collaborator_added", task._id, {
        title: task.title,
        assignedCount: newAssigned.length,
      });

      const addedUsers = newAssigned.filter(id => !prevAssigned.includes(id));
      for (const uid of addedUsers) {
        if (uid === req.user._id.toString()) continue;
        const note = await Notification.create({
          recipient: uid,
          sender: req.user._id,
          type: "task_assigned",
          task: task._id,
          content: `assigned you to task: ${task.title}`
        });
        io.to(uid).emit("notification-received", { notification: note });
      }
    }

    // Hydrate task metadata for frontend consistency
    const populatedTask = await Task.findById(task._id)
      .populate("owner", "name email")
      .populate("assignedTo", "name email")
      .populate("subtasks.completedBy", "name");

    const action = prevStatus !== task.status ? "task_status_changed" : "task_updated";
    await logAudit(req.user._id, req.user.name, action, task._id, {
      ...(prevStatus !== task.status && { from: prevStatus, to: task.status }),
      title: task.title,
    });

    // Multi-node sync: Broadcast update to all relevant parties
    const allRelevantUsers = new Set([...newAssigned, ...prevAssigned, task.owner.toString()]);
    allRelevantUsers.forEach((uid) => {
      // Initiator is skipped to prevent race conditions vs local REST response
      if (uid === req.user._id.toString()) return;
      io.to(uid).emit("task-updated", { task: populatedTask });
    });

    res.json({ task: populatedTask });
  } catch (err) {
    next(err);
  }
};

/**
 * Deletes a task or removes a collaborator.
 * Logic Branch: 
 * 1. Owners: Perform hard deletion from the database.
 * 2. Collaborators: Perform a "Leave Task" operation by removing their UID from assignedTo.
 * 
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Task ID
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    
    // Authorization Override: Collaborator "Leave" Logic
    if (task.owner.toString() !== req.user._id.toString()) {
      const wasAssigned = task.assignedTo.some(id => id.toString() === req.user._id.toString());
      
      if (!wasAssigned) {
        return res.status(403).json({ message: "You are not authorized to modify this task." });
      }

      task.assignedTo = task.assignedTo.filter(id => id.toString() !== req.user._id.toString());
      await task.save();

      await logAudit(req.user._id, req.user.name, "task_left", task._id, { title: task.title });

      const io = req.app.get("io");
      io.to(req.user._id.toString()).emit("task-deleted", { taskId: task._id.toString() });
      
      io.to(task.owner.toString()).emit("task-updated", { 
        task: await Task.findById(task._id).populate("owner assignedTo", "name email") 
      });

      return res.json({ message: "You have left the task successfully." });
    }

    // Owner Execution: Hard Deletion
    await task.deleteOne();
    await logAudit(req.user._id, req.user.name, "task_deleted", task._id, {
      title: task.title,
    });
    
    const io = req.app.get("io");
    io.to(req.user._id.toString()).emit("task-deleted", { taskId: task._id.toString() });
    
    if (task.assignedTo?.length > 0) {
      task.assignedTo.forEach(uid => {
        io.to(uid.toString()).emit("task-deleted", { taskId: task._id.toString() });
      });
    }

    res.json({ message: "Task deleted successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * Synchronizes anonymous guest tasks with a newly created user account.
 * Performs a "Neural Lift" by migrating local storage task objects to the MongoDB cloud vault.
 * 
 * @param {Object} req - Express request object
 * @param {Array} req.body.guestTasks - Array of guest task objects
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.syncGuestTasks = async (req, res, next) => {
  try {
    const { guestTasks = [] } = req.body;
    const created = [];

    for (const t of guestTasks) {
      const { _id, isGuest, timeBlocks = [], subtasks = [], ...rest } = t;
      const task = await Task.create({
        ...rest,
        owner: req.user._id,
        guestId: _id,
        subtasks: subtasks.map((s) => ({
          title: s.title,
          completed: s.completed,
          order: s.order || 0,
        })),
        timeBlocks: timeBlocks.map((b) => ({
          title: b.title,
          startTime: b.startTime,
          endTime: b.endTime,
          color: b.color,
          notes: b.notes,
        })),
      });
      created.push(task);
    }

    await logAudit(req.user._id, req.user.name, "guest_sync", null, {
      count: created.length,
    });

    res.json({ syncedCount: created.length, tasks: created });
  } catch (err) {
    next(err);
  }
};

// ── Subtasks ────────────────────────────────────────────────────────────────

/**
 * Appends a new subtask to a parent task node.
 * 
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Parent Task ID
 * @param {string} req.body.title - Subtask title
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.addSubtask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    task.subtasks.push({ title: req.body.title, order: task.subtasks.length });
    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate("owner", "name email")
      .populate("assignedTo", "name email")
      .populate("subtasks.completedBy", "name");

    await logAudit(req.user._id, req.user.name, "subtask_created", task._id, {
      title: req.body.title,
    });

    res.json({ task: populatedTask });
  } catch (err) {
    next(err);
  }
};

/**
 * Updates an individual subtask's state (completion status, title, order).
 * 
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Parent Task ID
 * @param {string} req.params.subId - Subtask ID
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.updateSubtask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const sub = task.subtasks.id(req.params.subId);
    if (!sub) return res.status(404).json({ message: "Subtask not found" });

    const wasCompleted = sub.completed;
    Object.assign(sub, req.body);

    if (!wasCompleted && sub.completed) {
      sub.completedBy = req.user._id;
      sub.completedAt = new Date();
      await logAudit(req.user._id, req.user.name, "subtask_completed", task._id, { title: sub.title });
    }

    await task.save();
    const populatedTask = await Task.findById(task._id)
      .populate("owner", "name email")
      .populate("assignedTo", "name email")
      .populate("subtasks.completedBy", "name");

    res.json({ task: populatedTask });
  } catch (err) {
    next(err);
  }
};

/**
 * Removes a subtask from its parent task node.
 * 
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Parent Task ID
 * @param {string} req.params.subId - Subtask ID
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.deleteSubtask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const sub = task.subtasks.id(req.params.subId);
    if (!sub) return res.status(404).json({ message: "Subtask not found" });

    sub.deleteOne();
    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate("owner", "name email")
      .populate("assignedTo", "name email")
      .populate("subtasks.completedBy", "name");

    await logAudit(req.user._id, req.user.name, "subtask_deleted", task._id, {
      title: sub.title,
    });
    res.json({ task: populatedTask });
  } catch (err) {
    next(err);
  }
};

/**
 * Logic to detect overlapping schedule blocks for a specific user.
 * 
 * @private
 */
async function checkOverlap(ownerId, startTime, endTime, excludeTaskId, excludeBlockId) {
  const tasks = await Task.find({ $or: [{ owner: ownerId }, { assignedTo: ownerId }] });

  for (const t of tasks) {
    for (const b of t.timeBlocks) {
      if (excludeTaskId && excludeBlockId && t._id.equals(excludeTaskId) && b._id.equals(excludeBlockId)) continue;
      
      const s = new Date(b.startTime);
      const e = new Date(b.endTime);
      if (new Date(startTime) < e && new Date(endTime) > s) {
        return { taskTitle: t.title, start: s, end: e };
      }
    }
  }
  return null;
}

/**
 * Persists a new time-block engagement.
 * Validates against scheduling collisions before persistence.
 */
exports.addTimeBlock = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    if (!task.owner.equals(req.user._id) && !task.assignedTo.some((u) => u.equals(req.user._id))) {
      return res.status(403).json({ message: "Not authorised" });
    }

    const { startTime, endTime } = req.body;
    if (new Date(endTime) <= new Date(startTime)) return res.status(400).json({ message: "endTime must be after startTime" });

    const overlap = await checkOverlap(req.user._id, startTime, endTime, task._id, null);
    if (overlap) return res.status(409).json({ message: `Overlaps with task "${overlap.taskTitle}"`, overlap });

    task.timeBlocks.push(req.body);
    await task.save();

    const populatedTask = await Task.findById(task._id).populate("owner assignedTo", "name email");

    await logAudit(req.user._id, req.user.name, "timeblock_added", task._id, { startTime, endTime });
    res.json({ task: populatedTask });
  } catch (err) {
    next(err);
  }
};

// PUT /api/tasks/:id/timeblocks/:blockId
exports.updateTimeBlock = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    const block = task.timeBlocks.id(req.params.blockId);
    if (!block)
      return res.status(404).json({ message: "Time block not found" });

    const startTime = req.body.startTime || block.startTime;
    const endTime = req.body.endTime || block.endTime;
    if (new Date(endTime) <= new Date(startTime))
      return res
        .status(400)
        .json({ message: "endTime must be after startTime" });

    const overlap = await checkOverlap(
      req.user._id,
      startTime,
      endTime,
      task._id,
      block._id,
    );
    if (overlap)
      return res
        .status(409)
        .json({
          message: `Overlaps with task "${overlap.taskTitle}"`,
          overlap,
        });

    Object.assign(block, req.body);
    await task.save();
    const populatedTask = await Task.findById(task._id)
      .populate("owner", "name email")
      .populate("assignedTo", "name email");

    await logAudit(
      req.user._id,
      req.user.name,
      "timeblock_updated",
      task._id,
      {},
    );
    res.json({ task: populatedTask });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/tasks/:id/timeblocks/:blockId
exports.deleteTimeBlock = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    const block = task.timeBlocks.id(req.params.blockId);
    if (!block)
      return res.status(404).json({ message: "Time block not found" });
    block.deleteOne();
    await task.save();
    const populatedTask = await Task.findById(task._id)
      .populate("owner", "name email")
      .populate("assignedTo", "name email");

    await logAudit(
      req.user._id,
      req.user.name,
      "timeblock_deleted",
      task._id,
      {},
    );
    res.json({ task: populatedTask });
  } catch (err) {
    next(err);
  }
};

/**
 * Orchestrates task reordering via bulk-write operations.
 */
exports.reorderTasks = async (req, res, next) => {
  try {
    const { orders } = req.body;
    if (!orders || !Array.isArray(orders)) return res.status(400).json({ message: "Invalid orders data" });

    const bulkOps = orders.map((item) => ({
      updateOne: {
        filter: { _id: item.id, owner: req.user._id },
        update: { order: item.order },
      },
    }));

    await Task.bulkWrite(bulkOps);
    res.json({ message: "Reordered" });
  } catch (err) {
    next(err);
  }
};

/**
 * Toggles a task's public availability and manages secure share tokens.
 */
exports.toggleTaskSharing = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task || !task.owner.equals(req.user._id)) return res.status(403).json({ message: "Forbidden" });

    task.isSharingEnabled = !!req.body.enabled;
    if (task.isSharingEnabled && !task.shareToken) {
      task.shareToken = crypto.randomBytes(16).toString("hex");
    }

    await task.save();
    await logAudit(req.user._id, req.user.name, "task_sharing_toggled", task._id, { enabled: task.isSharingEnabled });

    res.json({
      isSharingEnabled: task.isSharingEnabled,
      shareToken: task.isSharingEnabled ? task.shareToken : null,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Public discovery node: Retrieves minimal task metadata for invitation previews.
 */
exports.getPublicTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({ shareToken: req.params.token, isSharingEnabled: true })
      .populate("owner", "name avatar")
      .select("owner createdAt title status");

    if (!task) return res.status(404).json({ message: "Invalid or expired link" });
    res.json({ task });
  } catch (err) {
    next(err);
  }
};

/**
 * Finalizes the collaborative handshake: adds a user to a task node via secure token.
 */
exports.joinTaskByToken = async (req, res, next) => {
  try {
    const task = await Task.findOne({ shareToken: req.params.token, isSharingEnabled: true });
    if (!task) return res.status(404).json({ message: "Invalid link" });

    if (task.assignedTo.some(id => id.equals(req.user._id)) || task.owner.equals(req.user._id)) {
      return res.status(200).json({ message: "Already joined", task });
    }

    task.assignedTo.push(req.user._id);
    await task.save();

    const populatedTask = await Task.findById(task._id).populate("owner assignedTo", "name email");
    const io = req.app.get("io");

    // Broad-spectrum notification & sync
    [...task.assignedTo, task.owner].forEach(uid => {
      io.to(uid.toString()).emit("task-updated", { task: populatedTask });
    });

    res.json({ message: "Joined successfully", task: populatedTask });
  } catch (err) {
    next(err);
  }
};
