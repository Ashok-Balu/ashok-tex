<template>
  <div class="at-grid-shell" :style="{ height, width: '100%' }">
    <div class="at-grid-body">
      <table class="at-grid-table">
        <colgroup>
          <col
            v-for="(col, index) in effectiveColumnDefs"
            :key="(col.field || col.headerName || index) + '-width'"
            :style="getColumnWidthStyle(col)"
          >
        </colgroup>
        <thead>
          <tr>
            <th
              v-for="(col, index) in effectiveColumnDefs"
              :key="col.field || col.headerName || index"
              :class="{ sortable: col.sortable !== false }"
              @click="toggleSort(col, index)"
            >
              <div class="at-grid-th-content">
                <span>{{ col.headerName || toTitle(col.field || `col-${index}`) }}</span>
                <span v-if="sortKey === getColumnKey(col, index)" class="sort-indicator">
                  {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
              </div>
              <button
                class="at-grid-resizer"
                type="button"
                aria-label="Resize column"
                @mousedown="startResize(col, index, $event)"
              />
            </th>
          </tr>
        </thead>
        <tbody v-if="pagedRows.length || footerRows.length">
          <tr v-for="(row, rowIndex) in pagedRows" :key="row._id || rowIndex">
            <td
              v-for="(col, colIndex) in effectiveColumnDefs"
              :key="(col.field || col.headerName || colIndex) + '-' + rowIndex"
              :class="getCellClass(col)"
              :style="getCellStyle(col, row)"
              @click="handleCellClick(col, row, $event)"
            >
              <div
                v-if="hasHtmlRenderer(col) && !isFooterRow(row)"
                v-html="getRenderedHtml(col, row)"
              />
              <span v-else>{{ getDisplayValue(col, row) }}</span>
            </td>
          </tr>

          <tr
            v-for="(row, rowIndex) in footerRows"
            :key="row._id || `footer-${rowIndex}`"
            class="at-grid-footer-row"
          >
            <td
              v-for="(col, colIndex) in effectiveColumnDefs"
              :key="(col.field || col.headerName || colIndex) + '-footer-' + rowIndex"
              :class="getCellClass(col)"
              :style="getCellStyle(col, row)"
            >
              <span>{{ getDisplayValue(col, row) }}</span>
            </td>
          </tr>
        </tbody>

      </table>

      <div v-if="!pagedRows.length" class="at-grid-empty">
        <div class="at-grid-empty-icon">📭</div>
        <div>{{ noRowsText }}</div>
      </div>
    </div>

    <div v-if="pagination" class="at-grid-footer">
      <div class="at-grid-footer-left">
        <span>Page Size:</span>
        <select v-model.number="internalPageSize" class="at-grid-select">
          <option v-for="size in pageSizeSelector" :key="size" :value="size">{{ size }}</option>
        </select>
      </div>
      <div class="at-grid-footer-center">{{ pageStart }} to {{ pageEnd }} of {{ filteredRows.length }}</div>
      <div class="at-grid-footer-right">
        <button class="at-grid-nav" :disabled="currentPage === 1" @click="currentPage = 1">|&lt;</button>
        <button class="at-grid-nav" :disabled="currentPage === 1" @click="currentPage -= 1">&lt;</button>
        <span>Page {{ currentPage }} of {{ totalPages }}</span>
        <button class="at-grid-nav" :disabled="currentPage === totalPages" @click="currentPage += 1">&gt;</button>
        <button class="at-grid-nav" :disabled="currentPage === totalPages" @click="currentPage = totalPages">&gt;|</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'

const props = defineProps({
  rowData:     { type: Array,  default: () => [] },
  columnDefs:  { type: Array,  default: () => [] },
  footerRows:  { type: Array,  default: () => [] },
  height:      { type: String, default: '450px' },
  pagination:  { type: Boolean, default: true },
  pageSize:    { type: Number,  default: 15 },
  quickFilter: { type: String,  default: '' },
  noRowsText:  { type: String,  default: 'No data available' },
})

const currentPage = ref(1)
const internalPageSize = ref(props.pageSize)
const sortKey = ref('')
const sortDirection = ref('asc')
const columnWidths = ref({})
let resizeState = null

const pageSizeSelector = computed(() => {
  const options = [10, 25, 50, 100, Number(props.pageSize || 0), Number(internalPageSize.value || 0)]
    .filter(n => Number.isFinite(n) && n > 0)
  return [...new Set(options)].sort((a, b) => a - b)
})

const effectiveColumnDefs = computed(() => {
  if (Array.isArray(props.columnDefs) && props.columnDefs.length) return props.columnDefs

  const first = Array.isArray(props.rowData) ? props.rowData[0] : null
  if (!first || typeof first !== 'object') return []

  return Object.keys(first)
    .filter(k => !['_id', '__v'].includes(k))
    .map(k => ({ field: k, headerName: toTitle(k) }))
})

const filteredRows = computed(() => {
  const term = String(props.quickFilter || '').trim().toLowerCase()
  if (!term) return props.rowData

  return props.rowData.filter(row =>
    effectiveColumnDefs.value.some(col => String(getDisplayValue(col, row)).toLowerCase().includes(term))
  )
})

const sortedRows = computed(() => {
  const rows = [...filteredRows.value]
  if (!sortKey.value) return rows

  const col = effectiveColumnDefs.value.find((c, i) => getColumnKey(c, i) === sortKey.value)
  if (!col) return rows

  rows.sort((a, b) => compareValues(getSortValue(col, a), getSortValue(col, b), sortDirection.value))
  return rows
})

const totalPages = computed(() => Math.max(1, Math.ceil(sortedRows.value.length / internalPageSize.value)))
const pagedRows = computed(() => {
  if (!props.pagination) return sortedRows.value
  const start = (currentPage.value - 1) * internalPageSize.value
  return sortedRows.value.slice(start, start + internalPageSize.value)
})

const pageStart = computed(() => (filteredRows.value.length ? ((currentPage.value - 1) * internalPageSize.value) + 1 : 0))
const pageEnd = computed(() => Math.min(currentPage.value * internalPageSize.value, filteredRows.value.length))

watch(() => props.pageSize, value => { if (value) internalPageSize.value = value })
watch(filteredRows, () => {
  if (currentPage.value > totalPages.value) currentPage.value = totalPages.value
})
watch(internalPageSize, () => {
  currentPage.value = 1
})

function toggleSort(col, index) {
  if (col.sortable === false) return
  const key = getColumnKey(col, index)
  if (sortKey.value === key) sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  else {
    sortKey.value = key
    sortDirection.value = 'asc'
  }
}

function getColumnKey(col, index) {
  return col.field || col.headerName || `col-${index}`
}

function getRawValue(col, row) {
  if (typeof col.valueGetter === 'function') return col.valueGetter({ data: row })
  return getPathValue(row, col.field)
}

function getSortValue(col, row) {
  return getRawValue(col, row)
}

function getDisplayValue(col, row) {
  const value = getRawValue(col, row)
  if (typeof col.valueFormatter === 'function') return col.valueFormatter({ value, data: row })
  return value == null ? '' : value
}

function hasHtmlRenderer(col) {
  return typeof col.cellRenderer === 'function'
}

function isFooterRow(row) {
  return !!row?.__isFooter
}

function getRenderedHtml(col, row) {
  return col.cellRenderer({ value: getRawValue(col, row), data: row })
}

function handleCellClick(col, row, event) {
  if (typeof col.onCellClicked === 'function') {
    col.onCellClicked({ data: row, event, value: getRawValue(col, row) })
  }
}

function getCellStyle(col, row) {
  if (typeof col.cellStyle === 'function') return col.cellStyle({ value: getRawValue(col, row), data: row })
  return col.cellStyle || null
}

function getCellClass(col) {
  const header = String(col.headerName || '').toLowerCase()
  return {
    'at-grid-cell-html': hasHtmlRenderer(col),
    'at-grid-cell-actions': hasHtmlRenderer(col) && (header === 'actions' || header === 'action'),
  }
}

function isActionColumn(col) {
  const header = String(col.headerName || '').toLowerCase()
  return hasHtmlRenderer(col) && (header === 'actions' || header === 'action')
}

function getColumnWidthStyle(col) {
  const key = getColumnKey(col)
  const actionCol = isActionColumn(col)
  const explicitWidth = Number(columnWidths.value[key] || col.width || 0)
  const minWidth = Math.max(Number(col.minWidth || 96), actionCol ? 190 : 96)
  if (explicitWidth > 0) {
    return { width: `${Math.max(explicitWidth, minWidth)}px`, minWidth: `${minWidth}px` }
  }

  const width = Number(col.flex || 1)
  return { width: `${Math.max(width, 0.9) * 120}px`, minWidth: `${minWidth}px` }
}

function startResize(col, index, event) {
  event.preventDefault()
  event.stopPropagation()

  const key = getColumnKey(col, index)
  const minWidth = Number(col.minWidth || 96)
  const startWidth = Number(columnWidths.value[key] || col.width || Math.max(Number(col.flex || 1), 0.9) * 120)

  resizeState = {
    key,
    minWidth,
    startX: event.clientX,
    startWidth,
  }

  window.addEventListener('mousemove', onResizeMove)
  window.addEventListener('mouseup', stopResize)
}

function onResizeMove(event) {
  if (!resizeState) return
  const nextWidth = resizeState.startWidth + (event.clientX - resizeState.startX)
  columnWidths.value = {
    ...columnWidths.value,
    [resizeState.key]: Math.max(resizeState.minWidth, nextWidth),
  }
}

function stopResize() {
  resizeState = null
  window.removeEventListener('mousemove', onResizeMove)
  window.removeEventListener('mouseup', stopResize)
}

onBeforeUnmount(() => {
  stopResize()
})

function toTitle(key) {
  return String(key)
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
}

function getPathValue(obj, path) {
  if (!obj || !path) return ''
  return String(path).split('.').reduce((acc, part) => acc?.[part], obj)
}

function compareValues(a, b, direction) {
  const dir = direction === 'desc' ? -1 : 1
  const left = a ?? ''
  const right = b ?? ''
  if (typeof left === 'number' && typeof right === 'number') return (left - right) * dir
  return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' }) * dir
}
</script>

<style scoped>
.at-grid-shell {
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  background: #fff;
}

.at-grid-body {
  flex: 1;
  overflow: auto;
}

.at-grid-table {
  width: 100%;
  min-width: 720px;
  border-collapse: collapse;
  table-layout: fixed;
}

.at-grid-table thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #f8fafd;
  color: #5a6a85;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 700;
  text-align: left;
  padding: 12px 14px;
  border-bottom: 1px solid #e0e7ef;
  overflow: hidden;
  box-shadow: inset 0 -1px 0 #e0e7ef;
}

