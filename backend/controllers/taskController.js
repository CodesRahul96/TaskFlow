const Task = require("../models/Task");
const logAudit = require("../utils/audit");

// GET /api/tasks
exports.getTasks = async (req, res, next) => {
  try {
    const { status, priority, tag, search, sort = "-createdAt" } = req.query;
    const filter = {
      $or: [{ owner: req.user._id }, { assignedTo: req.user._id }],
    };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (tag) filter.tags = tag;
    if (search) filter.title = { $regex: search, $options: "i" };

    // Priority sort needs numeric mapping: urgent=0, high=1, medium=2, low=3
    const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };
    let tasks;
    if (sort === "priority" || sort === "-priority") {
      const allTasks = await Task.find(filter)
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

// POST /api/tasks
exports.createTask = async (req, res, next) => {
  try {
    const task = await Task.create({ ...req.body, owner: req.user._id });
    await logAudit(req.user._id, req.user.name, "task_created", task._id, {
      title: task.title,
    });
    const io = req.app.get("io");
    io.to(req.user._id.toString()).emit("task-created", { task });
    res.status(201).json({ task });
  } catch (err) {
    next(err);
  }
};

// GET /api/tasks/:id
exports.getTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate("owner", "name email")
      .populate("assignedTo", "name email")
      .populate("subtasks.completedBy", "name");
    if (!task) return res.status(404).json({ message: "Task not found" });
    const canAccess =
      task.owner._id.equals(req.user._id) ||
      task.assignedTo.some((u) => u._id.equals(req.user._id));
    if (!canAccess) return res.status(403).json({ message: "Not authorised" });
    res.json({ task });
  } catch (err) {
    next(err);
  }
};

// PUT /api/tasks/:id
exports.updateTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    const canEdit =
      task.owner.equals(req.user._id) ||
      task.assignedTo.some((u) => u.equals(req.user._id));
    if (!canEdit) return res.status(403).json({ message: "Not authorised" });

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
    }
    const action =
      prevStatus !== task.status ? "task_status_changed" : "task_updated";
    await logAudit(req.user._id, req.user.name, action, task._id, {
      ...(prevStatus !== task.status && { from: prevStatus, to: task.status }),
      title: task.title,
    });

    const io = req.app.get("io");
    task.assignedTo.forEach((uid) =>
      io.to(uid.toString()).emit("task-updated", { task }),
    );
    res.json({ task });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/tasks/:id
exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    if (!task.owner.equals(req.user._id))
      return res.status(403).json({ message: "Not authorised" });
    await task.deleteOne();
    await logAudit(req.user._id, req.user.name, "task_deleted", task._id, {
      title: task.title,
    });
    const io = req.app.get("io");
    io.to(req.user._id.toString()).emit("task-deleted", { taskId: task._id });
    res.json({ message: "Task deleted" });
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
    await logAudit(req.user._id, req.user.name, "subtask_created", task._id, {
      title: req.body.title,
    });
    res.json({ task });
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
    res.json({ task });
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
    await logAudit(req.user._id, req.user.name, "subtask_deleted", task._id, {
      title: sub.title,
    });
    res.json({ task });
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
    await logAudit(req.user._id, req.user.name, "timeblock_added", task._id, {
      startTime,
      endTime,
    });
    res.json({ task });
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
    await logAudit(
      req.user._id,
      req.user.name,
      "timeblock_updated",
      task._id,
      {},
    );
    res.json({ task });
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
    await logAudit(
      req.user._id,
      req.user.name,
      "timeblock_deleted",
      task._id,
      {},
    );
    res.json({ task });
  } catch (err) {
    next(err);
  }
};
