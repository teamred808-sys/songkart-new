import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import * as jwt from 'jsonwebtoken';
import adminRoutes from '../routes/admin';
import adminDataRoutes from '../routes/admin-data';
import prisma from '../db/prisma';
import { JWT_SECRET } from '../config';

const createToken = (role: string) => jwt.sign({ id: `${role}-user`, role }, JWT_SECRET, { expiresIn: '1h' });

async function withServer(run: (baseUrl: string) => Promise<void>) {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRoutes);
  app.use('/api/admin', adminDataRoutes);

  const server = app.listen(0);
  await once(server, 'listening');
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await run(baseUrl);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
}

test('admin token gets 200 on admin index routes', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/admin/check-abuse`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${createToken('admin')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reportId: 'report-1',
        action: 'review',
      }),
    });

    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.success, true);
  });
});

test('admin token gets 200 on admin data routes', async () => {
  const originalFindMany = (prisma.profiles as any).findMany;
  (prisma.profiles as any).findMany = async () => [
    {
      id: 'profile-1',
      full_name: 'Admin User',
      email: 'admin@example.com',
      username: 'admin',
      users: {
        user_roles: [{ role: 'admin' }],
      },
    },
  ];

  try {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/admin/users`, {
        headers: {
          Authorization: `Bearer ${createToken('admin')}`,
        },
      });

      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(Array.isArray(data), true);
      assert.equal(data[0]?.user_roles?.[0]?.role, 'admin');
    });
  } finally {
    (prisma.profiles as any).findMany = originalFindMany;
  }
});

test('buyer token gets 403 on admin routes', async () => {
  await withServer(async (baseUrl) => {
    const [indexResponse, dataResponse] = await Promise.all([
      fetch(`${baseUrl}/api/admin/check-abuse`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${createToken('buyer')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportId: 'report-2',
          action: 'review',
        }),
      }),
      fetch(`${baseUrl}/api/admin/users`, {
        headers: {
          Authorization: `Bearer ${createToken('buyer')}`,
        },
      }),
    ]);

    assert.equal(indexResponse.status, 403);
    assert.equal(dataResponse.status, 403);

    const indexBody = await indexResponse.json();
    const dataBody = await dataResponse.json();
    assert.equal(indexBody.error, 'Forbidden');
    assert.equal(dataBody.error, 'Forbidden');
  });
});

test('unauthenticated requests get 401 on admin routes', async () => {
  await withServer(async (baseUrl) => {
    const [indexResponse, dataResponse] = await Promise.all([
      fetch(`${baseUrl}/api/admin/check-abuse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportId: 'report-3',
          action: 'review',
        }),
      }),
      fetch(`${baseUrl}/api/admin/users`),
    ]);

    assert.equal(indexResponse.status, 401);
    assert.equal(dataResponse.status, 401);

    const indexBody = await indexResponse.json();
    const dataBody = await dataResponse.json();
    assert.equal(indexBody.error, 'Unauthorized: Missing or invalid token');
    assert.equal(dataBody.error, 'Unauthorized: Missing or invalid token');
  });
});