.at-grid-th-content {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-right: 8px;
}

.at-grid-table thead th.sortable {
  cursor: pointer;
}

.at-grid-table tbody td {
  padding: 12px 14px;
  border-bottom: 1px solid #f0f4f8;
  color: #1a2744;
  font-size: 13px;
  vertical-align: middle;
  word-break: break-word;
}

.at-grid-table tbody tr:nth-child(even) {
  background: #fcfdff;
}

.at-grid-table tbody tr:hover {
  background: #edf5ff;
}

.at-grid-footer-row td {
  padding: 10px 14px;
  border-top: 1px solid #e0e7ef;
  color: #1a2744;
  font-size: 12px;
  font-weight: 700;
  background: #f9fbff;
  vertical-align: middle;
  word-break: break-word;
}

.at-grid-footer-row td:first-child {
  color: #5a6a85;
}

.at-grid-table tbody td.at-grid-cell-html,
.at-grid-table tbody td.at-grid-cell-actions {
  white-space: nowrap;
  word-break: normal;
}

.at-grid-table tbody td.at-grid-cell-actions :deep(div) {
  display: inline-flex !important;
  align-items: center !important;
  gap: 4px !important;
  flex-wrap: nowrap !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  min-height: 28px;
}

.at-grid-table tbody td.at-grid-cell-actions :deep(button) {
  white-space: nowrap;
  flex: 0 0 auto;
}

