// Confetti burst for milestone actions; loaded lazily and skipped for reduced-motion users.
export async function celebrate(kind = 'burst') {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  try {
    const { default: confetti } = await import('canvas-confetti')
    const colors = ['#1565C0', '#42A5F5', '#F59E0B', '#10B981', '#EC4899', '#8B5CF6']
    if (kind === 'burst') {
      confetti({ particleCount: 110, spread: 75, startVelocity: 42, origin: { y: 0.65 }, colors, zIndex: 3500 })
      return
    }
    const end = Date.now() + 1200
    const frame = () => {
      confetti({ particleCount: 5, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors, zIndex: 3500 })
      confetti({ particleCount: 5, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors, zIndex: 3500 })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()
  } catch {
    // Celebration is cosmetic; ignore load failures
  }
}
