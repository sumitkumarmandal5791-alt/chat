import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useUserStore from '../../store/useruserStore';
import useThemeStore from '../../store/themeStore';
import {
    MessageSquare,
    ChevronDown,
    Camera,
    ArrowLeft,
    Phone,
    Mail,
    RefreshCw,
    Check,
    AlertCircle,
    Loader2
} from 'lucide-react';
import countries from '../../utils/countries';
import { sendOtp, verifyOtp, resendOtp, updateProfile } from '../../services/user.services';
import { toast } from 'react-toastify';

const avatars = [
    'https://api.dicebear.com/6.x/avataaars/svg?seed=Felix',
    'https://api.dicebear.com/6.x/avataaars/svg?seed=Aneka',
    'https://api.dicebear.com/6.x/avataaars/svg?seed=Mimi',
    'https://api.dicebear.com/6.x/avataaars/svg?seed=Jasper',
    'https://api.dicebear.com/6.x/avataaars/svg?seed=Luna',
    'https://api.dicebear.com/6.x/avataaars/svg?seed=Zoe',
];

const Login = () => {
    const navigate = useNavigate();
    const { setUser } = useUserStore();
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';

    // Steps: 1: Enter Identifier, 2: OTP Verification, 3: Profile Setup
    const [step, setStep] = useState(1);

    // Input mode: 'phone' | 'email'
    const [authMode, setAuthMode] = useState('phone');
    const [isDropDownOpen, setIsDropDownOpen] = useState(false);
    // Find India (+91) as default, else first country
    const defaultCountry = countries.find((c) => c.dialCode === '+91') || countries[0];
    const [selectedCountry, setSelectedCountry] = useState(defaultCountry);
    const [countrySearch, setCountrySearch] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [email, setEmail] = useState('');

    // OTP state
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [maskedIdentifier, setMaskedIdentifier] = useState('');
    const [rawIdentifier, setRawIdentifier] = useState('');
    const [countdown, setCountdown] = useState(60);
    const [canResend, setCanResend] = useState(false);

    // Profile state
    const [username, setUsername] = useState('');
    const [fullName, setFullName] = useState('');
    const [about, setAbout] = useState('Hey there! I am using WhatsApp.');
    const [selectedAvatar, setSelectedAvatar] = useState(avatars[0]);
    const [profilePictureFile, setProfilePictureFile] = useState(null);
    const [profilePicturePreview, setProfilePicturePreview] = useState(null);
    const [agreedToTerms, setAgreedToTerms] = useState(true);

    // UI & Error State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const otpInputsRef = useRef([]);
    const countryDropdownRef = useRef(null);

    // Countdown Timer for OTP Resend
    useEffect(() => {
        let timer = null;
        if (step === 2 && countdown > 0) {
            timer = setInterval(() => {
                setCountdown((prev) => prev - 1);
            }, 1000);
        } else if (countdown === 0) {
            setCanResend(true);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [step, countdown]);

    // Close country dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target)) {
                setIsDropDownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter countries list
    const filteredCountries = countries.filter(
        (c) =>
            c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
            c.dialCode.includes(countrySearch)
    );

    // 1. Submit Identifier (Send OTP)
    const handleSendOtp = async (e) => {
        if (e) e.preventDefault();
        setError('');

        let payload = {};
        if (authMode === 'phone') {
            const cleanDigits = phoneNumber.trim().replace(/\D/g, '');
            if (!cleanDigits || cleanDigits.length < 6) {
                setError('Please enter a valid phone number');
                return;
            }
            payload = {
                phoneSuffix: selectedCountry.dialCode,
                phoneNumber: cleanDigits,
                channel: 'sms'
            };
        } else {
            const cleanEmail = email.trim().toLowerCase();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!cleanEmail || !emailRegex.test(cleanEmail)) {
                setError('Please enter a valid email address');
                return;
            }
            payload = {
                email: cleanEmail,
                channel: 'email'
            };
        }

        setLoading(true);
        try {
            const res = await sendOtp(payload);
            setMaskedIdentifier(res.maskedIdentifier || (authMode === 'phone' ? `${selectedCountry.dialCode} ${phoneNumber}` : email));
            setRawIdentifier(res.identifier || (authMode === 'phone' ? `${selectedCountry.dialCode}${phoneNumber.replace(/\D/g, '')}` : email.trim()));
            toast.success(res.message || 'Verification code sent!');
            setStep(2);
            setCountdown(60);
            setCanResend(false);
            setOtp(['', '', '', '', '', '']);
            setTimeout(() => {
                otpInputsRef.current[0]?.focus();
            }, 150);
        } catch (err) {
            setError(typeof err === 'string' ? err : err.message || 'Failed to send verification code');
        } finally {
            setLoading(false);
        }
    };

    // 2. Handle OTP Box Changes, Auto-Advance & Backspace
    const handleOtpChange = (index, value) => {
        // Only accept numbers
        const cleaned = value.replace(/\D/g, '');
        if (!cleaned && value !== '') return;

        const newOtp = [...otp];

        if (cleaned.length > 1) {
            // Paste or multi-char input
            const chars = cleaned.slice(0, 6).split('');
            for (let i = 0; i < 6; i++) {
                newOtp[i] = chars[i] || '';
            }
            setOtp(newOtp);
            const nextIdx = Math.min(chars.length, 5);
            otpInputsRef.current[nextIdx]?.focus();
            return;
        }

        newOtp[index] = cleaned;
        setOtp(newOtp);

        // Auto-advance
        if (cleaned && index < 5) {
            otpInputsRef.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpInputsRef.current[index - 1]?.focus();
        }
    };

    const handleOtpPaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').trim().replace(/\D/g, '');
        if (!pastedData) return;

        const newOtp = [...otp];
        const chars = pastedData.slice(0, 6).split('');
        chars.forEach((char, idx) => {
            if (idx < 6) newOtp[idx] = char;
        });
        setOtp(newOtp);
        const focusIdx = Math.min(chars.length, 5);
        otpInputsRef.current[focusIdx]?.focus();
    };

    // 3. Verify OTP
    const handleVerifyOtp = async (e) => {
        if (e) e.preventDefault();
        const code = otp.join('');
        if (code.length !== 6) {
            setError('Please enter the complete 6-digit code');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const res = await verifyOtp({
                identifier: rawIdentifier,
                otp: code
            });

            toast.success('Verified successfully!');
            if (res.user) {
                setUser(res.user);
            }

            if (res.isNewUser || !res.user?.username) {
                setStep(3); // Go to Profile Setup
            } else {
                navigate('/homePage');
            }
        } catch (err) {
            setError(typeof err === 'string' ? err : err.message || 'Invalid or expired verification code');
        } finally {
            setLoading(false);
        }
    };

    // 4. Resend OTP
    const handleResendOtp = async () => {
        if (!canResend || loading) return;
        setLoading(true);
        setError('');
        try {
            const res = await resendOtp({ identifier: rawIdentifier });
            toast.success(res.message || 'New verification code sent!');
            setCountdown(60);
            setCanResend(false);
            setOtp(['', '', '', '', '', '']);
            otpInputsRef.current[0]?.focus();
        } catch (err) {
            setError(typeof err === 'string' ? err : err.message || 'Failed to resend code');
        } finally {
            setLoading(false);
        }
    };

    // 5. Complete Profile Setup
    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        if (!username.trim() || username.trim().length < 3) {
            setError('Username must be at least 3 characters');
            return;
        }
        if (!agreedToTerms) {
            setError('Please accept the Terms of Service to continue');
            return;
        }

        setLoading(true);
        setError('');
        try {
            let res;
            if (profilePictureFile) {
                const formData = new FormData();
                formData.append('username', username.trim());
                formData.append('name', fullName.trim() || username.trim());
                formData.append('about', about.trim());
                formData.append('media', profilePictureFile);
                res = await updateProfile(formData);
            } else {
                res = await updateProfile({
                    username: username.trim(),
                    name: fullName.trim() || username.trim(),
                    about: about.trim(),
                    profilePicture: selectedAvatar
                });
            }

            if (res.user) {
                setUser(res.user);
            }
            toast.success('Welcome to WhatsApp!');
            navigate('/homePage');
        } catch (err) {
            setError(typeof err === 'string' ? err : err.message || 'Failed to save profile');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setProfilePictureFile(file);
            setProfilePicturePreview(URL.createObjectURL(file));
        }
    };

    return (
        <div
            className={`min-h-screen flex flex-col justify-center items-center p-4 relative select-none transition-colors ${
                isDark ? 'bg-[#0c1317]' : 'bg-[#f0f2f5]'
            }`}
        >
            {/* Top Accent Strip */}
            <div
                className={`absolute top-0 left-0 right-0 h-44 ${
                    isDark ? 'bg-[#202c33]' : 'bg-[#00a884]'
                } z-0`}
            />

            {/* Main Auth Container */}
            <div
                className={`relative z-10 w-full max-w-md rounded-2xl shadow-2xl border p-8 transition-all ${
                    isDark
                        ? 'bg-[#111b21] border-[#222d34] text-[#e9edef]'
                        : 'bg-white border-[#e9edef] text-[#111b21]'
                }`}
            >
                {/* Header Icon & Brand */}
                <div className="flex flex-col items-center mb-6">
                    <div className="w-12 h-12 rounded-full bg-[#00a884] flex items-center justify-center text-white mb-3 shadow-md">
                        <MessageSquare size={24} />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight">WhatsApp Web</h1>
                    <p className="text-xs text-[#8696a0] mt-1">
                        {step === 1
                            ? 'Enter your phone number or email to receive a verification code'
                            : step === 2
                            ? 'Verify your identity'
                            : 'Set up your profile'}
                    </p>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mb-4 p-3 rounded-lg text-xs bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-start gap-2 animate-in fade-in">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span className="leading-tight">{error}</span>
                    </div>
                )}

                {/* ── STEP 1: PHONE OR EMAIL ENTRY ────────────────── */}
                {step === 1 && (
                    <form onSubmit={handleSendOtp} className="space-y-4">
                        {/* Auth Mode Switcher */}
                        <div
                            className={`flex p-1 rounded-lg border text-xs font-medium mb-3 ${
                                isDark
                                    ? 'bg-[#202c33] border-[#2a3942]'
                                    : 'bg-[#f0f2f5] border-[#e9edef]'
                            }`}
                        >
                            <button
                                type="button"
                                onClick={() => {
                                    setAuthMode('phone');
                                    setError('');
                                }}
                                className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                                    authMode === 'phone'
                                        ? 'bg-[#00a884] text-white shadow-xs'
                                        : 'text-[#8696a0] hover:text-inherit'
                                }`}
                            >
                                <Phone size={14} />
                                <span>Phone Number</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setAuthMode('email');
                                    setError('');
                                }}
                                className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                                    authMode === 'email'
                                        ? 'bg-[#00a884] text-white shadow-xs'
                                        : 'text-[#8696a0] hover:text-inherit'
                                }`}
                            >
                                <Mail size={14} />
                                <span>Email Address</span>
                            </button>
                        </div>

                        {/* Phone Mode Input */}
                        {authMode === 'phone' ? (
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-[#8696a0]">
                                    Country & Phone Number
                                </label>
                                <div
                                    ref={countryDropdownRef}
                                    className={`relative flex items-center border rounded-lg transition-colors focus-within:border-[#00a884] ${
                                        isDark
                                            ? 'border-[#2a3942] bg-[#202c33]'
                                            : 'border-[#e9edef] bg-[#f0f2f5]'
                                    }`}
                                >
                                    <button
                                        type="button"
                                        onClick={() => setIsDropDownOpen(!isDropDownOpen)}
                                        className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-r shrink-0 ${
                                            isDark ? 'border-[#2a3942]' : 'border-[#e9edef]'
                                        }`}
                                    >
                                        <span>{selectedCountry.flag}</span>
                                        <span>{selectedCountry.dialCode}</span>
                                        <ChevronDown size={14} className="text-[#8696a0]" />
                                    </button>

                                    <input
                                        type="tel"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        placeholder="Phone number"
                                        autoFocus
                                        className="w-full px-3 py-2.5 text-sm bg-transparent outline-none text-inherit placeholder-[#8696a0]"
                                    />

                                    {/* Country Selector Dropdown */}
                                    {isDropDownOpen && (
                                        <div
                                            className={`absolute top-full left-0 mt-1 w-72 max-h-56 overflow-hidden flex flex-col rounded-xl shadow-2xl border z-50 animate-in fade-in ${
                                                isDark
                                                    ? 'bg-[#233138] border-[#2a3942] text-[#e9edef]'
                                                    : 'bg-white border-[#e9edef] text-[#111b21]'
                                            }`}
                                        >
                                            <div
                                                className={`p-2 border-b ${
                                                    isDark ? 'border-[#2a3942]' : 'border-[#e9edef]'
                                                }`}
                                            >
                                                <input
                                                    type="text"
                                                    placeholder="Search country..."
                                                    value={countrySearch}
                                                    onChange={(e) => setCountrySearch(e.target.value)}
                                                    className="w-full px-2 py-1 text-xs bg-transparent outline-none placeholder-[#8696a0]"
                                                />
                                            </div>
                                            <div className="flex-1 overflow-y-auto divide-y divide-[#2a3942]/20">
                                                {filteredCountries.map((country, idx) => (
                                                    <div
                                                        key={`${country.code}-${idx}`}
                                                        onClick={() => {
                                                            setSelectedCountry(country);
                                                            setIsDropDownOpen(false);
                                                            setCountrySearch('');
                                                        }}
                                                        className={`flex items-center justify-between px-3 py-2 text-xs cursor-pointer ${
                                                            isDark
                                                                ? 'hover:bg-[#111b21]'
                                                                : 'hover:bg-[#f0f2f5]'
                                                        }`}
                                                    >
                                                        <span className="truncate pr-2">
                                                            {country.flag} {country.name}
                                                        </span>
                                                        <span className="font-semibold text-[#8696a0] shrink-0">
                                                            {country.dialCode}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* Email Mode Input */
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-[#8696a0]">
                                    Email Address
                                </label>
                                <div
                                    className={`flex items-center border rounded-lg transition-colors focus-within:border-[#00a884] ${
                                        isDark
                                            ? 'border-[#2a3942] bg-[#202c33]'
                                            : 'border-[#e9edef] bg-[#f0f2f5]'
                                    }`}
                                >
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="e.g. alex@example.com"
                                        autoFocus
                                        className="w-full px-3 py-2.5 text-sm bg-transparent outline-none text-inherit placeholder-[#8696a0]"
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 rounded-lg bg-[#00a884] hover:bg-[#008f6f] text-white font-medium text-sm transition-all shadow-md active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Sending Code...</span>
                                </>
                            ) : (
                                <span>Continue</span>
                            )}
                        </button>
                    </form>
                )}

                {/* ── STEP 2: 6-DIGIT OTP VERIFICATION ─────────────── */}
                {step === 2 && (
                    <form onSubmit={handleVerifyOtp} className="space-y-5">
                        <div className="text-center">
                            <p className="text-xs text-[#8696a0] leading-relaxed">
                                Enter the 6-digit verification code sent to
                            </p>
                            <span className="font-semibold text-sm block mt-0.5 text-[#00a884]">
                                {maskedIdentifier}
                            </span>
                        </div>

                        {/* 6 OTP Input Boxes with Auto-Advance, Reverse & Paste */}
                        <div
                            className="flex justify-between gap-1.5 sm:gap-2 my-2"
                            onPaste={handleOtpPaste}
                        >
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={(el) => (otpInputsRef.current[index] = el)}
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleOtpChange(index, e.target.value)}
                                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                    className={`w-11 h-13 text-center text-xl font-bold border rounded-xl outline-none transition-all focus:border-[#00a884] focus:ring-1 focus:ring-[#00a884] ${
                                        isDark
                                            ? 'bg-[#202c33] border-[#2a3942] text-white'
                                            : 'bg-[#f0f2f5] border-[#e9edef] text-[#111b21]'
                                    }`}
                                />
                            ))}
                        </div>

                        {/* Resend Cooldown Countdown */}
                        <div className="flex items-center justify-between text-xs pt-1">
                            {canResend ? (
                                <button
                                    type="button"
                                    onClick={handleResendOtp}
                                    disabled={loading}
                                    className="text-[#00a884] hover:underline flex items-center gap-1 font-medium cursor-pointer"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    Resend code
                                </button>
                            ) : (
                                <span className="text-[#8696a0]">
                                    Resend code in <strong>{countdown}s</strong>
                                </span>
                            )}

                            <button
                                type="button"
                                onClick={() => {
                                    setStep(1);
                                    setError('');
                                }}
                                className="text-[#8696a0] hover:text-inherit hover:underline"
                            >
                                Edit number/email
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || otp.join('').length !== 6}
                            className="w-full py-2.5 rounded-lg bg-[#00a884] hover:bg-[#008f6f] text-white font-medium text-sm transition-all shadow-md active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Verifying...</span>
                                </>
                            ) : (
                                <span>Verify Code</span>
                            )}
                        </button>
                    </form>
                )}

                {/* ── STEP 3: PROFILE SETUP ────────────────────────── */}
                {step === 3 && (
                    <form onSubmit={handleProfileSubmit} className="space-y-4">
                        <div className="flex flex-col items-center space-y-3 mb-2">
                            {/* Profile Picture Upload & Preview */}
                            <div
                                className="relative cursor-pointer group"
                                onClick={() => document.getElementById('profile-upload')?.click()}
                            >
                                <img
                                    src={profilePicturePreview || selectedAvatar}
                                    alt="Avatar"
                                    className="w-20 h-20 rounded-full object-cover border-2 border-[#00a884] shadow-md group-hover:opacity-90 transition-opacity"
                                />
                                <div className="absolute bottom-0 right-0 p-1.5 bg-[#00a884] text-white rounded-full ring-2 ring-[#111b21]">
                                    <Camera size={14} />
                                </div>
                                <input
                                    id="profile-upload"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </div>

                            {/* Preset Avatar Selection */}
                            <div className="grid grid-cols-6 gap-2 pt-1">
                                {avatars.map((avatarUrl) => (
                                    <button
                                        key={avatarUrl}
                                        type="button"
                                        onClick={() => {
                                            setSelectedAvatar(avatarUrl);
                                            setProfilePictureFile(null);
                                            setProfilePicturePreview(null);
                                        }}
                                        className={`w-8 h-8 rounded-full overflow-hidden border-2 transition-all ${
                                            !profilePictureFile && selectedAvatar === avatarUrl
                                                ? 'border-[#00a884] scale-110'
                                                : 'border-transparent opacity-70 hover:opacity-100'
                                        }`}
                                    >
                                        <img
                                            src={avatarUrl}
                                            alt="Preset"
                                            className="w-full h-full object-cover"
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Full Name */}
                        <div>
                            <label className="text-xs font-medium text-[#8696a0] block mb-1">
                                Full Name (optional)
                            </label>
                            <div
                                className={`border rounded-lg px-3 py-2 focus-within:border-[#00a884] ${
                                    isDark
                                        ? 'border-[#2a3942] bg-[#202c33]'
                                        : 'border-[#e9edef] bg-[#f0f2f5]'
                                }`}
                            >
                                <input
                                    type="text"
                                    placeholder="Your display name"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full text-sm bg-transparent outline-none text-inherit placeholder-[#8696a0]"
                                />
                            </div>
                        </div>

                        {/* Unique Username */}
                        <div>
                            <label className="text-xs font-medium text-[#8696a0] block mb-1">
                                Username *
                            </label>
                            <div
                                className={`border rounded-lg px-3 py-2 focus-within:border-[#00a884] ${
                                    isDark
                                        ? 'border-[#2a3942] bg-[#202c33]'
                                        : 'border-[#e9edef] bg-[#f0f2f5]'
                                }`}
                            >
                                <input
                                    type="text"
                                    placeholder="e.g. alex_dev"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    className="w-full text-sm bg-transparent outline-none text-inherit placeholder-[#8696a0]"
                                />
                            </div>
                        </div>

                        {/* About Bio */}
                        <div>
                            <label className="text-xs font-medium text-[#8696a0] block mb-1">
                                About
                            </label>
                            <div
                                className={`border rounded-lg px-3 py-2 focus-within:border-[#00a884] ${
                                    isDark
                                        ? 'border-[#2a3942] bg-[#202c33]'
                                        : 'border-[#e9edef] bg-[#f0f2f5]'
                                }`}
                            >
                                <input
                                    type="text"
                                    maxLength={140}
                                    placeholder="Status info"
                                    value={about}
                                    onChange={(e) => setAbout(e.target.value)}
                                    className="w-full text-sm bg-transparent outline-none text-inherit placeholder-[#8696a0]"
                                />
                            </div>
                        </div>

                        {/* Terms of Service Checkbox */}
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-[#8696a0] pt-1">
                            <input
                                type="checkbox"
                                checked={agreedToTerms}
                                onChange={(e) => setAgreedToTerms(e.target.checked)}
                                className="accent-[#00a884]"
                            />
                            <span>I agree to the Terms of Service & Privacy Policy</span>
                        </label>

                        <button
                            type="submit"
                            disabled={loading || !username.trim()}
                            className="w-full py-2.5 rounded-lg bg-[#00a884] hover:bg-[#008f6f] text-white font-medium text-sm transition-all shadow-md active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Saving Profile...</span>
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    <span>Finish Setup</span>
                                </>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Login;