.at-grid-table tbody td.at-grid-cell-actions {
  vertical-align: middle;
}

.at-grid-body :deep(button[data-action]) {
  border: none !important;
  border-radius: 999px !important;
  padding: 4px 8px !important;
  cursor: pointer !important;
  font-size: 10px !important;
  font-weight: 700 !important;
  line-height: 1 !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 4px !important;
  box-shadow: inset 0 0 0 1px transparent;
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
}

.at-grid-body :deep(button[data-action]::before) {
  display: inline-block;
  font-size: 10px;
  line-height: 1;
}

.at-grid-body :deep(button[data-action="view"]) {
  background: #e3f2fd !important;
  color: #1565c0 !important;
  box-shadow: inset 0 0 0 1px #bbdefb !important;
}

.at-grid-body :deep(button[data-action="view"]::before) {
  content: '◉';
}

.at-grid-body :deep(button[data-action="edit"]) {
  background: #ede7f6 !important;
  color: #6a1b9a !important;
  box-shadow: inset 0 0 0 1px #d1c4e9 !important;
}

.at-grid-body :deep(button[data-action="edit"]::before) {
  content: '✎';
}

.at-grid-body :deep(button[data-action="delete"]) {
  background: #ffebee !important;
  color: #c62828 !important;
  box-shadow: inset 0 0 0 1px #ffcdd2 !important;
}

