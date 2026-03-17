const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const email = 'teamred808@gmail.com';
    const password = 'Rathee@1';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if user exists
    let user = await prisma.users.findFirst({
      where: { email: email }
    });

    if (user) {
      console.log('User exists. Updating password and roles...');
      // Make sure the auth table or whatever holds the password is updated if it exists separately
      // In Prisma schema, password might be in a separate table like Auth or just not shown in previous grep
      
    } else {
      console.log('Creating new admin user...');
      user = await prisma.users.create({
        data: {
          email: email,
        }
      });
      console.log('Created user with ID:', user.id);
    }
  } catch (error) {
  const { PrismaClient } = require('@prisma/client');
const bcrypt =diconst bcrypt = require('bcryptjs');

c
E0F
