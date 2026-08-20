const express = require('express');
const router = express.Router();
const db = require('../models');
const auth = require('../middleware/auth');

const toNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const startOfDay = (v) => { const d = new Date(v); d.setHours(0, 0, 0, 0); return d; };
const toDateStr = (d) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

function getMonday(dateStr) {
  const d = startOfDay(dateStr);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function getSunday(dateStr) {
  const mon = getMonday(dateStr);
  const sun = new Date(mon);
  sun.setDate(sun.getDate() + 6);
  return sun;
}

function isDateInMonth(dateStr, month, year) {
  const d = new Date(dateStr);
  return d.getMonth() + 1 === month && d.getFullYear() === year;
}

function calcDeduction(grossWages, deductionType, deductionValue, daysWorked) {
  if (deductionType === 'percentage') {
    return Math.round((grossWages * deductionValue) / 100);
  }
  return Math.round(toNum(deductionValue) * (daysWorked || 0));
}

// ── Employees (new schema) ──────────────────────────────────────────────────

router.get('/employees', auth, async (req, res) => {
  try {
    const employees = await db.Employee.find({ status: 'active' }).sort({ name: 1 }).lean();
    res.json({ success: true, data: employees });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/employees', auth, async (req, res) => {
  try {
    const { name, phone, currentDefaultDailyWage, deductionType, deductionValue } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, error: 'Name is required' });

    const employee = new db.Employee({
      name: name.trim(),
      phone: phone || '',
      currentDefaultDailyWage: toNum(currentDefaultDailyWage),
      deductionType: deductionType || 'percentage',
      deductionValue: toNum(deductionValue),
      status: 'active',
    });
    await employee.save();
    res.status(201).json({ success: true, data: employee });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

router.put('/employees/:id', auth, async (req, res) => {
  try {
    const { name, phone, currentDefaultDailyWage, deductionType, deductionValue } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, error: 'Name is required' });

    const employee = await db.Employee.findByIdAndUpdate(
      req.params.id,
      {
        name: name.trim(),
        phone: phone || '',
        currentDefaultDailyWage: toNum(currentDefaultDailyWage),
        deductionType: deductionType || 'percentage',
        deductionValue: toNum(deductionValue),
      },
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
    const emp = await db.Employee.findById(req.params.id);
    if (!emp) return res.status(404).json({ success: false, error: 'Employee not found' });

    await db.SalaryRunEmployee.deleteMany({ employeeId: req.params.id });
    await db.Employee.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// ── Salary Runs ──────────────────────────────────────────────────────────────

router.post('/salary-runs', auth, async (req, res) => {
  try {
    const { type, month, year, startDate, employees: empEntries } = req.body;

    if (!type || !['by_period', 'by_employee'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Invalid type. Must be by_period or by_employee' });
    }
    if (!month || !year) return res.status(400).json({ success: false, error: 'Month and year are required' });
    if (!startDate) return res.status(400).json({ success: false, error: 'Start date is required' });
    if (!Array.isArray(empEntries) || !empEntries.length) {
      return res.status(400).json({ success: false, error: 'At least one employee entry is required' });
    }

    const monday = getMonday(startDate);
    const sunday = getSunday(startDate);

    // Check for duplicate: ensure this employee doesn't already have a record for this week
    const existingRuns = await db.SalaryRun.find({
      month, year,
      periodStartDate: monday,
      periodEndDate: sunday,
    }).lean();

    if (existingRuns.length) {
      const existingRunIds = existingRuns.map(r => r._id);
      for (const entry of empEntries) {
        const existingSRE = await db.SalaryRunEmployee.findOne({
          salaryRunId: { $in: existingRunIds },
          employeeId: entry.employeeId,
        }).lean();
        if (existingSRE) {
          const empName = (await db.Employee.findById(entry.employeeId).lean())?.name || 'Employee';
          return res.status(400).json({
            success: false,
            error: `${empName} already has a salary entry for this week (${toDateStr(monday)} to ${toDateStr(sunday)})`
          });
        }
      }
    }

    // Validate all daily entries are within the specified month
    for (const entry of empEntries) {
      if (Array.isArray(entry.dailyEntries)) {
        for (const de of entry.dailyEntries) {
          if (de.worked && !isDateInMonth(de.date, month, year)) {
            return res.status(400).json({
              success: false,
              error: `Cannot mark work on ${de.date} — it belongs to a different month`
            });
          }
        }
      }
    }

    const salaryRun = new db.SalaryRun({
      type,
      month,
      year,
      periodStartDate: monday,
      periodEndDate: sunday,
      status: 'draft',
      createdBy: req.user?._id || null,
    });
    await salaryRun.save();

    const employeeIds = empEntries.map(e => e.employeeId);
    const dbEmployees = await db.Employee.find({ _id: { $in: employeeIds }, status: 'active' }).lean();

    const salaryRunEmployees = [];
    for (const entry of empEntries) {
      const emp = dbEmployees.find(e => e._id.toString() === entry.employeeId);
      if (!emp) continue;

      const dailyEntries = (entry.dailyEntries || []).map(de => ({
        date: startOfDay(de.date),
        worked: !!de.worked,
        wage: toNum(de.wage),
      }));

      const daysWorked = dailyEntries.filter(d => d.worked).length;
      const grossWages = dailyEntries.filter(d => d.worked).reduce((sum, d) => sum + d.wage, 0);
      const deductionType = emp.deductionType || 'percentage';
      const deductionValue = toNum(emp.deductionValue);
      const deductionAmount = calcDeduction(grossWages, deductionType, deductionValue, daysWorked);
      const market = toNum(entry.market);
      const advance = toNum(entry.advance);
      const finalSalary = Math.max(0, grossWages - deductionAmount - market - advance);

      const sre = new db.SalaryRunEmployee({
        salaryRunId: salaryRun._id,
        employeeId: emp._id,
        employeeName: emp.name,
        defaultDailyWageUsed: emp.currentDefaultDailyWage,
        deductionType,
        deductionValue,
        market,
        advance,
        daysWorked,
        grossWages,
        deductionAmount,
        finalSalary,
        dailyEntries,
      });
      await sre.save();
      salaryRunEmployees.push(sre);
    }

    res.status(201).json({
      success: true,
      data: { salaryRun, employees: salaryRunEmployees },
    });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

router.get('/salary-runs', auth, async (req, res) => {
  try {
    const { month, year } = req.query;
    const query = {};
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);

    const runs = await db.SalaryRun.find(query).sort({ periodStartDate: 1 }).lean();
    const runIds = runs.map(r => r._id);
    const allEmployees = await db.SalaryRunEmployee.find({ salaryRunId: { $in: runIds } }).lean();

    const result = runs.map(run => ({
      ...run,
      employees: allEmployees.filter(e => e.salaryRunId.toString() === run._id.toString()),
    }));

    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/salary-runs/:id', auth, async (req, res) => {
  try {
    const run = await db.SalaryRun.findById(req.params.id).lean();
    if (!run) return res.status(404).json({ success: false, error: 'Salary run not found' });

    const employees = await db.SalaryRunEmployee.find({ salaryRunId: run._id }).lean();
    res.json({ success: true, data: { ...run, employees } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.put('/salary-runs/:id', auth, async (req, res) => {
  try {
    const run = await db.SalaryRun.findById(req.params.id);
    if (!run) return res.status(404).json({ success: false, error: 'Salary run not found' });
    if (run.status === 'locked') {
      return res.status(400).json({ success: false, error: 'Cannot edit a locked salary run' });
    }

    const { employees: empEntries, status } = req.body;

    if (status && ['draft', 'completed', 'locked'].includes(status)) {
      run.status = status;
      await run.save();
    }

    if (Array.isArray(empEntries)) {
      for (const entry of empEntries) {
        const sre = await db.SalaryRunEmployee.findOne({
          salaryRunId: run._id,
          employeeId: entry.employeeId,
        });
        if (!sre) continue;

        if (Array.isArray(entry.dailyEntries)) {
          sre.dailyEntries = entry.dailyEntries.map(de => ({
            date: startOfDay(de.date),
            worked: !!de.worked,
            wage: toNum(de.wage),
          }));
        }

        sre.market = toNum(entry.market ?? sre.market);
        sre.advance = toNum(entry.advance ?? sre.advance);

        sre.daysWorked = sre.dailyEntries.filter(d => d.worked).length;
        sre.grossWages = sre.dailyEntries.filter(d => d.worked).reduce((sum, d) => sum + d.wage, 0);
        sre.deductionAmount = calcDeduction(sre.grossWages, sre.deductionType, sre.deductionValue, sre.daysWorked);
        sre.finalSalary = Math.max(0, sre.grossWages - sre.deductionAmount - sre.market - sre.advance);

        await sre.save();
      }
    }

    const employees = await db.SalaryRunEmployee.find({ salaryRunId: run._id }).lean();
    res.json({ success: true, data: { ...run.toObject(), employees } });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

router.delete('/salary-runs/:id', auth, async (req, res) => {
  try {
    const run = await db.SalaryRun.findById(req.params.id);
    if (!run) return res.status(404).json({ success: false, error: 'Salary run not found' });
    if (run.status === 'locked') {
      return res.status(400).json({ success: false, error: 'Cannot delete a locked salary run' });
    }

    await db.SalaryRunEmployee.deleteMany({ salaryRunId: run._id });
    await db.SalaryRun.findByIdAndDelete(run._id);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// ── Employee Payment Summary ────────────────────────────────────────────────

router.get('/employees/summary', auth, async (req, res) => {
  try {
    const emps = await db.Employee.find({ status: 'active' }).lean();
    const allSRE = await db.SalaryRunEmployee.find({}).lean();
    const allPayments = await db.PaymentHistory.find({}).lean();

    const summary = emps.map(emp => {
      const id = emp._id.toString();
      const empSREs = allSRE.filter(s => s.employeeId?.toString() === id);
      const empPayments = allPayments.filter(p => p.employeeId?.toString() === id);

      const totalNet = empSREs.reduce((sum, s) => sum + toNum(s.finalSalary), 0);
      const totalDeductionAmount = empSREs.reduce((sum, s) => sum + toNum(s.deductionAmount), 0);
      const totalPaid = empPayments
        .filter(p => p.paymentType === 'salary')
        .reduce((sum, p) => sum + toNum(p.amountPaid), 0);
      const totalDeductionReturned = empPayments
        .filter(p => p.paymentType === 'deduction_return')
        .reduce((sum, p) => sum + toNum(p.amountPaid), 0);

      return {
        _id: emp._id,
        name: emp.name,
        phone: emp.phone,
        totalNet,
        totalPaid,
        totalPending: Math.max(0, totalNet - totalPaid),
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

// ── Payment: Settle Salary ──────────────────────────────────────────────────

router.post('/payment/settle-total', auth, async (req, res) => {
  try {
    const { employeeId, amountPaid, paymentMethod, notes } = req.body;
    const totalToSettle = toNum(amountPaid);

    if (!employeeId) return res.status(400).json({ success: false, error: 'Employee is required' });
    if (totalToSettle <= 0) return res.status(400).json({ success: false, error: 'Amount must be greater than zero' });

    // Find all salary run employees for this employee, joined with their salary run
    const sres = await db.SalaryRunEmployee.find({ employeeId }).lean();
    const runIds = [...new Set(sres.map(s => s.salaryRunId.toString()))];
    const runs = await db.SalaryRun.find({ _id: { $in: runIds } }).sort({ periodStartDate: 1 }).lean();

    // Get existing payments to calculate pending per SRE
    const existingPayments = await db.PaymentHistory.find({ employeeId, paymentType: 'salary' }).lean();
    const paidPerRun = {};
    existingPayments.forEach(p => {
      const rid = p.payrollId?.toString() || '';
      paidPerRun[rid] = (paidPerRun[rid] || 0) + toNum(p.amountPaid);
    });

    let remaining = totalToSettle;
    const allocations = [];

    for (const run of runs) {
      if (remaining <= 0) break;
      const runSres = sres.filter(s => s.salaryRunId.toString() === run._id.toString());
      const runTotal = runSres.reduce((sum, s) => sum + toNum(s.finalSalary), 0);
      const runPaid = paidPerRun[run._id.toString()] || 0;
      const runPending = Math.max(0, runTotal - runPaid);
      if (runPending <= 0) continue;

      const applied = Math.min(runPending, remaining);
      const payment = new db.PaymentHistory({
        payrollId: run._id,
        employeeId,
        payrollMonth: run.month,
        payrollYear: run.year,
        amountPaid: applied,
        paymentType: 'salary',
        paymentDate: new Date(),
        paymentMethod: paymentMethod || 'cash',
        notes: notes || '',
      });
      await payment.save();
      allocations.push({ salaryRunId: run._id, applied });
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

// ── Payment: Deduction Return ───────────────────────────────────────────────

router.post('/payment/deduction-return', auth, async (req, res) => {
  try {
    const { employeeId, amountPaid, paymentMethod, notes } = req.body;
    const amount = toNum(amountPaid);

    if (!employeeId) return res.status(400).json({ success: false, error: 'Employee is required' });
    if (amount <= 0) return res.status(400).json({ success: false, error: 'Amount must be greater than zero' });

    const payment = new db.PaymentHistory({
      payrollId: null,
      employeeId,
      amountPaid: amount,
      paymentType: 'deduction_return',
      paymentDate: new Date(),
      paymentMethod: paymentMethod || 'cash',
      notes: notes || '',
    });
    await payment.save();

    res.json({ success: true, data: payment });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// ── Payment History ─────────────────────────────────────────────────────────

router.get('/payment-history/:employeeId', auth, async (req, res) => {
  try {
    const payments = await db.PaymentHistory.find({ employeeId: req.params.employeeId })
      .sort({ paymentDate: -1 })
      .lean();
    res.json({ success: true, data: payments });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Monthly Breakdown (per-month salary due vs paid vs pending) ─────────────

router.get('/monthly-breakdown/:employeeId', auth, async (req, res) => {
  try {
    const { employeeId } = req.params;

    // All salary run entries for this employee
    const allSREs = await db.SalaryRunEmployee.find({ employeeId }).lean();
    const runIds = [...new Set(allSREs.map(s => s.salaryRunId.toString()))];
    const runs = await db.SalaryRun.find({ _id: { $in: runIds } }).lean();

    // Total paid all-time (waterfall pool)
    const payments = await db.PaymentHistory.find({ employeeId, paymentType: 'salary' }).lean();
    const totalPaidAllTime = payments.reduce((s, p) => s + toNum(p.amountPaid), 0);

    // Build due per month from salary runs
    const monthMap = {};
    for (const sre of allSREs) {
      const run = runs.find(r => r._id.toString() === sre.salaryRunId.toString());
      if (!run) continue;
      const key = `${run.year}-${String(run.month).padStart(2, '0')}`;
      if (!monthMap[key]) monthMap[key] = { month: run.month, year: run.year, key, due: 0, paid: 0 };
      monthMap[key].due += toNum(sre.finalSalary);
    }

    // Waterfall: apply total paid to oldest months first (same logic as settle-total)
    const sorted = Object.values(monthMap).sort((a, b) => a.key.localeCompare(b.key));
    let remaining = totalPaidAllTime;
    for (const row of sorted) {
      const applied = Math.min(row.due, remaining);
      row.paid = applied;
      remaining -= applied;
    }

    const result = sorted
      .map(row => ({
        ...row,
        pending: Math.max(0, row.due - row.paid),
        status: row.paid >= row.due ? 'paid' : row.paid > 0 ? 'partial' : 'pending',
      }))
      .sort((a, b) => b.key.localeCompare(a.key)); // newest first for display

    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Payslip ─────────────────────────────────────────────────────────────────

router.get('/payslip', auth, async (req, res) => {
  try {
    const { employeeId, month, year } = req.query;
    if (!employeeId || !month || !year) {
      return res.status(400).json({ success: false, error: 'employeeId, month, and year are required' });
    }

    const m = parseInt(month);
    const y = parseInt(year);

    const monthStart = new Date(y, m - 1, 1);
    const monthEnd = new Date(y, m, 0);
    monthEnd.setHours(23, 59, 59, 999);

    // ── This month's salary runs ──────────────────────────────────────────────
    const runs = await db.SalaryRun.find({ month: m, year: y }).sort({ periodStartDate: 1 }).lean();
    const runIds = runs.map(r => r._id);
    const sres = await db.SalaryRunEmployee.find({ salaryRunId: { $in: runIds }, employeeId }).lean();

    // ── Waterfall payment model ───────────────────────────────────────────────
    // settle-total fills oldest runs first, so we can't rely on payrollId links.
    // Instead: paidTowardThisMonth = max(0, allTimePaid − totalDueBeforeThisMonth)
    const allSalaryPayments = await db.PaymentHistory.find({ employeeId, paymentType: 'salary' }).lean();
    const allTimePaid = allSalaryPayments.reduce((s, p) => s + toNum(p.amountPaid), 0);

    const prevRuns = await db.SalaryRun.find({
      $or: [{ year: { $lt: y } }, { year: y, month: { $lt: m } }],
    }).select('_id').lean();
    const prevRunIds = prevRuns.map(r => r._id);

    const prevSREs = await db.SalaryRunEmployee.find({ employeeId, salaryRunId: { $in: prevRunIds } }).lean();
    const previousDue = prevSREs.reduce((s, sre) => s + toNum(sre.finalSalary), 0);

    // How much of the all-time payments spills over into this month
    const spillover = Math.max(0, allTimePaid - previousDue);

    // Carry-forward: previous months not yet covered by payments
    const carryForwardPending = Math.max(0, previousDue - allTimePaid);

    // ── Deduction fund ────────────────────────────────────────────────────────
    const deductionReturnsThisMonth = await db.PaymentHistory.find({
      employeeId,
      paymentType: 'deduction_return',
      paymentDate: { $gte: monthStart, $lte: monthEnd },
    }).lean();
    const deductionReturnedThisMonth = deductionReturnsThisMonth.reduce((sum, p) => sum + toNum(p.amountPaid), 0);

    const allSREs = await db.SalaryRunEmployee.find({ employeeId }).lean();
    const totalDeductionAllTime = allSREs.reduce((sum, s) => sum + toNum(s.deductionAmount), 0);
    const allDeductionReturns = await db.PaymentHistory.find({ employeeId, paymentType: 'deduction_return' }).lean();
    const totalReturnedAllTime = allDeductionReturns.reduce((sum, p) => sum + toNum(p.amountPaid), 0);
    const deductionFundBalance = Math.max(0, totalDeductionAllTime - totalReturnedAllTime);

    // ── Build entries ─────────────────────────────────────────────────────────
    const entries = sres.map(sre => {
      const run = runs.find(r => r._id.toString() === sre.salaryRunId.toString());
      const pStart = run?.periodStartDate ? new Date(run.periodStartDate) : monthStart;
      const pEnd = run?.periodEndDate ? new Date(run.periodEndDate) : monthEnd;
      const clippedStart = pStart < monthStart ? monthStart : pStart;
      const clippedEnd = pEnd > monthEnd ? monthEnd : pEnd;
      return {
        periodStart: clippedStart,
        periodEnd: clippedEnd,
        daysWorked: sre.daysWorked,
        grossWages: sre.grossWages,
        deductionAmount: sre.deductionAmount,
        market: sre.market,
        advance: sre.advance,
        finalSalary: sre.finalSalary,
        dailyWageUsed: sre.defaultDailyWageUsed,
      };
    }).sort((a, b) => new Date(a.periodStart) - new Date(b.periodStart));

    const totalGross = entries.reduce((s, e) => s + toNum(e.grossWages), 0);
    const totalDeduction = entries.reduce((s, e) => s + toNum(e.deductionAmount), 0);
    const totalFinal = entries.reduce((s, e) => s + toNum(e.finalSalary), 0);
    // How much of spillover covers this month's net salary
    const totalPaidThisMonth = Math.min(totalFinal, spillover);
    const totalPending = Math.max(0, totalFinal - totalPaidThisMonth);
    const totalOutstanding = totalPending + carryForwardPending;

    const emp = await db.Employee.findById(employeeId).lean();

    res.json({
      success: true,
      data: {
        name: emp?.name || 'Employee',
        phone: emp?.phone || '',
        month: m,
        year: y,
        entries,
        totalGross,
        totalDeduction,
        totalFinal,
        totalPaid: totalPaidThisMonth,
        totalPending,
        carryForwardPending,
        totalOutstanding,
        paymentStatus: totalPending <= 0 ? 'paid' : totalPaidThisMonth > 0 ? 'partial' : 'pending',
        deductionFund: {
          deductedThisMonth: totalDeduction,
          returnedThisMonth: deductionReturnedThisMonth,
          totalAccumulated: totalDeductionAllTime,
          totalReturned: totalReturnedAllTime,
          balance: deductionFundBalance,
        },
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Employee Summary (filterable week-wise history) ─────────────────────────

router.get('/employee-summary', auth, async (req, res) => {
  try {
    const { employeeId, fromDate, toDate, month, year } = req.query;

    const runQuery = {};
    // Support month-only, year-only, or both
    if (month) runQuery.month = parseInt(month);
    if (year)  runQuery.year  = parseInt(year);
    if (fromDate || toDate) {
      const from = fromDate ? startOfDay(fromDate) : new Date('1970-01-01');
      const to = toDate ? new Date(toDate) : new Date('2999-12-31');
      to.setHours(23, 59, 59, 999);
      runQuery.periodStartDate = { $lte: to };
      runQuery.periodEndDate   = { $gte: from };
    }

    const runs = await db.SalaryRun.find(runQuery).sort({ periodStartDate: 1 }).lean();
    const runIds = runs.map(r => r._id);

    const sreQuery = { salaryRunId: { $in: runIds } };
    if (employeeId) sreQuery.employeeId = employeeId;

    const sres = await db.SalaryRunEmployee.find(sreQuery).lean();

    const payments = await db.PaymentHistory.find(
      employeeId ? { employeeId, paymentType: 'salary' } : { paymentType: 'salary' }
    ).lean();

    const paidPerRun = {};
    payments.forEach(p => {
      const key = `${p.payrollId?.toString() || ''}_${p.employeeId?.toString() || ''}`;
      paidPerRun[key] = (paidPerRun[key] || 0) + toNum(p.amountPaid);
    });

    const weeks = sres.map(sre => {
      const run = runs.find(r => r._id.toString() === sre.salaryRunId.toString());
      const key = `${run?._id?.toString() || ''}_${sre.employeeId?.toString() || ''}`;
      const paid = paidPerRun[key] || 0;

      let pStart = run?.periodStartDate;
      let pEnd = run?.periodEndDate;
      if (run && run.month && run.year) {
        const mStart = new Date(run.year, run.month - 1, 1);
        const mEnd = new Date(run.year, run.month, 0);
        if (new Date(pStart) < mStart) pStart = mStart;
        if (new Date(pEnd) > mEnd) pEnd = mEnd;
      }

      return {
        salaryRunId: sre.salaryRunId,
        employeeId: sre.employeeId,
        employeeName: sre.employeeName,
        periodStart: pStart,
        periodEnd: pEnd,
        month: run?.month,
        year: run?.year,
        daysWorked: sre.daysWorked,
        grossWages: sre.grossWages,
        deductionAmount: sre.deductionAmount,
        market: sre.market,
        advance: sre.advance,
        finalSalary: sre.finalSalary,
        paidAmount: paid,
        balance: Math.max(0, sre.finalSalary - paid),
        status: paid >= sre.finalSalary ? 'paid' : paid > 0 ? 'partial' : 'pending',
        dailyEntries: sre.dailyEntries || [],
      };
    });

    const summary = {
      totalDaysWorked:   weeks.reduce((s, w) => s + w.daysWorked, 0),
      totalWages:        weeks.reduce((s, w) => s + w.grossWages, 0),
      totalDeduction:    weeks.reduce((s, w) => s + w.deductionAmount, 0),
      totalFinalSalary:  weeks.reduce((s, w) => s + w.finalSalary, 0),
      totalPaid:         weeks.reduce((s, w) => s + w.paidAmount, 0),
      totalBalance:      weeks.reduce((s, w) => s + w.balance, 0),
    };

    res.json({ success: true, data: { summary, weeks } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
