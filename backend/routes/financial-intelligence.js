const router = require('express').Router()
const ah = require('express-async-handler')
const auth = require('../middleware/auth')
const ctrl = require('../controllers/financialIntelligenceController')

router.use(auth)

router.get('/dashboard', ah(ctrl.getDashboard))
router.get('/profile', ah(ctrl.getProfile))
router.put('/profile', ah(ctrl.updateProfile))
router.get('/monthly-entry', ah(ctrl.getMonthlyEntry))
router.put('/monthly-entry', ah(ctrl.updateMonthlyEntry))
router.delete('/monthly-entry', ah(ctrl.deleteMonthlyEntry))
router.get('/monthly-entries', ah(ctrl.listMonthlyEntries))

router.get('/debts', ah(ctrl.listDebts))
router.post('/debts', ah(ctrl.createDebt))
router.get('/debts/:id', ah(ctrl.getDebtDetail))
router.put('/debts/:id', ah(ctrl.updateDebt))
router.delete('/debts/:id', ah(ctrl.deleteDebt))

router.post('/payments', ah(ctrl.createPayment))
router.put('/payments/:id', ah(ctrl.updatePayment))
router.delete('/payments/:id', ah(ctrl.deletePayment))
router.get('/reports', ah(ctrl.getReports))
router.post('/ai-insights', ah(ctrl.generateAIInsights))

module.exports = router
