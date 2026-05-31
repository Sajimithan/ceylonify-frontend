import { useState, useRef } from "react";
import {
  sendEmailVerification,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  linkWithCredential,
  type ConfirmationResult,
} from "firebase/auth";
import { useMutation } from "@apollo/client/react";
import { auth } from "../auth/firebase";
import { MARK_EMAIL_VERIFIED, MARK_PHONE_VERIFIED, SELF_UPGRADE_PREMIUM } from "./premium.gql";

type Step = "email" | "phone" | "confirm" | "done";

export function PremiumUpgrade({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<Step>("email");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  const [markEmailVerified] = useMutation(MARK_EMAIL_VERIFIED);
  const [markPhoneVerified] = useMutation(MARK_PHONE_VERIFIED);
  const [selfUpgrade] = useMutation(SELF_UPGRADE_PREMIUM);

  async function handleSendVerificationEmail() {
    setError(null);
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not logged in.");
      await sendEmailVerification(user);
      setError("Verification email sent. Check your inbox.");
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailDone() {
    setError(null);
    setLoading(true);
    try {
      await auth.currentUser?.reload();
      if (!auth.currentUser?.emailVerified) {
        throw new Error("Email not verified yet. Please click the link in your inbox.");
      }
      await markEmailVerified();
      setStep("phone");
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp() {
    setError(null);
    setLoading(true);
    try {
      if (!recaptchaContainerRef.current) throw new Error("reCAPTCHA not ready.");
      const verifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, { size: "invisible" });
      const result = await signInWithPhoneNumber(auth, phoneNumber, verifier);
      setConfirmationResult(result);
      setError("OTP sent! Check your phone.");
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    setError(null);
    setLoading(true);
    try {
      if (!confirmationResult) throw new Error("No OTP confirmation pending.");
      const credential = PhoneAuthProvider.credential(confirmationResult.verificationId, otp);
      await linkWithCredential(auth.currentUser!, credential).catch(() => {});
      await markPhoneVerified({ variables: { phone: phoneNumber } });
      setStep("confirm");
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpgrade() {
    setError(null);
    setLoading(true);
    try {
      await selfUpgrade();
      setStep("done");
      setTimeout(onSuccess, 1500);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {(["email", "phone", "confirm"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === s || (step === "done" && s === "confirm") ? "bg-brand-500 text-white" : step > s ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"}`}>
                {i + 1}
              </div>
              {i < 2 && <div className="w-8 h-0.5 bg-slate-100" />}
            </div>
          ))}
        </div>

        {/* Email step */}
        {step === "email" && (
          <div>
            <h3 className="font-bold text-slate-700 text-lg mb-2">Verify Your Email</h3>
            <p className="text-sm text-slate-500 mb-5">We'll send a verification link to <strong>{auth.currentUser?.email}</strong>.</p>
            <button
              onClick={handleSendVerificationEmail}
              disabled={loading}
              className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-colors mb-3"
            >
              Send Verification Email
            </button>
            <button
              onClick={handleEmailDone}
              disabled={loading}
              className="w-full py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-50 transition-colors"
            >
              I've Verified My Email →
            </button>
          </div>
        )}

        {/* Phone step */}
        {step === "phone" && (
          <div>
            <h3 className="font-bold text-slate-700 text-lg mb-2">Verify Your Phone</h3>
            <p className="text-sm text-slate-500 mb-5">Enter your mobile number to receive an OTP.</p>
            <input
              type="tel"
              placeholder="+94 77 000 0000"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
            <div ref={recaptchaContainerRef} />
            {!confirmationResult ? (
              <button
                onClick={handleSendOtp}
                disabled={loading || !phoneNumber}
                className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-colors"
              >
                Send OTP
              </button>
            ) : (
              <div>
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
                <button
                  onClick={handleVerifyOtp}
                  disabled={loading || otp.length < 6}
                  className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-colors"
                >
                  Verify OTP
                </button>
              </div>
            )}
          </div>
        )}

        {/* Confirm step */}
        {step === "confirm" && (
          <div className="text-center">
            <div className="text-4xl mb-3">⭐</div>
            <h3 className="font-bold text-slate-700 text-lg mb-2">All Verified!</h3>
            <p className="text-sm text-slate-500 mb-6">You're all set. Upgrade to Premium and unlock 30 AI requests/month + premium listings.</p>
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-colors shadow"
            >
              {loading ? "Upgrading…" : "Upgrade to Premium ⭐"}
            </button>
          </div>
        )}

        {/* Done step */}
        {step === "done" && (
          <div className="text-center">
            <div className="text-5xl mb-3">🎉</div>
            <h3 className="font-bold text-slate-700 text-lg">Welcome to Premium!</h3>
          </div>
        )}

        {error && <div className="mt-4 text-sm text-red-600 font-semibold">{error}</div>}

        {step !== "done" && (
          <button onClick={onClose} className="mt-5 w-full text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
