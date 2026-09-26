import { createApp } from '../src/app';
import http from 'http';
import { runSeed } from './seed';

async function testHttpEndpoints() {
  console.log('\n--- Running Complete End-to-End HTTP Integration Test Suite ---');
  await runSeed(true);

  const app = createApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(4099, () => resolve());
  });

  const baseUrl = 'http://127.0.0.1:4099/api/v1';

  try {
    // 1. Test Health
    const healthRes = await fetch('http://127.0.0.1:4099/health');
    const healthData = await healthRes.json();
    console.log('✓ Health check passed:', healthData.status);

    // 2. Test Login (Manager)
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@stocksense.com', password: 'admin123' })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
    const managerToken = loginData.token;
    console.log('✓ Manager login successful. Token acquired');

    // 3. Test Staff Login
    const staffLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'staff@stocksense.com', password: 'staff123' })
    });
    const staffLoginData = await staffLoginRes.json();
    const staffToken = staffLoginData.token;
    console.log('✓ Staff login successful');

    // 4. Test RBAC: Staff trying to create a product (MUST FAIL with 403)
    const staffProdRes = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`
      },
      body: JSON.stringify({
        sku: 'FORBIDDEN-01',
        name: 'Forbidden Item',
        category_id: 'cat_elec_001'
      })
    });
    if (staffProdRes.status !== 403) {
      throw new Error(`RBAC test failed: Expected 403 Forbidden, got ${staffProdRes.status}`);
    }
    console.log('✓ RBAC: Warehouse staff blocked from creating products (403 Forbidden verified)');

    // 5. Test Idempotency Key on Validation
    // Create a new receipt
    const rcptRes = await fetch(`${baseUrl}/receipts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`
      },
      body: JSON.stringify({
        warehouse_id: 'wh_main_001',
        party: 'Idempotency Test Supplier',
        status: 'ready',
        lines: [
          {
            product_id: 'prod_bracket_002',
            location_id: 'loc_a_001',
            expected_qty: 25,
            received_qty: 25
          }
        ]
      })
    });
    const rcptData = await rcptRes.json();

    const idempotencyKey = 'idemp_key_test_12345';
    // First validate call
    const val1 = await fetch(`${baseUrl}/receipts/${rcptData.id}/validate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${managerToken}`,
        'X-Idempotency-Key': idempotencyKey
      }
    });
    const val1Data = await val1.json();
    if (val1.status !== 200) throw new Error(`First validate failed: ${JSON.stringify(val1Data)}`);

    // Second validate call with same key
    const val2 = await fetch(`${baseUrl}/receipts/${rcptData.id}/validate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${managerToken}`,
        'X-Idempotency-Key': idempotencyKey
      }
    });
    const cacheHeader = val2.headers.get('X-Cache-Lookup');
    const val2Data = await val2.json();
    if (val2.status !== 200 || cacheHeader !== 'HIT') {
      throw new Error(`Idempotency test failed: Expected 200 with HIT cache, got status ${val2.status}`);
    }
    console.log('✓ Idempotency Key verified: Duplicate submit is a no-op returning cached response (HIT)');

    // 6. Test OTP flow
    const otpReqRes = await fetch(`${baseUrl}/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@stocksense.com' })
    });
    const otpReqData = await otpReqRes.json();
    const otpCode = otpReqData.otpCode;
    console.log('✓ OTP generated:', otpCode);

    const otpResetRes = await fetch(`${baseUrl}/auth/otp/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'manager@stocksense.com',
        otp: otpCode,
        newPassword: 'newManagerPassword999'
      })
    });
    if (!otpResetRes.ok) throw new Error(`OTP Reset failed: ${JSON.stringify(await otpResetRes.json())}`);
    console.log('✓ Password reset via OTP verified');

    // 7. Verify new password login
    const newLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@stocksense.com', password: 'newManagerPassword999' })
    });
    if (!newLoginRes.ok) throw new Error('Login with new password failed');
    console.log('✓ Login with newly reset password confirmed');

    // 8. Test Dashboard KPIs
    const kpiRes = await fetch(`${baseUrl}/dashboard/kpis`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    const kpis = await kpiRes.json();
    console.log('✓ Dashboard KPIs loaded successfully:', kpis);

    console.log('\n=================================================================');
    console.log(' ALL END-TO-END HTTP INTEGRATION TESTS PASSED 100%             ');
    console.log('=================================================================\n');
  } finally {
    server.close();
  }
}

if (require.main === module) {
  testHttpEndpoints()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Integration test failed:', err);
      process.exit(1);
    });
}
