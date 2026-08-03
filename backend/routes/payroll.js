const express = require('express');
const router  = express.Router();
const db      = require('../models');
const auth    = require('../middleware/auth');

const toNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

const startOfDay = (v) => { const d = new Date(v); d.setHours(0, 0, 0, 0); return d; };
const endOfDay   = (v) => { const d = new Date(v); d.setHours(23, 59, 59, 999); return d; };

const machineWageFieldByCount = {
  3: 'machine3Wage',
  4: 'machine4Wage',
  5: 'machine5Wage',
  6: 'machine6Wage',
  7: 'machine7Wage',
  8: 'machine8Wage',
  9: 'machine9Wage',
  10: 'machine10Wage',
  11: 'machine11Wage',
  12: 'machine12Wage',
  13: 'machine13Wage',
  14: 'machine14Wage',
  15: 'machine15Wage',
};

const sanitizeDailyEntries = (dailyEntries) => {
  if (!Array.isArray(dailyEntries)) return [];
  return dailyEntries
    .map((entry) => {
      const dt = startOfDay(entry?.date || new Date());
      return {
        date: dt,
        machineCount: Math.max(0, Math.round(toNum(entry?.machineCount))),
        wage: Math.max(0, Math.round(toNum(entry?.wage))),
        wageSource: entry?.wageSource === 'manual' ? 'manual' : 'master',
        masterConfigId: entry?.masterConfigId || null,
      };
    })
    .filter((entry) => !isNaN(entry.date.getTime()));
};

const deriveTotalsFromDailyEntries = (dailyEntries) => {
  const rows = sanitizeDailyEntries(dailyEntries);
  if (!rows.length) return { daysWorked: 0, totalWages: 0, avgWage: 0 };
  const daysWorked = rows.reduce((sum, row) => sum + (row.machineCount > 0 ? 1 : 0), 0);
  const totalWages = rows.reduce((sum, row) => sum + toNum(row.wage), 0);
  const avgWage = daysWorked > 0 ? Math.round((totalWages / daysWorked) * 100) / 100 : 0;
  return { daysWorked, totalWages, avgWage };
};

