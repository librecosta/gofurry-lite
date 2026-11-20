export const easeOut = [.2, .8, .2, 1] as const

export const interaction = { duration: .42, ease: easeOut }
export const reveal = { duration: .6, ease: [.22, .72, .28, 1] as const }
export const modeSpring = { type: 'spring', stiffness: 410, damping: 30, mass: .7 } as const
export const gaugeSpring = { stiffness: 300, damping: 36, mass: .6, restDelta: .0001 }
export const immediate = { duration: 0 }
