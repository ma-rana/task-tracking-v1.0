import express from 'express';
import pool from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// ========== GROUPS ==========

// Get all groups
router.get('/groups', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM groups ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get public groups
router.get('/groups/public', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM groups WHERE is_public = true ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get public groups error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get group by ID
router.get('/groups/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM groups WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create group
router.post('/groups', async (req, res) => {
  try {
    const { name, description, leaderId, isPublic } = req.body;

    // Check if name exists
    const nameCheck = await pool.query('SELECT id FROM groups WHERE name = $1', [name]);
    if (nameCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Group name already exists' });
    }

    const groupId = uuidv4();
    const result = await pool.query(
      `INSERT INTO groups (id, name, description, leader_id, is_public)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [groupId, name, description || null, leaderId || null, isPublic || false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update group
router.put('/groups/:id', async (req, res) => {
  try {
    const { name, description, leaderId, isPublic } = req.body;
    const groupId = req.params.id;

    // Check if name is being changed and already exists
    if (name) {
      const nameCheck = await pool.query('SELECT id FROM groups WHERE name = $1 AND id != $2', [name, groupId]);
      if (nameCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Group name already exists' });
      }
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (leaderId !== undefined) {
      updates.push(`leader_id = $${paramCount++}`);
      values.push(leaderId);
    }
    if (isPublic !== undefined) {
      updates.push(`is_public = $${paramCount++}`);
      values.push(isPublic);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(groupId);
    const query = `UPDATE groups SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete group
router.delete('/groups/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM groups WHERE id = $1', [req.params.id]);
    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========== TASKS ==========

// Get all tasks
router.get('/tasks', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get tasks by group
router.get('/tasks/group/:groupId', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM tasks WHERE group_id = $1 ORDER BY created_at DESC',
      [req.params.groupId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get tasks by group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get tasks by assignee
router.get('/tasks/assignee/:assigneeId', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM tasks WHERE assignee_id = $1 ORDER BY created_at DESC',
      [req.params.assigneeId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get tasks by assignee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get task by ID
router.get('/tasks/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create task
router.post('/tasks', async (req, res) => {
  try {
    const { title, description, assigneeId, groupId, createdBy, priority, status, dueDate } = req.body;

    const taskId = uuidv4();
    const taskStatus = status || 'pending';
    // Set completed_at if task is created as completed
    const completedAt = taskStatus === 'completed' ? new Date().toISOString() : null;

    const result = await pool.query(
      `INSERT INTO tasks (id, title, description, assignee_id, group_id, created_by, priority, status, due_date, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [taskId, title, description || null, assigneeId || null, groupId, createdBy, priority || 'medium', taskStatus, dueDate || null, completedAt]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update task
router.put('/tasks/:id', async (req, res) => {
  try {
    const { title, description, assigneeId, priority, status, dueDate, completedAt } = req.body;
    const taskId = req.params.id;

    // Get current task to check status change
    const currentTask = await pool.query('SELECT status FROM tasks WHERE id = $1', [taskId]);
    if (currentTask.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (assigneeId !== undefined) {
      updates.push(`assignee_id = $${paramCount++}`);
      values.push(assigneeId);
    }
    if (priority !== undefined) {
      updates.push(`priority = $${paramCount++}`);
      values.push(priority);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
      // Auto-set completed_at when status changes to 'completed'
      if (status === 'completed' && currentTask.rows[0].status !== 'completed') {
        updates.push(`completed_at = $${paramCount++}`);
        values.push(new Date().toISOString());
      } else if (status !== 'completed' && currentTask.rows[0].status === 'completed') {
        // Clear completed_at when status changes from 'completed'
        updates.push(`completed_at = $${paramCount++}`);
        values.push(null);
      }
    }
    if (dueDate !== undefined) {
      updates.push(`due_date = $${paramCount++}`);
      values.push(dueDate);
    }
    if (completedAt !== undefined) {
      updates.push(`completed_at = $${paramCount++}`);
      values.push(completedAt);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(taskId);
    const query = `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete task
router.delete('/tasks/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========== AUDIT LOGS ==========

// Get audit logs
router.get('/audit-logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const result = await pool.query(
      'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create audit log
router.post('/audit-logs', async (req, res) => {
  try {
    const { action, entityType, entityId, userId, userName, details } = req.body;

    const logId = uuidv4();
    const result = await pool.query(
      `INSERT INTO audit_logs (id, action, entity_type, entity_id, user_id, user_name, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [logId, action, entityType, entityId || null, userId || null, userName || null, details ? JSON.stringify(details) : null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create audit log error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