.at-grid-body :deep(button[data-action="delete"]::before) {
  content: '✕';
}

.at-grid-body :deep(button[data-action]:hover) {
  transform: translateY(-1px);
  opacity: 0.96;
}

.at-grid-body :deep(button[data-action]:active) {
  transform: translateY(0);
}

.at-grid-table tbody tr:hover {
  background: #f0f7ff;
}

.sort-indicator {
  margin-left: 6px;
  color: #1565c0;
}

.at-grid-resizer {
  position: absolute;
  top: 0;
  right: -1px;
  width: 10px;
  height: 100%;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: col-resize;
}

.at-grid-resizer::after {
  content: '';
  position: absolute;
  top: 20%;
  right: 4px;
  width: 2px;
  height: 60%;
  border-radius: 999px;
  background: #d7e0ea;
}

.at-grid-table thead th:hover .at-grid-resizer::after,
.at-grid-resizer:focus-visible::after {
  background: #1565c0;
}

.at-grid-empty {
  min-height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #5a6a85;
  font-size: 14px;
}

.at-grid-empty-icon {
  font-size: 40px;
  margin-bottom: 8px;
}

.at-grid-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-top: 1px solid #e0e7ef;
  color: #5a6a85;
  font-size: 12px;
  flex-wrap: wrap;
}

.at-grid-footer-left,
.at-grid-footer-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.at-grid-select,
.at-grid-nav {
  border: 1px solid #d7e0ea;
  border-radius: 6px;
  background: #fff;
  color: #1a2744;
  font-size: 12px;
  padding: 4px 8px;
}

.at-grid-nav:disabled {
  opacity: 0.5;
}

@media (max-width: 768px) {
  .at-grid-footer {
    align-items: flex-start;
    justify-content: flex-start;
  }

  .at-grid-footer-center {
    width: 100%;
    order: 3;
  }

  .at-grid-table thead th,
  .at-grid-table tbody td {
    padding: 10px 12px;
  }
}
</style>
