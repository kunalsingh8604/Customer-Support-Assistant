import { Link, NavLink, Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/tickets" className="text-lg font-semibold tracking-tight text-slate-900">
            Customer Support Assistant
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <NavLink
              to="/tickets"
              end
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 font-medium ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              Tickets
            </NavLink>
            <NavLink
              to="/tickets/new"
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 font-medium ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              New ticket
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
