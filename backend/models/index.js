const mongoose = require('mongoose')
const { Schema } = mongoose

// ── User ──────────────────────────────────────────────────────────────────────
const userSchema = new Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role:     { type: String, enum: ['admin', 'user'], default: 'user' },
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
  ratePerMeter:  { type: Number, default: 0 },
  deductionPct:  { type: Number, default: 20 },
  totalReceived: { type: Number, default: 0 },
  status:            { type: String, enum: ['active', 'completed'], default: 'active' },
  sampleImage:       { type: String, default: '' },
  manuallyCompleted: { type: Boolean, default: false },
}, { timestamps: true })

// Auto status — skip if manually completed by user
orderSchema.pre('save', function (next) {
  if (!this.manuallyCompleted) {
    this.status = (this.producedMeter >= this.expectedMeter && this.expectedMeter > 0) ? 'completed' : 'active'
  }
  next()
})

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

// ── Employee (for Payroll) ────────────────────────────────────────────────────
const employeeSchema = new Schema({
  name:                  { type: String, required: true, trim: true },
  phone:                 { type: String, trim: true, default: '' },
  employeeId:            { type: String, default: () => `EMP-${Date.now()}-${Math.floor(Math.random() * 1000)}` },
  dailyWage:             { type: Number, default: 0, min: 0 },
  deductionPercentage:   { type: Number, required: true, min: 0, max: 100 },
  status:                { type: String, enum: ['active', 'inactive'], default: 'active' },
  createdAt:             { type: Date, default: Date.now },
}, { timestamps: true })

// ── Payroll ───────────────────────────────────────────────────────────────────
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
    totalWages:          { type: Number },
    deductionPercentage: { type: Number },
    deductionAmount:     { type: Number },
    netSalary:           { type: Number },
    paymentStatus:       { type: String, enum: ['pending', 'partial', 'paid'], default: 'pending' },
    amountPaid:          { type: Number, default: 0 }, // salary paid
    amountPending:       { type: Number },             // salary pending
    deductionPaidBack:   { type: Number, default: 0 },
    notes:               { type: String, default: '' }
  }],
  generatedAt: { type: Date, default: Date.now },
  generatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true })

// Multiple payroll runs are allowed in the same month/year.
payrollSchema.index({ month: 1, year: 1, generatedAt: -1 })

// ── Payment History ──────────────────────────────────────────────────────────
const paymentHistorySchema = new Schema({
  payrollId:      { type: Schema.Types.ObjectId, ref: 'Payroll', required: true },
  employeeId:     { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  payrollMonth:   { type: Number },
  payrollYear:    { type: Number },
  amountPaid:     { type: Number, required: true, min: 0 },
  paymentType:    { type: String, enum: ['salary', 'deduction_return'], default: 'salary' },
  paymentDate:    { type: Date, default: Date.now },
  paymentMethod:  { type: String, enum: ['cash', 'transfer', 'check', 'other'], default: 'cash' },
  notes:          { type: String, default: '' }
}, { timestamps: true })

module.exports = {
  User:              mongoose.model('User',              userSchema),
  Company:           mongoose.model('Company',           companySchema),
  Order:             mongoose.model('Order',             orderSchema),
  Nool:              mongoose.model('Nool',              noolSchema),
  Production:        mongoose.model('Production',        productionSchema),
  MachineSetting:    mongoose.model('MachineSetting',    machineSettingSchema),
  Expense:           mongoose.model('Expense',           expenseSchema),
  Payment:           mongoose.model('Payment',           paymentSchema),
  Employee:          mongoose.model('Employee',          employeeSchema),
  Payroll:           mongoose.model('Payroll',           payrollSchema),
  PaymentHistory:    mongoose.model('PaymentHistory',    paymentHistorySchema),
}
