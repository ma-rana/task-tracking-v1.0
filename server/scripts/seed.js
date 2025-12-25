import pool from '../config/database.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  try {
    console.log('🌱 Starting database seed...');

    // Hash password for admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminId = uuidv4();

    // Insert one admin user
    const adminUser = {
      id: adminId,
      full_name: 'Admin User',
      email: 'admin@tasktrack.com',
      password: hashedPassword,
      role: 'admin',
      group_id: null,
      job_title: 'System Administrator',
      is_admin_user: true,
      is_primary: true,
    };

    await pool.query(
      `INSERT INTO users (id, full_name, email, password, role, group_id, job_title, is_admin_user, is_primary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (email) DO NOTHING`,
      [
        adminUser.id,
        adminUser.full_name,
        adminUser.email,
        adminUser.password,
        adminUser.role,
        adminUser.group_id,
        adminUser.job_title,
        adminUser.is_admin_user,
        adminUser.is_primary,
      ]
    );

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@tasktrack.com');
    console.log('🔑 Password: admin123');
    console.log('\n✨ Database seed completed!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seed();