const calcAmounts = ({ daysWorked, dailyWage, totalWages, deductionPercentage, marketAmount, advanceAmount, dailyEntries }) => {
  const derived         = deriveTotalsFromDailyEntries(dailyEntries);
  const explicitDays    = toNum(daysWorked);
  const days            = explicitDays > 0 ? explicitDays : derived.daysWorked;
  let wage              = toNum(dailyWage);
  const deductPct       = toNum(deductionPercentage);
  const explicitWages   = toNum(totalWages);
  const resolvedWages   = explicitWages > 0
    ? explicitWages
    : (derived.totalWages > 0 ? derived.totalWages : (days * wage));
  const roundedWages    = Math.round(resolvedWages * 100) / 100;
  if (explicitWages > 0 && days > 0) {
    wage = Math.round((roundedWages / days) * 100) / 100;
  } else if (!wage && derived.avgWage > 0) {
    wage = derived.avgWage;
  }
  const market          = toNum(marketAmount);
  const advance         = toNum(advanceAmount);
  const totalWagesValue = roundedWages;
  const deductionAmount = Math.round((totalWagesValue * deductPct) / 100);
  const netSalary       = totalWagesValue - deductionAmount;
  const finalSalary     = Math.max(0, netSalary - market - advance);
  return {
    daysWorked: days,
    dailyWage: wage,
    deductionPercentage: deductPct,
    totalWages: totalWagesValue,
    deductionAmount,
    netSalary,
    marketAmount: market,
    advanceAmount: advance,
    finalSalary,
  };
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
        totalNet               += toNum(entry.finalSalary || entry.netSalary);
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
        totalFinalSalary: totalNet,
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
    const { name, phone, currentDefaultDailyWage, deductionType, deductionValue } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Employee name is required' });
    const employee = new db.Employee({
      name,
      phone:                   phone || '',
      currentDefaultDailyWage: toNum(currentDefaultDailyWage),
      deductionType:           deductionType || 'percentage',
      deductionValue:          toNum(deductionValue),
      status:                  'active',
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
    const employee = await db.Employee.findByIdAndUpdate(
      req.params.id,
      { name, phone: phone || '', currentDefaultDailyWage: toNum(currentDefaultDailyWage), deductionType: deductionType || 'percentage', deductionValue: toNum(deductionValue) },
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

// ── Machine Wage Master ──────────────────────────────────────────────────────

const machineWageKeys = [
  'machine3Wage',
  'machine4Wage',
  'machine5Wage',
  'machine6Wage',
  'machine7Wage',
  'machine8Wage',
  'machine9Wage',
  'machine10Wage',
  'machine11Wage',
  'machine12Wage',
  'machine13Wage',
  'machine14Wage',
  'machine15Wage',
];

const MACHINE_MIN_COUNT = 3;
const MACHINE_MAX_COUNT = 15;

function expandRangesToMachineMap(ranges = []) {
  const map = {};
  for (let mc = MACHINE_MIN_COUNT; mc <= MACHINE_MAX_COUNT; mc += 1) {
    map[mc] = 0;
  }
  if (!Array.isArray(ranges)) return map;
  ranges.forEach((range) => {
    const min = Math.max(MACHINE_MIN_COUNT, Math.round(toNum(range?.minMachineCount)));
    const max = Math.min(MACHINE_MAX_COUNT, Math.round(toNum(range?.maxMachineCount)));
    const wage = Math.max(0, Math.round(toNum(range?.wageAmount)));
    if (!wage || max < min) return;
    for (let mc = min; mc <= max; mc += 1) {
      map[mc] = wage;
    }
  });
  return map;
}

function compressMachineMapToRanges(machineMap = {}) {
  const ranges = [];
  let current = null;
  for (let mc = MACHINE_MIN_COUNT; mc <= MACHINE_MAX_COUNT; mc += 1) {
    const wage = Math.max(0, Math.round(toNum(machineMap[mc])));
    if (!wage) {
      if (current) {
        ranges.push(current);
        current = null;
      }
      continue;
    }
    if (!current) {
      current = { minMachineCount: mc, maxMachineCount: mc, wageAmount: wage };
      continue;
    }
    if (current.wageAmount === wage && current.maxMachineCount + 1 === mc) {
      current.maxMachineCount = mc;
    } else {
      ranges.push(current);
      current = { minMachineCount: mc, maxMachineCount: mc, wageAmount: wage };
    }
  }
  if (current) ranges.push(current);
  return ranges;
}

function machineMapFromRow(row = {}) {
  const mapFromRanges = expandRangesToMachineMap(row.machineRanges);
  const hasAnyRangeValue = Object.values(mapFromRanges).some((v) => toNum(v) > 0);
  if (hasAnyRangeValue) return mapFromRanges;
  const map = {};
  for (let mc = MACHINE_MIN_COUNT; mc <= MACHINE_MAX_COUNT; mc += 1) {
    map[mc] = Math.max(0, Math.round(toNum(row[`machine${mc}Wage`])));
  }
  return map;
}

function machineMapToLegacyFields(machineMap = {}) {
  const out = {};
  for (let mc = MACHINE_MIN_COUNT; mc <= MACHINE_MAX_COUNT; mc += 1) {
    out[`machine${mc}Wage`] = Math.max(0, Math.round(toNum(machineMap[mc])));
  }
  return out;
}

function getWageByMachineCount(row, machineCount) {
  const mc = Math.round(toNum(machineCount));
  if (mc < MACHINE_MIN_COUNT || mc > MACHINE_MAX_COUNT) return 0;
  const map = machineMapFromRow(row || {});
  return Math.max(0, Math.round(toNum(map[mc])));
}

function normalizeMachineWagePayload(body) {
  const hasRanges = Array.isArray(body?.machineRanges) && body.machineRanges.length > 0;
  const machineMap = hasRanges
    ? expandRangesToMachineMap(body.machineRanges)
    : machineMapFromRow(body || {});
  return {
    machineMap,
    machineRanges: compressMachineMapToRanges(machineMap),
    legacyFields: machineMapToLegacyFields(machineMap),
  };
}

function validateMachineWages(payload, rawBody) {
  if (Array.isArray(rawBody?.machineRanges)) {
    for (const row of rawBody.machineRanges) {
      const min = Math.round(toNum(row?.minMachineCount));
      const max = Math.round(toNum(row?.maxMachineCount));
      const wage = Math.round(toNum(row?.wageAmount));
      if (min < MACHINE_MIN_COUNT || max > MACHINE_MAX_COUNT) {
        return `Machine count must be between ${MACHINE_MIN_COUNT} and ${MACHINE_MAX_COUNT}`;
      }
      if (max < min) return 'Max Machine Count cannot be less than Minimum Machine Count';
      if (wage < 0) return 'Wage amount cannot be negative';
    }
  }
  const hasAtLeastOne = Object.values(payload.machineMap || {}).some((v) => toNum(v) > 0);
  if (!hasAtLeastOne) return 'At least one machine wage must be greater than zero';
  return '';
}

async function hasDuplicateFromDate(employeeId, fromDate, excludeId = null) {
  const query = { employeeId, fromDate };
  if (excludeId) query._id = { $ne: excludeId };
  const count = await db.MachineWageMaster.countDocuments(query);
  return count > 0;
}

router.get('/machine-wage-master', auth, async (req, res) => {
  try {
    const query = {};
    if (req.query?.employeeId) query.employeeId = req.query.employeeId;
    const rows = await db.MachineWageMaster.find(query)
      .sort({ fromDate: -1, _id: -1 })
      .lean();
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/machine-wage-master', auth, async (req, res) => {
  try {
    const employeeId = req.body?.employeeId;
    if (!employeeId) {
      return res.status(400).json({ success: false, error: 'Employee is required' });
    }

    const employee = await db.Employee.findOne({ _id: employeeId, status: 'active' }).select('_id').lean();
    if (!employee) {
      return res.status(400).json({ success: false, error: 'Active employee not found' });
    }

    const fromDate = startOfDay(req.body?.fromDate);
    if (isNaN(fromDate.getTime())) {
      return res.status(400).json({ success: false, error: 'From Date is required' });
    }

    const wages = normalizeMachineWagePayload(req.body || {});
    const validationError = validateMachineWages(wages, req.body || {});
    if (validationError) {
      return res.status(400).json({ success: false, error: validationError });
    }

    if (await hasDuplicateFromDate(employeeId, fromDate)) {
      return res.status(400).json({ success: false, error: 'A Machine Wage configuration already exists for this employee on this From Date' });
    }

    // Inherit wages for machine counts not explicitly set, from the employee's most recent previous config.
    const machineMap = { ...wages.machineMap };
    const previous = await db.MachineWageMaster.findOne({
      employeeId,
      isActive: true,
      fromDate: { $lt: fromDate },
    }).sort({ fromDate: -1, _id: -1 }).lean();
    if (previous) {
      const previousMap = machineMapFromRow(previous);
      for (let mc = MACHINE_MIN_COUNT; mc <= MACHINE_MAX_COUNT; mc += 1) {
        if (toNum(machineMap[mc]) <= 0 && toNum(previousMap[mc]) > 0) {
          machineMap[mc] = Math.max(0, Math.round(toNum(previousMap[mc])));
        }
      }
    }

    const mergedRanges = compressMachineMapToRanges(machineMap);
    const mergedLegacyFields = machineMapToLegacyFields(machineMap);

    const row = new db.MachineWageMaster({
      employeeId,
      fromDate,
      machineRanges: mergedRanges,
      ...mergedLegacyFields,
      isActive: req.body?.isActive !== false,
      createdBy: req.user?._id || null,
      modifiedBy: req.user?._id || null,
      createdDate: new Date(),
      modifiedDate: new Date(),
    });

    await row.save();
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

router.put('/machine-wage-master/:id', auth, async (req, res) => {
  try {
    const row = await db.MachineWageMaster.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, error: 'Machine wage row not found' });

    const employeeId = req.body?.employeeId || row.employeeId;
    if (!employeeId) {
      return res.status(400).json({ success: false, error: 'Employee is required' });
    }

    const employee = await db.Employee.findOne({ _id: employeeId, status: 'active' }).select('_id').lean();
    if (!employee) {
      return res.status(400).json({ success: false, error: 'Active employee not found' });
    }

    const fromDate = req.body?.fromDate ? startOfDay(req.body.fromDate) : row.fromDate;
    if (isNaN(fromDate.getTime())) {
      return res.status(400).json({ success: false, error: 'From Date is required' });
    }

    const wages = normalizeMachineWagePayload({ ...row.toObject(), ...req.body });
    const validationError = validateMachineWages(wages, req.body || {});
    if (validationError) {
      return res.status(400).json({ success: false, error: validationError });
    }

    if ((req.body?.fromDate || req.body?.employeeId) && await hasDuplicateFromDate(employeeId, fromDate, row._id)) {
      return res.status(400).json({ success: false, error: 'A Machine Wage configuration already exists for this employee on this From Date' });
    }

    Object.assign(row, {
      employeeId,
      fromDate,
      machineRanges: wages.machineRanges,
      ...wages.legacyFields,
      isActive: req.body?.isActive !== undefined ? !!req.body.isActive : row.isActive,
      modifiedBy: req.user?._id || null,
      modifiedDate: new Date(),
    });

    await row.save();
    res.json({ success: true, data: row });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

router.delete('/machine-wage-master/:id', auth, async (req, res) => {
  try {
    const row = await db.MachineWageMaster.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, error: 'Machine wage row not found' });
    await db.MachineWageMaster.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

router.get('/machine-wage-master/resolve', auth, async (req, res) => {
  try {
    const employeeId = req.query?.employeeId;
    if (!employeeId) {
      return res.status(400).json({ success: false, error: 'employeeId is required' });
    }

    const targetDate = startOfDay(req.query?.date || new Date());
    const machineCount = Math.round(toNum(req.query?.machineCount));
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ success: false, error: 'Valid date is required' });
    }

    const cfg = await db.MachineWageMaster.findOne({
      employeeId,
      isActive: true,
      fromDate: { $lte: targetDate },
    }).sort({ fromDate: -1, _id: -1 }).lean();

    if (!cfg) {
      return res.json({ success: true, data: { wage: 0, configId: null, found: false } });
    }

    const field = machineWageFieldByCount[machineCount] || null;
    const wage = field ? getWageByMachineCount(cfg, machineCount) : 0;
    res.json({ success: true, data: { wage, configId: cfg._id, found: true, config: cfg } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Employee Summary (filterable + week-wise history) ───────────────────────

router.get('/employee-summary', auth, async (req, res) => {
  try {
    const { employeeId, fromDate, toDate, status } = req.query;

    const query = {};
    if (fromDate || toDate) {
      const from = fromDate ? startOfDay(fromDate) : new Date('1970-01-01T00:00:00.000Z');
      const to = toDate ? endOfDay(toDate) : new Date('2999-12-31T23:59:59.999Z');
      query.periodStart = { $lte: to };
      query.periodEnd = { $gte: from };
    }

    const payrolls = await db.Payroll.find(query)
      .sort({ periodStart: 1, _id: 1 })
      .lean();

    const weeks = [];

    payrolls.forEach((run) => {
      (run.employees || []).forEach((emp) => {
        if (employeeId && String(emp.employeeId) !== String(employeeId)) return;
        if (status && String(emp.paymentStatus || '').toLowerCase() !== String(status).toLowerCase()) return;
        weeks.push({
          payrollId: run._id,
          employeeId: emp.employeeId,
          employeeName: emp.name || 'Unknown',
          weekLabel: run.runTitle || '',
          periodStart: run.periodStart,
          periodEnd: run.periodEnd,
          daysWorked: toNum(emp.daysWorked),
          totalWages: toNum(emp.totalWages),
          deductionAmount: toNum(emp.deductionAmount),
          marketAmount: toNum(emp.marketAmount),
          advanceAmount: toNum(emp.advanceAmount),
          finalSalary: toNum(emp.finalSalary || emp.netSalary),
          paidAmount: toNum(emp.amountPaid),
          balance: toNum(emp.amountPending),
          status: emp.paymentStatus || 'pending',
          dailyEntries: Array.isArray(emp.dailyEntries) ? emp.dailyEntries : [],
        });
      });
    });

    const summary = weeks.reduce((acc, row) => {
      if (!acc.employeeId) {
        acc.employeeId = row.employeeId;
        acc.employeeName = row.employeeName;
      }
      acc.totalDaysWorked += row.daysWorked;
      acc.totalWages += row.totalWages;
      acc.deduction += row.deductionAmount;
      acc.market += row.marketAmount;
      acc.advance += row.advanceAmount;
      acc.finalSalary += row.finalSalary;
      acc.paidAmount += row.paidAmount;
      acc.balance += row.balance;
      return acc;
    }, {
      employeeId: null,
      employeeName: '',
      totalDaysWorked: 0,
      totalWages: 0,
      deduction: 0,
      market: 0,
      advance: 0,
      finalSalary: 0,
      paidAmount: 0,
      balance: 0,
    });

    res.json({ success: true, data: { summary, weeks } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
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
      const input   = employeeEntries.find(d => String(d.employeeId) === emp._id.toString()) || {};
      const dailyEntries = sanitizeDailyEntries(input.dailyEntries);
      const amounts = calcAmounts({
        daysWorked:          input.daysWorked,
        dailyWage:           input.wagePerDay ?? emp.dailyWage,
        totalWages:          input.totalWages,
        deductionPercentage: input.deductionPercentage ?? emp.deductionPercentage,
        marketAmount:        input.marketAmount,
        advanceAmount:       input.advanceAmount,
        dailyEntries,
      });
      return {
        employeeId:        emp._id,
        name:              emp.name,
        ...amounts,
        paymentStatus:     'pending',
        amountPaid:        0,
        amountPending:     amounts.finalSalary,
        deductionPaidBack: 0,
        notes:             input.notes || '',
        dailyEntries,
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

// Runs overlapping a custom date range (used for weekly prefill/edit)
router.get('/history-range', auth, async (req, res) => {
  try {
    const { from, to, employeeId } = req.query;
    if (!from || !to) {
      return res.status(400).json({ success: false, error: 'from and to query params are required' });
    }

    const fromDate = startOfDay(from);
    const toDate = endOfDay(to);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid date range' });
    }

    const query = {
      periodStart: { $lte: toDate },
      periodEnd: { $gte: fromDate },
    };

    if (employeeId) {
      query['employees.employeeId'] = employeeId;
    }

    const payrolls = await db.Payroll.find(query)
      .sort({ periodStart: 1, _id: 1 })
      .lean();

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
        const input = employeeEntries.find(e => String(e.employeeId) === emp.employeeId?.toString());
        if (!input) return emp;
        const dailyEntries = sanitizeDailyEntries(input.dailyEntries);
        const amounts     = calcAmounts({
          daysWorked:          input.daysWorked,
          dailyWage:           input.wagePerDay,
          totalWages:          input.totalWages,
          deductionPercentage: input.deductionPercentage,
          marketAmount:        input.marketAmount,
          advanceAmount:       input.advanceAmount,
          dailyEntries,
        });
        const amountPaid    = toNum(emp.amountPaid);
        const amountPending = Math.max(0, amounts.finalSalary - amountPaid);
        const paymentStatus = amountPending === 0 ? 'paid' : amountPaid > 0 ? 'partial' : 'pending';
        return {
          ...emp.toObject(),
          ...amounts,
          amountPaid,
          amountPending,
          paymentStatus,
          dailyEntries,
        };
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
            totalWages:        toNum(emp.totalWages),
            netSalary:         toNum(emp.netSalary),
            marketAmount:      toNum(emp.marketAmount),
            advanceAmount:     toNum(emp.advanceAmount),
            finalSalary:       toNum(emp.finalSalary || emp.netSalary),
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
