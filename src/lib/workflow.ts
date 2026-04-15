/**
 * Core business logic for workflow capabilities.
 */

interface MinimalConfigStep {
  action: string | null
}

/**
 * Calculates how many steps have been successfully approved so far in the CURRENT cycle.
 * If a return or reject happened, the chain resets (starts from index 0) for the next submitted cycle.
 * 
 * @param steps array of historical approval steps, ordered by time.
 * @returns the 0-based index targeting the next pending expected role in the fixed sequence chain.
 */
export function calculateCurrentStepIndex(steps: MinimalConfigStep[]): number {
  if (!steps || steps.length === 0) return 0;
  
  let currentStepIndex = 0;
  
  // Walk backwards to find the last cycle
  for (let i = steps.length - 1; i >= 0; i--) {
    const action = steps[i].action;
    
    // Any terminal/reset action cuts the chain block
    if (action === "return" || action === "reject") {
      break;
    }
    
    if (action === "approve") {
      currentStepIndex++;
    }
  }
  
  return currentStepIndex;
}
