import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell, Settings as SettingsIcon, Bug, LogOut, Edit2, User, Building
} from 'lucide-react';

export default function Header({ session, userRescueId, onOpenAuth, onLogOut }) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const userMetadata = session?.user?.user_metadata || {};
  const avatarUrl = userMetadata.avatar_url || userMetadata.picture;
  const userInitial =
    userMetadata.first_name?.[0] ||
    userMetadata.full_name?.[0] ||
    session?.user?.email?.[0] ||
    'U';
  const userFullName =
    [userMetadata.first_name, userMetadata.last_name].filter(Boolean).join(' ') ||
    userMetadata.full_name ||
    userMetadata.name ||
    'User';

  const publicProfileRoute = userRescueId ? `/rescue/${userRescueId}` : '/profile';

  useEffect(() => {
    setAvatarError(false);
  }, [avatarUrl]);

  const handleLogOutClick = async () => {
    setIsProfileMenuOpen(false);
    await onLogOut();
  };

  return (
    <header className="h-16 bg-white/95 backdrop-blur-sm px-4 border-b border-socal-sand-border sticky top-0 z-50 flex items-center justify-between shadow-sm shrink-0">
      <Link to="/" className="flex items-center gap-2 shrink-0">
        <picture>
          <source srcSet="/socalstrays-header-horizontal.webp" type="image/webp" />
          <img
            src="/socalstrays-header-horizontal.png"
            alt="SoCalStrays"
            className="h-9 w-auto object-contain"
          />
        </picture>
      </Link>

      {session ? (
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-block bg-socal-orange-light text-socal-orange-dark border border-socal-orange/30 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded shadow-sm">
            SoCal Beta
          </span>

          <button
            type="button"
            className="text-slate-400 hover:text-socal-ink transition-colors relative"
            aria-label="Notifications"
          >
            <Bell size={20} />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="rounded-full flex items-center justify-center transition-transform hover:scale-105 focus:ring-2 focus:ring-socal-orange/40 outline-none"
            >
              {avatarUrl && !avatarError ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  onError={() => setAvatarError(true)}
                  className="w-9 h-9 rounded-full object-cover border-2 border-socal-orange shadow-sm bg-socal-sand"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-socal-orange-light border-2 border-socal-orange flex items-center justify-center text-socal-orange-dark font-bold shadow-sm">
                  {userInitial.toUpperCase()}
                </div>
              )}
            </button>

            {isProfileMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsProfileMenuOpen(false)}
                />
                <div className="absolute top-12 right-0 w-64 bg-white rounded-2xl shadow-xl border border-socal-sand-border z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <div className="p-4 border-b border-socal-sand-border flex justify-between items-start bg-socal-sand/50">
                    <div className="pr-4 min-w-0">
                      <p className="font-bold text-socal-ink truncate">{userFullName}</p>
                      <p className="text-sm text-slate-500 truncate">{session.user.email}</p>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="text-slate-400 hover:text-socal-orange mt-1 shrink-0"
                    >
                      <Edit2 size={16} />
                    </Link>
                  </div>

                  <div className="p-2 space-y-1">
                    {userRescueId && (
                      <Link
                        to="/rescue-dashboard"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-socal-plum-light hover:bg-socal-plum/15 text-socal-plum font-black text-sm transition-colors mb-1"
                      >
                        <Building size={18} className="text-socal-plum" /> My Rescue
                      </Link>
                    )}
                    <Link
                      to={publicProfileRoute}
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-socal-sand text-socal-ink font-bold text-sm transition-colors"
                    >
                      <User size={18} className="text-slate-400" /> View Public Profile
                    </Link>
                    <Link
                      to="/profile"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-socal-sand text-socal-ink font-bold text-sm transition-colors"
                    >
                      <SettingsIcon size={18} className="text-slate-400" /> Settings
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        alert('Feedback modal goes here');
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-socal-sand text-socal-ink font-bold text-sm transition-colors"
                    >
                      <Bug size={18} className="text-slate-400" /> Give Feedback
                    </button>
                  </div>

                  <div className="p-2 border-t border-socal-sand-border">
                    <button
                      type="button"
                      onClick={handleLogOutClick}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-rose-50 text-rose-600 font-bold text-sm transition-colors"
                    >
                      <LogOut size={18} /> Log Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onOpenAuth}
          className="text-sm font-bold text-white bg-socal-orange hover:bg-socal-orange-dark px-4 py-1.5 rounded-full shadow-sm transition-colors"
        >
          Log In
        </button>
      )}
    </header>
  );
}