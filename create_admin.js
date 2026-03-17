const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const email = 'teamred808@gmail.com';
    const password = 'Rathee@1';
    
    let user = await prisma.users.findFirst({
      where: { email: email }
    });

    if (!user) {
      console.log('Creating user...');
      user = await prisma.users.create({
        data: {
          email: email
        }
      });
      console.log('User created:', user.id);
    } else {
      console.log('User already exists:', user.id);
    }

    let role = await prisma.user_roles.findFirst({
      where: { user_id: user.id, role: 'admin' }
    });

    if (!role) {
      console.log('Assigning admin role...');
      await prisma.user_roles.create({
        data: {
          user_id: user.id,
          role: 'admin'
        }
      });
      console.log('Admin role assigned.');
    } else {
      console.log('User already has admin role.');
    }

    let profile = await prisma.profiles.findFirst({
      where: { id: user.id }
    });

    if (!profile) {
      console.log('Creating profile...');
      await prisma.profiles.create({
        data: {
          id: user.id,
          email: email,
          full_name: 'Admin',
          role: 'admin',
          specialties: []
        }
      });
      console.log('Profile created.');
    } else {
       console.log('Updating profile role to admin...');
       await prisma.profiles.update({
        where: { id: user.id },
        data: { role: 'admin' }
      });
      console.log('Profile updated.');
    }
    
    console.log('\n--- ADMIN ACCOUNT READY ---');
    console.log('Email:', email);
    console.log('Password:', password);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
