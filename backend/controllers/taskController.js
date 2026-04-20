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
 * @route GET /api/tasks
 * @access Private
 */
exports.getTasks = async (req, res, next) => {
  try {
    const { status, priority, tag, search, sort = "order" } = req.query;
    const filter = {
      $or: [{ owner: req.user._id }, { assignedTo: req.user._id }],
    };
    // Ensure uniqueness by merging overlapping results
    const taskIds = await Task.find(filter).distinct("_id");
    const uniqueFilter = { _id: { $in: taskIds } };
    
    if (status) uniqueFilter.status = status;
    if (priority) uniqueFilter.priority = priority;
    if (tag) uniqueFilter.tags = tag;
    if (search) uniqueFilter.title = { $regex: search, $options: "i" };

    // Update query to use the unique set of IDs
    let tasks;
    if (sort === "priority" || sort === "-priority") {
      const allTasks = await Task.find(uniqueFilter)
        .populate("owner", "name email")
        .populate("assignedTo", "name email");
      const dir = sort.startsWith("-") ? -1 : 1;
      tasks = allTasks.sort(
        (a, b) =>
          dir *
          ((PRIORITY_ORDER[a.priority] ?? 99) -
            (PRIORITY_ORDER[b.priority] ?? 99)),
      );
    } else {
      const allowedSorts = [
        "-createdAt",
        "createdAt",
        "-deadline",
        "deadline",
        "order",
      ];
      const sortField = allowedSorts.includes(sort) ? sort : "-createdAt";
      tasks = await Task.find(filter)
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
 * Creates a new task and associated audit trails.
 * @route POST /api/tasks
 * @access Private
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
 * Retrieves a single task by ID with access validation.
 * @route GET /api/tasks/:id
 * @access Private
 */
exports.getTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate("owner", "name email")
      .populate("assignedTo", "name email")
      .populate("subtasks.completedBy", "name");
    if (!task) return res.status(404).json({ message: "Task not found" });
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
 * @route PUT /api/tasks/:id
 * @access Private
 */
exports.updateTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    const canEdit =
      task.owner.toString() === req.user._id.toString() ||
      task.assignedTo.some((u) => (u._id || u).toString() === req.user._id.toString());

    if (!canEdit) return res.status(403).json({ message: "Not authorised" });
    const io = req.app.get("io");


    // Track status change
    const prevStatus = task.status;
    const prevAssigned = (task.assignedTo || []).map((id) => id.toString());
    const { subtasks, timeBlocks, owner, ...safe } = req.body; // prevent overwriting embedded arrays this way
    Object.assign(task, safe);
    await task.save();

    // Determine audit action
    const newAssigned = (task.assignedTo || []).map((id) => id.toString());
    const assigneesChanged =
      JSON.stringify(prevAssigned.sort()) !==
      JSON.stringify(newAssigned.sort());

    if (assigneesChanged) {
      await logAudit(
        req.user._id,
        req.user.name,
        "collaborator_added",
        task._id,
        {
          title: task.title,
          assignedCount: newAssigned.length,
        },
      );

      // Create notifications for newly added users
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

    // CRITICAL: Hydrate task with user metadata (names, emails) before dispatching to the client.
    // This prevents frontend crashes in components that expect full user objects rather than IDs.
    const populatedTask = await Task.findById(task._id)
      .populate("owner", "name email")
      .populate("assignedTo", "name email")
      .populate("subtasks.completedBy", "name");

    const action =
      prevStatus !== task.status ? "task_status_changed" : "task_updated";
    await logAudit(req.user._id, req.user.name, action, task._id, {
      ...(prevStatus !== task.status && { from: prevStatus, to: task.status }),
      title: task.title,
    });

    const allRelevantUsers = new Set([
      ...newAssigned,
      ...prevAssigned,
      task.owner.toString(),
    ]);

    allRelevantUsers.forEach((uid) => {
      // Opt-out strategy for the initiator to avoid redundant local state churn
      // and mitigate race conditions between REST response and WebSocket broadcast.
      if (uid === req.user._id.toString()) return;
      io.to(uid).emit("task-updated", { task: populatedTask });
    });

    res.json({ task: populatedTask });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/tasks/:id
exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    
    // IF USER IS NOT THE OWNER:
    // They are likely a collaborator trying to 'Remove' the task from their list.
    // Instead of a 403, we will 'Leave' the task.
    if (task.owner.toString() !== req.user._id.toString()) {
      const wasAssigned = task.assignedTo.some(id => id.toString() === req.user._id.toString());
      
      if (!wasAssigned) {
        return res.status(403).json({ message: "You are not authorized to modify this task." });
      }

      // Remove current user from collaborators list
      task.assignedTo = task.assignedTo.filter(id => id.toString() !== req.user._id.toString());
      await task.save();

      await logAudit(req.user._id, req.user.name, "task_left", task._id, { title: task.title });

      const io = req.app.get("io");
      io.to(req.user._id.toString()).emit("task-deleted", { taskId: task._id.toString() });
      
      // Notify owner that someone left
      io.to(task.owner.toString()).emit("task-updated", { 
        task: await Task.findById(task._id).populate("owner assignedTo", "name email") 
      });

      return res.json({ message: "You have left the task successfully." });
    }

    // IF USER IS OWNER: Full deletion
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

// POST /api/tasks/sync-guest
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

// POST /api/tasks/:id/subtasks
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

// PUT /api/tasks/:id/subtasks/:subId
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
      await logAudit(
        req.user._id,
        req.user.name,
        "subtask_completed",
        task._id,
        { title: sub.title },
      );
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

// DELETE /api/tasks/:id/subtasks/:subId
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

// ── Time Blocks ─────────────────────────────────────────────────────────────

async function checkOverlap(
  ownerId,
  startTime,
  endTime,
  excludeTaskId,
  excludeBlockId,
) {
  const tasks = await Task.find({
    $or: [{ owner: ownerId }, { assignedTo: ownerId }],
  });
  for (const t of tasks) {
    for (const b of t.timeBlocks) {
      if (
        excludeTaskId &&
        excludeBlockId &&
        t._id.equals(excludeTaskId) &&
        b._id.equals(excludeBlockId)
      )
        continue;
      const s = new Date(b.startTime),
        e = new Date(b.endTime);
      if (new Date(startTime) < e && new Date(endTime) > s) {
        return { taskTitle: t.title, start: s, end: e };
      }
    }
  }
  return null;
}

// POST /api/tasks/:id/timeblocks
exports.addTimeBlock = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    if (
      !task.owner.equals(req.user._id) &&
      !task.assignedTo.some((u) => u.equals(req.user._id))
    )
      return res.status(403).json({ message: "Not authorised" });

    const { startTime, endTime } = req.body;
    if (new Date(endTime) <= new Date(startTime))
      return res
        .status(400)
        .json({ message: "endTime must be after startTime" });

    const overlap = await checkOverlap(
      req.user._id,
      startTime,
      endTime,
      task._id,
      null,
    );
    if (overlap)
      return res.status(409).json({
        message: `Overlaps with task "${overlap.taskTitle}"`,
        overlap,
      });

    task.timeBlocks.push(req.body);
    await task.save();
    const populatedTask = await Task.findById(task._id)
      .populate("owner", "name email")
      .populate("assignedTo", "name email");

    await logAudit(req.user._id, req.user.name, "timeblock_added", task._id, {
      startTime,
      endTime,
    });
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

// PUT /api/tasks/reorder
exports.reorderTasks = async (req, res, next) => {
  try {
    const { orders } = req.body;
    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({ message: "Invalid orders data" });
    }

    const bulkOps = orders.map((item) => ({
      updateOne: {
        filter: { _id: item.id, owner: req.user._id },
        update: { order: item.order },
      },
    }));

    await Task.bulkWrite(bulkOps);
    res.json({ message: "Reordered" });
  } catch (err) {
    console.error("[REORDER ERROR]", err);
    next(err);
  }
};

// ── Sharing Logic ───────────────────────────────────────────────────────────

// PUT /api/tasks/:id/share
exports.toggleTaskSharing = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    if (!task.owner.equals(req.user._id)) {
      return res.status(403).json({ message: "Not authorised" });
    }

    const { enabled } = req.body;
    task.isSharingEnabled = !!enabled;

    if (task.isSharingEnabled && !task.shareToken) {
      task.shareToken = crypto.randomBytes(16).toString("hex");
    }

    await task.save();

    await logAudit(req.user._id, req.user.name, "task_sharing_toggled", task._id, {
      enabled: task.isSharingEnabled,
    });

    res.json({
      message: `Sharing ${task.isSharingEnabled ? "enabled" : "disabled"}`,
      isSharingEnabled: task.isSharingEnabled,
      shareToken: task.isSharingEnabled ? task.shareToken : null,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/tasks/public/:token
// This is a PUBLIC endpoint (no auth middleware)
exports.getPublicTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({
      shareToken: req.params.token,
      isSharingEnabled: true,
    })
      .populate("owner", "name avatar") // Only expose name and avatar
      .select("owner createdAt"); // REMOVED: title, description, priority, etc.

    if (!task) {
      return res.status(404).json({ message: "Shared task not found or link expired" });
    }

    res.json({ task });
  } catch (err) {
    next(err);
  }
};

// POST /api/tasks/join/:token
exports.joinTaskByToken = async (req, res, next) => {
  try {
    const task = await Task.findOne({
      shareToken: req.params.token,
      isSharingEnabled: true,
    });

    if (!task) {
      return res.status(404).json({ message: "Invalid or expired share link" });
    }

    // Check if user is already assigned
    const isAssigned = task.assignedTo.some((id) => id.equals(req.user._id));
    const isOwner = task.owner.equals(req.user._id);

    if (isAssigned || isOwner) {
      return res.status(200).json({ message: "You are already part of this task", task });
    }

    task.assignedTo.push(req.user._id);
    await task.save();

    // Notify the owner
    const io = req.app.get("io");
    const note = await Notification.create({
      recipient: task.owner,
      sender: req.user._id,
      type: "task_assigned", // REUSE: "Someone joined your task"
      task: task._id,
      content: `joined your shared task: ${task.title}`,
    });
    
    io.to(task.owner.toString()).emit("notification-received", { notification: note });

    // Emit standard task update to all collaborators
    const populatedTask = await Task.findById(task._id)
      .populate("owner", "name email")
      .populate("assignedTo", "name email")
      .populate("subtasks.completedBy", "name");

    const allUsers = [...task.assignedTo, task.owner];
    allUsers.forEach(uid => {
      io.to(uid.toString()).emit("task-updated", { task: populatedTask });
    });

    await logAudit(req.user._id, req.user.name, "task_joined_via_link", task._id, {
      title: task.title,
    });

    res.json({ message: "Successfully joined the task", task: populatedTask });
  } catch (err) {
    next(err);
  }
};
