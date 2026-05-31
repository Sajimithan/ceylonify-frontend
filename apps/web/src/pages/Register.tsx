import { useCallback, useRef, useState } from "react";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import { GoogleMap, Marker, Autocomplete, useJsApiLoader } from "@react-google-maps/api";
import { MAPS_LIBRARIES } from "../lib/googleMaps";
import { auth } from "../auth/firebase";
import { Link } from "react-router-dom";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";

const SUBMIT_HOST_APPLICATION = gql`
  mutation SubmitHostApplication($input: SubmitHostApplicationInput!) {
    submitHostApplication(input: $input)
  }
`;

type Step =
  | "form"
  | "host-type"
  | "business"
  | "documents"
  | "identity"
  | "banking"
  | "review"
  | "traveler-success"
  | "host-submitted";

const HOST_TYPE_OPTIONS = [
  { value: "EVENT_ORGANIZER", label: "🎉 Event Organizer" },
  { value: "ACCOMMODATION",   label: "🏡 Accommodation" },
  { value: "RENTAL",          label: "🚗 Rental" },
  { value: "RESTAURANT",      label: "🍽️ Restaurant / Food" },
  { value: "ACTIVITY",        label: "🏄 Activity / Tour" },
];

const HOST_STEPS: Step[] = ["host-type", "business", "documents", "identity", "banking", "review"];

