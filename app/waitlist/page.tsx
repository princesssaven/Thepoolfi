"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type UserType = "chasing_to_pay" | "always_chasing" | "just_curious" | "group_or_cooperative";
type CollectionMethod = "whatsapp" | "bank_transfer" | "cash" | "no_system";

export default function WaitlistPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [userType, setUserType] = useState<UserType | null>(null);
    const [collectionMethod, setCollectionMethod] = useState<CollectionMethod | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email) return;

        setLoading(true);

        try {
            const { error } = await supabase
                .from("waitlist")
                .insert([
                    {
                        name,
                        email,
                        user_type: userType,
                        collection_method: collectionMethod,
                    },
                ]);

            if (error) {
                console.error("Error inserting waitlist entry:", error);
                alert("Something went wrong. Please try again.");
                setLoading(false);
                return;
            }

            setSubmitted(true);
        } catch (err) {
            console.error(err);
            alert("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <main className="waitlist-page">
                <div className="waitlist-container">
                    <div className="waitlist-success">
                        <div className="success-icon">✓</div>
                        <h1 className="waitlist-title">You&apos;re on the list!</h1>
                        <p className="waitlist-subtitle">
                            We&apos;ll send you an email when your spot is ready. Keep an eye on your inbox.
                        </p>
                        <Link href="/" className="btn-back-home">
                            ← Back to home
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="waitlist-page">
            <div className="waitlist-container">
                <Link href="/" className="waitlist-back-link">
                    ← Back
                </Link>

                <h1 className="waitlist-title">Get early access</h1>
                <p className="waitlist-subtitle">
                    Join the list and we&apos;ll let you know when your spot is ready.
                </p>

                <form onSubmit={handleSubmit} className="waitlist-form">
                    {/* Name Field */}
                    <div className="waitlist-field">
                        <label htmlFor="waitlist-name" className="waitlist-label">
                            Name <span className="required">*</span>
                        </label>
                        <input
                            id="waitlist-name"
                            type="text"
                            placeholder="Jane Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="waitlist-input"
                            required
                        />
                    </div>

                    {/* Email Field */}
                    <div className="waitlist-field">
                        <label htmlFor="waitlist-email" className="waitlist-label">
                            Email address <span className="required">*</span>
                        </label>
                        <input
                            id="waitlist-email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="waitlist-input"
                            required
                        />
                    </div>

                    {/* User Type Selector */}
                    <div className="waitlist-field">
                        <label className="waitlist-label">
                            Which one are you? <span className="optional">(optional)</span>
                        </label>
                        <div className="waitlist-options">
                            <button
                                type="button"
                                className={`waitlist-option ${userType === "always_chasing" ? "selected" : ""}`}
                                onClick={() => setUserType(userType === "always_chasing" ? null : "always_chasing")}
                            >
                                Always chasing everyone to pay
                            </button>
                            <button
                                type="button"
                                className={`waitlist-option ${userType === "chasing_to_pay" ? "selected" : ""}`}
                                onClick={() => setUserType(userType === "chasing_to_pay" ? null : "chasing_to_pay")}
                            >
                                Always chasing to pay
                            </button>
                            <button
                                type="button"
                                className={`waitlist-option ${userType === "just_curious" ? "selected" : ""}`}
                                onClick={() => setUserType(userType === "just_curious" ? null : "just_curious")}
                            >
                                Just curious about this
                            </button>
                            <button
                                type="button"
                                className={`waitlist-option ${userType === "group_or_cooperative" ? "selected" : ""}`}
                                onClick={() => setUserType(userType === "group_or_cooperative" ? null : "group_or_cooperative")}
                            >
                                I run a group or cooperative
                            </button>
                        </div>
                    </div>

                    {/* Collection Method Selector */}
                    <div className="waitlist-field">
                        <label className="waitlist-label">
                            Where does your group currently collect money? <span className="optional">(optional)</span>
                        </label>
                        <div className="waitlist-options">
                            <button
                                type="button"
                                className={`waitlist-option ${collectionMethod === "whatsapp" ? "selected" : ""}`}
                                onClick={() => setCollectionMethod(collectionMethod === "whatsapp" ? null : "whatsapp")}
                            >
                                WhatsApp back and forth
                            </button>
                            <button
                                type="button"
                                className={`waitlist-option ${collectionMethod === "bank_transfer" ? "selected" : ""}`}
                                onClick={() => setCollectionMethod(collectionMethod === "bank_transfer" ? null : "bank_transfer")}
                            >
                                Bank transfer to one person
                            </button>
                            <button
                                type="button"
                                className={`waitlist-option ${collectionMethod === "cash" ? "selected" : ""}`}
                                onClick={() => setCollectionMethod(collectionMethod === "cash" ? null : "cash")}
                            >
                                Cash collection
                            </button>
                            <button
                                type="button"
                                className={`waitlist-option ${collectionMethod === "no_system" ? "selected" : ""}`}
                                onClick={() => setCollectionMethod(collectionMethod === "no_system" ? null : "no_system")}
                            >
                                No system; just hope for the best
                            </button>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="waitlist-submit"
                        disabled={loading || !name || !email}
                    >
                        {loading ? (
                            <span className="waitlist-spinner" />
                        ) : (
                            <>Join the waitlist &nbsp;→</>
                        )}
                    </button>

                    <p className="waitlist-disclaimer">
                        No spam, ever. Just one email when you&apos;re in.<br />
                        Unsubscribe any time.
                    </p>
                </form>
            </div>
        </main>
    );
}
