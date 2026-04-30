<template>
  <div class="page-container">
    <PageHeader :title="t('reports')" sub="Collections, production and expense reports">
      <v-btn variant="outlined" color="grey-darken-1" prepend-icon="mdi-printer" rounded="lg" @click="window.print()">{{ t('print') }}</v-btn>
    </PageHeader>
    <v-tabs v-model="tab" color="primary" class="mb-4">
      <v-tab value="monthly">{{ t('monthlyReport') }}</v-tab>
      <v-tab value="production">{{ t('productionReport') }}</v-tab>
      <v-tab value="expense">{{ t('expenseReport') }}</v-tab>
    </v-tabs>
    <v-row class="mb-4">
      <v-col cols="6" sm="3"><v-text-field v-model="filterFrom" type="date" :label="t('from')" density="compact" /></v-col>
      <v-col cols="6" sm="3"><v-text-field v-model="filterTo" type="date" :label="t('to')" density="compact" /></v-col>
      <v-col v-if="tab==='monthly'" cols="6" sm="3">
        <v-autocomplete v-model="filterCompany" :items="companyStore.items" item-value="_id" item-title="name" :label="t('company')" density="compact" clearable />
      </v-col>
      <v-col cols="6" sm="3">
        <v-btn color="primary" variant="flat" rounded="lg" :loading="loading" prepend-icon="mdi-chart-bar" @click="generate">{{ t('generate') }}</v-btn>
      </v-col>
    </v-row>
    <!-- Monthly Payment Report -->
    <div v-if="tab==='monthly'" id="report-content">
      <v-row class="mb-4">
        <v-col cols="4"><v-card rounded="lg" class="pa-3 text-center" style="background:#E8F5E9"><div style="font-size:11px;color:#2E7D32">Total Received</div><div class="font-weight-bold" style="font-size:20px;color:#2E7D32">{{ fmt(monthlyTotals.total) }}</div></v-card></v-col>
        <v-col cols="4"><v-card rounded="lg" class="pa-3 text-center" style="background:#FFF3E0"><div style="font-size:11px;color:#E65100">Total Deductions</div><div class="font-weight-bold" style="font-size:20px;color:#E65100">{{ fmt(monthlyTotals.deductions) }}</div></v-card></v-col>
        <v-col cols="4"><v-card rounded="lg" class="pa-3 text-center" style="background:#F3E5F5"><div style="font-size:11px;color:#7B1FA2">Net Payable</div><div class="font-weight-bold" style="font-size:20px;color:#7B1FA2">{{ fmt(monthlyTotals.net) }}</div></v-card></v-col>
      </v-row>
      <v-row>
        <v-col cols="12" md="7">
          <v-card rounded="lg" class="at-card mb-4" style="overflow:hidden">
            <div class="px-4 py-3 font-weight-bold" style="border-bottom:1px solid #E0E7EF;font-size:13px;color:#1565C0;text-transform:uppercase;letter-spacing:1px">By Company</div>
            <AgTable :rowData="monthlyByCompany" :columnDefs="monthCompanyCols" height="260px" :pagination="false" />
          </v-card>
        </v-col>
        <v-col cols="12" md="5">
          <v-row>
            <v-col v-for="m in monthlyByMode" :key="m.mode" cols="12">
              <v-card rounded="lg" class="at-card pa-3">
                <div style="font-size:12px;color:#5A6A85">{{ t(m.mode) }}</div>
                <div class="font-weight-bold" style="font-size:18px">{{ fmt(m.amount) }}</div>
                <div style="font-size:11px;color:#5A6A85">{{ m.count }} payments</div>
              </v-card>
            </v-col>
          </v-row>
        </v-col>
      </v-row>
    </div>

    <!-- Production Report -->
    <div v-if="tab==='production'" id="report-content">
      <v-card rounded="lg" class="at-card" style="overflow:hidden">
        <AgTable :rowData="productionData" :columnDefs="productionCols" height="480px" :pagination="false" />
      </v-card>
    </div>

    <!-- Expense Report -->
    <div v-if="tab==='expense'" id="report-content">
      <v-row class="mb-4">
        <v-col v-for="(amt, type) in expenseByType" :key="type" cols="6" sm="4" md="3">
          <v-card rounded="lg" class="at-card pa-3"><div style="font-size:11px;color:#5A6A85">{{ t(type) }}</div><div class="font-weight-bold" style="font-size:18px;color:#E65100">{{ fmt(amt) }}</div></v-card>
        </v-col>
      </v-row>
      <v-card rounded="lg" class="at-card" style="overflow:hidden">
        <AgTable :rowData="expenseData" :columnDefs="expenseCols" height="400px" :pagination="false" />
      </v-card>
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCompanyStore } from '@/stores/index'
import { useUtils } from '@/composables/useUtils'
import PageHeader from '@/components/common/PageHeader.vue'
import AgTable from '@/components/common/AgTable.vue'
import api from '@/plugins/axios'
const { t } = useI18n(); const { fmt, fmtDate, today, monthStart } = useUtils()
const companyStore = useCompanyStore()
const tab=ref('monthly'); const loading=ref(false); const filterFrom=ref(monthStart()); const filterTo=ref(today()); const filterCompany=ref(null)
const monthlyByCompany=ref([]); const monthlyByMode=ref([]); const productionData=ref([]); const expenseData=ref([]); const expenseByType=ref({})
const monthlyTotals=computed(()=>({total:monthlyByCompany.value.reduce((s,r)=>s+(r.received||0),0),deductions:monthlyByCompany.value.reduce((s,r)=>s+(r.deduction||0),0),net:monthlyByCompany.value.reduce((s,r)=>s+((r.received||0)-(r.deduction||0)),0)}))
const monthCompanyCols=[
  {field:'company',headerName:t('company'),flex:1.5},
  {field:'orders',headerName:t('orders'),flex:0.7},
  {field:'received',headerName:'Received',flex:1,valueFormatter:p=>'₹'+Number(p.value||0).toLocaleString('en-IN'),cellStyle:{color:'#2E7D32',fontWeight:700}},
  {field:'deduction',headerName:t('deductionPct'),flex:1,valueFormatter:p=>'₹'+Number(p.value||0).toLocaleString('en-IN'),cellStyle:{color:'#C62828'}}
]
const productionCols=[
  {field:'orderName',headerName:t('orders'),flex:1.5},
  {field:'morning',headerName:t('morningShift'),flex:1,valueFormatter:p=>Number(p.value||0).toLocaleString('en-IN')+' m'},
  {field:'night',headerName:t('nightShift'),flex:1,valueFormatter:p=>Number(p.value||0).toLocaleString('en-IN')+' m'},
  {field:'totalMeter',headerName:'Total',flex:1,valueFormatter:p=>Number(p.value||0).toLocaleString('en-IN')+' m',cellStyle:{fontWeight:700,color:'#1565C0'}}
]
const expenseCols=[
  {field:'type',headerName:t('expenseType'),flex:1.5,cellRenderer:p=>`<span class="chip-pending" style="padding:2px 10px;border-radius:20px;font-size:11px">${t(p.value)}</span>`},
  {field:'amount',headerName:t('amount'),flex:1,valueFormatter:p=>'₹'+Number(p.value||0).toLocaleString('en-IN'),cellStyle:{color:'#E65100',fontWeight:700}},
  {field:'date',headerName:t('date'),flex:1,valueFormatter:p=>fmtDate(p.value)},
  {field:'notes',headerName:t('notes'),flex:1.5}
]
async function generate(){
  loading.value=true
  const p={from:filterFrom.value,to:filterTo.value}
  try {
    if(tab.value==='monthly'){if(filterCompany.value)p.companyId=filterCompany.value;const[c,m]=await Promise.all([api.get('/reports/monthly-payment-by-company',{params:p}),api.get('/reports/monthly-payment-by-mode',{params:p})]);monthlyByCompany.value=c.data;monthlyByMode.value=m.data}
    else if(tab.value==='production'){const r=await api.get('/reports/production',{params:p});productionData.value=r.data}
    else if(tab.value==='expense'){const r=await api.get('/reports/expense',{params:p});expenseData.value=r.data.entries||r.data;expenseByType.value=r.data.byType||{}}
  } catch(e){console.error(e)} finally{loading.value=false}
}
onMounted(()=>{companyStore.fetch();generate()})
</script>
<style>
@media print { .at-sidebar,.at-appbar,.v-tabs,.page-header .d-flex { display:none !important } }
</style>
