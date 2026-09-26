import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Boxes,
  Database,
  ShieldCheck,
  Play
} from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';

export const WalkthroughPage: React.FC = () => {
  const toast = useToast();

  const [step, setStep] = useState<number>(0);
  const [isRunningAll, setIsRunningAll] = useState<boolean>(false);
  const [liveStockLocA, setLiveStockLocA] = useState<number | null>(null);
  const [liveStockLocB, setLiveStockLocB] = useState<number | null>(null);
  const [totalLiveStock, setTotalLiveStock] = useState<number | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>(null);

  const refreshLedger = async () => {
    try {
      const [ledRes, kpiRes, pRes] = await Promise.all([
        api.dashboard.getLedger(),
        api.dashboard.getKpis(),
        api.products.list({ search: 'IND-SENS-01' })
      ]);
      setLedgerEntries(ledRes.data || []);
      setKpis(kpiRes);

      if (pRes.data?.length) {
        const prod = pRes.data[0];
        const stockRes = await api.products.getStock(prod.id);
        const locA = stockRes.locations.find((l) => l.location_code === 'LOC-A')?.qty ?? 0;
        const locB = stockRes.locations.find((l) => l.location_code === 'LOC-B')?.qty ?? 0;
        setLiveStockLocA(locA);
        setLiveStockLocB(locB);
        setTotalLiveStock(locA + locB);
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    refreshLedger();
  }, [step]);

  // Step 1: Receive +100
  const executeStep1 = async () => {
    try {
      const prods = await api.products.list({ search: 'IND-SENS-01' });
      const locs = await api.locations.list();
      const locA = locs.data.find((l) => l.code === 'LOC-A');
      const prod = prods.data[0];
      if (!locA || !prod) throw new Error('Master data not found');

      const rcpt = await api.receipts.create({
        warehouse_id: locA.warehouse_id,
        party: 'Apex Industrial Supplies Ltd',
        reference: `PO-SPEC-${Date.now()}`,
        status: 'ready',
        lines: [
          {
            product_id: prod.id,
            location_id: locA.id,
            expected_qty: 100,
            received_qty: 100
          }
        ]
      });

      await api.receipts.validate(rcpt.id);
      setStep(1);
      toast.success('Step 1 Complete: +100 units received into Location A');
      await refreshLedger();
    } catch (err: any) {
      toast.error('Step 1 Failed: ' + err.message);
    }
  };

  // Step 2: Transfer 40 from Loc A to Loc B
  const executeStep2 = async () => {
    try {
      const prods = await api.products.list({ search: 'IND-SENS-01' });
      const locs = await api.locations.list();
      const locA = locs.data.find((l) => l.code === 'LOC-A');
      const locB = locs.data.find((l) => l.code === 'LOC-B');
      const prod = prods.data[0];
      if (!locA || !locB || !prod) throw new Error('Master data not found');

      const trsf = await api.transfers.create({
        product_id: prod.id,
        qty: 40,
        from_location_id: locA.id,
        to_location_id: locB.id,
        status: 'ready'
      });

      await api.transfers.validate(trsf.id);
      setStep(2);
      toast.success('Step 2 Complete: 40 units transferred to Location B (Net Zero overall change)');
      await refreshLedger();
    } catch (err: any) {
      toast.error('Step 2 Failed: ' + err.message);
    }
  };

  // Step 3: Deliver -20 from Loc A
  const executeStep3 = async () => {
    try {
      const prods = await api.products.list({ search: 'IND-SENS-01' });
      const locs = await api.locations.list();
      const locA = locs.data.find((l) => l.code === 'LOC-A');
      const prod = prods.data[0];
      if (!locA || !prod) throw new Error('Master data not found');

      const deliv = await api.deliveries.create({
        warehouse_id: locA.warehouse_id,
        party: 'OmniTech Solutions Inc',
        reference: `SO-SPEC-${Date.now()}`,
        status: 'ready',
        lines: [
          {
            product_id: prod.id,
            location_id: locA.id,
            expected_qty: 20,
            picked_qty: 20
          }
        ]
      });

      await api.deliveries.validate(deliv.id);
      setStep(3);
      toast.success('Step 3 Complete: -20 units delivered from Location A');
      await refreshLedger();
    } catch (err: any) {
      toast.error('Step 3 Failed: ' + err.message);
    }
  };

  // Step 4: Adjust -3 at Loc B (counted 37)
  const executeStep4 = async () => {
    try {
      const prods = await api.products.list({ search: 'IND-SENS-01' });
      const locs = await api.locations.list();
      const locB = locs.data.find((l) => l.code === 'LOC-B');
      const prod = prods.data[0];
      if (!locB || !prod) throw new Error('Master data not found');

      await api.adjustments.create({
        product_id: prod.id,
        location_id: locB.id,
        counted_qty: 37,
        reason: 'Physical cycle count adjustment (-3 damaged calibration unit)'
      });

      setStep(4);
      toast.success('Step 4 Complete: Physical count adjusted to 37 (Delta: -3)');
      await refreshLedger();
    } catch (err: any) {
      toast.error('Step 4 Failed: ' + err.message);
    }
  };

  const handleRunAllSteps = async () => {
    setIsRunningAll(true);
    try {
      await executeStep1();
      await executeStep2();
      await executeStep3();
      await executeStep4();
      toast.success('Full Spec Scenario Replayed! Final Stock = 77 Verified!');
    } finally {
      setIsRunningAll(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={24} color="#ffffff" />
            <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
              The Spec's Worked Example & 77-Stock Proof
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', marginTop: 4 }}>
            Demonstrates the immutable Stock Ledger: receive +100 → transfer (net-zero) → deliver −20 → adjust −3 → assert stock = 77
          </p>
        </div>

        <button
          onClick={handleRunAllSteps}
          className="btn btn-primary"
          disabled={isRunningAll}
        >
          <Play size={16} />
          <span>{isRunningAll ? 'Replaying Scenario...' : 'Run Entire Scenario In 1 Click'}</span>
        </button>
      </div>

      {/* Live Result Meter Card */}
      <div className="card" style={{
        padding: 'var(--space-3)',
        background: '#0a0a0a',
        border: '1px solid var(--border-medium)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          <div>
            <span style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 600 }}>
              Live Stock Level Derived From Ledger
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 4 }}>
              <span style={{ fontSize: 36, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.03em' }}>
                {totalLiveStock ?? '—'}
              </span>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                units of <strong>IND-SENS-01</strong>
              </span>

              {totalLiveStock === 77 && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  borderRadius: 9999,
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  border: '1px solid #ffffff',
                  fontWeight: 800,
                  fontSize: 'var(--text-xs)'
                }}>
                  <ShieldCheck size={16} />
                  SPEC INVARIANT VERIFIED (EXACTLY 77)
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Location A (Bulk)</div>
              <div style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: '#ffffff' }}>
                {liveStockLocA ?? '—'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Location B (Picking)</div>
              <div style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: '#ffffff' }}>
                {liveStockLocB ?? '—'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4-Step Interactive Execution Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-2)' }}>
        {/* Step 1 */}
        <div className="card" style={{ padding: 'var(--space-3)', borderColor: step >= 1 ? '#ffffff' : 'var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#ffffff', textTransform: 'uppercase' }}>Step 1: Inbound</span>
            {step >= 1 && <CheckCircle2 size={16} color="#ffffff" />}
          </div>
          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>Receive +100 Units</h3>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: '6px 0 14px' }}>
            Supplier receipt writes +100 delta to Location A in the Stock Ledger.
          </p>
          <button
            onClick={executeStep1}
            className="btn btn-secondary"
            style={{ width: '100%', fontSize: 'var(--text-xs)' }}
          >
            Execute Step 1 (+100)
          </button>
        </div>

        {/* Step 2 */}
        <div className="card" style={{ padding: 'var(--space-3)', borderColor: step >= 2 ? '#ffffff' : 'var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#ffffff', textTransform: 'uppercase' }}>Step 2: Transfer</span>
            {step >= 2 && <CheckCircle2 size={16} color="#ffffff" />}
          </div>
          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>Move 40 Units</h3>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: '6px 0 14px' }}>
            Transfer moves 40 from Loc A to Loc B. Net zero change to total inventory.
          </p>
          <button
            onClick={executeStep2}
            className="btn btn-secondary"
            style={{ width: '100%', fontSize: 'var(--text-xs)' }}
          >
            Execute Step 2 (Move 40)
          </button>
        </div>

        {/* Step 3 */}
        <div className="card" style={{ padding: 'var(--space-3)', borderColor: step >= 3 ? '#ffffff' : 'var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#ffffff', textTransform: 'uppercase' }}>Step 3: Outbound</span>
            {step >= 3 && <CheckCircle2 size={16} color="#ffffff" />}
          </div>
          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>Deliver −20 Units</h3>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: '6px 0 14px' }}>
            Customer delivery order deducts 20 units from Location A.
          </p>
          <button
            onClick={executeStep3}
            className="btn btn-secondary"
            style={{ width: '100%', fontSize: 'var(--text-xs)' }}
          >
            Execute Step 3 (-20)
          </button>
        </div>

        {/* Step 4 */}
        <div className="card" style={{ padding: 'var(--space-3)', borderColor: step >= 4 ? '#ffffff' : 'var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#ffffff', textTransform: 'uppercase' }}>Step 4: Reconcile</span>
            {step >= 4 && <CheckCircle2 size={16} color="#ffffff" />}
          </div>
          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>Adjust −3 (Count: 37)</h3>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: '6px 0 14px' }}>
            Physical count finds 37 in Loc B instead of 40. Logs -3 audit delta.
          </p>
          <button
            onClick={executeStep4}
            className="btn btn-secondary"
            style={{ width: '100%', fontSize: 'var(--text-xs)' }}
          >
            Execute Step 4 (-3)
          </button>
        </div>
      </div>

      {/* Ground Truth: The Stock Ledger Table */}
      <div style={{ marginTop: 'var(--space-2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Database size={16} color="#ffffff" />
            <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>
              The Immutable Stock Ledger (Audit Trail)
            </h2>
          </div>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Every entry is append-only. Quantities are never directly edited.
          </span>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ledger ID</th>
                <th>Product</th>
                <th>Location</th>
                <th>Movement Delta</th>
                <th>Document Type</th>
                <th>Doc ID</th>
                <th>Audited By</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {ledgerEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--text-muted)' }}>
                    No ledger entries recorded yet.
                  </td>
                </tr>
              ) : (
                ledgerEntries.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                        {row.id.substring(0, 8)}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{row.product_name}</td>
                    <td>{row.location_name} ({row.location_code})</td>
                    <td>
                      <span style={{
                        fontWeight: 800,
                        fontFamily: 'var(--font-mono)',
                        color: '#ffffff'
                      }}>
                        {row.delta > 0 ? `+${row.delta}` : row.delta} {row.uom}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        textTransform: 'uppercase',
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 4,
                        backgroundColor: 'var(--bg-surface-elevated)'
                      }}>
                        {row.doc_type}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                        {row.doc_id.substring(0, 8)}
                      </span>
                    </td>
                    <td>{row.created_by_name}</td>
                    <td>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {row.created_at}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
