'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

export default function StepTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session') || '';

  const steps = [
    { label: 'Upload', path: '/upload', index: 0 },
    { label: 'Checklist', path: '/checklist', index: 1 },
    { label: 'Review', path: '/preview', index: 2 },
    { label: 'Submit', path: '/submit', index: 3 }
  ];

  // Find the index of the current route pathname
  const activeIndex = steps.findIndex(s => s.path === pathname);

  return (
    <div className="stepper-container">
      {steps.map((step, idx) => {
        const isActive = idx === activeIndex;
        const isCompleted = idx < activeIndex;
        
        let stepClass = 'stepper-step';
        if (isActive) stepClass += ' step-active';
        if (isCompleted) stepClass += ' step-completed';

        return (
          <React.Fragment key={step.path}>
            <div className={stepClass}>
              <span className="stepper-dot">
                {isCompleted ? '✓' : idx + 1}
              </span>
              {isCompleted ? (
                <Link href={`${step.path}?session=${sessionId}`} className="step-completed-link">
                  {step.label}
                </Link>
              ) : (
                <span>{step.label}</span>
              )}
            </div>
            {idx < steps.length - 1 && (
              <span className={`stepper-line ${idx < activeIndex ? 'stepper-line-active' : ''}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
