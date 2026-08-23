import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CivicForm | Your Government Paperwork Assistant",
  description: "Simplify, complete, and submit your government applications and forms with AI assistance.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="header">
          <div className="container header-container">
            <a href="/" className="logo" id="header-logo-link">
              <span>🏛️</span> CivicForm
            </a>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface-elevated)', padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                Currently supporting: Udyam Registration
              </span>
              <nav>
                <ul className="nav-links">
                  <li>
                    <a href="/api/health" className="nav-link" id="nav-health-check">
                      API Health
                    </a>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </header>
        {children}
        <footer className="footer">
          <div className="container">
            <p>&copy; {new Date().getFullYear()} CivicForm. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
