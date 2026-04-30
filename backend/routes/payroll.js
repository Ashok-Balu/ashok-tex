const express = require('express');
const router = express.Router();
const db = require('../models');
const auth = require('../middleware/auth');
const { uploadPayslipPdf, isCloudinaryConfigured } = require('../cloudinary');

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const startOfDay = (value) => {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (value) => {
  const d = new Date(value);
  d.setHours(23, 59, 59, 999);
  return d;
};

const sameMonthYear = (date, month, year) => {
  const d = new Date(date);
  return d.getMonth() + 1 === Number(month) && d.getFullYear() === Number(year);
};

const calcPayrollAmounts = ({ daysWorked, dailyWage, deductionPercentage }) => {
  const cleanDays = toNum(daysWorked);
  const cleanWage = toNum(dailyWage);
  const cleanDeductionPct = toNum(deductionPercentage);
  const totalWages = cleanDays * cleanWage;
  const deductionAmount = Math.round((totalWages * cleanDeductionPct) / 100);
  const netSalary = totalWages - deductionAmount;
  return {
    daysWorked: cleanDays,
    dailyWage: cleanWage,
    deductionPercentage: cleanDeductionPct,
    totalWages,
    deductionAmount,
    netSalary,
  };
};

const normalizePhone = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith('00')) return digits.slice(2);
  return digits;
};

const isWhatsAppConfigured = () => Boolean(
  process.env.WHATSAPP_ACCESS_TOKEN &&
  process.env.WHATSAPP_PHONE_NUMBER_ID
);

async function sendWhatsAppDocument({ to, link, fileName, caption }) {
  const response = await fetch(
    `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'document',
        document: {
          link,
          filename: fileName,
          caption,
        },
      }),
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || 'Failed to send WhatsApp document');
  }
  return data;
}

let payrollIndexChecked = false;
async function ensureNoLegacyUniquePayrollIndex() {
  if (payrollIndexChecked) return;
  payrollIndexChecked = true;

  try {
    const indexes = await db.Payroll.collection.indexes();
    const legacy = indexes.find(idx => idx?.name === 'month_1_year_1' && idx?.unique);
    if (legacy) {
      await db.Payroll.collection.dropIndex('month_1_year_1');
    }
  } catch (error) {
    // Non-fatal: app can continue even if index drop is not needed/possible.
  }
}

// POST: Add new employee
router.post('/employees', auth, async (req, res) => {
  try {
    const { name, deductionPercentage, phone } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Employee name is required' });
    }

    const employee = new db.Employee({
      name,
      phone: phone || '',
      employeeId: `EMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      dailyWage: 0,
      deductionPercentage,
      status: 'active',
      createdAt: new Date()
    });

    await employee.save();
    res.status(201).json({ success: true, data: employee });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// GET: All employees
