/**
 * Compact stepper showing event approval progress: Draft → Pending → Approved.
 * currentStepIndex: 0 = draft, 1 = pending, 2 = approved (or equivalent).
 */
const STEPS = ['Draft', 'Pending', 'Approved'];

export default function SmallApprovalStepper({ currentStepIndex = 0 }) {
  const index = Math.max(0, Math.min(currentStepIndex, STEPS.length - 1));

  return (
    <div className="flex items-center gap-1" aria-label={`Approval step: ${STEPS[index]}`}>
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center min-w-0">
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider truncate ${
              i < index
                ? 'text-emerald-600'
                : i === index
                  ? 'text-[#00356b]'
                  : 'text-slate-400'
            }`}
          >
            {label}
          </span>
          {i < STEPS.length - 1 && (
            <span
              className={`mx-1.5 w-4 h-px shrink-0 ${
                i < index ? 'bg-emerald-400' : 'bg-slate-200'
              }`}
              aria-hidden
            />
          )}
        </div>
      ))}
    </div>
  );
}
