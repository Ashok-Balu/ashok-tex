import { useI18n } from 'vue-i18n'

const isEmpty = v => v === null || v === undefined || String(v).trim() === ''

// Rule factories: each returns a Vuetify rule (value => true | translated message).
export function useValidation() {
  const { t } = useI18n()

  const required = (msg) => v => !isEmpty(v) || msg || t('valRequired')

  const number = (msg) => v => isEmpty(v) || !Number.isNaN(Number(v)) || msg || t('valNumber')

  const positive = (msg) => v => (!isEmpty(v) && Number(v) > 0) || msg || t('valPositive')

  const nonNegative = (msg) => v => (!isEmpty(v) && Number(v) >= 0) || msg || t('valNonNegative')

  const integer = (msg) => v => isEmpty(v) || Number.isInteger(Number(v)) || msg || t('valInteger')

  const percent = (msg) => v => (!isEmpty(v) && Number(v) >= 0 && Number(v) <= 100) || msg || t('valPercent')

  const maxValue = (max, msg) => v => isEmpty(v) || Number(v) <= max || msg || t('valMax', { max })

  const minLength = (min, msg) => v => isEmpty(v) || String(v).trim().length >= min || msg || t('valMinLen', { min })

  const maxLength = (max, msg) => v => isEmpty(v) || String(v).length <= max || msg || t('valMaxLen', { max })

  const mobile = (msg) => v => isEmpty(v) || /^[6-9]\d{9}$/.test(String(v).replace(/\s|-/g, '')) || msg || t('valMobile')

  const pattern = (re, msg) => v => isEmpty(v) || re.test(String(v)) || msg || t('valInvalid')

  // Date must not be before the date returned by getStart (used for end dates).
  const notBefore = (getStart, msg) => v => {
    const start = getStart()
    if (isEmpty(v) || isEmpty(start)) return true
    return new Date(v) >= new Date(start) || msg || t('valDateRange')
  }

  const validDate = (msg) => v => isEmpty(v) || !Number.isNaN(new Date(v).getTime()) || msg || t('valInvalidDate')

  return {
    required, number, positive, nonNegative, integer, percent, maxValue,
    minLength, maxLength, mobile, pattern, notBefore, validDate,
  }
}
