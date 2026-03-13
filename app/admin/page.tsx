"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type WaitlistEntry = {
    id: string;
    name: string;
    email: string;
    user_type: string | null;
    collection_method: string | null;
    created_at: string;
};

export default function AdminDashboard() {
    const [authenticated, setAuthenticated] = useState(false);
    const [passcode, setPasscode] = useState("");
    const [passcodeError, setPasscodeError] = useState(false);
    const [entries, setEntries] = useState<WaitlistEntry[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        const adminPasscode = process.env.NEXT_PUBLIC_ADMIN_PASSCODE || "admin";

        if (passcode === adminPasscode) {
            setAuthenticated(true);
            setPasscodeError(false);
        } else {
            setPasscodeError(true);
        }
    };

    useEffect(() => {
        if (authenticated) {
            fetchWaitlist();
        }
    }, [authenticated]);

    const fetchWaitlist = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("waitlist")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) {
                console.error("Error fetching waitlist:", error);
                setError(error.message);
            } else {
                setEntries(data || []);
            }
        } catch (err) {
            console.error(err);
            setError("Failed to fetch waitlist entries");
        } finally {
            setLoading(false);
        }
    };

    /* ── Filter Logic ── */
    const filteredEntries = useMemo(() => {
        if (!searchQuery.trim()) return entries;
        const query = searchQuery.toLowerCase();
        return entries.filter(
            (entry) =>
                entry.name.toLowerCase().includes(query) ||
                entry.email.toLowerCase().includes(query)
        );
    }, [entries, searchQuery]);

    /* ── Export CSV Logic ── */
    const exportToCSV = () => {
        if (filteredEntries.length === 0) return;

        const headers = ["Name", "Email", "User Type", "Collection Method", "Date Joined"];
        const csvRows = [headers.join(",")];

        for (const entry of filteredEntries) {
            const row = [
                `"${entry.name.replace(/"/g, '""')}"`,
                `"${entry.email.replace(/"/g, '""')}"`,
                `"${(entry.user_type || "").replace(/_/g, " ")}"`,
                `"${(entry.collection_method || "").replace(/_/g, " ")}"`,
                `"${new Date(entry.created_at).toISOString()}"`,
            ];
            csvRows.push(row.join(","));
        }

        const csvString = csvRows.join("\n");
        const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `poolfi-waitlist-${new Date().toISOString().split("T")[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    /* ── Passcode Gate ── */
    if (!authenticated) {
        return (
            <main className="admin-page">
                <div className="admin-login-container">
                    <div className="admin-login-card">
                        <div className="admin-login-icon">🔒</div>
                        <h1 className="admin-login-title">Admin Access</h1>
                        <p className="admin-login-subtitle">
                            Enter your passcode to view the dashboard.
                        </p>
                        <form onSubmit={handleLogin} className="admin-login-form">
                            <input
                                type="password"
                                value={passcode}
                                onChange={(e) => {
                                    setPasscode(e.target.value);
                                    setPasscodeError(false);
                                }}
                                placeholder="Enter passcode"
                                className={`admin-login-input ${passcodeError ? "input-error" : ""}`}
                                autoFocus
                            />
                            {passcodeError && (
                                <p className="admin-login-error">Incorrect passcode. Try again.</p>
                            )}
                            <button
                                type="submit"
                                className="admin-login-btn"
                                disabled={!passcode}
                            >
                                Unlock Dashboard →
                            </button>
                        </form>
                        <Link href="/" className="admin-login-back">
                            ← Back to site
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    /* ── Authenticated Dashboard ── */
    return (
        <main className="admin-page">
            <div className="admin-container">
                <div className="admin-header">
                    <h1 className="admin-title">Waitlist Dashboard</h1>
                    <Link href="/" className="btn-secondary" style={{ padding: "8px 16px", fontSize: "14px", textDecoration: "none" }}>
                        View Site →
                    </Link>
                </div>

                <div className="admin-stats">
                    <div className="stat-card" style={{ flex: 1 }}>
                        <span className="stat-label">Total Signups</span>
                        <span className="stat-value">{entries.length}</span>
                    </div>
                </div>

                <div className="admin-controls" style={{ display: "flex", gap: "16px", marginBottom: "24px", alignItems: "center", flexWrap: "wrap" }}>
                    <div className="admin-search-wrapper">
                        <div className="admin-search-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M21 21L15.0001 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="admin-search-input"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="admin-search-clear"
                                aria-label="Clear search"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                    <button
                        onClick={exportToCSV}
                        className="btn-secondary"
                        disabled={filteredEntries.length === 0}
                        style={{ padding: "14px 24px", minWidth: "140px", display: "flex", justifyContent: "center", gap: "8px", alignItems: "center" }}
                    >
                        <span>📥</span> Export CSV
                    </button>
                </div>

                {loading ? (
                    <div className="admin-loading">Loading entries...</div>
                ) : error ? (
                    <div className="admin-error">Error: {error}</div>
                ) : entries.length === 0 ? (
                    <div className="admin-empty">No waitlist entries yet.</div>
                ) : (
                    <div className="admin-table-container">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>User Type</th>
                                    <th>Collection Method</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEntries.length > 0 ? (
                                    filteredEntries.map((entry) => (
                                        <tr key={entry.id}>
                                            <td style={{ fontWeight: 600, color: "#fff" }}>{entry.name}</td>
                                            <td>{entry.email}</td>
                                            <td>
                                                {entry.user_type ? (
                                                    <span className="admin-badge">
                                                        {entry.user_type.replace(/_/g, " ")}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted">-</span>
                                                )}
                                            </td>
                                            <td>
                                                {entry.collection_method ? (
                                                    <span className="admin-badge">
                                                        {entry.collection_method.replace(/_/g, " ")}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted">-</span>
                                                )}
                                            </td>
                                            <td className="text-muted" style={{ fontSize: "13px", whiteSpace: "nowrap" }}>
                                                {new Date(entry.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: "center", padding: "40px", color: "var(--pf-text-muted-white-40)" }}>
                                            No matches found for "{searchQuery}"
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </main>
    );
}