router.get('/employees', auth, async (req, res) => {
  try {
    const employees = await db.Employee.find({ status: 'active' });
    res.json({ success: true, data: employees });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT: Update employee
router.put('/employees/:id', auth, async (req, res) => {
  try {
    const { name, deductionPercentage, phone } = req.body;
    const employee = await db.Employee.findByIdAndUpdate(
      req.params.id,
      { name, deductionPercentage, phone: phone || '' },
      { new: true }
    );
    res.json({ success: true, data: employee });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE: Hard delete employee + all related payroll/payment data
router.delete('/employees/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await db.Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    // 1. Delete all payment history records for this employee
    await db.PaymentHistory.deleteMany({ employeeId: id });

    // 2. Remove this employee's entry from every payroll document
    await db.Payroll.updateMany(
      { 'employees.employeeId': id },
      { $pull: { employees: { employeeId: id } } }
    );

    // 3. Remove any payroll documents that are now empty
    await db.Payroll.deleteMany({ employees: { $size: 0 } });

    // 4. Hard delete the employee
    await db.Employee.findByIdAndDelete(id);

    res.json({ success: true, message: 'Employee and all related data deleted.' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST: Generate payroll (only for selected employees)
router.post('/generate', auth, async (req, res) => {
  try {
    const { month, year, periodStart, periodEnd, employeeEntries, runTitle } = req.body;

    await ensureNoLegacyUniquePayrollIndex();

    if (!periodStart || !periodEnd) {
      return res.status(400).json({ success: false, error: 'Period start and end are required' });
    }
    if (!Array.isArray(employeeEntries) || employeeEntries.length === 0) {
      return res.status(400).json({ success: false, error: 'No employees selected for this run' });
    }

    const parsedStart = startOfDay(periodStart);
    const parsedEnd = endOfDay(periodEnd);
    if (Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid period dates' });
    }
    if (parsedStart > parsedEnd) {
      return res.status(400).json({ success: false, error: 'Period start cannot be after period end' });
    }
    if (!sameMonthYear(parsedStart, month, year) || !sameMonthYear(parsedEnd, month, year)) {
      return res.status(400).json({ success: false, error: 'Period dates must be inside the selected month and year' });
    }

    const selectedIds = employeeEntries.map(d => d.employeeId);
    const employees = await db.Employee.find({ _id: { $in: selectedIds }, status: 'active' });

    const payrollData = employees.map(emp => {
      const input = employeeEntries.find(d => d.employeeId === emp._id.toString()) || {};
      const amounts = calcPayrollAmounts({
        daysWorked: input.daysWorked,
        dailyWage: input.wagePerDay,
        deductionPercentage: input.deductionPercentage ?? emp.deductionPercentage,
      });

      return {
        employeeId: emp._id,
        name: emp.name,
        ...amounts,
        paymentStatus: 'pending',
        amountPaid: 0,
        amountPending: amounts.netSalary,
        deductionPaidBack: 0,
        notes: input.notes || ''
      };
    });

    const payroll = new db.Payroll({
      month,
      year,
      periodStart: parsedStart,
      periodEnd: parsedEnd,
      runTitle: runTitle || '',
      employees: payrollData,
      generatedAt: new Date(),
      generatedBy: req.user._id
    });

    await payroll.save();
    res.status(201).json({ success: true, data: payroll });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// GET: All payroll runs for specific month
router.get('/history/:month/:year', auth, async (req, res) => {
  try {
    const { month, year } = req.params;
    const payrolls = await db.Payroll.find({
      month: parseInt(month),
      year: parseInt(year)
    }).sort({ generatedAt: -1, _id: -1 });

    res.json({ success: true, data: payrolls });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT: Edit payroll history entry for one employee
router.put('/history/:payrollId/employee/:employeeId', auth, async (req, res) => {
  try {
    const { payrollId, employeeId } = req.params;
    const { daysWorked, dailyWage, deductionPercentage } = req.body;

    const payroll = await db.Payroll.findById(payrollId);
    if (!payroll) {
      return res.status(404).json({ success: false, error: 'Payroll not found' });
    }

    const emp = payroll.employees.find(e => e.employeeId.toString() === employeeId);
    if (!emp) {
      return res.status(404).json({ success: false, error: 'Employee payroll entry not found' });
    }

    const nextDays = toNum(daysWorked);
    const nextWage = toNum(dailyWage);
    const nextDeductionPct = toNum(deductionPercentage);

    const amounts = calcPayrollAmounts({
      daysWorked: nextDays,
      dailyWage: nextWage,
      deductionPercentage: nextDeductionPct,
    });
    const amountPaid = toNum(emp.amountPaid);
    const amountPending = Math.max(0, amounts.netSalary - amountPaid);
    const paymentStatus = amountPending <= 0 ? 'paid' : (amountPaid > 0 ? 'partial' : 'pending');

    emp.daysWorked = amounts.daysWorked;
    emp.dailyWage = amounts.dailyWage;
    emp.deductionPercentage = amounts.deductionPercentage;
    emp.totalWages = amounts.totalWages;
    emp.deductionAmount = amounts.deductionAmount;
    emp.netSalary = amounts.netSalary;
    emp.amountPending = amountPending;
    emp.paymentStatus = paymentStatus;

    await payroll.save();
    res.json({ success: true, data: payroll });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE: Remove payroll history entry for one employee
router.delete('/history/:payrollId/employee/:employeeId', auth, async (req, res) => {
  try {
    const { payrollId, employeeId } = req.params;

    const payroll = await db.Payroll.findById(payrollId);
    if (!payroll) {
      return res.status(404).json({ success: false, error: 'Payroll not found' });
    }

    const beforeCount = payroll.employees.length;
    payroll.employees = payroll.employees.filter(e => e.employeeId.toString() !== employeeId);

    if (payroll.employees.length === beforeCount) {
      return res.status(404).json({ success: false, error: 'Employee payroll entry not found' });
    }

    await db.PaymentHistory.deleteMany({ payrollId, employeeId });
    await payroll.save();

    res.json({ success: true, data: payroll });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// GET: All pending payments
router.get('/pending', auth, async (req, res) => {
  try {
    const payrolls = await db.Payroll.find({});
    
    const pending = [];
    payrolls.forEach(payroll => {
      payroll.employees.forEach(emp => {
        const amountPaid = toNum(emp.amountPaid);
        const netSalary = toNum(emp.netSalary);
        const rawPending = toNum(emp.amountPending);
        const amountPending = rawPending > 0 ? rawPending : Math.max(0, netSalary - amountPaid);

        if (amountPending > 0) {
          pending.push({
            payrollId: payroll._id,
            month: payroll.month,
            year: payroll.year,
            periodStart: payroll.periodStart,
            periodEnd: payroll.periodEnd,
            employeeId: emp.employeeId,
            name: emp.name || 'Unknown',
            netSalary,
            amountPaid,
            amountPending,
            deductionAmount: toNum(emp.deductionAmount),
            deductionPaidBack: toNum(emp.deductionPaidBack),
            paymentStatus: emp.paymentStatus || 'pending'
          });
        }
      });
    });

    res.json({ success: true, data: pending });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST: Record payment
router.post('/payment', auth, async (req, res) => {
  try {
    const { payrollId, employeeId, amountPaid, paymentMethod, notes } = req.body;

    // Find payroll
    const payroll = await db.Payroll.findById(payrollId);
    if (!payroll) {
      return res.status(404).json({ success: false, error: 'Payroll not found' });
    }

    // Find employee in payroll
    const empIndex = payroll.employees.findIndex(e => e.employeeId.toString() === employeeId);
    if (empIndex === -1) {
      return res.status(404).json({ success: false, error: 'Employee not found in payroll' });
    }

    const emp = payroll.employees[empIndex];
    emp.amountPaid += amountPaid;
    emp.amountPending -= amountPaid;
    emp.paymentStatus = emp.amountPending <= 0 ? 'paid' : 'partial';

    // Create payment history
    const payment = new db.PaymentHistory({
      payrollId: payroll._id,
      employeeId,
      payrollMonth: payroll.month,
      payrollYear: payroll.year,
      amountPaid,
      paymentType: 'salary',
      paymentDate: new Date(),
      paymentMethod,
      notes
    });

    await payment.save();
    await payroll.save();

    res.json({ 
      success: true, 
      data: { 
        payroll, 
        payment 
      } 
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST: Record payment across oldest pending payrolls for an employee
router.post('/payment/settle-total', auth, async (req, res) => {
  try {
    const { employeeId, amountPaid, paymentMethod, notes, upToMonth, upToYear } = req.body;

    const totalToSettle = toNum(amountPaid);
    if (!employeeId) {
      return res.status(400).json({ success: false, error: 'Employee is required' });
    }
    if (totalToSettle <= 0) {
      return res.status(400).json({ success: false, error: 'Payment amount must be greater than zero' });
    }

    const payrolls = await db.Payroll.find({
      employees: { $elemMatch: { employeeId, amountPending: { $gt: 0 } } }
    }).sort({ year: 1, month: 1, generatedAt: 1, _id: 1 });

    const eligiblePayrolls = payrolls.filter(payroll => {
      if (!upToMonth || !upToYear) return true;
      if (payroll.year < Number(upToYear)) return true;
      return payroll.year === Number(upToYear) && payroll.month <= Number(upToMonth);
    });

    if (!eligiblePayrolls.length) {
      return res.status(404).json({ success: false, error: 'No pending payroll found for this employee' });
    }

    let remaining = totalToSettle;
    const allocations = [];

    for (const payroll of eligiblePayrolls) {
      if (remaining <= 0) break;
      const emp = payroll.employees.find(e => e.employeeId.toString() === employeeId);
      if (!emp) continue;

      const pending = toNum(emp.amountPending);
      if (pending <= 0) continue;

      const applied = Math.min(pending, remaining);
      emp.amountPaid = toNum(emp.amountPaid) + applied;
      emp.amountPending = Math.max(0, pending - applied);
      emp.paymentStatus = emp.amountPending <= 0 ? 'paid' : 'partial';

      const payment = new db.PaymentHistory({
        payrollId: payroll._id,
        employeeId,
        payrollMonth: payroll.month,
        payrollYear: payroll.year,
        amountPaid: applied,
        paymentType: 'salary',
        paymentDate: new Date(),
        paymentMethod,
        notes
      });

      await payment.save();
      await payroll.save();

      allocations.push({
        payrollId: payroll._id,
        payrollMonth: payroll.month,
        payrollYear: payroll.year,
        applied
      });
      remaining -= applied;
    }

    res.json({
      success: true,
      data: {
        requestedAmount: totalToSettle,
        settledAmount: totalToSettle - remaining,
        unallocatedAmount: remaining,
        allocations
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST: Record deduction amount paid back to employee for a specific salary run
router.post('/payment/deduction-return', auth, async (req, res) => {
  try {
    const { payrollId, employeeId, amountPaid, paymentMethod, notes } = req.body;
    const amount = toNum(amountPaid);
    if (!payrollId || !employeeId) {
      return res.status(400).json({ success: false, error: 'Payroll and employee are required' });
    }
    if (amount <= 0) {
      return res.status(400).json({ success: false, error: 'Deduction return amount must be greater than zero' });
    }

    const payroll = await db.Payroll.findById(payrollId);
    if (!payroll) {
      return res.status(404).json({ success: false, error: 'Payroll not found' });
    }

    const emp = payroll.employees.find(e => e.employeeId.toString() === employeeId);
    if (!emp) {
      return res.status(404).json({ success: false, error: 'Employee not found in payroll' });
    }

    emp.deductionPaidBack = toNum(emp.deductionPaidBack) + amount;

    const payment = new db.PaymentHistory({
      payrollId: payroll._id,
      employeeId,
      payrollMonth: payroll.month,
      payrollYear: payroll.year,
      amountPaid: amount,
      paymentType: 'deduction_return',
      paymentDate: new Date(),
      paymentMethod,
      notes
    });

    await payment.save();
    await payroll.save();

    res.json({
      success: true,
      data: {
        payroll,
        payment
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// GET: Payment history for employee
router.get('/payment-history/:employeeId', auth, async (req, res) => {
  try {
    const payments = await db.PaymentHistory.find({ 
      employeeId: req.params.employeeId 
    }).sort({ paymentDate: -1 });

    res.json({ success: true, data: payments });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST: Send payslip PDF to employee WhatsApp number
router.post('/whatsapp-payslip', auth, async (req, res) => {
  try {
    const { employeeId, pdfBase64, fileName, caption } = req.body;

    if (!employeeId) {
      return res.status(400).json({ success: false, error: 'Employee is required' });
    }
    if (!pdfBase64) {
      return res.status(400).json({ success: false, error: 'PDF file is required' });
    }
    if (!isCloudinaryConfigured) {
      return res.status(400).json({
        success: false,
        error: 'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
      });
    }
    if (!isWhatsAppConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp API is not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.',
      });
    }

    const employee = await db.Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    const phone = normalizePhone(employee.phone);
    if (!phone) {
      return res.status(400).json({ success: false, error: 'Employee phone number is missing' });
    }

    const pdfUrl = await uploadPayslipPdf(pdfBase64, fileName || `Payslip_${employee.name}.pdf`);
    const whatsappResponse = await sendWhatsAppDocument({
      to: phone,
      link: pdfUrl,
      fileName: fileName || `Payslip_${employee.name}.pdf`,
      caption: caption || `Salary slip for ${employee.name}`,
    });

    res.json({
      success: true,
      data: {
        employeeId,
        phone,
        pdfUrl,
        whatsappResponse,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