function ProgressBar({ step }: { step: Step }) {
  const idx = HOST_STEPS.indexOf(step);
  if (idx < 0) return null;
  const total = HOST_STEPS.length;
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-400 mb-1.5">
        <span>Step {idx + 1} of {total}</span>
        <span>{Math.round(((idx + 1) / total) * 100)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
        <div
          className="h-full rounded-full bg-brand-500 transition-all duration-300"
          style={{ width: `${((idx + 1) / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

function FileUploadField({
  label,
  hint,
  value,
  onChange,
  required,
}: {
  label: string;
  hint?: string;
  value: File | null;
  onChange: (f: File | null) => void;
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <div className="text-xs font-bold text-slate-600 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </div>
      {hint && <div className="text-[10px] text-slate-400 mb-1.5">{hint}</div>}
      <div
        className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:border-brand-400 transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        <div className="text-2xl flex-shrink-0">{value ? "📎" : "📤"}</div>
        <div className="flex-1 min-w-0">
          {value ? (
            <div className="text-xs font-semibold text-slate-700 truncate">{value.name}</div>
          ) : (
            <div className="text-xs text-slate-400">Click to select file (PDF, image)</div>
          )}
        </div>
        {value && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(null); }}
            className="text-slate-400 hover:text-red-500 text-xs font-bold flex-shrink-0"
          >
            ✕
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/*,.pdf"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

function BusinessMapPicker({
  lat, lng, onPick,
}: {
  lat: number | null;
  lng: number | null;
  onPick: (lat: number, lng: number) => void;
}) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
    libraries: MAPS_LIBRARIES,
  });
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const center = lat && lng ? { lat, lng } : { lat: 6.9271, lng: 79.8612 };
  const onLoad = useCallback(() => {}, []);

  function onPlaceChanged() {
    const place = autocompleteRef.current?.getPlace();
    if (!place?.geometry?.location) return;
    onPick(place.geometry.location.lat(), place.geometry.location.lng());
  }

  if (!isLoaded) return <div className="h-40 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-xs">Loading map…</div>;

  return (
    <div className="space-y-2">
      <Autocomplete
        onLoad={(ref) => { autocompleteRef.current = ref; }}
        onPlaceChanged={onPlaceChanged}
        options={{ componentRestrictions: { country: "lk" } }}
      >
        <input
          type="text"
          placeholder="Search for your business location in Sri Lanka…"
          className="border-0 px-3 py-3 placeholder-slate-300 text-slate-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
        />
      </Autocomplete>
      <GoogleMap
        mapContainerClassName="w-full h-48 rounded-xl shadow"
        center={center}
        zoom={lat ? 15 : 11}
        onLoad={onLoad}
        onClick={(e) => {
          if (e.latLng) onPick(e.latLng.lat(), e.latLng.lng());
        }}
        options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
      >
        {lat && lng && <Marker position={{ lat, lng }} />}
      </GoogleMap>
      <p className="text-[10px] text-slate-400">Search above or click on the map to pin your exact location</p>
    </div>
  );
}

function PageWrap({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative flex min-h-screen w-screen items-center justify-center overflow-hidden px-4 py-8"
      style={{ backgroundImage: "url('/login-bg.png')", backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div className="absolute left-8 top-6 z-10">
        <Link to="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
          <img src="/logo.png" alt="Ceylonify" className="w-12 h-12 rounded-full object-cover shadow-lg ring-2 ring-white/20" />
          <div>
            <div className="text-white font-bold text-xl tracking-tight drop-shadow leading-tight">Ceylonify</div>
            <div className="text-white/60 text-xs">Create your account</div>
          </div>
        </Link>
      </div>
      <div className="relative z-10 w-full max-w-lg">{children}</div>
      <div className="absolute bottom-6 z-10 text-xs text-white/40">© {new Date().getFullYear()} Ceylonify · Index 220596H</div>
    </div>
  );
}

function HostCard({ step, title, children }: { step: Step; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/95 p-8 shadow-2xl backdrop-blur-sm">
      <ProgressBar step={step} />
      <h1 className="text-xl font-bold text-slate-800 mb-5">{title}</h1>
      {children}
    </div>
  );
}

export function Register() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [role, setRole]         = useState<"TRAVELER" | "HOST">("TRAVELER");
  const [err, setErr]           = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [step, setStep]         = useState<Step>("form");

  // HOST registration state
  const [hostTypes, setHostTypes]         = useState<string[]>([]);
  const [businessName, setBusinessName]   = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessLat, setBusinessLat]     = useState<number | null>(null);
  const [businessLng, setBusinessLng]     = useState<number | null>(null);
  const [phoneNumber, setPhoneNumber]     = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [idType, setIdType]               = useState("NATIONAL_ID");
  const [idFile, setIdFile]               = useState<File | null>(null);
  const [businessDocFile, setBusinessDocFile] = useState<File | null>(null);
  const [healthCertFile, setHealthCertFile]   = useState<File | null>(null);
  const [licenseDocFile, setLicenseDocFile]   = useState<File | null>(null);
  const [bankDocFile, setBankDocFile]         = useState<File | null>(null);

  const [submitHostApplication] = useMutation(SUBMIT_HOST_APPLICATION);

  // ── TRAVELER registration ─────────────────────────────────────────────────
  async function onTravelerSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (password !== confirm) { setErr("Passwords do not match."); return; }
    if (password.length < 6)  { setErr("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await sendEmailVerification(credential.user).catch(() => {});
      setStep("traveler-success");
    } catch (e: unknown) {
      setErr((e as Error)?.message ?? "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  // ── HOST step navigation ──────────────────────────────────────────────────
  function goNextHostStep() {
    const idx = HOST_STEPS.indexOf(step);
    if (idx < HOST_STEPS.length - 1) setStep(HOST_STEPS[idx + 1]);
  }
  function goPrevHostStep() {
    const idx = HOST_STEPS.indexOf(step);
    if (idx > 0) setStep(HOST_STEPS[idx - 1]);
    else setStep("form");
  }

  // ── HOST final submission ─────────────────────────────────────────────────
  async function onHostSubmit() {
    setErr(null);
    if (!idFile) { setErr("ID document is required."); return; }
    if (!bankDocFile) { setErr("Bank document is required."); return; }
    setLoading(true);
    try {
      // 1. Create Firebase account
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await sendEmailVerification(credential.user).catch(() => {});
      const uid = credential.user.uid;

      // 2. Upload files via backend
      async function uploadFile(file: File | null): Promise<string | undefined> {
        if (!file) return undefined;
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("http://localhost:3000/upload/document", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error("Failed to upload document");
        const data = await res.json() as { url: string };
        return "http://localhost:3000" + data.url;
      }

      const [idDocumentUrl, businessDocUrl, healthCertUrl, licenseDocUrl, bankDocUrl] =
        await Promise.all([
          uploadFile(idFile),
          uploadFile(businessDocFile),
          uploadFile(healthCertFile),
          uploadFile(licenseDocFile),
          uploadFile(bankDocFile),
        ]);

      // 3. Submit application
      await submitHostApplication({
        variables: {
          input: {
            hostTypes: JSON.stringify(hostTypes),
            businessName:    businessName || undefined,
            businessAddress: businessAddress || undefined,
            businessLat:     businessLat ?? undefined,
            businessLng:     businessLng ?? undefined,
            phoneNumber:     phoneNumber || undefined,
            licenseNumber:   licenseNumber || undefined,
            idType,
            idDocumentUrl,
            businessDocUrl,
            healthCertUrl,
            licenseDocUrl,
            bankDocUrl,
          },
        },
      });

      setStep("host-submitted");
    } catch (e: unknown) {
      setErr((e as Error)?.message ?? "Submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }


  // ── Success screens ───────────────────────────────────────────────────────
  if (step === "traveler-success") {
    return (
      <PageWrap>
        <div className="rounded-2xl bg-white/95 p-10 shadow-2xl backdrop-blur-sm text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-slate-700 mb-2">Registration Successful!</h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-6">Welcome to Ceylonify! Your Traveler account has been created.</p>
          <div className="rounded-xl bg-sky-50 border border-sky-100 px-5 py-4 mb-3 text-left">
            <div className="text-xs font-bold uppercase text-sky-600 mb-1">Next step</div>
            <p className="text-sm text-sky-800">Download the <span className="font-bold">Ceylonify mobile app</span> to discover and book authentic Sri Lankan experiences.</p>
          </div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-5 py-3 mb-6 text-left">
            <div className="text-xs font-bold uppercase text-emerald-600 mb-1">Verify your email</div>
            <p className="text-sm text-emerald-800">We sent a link to <span className="font-semibold">{email}</span>. Click it to verify.</p>
          </div>
          <p className="text-xs text-slate-400 mt-4">Already a host? <Link to="/login" className="font-bold text-sky-600 hover:underline">Sign in here</Link></p>
        </div>
      </PageWrap>
    );
  }

  if (step === "host-submitted") {
    return (
      <PageWrap>
        <div className="rounded-2xl bg-white/95 p-10 shadow-2xl backdrop-blur-sm text-center">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-xl font-bold text-slate-700 mb-2">Application Submitted!</h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-6">
            Thank you for applying to host on Ceylonify. Your registration is now under review.
          </p>
          <div className="rounded-xl bg-amber-50 border border-amber-100 px-5 py-4 mb-3 text-left">
            <div className="text-xs font-bold uppercase text-amber-600 mb-1">What happens next?</div>
            <p className="text-sm text-amber-800">
              Our team will manually review your documents within <span className="font-bold">2–3 business days</span>. You cannot log in until your account is activated by an admin.
            </p>
          </div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-5 py-3 mb-6 text-left">
            <div className="text-xs font-bold uppercase text-emerald-600 mb-1">Check your email</div>
            <p className="text-sm text-emerald-800">A verification link was sent to <span className="font-semibold">{email}</span>. Please verify your email while you wait.</p>
          </div>
          <Link to="/login" className="inline-block px-6 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-lg text-sm transition-colors">
            Back to Login
          </Link>
        </div>
      </PageWrap>
    );
  }


  if (step === "host-type") {
    return (
      <PageWrap>
        <HostCard step={step} title="What kind of host are you?">
          <p className="text-xs text-slate-500 mb-4">Select all that apply. You can list multiple types of experiences.</p>
          <div className="space-y-2 mb-6">
            {HOST_TYPE_OPTIONS.map((opt) => {
              const selected = hostTypes.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setHostTypes((prev) =>
                      selected ? prev.filter((v) => v !== opt.value) : [...prev, opt.value]
                    )
                  }
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-semibold text-left transition-colors ${
                    selected
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <span className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${selected ? "border-brand-500 bg-brand-500" : "border-slate-300"}`}>
                    {selected && <span className="text-white text-[10px] font-bold leading-none">✓</span>}
                  </span>
                  {opt.label}
                </button>
              );
            })}
          </div>
          {err && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">{err}</div>}
          <div className="flex gap-3">
            <Button variant="ghost" onClick={goPrevHostStep} className="flex-1">← Back</Button>
            <Button
              onClick={() => {
                if (hostTypes.length === 0) { setErr("Select at least one host type."); return; }
                setErr(null);
                goNextHostStep();
              }}
              className="flex-1"
            >
              Next →
            </Button>
          </div>
        </HostCard>
      </PageWrap>
    );
  }

  if (step === "business") {
    return (
      <PageWrap>
        <HostCard step={step} title="Business Details">
          <div className="space-y-4 mb-6">
            <Input label="Outlet / Business Name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. The Beach Shack" />
            <Input label="Business Address" value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} placeholder="e.g. 45 Galle Road, Colombo 03" />
            <div>
              <div className="text-xs font-bold text-slate-600 mb-1.5">Pin Your Exact Location <span className="text-red-500">*</span></div>
              <BusinessMapPicker lat={businessLat} lng={businessLng} onPick={(lat, lng) => { setBusinessLat(lat); setBusinessLng(lng); }} />
            </div>
            <Input label="Mobile / Fixed Line Number" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="e.g. +94 77 123 4567" />
          </div>
          {err && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">{err}</div>}
          <div className="flex gap-3">
            <Button variant="ghost" onClick={goPrevHostStep} className="flex-1">← Back</Button>
            <Button
              onClick={() => {
                if (!phoneNumber.trim()) { setErr("Phone number is required."); return; }
                if (!businessLat || !businessLng) { setErr("Please pin your business location on the map."); return; }
                setErr(null);
                goNextHostStep();
              }}
              className="flex-1"
            >
              Next →
            </Button>
          </div>
        </HostCard>
      </PageWrap>
    );
  }

  if (step === "documents") {
    return (
      <PageWrap>
        <HostCard step={step} title="Business Documents">
          <p className="text-xs text-slate-500 mb-4">Upload any available business documents. Items marked with * are required only if applicable.</p>
          <div className="space-y-4 mb-6">
            <FileUploadField label="Business Registration Certificate" hint="If registered with the Companies Act" value={businessDocFile} onChange={setBusinessDocFile} />
            <FileUploadField label="Food / Health Certificate" hint="Required if you serve food or beverages" value={healthCertFile} onChange={setHealthCertFile} />
            <Input label="Restaurant / Food License Number" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="e.g. FL-2024-001234" />
            <FileUploadField label="License Document" hint="Physical copy of your license" value={licenseDocFile} onChange={setLicenseDocFile} />
          </div>
          {err && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">{err}</div>}
          <div className="flex gap-3">
            <Button variant="ghost" onClick={goPrevHostStep} className="flex-1">← Back</Button>
            <Button onClick={() => { setErr(null); goNextHostStep(); }} className="flex-1">Next →</Button>
          </div>
        </HostCard>
      </PageWrap>
    );
  }

  if (step === "identity") {
    return (
      <PageWrap>
        <HostCard step={step} title="Identification">
          <p className="text-xs text-slate-500 mb-4">We need to verify your identity. Upload a clear copy of one of the following documents.</p>
          <div className="space-y-4 mb-6">
            <div>
              <div className="text-xs font-bold text-slate-600 mb-1.5">ID Type <span className="text-red-500">*</span></div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "NATIONAL_ID", label: "National ID" },
                  { value: "PASSPORT",    label: "Passport" },
                  { value: "DRIVING_LICENSE", label: "Driving License" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setIdType(opt.value)}
                    className={`py-2.5 px-2 rounded-xl border-2 text-xs font-bold transition-colors text-center ${
                      idType === opt.value
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <FileUploadField label="Document Copy" hint="Clear photo or scan — both sides if applicable" value={idFile} onChange={setIdFile} required />
          </div>
          {err && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">{err}</div>}
          <div className="flex gap-3">
            <Button variant="ghost" onClick={goPrevHostStep} className="flex-1">← Back</Button>
            <Button
              onClick={() => {
                if (!idFile) { setErr("ID document is required."); return; }
                setErr(null);
                goNextHostStep();
              }}
              className="flex-1"
            >
              Next →
            </Button>
          </div>
        </HostCard>
      </PageWrap>
    );
  }

  if (step === "banking") {
    return (
      <PageWrap>
        <HostCard step={step} title="Banking Details">
          <p className="text-xs text-slate-500 mb-4">We verify your bank account to ensure safe payouts. Upload a copy of your passbook or a recent bank statement.</p>
          <div className="space-y-4 mb-6">
            <FileUploadField label="Bank Passbook or Statement" hint="Must show your name, account number, and bank name" value={bankDocFile} onChange={setBankDocFile} required />
          </div>
          {err && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">{err}</div>}
          <div className="flex gap-3">
            <Button variant="ghost" onClick={goPrevHostStep} className="flex-1">← Back</Button>
            <Button
              onClick={() => {
                if (!bankDocFile) { setErr("Bank document is required."); return; }
                setErr(null);
                goNextHostStep();
              }}
              className="flex-1"
            >
              Review →
            </Button>
          </div>
        </HostCard>
      </PageWrap>
    );
  }

  if (step === "review") {
    const hostTypeLabels: Record<string, string> = {
      EVENT_ORGANIZER: "Event Organizer", ACCOMMODATION: "Accommodation",
      RENTAL: "Rental", RESTAURANT: "Restaurant / Food", ACTIVITY: "Activity / Tour",
    };
    return (
      <PageWrap>
        <HostCard step={step} title="Review Your Application">
          <div className="space-y-3 mb-6 text-sm">
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <div className="text-[10px] font-bold uppercase text-slate-400">Account</div>
              <div className="font-semibold text-slate-700">{email}</div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {hostTypes.map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-100 text-brand-700 uppercase">
                    {hostTypeLabels[t] ?? t}
                  </span>
                ))}
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 space-y-1">
              <div className="text-[10px] font-bold uppercase text-slate-400">Business</div>
              {businessName && <div className="text-slate-700 font-semibold">{businessName}</div>}
              {businessAddress && <div className="text-slate-600 text-xs">{businessAddress}</div>}
              {phoneNumber && <div className="text-slate-600 text-xs">📞 {phoneNumber}</div>}
              {businessLat && <div className="text-slate-600 text-xs">📍 {businessLat.toFixed(5)}, {businessLng?.toFixed(5)}</div>}
            </div>
            <div className="bg-slate-50 rounded-xl p-4 space-y-1">
              <div className="text-[10px] font-bold uppercase text-slate-400">Documents</div>
              <div className="text-xs text-slate-600">ID ({idType.replace(/_/g, " ")}): {idFile?.name ?? "—"}</div>
              <div className="text-xs text-slate-600">Bank document: {bankDocFile?.name ?? "—"}</div>
              {businessDocFile && <div className="text-xs text-slate-600">Business reg: {businessDocFile.name}</div>}
              {healthCertFile && <div className="text-xs text-slate-600">Health cert: {healthCertFile.name}</div>}
              {licenseDocFile && <div className="text-xs text-slate-600">License doc: {licenseDocFile.name}</div>}
            </div>
          </div>
          {err && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">{err}</div>}
          <div className="flex gap-3">
            <Button variant="ghost" onClick={goPrevHostStep} disabled={loading} className="flex-1">← Back</Button>
            <Button onClick={onHostSubmit} disabled={loading} className="flex-1">
              {loading ? "Submitting…" : "Submit Application"}
            </Button>
          </div>
        </HostCard>
      </PageWrap>
    );
  }

  // ── Step 1: credentials form (TRAVELER + HOST entry point) ────────────────
  return (
    <PageWrap>
      <div className="rounded-2xl bg-white/95 p-10 shadow-2xl backdrop-blur-sm">
        <h1 className="text-2xl font-semibold text-neutral-900">Create account</h1>
        <p className="mt-1 text-sm text-neutral-500">Join Ceylonify to discover or host experiences</p>

        <form
          onSubmit={role === "TRAVELER" ? onTravelerSubmit : (e) => {
            e.preventDefault();
            setErr(null);
            if (password !== confirm) { setErr("Passwords do not match."); return; }
            if (password.length < 6)  { setErr("Password must be at least 6 characters."); return; }
            setStep("host-type");
          }}
          className="mt-8 space-y-5"
        >
          {/* Role selector */}
          <div>
            <div className="mb-2 text-xs font-bold uppercase text-slate-600">I am a…</div>
            <div className="grid grid-cols-2 gap-3">
              {(["TRAVELER", "HOST"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`py-3 rounded-xl border-2 text-sm font-bold transition-colors ${
                    role === r
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {r === "TRAVELER" ? "✈️ Traveler" : "🏡 Host"}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {role === "TRAVELER"
                ? "Discover experiences via the Ceylonify mobile app."
                : "List and manage experiences. Requires identity verification and admin approval."}
            </p>
          </div>

          <Input label="Email address" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          <Input label="Confirm Password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />

          {err && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating…" : role === "TRAVELER" ? "Create account" : "Continue →"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-neutral-400">
          Already have an account?{" "}
          <Link to="/login" className="font-bold text-sky-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </PageWrap>
  );
}
