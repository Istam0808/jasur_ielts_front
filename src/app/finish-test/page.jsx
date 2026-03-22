'use client';

import './finishTest.scss';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BsCheckCircleFill, BsBoxArrowRight } from 'react-icons/bs';
import { logoutAgent } from '@/lib/mockApi';
import { getMockSession, clearMockSession } from '@/lib/mockSession';

export default function FinishTestPage() {
    const router = useRouter();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // Guard: redirect to home if no active session
    useEffect(() => {
        const session = getMockSession();
        if (!session?.accessToken) {
            router.replace('/');
        }
    }, [router]);

    const handleLogout = async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);

        try {
            const session = getMockSession();
            const token = session?.accessToken;
            if (token) {
                await logoutAgent(token);
            }
        } catch (err) {
            console.warn('Logout request failed:', err);
        } finally {
            clearMockSession();
            router.replace('/');
        }
    };

    return (
        <div className="finish-test-page">
            <div className="finish-test-page__card">
                <div className="finish-test-page__icon" aria-hidden="true">
                    <BsCheckCircleFill />
                </div>

                <h1 className="finish-test-page__title">
                    Test Completed!
                </h1>

                <div className="finish-test-page__divider" />

                <p className="finish-test-page__subtitle">
                    Thank you for completing the IELTS Mock Test.
                    Your answers have been successfully submitted and will be reviewed shortly.
                </p>

                <div className="finish-test-page__info">
                    <strong>What happens next?</strong><br />
                    Your teacher will review your responses and provide
                    detailed feedback on your Listening, Reading, and Writing sections.
                </div>

                <button
                    type="button"
                    className="finish-test-page__btn"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    aria-label="Exit and logout"
                >
                    {isLoggingOut ? (
                        <span className="finish-test-page__spinner" aria-hidden="true" />
                    ) : (
                        <BsBoxArrowRight aria-hidden="true" />
                    )}
                    {isLoggingOut ? 'Exiting...' : 'Exit'}
                </button>
            </div>
        </div>
    );
}
