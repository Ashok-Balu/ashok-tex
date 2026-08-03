const mongoose = require('mongoose')
const { Schema } = mongoose

// ── User ──────────────────────────────────────────────────────────────────────
const userSchema = new Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role:     { type: String, enum: ['admin', 'user'], default: 'user' },
}, { timestamps: true })

// ── RefreshToken ──────────────────────────────────────────────────────────────────────────────
const refreshTokenSchema = new Schema({
  tokenHash: { type: String, required: true, index: true },
  user:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true })

// ── Company ───────────────────────────────────────────────────────────────────
const companySchema = new Schema({
  name:             { type: String, required: true, trim: true },
  defaultDeduction: { type: Number, default: 3, min: 0, max: 100 },
}, { timestamps: true })

// ── Order ─────────────────────────────────────────────────────────────────────
const orderSchema = new Schema({
  orderName:     { type: String, required: true, trim: true },
  company:       { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  reedPick:      { type: String, trim: true, default: '' },
  size:          { type: String, trim: true, default: '' },
  startDate:     { type: Date, default: null },
  endDate:       { type: Date, default: null },
  expectedMeter: { type: Number, default: 0 },
  producedMeter: { type: Number, default: 0 },
  rejectedMeter: { type: Number, default: 0 },
  acceptedMeter: { type: Number, default: 0 },
  lossMeter:     { type: Number, default: 0 },
  lossAmount:    { type: Number, default: 0 },
  ratePerMeter:  { type: Number, default: 0 },
  deductionPct:  { type: Number, default: 20 },
  totalReceived: { type: Number, default: 0 },
  averageWeightPerMeter: { type: Number, default: 0 },
  yarnShortageEnteredAmount: { type: Number, default: 0 },
  status:            { type: String, enum: ['active', 'completed'], default: 'active' },
  sampleImage:       { type: String, default: '' },
  manuallyCompleted: { type: Boolean, default: false },
  productionClosed:  { type: Boolean, default: false },
  financialClosed:   { type: Boolean, default: false },
  archived:          { type: Boolean, default: false },
  archivedAt:        { type: Date, default: null },
}, { timestamps: true })

// Auto status — skip if manually completed by user
orderSchema.pre('save', function (next) {
  if (!this.manuallyCompleted) {
    this.status = (this.producedMeter >= this.expectedMeter && this.expectedMeter > 0) ? 'completed' : 'active'
  }
  next()
})
// Indexes for fast lookups
orderSchema.index({ status: 1 })
orderSchema.index({ company: 1, status: 1 })
orderSchema.index({ createdAt: -1 })
orderSchema.index({ archived: 1, updatedAt: -1 })
orderSchema.index({ company: 1, archived: 1, status: 1 })

// ── Nool Receipt ──────────────────────────────────────────────────────────────
const noolSchema = new Schema({
  order:   { type: Schema.Types.ObjectId, ref: 'Order', required: true },

  dcNumber: { type: String, trim: true, default: '' },
  yarnCount: { type: String, trim: true, default: '' },
  colour: { type: String, trim: true, default: '' },
  entryType: { type: String, enum: ['receipt', 'used', 'return'], default: 'receipt' },
  packageType: { type: String, enum: ['cone_bag', 'nool_bundle'], default: 'cone_bag' },
  noOfPackages: { type: Number, default: 0, min: 0 },
  usagePurpose: { type: String, trim: true, default: 'other' },
  yarnType: { type: String, trim: true, default: '' },
  batchNo: { type: String, trim: true },
  qty:     { type: Number, required: true, min: 0 },
  date:    { type: Date, default: Date.now },
  notes:   { type: String },
}, { timestamps: true })
noolSchema.index({ order: 1, date: -1 })

// ── Production Entry ──────────────────────────────────────────────────────────
const productionSchema = new Schema({
  order:     { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  machineNo: { type: Number, default: 1, min: 1 },
  shift:     { type: String, enum: ['morning', 'night', 'day'], default: 'day' },
  dcNumber:  { type: String, trim: true, default: '' },
  meter:     { type: Number, required: true, min: 0 },
  weightKg:  { type: Number, default: null, min: 0 },
  date:      { type: Date, default: Date.now },
  notes:     { type: String, default: '' },
}, { timestamps: true })
productionSchema.index({ order: 1, date: -1 })
productionSchema.index({ date: -1 })

// ── Rejection Entry ──────────────────────────────────────────────────────────
const rejectionSchema = new Schema({
  order:       { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  date:        { type: Date, default: Date.now },
  rejectedQty: { type: Number, required: true, min: 0 },
  reason:      { type: String, trim: true, default: '' },
  notes:       { type: String, trim: true, default: '' },
}, { timestamps: true })
rejectionSchema.index({ order: 1, date: -1 })

// ── Machine Setting ───────────────────────────────────────────────────────────
const machineSettingSchema = new Schema({
  count: { type: Number, default: 16 },
}, { timestamps: true })

// ── Expense ───────────────────────────────────────────────────────────────────
const expenseSchema = new Schema({
  type: {
    type: String,
    enum: ['diesel_auto','auto_repair','car_diesel','car_repair','electricity','machine_spare','others'],
    required: true,
  },
  amount: { type: Number, required: true, min: 0 },
  customType: { type: String, trim: true, default: '' },
  date:   { type: Date, default: Date.now },
  notes:  { type: String },
}, { timestamps: true })
expenseSchema.index({ date: -1 })

// ── Payment ───────────────────────────────────────────────────────────────────
const paymentSchema = new Schema({
  company:  { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  order:    { type: Schema.Types.ObjectId, ref: 'Order', default: null },
  transactionType: { type: String, enum: ['payment', 'deduction'], default: 'payment' },
  amount:   { type: Number, required: true, min: 0 },
  mode:     { type: String, enum: ['cash','cheque','bank'], required: true },
  chequeNo: { type: String },
  bankRef:  { type: String },
  date:     { type: Date, default: Date.now },
  notes:    { type: String },
}, { timestamps: true })
paymentSchema.index({ company: 1, date: -1 })
paymentSchema.index({ date: -1 })
paymentSchema.index({ transactionType: 1, date: -1 })
// Compound index for dashboard aggregations that group by company filtered by transactionType
paymentSchema.index({ transactionType: 1, company: 1, amount: 1 })

// ── Payment Allocation (company receipt -> order split) ────────────────────
const paymentAllocationSchema = new Schema({
  company:  { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  receipt:  { type: Schema.Types.ObjectId, ref: 'Payment', required: true },
  order:    { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  amount:   { type: Number, required: true, min: 0 },
  date:     { type: Date, default: Date.now },
  notes:    { type: String, trim: true, default: '' },
}, { timestamps: true })
paymentAllocationSchema.index({ company: 1, date: -1 })
paymentAllocationSchema.index({ receipt: 1, order: 1 })
paymentAllocationSchema.index({ order: 1, date: -1 })

// ── Employee (for Payroll) ────────────────────────────────────────────────────
const employeeSchema = new Schema({
  name:                    { type: String, required: true, trim: true },
  phone:                   { type: String, trim: true, default: '' },
  currentDefaultDailyWage: { type: Number, default: 0, min: 0 },
  deductionType:           { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
  deductionValue:          { type: Number, default: 0, min: 0 },
  status:                  { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true })
employeeSchema.index({ status: 1 })

// ── Salary Run ───────────────────────────────────────────────────────────────
const salaryRunSchema = new Schema({
  type:            { type: String, enum: ['by_period', 'by_employee'], required: true },
  month:           { type: Number, required: true, min: 1, max: 12 },
  year:            { type: Number, required: true },
  periodStartDate: { type: Date, required: true },
  periodEndDate:   { type: Date, required: true },
  status:          { type: String, enum: ['draft', 'completed', 'locked'], default: 'draft' },
  createdBy:       { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })
salaryRunSchema.index({ month: 1, year: 1 })
salaryRunSchema.index({ periodStartDate: 1, periodEndDate: 1 })

// ── Salary Run Employee (snapshot) ───────────────────────────────────────────
const salaryRunEmployeeSchema = new Schema({
  salaryRunId:          { type: Schema.Types.ObjectId, ref: 'SalaryRun', required: true, index: true },
  employeeId:           { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  employeeName:         { type: String, required: true },
  defaultDailyWageUsed: { type: Number, default: 0, min: 0 },
  deductionType:        { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
  deductionValue:       { type: Number, default: 0, min: 0 },
  market:               { type: Number, default: 0, min: 0 },
  advance:              { type: Number, default: 0, min: 0 },
  daysWorked:           { type: Number, default: 0, min: 0 },
  grossWages:           { type: Number, default: 0, min: 0 },
  deductionAmount:      { type: Number, default: 0, min: 0 },
  finalSalary:          { type: Number, default: 0, min: 0 },
  dailyEntries: [{
    date:   { type: Date, required: true },
    worked: { type: Boolean, default: true },
    wage:   { type: Number, default: 0, min: 0 },
  }],
}, { timestamps: true })
salaryRunEmployeeSchema.index({ salaryRunId: 1, employeeId: 1 }, { unique: true })

// ── Payroll (legacy — kept for backward compatibility) ───────────────────────
const payrollSchema = new Schema({
  month:       { type: Number, required: true, min: 1, max: 12 },
  year:        { type: Number, required: true },
  periodStart: { type: Date, required: true },
  periodEnd:   { type: Date, required: true },
  runTitle:    { type: String, default: '' },
  employees: [{
    employeeId:          { type: Schema.Types.ObjectId, ref: 'Employee' },
    name:                { type: String },
    daysWorked:          { type: Number, default: 0 },
    dailyWage:           { type: Number },
    totalWages:          { type: Number, default: 0 },
    deductionPercentage: { type: Number },
    deductionAmount:     { type: Number, default: 0 },
    netSalary:           { type: Number, default: 0 },
    marketAmount:        { type: Number, default: 0 },
    advanceAmount:       { type: Number, default: 0 },
    finalSalary:         { type: Number, default: 0 },
    paymentStatus:       { type: String, enum: ['pending', 'partial', 'paid'], default: 'pending' },
    amountPaid:          { type: Number, default: 0 },
    amountPending:       { type: Number },
    deductionPaidBack:   { type: Number, default: 0 },
    notes:               { type: String, default: '' },
    dailyEntries: [{
      date:           { type: Date, required: true },
      machineCount:   { type: Number, default: 0, min: 0 },
      wage:           { type: Number, default: 0, min: 0 },
      wageSource:     { type: String, enum: ['master', 'manual'], default: 'master' },
      masterConfigId: { type: Schema.Types.ObjectId, ref: 'MachineWageMaster', default: null },
    }],
  }],
  generatedAt: { type: Date, default: Date.now },
  generatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true })
payrollSchema.index({ month: 1, year: 1, generatedAt: -1 })

// ── Machine Wage Master ──────────────────────────────────────────────────────
const machineWageMasterSchema = new Schema({
  employeeId:    { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  fromDate:      { type: Date, required: true, index: true },
  toDate:        { type: Date, default: null, index: true },   // kept for legacy records; no longer required
  machineRanges: [{
    minMachineCount: { type: Number, min: 0, default: 0 },
    maxMachineCount: { type: Number, min: 0, default: 0 },
    wageAmount:      { type: Number, min: 0, default: 0 },
  }],
  machine3Wage:  { type: Number, default: 0, min: 0 },
  machine4Wage:  { type: Number, default: 0, min: 0 },
  machine5Wage:  { type: Number, default: 0, min: 0 },
  machine6Wage:  { type: Number, default: 0, min: 0 },
  machine7Wage:  { type: Number, default: 0, min: 0 },
  machine8Wage:  { type: Number, default: 0, min: 0 },
  machine9Wage:  { type: Number, default: 0, min: 0 },
  machine10Wage: { type: Number, default: 0, min: 0 },
  machine11Wage: { type: Number, default: 0, min: 0 },
  machine12Wage: { type: Number, default: 0, min: 0 },
  machine13Wage: { type: Number, default: 0, min: 0 },
  machine14Wage: { type: Number, default: 0, min: 0 },
  machine15Wage: { type: Number, default: 0, min: 0 },
  isActive:      { type: Boolean, default: true, index: true },
  createdBy:     { type: Schema.Types.ObjectId, ref: 'User', default: null },
  createdDate:   { type: Date, default: Date.now },
  modifiedBy:    { type: Schema.Types.ObjectId, ref: 'User', default: null },
  modifiedDate:  { type: Date, default: Date.now },
}, { timestamps: true })

machineWageMasterSchema.index({ fromDate: 1, toDate: 1 })
machineWageMasterSchema.index(
  { employeeId: 1, fromDate: 1 },
  { unique: true, partialFilterExpression: { employeeId: { $exists: true } } }
)
machineWageMasterSchema.index({ employeeId: 1, isActive: 1, fromDate: -1 })

machineWageMasterSchema.pre('save', function (next) {
  this.modifiedDate = new Date()
  if (!this.createdDate) this.createdDate = new Date()
  next()
})

// ── Payment History ──────────────────────────────────────────────────────────
const paymentHistorySchema = new Schema({
  payrollId:      { type: Schema.Types.ObjectId, ref: 'Payroll', default: null },
  employeeId:     { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  payrollMonth:   { type: Number },
  payrollYear:    { type: Number },
  amountPaid:     { type: Number, required: true, min: 0 },
  paymentType:    { type: String, enum: ['salary', 'deduction_return'], default: 'salary' },
  paymentDate:    { type: Date, default: Date.now },
  paymentMethod:  { type: String, enum: ['cash', 'transfer', 'check', 'other'], default: 'cash' },
  notes:          { type: String, default: '' }
}, { timestamps: true })
paymentHistorySchema.index({ payrollId: 1, employeeId: 1 })
paymentHistorySchema.index({ employeeId: 1, paymentDate: -1 })

// ── Financial Intelligence Profile ──────────────────────────────────────────
const financialProfileSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  monthlyIncome: {
    powerloomIncome:    { type: Number, default: 0, min: 0 },
    ashokContribution:  { type: Number, default: 0, min: 0 },
    rentalIncome:       { type: Number, default: 0, min: 0 },
  },
  weeklyExpenses: {
    workerWages:        { type: Number, default: 0, min: 0 },
    familyExpenses:     { type: Number, default: 0, min: 0 },
  },
  monthlyExpenses: {
    workerWages:        { type: Number, default: 0, min: 0 },
    familyExpenses:     { type: Number, default: 0, min: 0 },
    otherMonthlyExpenses: { type: Number, default: 0, min: 0 },
    // Legacy keys retained so old records remain readable.
    electricity:        { type: Number, default: 0, min: 0 },
    maintenance:        { type: Number, default: 0, min: 0 },
  },
  // User-controlled debt ordering used by the priority engine.
  priorityOrder: [{ type: String, trim: true }],
}, { timestamps: true })

// ── Financial Intelligence Debt ─────────────────────────────────────────────
const financialDebtSchema = new Schema({
  user:                   { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name:                   { type: String, required: true, trim: true },
  debtType: {
    type: String,
    required: true,
    enum: [
      'current_bill',
      'vehicle_loan',
      'business_loan',
      'friends_family_loan',
      'jewelry_loan',
      'chit_fund',
      // Legacy values kept for backward compatibility.
      'auto_loan',
      'od_account',
      'rani_loan',
      'chit',
    ],
  },
  originalAmount:         { type: Number, default: 0, min: 0 },
  currentBalance:         { type: Number, default: 0, min: 0 },
  monthlyAmount:          { type: Number, default: 0, min: 0 },
  emi:                    { type: Number, default: 0, min: 0 },
  interestComponent:      { type: Number, default: 0, min: 0 },
  principalComponent:     { type: Number, default: 0, min: 0 },
  interestRate:           { type: Number, default: 0, min: 0 },
  currentMonthlyInterest: { type: Number, default: 0, min: 0 },
  monthlyInterest:        { type: Number, default: 0, min: 0 },
  chitTotalValue:         { type: Number, default: 0, min: 0 },
  totalInstallments:      { type: Number, default: 0, min: 0 },
  monthlyInstallment:     { type: Number, default: 0, min: 0 },
  remainingMonths:        { type: Number, default: 0, min: 0 },
  status:                 { type: String, enum: ['active', 'closed'], default: 'active' },
  closedAt:               { type: Date, default: null },
  notes:                  { type: String, default: '', trim: true },
}, { timestamps: true })
financialDebtSchema.index({ user: 1, name: 1 }, { unique: true })
financialDebtSchema.index({ user: 1, status: 1 })

// ── Financial Intelligence Debt Payment ─────────────────────────────────────
const financialDebtPaymentSchema = new Schema({
  user:          { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  debt:          { type: Schema.Types.ObjectId, ref: 'FinancialDebt', required: true, index: true },
  debtType:      { type: String, default: '' },
  debtNameSnapshot: { type: String, default: '' },
  amountPaid:    { type: Number, required: true, min: 0 },
  interestPaid:  { type: Number, default: 0, min: 0 },
  principalPaid: { type: Number, default: 0, min: 0 },
  paymentType: { type: String, default: 'interest_only' },
  emiAmount:     { type: Number, default: 0, min: 0 },
  extraPaymentAmount: { type: Number, default: 0, min: 0 },
  additionalCharges: { type: Number, default: 0, min: 0 },
  monthlyInterestAtPayment: { type: Number, default: 0, min: 0 },
  nextExpectedInterest: { type: Number, default: 0, min: 0 },
  currentBalanceBeforePayment: { type: Number, default: 0, min: 0 },
  currentBalanceAfterPayment: { type: Number, default: 0, min: 0 },
  installmentsRemainingAfterPayment: { type: Number, default: 0, min: 0 },
  sourceOfFunds: { type: String, enum: ['surplus', 'bonus', 'other_income'], default: 'other_income' },
  remainingBalanceAfterPayment: { type: Number, default: null, min: 0 },
  month:         { type: Number, min: 1, max: 12 },
  year:          { type: Number },
  isExtra:       { type: Boolean, default: false },
  date:          { type: Date, default: Date.now },
  notes:         { type: String, default: '', trim: true },
}, { timestamps: true })
financialDebtPaymentSchema.index({ user: 1, date: -1 })
financialDebtPaymentSchema.index({ debt: 1, date: -1 })
financialDebtPaymentSchema.index({ user: 1, year: 1, month: 1 })

// ── Financial Intelligence Monthly Entry ────────────────────────────────────
const financialMonthlyTransactionSchema = new Schema({
  monthlyIncome: {
    powerloomIncome:    { type: Number, default: 0, min: 0 },
    ashokContribution:  { type: Number, default: 0, min: 0 },
    rentalIncome:       { type: Number, default: 0, min: 0 },
  },
  monthlyExpenses: {
    workerWages:          { type: Number, default: 0, min: 0 },
    familyExpenses:       { type: Number, default: 0, min: 0 },
    otherMonthlyExpenses: { type: Number, default: 0, min: 0 },
  },
  label: { type: String, default: '' },
  notes: { type: String, default: '' },
}, { _id: true, timestamps: true })

const financialMonthlyEntrySchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  year: { type: Number, required: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  // Individual transaction records — aggregated into the fields below
  transactions: { type: [financialMonthlyTransactionSchema], default: [] },
  // Aggregated totals (sum of all transactions)
  monthlyIncome: {
    powerloomIncome:    { type: Number, default: 0, min: 0 },
    ashokContribution:  { type: Number, default: 0, min: 0 },
    rentalIncome:       { type: Number, default: 0, min: 0 },
  },
  weeklyExpenses: {
    workerWages:        { type: Number, default: 0, min: 0 },
    familyExpenses:     { type: Number, default: 0, min: 0 },
  },
  monthlyExpenses: {
    workerWages:        { type: Number, default: 0, min: 0 },
    familyExpenses:     { type: Number, default: 0, min: 0 },
    otherMonthlyExpenses: { type: Number, default: 0, min: 0 },
    // Legacy keys retained so old records remain readable.
    electricity:        { type: Number, default: 0, min: 0 },
    maintenance:        { type: Number, default: 0, min: 0 },
  },
  // Stored at month save-time and should not be auto-mutated except by explicit update.
  computedSurplus: { type: Number, default: 0 },
  // Reduced by debt payments recorded for this month.
  availableSurplus: { type: Number, default: 0 },
  openingDebtBalance: { type: Number, default: 0, min: 0 },
  closingDebtBalance: { type: Number, default: 0, min: 0 },
  totalDebtPayments: { type: Number, default: 0, min: 0 },
  totalInterestPaid: { type: Number, default: 0, min: 0 },
  totalPrincipalReduced: { type: Number, default: 0, min: 0 },
  totalAdditionalCharges: { type: Number, default: 0, min: 0 },
  totalSurplusUsed: { type: Number, default: 0, min: 0 },
  debtReduction: { type: Number, default: 0, min: 0 },
}, { timestamps: true })
financialMonthlyEntrySchema.index({ user: 1, year: 1, month: 1 }, { unique: true })

module.exports = {
  User:              mongoose.model('User',              userSchema),
  RefreshToken:      mongoose.model('RefreshToken',      refreshTokenSchema),
  Company:           mongoose.model('Company',           companySchema),
  Order:             mongoose.model('Order',             orderSchema),
  Nool:              mongoose.model('Nool',              noolSchema),
  Production:        mongoose.model('Production',        productionSchema),
  Rejection:         mongoose.model('Rejection',         rejectionSchema),
  MachineSetting:    mongoose.model('MachineSetting',    machineSettingSchema),
  Expense:           mongoose.model('Expense',           expenseSchema),
  Payment:           mongoose.model('Payment',           paymentSchema),
  PaymentAllocation: mongoose.model('PaymentAllocation', paymentAllocationSchema),
  Employee:          mongoose.model('Employee',          employeeSchema),
  SalaryRun:         mongoose.model('SalaryRun',         salaryRunSchema),
  SalaryRunEmployee: mongoose.model('SalaryRunEmployee', salaryRunEmployeeSchema),
  Payroll:           mongoose.model('Payroll',           payrollSchema),
  MachineWageMaster: mongoose.model('MachineWageMaster', machineWageMasterSchema),
  PaymentHistory:    mongoose.model('PaymentHistory',    paymentHistorySchema),
  FinancialProfile:  mongoose.model('FinancialProfile',  financialProfileSchema),
  FinancialDebt:     mongoose.model('FinancialDebt',     financialDebtSchema),
  FinancialDebtPayment: mongoose.model('FinancialDebtPayment', financialDebtPaymentSchema),
  FinancialMonthlyEntry: mongoose.model('FinancialMonthlyEntry', financialMonthlyEntrySchema),
}
