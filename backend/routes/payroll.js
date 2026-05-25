const express = require('express');
const router  = express.Router();
const db      = require('../models');
const auth    = require('../middleware/auth');

const toNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

const startOfDay = (v) => { const d = new Date(v); d.setHours(0, 0, 0, 0); return d; };
const endOfDay   = (v) => { const d = new Date(v); d.setHours(23, 59, 59, 999); return d; };

const calcAmounts = ({ daysWorked, dailyWage, deductionPercentage }) => {
  const days      = toNum(daysWorked);
  const wage      = toNum(dailyWage);
  const deductPct = toNum(deductionPercentage);
  const totalWages      = days * wage;
  const deductionAmount = Math.round((totalWages * deductPct) / 100);
  const netSalary       = totalWages - deductionAmount;
  return { daysWorked: days, dailyWage: wage, deductionPercentage: deductPct, totalWages, deductionAmount, netSalary };
};

let indexChecked = false;
async function ensureNoLegacyIndex() {
  if (indexChecked) return;
  indexChecked = true;
  try {
    const indexes = await db.Payroll.collection.indexes();
    const legacy  = indexes.find(i => i?.name === 'month_1_year_1' && i?.unique);
    if (legacy) await db.Payroll.collection.dropIndex('month_1_year_1');
  } catch (_) {}
}

// ── Employees ─────────────────────────────────────────────────────────────────

