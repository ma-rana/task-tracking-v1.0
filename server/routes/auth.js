import express from 'express';
import pool from '../config/database.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password, isAdmin } = req.body;

    // Email is required for login
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_admin_user = $2',
      [email, isAdmin || false]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      user: userWithoutPassword,
      token: 'session-token', // Simple token for now
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, full_name, email, role, group_id, job_title, is_admin_user, is_primary, created_at, updated_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by ID
router.get('/users/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, full_name, email, role, group_id, job_title, is_admin_user, is_primary, created_at, updated_at FROM users WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create user
router.post('/users', async (req, res) => {
  try {
    const { fullName, email, password, role, groupId, jobTitle, isAdminUser } = req.body;

    // Validate required fields
    if (!fullName) {
      return res.status(400).json({ error: 'Full name is required' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }
    if (isAdminUser && !email) {
      return res.status(400).json({ error: 'Email is required for admin users' });
    }

    // Check if email exists (only if email is provided)
    if (email) {
      const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    const result = await pool.query(
      `INSERT INTO users (id, full_name, email, password, role, group_id, job_title, is_admin_user, is_primary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, full_name, email, role, group_id, job_title, is_admin_user, is_primary, created_at, updated_at`,
      [userId, fullName, email, hashedPassword, role, groupId || null, jobTitle || null, isAdminUser || false, false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user
router.put('/users/:id', async (req, res) => {
  try {
    const { fullName, email, password, role, groupId, jobTitle, isPrimary } = req.body;
    const userId = req.params.id;

    // Check if user exists
    const userCheck = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if email is being changed and already exists (only if email is provided)
    if (email !== undefined && email !== userCheck.rows[0].email) {
      if (email) {
        const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, userId]);
        if (emailCheck.rows.length > 0) {
          return res.status(400).json({ error: 'Email already exists' });
        }
      }
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (fullName !== undefined) {
      updates.push(`full_name = $${paramCount++}`);
      values.push(fullName);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (password !== undefined) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push(`password = $${paramCount++}`);
      values.push(hashedPassword);
    }
    if (role !== undefined) {
      updates.push(`role = $${paramCount++}`);
      values.push(role);
    }
    if (groupId !== undefined) {
      updates.push(`group_id = $${paramCount++}`);
      values.push(groupId);
    }
    if (jobTitle !== undefined) {
      updates.push(`job_title = $${paramCount++}`);
      values.push(jobTitle);
    }
    if (isPrimary !== undefined) {
      updates.push(`is_primary = $${paramCount++}`);
      values.push(isPrimary);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(userId);
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount}
                   RETURNING id, full_name, email, role, group_id, job_title, is_admin_user, is_primary, created_at, updated_at`;

    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    // Check if user is primary admin
    const userCheck = await pool.query('SELECT is_primary, is_admin_user FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userCheck.rows[0].is_primary && userCheck.rows[0].is_admin_user) {
      return res.status(400).json({ error: 'Cannot delete primary admin account' });
    }

    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get users by group
router.get('/users/group/:groupId', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, full_name, email, role, group_id, job_title, is_admin_user, is_primary, created_at, updated_at FROM users WHERE group_id = $1 ORDER BY full_name',
      [req.params.groupId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get users by group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

