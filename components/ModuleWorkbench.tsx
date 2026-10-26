import React from 'react';
import './workbench.css';

export function Workbench({ title, eyebrow, toolbar, status, children, className = '' }: {
  title: string;
  eyebrow?: string;
  toolbar?: React.ReactNode;
  status?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={`workbench ${className}`} aria-label={title}>
    <header className="wb-header">
      <div>{eyebrow && <span className="wb-eyebrow">{eyebrow}</span>}<h2>{title}</h2></div>
      {toolbar && <div className="wb-toolbar">{toolbar}</div>}
    </header>
    <div className="wb-content">{children}</div>
    {status && <footer className="wb-status" role="status">{status}</footer>}
  </section>;
}
export default Workbench;
export function IconButton({ label, children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button type="button" className={`wb-icon ${className}`} aria-label={label} title={label} {...props}>{children}</button>;
}