// Employee totals summary (pending, paid, deduction balance across all time)
router.get('/employees/summary', auth, async (req, res) => {
  try {
    const [employees, payrolls] = await Promise.all([
      db.Employee.find({ status: 'active' }).lean(),
      db.Payroll.find({}).select('employees').lean(),
    ]);

    const summary = employees.map(emp => {
      const id = emp._id.toString();
      let totalNet = 0, totalPaid = 0, totalPending = 0, totalDeductionAmount = 0, totalDeductionReturned = 0;

      payrolls.forEach(p => {
        const entry = p.employees.find(e => e.employeeId?.toString() === id);
        if (!entry) return;
        totalNet               += toNum(entry.netSalary);
        totalPaid              += toNum(entry.amountPaid);
        totalPending           += toNum(entry.amountPending);
        totalDeductionAmount   += toNum(entry.deductionAmount);
        totalDeductionReturned += toNum(entry.deductionPaidBack);
      });

      return {
        _id:                  emp._id,
        name:                 emp.name,
        phone:                emp.phone,
        dailyWage:            emp.dailyWage,
        deductionPercentage:  emp.deductionPercentage,
        status:               emp.status,
        totalNet,
        totalPaid,
        totalPending,
        totalDeductionAmount,
        totalDeductionReturned,
        deductionBalance: Math.max(0, totalDeductionAmount - totalDeductionReturned),
      };
    });

    res.json({ success: true, data: summary });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/employees', auth, async (req, res) => {
  try {
    const employees = await db.Employee.find({ status: 'active' }).lean();
    res.json({ success: true, data: employees });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/employees', auth, async (req, res) => {
  try {
    const { name, phone, dailyWage, deductionPercentage } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Employee name is required' });
    const employee = new db.Employee({
      name,
      phone:               phone || '',
      employeeId:          `EMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      dailyWage:           toNum(dailyWage),
      deductionPercentage: toNum(deductionPercentage),
      status:              'active',
    });
    await employee.save();
    res.status(201).json({ success: true, data: employee });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

router.put('/employees/:id', auth, async (req, res) => {
  try {
    const { name, phone, dailyWage, deductionPercentage } = req.body;
    const employee = await db.Employee.findByIdAndUpdate(
      req.params.id,
      { name, phone: phone || '', dailyWage: toNum(dailyWage), deductionPercentage: toNum(deductionPercentage) },
      { new: true }
    );
    if (!employee) return res.status(404).json({ success: false, error: 'Employee not found' });
    res.json({ success: true, data: employee });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

router.delete('/employees/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await db.Employee.findById(id);
    if (!employee) return res.status(404).json({ success: false, error: 'Employee not found' });

    await db.PaymentHistory.deleteMany({ employeeId: id });
    await db.Payroll.updateMany(
      { 'employees.employeeId': id },
      { $pull: { employees: { employeeId: id } } }
    );
    await db.Payroll.deleteMany({ employees: { $size: 0 } });
    await db.Employee.findByIdAndDelete(id);

    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// ── Salary Runs ───────────────────────────────────────────────────────────────

router.post('/generate', auth, async (req, res) => {
  try {
    const { month, year, periodStart, periodEnd, employeeEntries, runTitle } = req.body;
    await ensureNoLegacyIndex();

    if (!periodStart || !periodEnd)
      return res.status(400).json({ success: false, error: 'Period start and end are required' });
    if (!Array.isArray(employeeEntries) || !employeeEntries.length)
      return res.status(400).json({ success: false, error: 'No employees selected' });

    const parsedStart = startOfDay(periodStart);
    const parsedEnd   = endOfDay(periodEnd);

    if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime()))
      return res.status(400).json({ success: false, error: 'Invalid period dates' });
    if (parsedStart > parsedEnd)
      return res.status(400).json({ success: false, error: 'Start date cannot be after end date' });

    const ids       = employeeEntries.map(d => d.employeeId);
    const employees = await db.Employee.find({ _id: { $in: ids }, status: 'active' });

    const payrollData = employees.map(emp => {
      const input   = employeeEntries.find(d => d.employeeId === emp._id.toString()) || {};
      const amounts = calcAmounts({
        daysWorked:          input.daysWorked,
        dailyWage:           input.wagePerDay ?? emp.dailyWage,
        deductionPercentage: input.deductionPercentage ?? emp.deductionPercentage,
      });
      return {
        employeeId:        emp._id,
        name:              emp.name,
        ...amounts,
        paymentStatus:     'pending',
        amountPaid:        0,
        amountPending:     amounts.netSalary,
        deductionPaidBack: 0,
        notes:             input.notes || '',
      };
    });

    const payroll = new db.Payroll({
      month,
      year,
      periodStart:  parsedStart,
      periodEnd:    parsedEnd,
      runTitle:     runTitle || '',
      employees:    payrollData,
      generatedAt:  new Date(),
      generatedBy:  req.user._id,
    });

    await payroll.save();
    res.status(201).json({ success: true, data: payroll });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// All runs for a specific month
router.get('/history/:month/:year', auth, async (req, res) => {
  try {
    const payrolls = await db.Payroll.find({
      month: parseInt(req.params.month),
      year:  parseInt(req.params.year),
    }).sort({ periodStart: 1, _id: 1 }).lean();
    res.json({ success: true, data: payrolls });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Delete an entire payroll run
router.delete('/history/:payrollId', auth, async (req, res) => {
  try {
    const payroll = await db.Payroll.findById(req.params.payrollId);
    if (!payroll) return res.status(404).json({ success: false, error: 'Payroll run not found' });

    await db.PaymentHistory.deleteMany({ payrollId: payroll._id });
    await db.Payroll.findByIdAndDelete(payroll._id);

    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// Edit an existing payroll run (dates, label, employee amounts)
router.put('/history/:payrollId', auth, async (req, res) => {
  try {
    const { periodStart, periodEnd, runTitle, employeeEntries } = req.body;
    const payroll = await db.Payroll.findById(req.params.payrollId);
    if (!payroll) return res.status(404).json({ success: false, error: 'Payroll run not found' });

    if (periodStart) payroll.periodStart = startOfDay(periodStart);
    if (periodEnd)   payroll.periodEnd   = endOfDay(periodEnd);
    if (runTitle !== undefined) payroll.runTitle = runTitle;

    if (payroll.periodStart > payroll.periodEnd)
      return res.status(400).json({ success: false, error: 'Start date cannot be after end date' });

    if (Array.isArray(employeeEntries)) {
      payroll.employees = payroll.employees.map(emp => {
        const input = employeeEntries.find(e => e.employeeId === emp.employeeId?.toString());
        if (!input) return emp;
        const amounts     = calcAmounts({
          daysWorked:          input.daysWorked,
          dailyWage:           input.wagePerDay,
          deductionPercentage: input.deductionPercentage,
        });
        const amountPaid    = toNum(emp.amountPaid);
        const amountPending = Math.max(0, amounts.netSalary - amountPaid);
        const paymentStatus = amountPending === 0 ? 'paid' : amountPaid > 0 ? 'partial' : 'pending';
        return { ...emp.toObject(), ...amounts, amountPaid, amountPending, paymentStatus };
      });
      payroll.markModified('employees');
    }

    await payroll.save();
    res.json({ success: true, data: payroll });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// ── Pending summary ───────────────────────────────────────────────────────────

router.get('/pending', auth, async (req, res) => {
  try {
    const payrolls = await db.Payroll.find({}).lean();
    const pending  = [];
    payrolls.forEach(p => {
      p.employees.forEach(emp => {
        const amountPending = toNum(emp.amountPending);
        if (amountPending > 0) {
          pending.push({
            payrollId:         p._id,
            month:             p.month,
            year:              p.year,
            periodStart:       p.periodStart,
            periodEnd:         p.periodEnd,
            employeeId:        emp.employeeId,
            name:              emp.name || 'Unknown',
            netSalary:         toNum(emp.netSalary),
            amountPaid:        toNum(emp.amountPaid),
            amountPending,
            deductionAmount:   toNum(emp.deductionAmount),
            deductionPaidBack: toNum(emp.deductionPaidBack),
            paymentStatus:     emp.paymentStatus || 'pending',
          });
        }
      });
    });
    res.json({ success: true, data: pending });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Payments ──────────────────────────────────────────────────────────────────

// Settle salary payment across oldest pending runs
router.post('/payment/settle-total', auth, async (req, res) => {
  try {
    const { employeeId, amountPaid, paymentMethod, notes } = req.body;
    const totalToSettle = toNum(amountPaid);

    if (!employeeId) return res.status(400).json({ success: false, error: 'Employee is required' });
    if (totalToSettle <= 0) return res.status(400).json({ success: false, error: 'Amount must be greater than zero' });

    const payrolls = await db.Payroll.find({
      employees: { $elemMatch: { employeeId, amountPending: { $gt: 0 } } },
    }).sort({ year: 1, month: 1, periodStart: 1, _id: 1 });

    if (!payrolls.length)
      return res.status(404).json({ success: false, error: 'No pending payroll found for this employee' });

    let remaining = totalToSettle;
    const allocations = [];

    for (const payroll of payrolls) {
      if (remaining <= 0) break;
      const emp = payroll.employees.find(e => e.employeeId?.toString() === employeeId);
      if (!emp) continue;
      const pending = toNum(emp.amountPending);
      if (pending <= 0) continue;

      const applied     = Math.min(pending, remaining);
      emp.amountPaid    = toNum(emp.amountPaid) + applied;
      emp.amountPending = Math.max(0, pending - applied);
      emp.paymentStatus = emp.amountPending <= 0 ? 'paid' : 'partial';

      const payment = new db.PaymentHistory({
        payrollId:     payroll._id,
        employeeId,
        payrollMonth:  payroll.month,
        payrollYear:   payroll.year,
        amountPaid:    applied,
        paymentType:   'salary',
        paymentDate:   new Date(),
        paymentMethod: paymentMethod || 'cash',
        notes:         notes || '',
      });
      await payment.save();
      await payroll.save();

      allocations.push({ payrollId: payroll._id, payrollMonth: payroll.month, payrollYear: payroll.year, applied });
      remaining -= applied;
    }

    res.json({
      success: true,
      data: {
        requestedAmount:   totalToSettle,
        settledAmount:     totalToSettle - remaining,
        unallocatedAmount: remaining,
        allocations,
      },
    });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// Return deduction amount to employee — distributes across oldest runs with remaining balance
router.post('/payment/deduction-return-settle', auth, async (req, res) => {
  try {
    const { employeeId, amountPaid, paymentMethod, notes } = req.body;
    const totalToSettle = toNum(amountPaid);

    if (!employeeId) return res.status(400).json({ success: false, error: 'Employee is required' });
    if (totalToSettle <= 0) return res.status(400).json({ success: false, error: 'Amount must be greater than zero' });

    const payrolls = await db.Payroll.find({ 'employees.employeeId': employeeId })
      .sort({ year: 1, month: 1, periodStart: 1, _id: 1 });

    const eligible = payrolls.filter(p => {
      const emp = p.employees.find(e => e.employeeId?.toString() === employeeId);
      return emp && (toNum(emp.deductionAmount) - toNum(emp.deductionPaidBack)) > 0;
    });

    if (!eligible.length)
      return res.status(404).json({ success: false, error: 'No deduction balance found for this employee' });

    let remaining = totalToSettle;
    const allocations = [];

    for (const payroll of eligible) {
      if (remaining <= 0) break;
      const emp     = payroll.employees.find(e => e.employeeId?.toString() === employeeId);
      const balance = toNum(emp.deductionAmount) - toNum(emp.deductionPaidBack);
      if (balance <= 0) continue;

      const applied         = Math.min(balance, remaining);
      emp.deductionPaidBack = toNum(emp.deductionPaidBack) + applied;

      const payment = new db.PaymentHistory({
        payrollId:     payroll._id,
        employeeId,
        payrollMonth:  payroll.month,
        payrollYear:   payroll.year,
        amountPaid:    applied,
        paymentType:   'deduction_return',
        paymentDate:   new Date(),
        paymentMethod: paymentMethod || 'cash',
        notes:         notes || '',
      });
      await payment.save();
      await payroll.save();

      allocations.push({ payrollId: payroll._id, applied });
      remaining -= applied;
    }

    res.json({
      success: true,
      data: { settledAmount: totalToSettle - remaining, unallocatedAmount: remaining, allocations },
    });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// Payment history for an employee
router.get('/payment-history/:employeeId', auth, async (req, res) => {
  try {
    const payments = await db.PaymentHistory.find({ employeeId: req.params.employeeId })
      .sort({ paymentDate: -1 });
    res.json({ success: true, data: payments });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
