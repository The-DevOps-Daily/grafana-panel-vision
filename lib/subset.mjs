// The fixed subset for repeat runs: every third panel (p001, p004, ...), 34 panels.
export const inSubset = (panelId) => (Number(panelId.slice(1)) - 1) % 3 === 0;
